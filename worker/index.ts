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

// Minimal HTMLRewriter typing — the Workers runtime exposes this as a
// global, but the project's tsconfig only pulls in the DOM lib (not
// @cloudflare/workers-types), so tsc doesn't otherwise know about it.
// Wrangler types the real class at deploy time; this shim just keeps
// the main tsc check (which compiles the worker alongside the SPA)
// from erroring on the unknown identifier.
interface RewriterElement {
  setAttribute(name: string, value: string): void;
  setInnerContent(content: string): void;
}
interface RewriterHandlers {
  element?: (element: RewriterElement) => void;
}
declare class HTMLRewriter {
  on(selector: string, handlers: RewriterHandlers): HTMLRewriter;
  transform(response: Response): Response;
}

// Per-language metadata for the SPA-served landing routes. The Worker
// rewrites <title>, <meta name="description">, OG tags, and the <html
// lang/dir> attributes at the edge when a request carries ?lang=he,
// ?lang=ar, or ?lang=ru (the hreflang alternates set in index.html).
// Doing this at the edge — not client-side — means the HTML literally
// contains the localized strings when Googlebot scrapes it, so the
// Hebrew result in Google gets a Hebrew snippet (the client-side
// swap-after-render alternative is unreliable: Googlebot indexes the
// initial HTML in the first pass and only renders JS in a later,
// slower pass).
//
// Title ≤ ~60 chars and description ≤ ~155 chars to fit Google's
// snippet width without truncation.
type LocalizableLang = 'he' | 'ar' | 'ru';
const LOCALIZED_META: Record<LocalizableLang, {
  title: string;
  description: string;
  ogLocale: string;
  dir: 'ltr' | 'rtl';
}> = {
  he: {
    title: 'ווקאבנד — לימוד אנגלית בכיף לכל הגיל | משחקים ואוצר מילים',
    description: 'ווקאבנד היא אפליקציית אנגלית מהנה לכל הגילאים — ילדים, נוער ומבוגרים. 9,000+ מילים, 15 משחקים, אתגרי כיתה חיים, נקודות וסטריקים. חינם למורים.',
    ogLocale: 'he_IL',
    dir: 'rtl',
  },
  ar: {
    title: 'فوكاباند — تعلم الإنجليزية بمتعة لجميع الأعمار | مفردات وألعاب',
    description: 'فوكاباند تطبيق لتعلم اللغة الإنجليزية بطريقة ممتعة لجميع الأعمار — الأطفال والمراهقين والكبار. 9,000+ كلمة، 15 لعبة، تحديات صفية مباشرة، نقاط وسلاسل.',
    ogLocale: 'ar_AE',
    dir: 'rtl',
  },
  ru: {
    title: 'Вокабанд — учить английский с удовольствием для всех возрастов',
    description: 'Вокабанд — приложение для изучения английского для всех возрастов: дети, подростки, взрослые. 9000+ слов, 15 игр, живые соревнования в классе, очки и серии. Бесплатно для учителей.',
    ogLocale: 'ru_RU',
    dir: 'ltr',
  },
};

// Only the SPA's public landing routes get localized — internal app
// views (dashboard, classroom, etc.) aren't SEO-relevant. The static
// /answers/*.html pages have their own hand-crafted metadata and must
// NOT be rewritten.
const LOCALIZABLE_SPA_PATHS: ReadonlySet<string> = new Set([
  '/',
  '/student',
  '/accessibility-statement',
]);

