import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const ORIGIN = 'https://saludariomelven-boop.github.io';
function makeRequest(path = '/chat', body = { messages: [{ role: 'user', content: 'Help me interpret my company cash.' }] }, origin = ORIGIN) {
  return new Request('https://worker.example.test' + path, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.45' },
    body: JSON.stringify(body)
  });
}
function makeEnv(extra = {}) {
  return {
    AI: { async run() { return { response: 'Use the current recorded cash balance.' }; } },
    ALLOWED_ORIGIN: ORIGIN,
    RW_AI_RATE_LIMIT: { async limit(args) { this.lastKey = args.key; return { success: true }; } },
    ...extra
  };
}

test('health exposes only safe status and reports both required bindings', async () => {
  const env = makeEnv();
  const denied = await worker.fetch(makeRequest('/chat', undefined, 'https://evil.example'), env);
  assert.equal(denied.status, 403);
  const health = await worker.fetch(new Request('https://worker.example.test/health', { headers: { Origin: ORIGIN } }), env);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, service: 'REALWORLD Business Partner', configured: true });
  assert.equal(health.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const directHealth = await worker.fetch(new Request('https://worker.example.test/health'), env);
  assert.equal(directHealth.status, 200);
  assert.deepEqual(await directHealth.json(), { ok: true, service: 'REALWORLD Business Partner', configured: true });
});

test('health reports unconfigured when AI binding or rate limiting is absent', async () => {
  const noAI = makeEnv({ AI: undefined });
  const result = await worker.fetch(new Request('https://worker.example.test/health'), noAI);
  assert.equal((await result.json()).configured, false);
  const noRate = makeEnv({ RW_AI_RATE_LIMIT: undefined });
  const result2 = await worker.fetch(new Request('https://worker.example.test/health'), noRate);
  assert.equal((await result2.json()).configured, false);
});

test('Worker fails closed without the AI binding', async () => {
  const env = makeEnv({ AI: undefined });
  const response = await worker.fetch(makeRequest(), env);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'service_not_configured');
});

test('Worker fails closed when the required rate-limit binding is missing', async () => {
  const env = makeEnv({ RW_AI_RATE_LIMIT: undefined });
  let modelCalled = false;
  env.AI = { async run() { modelCalled = true; return { response: 'should not run' }; } };
  const response = await worker.fetch(makeRequest(), env);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'rate_limit_not_configured');
  assert.equal(modelCalled, false);
});

test('Worker rejects malformed and oversized messages before model use', async () => {
  let modelCalled = false;
  const env = makeEnv({ AI: { async run() { modelCalled = true; return { response: 'should not run' }; } } });
  const invalid = await worker.fetch(makeRequest('/chat', { messages: [{ role: 'tool', content: 'not allowed' }] }), env);
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'invalid_messages');
  const huge = 'x'.repeat(91000);
  const oversized = await worker.fetch(makeRequest('/chat', { messages: [{ role: 'user', content: huge }] }), env);
  assert.equal(oversized.status, 413);
  assert.equal(modelCalled, false);
});

test('Worker enforces rate limiting before calling Workers AI', async () => {
  let modelCalled = false;
  const env = makeEnv({
    RW_AI_RATE_LIMIT: { async limit({ key }) { this.key = key; return { success: false }; } },
    AI: { async run() { modelCalled = true; return { response: 'should not run' }; } }
  });
  const response = await worker.fetch(makeRequest(), env);
  assert.equal(response.status, 429);
  assert.equal(env.RW_AI_RATE_LIMIT.key, '192.0.2.45');
  assert.match((await response.json()).error.message, /does not require player payment/i);
  assert.equal(modelCalled, false);
});

test('Worker calls the Cloudflare-hosted model and preserves the client chat response contract', async () => {
  let capturedModel = '';
  let capturedOptions;
  const env = makeEnv({ AI: { async run(model, options) {
    capturedModel = model;
    capturedOptions = options;
    return { response: 'Use the current recorded cash balance.' };
  } } });
  const response = await worker.fetch(makeRequest(), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.model, '@cf/google/gemma-4-26b-a4b-it');
  assert.equal(data.message.role, 'assistant');
  assert.equal(data.message.content, 'Use the current recorded cash balance.');
  assert.equal(capturedModel, '@cf/google/gemma-4-26b-a4b-it');
  assert.ok(Array.isArray(capturedOptions.messages));
  assert.ok(Array.isArray(capturedOptions.tools));
  assert.equal(capturedOptions.tools[0].name, 'propose_company_action');
  assert.match(capturedOptions.messages[0].content, /Mandatory server rules/);
  assert.doesNotMatch(JSON.stringify(data), /GEMINI_API_KEY|test-secret/);
});

test('Worker converts native tool calls to the frontend-compatible message shape', async () => {
  const env = makeEnv({ AI: { async run() {
    return {
      response: '',
      tool_calls: [{ name: 'propose_company_action', arguments: { type: 'navigate', view: 'finance' } }]
    };
  } } });
  const response = await worker.fetch(makeRequest('/chat', { messages: [{ role: 'user', content: 'Open finance for me.' }] }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.message.content, '');
  assert.equal(data.message.tool_calls[0].function.name, 'propose_company_action');
  assert.deepEqual(JSON.parse(data.message.tool_calls[0].function.arguments), { type: 'navigate', view: 'finance' });
});

test('Worker returns graceful no-payment message when daily free quota is exhausted', async () => {
  const env = makeEnv({ AI: { async run() { throw new Error('Account limited: daily free allocation of 10000 neurons exhausted'); } } });
  const response = await worker.fetch(makeRequest(), env);
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.equal(body.error.code, 'shared_quota_unavailable');
  assert.match(body.error.message, /No player account or payment is required/i);
});
                                
