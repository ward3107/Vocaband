/**
 * Cloudflare Workers entry point for Vocaband.
 *
 * Proxies /api/* and /socket.io/* traffic to the Render backend at
 * https://api.vocaband.com. All other paths fall through to the static
 * SPA (env.ASSETS), which has not_found_handling set to
 * "single-page-application" (see wrangler.jsonc).
 *
 * Why this exists:
 * Before this file, the Cloudflare Worker was in "assets-only" mode and
 * served every unknown path as the SPA index.html. That meant /api/*
 * requests returned HTML, the client tried to JSON.parse "<!doctype html>",
 * and every API call (AI features, OCR, translate, socket.io) was broken.
 * This worker intercepts API traffic BEFORE the asset fallback.
 *
 * OCR runs on the Render backend (not the Worker) because Render has
 * more memory (512MB vs 128MB) to handle large phone photos, and Gemini
 * Flash accepts images up to 20MB natively.
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const API_BACKEND = "https://api.vocaband.com";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Proxy API + Socket.IO traffic to the Render backend.
    // Same-origin from the browser's view (no CORS preflight needed).
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/socket.io/")
    ) {
      const backendUrl = new URL(url.pathname + url.search, API_BACKEND);
      return fetch(new Request(backendUrl.toString(), request));
    }

    // Everything else: serve static assets. env.ASSETS handles the SPA
    // fallback (index.html for unknown paths).
    return env.ASSETS.fetch(request);
  },
};
