/**
 * Generate AI sentences for a Quick Play session and store them on the
 * quick_play_sessions row.  Called by the teacher's browser right after
 * a new session is created, so every student who joins later reads the
 * SAME high-quality sentences from the row.  Without this, Quick Play
 * falls back to the small POS-template library in
 * `src/data/sentence-bank.ts` — fine for Sentence Builder, but Fill in
 * the Blank exposes its limitations because the templates rarely
 * provide enough context to infer the missing word.
 *
 * Why client-side and not server-side: students join as guests with no
 * Supabase session, so their browser can't call the teacher-only AI
 * endpoint.  Doing the AI call from the teacher's browser at session-
 * create time is the simplest split — one AI call per session, the
 * result lives in the database, and N students all read it for free.
 *
 * Fire-and-forget at the call site.  If anything fails, the row is
 * left with `ai_sentences = null` and the read-side falls back to
 * template sentences exactly like before this feature shipped.  No
 * student sees an error.
 */
import { supabase } from "../core/supabase";
import type { Word } from "../data/vocabulary";

export async function generateAndStoreQuickPlayAiSentences(
  sessionId: string,
  words: Word[],
  difficulty: 1 | 2 | 3 | 4 = 2,
): Promise<void> {
  if (!sessionId || words.length === 0) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.warn("[QP AI sentences] no auth session — skipping AI generation");
      return;
    }

    const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "";
    const englishOnly = words.map(w => w.english).filter(Boolean);

    const res = await fetch(`${apiUrl}/api/generate-sentences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ words: englishOnly, difficulty }),
    });
    if (!res.ok) {
      let reason = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        // Free-tier teachers get { error: "ai_requires_pro" } -- not a
        // bug, just a paywall.  Background job: log + use template
        // fallback (already configured below).  Never shown to user.
        if (body?.message) reason = body.message;
        else if (body?.error) reason = body.error;
      } catch { /* body wasn't JSON */ }
      console.warn(`[QP AI sentences] generation failed (${reason}) — falling back to templates`);
      return;
    }
    const { sentences } = await res.json();
    if (!Array.isArray(sentences) || sentences.length === 0) {
      console.warn("[QP AI sentences] empty sentences array — skipping update");
      return;
    }

    const { error: updateErr } = await supabase
      .from("quick_play_sessions")
      .update({ ai_sentences: sentences })
      .eq("id", sessionId);
    if (updateErr) {
      console.warn("[QP AI sentences] update failed:", updateErr.message);
      return;
    }
  } catch (err) {
    // Non-fatal — student-side fall-back to templates handles the gap.
    console.warn("[QP AI sentences] unexpected error:", err);
  }
}
