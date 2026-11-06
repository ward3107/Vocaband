import { useBackLayer } from "../hooks/useBackLayer";
/**
 * SpeedRoundHostView — the teacher's control room for a live Speed Round,
 * laid out for a classroom projector. A sibling of CategoryRaceHostView,
 * built on the same Quick Play socket rails:
 *   - shows the join code + QR (students join the same way as Quick Play)
 *   - the teacher picks a word SET + a fast MODE + a round timer, then drops
 *     one word on the whole class at once with a shared deadline
 *   - the QUESTION is built CLIENT-SIDE here (the server has no vocabulary):
 *     prompt + options + correctIndex via buildSpeedQuestion; the server
 *     stores correctIndex privately and scores by index (design §3)
 *   - streams the live leaderboard as the dominant element so the class can
 *     read names + scores from the back of the room
 *   - re-animates the podium after each word + highlights the per-word winner
 *
 * Theme: follows the teacher's dashboard palette via the shared --vb-*
 * tokens, exactly like the Category Race host.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Play, LogOut, Check, Copy, X, Monitor, Minimize2, Square, Zap, Plus } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { useVocabularyLazy } from "../hooks/useVocabularyLazy";
import { useSavedWordGroups } from "../hooks/useSavedWordGroups";
import GameResults from "../components/game/GameResults";
import TeamScoreBar from "../components/game/TeamScoreBar";
import TeamModeToggle from "../components/game/TeamModeToggle";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playRoundStart } from "../utils/raceSfx";
import { buildSpeedQuestion, type L1 } from "../utils/speedRoundQuestion";
import { QP_SPEED_ROUND_SECONDS, QP_SPEED_MODES, type QpSpeedMode } from "../core/quickPlayProtocol";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import LiveWordPickerModal, { liveWordPickerT } from "../components/game/LiveWordPickerModal";
import { useTranslate } from "../hooks/useTranslate";
import { postOcrImage } from "../utils/postOcrImage";
import { TOPIC_PACKS } from "../data/vocabulary";
import type { TranslationLang } from "../components/setup/WordInputStep2026";
import GameMusicPlayer from "../components/game/GameMusicPlayer";
import KickConfirmModal from "../components/game/KickConfirmModal";
import GameThemePicker from "../components/game/GameThemePicker";
import { useGameTheme } from "../hooks/useGameTheme";
import { SPEED_HOST_STRINGS, SPEED_MODE_META } from "./speedRoundStrings";
import { LIVE_GAME_ACCENTS } from "./liveGameAccents";
import LiveHostSteps from "../components/game/LiveHostSteps";

/** Enough words for distractor options (questions need 2–4 choices). */
const MIN_WORDS = 4;
/** Podium beat between auto-played words. */
const AUTO_ADVANCE_SECONDS = 4;
/** How many times the whole word list can cycle in one run. ×2 on a 10-word
 *  list = 20 rounds — lets short lists fill a longer session. */
const SPEED_REPEAT_OPTIONS = [1, 2, 3, 4] as const;

interface SpeedRoundHostViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