function localizeHtmlResponse(response: Response, lang: LocalizableLang): Response {
  const meta = LOCALIZED_META[lang];
  return new HTMLRewriter()
    .on('html', {
      element(el) {
        el.setAttribute('lang', lang);
        el.setAttribute('dir', meta.dir);
      },
    })
    .on('title', {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute('content', meta.description);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute('content', meta.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute('content', meta.description);
      },
    })
    .on('meta[property="og:locale"]', {
      element(el) {
        el.setAttribute('content', meta.ogLocale);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute('content', meta.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute('content', meta.description);
      },
    })
    .transform(response);
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
//
// PII audit (H-11, 2026-05-23): the `sound` bucket is deliberately public
// (read-only by anyone — students worldwide need to fetch MP3s without auth).
// Upload paths audited:
//   - server.ts:3049-3063  → filename = `${wordId}.mp3` (numeric vocabulary
//                            ID, no PII)
//   - scripts/upload-audio.ts  → same numeric-ID pattern
// No teacher name, student name, email, class code, or other identifier
// ever lands in a `sound/` filename or in the audio content (the audio IS
// the vocabulary word itself, synthesised by Google Cloud TTS).  Public
// read access is therefore acceptable.  Write access is service-role only.
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

// Endpoints we feel safe edge-caching: GET-only, fully public payloads
// (no PII, no per-user variance).  Cached at the edge for 60 s with a
// stale-while-revalidate window so a brief Fly cold-start can still
// serve from the edge.  Authenticated endpoints (anything that could
// vary by user) MUST NOT appear here — they fall through to the
// passthrough proxy which sets Vary: Authorization as a defence in
// depth against any future caching mistakes.
const EDGE_CACHEABLE_GET_PATHS: ReadonlySet<string> = new Set([
  "/api/features",
  "/api/version",
]);

async function passthroughProxy(request: Request, url: URL): Promise<Response> {
  const backendUrl = new URL(url.pathname + url.search, API_BACKEND);
  const upstream = await fetch(new Request(backendUrl.toString(), request));
  // Defence in depth: even though Cloudflare won't cache non-cacheable
  // responses by default, mark every proxied /api/* response as varying
  // by Authorization so an accidentally-added cache rule downstream
  // can't cross-contaminate users on shared classroom devices.
  const headers = new Headers(upstream.headers);
  const existingVary = headers.get("Vary");
  if (!existingVary || !/authorization/i.test(existingVary)) {
    headers.set("Vary", existingVary ? `${existingVary}, Authorization` : "Authorization");
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function edgeCachedGet(request: Request, url: URL): Promise<Response> {
  const backendUrl = new URL(url.pathname + url.search, API_BACKEND);
  // The cache key purposely strips the Authorization header — these
  // endpoints have no per-user variance, so one cache entry is
  // appropriate.  If we ever cache an auth-bearing endpoint, switch
  // the key strategy (e.g. hash the bearer) before adding the path.
  const cacheKey = new Request(backendUrl.toString(), { method: "GET" });
  // `caches.default` is the Cloudflare Workers per-colony cache —
  // it's a runtime global, not in the standard DOM `CacheStorage`
  // typing, so we cast to `any` to access it.  Wrangler types this
  // correctly at deploy time; the cast just keeps the main `tsc`
  // (which uses the DOM lib) happy if this file ever gets included.
  const cache = (caches as unknown as { default: Cache }).default;

  const hit = await cache.match(cacheKey);
  if (hit) {
    const headers = new Headers(hit.headers);
    headers.set("X-Edge-Cache", "HIT");
    return new Response(hit.body, { status: hit.status, headers });
  }

  const upstream = await fetch(new Request(backendUrl.toString(), request));
  // Only cache 2xx — never cache an error response or a 304.  Errors
  // should re-hit the origin so the next request gets a chance to
  // see a recovery.
  if (upstream.ok) {
    const headers = new Headers(upstream.headers);
    headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    headers.set("X-Edge-Cache", "MISS");
    const cacheable = new Response(upstream.clone().body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
    // Workers' `caches.default.put` returns a Promise; we await it
    // so the response we return below isn't competing with the put
    // for the body stream.  ctx.waitUntil would be cleaner but the
    // current handler signature doesn't expose ctx.
    await cache.put(cacheKey, cacheable.clone());
    return cacheable;
  }
  return upstream;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Canonicalize www → apex at the edge.  Supabase's auth allowlist
    // contains `https://vocaband.com/**` but not the `www.` host, and the
    // Site URL is the apex.  Visiting `www.vocaband.com` previously used
    // a JS-side `window.location.replace()` in main.tsx — that paid one
    // full HTML + entry-chunk round-trip just to learn the page should
    // redirect.  Issuing a 301 here at the edge skips the entire
    // download.  src/main.tsx's canonicalizeHost() is left in place as a
    // safety net for static-asset URLs that bypass the Worker (Cloudflare
    // Workers Assets routes JS/CSS requests directly without invoking
    // the Worker), but the cold-load HTML path now hits this redirect
    // first and never executes the JS fallback.
    if (url.hostname === "www.vocaband.com") {
      const target = `https://vocaband.com${url.pathname}${url.search}${url.hash}`;
      return Response.redirect(target, 301);
    }

    // Edge-handled routes (run on the Worker, NOT proxied). These must come
    // before the /api/* proxy fallthrough or they'll be forwarded to Fly.io
    // and return a 404.
    if (url.pathname === "/api/audio-pack") {
      return handleAudioPack(request, env);
    }

    // Public, GET-only, no-PII endpoints get the Cloudflare edge cache.
    // Everything else falls through to the passthrough proxy below.
    if (request.method === "GET" && EDGE_CACHEABLE_GET_PATHS.has(url.pathname)) {
      return edgeCachedGet(request, url);
    }

    // Proxy everything else under /api/* and /socket.io/* to the Fly.io
    // backend. Same-origin from the browser's view (no CORS preflight).
    if (url.pathname.startsWith("/api/")) {
      return passthroughProxy(request, url);
    }
    if (url.pathname.startsWith("/socket.io/")) {
      // Pass the original Request as fetch()'s init parameter — wrapping
      // with `new Request(url, request)` produces a fresh Request without
      // the WebSocket-upgrade marker the Workers runtime uses to bridge
      // client ↔ backend. The upgrade headers reach Fly.io, but Cloudflare
      // never establishes the WebSocket pair, so wss://vocaband.com/socket.io/
      // fails to connect.
      const backendUrl = new URL(url.pathname + url.search, API_BACKEND);
      return fetch(backendUrl.toString(), request);
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

    // SPA landing routes with a ?lang=he|ar|ru hint get their metadata
    // rewritten at the edge so Googlebot indexes a localized page (not
    // the English default) when it crawls the hreflang alternates
    // declared in index.html + sitemap.xml. English (or no lang param)
    // falls through to the bare asset, which already carries the
    // English metadata. We only run the rewriter when the asset
    // actually came back as HTML — protects /answers/*.html and any
    // future static file from accidental rewrite.
    const langParam = url.searchParams.get('lang');
    const isLocalizable = (v: string | null): v is LocalizableLang =>
      v === 'he' || v === 'ar' || v === 'ru';
    if (isLocalizable(langParam) && LOCALIZABLE_SPA_PATHS.has(url.pathname)) {
      const assetResponse = await env.ASSETS.fetch(request);
      const contentType = assetResponse.headers.get('content-type') ?? '';
      if (contentType.toLowerCase().includes('text/html')) {
        return localizeHtmlResponse(assetResponse, langParam);
      }
      return assetResponse;
    }

    // Everything else: serve static assets. env.ASSETS handles the SPA
    // fallback (index.html for unknown paths).
    return env.ASSETS.fetch(request);
  },
};
