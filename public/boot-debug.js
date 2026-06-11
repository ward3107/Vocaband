// Pre-React boot diagnostic + RTL font loader.
// Replaces the loading message with a visible error if a script fails before
// React mounts (rare on healthy builds; useful when a school's content filter
// blocks /assets/* hashed bundles).
//
// Lives as an external file so the page CSP can drop `unsafe-inline` from
// `script-src` — the SPA only needs `'self'` to load this.
(function () {
  // (Latin Google-Fonts deferred-stylesheet promotion lived here until
  // PR #787 follow-up.  Latin fonts are now self-hosted from /fonts/
  // via @font-face in src/index.css — no external CSS round-trip to
  // promote.  font-display:swap on the local @font-face keeps the
  // first-paint behaviour identical.)

  // RTL font loader — now a no-op.
  //
  // Heebo + Fredoka used to be lazy-loaded from fonts.googleapis.com here.
  // They are now self-hosted via @font-face in src/index.css (variable
  // woff2 in /public/fonts), so there's nothing to inject: the browser
  // fetches the Hebrew woff2 on demand the first time a Hebrew glyph
  // renders, and English-only sessions never touch it.  The stub is kept
  // so useLanguage's setLanguage() can still call it harmlessly when a
  // user toggles to HE/AR.
  function loadRtlFonts() {}
  window.__vocabandLoadRtlFonts = loadRtlFonts;

  window.addEventListener('error', function (e) {
    var el = document.getElementById('boot-debug');
    if (!el) return;
    el.innerHTML =
      '<div class="boot-error">' +
      '<h2>App Error</h2>' +
      '<pre></pre>' +
      '</div>';
    var pre = el.querySelector('pre');
    if (pre) {
      pre.textContent =
        (e.message || 'Unknown error') +
        '\n' +
        (e.filename || '') +
        ':' +
        (e.lineno || '');
    }
  });
  // If React hasn't mounted in 10 seconds, surface a hint to open DevTools.
  setTimeout(function () {
    var el = document.getElementById('boot-debug');
    if (!el) return;
    var hint = document.createElement('p');
    hint.className = 'boot-timeout';
    hint.textContent =
      'Still loading after 10s. Check browser console (F12) for errors.';
    el.appendChild(hint);
  }, 10000);
})();