export default function SpeedRoundHostView({ sessionCode, setView }: SpeedRoundHostViewProps) {
  const { language, dir } = useLanguage();
  const t = SPEED_HOST_STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  // Teacher-selected board skin (persisted, shared across live games).
  const { themeId, theme, setThemeId } = useGameTheme();
  // Arabic sessions read the Arabic column; everything else reads Hebrew.
  const l1: L1 = language === "ar" ? "ar" : "he";

  const vocab = useVocabularyLazy(true);
  // Rich bulk word entry (paste / library / saved lists / OCR / AI) — same
  // picker the rest of the app uses, hosted in a modal so it has room.
  const { translateWord, translateWordsBatch } = useTranslate();
  const [wordPickerOpen, setWordPickerOpen] = useState(false);
  const [translationLang, setTranslationLang] = useState<TranslationLang>(l1 === "ar" ? "arabic" : "hebrew");
  const lwt = liveWordPickerT[language] ?? liveWordPickerT.en;

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const { status, currentSpeed, leaderboard, observeAsTeacher, startSpeedRound, endSpeedRound, endSession, onSpeedEnded, teamMode, setTeamMode } = qp;

  // The teacher's own word list (typed / picked from the library) — the
  // question pool AND the preferred distractor source. Replaces the old
  // fixed Set 1/2/3 picker (product call 2026-06-11: teachers run rounds
  // on exactly the 10–15 words they chose, not a whole curriculum set).
  const [pickedWords, setPickedWords] = useState<Word[]>([]);
  // One or more question modes — each word draws a random one, so the
  // teacher can mix classic + listening + reverse… in a single round.
  const [modes, setModes] = useState<QpSpeedMode[]>(["classic"]);
  const [roundSeconds, setRoundSeconds] = useState<number>(15);
  // How many times to cycle the whole word list in one run (×1–×4). The run
  // is over after `pickedWords.length * passes` words, not just one pass.
  const [passes, setPasses] = useState<number>(1);
  const [endedRoundId, setEndedRoundId] = useState<string | null>(null);
  const [winnerClientId, setWinnerClientId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hasRunRound, setHasRunRound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const qrOverlayRef = useRef<HTMLDivElement>(null);
  useBackLayer(() => setQrEnlarged(false), { enabled: qrEnlarged, priority: 50 });
  // Celebratory results overlay when ending a played game.
  const [showResults, setShowResults] = useState(false);
  const [presenting, setPresenting] = useState(false);
  // Two-step flow: 'setup' = adjust the game (words/modes/time/teams),
  // 'room' = the join board (QR + live roster) and live play. The teacher
  // configures first, then opens the room so students can scan in.
  const [phase, setPhase] = useState<"setup" | "room">("setup");
  const [buildError, setBuildError] = useState(false);
  // Student pending removal (clientId + nickname) — drives the confirm modal.
  const [confirmKick, setConfirmKick] = useState<{ clientId: string; nickname: string } | null>(null);
  // Auto-play: once the teacher starts the first word, each ended word
  // chains into the next after a short podium beat — no per-word click.
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  // Set when the teacher ends a word by hand, so auto-play doesn't relaunch.
  const endedManuallyRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  // Each word plays once PER PASS — when a pass is exhausted the list cycles
  // again (reshuffled) until `passes` passes are done, then the run is over
  // (no endless recycling). `usedWordIdsRef` tracks the CURRENT pass;
  // `completedRoundsRef` counts total words served across all passes;
  // `playedCount` mirrors that total so the UI re-renders as words are used.
  const usedWordIdsRef = useRef(new Set<number>());
  const completedRoundsRef = useRef(0);
  const [playedCount, setPlayedCount] = useState(0);

  const canStart = pickedWords.length >= MIN_WORDS;
  const totalRounds = pickedWords.length * passes;
  const allPlayed = totalRounds > 0 && playedCount >= totalRounds;

  // The teacher's saved word lists (same saved_word_groups the assignment
  // wizard writes). Passed RAW to WordPicker, which resolves the ids itself.
  const { groups: savedGroupsRaw, renameGroup, deleteGroup } = useSavedWordGroups();

  useEffect(() => {
    if (status !== "connected") return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || cancelled) return;
      tokenRef.current = token;
      observeAsTeacher(token);
    })();
    return () => { cancelled = true; };
  }, [status, observeAsTeacher]);

  const roundActive = !!currentSpeed && currentSpeed.roundId !== endedRoundId && now < currentSpeed.deadlineTs;
  useEffect(() => {
    if (!roundActive) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [roundActive]);

  // Server closed the word — record the ended id + the winner so the podium
  // can highlight them and the Start button re-enables.
  useEffect(() => onSpeedEnded((p) => {
    setEndedRoundId(p.roundId);
    setWinnerClientId(p.winnerClientId);
  }), [onSpeedEnded]);

  // Confetti the instant a word ends — bigger when it was the last one.
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (prevActiveRef.current && !roundActive) celebrate(allPlayed ? "big" : "normal");
    prevActiveRef.current = roundActive;
  }, [roundActive, allPlayed]);

  // &mode=speed lets the student bootstrap skip the unused vocab prefetch.
  const joinUrl = useMemo(() => `${window.location.origin}/?session=${sessionCode}&mode=speed`, [sessionCode]);

  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const secondsLeft = currentSpeed ? Math.max(0, Math.round((currentSpeed.deadlineTs - now) / 1000)) : 0;
  const lowTime = roundActive && secondsLeft <= 3;

  // Pick the next word. Each pass uses every word once (reshuffled); when a
  // pass is exhausted and more passes remain, the list cycles. Returns null
  // only once all `passes` passes are done — the run is OVER then, never
  // recycled past the chosen repeat count (teachers reported the old endless
  // loop felt broken on short 10–15 word lists).
  const pickNextWord = (): Word | null => {
    if (completedRoundsRef.current >= totalRounds) return null;
    let unused = pickedWords.filter(w => !usedWordIdsRef.current.has(w.id));
    if (unused.length === 0) {
      // Pass complete — start the next one with a fresh, reshuffled list.
      usedWordIdsRef.current.clear();
      unused = pickedWords.slice();
    }
    const word = unused[Math.floor(Math.random() * unused.length)];
    // Mark the word tried for THIS pass (so the retry loop draws a fresh one
    // and never re-picks an unbuildable word), but do NOT count the round
    // here — a drawn word whose question fails to build was never served to
    // students. completedRoundsRef advances only on a successful build in
    // handleStart, otherwise failed attempts inflate "words played" and end
    // the run before every word has actually been shown.
    usedWordIdsRef.current.add(word.id);
    return word;
  };

  // Build the next word's question client-side, then push it. Each word
  // draws a random mode from the teacher's selection; retries a few words
  // if one can't form a question for the drawn mode (no translation, etc.)
  // before giving up with a soft error.
  const handleStart = () => {
    if (!tokenRef.current || roundActive || !canStart) return;
    const fallback = vocab?.ALL_WORDS ?? pickedWords;
    let question = null;
    for (let attempt = 0; attempt < 8 && !question; attempt++) {
      const word = pickNextWord();
      if (!word) break; // list exhausted — the run is complete
      const mode = modes[Math.floor(Math.random() * modes.length)];
      question = buildSpeedQuestion({
        mode, word, pool: pickedWords, fallback, l1,
        trueFalseLabels: { yes: t.tfTrue, no: t.tfFalse },
      });
    }
    if (!question) {
      // Only an error if words remained but none could build a question;
      // exhausting the run is the normal "round complete" path. playedCount
      // is left unchanged — nothing was served this attempt.
      if (completedRoundsRef.current < totalRounds) setBuildError(true);
      return;
    }
    setBuildError(false);
    // Count the round only now that a question actually built and is about
    // to be pushed to students.
    completedRoundsRef.current += 1;
    setPlayedCount(completedRoundsRef.current);
    // The Start tap is a user gesture — prime + play the jingle.
    primeAudio();
    playRoundStart();
    setWinnerClientId(null);
    endedManuallyRef.current = false;
    startSpeedRound({ ...question, roundSeconds }, tokenRef.current);
    if (!hasRunRound) setPresenting(true);
    setHasRunRound(true);
  };

  // "Play again" — reset the used-words run and launch the first word in
  // the same tap (the ref clears synchronously, so handleStart sees a
  // fresh list).
  const handlePlayAgain = () => {
    usedWordIdsRef.current.clear();
    completedRoundsRef.current = 0;
    setPlayedCount(0);
    setWinnerClientId(null);
    handleStart();
  };

  const toggleMode = (m: QpSpeedMode) =>
    setModes(prev => prev.includes(m)
      ? (prev.length > 1 ? prev.filter(x => x !== m) : prev)
      : [...prev, m]);

  // ─── Auto-play: chain words automatically after the podium beat ──────
  // Armed only between words (hasRunRound && !roundActive) so the teacher
  // always launches the FIRST word explicitly. Any dependency change
  // (toggle off, word starting, list shrinking, run completing) cancels
  // the countdown.
  const handleStartRef = useRef(handleStart);
  useEffect(() => { handleStartRef.current = handleStart; });
  useEffect(() => {
    if (!autoPlay || roundActive || !hasRunRound || pickedWords.length < MIN_WORDS || allPlayed || endedManuallyRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cancels a pending countdown when auto-play conditions break
      setAutoCountdown(null);
      return;
    }
    setAutoCountdown(AUTO_ADVANCE_SECONDS);
    const id = window.setInterval(() => {
      setAutoCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          window.clearInterval(id);
          handleStartRef.current();
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoPlay, roundActive, hasRunRound, pickedWords.length, allPlayed]);

  const handleEndRound = () => {
    // A manual End must stop — don't let auto-play relaunch the next word.
    endedManuallyRef.current = true;
    if (currentSpeed && tokenRef.current) endSpeedRound(currentSpeed.roundId, tokenRef.current);
  };

  const leaveToDashboard = async () => {
    if (tokenRef.current) endSession(tokenRef.current);
    try { await supabase.rpc("end_quick_play_session", { p_session_code: sessionCode }); } catch { /* best-effort */ }
    setView("teacher-dashboard");
  };

  const handleEnd = () => {
    // Celebrate the result first if the class actually played.
    if (hasRunRound && sorted.length > 0) setShowResults(true);
    else void leaveToDashboard();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — ignore */ }
  };

  const A = LIVE_GAME_ACCENTS.speed;
  const cardCls = "bg-surface border-outline-variant shadow-lg";
  const headingCls = "text-on-surface";
  const pillIdle = "bg-surface border-outline-variant text-on-surface-variant hover:border-outline";
  const iconBtn = `bg-surface ${A.text600} hover:bg-surface-container border border-outline-variant`;

  const startLabel = hasRunRound ? t.nextWord : t.start;

  // Remove a student — available both in Controls and on the live/projected
  // board, since teachers need to drop a disruptive kid mid-game. The confirm
  // modal guards against an accidental tap in front of the class.
  const onKick = (clientId: string, nickname: string) => setConfirmKick({ clientId, nickname });

  return (
    <div className="min-h-[100dvh] transition-colors" dir={dir} style={presenting ? theme.page : { backgroundColor: 'var(--vb-surface-alt)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-2 mb-3">
          <h1 className={`min-w-0 font-black flex items-center gap-2 ${presenting ? `${theme.name} text-3xl sm:text-5xl min-[1700px]:text-7xl drop-shadow-lg` : `${headingCls} text-xl sm:text-3xl`}`}>
            <span className={`flex-shrink-0 ${presenting ? "text-4xl sm:text-6xl min-[1700px]:text-8xl" : "text-2xl sm:text-3xl"}`}>⚡</span>
            <span className="truncate">{t.title}</span>
          </h1>
          {phase === "setup" ? (
            <button
              type="button"
              onClick={handleEnd}
              style={{ touchAction: "manipulation" }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-stone-100 text-stone-600 hover:bg-stone-200 active:scale-95 transition"
            >
              <X size={16} /> <span className="hidden sm:inline">{t.cancel}</span>
            </button>
          ) : presenting ? (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-base sm:text-lg tracking-[0.12em] ${A.chipStatic}`}>
                {t.code}: {sessionCode}
              </span>
              <button
                type="button"
                onClick={() => setPresenting(false)}
                style={{ touchAction: "manipulation" }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm transition active:scale-95 ${iconBtn}`}
              >
                <Minimize2 size={16} /> {t.controls}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setPresenting(true)}
                aria-label={t.present}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95 transition"
              >
                <Monitor size={16} /> <span className="hidden sm:inline">{t.present}</span>
              </button>
              <button
                type="button"
                onClick={handleEnd}
                aria-label={t.end}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-95 transition"
              >
                <LogOut size={16} /> <span className="hidden sm:inline">{t.end}</span>
              </button>
            </div>
          )}
        </header>

        {!presenting && (
          <LiveHostSteps
            game="speed"
            language={language === "he" ? "he" : language === "ar" ? "ar" : "en"}
            stage={phase === "setup" ? "setup" : roundActive ? "play" : "room"}
          />
        )}

        {/* Background music — teacher can play/pause, skip, and adjust volume
            for the room while the round runs. Docks to a compact draggable
            corner pill in the room/projector, so it never covers the board. */}
        <GameMusicPlayer language={language} floating={presenting || phase === "room"} />

        {phase === "setup" ? (
          /* ─────────────── STEP 1 · Adjust the game ─────────────── */
          <div className="max-w-3xl mx-auto space-y-4 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TeamModeToggle
                teamMode={teamMode}
                onToggle={(en) => tokenRef.current && setTeamMode(en, tokenRef.current)}
                idleClass={pillIdle}
                cardClass={cardCls}
              />
              <GameThemePicker themeId={themeId} onSelect={setThemeId} language={language} />
            </div>

            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              {/* The teacher's word list — typed / picked from the library. */}
              <h2 className={`text-xs font-black uppercase tracking-widest ${A.label} mb-3`}>{t.wordsHeading}</h2>
              <button
                type="button"
                onClick={() => setWordPickerOpen(true)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 font-black text-sm transition ${
                  pickedWords.length > 0
                    ? "border-amber-300 text-amber-800 hover:border-amber-400 hover:bg-amber-50"
                    : "border-stone-300 text-stone-600 hover:border-amber-400 hover:text-amber-700"
                }`}
              >
                <Plus size={16} />
                {pickedWords.length > 0 ? `${lwt.words(pickedWords.length)} · ${lwt.edit}` : lwt.addFirst}
              </button>
              {pickedWords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pickedWords.slice(0, 12).map((w) => (
                    <span key={w.id} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">{w.english}</span>
                  ))}
                  {pickedWords.length > 12 && (
                    <span className="rounded-md px-2 py-0.5 text-xs font-bold text-stone-400">+{pickedWords.length - 12}</span>
                  )}
                </div>
              )}
              {pickedWords.length < MIN_WORDS && (
                <p className="mt-2 text-[11px] font-bold text-stone-400">{lwt.need(MIN_WORDS)}</p>
              )}

              {/* Modes — multi-select; each word draws a random one */}
              <h2 className={`text-xs font-black uppercase tracking-widest ${A.label} mt-5 mb-1`}>{t.modeHeading}</h2>
              <p className="text-[11px] font-bold text-stone-400 mb-3">{t.modeHint}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QP_SPEED_MODES.map((m) => {
                  const picked = modes.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMode(m)}
                      role="checkbox"
                      aria-checked={picked}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`relative rounded-xl p-2.5 text-start border-2 transition-all ${picked ? `bg-gradient-to-br ${A.grad} border-transparent text-white shadow-md` : pillIdle}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{SPEED_MODE_META[m].emoji}</span>
                        <span className="font-black text-xs truncate">{t.modeNames[m]}</span>
                        {picked && <Check size={13} strokeWidth={3} className="ms-auto flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                {/* Timer */}
                <div>
                  <h2 className={`text-xs font-black uppercase tracking-widest ${A.label} mt-5 mb-3`}>{t.timerHeading}</h2>
                  <div className="grid grid-cols-4 gap-2">
                    {QP_SPEED_ROUND_SECONDS.map((opt) => {
                      const picked = roundSeconds === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRoundSeconds(opt)}
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          className={`px-1 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? `bg-gradient-to-r ${A.grad} text-white border-transparent shadow-md` : pillIdle}`}
                        >
                          {t.seconds(opt)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Repeats — cycle the whole list ×1–×4 so short lists fill a
                    longer session (e.g. 10 words ×2 = 20 rounds). */}
                <div>
                  <h2 className={`text-xs font-black uppercase tracking-widest ${A.label} mt-5 mb-3`}>{t.repeatsHeading}</h2>
                  <div className="grid grid-cols-4 gap-2">
                    {SPEED_REPEAT_OPTIONS.map((opt) => {
                      const picked = passes === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPasses(opt)}
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          className={`px-1 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? `bg-gradient-to-r ${A.grad} text-white border-transparent shadow-md` : pillIdle}`}
                        >
                          {t.repeatsLabel(opt)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-[11px] font-bold text-stone-400 mt-2">{t.repeatsHint}</p>

              {/* Auto-play toggle — words chain themselves after the first. */}
              <button
                type="button"
                role="switch"
                aria-checked={autoPlay}
                onClick={() => setAutoPlay(v => !v)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`mt-5 w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border-2 transition-all ${autoPlay ? `${A.soft50} ${A.borderActive}` : pillIdle}`}
              >
                <span className={`font-black text-xs ${autoPlay ? A.text700 : ""}`}>⚡ {t.autoPlayLabel}</span>
                <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${autoPlay ? A.switchOn : "bg-stone-300"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${autoPlay ? "start-[18px]" : "start-0.5"}`} />
                </span>
              </button>
            </section>

            {/* Open the room → moves to Step 2 (students can now scan in). */}
            <button
              type="button"
              onClick={() => canStart && setPhase("room")}
              disabled={!canStart}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${canStart ? `bg-gradient-to-r ${A.grad} ${A.shadow30} active:scale-[0.98]` : "bg-stone-300 cursor-not-allowed"}`}
            >
              {canStart ? <>{t.openRoom} →</> : t.needWordsShort(MIN_WORDS)}
            </button>
          </div>
        ) : (
          /* A large prompt stage and a separate teacher control rail. */
          <>
            {teamMode && <div className="mb-4"><TeamScoreBar entries={sorted} /></div>}
            <div className={`grid gap-4 ${presenting ? "" : "lg:grid-cols-[minmax(0,1fr)_340px]"}`}>
              <section className="relative flex min-h-[430px] flex-col overflow-hidden rounded-[1.5rem] border border-amber-200/25 bg-[linear-gradient(135deg,#1c303c,#142330)] px-6 py-8 text-white shadow-2xl sm:min-h-[620px] sm:px-10" aria-live="polite">
                <div aria-hidden className="pointer-events-none absolute -end-48 -top-64 h-[560px] w-[560px] rounded-full border-[70px] border-amber-200/10" />
                <span className="relative text-xs font-black uppercase tracking-[.18em] text-amber-200">{roundActive && currentSpeed ? `${t.wordsPlayed(playedCount, totalRounds)} · ${t.modeNames[currentSpeed.mode]}` : t.inRoom(sorted.length)}</span>
                <div className="relative my-auto min-h-0 break-words py-10 text-[clamp(2.8rem,6vw,6rem)] font-black leading-[1.04] tracking-tight" dir="auto">{roundActive && currentSpeed ? currentSpeed.promptKind === "audio" ? "🔊 ?" : currentSpeed.prompt : t.title}</div>
                <div className="relative flex flex-wrap items-end justify-between gap-4 border-t border-white/20 pt-5">
                  <div><strong className={`block text-[clamp(4rem,9vw,6rem)] font-black leading-none tabular-nums ${lowTime ? "animate-pulse text-rose-300" : "text-amber-200"}`}>{roundActive ? secondsLeft : "—"}</strong><span className="text-sm font-bold text-amber-100/75">{t.wordLive}</span></div>
                  <span className="text-sm font-bold text-white/70">{t.players(sorted.length)}</span>
                </div>
                <div className="relative mt-4 flex gap-1" aria-label={t.wordsPlayed(playedCount, totalRounds)}>{Array.from({ length: Math.min(totalRounds, 30) }, (_, i) => <span key={i} className={`h-1.5 min-w-1 flex-1 rounded-full ${i < playedCount ? "bg-amber-200" : "bg-white/20"}`} />)}</div>
              </section>
              {!presenting && <aside className="flex min-w-0 flex-col gap-4 text-white">
                <section className="rounded-[1.25rem] border border-white/10 bg-[#102532] p-5 shadow-lg"><h2 className="text-lg font-black text-amber-100">{t.leaderboard}</h2><ol className="mt-3 space-y-1">{sorted.slice(0, 5).map((entry, index) => <li key={entry.clientId} className="flex items-center gap-2 border-b border-white/10 py-2 text-sm"><span className="w-6 font-black text-amber-200">{index + 1}</span><span className="min-w-0 flex-1 truncate font-bold" dir="auto">{entry.nickname}</span><strong className="tabular-nums">{entry.score}</strong><button type="button" onClick={() => onKick(entry.clientId, entry.nickname)} aria-label={`${language === "he" ? "הסר תלמיד" : language === "ar" ? "إزالة الطالب" : "Remove student"}: ${entry.nickname}`} className="rounded px-1 text-white/60 hover:text-rose-200"><X size={14} /></button></li>)}</ol>{sorted.length === 0 && <p className="mt-3 text-sm text-white/60">{t.noStudents}</p>}{sorted.length > 5 && <p className="mt-3 text-xs text-white/60">+{sorted.length - 5} {t.players(sorted.length)}</p>}{winnerClientId && !roundActive && <p className="mt-4 rounded-xl bg-amber-200/15 p-3 text-sm font-black text-amber-200">{t.firstWinner(sorted.find(e => e.clientId === winnerClientId)?.nickname ?? "")}</p>}</section>
                <section className="flex-1 rounded-[1.25rem] border border-white/10 bg-[#102532] p-5 shadow-lg">
                  <h2 className="text-lg font-black text-amber-100">{t.stepAdjust}</h2>
                  <p className="mt-2 text-sm text-white/60">{t.wordsPlayed(playedCount, totalRounds)}</p>
                  {buildError && <p className="mt-2 text-sm text-rose-300">{t.buildError}</p>}
                  <div className="mt-5 grid gap-2">
                    <button type="button" onClick={allPlayed ? handlePlayAgain : handleStart} disabled={!canStart || roundActive} className="min-h-12 rounded-xl bg-amber-200 px-4 font-black text-slate-950 disabled:opacity-50">{allPlayed ? t.playAgain : autoCountdown !== null ? t.autoNextIn(autoCountdown) : startLabel}</button>
                    {roundActive && <button type="button" onClick={handleEndRound} className="min-h-11 rounded-xl border border-rose-300/40 bg-rose-950/60 px-4 font-bold">{t.endRound}</button>}
                    <div className="flex gap-2"><button type="button" onClick={() => setQrEnlarged(true)} className="min-h-11 flex-1 rounded-xl border border-white/20 px-3 font-bold">{t.enlarge} · {sessionCode}</button><button type="button" onClick={handleCopy} aria-label={t.copy} className="min-h-11 rounded-xl border border-white/20 px-3 font-bold">{copied ? <Check size={16} /> : <Copy size={16} />}</button>{!hasRunRound && !roundActive && <button type="button" onClick={() => setPhase("setup")} className="min-h-11 rounded-xl border border-white/20 px-3 font-bold">{t.editGame}</button>}</div>
                  </div>
                </section>
              </aside>}
            </div>
          </>
        )}
      </div>

      {/* Presentation mode floating start / play-again / end-round */}
      <AnimatePresence>
        {presenting && !roundActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            onClick={allPlayed ? handlePlayAgain : handleStart}
            disabled={!canStart}
            style={{ touchAction: "manipulation" }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl active:scale-[0.98] transition disabled:opacity-60 ${
              allPlayed
                ? "shadow-emerald-500/40 bg-gradient-to-r from-emerald-500 to-teal-600"
                : `${A.shadow40} bg-gradient-to-r ${A.grad}`
            }`}
          >
            {allPlayed
              ? <><Play size={20} /> 🎉 {t.roundDone} · {t.playAgain}</>
              : <><Zap size={20} /> {autoCountdown !== null ? t.autoNextIn(autoCountdown) : startLabel}</>}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {presenting && roundActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            onClick={handleEndRound}
            style={{ touchAction: "manipulation" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl shadow-rose-500/40 bg-gradient-to-r from-rose-500 to-red-600 active:scale-[0.98] transition"
          >
            <Square size={20} /> {t.endRound}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Rich word picker (paste / library / saved lists / OCR / AI). */}
      <LiveWordPickerModal
        open={wordPickerOpen}
        onClose={() => setWordPickerOpen(false)}
        minWords={MIN_WORDS}
        allWords={vocab?.ALL_WORDS ?? []}
        selectedWords={pickedWords}
        onSelectedWordsChange={(words) => {
          setPickedWords(words);
          usedWordIdsRef.current.clear();
          completedRoundsRef.current = 0;
          setPlayedCount(0);
        }}
        translationLang={translationLang}
        onTranslationLangChange={setTranslationLang}
        onTranslateWord={translateWord}
        onTranslateBatch={translateWordsBatch}
        onOcrUpload={async (file) => {
          try {
            const r = await postOcrImage(file, "en");
            return { words: r.words, success: true };
          } catch {
            return { words: [], success: false };
          }
        }}
        topicPacks={TOPIC_PACKS}
        savedGroups={savedGroupsRaw}
        onRenameSavedGroup={renameGroup}
        onDeleteSavedGroup={deleteGroup}
      />

      {/* Confirm before removing a student from the session. */}
      <KickConfirmModal
        name={confirmKick?.nickname ?? null}
        language={language}
        onCancel={() => setConfirmKick(null)}
        onConfirm={() => {
          if (confirmKick && tokenRef.current) qp.kickStudent(confirmKick.clientId, tokenRef.current);
          setConfirmKick(null);
        }}
      />

      {/* Celebratory results — shown when ending a game that has scores. */}
      <AnimatePresence>
        {showResults && (
          <GameResults entries={sorted} onBack={leaveToDashboard} accent={A.rosterGrad} />
        )}
      </AnimatePresence>

      {/* Enlarged QR overlay */}
      <AnimatePresence>
        {qrEnlarged && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setQrEnlarged(false)}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6"
            role="dialog"
            ref={qrOverlayRef}
          >
            <motion.div
              initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              drag dragConstraints={qrOverlayRef} dragElastic={0.05} dragMomentum={false}
              style={{ touchAction: "none" }}
              onClick={e => e.stopPropagation()}
              className="cursor-grab rounded-3xl bg-white p-6 text-center shadow-2xl active:cursor-grabbing sm:p-8"
            >
              <QRCodeSVG value={joinUrl} size={Math.min(420, typeof window !== "undefined" ? window.innerWidth - 96 : 420)} />
              <div className="mt-4 text-5xl sm:text-6xl font-black tracking-[0.15em] text-stone-900">{sessionCode}</div>
            </motion.div>
            <button
              type="button"
              onClick={() => setQrEnlarged(false)}
              style={{ touchAction: "manipulation" }}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white bg-white/15 hover:bg-white/25 active:scale-95 transition"
            >
              <X size={18} /> {t.hide}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
