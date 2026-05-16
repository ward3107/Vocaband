// Pre-React boot diagnostic + RTL font loader.
// Replaces the loading message with a visible error if a script fails before
// React mounts (rare on healthy builds; useful when a school's content filter
// blocks /assets/* hashed bundles).
//
// Lives as an external file so the page CSP can drop `unsafe-inline` from
// `script-src` — the SPA only needs `'self'` to load this.
(function () {
  // RTL font loader.
  //
  // index.html only blocks on the Latin font CSS (Plus Jakarta Sans + Be
  // Vietnam Pro). Hebrew + Arabic visitors need Heebo + Fredoka, which
  // are 10 more @font-face declarations. To keep first-paint cost off
  // English visitors we defer the RTL CSS to here: check the saved
  // language preference (or the browser's preferred language on first
  // visit) and inject a non-blocking <link> if the user actually reads
  // RTL. Performed before React mounts so by the time the landing page
  // hydrates, the RTL CSS is already in flight.
  //
  // Exposed as window.__vocabandLoadRtlFonts so useLanguage's
  // setLanguage() can call it when a user toggles to HE/AR later.
  function loadRtlFonts() {
    if (window.__vocabandRtlFontsLoaded) return;
    window.__vocabandRtlFontsLoaded = true;
    var meta = document.querySelector('meta[name="vocaband-rtl-fonts"]');
    if (!meta) return;
    var href = meta.getAttribute('content');
    if (!href) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  window.__vocabandLoadRtlFonts = loadRtlFonts;

  function detectRtl() {
    try {
      var saved = localStorage.getItem('vocaband_legal_language');
      if (saved === 'he' || saved === 'ar') return true;
      if (saved === 'en') return false;
    } catch (_) { /* localStorage unavailable */ }
    var nav = navigator;
    if (!nav) return false;
    var cands = [];
    if (Array.isArray(nav.languages)) {
      for (var i = 0; i < nav.languages.length; i++) cands.push(nav.languages[i]);
    }
    if (nav.language) cands.push(nav.language);
    for (var j = 0; j < cands.length; j++) {
      var lc = (cands[j] || '').toLowerCase();
      if (lc === 'he' || lc.indexOf('he-') === 0 || lc === 'iw' || lc.indexOf('iw-') === 0) return true;
      if (lc === 'ar' || lc.indexOf('ar-') === 0) return true;
      if (lc === 'en' || lc.indexOf('en-') === 0) return false;
    }
    return false;
  }
  if (detectRtl()) loadRtlFonts();

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
