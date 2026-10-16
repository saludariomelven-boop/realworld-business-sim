
/*
 * REALWORLD shared Company Assistant configuration.
 * Replace the placeholder values with the Firebase Web App config from your own Firebase project.
 * This file contains public client configuration, NOT a private server secret.
 * Configure Firebase AI Logic with the Gemini Developer API and enforce Firebase App Check.
 * Register a reCAPTCHA Enterprise site key for the published GitHub Pages domain.
 */
(function () {
  'use strict';
  window.REALWORLD_FIREBASE_CONFIG = {
    apiKey: 'REPLACE_WITH_FIREBASE_WEB_API_KEY',
    authDomain: 'REPLACE_WITH_PROJECT.firebaseapp.com',
    projectId: 'REPLACE_WITH_PROJECT_ID',
    appId: 'REPLACE_WITH_FIREBASE_WEB_APP_ID'
  };
  window.REALWORLD_FIREBASE_APPCHECK_SITE_KEY = 'REPLACE_WITH_RECAPTCHA_ENTERPRISE_SITE_KEY';
})();
