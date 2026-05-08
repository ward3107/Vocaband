// Pre-React boot diagnostic.
// Replaces the loading message with a visible error if a script fails before
// React mounts (rare on healthy builds; useful when a school's content filter
// blocks /assets/* hashed bundles).
//
// Lives as an external file so the page CSP can drop `unsafe-inline` from
// `script-src` — the SPA only needs `'self'` to load this.
(function () {
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
