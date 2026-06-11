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
import CategoryRacePodium from "../components/game/CategoryRacePodium";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playRoundStart } from "../utils/raceSfx";
import { buildSpeedQuestion, type L1 } from "../utils/speedRoundQuestion";
import { QP_SPEED_ROUND_SECONDS, QP_SPEED_MODES, type QpSpeedMode } from "../core/quickPlayProtocol";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import { SPEED_HOST_STRINGS, SPEED_MODE_META, SPEED_SET_META, type SpeedSet } from "./speedRoundStrings";

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

  const [selectedSet, setSelectedSet] = useState<SpeedSet>("Set 1");
  const [mode, setMode] = useState<QpSpeedMode>("classic");
  const [roundSeconds, setRoundSeconds] = useState<number>(15);
  const [endedRoundId, setEndedRoundId] = useState<string | null>(null);
  const [winnerClientId, setWinnerClientId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hasRunRound, setHasRunRound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [buildError, setBuildError] = useState(false);
  const tokenRef = useRef<string | null>(null);

  // The word pool for the chosen set — the preferred distractor source.
  const setWords: Word[] = useMemo(() => {
    if (!vocab) return [];
    if (selectedSet === "Set 1") return vocab.SET_1_WORDS;
    if (selectedSet === "Set 2") return vocab.SET_2_WORDS;
    return vocab.SET_3_WORDS;
  }, [vocab, selectedSet]);

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

  // Confetti the instant a word ends.
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (prevActiveRef.current && !roundActive) celebrate("normal");
    prevActiveRef.current = roundActive;
  }, [roundActive]);

  // &mode=speed lets the student bootstrap skip the unused vocab prefetch.
  const joinUrl = useMemo(() => `${window.location.origin}/?session=${sessionCode}&mode=speed`, [sessionCode]);

  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const secondsLeft = currentSpeed ? Math.max(0, Math.round((currentSpeed.deadlineTs - now) / 1000)) : 0;
  const lowTime = roundActive && secondsLeft <= 3;

  // Build the next word's question client-side, then push it. Retries a few
  // words if a given word can't form a question for the chosen mode (no
  // translation, etc.) before giving up with a soft error.
  const handleStart = () => {
    if (!tokenRef.current || roundActive || setWords.length === 0) return;
    const fallback = vocab?.ALL_WORDS ?? setWords;
    let question = null;
    for (let attempt = 0; attempt < 8 && !question; attempt++) {
      const word = setWords[Math.floor(Math.random() * setWords.length)];
      question = buildSpeedQuestion({
        mode, word, pool: setWords, fallback, l1,
        trueFalseLabels: { yes: t.tfTrue, no: t.tfFalse },
      });
    }
    if (!question) { setBuildError(true); return; }
    setBuildError(false);
    // The Start tap is a user gesture — prime + play the jingle.
    primeAudio();
    playRoundStart();
    setWinnerClientId(null);
    startSpeedRound({ ...question, roundSeconds }, tokenRef.current);
    if (!hasRunRound) setPresenting(true);
    setHasRunRound(true);
  };

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
              {/* Word set */}
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.setHeading}</h2>
              <div className="grid grid-cols-3 gap-2">
                {(["Set 1", "Set 2", "Set 3"] as SpeedSet[]).map((s) => {
                  const picked = selectedSet === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSet(s)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`rounded-xl p-2.5 text-center border-2 transition-all ${picked ? "bg-gradient-to-br from-fuchsia-500 to-pink-600 border-transparent text-white shadow-md" : pillIdle}`}
                    >
                      <div className="text-lg">{SPEED_SET_META[s].emoji}</div>
                      <div className="font-black text-xs">{t.setNames[s]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Mode */}
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mt-5 mb-3">{t.modeHeading}</h2>
              <div className="grid grid-cols-2 gap-2">
                {QP_SPEED_MODES.map((m) => {
                  const picked = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
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
              <div className="grid grid-cols-5 gap-2">
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

              {buildError && <p className="mt-3 text-xs font-bold text-rose-600">{t.buildError}</p>}
              {setWords.length === 0 && <p className="mt-3 text-xs font-bold text-stone-400">{t.loadingWords}</p>}

              <button
                type="button"
                onClick={handleStart}
                disabled={roundActive || setWords.length === 0}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${roundActive || setWords.length === 0 ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]"}`}
              >
                {roundActive
                  ? <><Clock size={18} /> {t.wordLive} · {secondsLeft}s</>
                  : <><Play size={18} /> {startLabel}</>}
              </button>
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

      {/* Presentation mode floating start / end-round */}
      <AnimatePresence>
        {presenting && !roundActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            onClick={handleStart}
            disabled={setWords.length === 0}
            style={{ touchAction: "manipulation" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl shadow-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500 to-pink-600 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Zap size={20} /> {startLabel}
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
