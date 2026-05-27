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
import { QP_CATEGORY_RACE_MODE } from '../core/quickPlayProtocol';

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
  // Guard against creating a session with zero words.  The student-side
  // hydration (useQuickPlayUrlBootstrap) bails out and bounces to landing
  // when allWords.length === 0, which presents to the student as an
  // unexplained white-then-redirect.  Fail loudly at the teacher's
  // create-step instead so they realise the picker is empty.
  if (words.length === 0) {
    deps.showToast(deps.failedCreateSessionMsg("Pick at least one word before starting a Quick Play."), "error");
    throw new Error("Cannot create Quick Play session: no words selected");
  }

  // Split selected words by SOURCE, not by ID sign, so that words
  // sourced from the Vocabulary Library (LibrarySetsPanel) don't get
  // mis-categorised.  When a Library word has no canonical
  // curriculum_word_id matching ALL_WORDS, toPickerWord falls back to
  // a 9-digit synthetic id from hashEnglishToId() AND stamps
  // level: "Custom".  Routing by `id >= 0` previously put those words
  // into dbWords, which writes their synthetic ids into
  // quick_play_sessions.word_ids — but the student-side hydration
  // filters bundled ALL_WORDS by those ids and finds nothing, so the
  // student bounces to landing with "No words in session" even though
  // the teacher saw words on screen.  Filtering by `level === "Custom"`
  // routes Library-fallback words into the custom_words JSON instead,
  // where their full english/hebrew/arabic text travels with the
  // session and the student-side reads them as custom words.
  const dbWords = words.filter((w) => w.id >= 0 && w.level !== "Custom");
  const customWords = words.filter((w) => w.id < 0 || w.level === "Custom");
  const wordIds = dbWords.map((w) => w.id);

  // Defence-in-depth: if both lists are empty after the filter (eg.
  // every selected word slipped through with an unexpected shape), do
  // NOT create the session — abort with a toast.  Same shape failure
  // mode as `words.length === 0` but covers shape-corruption cases.
  if (wordIds.length === 0 && customWords.length === 0) {
    deps.showToast(deps.failedCreateSessionMsg("Selected words could not be saved (no usable ids or text). Try picking again."), "error");
    throw new Error("Cannot create Quick Play session: no usable words after filter");
  }

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

  // Same guard as the English path — see comment in
  // createEnglishQuickPlaySession.
  if (lemmaIds.length === 0) {
    deps.showToast(deps.failedCreateSessionMsg("Pick at least one lemma before starting a Quick Play."), "error");
    throw new Error("Cannot create Quick Play session: no lemmas selected");
  }

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

/**
 * Create a Category Race session — a Quick Play row with NO words and
 * allowed_modes set to the single race sentinel. The sentinel is the
 * discriminator the student bootstrap branches on to show the race
 * lobby instead of the regular word game. Round config (categories,
 * timer) is never persisted; the teacher sends it live with each round.
 */
export async function createCategoryRaceSession(
  deps: Pick<QuickPlaySessionDeps, 'showToast' | 'failedCreateSessionMsg' | 'setSessionCode' | 'setActiveSession'>,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_quick_play_session', {
    p_word_ids: null,
    p_custom_words: null,
    p_allowed_modes: [QP_CATEGORY_RACE_MODE],
  });

  if (error) {
    deps.showToast(deps.failedCreateSessionMsg(error.message), 'error');
    throw error;
  }

  const session = data as { id: string; session_code: string };
  deps.setSessionCode(session.session_code);
  deps.setActiveSession({
    id: session.id,
    sessionCode: session.session_code,
    wordIds: [],
    words: [],
    allowedModes: [QP_CATEGORY_RACE_MODE],
  });
  return session.session_code;
}
