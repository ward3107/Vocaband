/**
 * ArenaHostView — the teacher's control room for Word Hunt Arena, laid out
 * for a classroom projector. A sibling of SpeedRoundHostView on the same
 * Quick Play socket rails:
 *   - shows the join code + QR (students join the same way as Quick Play)
 *   - the teacher picks a word SET + a MODE MIX + a per-word timer, then
 *     "Start arena" pre-authors the WHOLE question batch CLIENT-SIDE here
 *     (buildSpeedQuestion in a loop — the server has no vocabulary) and
 *     ships it on ARENA_START; the server stores every correctIndex
 *     privately and referees grabs from memory (design §2)
 *   - during play the projector shows the live map (ArenaCanvas readOnly)
 *     with every avatar moving, plus the podium underneath
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Play, Users, LogOut, Check, Copy, Maximize2, X, Monitor, Minimize2, Square } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { useVocabularyLazy } from "../hooks/useVocabularyLazy";
import CategoryRacePodium from "../components/game/CategoryRacePodium";
import ArenaCanvas from "../components/game/ArenaCanvas";
import { primeAudio } from "../utils/primeAudio";
import { playRoundStart } from "../utils/raceSfx";
import { shuffle } from "../utils";
import { buildSpeedQuestion, type L1 } from "../utils/speedRoundQuestion";
import {
  QP_SPEED_ROUND_SECONDS, QP_SPEED_MODES, QP_ARENA_MAX_WORDS,
  type QpSpeedMode, type QpArenaWordSeed,
} from "../core/quickPlayProtocol";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import { SPEED_MODE_META, SPEED_SET_META, type SpeedSet } from "./speedRoundStrings";
import { ARENA_HOST_STRINGS } from "./arenaStrings";

interface ArenaHostViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

export default function ArenaHostView({ sessionCode, setView }: ArenaHostViewProps) {
  const { language, dir } = useLanguage();
  const t = ARENA_HOST_STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  // Arabic sessions read the Arabic column; everything else reads Hebrew.
  const l1: L1 = language === "ar" ? "ar" : "he";

  const vocab = useVocabularyLazy(true);

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const {
    status, currentArena, arenaPositionsRef, leaderboard,
    observeAsTeacher, startArena, endArena, endSession,
  } = qp;

  const [selectedSet, setSelectedSet] = useState<SpeedSet>("Set 1");
  // Multi-toggle — every enabled mode joins the cycle the batch builder
  // walks, so the floating words mix question types. Default: all six.
  const [enabledModes, setEnabledModes] = useState<Set<QpSpeedMode>>(new Set(QP_SPEED_MODES));
  const [roundSeconds, setRoundSeconds] = useState<number>(10);
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

  const arenaActive = !!currentArena;
  // &mode=arena lets the student bootstrap skip the unused vocab prefetch.
  const joinUrl = useMemo(() => `${window.location.origin}/?session=${sessionCode}&mode=arena`, [sessionCode]);

  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const wordsLeft = currentArena ? currentArena.words.filter(w => w.state !== "answered").length : 0;

  // Pre-author the whole batch: walk a shuffled copy of the set, cycling
  // the enabled modes; a word that can't form a question for the current
  // mode tries the other enabled modes before being skipped entirely.
  const buildBatch = (): QpArenaWordSeed[] => {
    const fallback = vocab?.ALL_WORDS ?? setWords;
    const modes = QP_SPEED_MODES.filter(m => enabledModes.has(m));
    const seeds: QpArenaWordSeed[] = [];
    let modeCursor = 0;
    for (const word of shuffle([...setWords])) {
      if (seeds.length >= QP_ARENA_MAX_WORDS) break;
      let question = null;
      for (let attempt = 0; attempt < modes.length && !question; attempt++) {
        question = buildSpeedQuestion({
          mode: modes[(modeCursor + attempt) % modes.length],
          word, pool: setWords, fallback, l1,
          trueFalseLabels: { yes: t.tfTrue, no: t.tfFalse },
        });
      }
      modeCursor++;
      if (!question) continue;
      seeds.push({ label: word.english, ...question });
    }
    return seeds;
  };

  const handleStart = () => {
    if (!tokenRef.current || arenaActive || setWords.length === 0 || enabledModes.size === 0) return;
    const seeds = buildBatch();
    if (seeds.length === 0) { setBuildError(true); return; }
    setBuildError(false);
    // The Start tap is a user gesture — prime + play the jingle.
    primeAudio();
    playRoundStart();
    startArena(seeds, { roundSeconds }, tokenRef.current);
    setPresenting(true);
  };

  const handleEndArena = () => {
    if (arenaActive && tokenRef.current) endArena(tokenRef.current);
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

  const toggleMode = (m: QpSpeedMode) => {
    setEnabledModes(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  const cardCls = "bg-surface border-outline-variant shadow-lg";
  const headingCls = "text-on-surface";
  const pillIdle = "bg-surface border-outline-variant text-on-surface-variant hover:border-outline";
  const iconBtn = "bg-surface text-indigo-600 hover:bg-surface-container border border-outline-variant";

  return (
    <div className="min-h-[100dvh] transition-colors" dir={dir} style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-2 mb-5">
          <h1 className={`min-w-0 text-xl sm:text-3xl font-black flex items-center gap-2 ${headingCls}`}>
            <span className="text-2xl sm:text-3xl flex-shrink-0">🏟️</span>
            <span className="truncate">{t.title}</span>
          </h1>
          {presenting ? (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-base sm:text-lg tracking-[0.12em] bg-indigo-50 text-indigo-700">
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
          {/* Main: the live map (when running) + the big leaderboard */}
          <div className={`${presenting ? "lg:col-span-12" : "lg:col-span-8"} space-y-4 order-2 lg:order-1`}>
            {arenaActive && currentArena && (
              <section>
                <ArenaCanvas
                  arena={currentArena}
                  positionsRef={arenaPositionsRef}
                  leaderboard={leaderboard}
                  readOnly
                />
                <p className="mt-2 text-center text-xs font-black uppercase tracking-widest text-indigo-500">
                  {t.wordsLeft(wordsLeft)}
                </p>
              </section>
            )}

            <section className={`rounded-3xl shadow-lg border p-5 sm:p-6 ${cardCls}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-2">
                <Users size={18} /> {t.leaderboard}
                <span className="ms-auto text-stone-400 normal-case tracking-normal">{t.players(sorted.length)}</span>
              </h2>
              <CategoryRacePodium entries={sorted} emptyText={t.noStudents} large />
            </section>
          </div>

          {/* Sidebar: join + setup controls */}
          <aside className={`lg:col-span-4 space-y-4 order-1 lg:order-2 ${presenting ? "hidden" : ""}`}>
            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500">{t.joinHeading}</h2>
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
                      copied ? "bg-emerald-100 text-emerald-700" : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30"
                    }`}
                  >
                    {copied ? <><Check size={16} /> {t.copied}</> : <><Copy size={16} /> {t.copy}</>}
                  </button>
                </div>
              </div>
            </section>

            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              {/* Word set */}
              <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3">{t.setHeading}</h2>
              <div className="grid grid-cols-3 gap-2">
                {(["Set 1", "Set 2", "Set 3"] as SpeedSet[]).map((s) => {
                  const picked = selectedSet === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSet(s)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`rounded-xl p-2.5 text-center border-2 transition-all ${picked ? "bg-gradient-to-br from-indigo-500 to-violet-600 border-transparent text-white shadow-md" : pillIdle}`}
                    >
                      <div className="text-lg">{SPEED_SET_META[s].emoji}</div>
                      <div className="font-black text-xs">{t.setNames[s]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Mode mix — multi-toggle, unlike Speed Round's single pick */}
              <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500 mt-5 mb-3">{t.modeHeading}</h2>
              <div className="grid grid-cols-2 gap-2">
                {QP_SPEED_MODES.map((m) => {
                  const picked = enabledModes.has(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMode(m)}
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
              {enabledModes.size === 0 && <p className="mt-2 text-xs font-bold text-rose-600">{t.pickMode}</p>}

              {/* Timer (per grabbed word) */}
              <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500 mt-5 mb-3">{t.timerHeading}</h2>
              <div className="grid grid-cols-5 gap-2">
                {QP_SPEED_ROUND_SECONDS.map((opt) => {
                  const picked = roundSeconds === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRoundSeconds(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`px-1 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-md" : pillIdle}`}
                    >
                      {t.seconds(opt)}
                    </button>
                  );
                })}
              </div>

              {buildError && <p className="mt-3 text-xs font-bold text-rose-600">{t.buildError}</p>}
              {setWords.length === 0 && <p className="mt-3 text-xs font-bold text-stone-400">{t.loadingWords}</p>}

              {arenaActive ? (
                <button
                  type="button"
                  onClick={handleEndArena}
                  style={{ touchAction: "manipulation" }}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-[0.98] transition"
                >
                  <Square size={18} /> {t.endArena}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={setWords.length === 0 || enabledModes.size === 0}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${setWords.length === 0 || enabledModes.size === 0 ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-violet-600 shadow-indigo-500/30 active:scale-[0.98]"}`}
                >
                  <Play size={18} /> {t.start}
                </button>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Presentation mode floating start / end-arena */}
      <AnimatePresence>
        {presenting && !arenaActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            onClick={handleStart}
            disabled={setWords.length === 0 || enabledModes.size === 0}
            style={{ touchAction: "manipulation" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl shadow-indigo-500/40 bg-gradient-to-r from-indigo-500 to-violet-600 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Play size={20} /> {t.start}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {presenting && arenaActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            onClick={handleEndArena}
            style={{ touchAction: "manipulation" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl shadow-rose-500/40 bg-gradient-to-r from-rose-500 to-red-600 active:scale-[0.98] transition"
          >
            <Square size={20} /> {t.endArena}
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
