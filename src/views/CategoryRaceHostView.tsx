/**
 * CategoryRaceHostView — the teacher's control room for a live Category
 * Race, laid out for a classroom projector. Built on the Quick Play
 * socket rails:
 *   - shows the join code + QR (students join the same way as Quick Play)
 *   - lets the teacher pick categories + a round timer and Start a round
 *     (the server rolls one letter for the whole class with a shared
 *     deadline) — with a slot-machine letter reveal + start jingle
 *   - streams the live leaderboard as the dominant, big-font element so
 *     the class can read names + scores from the back of the room
 *   - end the session (back to dashboard) OR end + start a fresh race
 *     in place (new code, same screen)
 *   - dark theme toggle for a dimmed classroom, enlarge / hide QR, and
 *     copy-link-to-clipboard
 *
 * Round config is sent live with each round — nothing race-specific is
 * persisted in the DB.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Play, Clock, Users, LogOut, Check, Copy, Maximize2, Eye, EyeOff, Moon, Sun, Plus, X, Monitor, Minimize2, Square, Infinity as InfinityIcon } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { CATEGORIES, categoryLabel, LETTER_POOL } from "../data/category-race-bank";
import CategoryRacePodium from "../components/game/CategoryRacePodium";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playRoundStart } from "../utils/raceSfx";
import { QP_RACE_ROUND_SECONDS, QP_CATEGORY_RACE_MODE } from "../core/quickPlayProtocol";
import type { View } from "../core/views";

interface CategoryRaceHostViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

const DEFAULT_CATEGORY_IDS = ["country", "animal", "food", "verb", "adjective", "object"];

/**
 * SlotLetter — projector letter reveal. On each new round (keyed by
 * roundId) it spins through random pool letters for ~900ms like a slot
 * machine, then slams onto the real letter with a spring pop so the
 * whole class feels the "and the letter is…" beat.
 */
function SlotLetter({ letter, roundId }: { letter: string; roundId: string }) {
  const [display, setDisplay] = useState(letter);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restarts the slot spin when the round (roundId) changes
    setSettled(false);
    let i = 0;
    const spin = window.setInterval(() => {
      setDisplay(LETTER_POOL[i++ % LETTER_POOL.length]);
    }, 70);
    const stop = window.setTimeout(() => {
      window.clearInterval(spin);
      setDisplay(letter);
      setSettled(true);
    }, 900);
    return () => { window.clearInterval(spin); window.clearTimeout(stop); };
  }, [roundId, letter]);
  return (
    <motion.span
      key={settled ? "settled" : "spin"}
      animate={settled ? { scale: [1.35, 1], rotate: [6, 0] } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 14 }}
      className="inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white text-7xl sm:text-8xl font-black shadow-xl shadow-fuchsia-500/40 mt-1"
    >
      {display}
    </motion.span>
  );
}

const STRINGS = {
  en: {
    title: "Category Race", joinHeading: "Students join here", code: "Class code",
    catsHeading: "Categories", timerHeading: "Round time", start: "Start round",
    nextRound: "Start next round",
    roundLive: "Round in progress", letterLabel: "Letter",
    leaderboard: "Leaderboard", noStudents: "Waiting for students to join…",
    end: "End race", endNew: "New race", seconds: (n: number) => `${n}s`, players: (n: number) => `${n} playing`,
    pickOne: "Pick at least one category.",
    copy: "Copy link", copied: "Copied!", enlarge: "Enlarge", hide: "Hide", show: "Show QR code",
    darkOn: "Dark", darkOff: "Light", restarting: "Starting new race…",
    present: "Present", controls: "Controls",
    untimed: "Untimed", answerWhenReady: "Answer when ready", endRound: "End round",
  },
  he: {
    title: "מרוץ קטגוריות", joinHeading: "התלמידים מצטרפים כאן", code: "קוד כיתה",
    catsHeading: "קטגוריות", timerHeading: "זמן לסבב", start: "התחל סבב",
    nextRound: "התחל סבב הבא",
    roundLive: "סבב מתבצע", letterLabel: "אות",
    leaderboard: "טבלת מובילים", noStudents: "ממתינים שתלמידים יצטרפו…",
    end: "סיים מרוץ", endNew: "מרוץ חדש", seconds: (n: number) => `${n} שנ'`, players: (n: number) => `${n} משחקים`,
    pickOne: "בחרו לפחות קטגוריה אחת.",
    copy: "העתק קישור", copied: "הועתק!", enlarge: "הגדל", hide: "הסתר", show: "הצג קוד QR",
    darkOn: "כהה", darkOff: "בהיר", restarting: "מתחיל מרוץ חדש…",
    present: "מצגת", controls: "פקדים",
    untimed: "ללא זמן", answerWhenReady: "ענו כשמוכנים", endRound: "סיים סבב",
  },
  ar: {
    title: "سباق الفئات", joinHeading: "ينضم الطلاب هنا", code: "رمز الصف",
    catsHeading: "الفئات", timerHeading: "وقت الجولة", start: "ابدأ الجولة",
    nextRound: "ابدأ الجولة التالية",
    roundLive: "الجولة جارية", letterLabel: "حرف",
    leaderboard: "لوحة المتصدرين", noStudents: "في انتظار انضمام الطلاب…",
    end: "إنهاء السباق", endNew: "سباق جديد", seconds: (n: number) => `${n} ث`, players: (n: number) => `${n} يلعبون`,
    pickOne: "اختر فئة واحدة على الأقل.",
    copy: "نسخ الرابط", copied: "تم النسخ!", enlarge: "تكبير", hide: "إخفاء", show: "إظهار رمز QR",
    darkOn: "داكن", darkOff: "فاتح", restarting: "بدء سباق جديد…",
    present: "عرض", controls: "أدوات",
    untimed: "بدون وقت", answerWhenReady: "أجب عند الاستعداد", endRound: "إنهاء الجولة",
  },
} as const;

