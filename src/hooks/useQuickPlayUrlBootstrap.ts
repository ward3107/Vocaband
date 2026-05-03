/**
 * useQuickPlayUrlBootstrap — first-load bootstrap for Quick Play guests.
 *
 * Fires once on mount and forks on whether the URL has a `?session=`
 * parameter (typical QR-scan path) or there's a saved guest session in
 * localStorage from a previous round (page-refresh recovery):
 *
 * 1. URL has `?session=CODE` (QR scan):
 *    - Stale-token cleanup (under v2: skip the anon sign-in but still
 *      wipe stale sb-*-auth-token from localStorage).
 *    - Fetch the active quick_play_sessions row.
 *    - Hydrate the student-side Quick Play state.
 *    - If the same student already has a saved guest session for this
 *      sessionId, auto-rejoin straight into the game; otherwise route
 *      to the join screen (`quick-play-student`).
 *
 * 2. No URL param but localStorage has `vocaband_qp_guest`:
 *    - Verify the saved session is still active.
 *    - If yes, rejoin straight into the game; if no, drop the saved
 *      guest data so the next mount starts cleanly.
 *
 * Mechanical extraction from a 250-line useEffect that previously lived
 * at the top of App.tsx. Same flow, same error-handling, same v2 flag
 * behaviour — just owned by the hook so the orchestrator file isn't
 * carrying URL-bootstrap plumbing inline.
 */
import { useEffect } from "react";
import {
  supabase,
  type AssignmentData,
  type AppUser,
} from "../core/supabase";
import type { Word } from "../data/vocabulary";
import { getCachedVocabulary } from "./useVocabularyLazy";
import { generateSentencesForAssignment } from "../data/sentence-bank";
import { getGameDebugger } from "../utils/gameDebug";
import { ALL_GAME_MODES } from "../constants/game";
import type { View } from "../core/views";

/** What this hook hydrates into App.tsx's quickPlayActiveSession state.
 *  Index signature keeps it assignable to the wider concrete shape App
 *  uses without forcing the call site to cast. */
interface QuickPlaySessionShape {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
  allowedModes?: string[];
  aiSentences?: string[];
}

const QUICKPLAY_V2 = import.meta.env.VITE_QUICKPLAY_V2 === "true";

