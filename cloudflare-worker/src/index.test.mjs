import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const ORIGIN = 'https://saludariomelven-boop.github.io';
function makeRequest(path = '/chat', body = { messages: [{ role: 'user', content: 'Help me interpret my company cash.' }] }, origin = ORIGIN) {
  return new Request('https://worker.example.test' + path, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.45' }, body: JSON.stringify(body)
  });
}
function makeEnv(extra = {}) {
  return {
    GEMINI_API_KEY: 'test-secret-never-return-this',
    ALLOWED_ORIGIN: ORIGIN,
    PRIMARY_MODEL: 'gemini-3.8-flash',
    FALLBACK_MODEL: 'gemini-3.5-flash-lite',
    RW_AI_RATE_LIMIT: { async limit(args) { this.lastKey = args.key; return { success: true }; } },
    ...extra
  };
}
function responseJson(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }); }

test('Worker exposes only a harmless health status and requires the game origin', { concurrency: false }, async () => {
  const denied = await worker.fetch(makeRequest('/chat', undefined, 'https://evil.example'), makeEnv());
  assert.equal(denied.status, 403);
  const req = new Request('https://worker.example.test/health', { headers: { Origin: ORIGIN } });
  const health = await worker.fetch(req, makeEnv());
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, service: 'REALWORLD Business Partner', configured: true });
  assert.equal(health.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const directHealth = await worker.fetch(new Request('https://worker.example.test/health'), makeEnv());
  assert.equal(directHealth.status, 200);
  assert.deepEqual(await directHealth.json(), { ok: true, service: 'REALWORLD Business Partner', configured: true });
});

test('Worker fails closed without a server-side provider secret', { concurrency: false }, async () => {
  const result = await worker.fetch(makeRequest(), makeEnv({ GEMINI_API_KEY: '' }));
  assert.equal(result.status, 503);
  const body = await result.json();
  assert.equal(body.error.code, 'service_not_configured');
  assert.doesNotMatch(JSON.stringify(body), /test-secret|API_KEY/);
});

test('Worker fails closed when the required rate-limit binding is missing', { concurrency: false }, async () => {
  const noBinding = makeEnv(); delete noBinding.RW_AI_RATE_LIMIT;
  const health = await worker.fetch(new Request('https://worker.example.test/health'), noBinding);
  assert.equal((await health.json()).configured, false);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Provider must not be called without protection'); };
  try {
    const response = await worker.fetch(makeRequest(), noBinding);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'rate_limit_not_configured');
  } finally { globalThis.fetch = oldFetch; }
});

test('Worker rejects malformed or oversized message shapes before provider use', { concurrency: false }, async () => {
  const invalid = await worker.fetch(makeRequest('/chat', { messages: [{ role: 'tool', content: 'not allowed' }] }), makeEnv());
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'invalid_messages');
  const huge = 'x'.repeat(91000);
  const oversized = await worker.fetch(makeRequest('/chat', { messages: [{ role: 'user', content: huge }] }), makeEnv());
  assert.equal(oversized.status, 413);
});

test('Worker applies a shared rate limit before calling the provider', { concurrency: false }, async () => {
  const env = makeEnv({ RW_AI_RATE_LIMIT: { async limit({ key }) { this.key = key; return { success: false }; } } });
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Provider must not be called when limited'); };
  try {
    const response = await worker.fetch(makeRequest(), env);
    assert.equal(response.status, 429);
    assert.equal(env.RW_AI_RATE_LIMIT.key, '192.0.2.45');
    assert.match((await response.json()).error.message, /No player payment is required/i);
  } finally { globalThis.fetch = oldFetch; }
});

test('Worker retries the cost-efficient fallback model after a primary quota error', { concurrency: false }, async () => {
  const oldFetch = globalThis.fetch;
  const attempts = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body); attempts.push({ url, options, body });
    if (attempts.length === 1) return responseJson({ error: { message: 'quota' } }, 429);
    return responseJson({ model: body.model, choices: [{ message: { role: 'assistant', content: 'Use the current recorded cash balance.' } }] });
  };
  try {
    const response = await worker.fetch(makeRequest(), makeEnv());
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.model, 'gemini-3.5-flash-lite');
    assert.equal(data.message.content, 'Use the current recorded cash balance.');
    assert.deepEqual(attempts.map((entry) => entry.body.model), ['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
    assert.equal(attempts[0].url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    assert.equal(attempts[0].options.headers.Authorization, 'Bearer test-secret-never-return-this');
    assert.ok(Array.isArray(attempts[0].body.tools));
    assert.equal(attempts[0].body.extra_body.google.thinking_config.thinking_level, 'low');
    assert.match(attempts[0].body.messages[0].content, /Mandatory server rules/);
    assert.doesNotMatch(JSON.stringify(data), /test-secret-never-return-this/);
  } finally { globalThis.fetch = oldFetch; }
});

test('Worker returns a non-payment quota message after both models are limited', { concurrency: false }, async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => responseJson({ error: { message: 'quota exhausted' } }, 429);
  try {
    const response = await worker.fetch(makeRequest(), makeEnv());
    assert.equal(response.status, 429);
    const body = await response.json();
    assert.equal(body.error.code, 'shared_quota_unavailable');
    assert.match(body.error.message, /No player account or payment is required/i);
  } finally { globalThis.fetch = oldFetch; }
});
      
