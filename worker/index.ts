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

import { downloadZip } from "client-zip";

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  // Optional: override Supabase URL via Worker env var. Defaults below to
  // the production project so the Worker still works without setting it.
  SUPABASE_URL?: string;
}

// 2026-04-25: migrated from Render (api.vocaband.com) to Fly.io.
// Render hit its pipeline-minutes spend cap; Fly's auto_stop_machines
// suspends the VM during off-hours so school-hours-only traffic costs
// ~$0/month.  The Worker proxy URL change is the only client-side
// effect — students still see vocaband.com.
const API_BACKEND = "https://vocaband.fly.dev";

// Word audio is hosted in the public Supabase Storage bucket "sound" — same
// path the in-app player uses (src/hooks/useAudio.ts). The Worker fetches
// from this bucket directly so MP3s never round-trip through Fly.io.
// Mirrors VITE_SUPABASE_URL in .env.production. Override per-environment by
// setting `vars.SUPABASE_URL` in wrangler.jsonc if you ever cut a staging
// project; for production the default below is correct.
const SUPABASE_URL_DEFAULT = "https://ilbeskwldyrleltnxyrp.supabase.co";

// Strip everything except letters/numbers/dashes so user-supplied topic
// names can't slip path components or content-disposition shenanigans into
// the response header.
const sanitizeFilename = (raw: string): string =>
  raw.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 64) || "audio-pack";

/**
 * /api/audio-pack?ids=1,2,3&name=Animals
 *
 * Streams a ZIP of the requested word MP3s from Supabase Storage. Files are
 * fetched lazily by client-zip (one fetch per file as the ZIP stream
 * advances) so memory stays flat even for large topics. Cap at 200 ids per
 * request to bound worst-case fetch fan-out.
 */
async function handleAudioPack(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) {
    return new Response("Missing or invalid 'ids' parameter", { status: 400 });
  }
  if (ids.length > 200) {
    return new Response("Too many ids (max 200)", { status: 400 });
  }

  const supabase = (env.SUPABASE_URL ?? SUPABASE_URL_DEFAULT).replace(/\/$/, "");
  const filename = sanitizeFilename(url.searchParams.get("name") ?? "audio-pack");

  // Async generator: client-zip pulls each Response on demand, so we only
  // hold one MP3 in memory at a time. Sequential fetching is fine — Workers
  // cap subrequest fan-out anyway and audio files are small.
  async function* mp3Stream() {
    for (const id of ids) {
      const resp = await fetch(`${supabase}/storage/v1/object/public/sound/${id}.mp3`);
      // Skip silently if a single MP3 404s rather than failing the whole
      // ZIP — teachers would rather get the rest of the topic than nothing.
      if (!resp.ok) continue;
      yield { name: `${id}.mp3`, input: resp };
    }
  }

  const zipResponse = downloadZip(mp3Stream());
  // Forward the streamed ZIP body but override headers so the browser
  // saves a sensibly-named file. Long browser cache disabled — pack
  // contents change when a topic's word list does.
  return new Response(zipResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}.zip"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Edge-handled routes (run on the Worker, NOT proxied). These must come
    // before the /api/* proxy fallthrough or they'll be forwarded to Fly.io
    // and return a 404.
    if (url.pathname === "/api/audio-pack") {
      return handleAudioPack(request, env);
    }

    // Proxy everything else under /api/* and /socket.io/* to the Fly.io
    // backend. Same-origin from the browser's view (no CORS preflight).
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/socket.io/")
    ) {
      const backendUrl = new URL(url.pathname + url.search, API_BACKEND);
      return fetch(new Request(backendUrl.toString(), request));
    }

    // PDFs (school decks + teacher/parent guides linked from the
    // landing-page footer).  wrangler.jsonc sets `not_found_handling:
    // "single-page-application"`, which returns /index.html with a 200
    // status for any missing asset.  For a `*.pdf` URL that silent
    // fallback means the browser receives text/html for a PDF request
    // and either renders the SPA shell in the new tab or shows a
    // blank page — exactly the "PDFs don't open" symptom teachers
    // reported.  Turn that into a real 404 so a missing PDF is loud
    // (and so a deploy gap is visible in monitoring) instead of
    // masquerading as the homepage.
    if (url.pathname.toLowerCase().endsWith(".pdf")) {
      const response = await env.ASSETS.fetch(request);
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && contentType.toLowerCase().includes("text/html")) {
        return new Response("PDF not found", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      return response;
    }

    // Everything else: serve static assets. env.ASSETS handles the SPA
    // fallback (index.html for unknown paths).
    return env.ASSETS.fetch(request);
  },
};
