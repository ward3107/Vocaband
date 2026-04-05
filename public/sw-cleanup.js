// Kill any existing service workers that may be serving stale content.
// Two-pronged approach:
// 1. Unregister all existing service workers directly
// 2. Register a self-destroying sw.js that replaces any cached worker
if ('serviceWorker' in navigator) {
  // Direct unregister
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(registration) { registration.unregister(); });
  });
  // Clear all caches
  caches.keys().then(function(names) {
    names.forEach(function(name) { caches.delete(name); });
  });
  // Register self-destroying worker to replace any stale cached one
  navigator.serviceWorker.register('/sw.js').catch(function() {});
}
