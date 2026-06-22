/* Vocaband push-notification service-worker handlers.
 *
 * Loaded into the workbox-generated service worker via `importScripts`
 * (see vite.config.ts → workbox.importScripts). Kept as a plain standalone
 * script so it works regardless of how the main SW is built.
 *
 * Payloads are PII-free by contract (server.ts never sends a name/score) —
 * we render only the generic title/body the server provides and deep-link
 * into the app on tap. */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    // Malformed / non-JSON push — show nothing rather than a broken card.
    return;
  }

  const title = payload.title || 'Vocaband';
  const lang = payload.lang || 'en';
  const dir = lang === 'he' || lang === 'ar' ? 'rtl' : 'ltr';

  const options = {
    body: payload.body || '',
    lang,
    dir,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    // `tag` coalesces a burst of the same type into one card instead of
    // stacking several — protects students from notification spam.
    tag: payload.type || 'vocaband',
    renotify: false,
    data: { url: payload.url || '/', type: payload.type || 'generic' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Re-focus an already-open tab if we have one; otherwise open fresh.
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              try { client.navigate(targetUrl); } catch (_e) { /* cross-origin guard */ }
            }
            return undefined;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        return undefined;
      }),
  );
});
