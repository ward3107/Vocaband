/**
 * Quick Play "create session" handlers — pulled out of App.tsx's
 * `quick-play-setup` route so the view branch stays JSX-only.
 *
 * Two flavours:
 *   - English: receives mixed Word[] (positive-id DB words + negative-id
 *     custom rows), splits them, calls the v1 RPC, fires AI sentence
 *     generation.
 *   - Hebrew: receives lemma ids, projects HEBREW_LEMMAS into the same
 *     Word shape the monitor / resume code expects, calls the
 *     subject-aware RPC.  Requires the 20260510_quick_play_subject
 *     migration; without it the RPC rejects p_subject.
 *
 * Behaviour preserved exactly (including the sessionStorage skip-restore
 * clear and the localStorage resume hint): the only change is location.
 */
import { supabase } from '../core/supabase';
import type { Word } from '../data/vocabulary';

type ToastFn = (
  message: string,
  type?: 'success' | 'error' | 'info',
  options?: { action?: { label: string; onClick: () => void } },
) => void;

export interface ActiveQuickPlaySession {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
  allowedModes?: string[];
  aiSentences?: string[];
}

export interface QuickPlaySessionDeps {
  showToast: ToastFn;
  failedCreateSessionMsg: (err: string) => string;
  setSessionCode: (code: string) => void;
  setActiveSession: (s: ActiveQuickPlaySession) => void;
}

// Clear the skip-restore flag + write a resume hint to localStorage.
// Quota-exceeded / private-mode failures are silent — the UI still
// works without the hint, the kid just won't see a resume banner.
function persistResumeHint(
  sessionId: string,
  words: Word[],
  allowedModes: string[],
): void {
  try {
    sessionStorage.removeItem('vocaband_skip_restore');
    localStorage.setItem(
      'vocaband_quick_play_session',
      JSON.stringify({ id: sessionId, words, allowedModes }),
    );
  } catch {
    /* quota exceeded — safe to ignore */
  }
}

export async function createEnglishQuickPlaySession(
  words: Word[],
  modes: string[],
  deps: QuickPlaySessionDeps,
  generateAiSentences: (sessionId: string, words: Word[], difficulty: 1 | 2 | 3 | 4) => void,
): Promise<string> {
  const dbWords = words.filter((w) => w.id >= 0);
  const customWords = words.filter((w) => w.id < 0);
  const wordIds = dbWords.map((w) => w.id);

  const customWordsJson =
    customWords.length > 0
      ? JSON.stringify(
          customWords.map((w) => ({
            english: w.english,
            hebrew: w.hebrew,
            arabic: w.arabic,
          })),
        )
      : null;

  const { data, error } = await supabase.rpc('create_quick_play_session', {
    p_word_ids: wordIds.length > 0 ? wordIds : null,
    p_custom_words: customWordsJson,
    p_allowed_modes: modes,
  });

  if (error) {
    deps.showToast(deps.failedCreateSessionMsg(error.message), 'error');
    throw error;
  }

  const session = data as { id: string; session_code: string; allowed_modes?: string[] };
  // Prefer the server's echoed allowed_modes over the local modes
  // array so we agree with whatever the DB actually persisted.
  const effectiveAllowedModes =
    session.allowed_modes && session.allowed_modes.length > 0
      ? session.allowed_modes
      : modes;

  deps.setSessionCode(session.session_code);
  deps.setActiveSession({
    id: session.id,
    sessionCode: session.session_code,
    wordIds,
    words,
    allowedModes: effectiveAllowedModes,
  });

  // Fire-and-forget AI sentence generation. If this fails the
  // student side falls back to template sentences.
  generateAiSentences(session.id, words, 2);

  persistResumeHint(session.id, words, effectiveAllowedModes);
  return session.session_code;
}

export async function createHebrewQuickPlaySession(
  lemmaIds: number[],
  modes: string[],
  hebrewTitle: string | undefined,
  deps: QuickPlaySessionDeps,
): Promise<string> {
  // hebrewTitle is accepted by the wizard for future use (when we add
  // a sessions.title column) but not persisted today.
  void hebrewTitle;

  const { data, error } = await supabase.rpc('create_quick_play_session', {
    p_word_ids: lemmaIds.length > 0 ? lemmaIds : null,
    p_custom_words: null,
    p_allowed_modes: modes,
    p_subject: 'hebrew',
  });

  if (error) {
    deps.showToast(deps.failedCreateSessionMsg(error.message), 'error');
    throw error;
  }

  const session = data as { id: string; session_code: string; allowed_modes?: string[] };
  const effectiveAllowedModes =
    session.allowed_modes && session.allowed_modes.length > 0
      ? session.allowed_modes
      : modes;

  // Project Hebrew lemmas into the Word shape the Quick Play monitor /
  // resume state expects. Same projection useQuickPlayUrlBootstrap uses
  // on the student side, so both ends agree.  Dynamic import keeps the
  // Hebrew corpus out of the English bundle — by the time we get here
  // the HebrewQuickPlaySetupView chunk has already loaded it, so this
  // resolves from cache.
  const { HEBREW_LEMMAS } = await import('../data/vocabulary-hebrew');
  const projectedWords: Word[] = HEBREW_LEMMAS
    .filter((l) => lemmaIds.includes(l.id))
    .map((l) => ({
      id: l.id,
      english: l.translationEn,
      hebrew: l.lemmaNiqqud,
      arabic: l.translationAr,
      level: 'Custom' as const,
    }));

  deps.setSessionCode(session.session_code);
  deps.setActiveSession({
    id: session.id,
    sessionCode: session.session_code,
    wordIds: lemmaIds,
    words: projectedWords,
    allowedModes: effectiveAllowedModes,
  });

  // Hebrew QP doesn't yet generate AI sentences — the 4 wired Hebrew
  // modes (niqqud, shoresh, synonym, listening) don't read sentences.
  // Sentence Builder isn't in the Hebrew mode set, so skipping AI
  // generation here is correct, not a gap.

  persistResumeHint(session.id, projectedWords, effectiveAllowedModes);
  return session.session_code;
}