export default function CategoryRaceHostView({ sessionCode, setView }: CategoryRaceHostViewProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  // Local session code so "New race" can swap to a fresh session in place
  // without bouncing back to the dashboard.
  const [liveCode, setLiveCode] = useState(sessionCode);

  const qp = useQuickPlaySocket({ sessionCode: liveCode, enabled: true });
  const { status, currentRace, leaderboard, observeAsTeacher, startRaceRound, endRaceRound, endSession, onRaceEnded } = qp;

  const [selectedCats, setSelectedCats] = useState<string[]>([...DEFAULT_CATEGORY_IDS]);
  const [roundSeconds, setRoundSeconds] = useState<number>(60);
  const [untimed, setUntimed] = useState(false);
  // Which round the server has closed — lets us treat an early end (all
  // students submitted, or teacher "end round") as over even though the
  // original deadline is still in the future.
  const [endedRoundId, setEndedRoundId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hasRunRound, setHasRunRound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrHidden, setQrHidden] = useState(false);
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const [restarting, setRestarting] = useState(false);
  // Presentation mode hides ALL teacher chrome (sidebar + header actions)
  // for a clean projector — just the leaderboard + live round.
  const [presenting, setPresenting] = useState(false);
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem("vb-race-dark") === "1"; } catch { return false; }
  });
  const tokenRef = useRef<string | null>(null);

  // Fetch the teacher token + observe whenever the socket (re)connects OR
  // the live session code changes (after a "New race").
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
  }, [status, observeAsTeacher, liveCode]);

  const roundActive = !!currentRace && currentRace.roundId !== endedRoundId && now < currentRace.deadlineTs;
  useEffect(() => {
    if (!roundActive) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [roundActive]);

  // The server may close a round early (all students submitted, or via the
  // teacher's "end round" button) before its deadline — mark it ended so
  // the banner clears and the Start button re-enables immediately.
  useEffect(() => onRaceEnded((p) => setEndedRoundId(p.roundId)), [onRaceEnded]);

  // Confetti on the projector the instant a round ends — fire-and-forget
  // (no setState), so no cascading-render concern.
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (prevActiveRef.current && !roundActive) celebrate("normal");
    prevActiveRef.current = roundActive;
  }, [roundActive]);

  const joinUrl = useMemo(() => `${window.location.origin}/?session=${liveCode}`, [liveCode]);

  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const secondsLeft = currentRace ? Math.max(0, Math.round((currentRace.deadlineTs - now) / 1000)) : 0;
  const lowTime = roundActive && secondsLeft <= 10;

  const toggleCat = (id: string) =>
    setSelectedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleStart = () => {
    if (selectedCats.length === 0 || !tokenRef.current || roundActive) return;
    // The Start tap is a user gesture — prime + play the start jingle so
    // even the first round has music on the projector.
    primeAudio();
    playRoundStart();
    startRaceRound(selectedCats, roundSeconds, tokenRef.current, untimed);
    setHasRunRound(true);
    // Auto-collapse into the clean projector view the moment a round starts.
    setPresenting(true);
  };

  const handleEndRound = () => {
    if (currentRace && tokenRef.current) endRaceRound(currentRace.roundId, tokenRef.current);
  };

  const handleEnd = async () => {
    if (tokenRef.current) endSession(tokenRef.current);
    try { await supabase.rpc("end_quick_play_session", { p_session_code: liveCode }); } catch { /* best-effort */ }
    setView("teacher-dashboard");
  };

  // End the current session and immediately spin up a fresh one, staying
  // on this screen. The socket reconnects to the new code via liveCode.
  const handleEndAndNew = async () => {
    if (restarting) return;
    setRestarting(true);
    try {
      if (tokenRef.current) endSession(tokenRef.current);
      try { await supabase.rpc("end_quick_play_session", { p_session_code: liveCode }); } catch { /* best-effort */ }
      const { data, error } = await supabase.rpc("create_quick_play_session", {
        p_word_ids: null, p_custom_words: null, p_allowed_modes: [QP_CATEGORY_RACE_MODE],
      });
      if (error || !data) throw error ?? new Error("no session");
      setHasRunRound(false);
      setLiveCode((data as { session_code: string }).session_code);
    } catch { /* keep the old session on failure */ }
    finally { setRestarting(false); }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — ignore */ }
  };

  const toggleDark = () => {
    setDark(d => {
      const next = !d;
      try { localStorage.setItem("vb-race-dark", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  // Theme class helpers.
  const pageCls = dark ? "bg-stone-950" : "bg-gradient-to-br from-fuchsia-50 via-white to-pink-50";
  const cardCls = dark ? "bg-stone-900 border-stone-800 shadow-black/40" : "bg-white border-fuchsia-100 shadow-fuchsia-500/10";
  const headingCls = dark ? "text-stone-100" : "text-stone-900";
  const pillIdle = dark ? "bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-600" : "bg-white border-stone-200 hover:border-stone-300 text-stone-700";
  const iconBtn = dark ? "bg-stone-800 text-stone-200 hover:bg-stone-700" : "bg-white text-fuchsia-600 hover:bg-fuchsia-50 border border-stone-200";

  return (
    <div className={`min-h-[100dvh] transition-colors ${pageCls}`} dir={dir}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-3 mb-5">
          <h1 className={`text-2xl sm:text-3xl font-black flex items-center gap-2 ${headingCls}`}>
            <span className="text-3xl">🌍</span> {t.title}
          </h1>
          {presenting ? (
            // Presentation mode: keep only the join code visible (so late
            // students can still join) + a button back to the controls.
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-lg tracking-[0.12em] ${dark ? "bg-stone-800 text-stone-100" : "bg-fuchsia-50 text-fuchsia-700"}`}>
                {t.code}: {liveCode}
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPresenting(true)}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95 transition"
              >
                <Monitor size={16} /> {t.present}
              </button>
              <button
                type="button"
                onClick={toggleDark}
                style={{ touchAction: "manipulation" }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-sm transition active:scale-95 ${iconBtn}`}
                aria-label={dark ? t.darkOff : t.darkOn}
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
                <span className="hidden sm:inline">{dark ? t.darkOff : t.darkOn}</span>
              </button>
              <button
                type="button"
                onClick={handleEndAndNew}
                disabled={restarting}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 active:scale-95 transition disabled:opacity-60"
              >
                <Plus size={16} /> {restarting ? t.restarting : t.endNew}
              </button>
              <button
                type="button"
                onClick={handleEnd}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-95 transition"
              >
                <LogOut size={16} /> {t.end}
              </button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main: round banner (only while live) + the big leaderboard */}
          <div className={`${presenting ? "lg:col-span-12" : "lg:col-span-8"} space-y-4 order-2 lg:order-1`}>
            {/* Round banner — only shown while a round is live, so there's
                no dead "round over" placeholder between rounds. */}
            <AnimatePresence>
              {roundActive && currentRace && (
                <motion.section
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`rounded-3xl border p-6 sm:p-7 text-center shadow-lg ${
                    lowTime ? "bg-red-50 border-red-200 shadow-red-500/10" : cardCls
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-10">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-500">{t.letterLabel}</span>
                      <SlotLetter letter={currentRace.letter} roundId={currentRace.roundId} />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black uppercase tracking-[0.18em] text-stone-400">{t.roundLive}</span>
                      {currentRace.untimed ? (
                        <>
                          <InfinityIcon className={`mt-1 ${headingCls}`} size={64} strokeWidth={2.5} />
                          <span className="text-sm font-bold text-stone-400 mt-1">{t.answerWhenReady}</span>
                        </>
                      ) : (
                        <>
                          <span className={`tabular-nums font-black leading-none mt-1 ${lowTime ? "text-red-600 animate-pulse" : headingCls} text-6xl sm:text-7xl`}>
                            {secondsLeft}
                          </span>
                          <span className="text-sm font-bold text-stone-400 mt-1">{t.seconds(roundSeconds)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* The leaderboard — projector scale */}
            <section className={`rounded-3xl shadow-lg border p-5 sm:p-6 ${cardCls}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-fuchsia-500 mb-4 flex items-center gap-2">
                <Users size={18} /> {t.leaderboard}
                <span className="ms-auto text-stone-400 normal-case tracking-normal">{t.players(sorted.length)}</span>
              </h2>
              <CategoryRacePodium entries={sorted} emptyText={t.noStudents} large dark={dark} />
            </section>
          </div>

          {/* Sidebar: join + setup controls (compact) — hidden in
              presentation mode for a clean projector. */}
          <aside className={`lg:col-span-4 space-y-4 order-1 lg:order-2 ${presenting ? "hidden" : ""}`}>
            {/* Join card */}
            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500">{t.joinHeading}</h2>
                <div className="flex items-center gap-1.5">
                  {!qrHidden && (
                    <button type="button" onClick={() => setQrEnlarged(true)} style={{ touchAction: "manipulation" }}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition active:scale-95 ${iconBtn}`} aria-label={t.enlarge}>
                      <Maximize2 size={15} />
                    </button>
                  )}
                  <button type="button" onClick={() => setQrHidden(h => !h)} style={{ touchAction: "manipulation" }}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition active:scale-95 ${iconBtn}`} aria-label={qrHidden ? t.show : t.hide}>
                    {qrHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                {!qrHidden && (
                  <button type="button" onClick={() => setQrEnlarged(true)} style={{ touchAction: "manipulation" }}
                    className="bg-white p-2 rounded-2xl border border-stone-100 shadow-sm active:scale-[0.98] transition" aria-label={t.enlarge}>
                    <QRCodeSVG value={joinUrl} size={132} />
                  </button>
                )}
                <div className="mt-3 w-full">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t.code}</div>
                  <div className={`text-4xl font-black tracking-[0.15em] ${headingCls}`}>{liveCode}</div>
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

            {/* Round setup */}
            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.catsHeading}</h2>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => {
                  const picked = selectedCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCat(cat.id)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`relative rounded-xl p-2.5 text-start border-2 transition-all ${picked ? `bg-gradient-to-br ${cat.gradient} border-transparent text-white shadow-md` : pillIdle}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="font-black text-xs truncate">{categoryLabel(cat, language)}</span>
                        {picked && <Check size={13} strokeWidth={3} className="ms-auto flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-5 mb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500">{t.timerHeading}</h2>
                <button
                  type="button"
                  onClick={() => setUntimed(u => !u)}
                  style={{ touchAction: "manipulation" }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs transition active:scale-95 ${untimed ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md" : pillIdle}`}
                >
                  <InfinityIcon size={14} /> {t.untimed}
                </button>
              </div>
              <div className={`grid grid-cols-4 gap-2 transition-opacity ${untimed ? "opacity-40 pointer-events-none" : ""}`}>
                {QP_RACE_ROUND_SECONDS.map(opt => {
                  const picked = roundSeconds === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRoundSeconds(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`px-2 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-transparent shadow-md" : pillIdle}`}
                    >
                      {t.seconds(opt)}
                    </button>
                  );
                })}
              </div>

              {selectedCats.length === 0 && (
                <p className="mt-3 text-xs font-bold text-rose-600">{t.pickOne}</p>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={selectedCats.length === 0 || roundActive}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${roundActive || selectedCats.length === 0 ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]"}`}
              >
                {roundActive
                  ? <><Clock size={18} /> {t.roundLive}{currentRace?.untimed ? "" : ` · ${secondsLeft}s`}</>
                  : <><Play size={18} /> {hasRunRound ? t.nextRound : t.start}</>}
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

      {/* Presentation mode: a floating "start next round" so the teacher
          can run the whole race without leaving the clean projector view. */}
      <AnimatePresence>
        {presenting && !roundActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={handleStart}
            disabled={selectedCats.length === 0}
            style={{ touchAction: "manipulation" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl shadow-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500 to-pink-600 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Play size={20} /> {hasRunRound ? t.nextRound : t.start}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Presentation mode while a round is live: float an "end round" so
          the teacher can move on early without leaving the projector view. */}
      <AnimatePresence>
        {presenting && roundActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={handleEndRound}
            style={{ touchAction: "manipulation" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl shadow-rose-500/40 bg-gradient-to-r from-rose-500 to-red-600 active:scale-[0.98] transition"
          >
            <Square size={20} /> {t.endRound}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Enlarged QR overlay — projector-friendly so the back row can scan. */}
      <AnimatePresence>
        {qrEnlarged && !qrHidden && (
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
              <div className="mt-4 text-5xl sm:text-6xl font-black tracking-[0.15em] text-stone-900">{liveCode}</div>
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
