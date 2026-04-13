/**
 * Cloudflare Workers entry point for Vocaband.
 *
 * Handles:
 * 1. /api/ocr — OCR via Claude Vision (runs entirely in the Worker, no Render)
 * 2. /api/* and /socket.io/* — proxied to Render backend (api.vocaband.com)
 * 3. Everything else — static SPA assets via env.ASSETS
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ANTHROPIC_API_KEY?: string;
}

const API_BACKEND = "https://api.vocaband.com";

// ── OCR Handler ─────────────────────────────────────────────────────────────
// Runs Claude Haiku Vision directly from the Worker. No Render dependency.
// This eliminates cold starts, CORS issues, and proxy timeouts.
async function handleOcr(request: Request, env: Env): Promise<Response> {
  // Only accept POST
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Basic auth check (must have a token — the OCR button is only shown
  // to authorized teachers, so we trust the client-side gate check)
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  // Check API key
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OCR not configured", message: "ANTHROPIC_API_KEY is not set in Worker secrets." },
      { status: 503 }
    );
  }

  try {
    // Parse multipart form data (native Web API — no multer needed)
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "No image file uploaded" },
        { status: 400 }
      );
    }

    // Convert file to base64 — use chunked approach for performance.
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Anthropic Vision API has a 5MB base64 limit (~3.7MB raw file).
    // If the image is too large, return a clear error.
    if (bytes.length > 3_500_000) {
      return Response.json(
        { error: `Image too large (${Math.round(bytes.length / 1024)} KB). Please use a lower resolution photo or crop a smaller area. Max ~3.5 MB.` },
        { status: 413 }
      );
    }

    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Image = btoa(binary);

    // Map MIME type (Anthropic only accepts jpeg/png/gif/webp)
    const rawMime = file.type || "image/jpeg";
    const mediaType =
      rawMime === "image/heic" || rawMime === "image/heif"
        ? "image/jpeg"
        : rawMime;

    // Call Claude Haiku Vision API directly
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: `Extract ALL English words from this image. Return ONLY a JSON array of lowercase English words, nothing else. Example: ["apple","banana","cat"]

Rules:
- Include every English word you can read, no matter how small
- Lowercase all words
- Remove duplicates
- Skip numbers, symbols, and non-English text (Hebrew, Arabic, etc.)
- Include words even if partially obscured or blurry
- If you cannot read any English words, return []`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("[OCR Worker] Anthropic API error:", anthropicRes.status, errBody);
      return Response.json(
        { error: `AI service error (${anthropicRes.status})`, message: errBody.substring(0, 200) },
        { status: 502 }
      );
    }

    const result: any = await anthropicRes.json();
    const responseText =
      result.content?.[0]?.type === "text" ? result.content[0].text : "";

    // Parse JSON array from Claude's response
    let words: string[] = [];
    try {
      const cleaned = responseText.replace(/```json?\s*|\s*```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        words = parsed
          .filter((w: unknown): w is string => typeof w === "string" && w.length >= 2)
          .map((w: string) => w.toLowerCase().trim());
      }
    } catch {
      // Fallback: split by delimiters
      words = responseText
        .replace(/[\[\]"`,]/g, " ")
        .split(/\s+/)
        .filter((w: string) => /^[a-zA-Z]{2,}$/.test(w))
        .map((w: string) => w.toLowerCase());
    }

    const uniqueWords = [...new Set(words)];

    return Response.json({
      words: uniqueWords,
      raw_text: responseText,
      success: true,
    });
  } catch (error: any) {
    console.error("[OCR Worker] Error:", error?.message || error);
    return Response.json(
      { error: "OCR processing failed", message: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// ── OCR Status ──────────────────────────────────────────────────────────────
function handleOcrStatus(env: Env): Response {
  return Response.json({
    engine: "claude-haiku-vision",
    runtime: "cloudflare-worker",
    apiKeySet: !!env.ANTHROPIC_API_KEY,
  });
}

// ── Main Router ─────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle OCR directly in the Worker (no Render dependency)
    if (url.pathname === "/api/ocr" && request.method === "POST") {
      return handleOcr(request, env);
    }
    if (url.pathname === "/api/ocr/status") {
      return handleOcrStatus(env);
    }

    // Proxy all other API + Socket.IO traffic to Render
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/socket.io/")
    ) {
      const backendUrl = new URL(url.pathname + url.search, API_BACKEND);
      return fetch(new Request(backendUrl.toString(), request));
    }

    // Static assets (SPA)
    return env.ASSETS.fetch(request);
  },
};
