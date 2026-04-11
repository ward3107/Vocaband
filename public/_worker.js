// Cloudflare Workers entry point for Vocaband.
//
// Vite copies this file from public/_worker.js → dist/_worker.js on build.
// Cloudflare Workers Assets mode (see wrangler.jsonc) auto-detects any
// _worker.js inside the assets directory and uses it as the entry point.
//
// Purpose: proxy /api/* and /socket.io/* traffic to the Render backend at
// https://api.vocaband.com. All other requests fall through to the static
// SPA (dist/*) with the usual single-page-application fallback for 404s.
//
// Why this exists: before this file, every /api/* request hit the Workers
// static asset binding, 404'd, and got the SPA index.html served back
// (because not_found_handling is "single-page-application"). The client
// then tried to JSON.parse "<!doctype html>..." and crashed silently,
// leaving aiEnabled=false, OCR broken, and every other API call a no-op.

const API_BACKEND = "https://api.vocaband.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API + Socket.IO traffic to the Render backend.
    // Same-origin from the browser's view, so no CORS preflight needed.
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/socket.io/")
    ) {
      const backendUrl = new URL(url.pathname + url.search, API_BACKEND);
      // Clone request (preserves method, headers, body). Worker will fetch
      // server-to-server, so CORS on the backend is not involved.
      return fetch(new Request(backendUrl.toString(), request));
    }

    // Everything else: serve static assets. env.ASSETS handles the SPA
    // fallback (index.html for unknown paths) per wrangler.jsonc config.
    return env.ASSETS.fetch(request);
  },
};
