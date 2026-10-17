# Shared Business Partner service — deployment instructions

This is required because GitHub Pages is static hosting and must not contain a Google API secret. The Worker is a small backend used by every player. Do **not** send an API key to ChatGPT, put it in `assistant-config.js`, add it to GitHub, or paste it into a tester prompt.

## 1. Create the Gemini API key

1. Open Google AI Studio: https://aistudio.google.com/ and go to API keys.
2. Create a key for a Gemini API project. Start with the available free tier if you do not want to enable paid billing.
3. The Worker is configured to try `gemini-3.8-flash` first and `gemini-3.5-flash-lite` as the fallback. Check the current model list and the actual rate/quota limits shown for your Google project before launch.
4. Free usage still has rate limits, and both models can be unavailable. Google documents that free-tier API content may be used to improve its products. The game shows players a privacy notice when they open Connection and privacy.
5. **Billing warning:** players will not use their own AI accounts or pay individually. But if you attach paid billing to the shared Gemini key, API charges may be billed to the game owner. Do not enable paid billing unless that is acceptable to you. Google documents spend caps, but some caps are experimental and may have delay/overage caveats: https://ai.google.dev/gemini-api/docs/billing.

## 2. Deploy the Cloudflare Worker

You can deploy from the Cloudflare dashboard or with Wrangler. The dashboard is generally easier on a phone.

### Cloudflare dashboard path

1. Sign in at https://dash.cloudflare.com/ and open **Workers & Pages**.
2. Create a new Worker named `realworld-company-assistant` (or another name you choose), deploy the starter worker, then open **Edit code**.
3. Replace the starter code with the entire contents of `cloudflare-worker/src/index.js` from this bundle and deploy it.
4. Open the Worker settings and add these **plain-text variables**:
   - `ALLOWED_ORIGIN` = `https://saludariomelven-boop.github.io` (no trailing slash)
   - `PRIMARY_MODEL` = `gemini-3.8-flash`
   - `FALLBACK_MODEL` = `gemini-3.5-flash-lite`
5. Add `GEMINI_API_KEY` as a **Secret** using the key you just created. Never set it as a plain-text variable and never place it in the game repository.
6. Add a **Rate Limiting** binding named exactly `RW_AI_RATE_LIMIT`. Use a positive numeric-string namespace ID that is unique in your Cloudflare account (the sample `981223` in `wrangler.toml` may be changed if it conflicts), a limit of `20`, and a period of `60` seconds. If your current dashboard does not expose this binding, deploy using the included Wrangler configuration instead; do not publicly launch the paid/shared service without rate limiting configured.
7. Deploy again after the secret, variables, and binding are configured.

Cloudflare's documented rate-limit binding supports periods of 10 or 60 seconds and notes that IP addresses can be shared by people on the same mobile carrier/NAT. The included limit is a basic abuse barrier, not a guarantee against all abuse.

### Wrangler alternative

From a Node.js-capable environment, enter the `cloudflare-worker` folder, authenticate Wrangler to your Cloudflare account, put `GEMINI_API_KEY` into Worker secret storage, then deploy the included `wrangler.toml`. Choose a unique positive `namespace_id` before deploy.

## 3. Check the Worker

Open the deployed Worker URL followed by `/health`, for example:

`https://realworld-company-assistant.YOUR-SUBDOMAIN.workers.dev/health`

A correctly configured service should show a small JSON response with `"ok": true` and `"configured": true`. This endpoint exposes only a service status, never the key. If `configured` is false, revisit the `GEMINI_API_KEY` secret.

The chat endpoint is the same Worker URL followed by `/chat`, e.g. `https://realworld-company-assistant.YOUR-SUBDOMAIN.workers.dev/chat`.

## 4. Connect the public game to the Worker

Open `assistant-config.js` from the bundle. Replace its empty endpoint value with the real deployed HTTPS `/chat` URL. Example format only:

```js
(function configureRealworldAssistant(global) {
  'use strict';
  global.REALWORLD_ASSISTANT_CONFIG = Object.freeze({
    endpoint: 'https://realworld-company-assistant.YOUR-SUBDOMAIN.workers.dev/chat'
  });
})(window);
```

Use your actual URL, not the example placeholder. The endpoint is public by design; the provider API key is not. `assistant-config.js` must never contain `GEMINI_API_KEY`.

## 5. Update the repository

Upload the bundle’s replacement/additional files in the original exact paths. Keep the original accepted `layer10.js`, `layer11.js`, Layer 7–9 modules, and pinned Layer 6 source unchanged. Include the endpoint-configured `assistant-config.js` in the same branch. Wait for GitHub Actions to run the complete suite, fix any failures before merge, then verify Pages is publishing release `12.1.0`.

After deploy, open Business Partner from the game. If the service fails, the interface should show a useful shared-service/quota error, not ask players to sign in or pay. When both model quotas are exhausted, everyone may need to wait for the shared quota to reset; this is not unlimited service.

## Security notes

- CORS restricts browsers to the configured game origin, but **CORS is not authentication**; external clients can forge an Origin header. The Worker has an IP rate-limit binding, request-size/message limits, and provider-side quota, but no public unauthenticated endpoint can guarantee zero abuse.
- The provided IP key may rate-limit multiple players who share one carrier NAT. If the player base grows, add a stronger bot-control/user identity layer and cost/usage monitoring before enabling paid billing.
- Do not treat the game's simulated company state as real accounting records. The UI warns players not to send personal/confidential data.
