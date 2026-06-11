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
import { Play, Clock, Users, LogOut, Check, Copy, Maximize2, X, Monitor, Minimize2, Square, Zap } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { useVocabularyLazy } from "../hooks/useVocabularyLazy";
import { useSavedWordGroups } from "../hooks/useSavedWordGroups";
import CategoryRacePodium from "../components/game/CategoryRacePodium";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playRoundStart } from "../utils/raceSfx";
import { buildSpeedQuestion, type L1 } from "../utils/speedRoundQuestion";
import { QP_SPEED_ROUND_SECONDS, QP_SPEED_MODES, type QpSpeedMode } from "../core/quickPlayProtocol";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import SpeedWordPicker from "../components/game/SpeedWordPicker";
import { SPEED_HOST_STRINGS, SPEED_MODE_META } from "./speedRoundStrings";

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
  // Arabic sessions read the Arabic column; everything else reads Hebrew.
  const l1: L1 = language === "ar" ? "ar" : "he";

  const vocab = useVocabularyLazy(true);

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const { status, currentSpeed, leaderboard, observeAsTeacher, startSpeedRound, endSpeedRound, endSession, onSpeedEnded } = qp;

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
  const [presenting, setPresenting] = useState(false);
  const [buildError, setBuildError] = useState(false);
  // Auto-play: once the teacher starts the first word, each ended word
  // chains into the next after a short podium beat — no per-word click.
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
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
  // wizard writes), resolved to library words — ids that don't resolve
  // (e.g. custom OCR words) are dropped since they can't form questions.
  const { groups: savedGroupsRaw } = useSavedWordGroups();
  const savedGroups = useMemo(() => {
    const lib = vocab?.ALL_WORDS;
    if (!lib || savedGroupsRaw.length === 0) return [];
    const byId = new Map(lib.map((w) => [w.id, w]));
    return savedGroupsRaw
      .map((g) => ({
        id: g.id,
        name: g.name,
        words: g.words.map((id) => byId.get(id)).filter((w): w is Word => !!w),
      }))
      .filter((g) => g.words.length > 0);
  }, [vocab, savedGroupsRaw]);

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
    usedWordIdsRef.current.add(word.id);
    completedRoundsRef.current += 1;
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
    setPlayedCount(completedRoundsRef.current);
    if (!question) {
      // Only an error if words remained but none could build a question;
      // exhausting the run is the normal "round complete" path.
      if (completedRoundsRef.current < totalRounds) setBuildError(true);
      return;
    }
    setBuildError(false);
    // The Start tap is a user gesture — prime + play the jingle.
    primeAudio();
    playRoundStart();
    setWinnerClientId(null);
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
    if (!autoPlay || roundActive || !hasRunRound || pickedWords.length < MIN_WORDS || allPlayed) {
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
    if (currentSpeed && tokenRef.current) endSpeedRound(currentSpeed.roundId, tokenRef.current);
  };

  const handleEnd = async () => {
    if (tokenRef.current) endSession(tokenRef.current);
    try { await supabase.rpc("end_quick_play_session", { p_session_code: sessionCode }); } catch { /* best-effort */ }
    setView("teacher-dashboard");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — ignore */ }
  };

  // Mark the winner in the podium entries so it can be highlighted.
  const podiumEntries = useMemo(() => sorted, [sorted]);

  const cardCls = "bg-surface border-outline-variant shadow-lg";
  const headingCls = "text-on-surface";
  const pillIdle = "bg-surface border-outline-variant text-on-surface-variant hover:border-outline";
  const iconBtn = "bg-surface text-fuchsia-600 hover:bg-surface-container border border-outline-variant";

  const startLabel = hasRunRound ? t.nextWord : t.start;

  return (
    <div className="min-h-[100dvh] transition-colors" dir={dir} style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-2 mb-5">
          <h1 className={`min-w-0 text-xl sm:text-3xl font-black flex items-center gap-2 ${headingCls}`}>
            <span className="text-2xl sm:text-3xl flex-shrink-0">⚡</span>
            <span className="truncate">{t.title}</span>
          </h1>
          {presenting ? (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-base sm:text-lg tracking-[0.12em] bg-fuchsia-50 text-fuchsia-700">
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
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95 transition"
              >
                <Monitor size={16} /> <span className="hidden sm:inline">{t.present}</span>
              </button>
              <button
                type="button"
                onClick={handleEnd}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-95 transition"
              >
                <LogOut size={16} /> <span className="hidden sm:inline">{t.end}</span>
              </button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main: live word banner + the big leaderboard */}
          <div className={`${presenting ? "lg:col-span-12" : "lg:col-span-8"} space-y-4 order-2 lg:order-1`}>
            <AnimatePresence>
              {roundActive && currentSpeed && (
                <motion.section
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`rounded-3xl border p-6 sm:p-7 text-center shadow-lg ${
                    lowTime ? "bg-red-50 border-red-200 shadow-red-500/10" : cardCls
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-500">
                      {SPEED_MODE_META[currentSpeed.mode].emoji} {t.modeNames[currentSpeed.mode]}
                    </span>
                    <span className={`font-black leading-tight ${headingCls} text-3xl sm:text-5xl`} dir="auto">
                      {currentSpeed.promptKind === "audio" ? "🔊 ?" : currentSpeed.prompt}
                    </span>
                    <span className={`tabular-nums font-black leading-none ${lowTime ? "text-red-600 animate-pulse" : "text-fuchsia-500"} text-5xl sm:text-6xl`}>
                      {secondsLeft}
                    </span>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <section className={`rounded-3xl shadow-lg border p-5 sm:p-6 ${cardCls}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-fuchsia-500 mb-4 flex items-center gap-2">
                <Users size={18} /> {t.leaderboard}
                <span className="ms-auto text-stone-400 normal-case tracking-normal">{t.players(sorted.length)}</span>
              </h2>
              {/* Re-key the podium on roundId so it visibly re-animates each
                  word; winner highlight is layered via the wrapper ring. */}
              <div key={endedRoundId ?? "lobby"}>
                <CategoryRacePodium entries={podiumEntries} emptyText={t.noStudents} large />
              </div>
              {winnerClientId && !roundActive && (
                <p className="mt-4 text-center text-sm font-black text-amber-600">
                  ⚡ {t.firstWinner(sorted.find(e => e.clientId === winnerClientId)?.nickname ?? "")}
                </p>
              )}
            </section>
          </div>

          {/* Sidebar: join + setup controls */}
          <aside className={`lg:col-span-4 space-y-4 order-1 lg:order-2 ${presenting ? "hidden" : ""}`}>
            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500">{t.joinHeading}</h2>
                <button type="button" onClick={() => setQrEnlarged(true)} style={{ touchAction: "manipulation" }}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition active:scale-95 ${iconBtn}`} aria-label={t.enlarge}>
                  <Maximize2 size={15} />
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <button type="button" onClick={() => setQrEnlarged(true)} style={{ touchAction: "manipulation" }}
                  className="bg-white p-2 rounded-2xl border border-stone-100 shadow-sm active:scale-[0.98] transition" aria-label={t.enlarge}>
                  <QRCodeSVG value={joinUrl} size={132} />
                </button>
                <div className="mt-3 w-full">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t.code}</div>
                  <div className={`text-4xl font-black tracking-[0.15em] ${headingCls}`}>{sessionCode}</div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{ touchAction: "manipulation" }}
                    className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition active:scale-[0.98] ${
                      copied ? "bg-emerald-100 text-emerald-700" : "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-md shadow-fuchsia-500/30"
                    }`}
                  >
                    {copied ? <><Check size={16} /> {t.copied}</> : <><Copy size={16} /> {t.copy}</>}
                  </button>
                </div>
              </div>
            </section>

            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              {/* The teacher's word list — typed / picked from the library. */}
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.wordsHeading}</h2>
              <SpeedWordPicker
                library={vocab?.ALL_WORDS ?? null}
                picked={pickedWords}
                onChange={(words) => { setPickedWords(words); usedWordIdsRef.current.clear(); completedRoundsRef.current = 0; setPlayedCount(0); }}
                minWords={MIN_WORDS}
                t={t}
                savedGroups={savedGroups}
              />

              {/* Modes — multi-select; each word draws a random one */}
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mt-5 mb-1">{t.modeHeading}</h2>
              <p className="text-[11px] font-bold text-stone-400 mb-3">{t.modeHint}</p>
              <div className="grid grid-cols-2 gap-2">
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
                      className={`relative rounded-xl p-2.5 text-start border-2 transition-all ${picked ? "bg-gradient-to-br from-indigo-500 to-violet-600 border-transparent text-white shadow-md" : pillIdle}`}
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

              {/* Timer */}
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mt-5 mb-3">{t.timerHeading}</h2>
              <div className="grid grid-cols-4 gap-2">
                {QP_SPEED_ROUND_SECONDS.map((opt) => {
                  const picked = roundSeconds === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRoundSeconds(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`px-1 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-transparent shadow-md" : pillIdle}`}
                    >
                      {t.seconds(opt)}
                    </button>
                  );
                })}
              </div>

              {/* Repeats — cycle the whole list ×1–×4 so short lists fill a
                  longer session (e.g. 10 words ×2 = 20 rounds). */}
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mt-5 mb-1">{t.repeatsHeading}</h2>
              <p className="text-[11px] font-bold text-stone-400 mb-3">{t.repeatsHint}</p>
              <div className="grid grid-cols-4 gap-2">
                {SPEED_REPEAT_OPTIONS.map((opt) => {
                  const picked = passes === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPasses(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`px-1 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-md" : pillIdle}`}
                    >
                      {t.repeatsLabel(opt)}
                    </button>
                  );
                })}
              </div>

              {/* Auto-play toggle — words chain themselves after the first. */}
              <button
                type="button"
                role="switch"
                aria-checked={autoPlay}
                onClick={() => setAutoPlay(v => !v)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`mt-5 w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border-2 transition-all ${autoPlay ? "bg-fuchsia-50 border-fuchsia-300" : pillIdle}`}
              >
                <span className={`font-black text-xs ${autoPlay ? "text-fuchsia-700" : ""}`}>⚡ {t.autoPlayLabel}</span>
                <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${autoPlay ? "bg-fuchsia-500" : "bg-stone-300"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${autoPlay ? "start-[18px]" : "start-0.5"}`} />
                </span>
              </button>

              {buildError && <p className="mt-3 text-xs font-bold text-rose-600">{t.buildError}</p>}
              {hasRunRound && !roundActive && allPlayed && (
                <p className="mt-3 text-center text-sm font-black text-emerald-600">🎉 {t.roundDone}</p>
              )}
              {hasRunRound && !allPlayed && (
                <p className="mt-3 text-center text-xs font-bold text-stone-400">{t.wordsPlayed(playedCount, totalRounds)}</p>
              )}

              {allPlayed && !roundActive ? (
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30 active:scale-[0.98] transition"
                >
                  <Play size={18} /> {t.playAgain}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={roundActive || !canStart}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${roundActive || !canStart ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]"}`}
                >
                  {roundActive
                    ? <><Clock size={18} /> {t.wordLive} · {secondsLeft}s</>
                    : autoCountdown !== null
                      ? <><Zap size={18} /> {t.autoNextIn(autoCountdown)}</>
                      : <><Play size={18} /> {startLabel}</>}
                </button>
              )}
              {roundActive && (
                <button
                  type="button"
                  onClick={handleEndRound}
                  style={{ touchAction: "manipulation" }}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-base bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-[0.98] transition"
                >
                  <Square size={16} /> {t.endRound}
                </button>
              )}
            </section>
          </aside>
        </div>
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
                : "shadow-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500 to-pink-600"
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

      {/* Enlarged QR overlay */}
      <AnimatePresence>
        {qrEnlarged && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setQrEnlarged(false)}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6"
            role="dialog"
          >
            <motion.div
              initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl"
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
