// postOcrImage — shared HTTP plumbing for /api/ocr.
//
// Both useOcrUpload (English Word pipeline) and runHebrewOcr (Hebrew
// lemma pipeline) hit the same Cloudflare Worker endpoint with the same
// auth + compression + timeout + error handling. Only the `lang` field
// and the post-extraction logic differ. This helper owns the shared
// plumbing; callers do their own post-processing on the returned
// `words[]` array.

import { supabase } from "../core/supabase";
import { compressImageForUpload } from "./compressImage";

export type OcrLang = "en" | "he";

export interface PostOcrImageResult {
  /** Extracted tokens. English entries are lowercased; Hebrew entries
   *  are niqqud-stripped consonant-only forms. */
  words: string[];
  /** Raw Gemini response text — kept for the "AI saw: ..." debug toast. */
  rawText: string;
}

export interface PostOcrImageError {
  /** Human-readable, ready to put in a toast. */
  message: string;
  /** True when /api/ocr returned 403 with `ai_requires_pro`. */
  isPaywall: boolean;
  /** True when the call timed out (60s). */
  isTimeout: boolean;
  status?: number;
}

export interface PostOcrImageCallbacks {
  /** Called periodically with a 0–100 number. Roughly: 5 → compressed,
   *  10 → uploading, 15..85 → server processing (smoothed), 88 →
   *  parsing, 95 → done. */
  onProgress?: (n: number) => void;
  /** Status string for the busy banner. */
  onStatus?: (s: string) => void;
}

/**
 * POST a compressed image to /api/ocr and return the extracted tokens.
 * Throws PostOcrImageError on every failure path so callers can surface
 * the right toast (paywall vs timeout vs generic).
 */
export async function postOcrImage(
  fileToProcess: File,
  lang: OcrLang,
  callbacks: PostOcrImageCallbacks = {},
): Promise<PostOcrImageResult> {
  const { onProgress, onStatus } = callbacks;
  const reportProgress = (n: number) => onProgress?.(n);
  const reportStatus = (s: string) => onStatus?.(s);

  reportProgress(5);
  reportStatus(lang === "he" ? "דחיסת תמונה..." : "Compressing image...");

  let file: File;
  try {
    file = await compressImageForUpload(fileToProcess);
  } catch {
    file = fileToProcess;
  }
  const fileSizeKB = Math.round(file.size / 1024);
  reportProgress(10);
  reportStatus(
    lang === "he"
      ? `שליחת תמונה... (${fileSizeKB} KB)`
      : `Uploading image... (${fileSizeKB} KB)`,
  );

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    const err: PostOcrImageError = {
      message: lang === "he" ? "נא להיכנס מחדש למערכת." : "Please sign in again.",
      isPaywall: false,
      isTimeout: false,
    };
    throw err;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("lang", lang);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  // Smoothed 15→85% progress while the server works. Cleared in finally.
  let simProgress = 15;
  reportProgress(15);
  const progressInterval = window.setInterval(() => {
    simProgress += (85 - simProgress) * 0.08;
    reportProgress(Math.round(simProgress));
  }, 400);

  const statusTimer1 = window.setTimeout(
    () => reportStatus(lang === "he" ? "ניתוח עם AI..." : "Analyzing with AI..."),
    2000,
  );
  const statusTimer2 = window.setTimeout(
    () => reportStatus(lang === "he" ? "חילוץ מילים..." : "Extracting words..."),
    6000,
  );

  let response: Response;
  try {
    response = await fetch("/api/ocr", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      const e: PostOcrImageError = {
        message:
          lang === "he"
            ? "זיהוי הטקסט ארך זמן רב מדי. נסו שוב עם תמונה ברורה יותר."
            : "OCR timed out — the image may be too complex. Try a clearer photo or a smaller area.",
        isPaywall: false,
        isTimeout: true,
      };
      throw e;
    }
    const e: PostOcrImageError = {
      message:
        lang === "he"
          ? "שגיאה בשליחת התמונה. בדקו את החיבור."
          : "Network error sending the image. Check your connection.",
      isPaywall: false,
      isTimeout: false,
    };
    throw e;
  } finally {
    clearTimeout(timeoutId);
    clearTimeout(statusTimer1);
    clearTimeout(statusTimer2);
    clearInterval(progressInterval);
  }

  reportProgress(88);
  reportStatus(lang === "he" ? "עיבוד התוצאות..." : "Processing results...");

  if (!response.ok) {
    let message = `OCR failed (${response.status})`;
    let isPaywall = false;
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      message = data.message || data.error || message;
      isPaywall = response.status === 403 && data.error === "ai_requires_pro";
    } catch { /* response wasn't JSON */ }
    const e: PostOcrImageError = { message, isPaywall, isTimeout: false, status: response.status };
    throw e;
  }

  let payload: { words?: string[]; raw_text?: string };
  try {
    payload = await response.json();
  } catch {
    const e: PostOcrImageError = {
      message:
        lang === "he"
          ? "השרת החזיר תשובה לא תקינה."
          : "Server returned an invalid response. Please try again.",
      isPaywall: false,
      isTimeout: false,
    };
    throw e;
  }
  reportProgress(95);

  return {
    words: payload.words ?? [],
    rawText: payload.raw_text ?? "",
  };
}

/** True when `err` came from postOcrImage. Type narrowing helper. */
export function isPostOcrImageError(err: unknown): err is PostOcrImageError {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    "isPaywall" in err &&
    "isTimeout" in err
  );
}
