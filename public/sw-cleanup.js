// Kill any existing service workers that may be serving stale content
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(registration) { registration.unregister(); });
  });
  caches.keys().then(function(names) {
    names.forEach(function(name) { caches.delete(name); });
  });
}
