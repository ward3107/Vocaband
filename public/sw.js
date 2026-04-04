// Self-destroying service worker.
// This file replaces any previously-cached service worker (from VitePWA)
// that may be serving stale content and causing white screens / freezes.
// Once installed, it immediately takes over and unregisters itself.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete all caches
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    }).then(() => {
      // Unregister this service worker
      return self.registration.unregister();
    }).then(() => {
      // Refresh all open tabs to load fresh content
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    })
  );
});
