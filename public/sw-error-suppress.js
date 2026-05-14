/**
 * Workbox error suppressor — imported into the generated service
 * worker via vite-plugin-pwa's workbox.importScripts option.
 *
 * Suppresses the noisy but harmless `InvalidStateError: The database
 * connection is closing` rejections that fire when the
 * `workbox-expiration` plugin tries to update its IDB timestamps
 * during page navigation / tab close.  The cache itself is fine —
 * the rejection only loses one timestamp update for an entry that
 * will be re-touched on the next fetch.  See GoogleChrome/workbox#2932
 * and the screenshots teachers reported in the dev-tools console.
 *
 * Listener installs at SW boot, before workbox starts wiring routes,
 * so every subsequent expiration update is covered.
 */
self.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (!reason) return;
  const name = reason.name || '';
  const message = reason.message || String(reason);
  if (
    name === 'InvalidStateError' &&
    /database connection is closing/i.test(message)
  ) {
    event.preventDefault();
  }
});