export interface UseQuickPlayUrlBootstrapParams {
  setView: (v: View) => void;
  setUser: (user: AppUser | null) => void;
  setQuickPlayActiveSession: (s: QuickPlaySessionShape | null) => void;
  setQuickPlayStudentName: (name: string) => void;
  setQuickPlayAvatar: (avatar: string) => void;
  setActiveAssignment: (a: AssignmentData | null) => void;
  setAssignmentWords: (w: Word[]) => void;
  setShowModeSelection: (show: boolean) => void;
  /** App-level guest-user factory — same signature as App.tsx's helper. */
  createGuestUser: (name: string, prefix?: string, avatar?: string) => AppUser;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function useQuickPlayUrlBootstrap(params: UseQuickPlayUrlBootstrapParams) {
  const {
    setView, setUser,
    setQuickPlayActiveSession, setQuickPlayStudentName, setQuickPlayAvatar,
    setActiveAssignment, setAssignmentWords, setShowModeSelection,
    createGuestUser, showToast,
  } = params;

  useEffect(() => {
    const gameDebug = getGameDebugger();
    const params = new URLSearchParams(window.location.search);
    const sessionCode = params.get('session');

    if (sessionCode) {
      // Load Quick Play session
      const loadQuickPlaySession = async () => {
        // ─── Legacy anon-auth bootstrap (v2 skips the anon sign-in) ────
        // Ensure we have a VALID anonymous auth session — RLS requires it.
        //
        // `getSession()` only reads localStorage, so a stale token (from a
        // previous Quick Play whose anon user has since been deleted by the
        // 20260429 cleanup cron) sneaks past unnoticed.  The first real
        // auth-aware call then fails with `session_not_found` (403),
        // Supabase fires SIGNED_OUT, and the student is bounced to login
        // mid-Quick-Play-join.
        //
        // Recover silently: validate with `getUser()` (which actually hits
        // the server).  If the server rejects, surgically remove the
        // sb-*-auth-token entry from localStorage and create a fresh anon
        // session.  We deliberately do NOT call `supabase.auth.signOut()`
        // — that fires the SIGNED_OUT listener at line ~2070 which runs
        // cleanup + setUser(null) + history reset MID-join and tears
        // down the live component tree (caused 8/10 student crashes in a
        // classroom test).
        //
        // Under v2: we still wipe stale sb-*-auth-token entries, because
        // they'd otherwise be sent as the `authorization` header on every
        // Supabase query — including the quick_play_sessions lookup below
        // — and a server-rejected token returns an error that bounces the
        // student to landing. Skip only the signInAnonymously step, so no
        // new anon auth.users row is created.
        const { data: { session: cachedSession } } = await supabase.auth.getSession();
        let stale = false;
        if (cachedSession) {
          const { error } = await supabase.auth.getUser();
          stale = !!error;
        }
        if (stale) {
          try {
            for (const key of Object.keys(localStorage)) {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            }
          } catch { /* private mode / disabled storage — fall through */ }
        }
        // Sign in anonymously when there's no usable cached session,
        // regardless of the V2 flag.  Reasoning: the QP session row
        // SELECT depends on RLS allowing the role making the call.
        // If the anon-read policy on `quick_play_sessions` ever drifts
        // (a future security migration tightening it to `authenticated`
        // only — the exact regression that made students hit "session
        // inactive" → bounce to landing on 2026-04-25), an anon auth
        // session keeps the read working without a schema fix.  The
        // 30-day cleanup cron (migration 20260429) garbage-collects the
        // resulting anon auth.users rows so this doesn't accumulate.
        if (!cachedSession || stale) {
          await supabase.auth.signInAnonymously().catch(() => {});
        }

        const { data, error } = await supabase
          .from('quick_play_sessions')
          .select('*')
          .eq('session_code', sessionCode)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          // Verbose logging — this path is where we lose Quick Play
          // students to the landing page, so make the reason obvious
          // in DevTools on every failure mode.
          console.error('[Quick Play Load] session lookup failed', {
            sessionCode,
            error: error ? {
              message: error.message, code: error.code, details: error.details, hint: error.hint,
            } : null,
            dataIsNull: !data,
            quickPlayV2: QUICKPLAY_V2,
          });
          showToast("Invalid or expired Quick Play session. Please scan the QR code again.", "error");
          window.history.replaceState({}, '', window.location.pathname);
          setView("public-landing");
          return;
        }

        // Fetch database words from vocabulary.  Vocabulary is
        // lazy-loaded via useVocabularyLazy, but Quick Play guests
        // arrive via direct URL (QR scan) before any view that
        // triggers the lazy hook — so the cache is empty on first
        // load and curriculum-only sessions failed with "no words"
        // and bounced to landing.  Mirror the teacher-restore path
        // in App.tsx (~line 1232) and dynamic-import the module
        // when the cache is empty.  Resolves to the same chunk the
        // hook will use later.
        let vocab = getCachedVocabulary();
        if (!vocab) {
          try {
            const m = await import("../data/vocabulary");
            vocab = {
              ALL_WORDS: m.ALL_WORDS,
              SET_1_WORDS: m.SET_1_WORDS,
              SET_2_WORDS: m.SET_2_WORDS,
              SET_3_WORDS: (m as { SET_3_WORDS?: Word[] }).SET_3_WORDS ?? [],
              TOPIC_PACKS: m.TOPIC_PACKS,
            };
          } catch (err) {
            console.error('[Quick Play Load] vocabulary import failed', err);
          }
        }
        const dbWords = (vocab?.ALL_WORDS ?? []).filter(w => data.word_ids.includes(w.id));

        // Parse custom words from JSON
        let customWords: Word[] = [];
        if (data.custom_words) {
          try {
            const customWordsData = typeof data.custom_words === 'string'
              ? JSON.parse(data.custom_words)
              : data.custom_words;

            customWords = customWordsData.map((w: { english: string; hebrew: string; arabic: string; sentence?: string; example?: string }, index: number) => ({
              id: -(Date.now() + index), // Negative IDs for custom words
              english: w.english,
              hebrew: w.hebrew,
              arabic: w.arabic,
              sentence: w.sentence || "",
              example: w.example || "",
              level: "Custom" as const,
            }));
          } catch (e) {
            console.error('Failed to parse custom words:', e);
          }
        }

        // Combine database and custom words
        const allWords = [...dbWords, ...customWords];

        if (allWords.length === 0) {
          console.error('[Quick Play Load] No words in session!');
          showToast("This Quick Play session has no words. Please contact your teacher.", "error");
          window.history.replaceState({}, '', window.location.pathname);
          setView("public-landing");
          return;
        }

        setQuickPlayActiveSession({
          id: data.id,
          sessionCode: data.session_code,
          wordIds: data.word_ids,
          words: allWords,
          allowedModes: data.allowed_modes || undefined,
          // ai_sentences is populated by the teacher's session-create flow
          // (see generateAndStoreQuickPlayAiSentences).  Empty / null here
          // means the AI call hasn't finished yet OR failed — student-side
          // falls back to template sentences when reading.
          aiSentences: Array.isArray(data.ai_sentences) ? data.ai_sentences : undefined,
        });

        // Check if this student already joined this session (page refresh / re-scan)
        // Force them to rejoin with the SAME name to prevent name-swapping chaos
        try {
          const saved = localStorage.getItem('vocaband_qp_guest');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.sessionId === data.id && parsed.name) {
              // Verify they still have a progress record (weren't kicked)
              const { data: { session: authSession } } = await supabase.auth.getSession();
              const authUid = authSession?.user?.id;
              if (authUid) {
                // Check by uid OR by name to handle auth session refresh
                const { data: existingRecord } = await supabase
                  .from('progress')
                  .select('id, student_uid')
                  .eq('assignment_id', data.id)
                  .or(`student_uid.eq.${authUid},student_name.eq.${parsed.name}`)
                  .limit(1);
                if (existingRecord && existingRecord.length > 0) {
                  // Migrate old progress rows to current uid if they differ
                  const oldRecord = existingRecord[0];
                  if (oldRecord.student_uid !== authUid) {
                    await supabase
                      .from('progress')
                      .update({ student_uid: authUid })
                      .eq('assignment_id', data.id)
                      .eq('student_name', parsed.name);
                  }
                  // Auto-rejoin with same name and avatar
                  const guestUser = createGuestUser(parsed.name, 'quickplay', parsed.avatar || '🦊');
                  setUser(guestUser);
                  setQuickPlayStudentName(parsed.name);
                  setQuickPlayAvatar(parsed.avatar || '🦊');
                  const words = allWords.map(w => ({ ...w, hebrew: w.hebrew || '', arabic: w.arabic || '' }));
                  setAssignmentWords(words);
                  const quickPlaySentences = generateSentencesForAssignment(words, 2);
                  setActiveAssignment({
                    id: "quickplay-" + data.id, classId: "", wordIds: words.map(w => w.id), words,
                    title: "Quick Play",
                    allowedModes: data.allowed_modes || ALL_GAME_MODES,
                    sentences: quickPlaySentences, sentenceDifficulty: 2,
                  });
                  gameDebug.logGameInit({
                    wordsCount: words.length,
                    modesCount: data.allowed_modes?.length || 10,
                    userId: 'quickplay_guest',
                  });
                  setView("game");
                  setShowModeSelection(true);
                  window.history.replaceState({}, '', window.location.pathname);
                  return; // Skip join screen — go straight to game
                }
              }
            }
          }
        } catch {}

        setView("quick-play-student");
      };

      loadQuickPlaySession();
    } else {
      // No URL param — try recovering a saved guest session from localStorage
      try {
        const saved = localStorage.getItem('vocaband_qp_guest');
        if (saved) {
          const { sessionId, sessionCode, name, avatar } = JSON.parse(saved);
          if (sessionId && sessionCode && name) {
            // Verify session is still active
            const loadSaved = async () => {
              const { data: { session: existingSession } } = await supabase.auth.getSession();
              if (!existingSession) await supabase.auth.signInAnonymously().catch(() => {});

              const { data } = await supabase
                .from('quick_play_sessions')
                .select('id, session_code, word_ids, allowed_modes, is_active, custom_words')
                .eq('id', sessionId)
                .eq('is_active', true)
                .maybeSingle();

              if (data) {
                const dbWords = (getCachedVocabulary()?.ALL_WORDS ?? []).filter(w => (data.word_ids || []).includes(w.id));
                let customWords: Word[] = [];
                if (data.custom_words) {
                  try {
                    const cw = typeof data.custom_words === 'string' ? JSON.parse(data.custom_words) : data.custom_words;
                    customWords = cw.map((w: { english: string; hebrew: string; arabic: string }, i: number) => ({
                      id: -(Date.now() + i), english: w.english, hebrew: w.hebrew, arabic: w.arabic, level: "Custom" as const,
                    }));
                  } catch {}
                }
                const allSessionWords = [...dbWords, ...customWords];
                if (allSessionWords.length > 0) {
                  setQuickPlayActiveSession({
                    id: data.id,
                    sessionCode: data.session_code,
                    wordIds: data.word_ids || [],
                    words: allSessionWords,
                    allowedModes: (data as { allowed_modes?: string[] }).allowed_modes || undefined,
                  });
                  setQuickPlayStudentName(name);
                  setQuickPlayAvatar(avatar || '🦊');
                  // Go straight to mode selection (they already joined)
                  const guestUser = createGuestUser(name, 'quickplay', avatar || '🦊');
                  setUser(guestUser);
                  const words = allSessionWords.map(w => ({ ...w, hebrew: w.hebrew || '', arabic: w.arabic || '' }));
                  setAssignmentWords(words);
                  const quickPlaySentences = generateSentencesForAssignment(words, 2);
                  setActiveAssignment({
                    id: "quickplay-" + data.id, classId: "", wordIds: words.map(w => w.id), words,
                    title: "Quick Play",
                    allowedModes: data.allowed_modes || ALL_GAME_MODES,
                    sentences: quickPlaySentences, sentenceDifficulty: 2,
                  });
                  gameDebug.logGameInit({
                    wordsCount: words.length,
                    modesCount: data.allowed_modes?.length || 10,
                    userId: 'quickplay_guest',
                  });
                  setView("game");
                  setShowModeSelection(true);
                  return;
                }
              }
              // Session ended or invalid — clear saved data
              localStorage.removeItem('vocaband_qp_guest');
            };
            loadSaved();
          }
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
