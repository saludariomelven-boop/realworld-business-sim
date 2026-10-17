/* Public endpoint configuration only. Never place the Gemini API key here. */
(function configureRealworldAssistant(global) {
  'use strict';
  global.REALWORLD_ASSISTANT_CONFIG = Object.freeze({
    // After deploying cloudflare-worker, paste its public HTTPS URL here.
    endpoint: ''
  });
})(window);
