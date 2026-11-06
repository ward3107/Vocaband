import { useBackLayer } from "../hooks/useBackLayer";
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
 *   - enlarge / hide QR + copy-link-to-clipboard
 *
 * Theme: the host follows the teacher's dashboard palette (the shared
 * --vb-* tokens) for light/dark — there's no separate in-page dark
 * toggle, so the dashboard theme picker is the single source of truth.
 *
 * Round config is sent live with each round — nothing race-specific is
 * persisted in the DB.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Play, Clock, LogOut, Check, Copy, Plus, X, Monitor, Minimize2, Square, Zap, Infinity as InfinityIcon } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { useAutoAdvance } from "../hooks/useAutoAdvance";
import { CATEGORIES, categoryLabel, LETTER_POOL } from "../data/category-race-bank";
import GameMusicPlayer from "../components/game/GameMusicPlayer";
import KickConfirmModal from "../components/game/KickConfirmModal";
import GameThemePicker from "../components/game/GameThemePicker";
import { useGameTheme } from "../hooks/useGameTheme";
import GameResults from "../components/game/GameResults";
import TeamScoreBar from "../components/game/TeamScoreBar";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playRoundStart } from "../utils/raceSfx";
import { QP_RACE_ROUND_SECONDS, QP_CATEGORY_RACE_MODE } from "../core/quickPlayProtocol";
import { LIVE_GAME_ACCENTS } from "./liveGameAccents";
import LiveHostSteps from "../components/game/LiveHostSteps";
import type { View } from "../core/views";

interface CategoryRaceHostViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

// No categories pre-selected — the teacher picks the round's categories
// deliberately (product call 2026-06-11; the old six-category default made
// teachers launch rounds with categories they never chose).
const DEFAULT_CATEGORY_IDS: string[] = [];

/** Podium beat between auto-played rounds (mirrors Speed Round). */
const AUTO_ADVANCE_SECONDS = 5;

/**
 * SlotLetter — projector letter reveal. On each new round (keyed by
 * roundId) it spins through random pool letters for ~900ms like a slot
 * machine, then slams onto the real letter with a spring pop so the
 * whole class feels the "and the letter is…" beat.
 */
function SlotLetter({ letter, roundId, hero = false }: { letter: string; roundId: string; hero?: boolean }) {
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
      className={hero ? "relative my-8 inline-flex h-52 w-52 items-center justify-center rounded-full border border-orange-100/40 bg-orange-200/10 text-[10rem] font-black leading-none text-orange-50 shadow-[0_20px_70px_rgba(255,170,130,.2)] sm:h-72 sm:w-72 sm:text-[14rem]" : `inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br ${LIVE_GAME_ACCENTS.race.grad} text-white text-7xl sm:text-8xl font-black shadow-xl ${LIVE_GAME_ACCENTS.race.shadow40} mt-1`}
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
    inRoom: (n: number) => `${n} in the room`,
    pickOne: "Pick at least one category.",
    copy: "Copy link", copied: "Copied!", enlarge: "Enlarge", hide: "Hide", show: "Show QR code",
    darkOn: "Dark", darkOff: "Light", restarting: "Starting new race…",
    present: "Present", controls: "Controls",
    teams: "Teams", teamsOn: "Red vs Blue", teamsOff: "Solo",
    untimed: "Untimed", answerWhenReady: "Answer when ready", endRound: "End round",
    autoPlayLabel: "Auto-start next round", autoNextIn: (n: number) => `Next round in ${n}…`,
    cancel: "Cancel", openRoom: "Open the room", editGame: "Edit game",
    stepAdjust: "Adjust game", stepRoom: "Open room", needCatsShort: "Pick a category to start.",
    morePlaying: (more: number, avg: number) => `+${more} more playing · class avg ${avg}`,
    ownRankHint: "every student sees their own rank on their phone 📱",
  },
  he: {
    title: "מרוץ קטגוריות", joinHeading: "התלמידים מצטרפים כאן", code: "קוד כיתה",
    catsHeading: "קטגוריות", timerHeading: "זמן לסבב", start: "התחל סבב",
    nextRound: "התחל סבב הבא",
    roundLive: "סבב מתבצע", letterLabel: "אות",
    leaderboard: "טבלת מובילים", noStudents: "ממתינים שתלמידים יצטרפו…",
    end: "סיים מרוץ", endNew: "מרוץ חדש", seconds: (n: number) => `${n} שנ'`, players: (n: number) => `${n} משחקים`,
    inRoom: (n: number) => `${n} בחדר`,
    pickOne: "בחרו לפחות קטגוריה אחת.",
    copy: "העתק קישור", copied: "הועתק!", enlarge: "הגדל", hide: "הסתר", show: "הצג קוד QR",
    darkOn: "כהה", darkOff: "בהיר", restarting: "מתחיל מרוץ חדש…",
    present: "מצגת", controls: "פקדים",
    teams: "קבוצות", teamsOn: "אדום נגד כחול", teamsOff: "יחידני",
    untimed: "ללא זמן", answerWhenReady: "ענו כשמוכנים", endRound: "סיים סבב",
    autoPlayLabel: "התחל סבב הבא אוטומטית", autoNextIn: (n: number) => `סבב הבא בעוד ${n}…`,
    cancel: "ביטול", openRoom: "פתחו את החדר", editGame: "עריכת המשחק",
    stepAdjust: "הגדרת המשחק", stepRoom: "פתיחת החדר", needCatsShort: "בחרו קטגוריה כדי להתחיל.",
    morePlaying: (more: number, avg: number) => `עוד ${more} משחקים · ממוצע כיתה ${avg}`,
    ownRankHint: "כל תלמיד רואה את הדירוג שלו בטלפון 📱",
  },
  ar: {
    title: "سباق الفئات", joinHeading: "ينضم الطلاب هنا", code: "رمز الصف",
    catsHeading: "الفئات", timerHeading: "وقت الجولة", start: "ابدأ الجولة",
    nextRound: "ابدأ الجولة التالية",
    roundLive: "الجولة جارية", letterLabel: "حرف",
    leaderboard: "لوحة المتصدرين", noStudents: "في انتظار انضمام الطلاب…",
    end: "إنهاء السباق", endNew: "سباق جديد", seconds: (n: number) => `${n} ث`, players: (n: number) => `${n} يلعبون`,
    inRoom: (n: number) => `${n} في الغرفة`,
    pickOne: "اختر فئة واحدة على الأقل.",
    copy: "نسخ الرابط", copied: "تم النسخ!", enlarge: "تكبير", hide: "إخفاء", show: "إظهار رمز QR",
    darkOn: "داكن", darkOff: "فاتح", restarting: "بدء سباق جديد…",
    present: "عرض", controls: "أدوات",
    teams: "فرق", teamsOn: "أحمر ضد أزرق", teamsOff: "فردي",
    untimed: "بدون وقت", answerWhenReady: "أجب عند الاستعداد", endRound: "إنهاء الجولة",
    autoPlayLabel: "بدء الجولة التالية تلقائيًا", autoNextIn: (n: number) => `الجولة التالية خلال ${n}…`,
    cancel: "إلغاء", openRoom: "افتح الغرفة", editGame: "تعديل اللعبة",
    stepAdjust: "إعداد اللعبة", stepRoom: "افتح الغرفة", needCatsShort: "اختر فئة للبدء.",
    morePlaying: (more: number, avg: number) => `+${more} يلعبون أيضًا · متوسط الصف ${avg}`,
    ownRankHint: "كل طالب يرى ترتيبه على هاتفه 📱",
  },
} as const;

export default function CategoryRaceHostView({ sessionCode, setView }: CategoryRaceHostViewProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  // Teacher-selected board skin (persisted, shared across live games).
  const { themeId, theme, setThemeId } = useGameTheme();

  // Local session code so "New race" can swap to a fresh session in place
  // without bouncing back to the dashboard.
  const [liveCode, setLiveCode] = useState(sessionCode);

  const qp = useQuickPlaySocket({ sessionCode: liveCode, enabled: true });
  const { status, currentRace, leaderboard, observeAsTeacher, startRaceRound, endRaceRound, endSession, onRaceEnded, teamMode, setTeamMode } = qp;

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
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const qrOverlayRef = useRef<HTMLDivElement>(null);
  useBackLayer(() => setQrEnlarged(false), { enabled: qrEnlarged, priority: 50 });
  const [restarting, setRestarting] = useState(false);
  // Show the celebratory results overlay when ending a game that has scores.
  const [showResults, setShowResults] = useState(false);
  // Presentation mode hides ALL teacher chrome (sidebar + header actions)
  // for a clean projector — just the leaderboard + live round.
  const [presenting, setPresenting] = useState(false);
  // Two-step flow: 'setup' = adjust the game (categories/timer/teams),
  // 'room' = the join board (QR + live roster) and live play.
  const [phase, setPhase] = useState<"setup" | "room">("setup");
  // Student pending removal (clientId + nickname) — drives the confirm modal.
  const [confirmKick, setConfirmKick] = useState<{ clientId: string; nickname: string } | null>(null);
  // Auto-play: once the first round is launched, each finished round chains
  // into the next after a short podium beat — no per-round click.
  const [autoPlay, setAutoPlay] = useState(true);
  // Set when the teacher ends a round by hand, so auto-play doesn't relaunch.
  const endedManuallyRef = useRef(false);
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

  // &mode=race lets the student-side bootstrap skip the unused English-vocab
  // prefetch (a race carries no words), so the join screen paints faster on a
  // fresh QR scan over classroom Wi-Fi.
  const joinUrl = useMemo(() => `${window.location.origin}/?session=${liveCode}&mode=race`, [liveCode]);

  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const secondsLeft = currentRace ? Math.max(0, Math.round((currentRace.deadlineTs - now) / 1000)) : 0;
  const lowTime = roundActive && secondsLeft <= 10;

  const canStart = selectedCats.length > 0;

  const toggleCat = (id: string) =>
    setSelectedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleStart = () => {
    if (selectedCats.length === 0 || !tokenRef.current || roundActive) return;
    // The Start tap is a user gesture — prime + play the start jingle so
    // even the first round has music on the projector.
    primeAudio();
    playRoundStart();
    startRaceRound(selectedCats, roundSeconds, tokenRef.current, untimed);
    // Auto-collapse into the clean projector view on the FIRST start only —
    // setup is done, so the board should take over. Only the first round, so
    // a teacher who later taps "Controls" to tweak categories isn't yanked
    // back into presentation every subsequent round.
    if (!hasRunRound) setPresenting(true);
    endedManuallyRef.current = false;
    setHasRunRound(true);
  };

  // Auto-play: after the first round, chain the next one once the podium beat
  // passes. Armed only between rounds (hasRunRound && !roundActive) so the
  // teacher always launches the FIRST round explicitly; the countdown feeds
  // the start buttons below.
  const autoCountdown = useAutoAdvance(
    autoPlay && hasRunRound && !roundActive && selectedCats.length > 0 && !endedManuallyRef.current,
    AUTO_ADVANCE_SECONDS,
    handleStart,
  );

  const handleEndRound = () => {
    // A manual End must stop — don't let auto-play relaunch the next round.
    endedManuallyRef.current = true;
    if (currentRace && tokenRef.current) endRaceRound(currentRace.roundId, tokenRef.current);
  };

  // The actual exit — ends the live session and returns to the dashboard.
  const leaveToDashboard = async () => {
    if (tokenRef.current) endSession(tokenRef.current);
    try { await supabase.rpc("end_quick_play_session", { p_session_code: liveCode }); } catch { /* best-effort */ }
    setView("teacher-dashboard");
  };

  const handleEnd = () => {
    // If the class actually played, send them off with a celebratory
    // results screen first; otherwise just leave.
    if (hasRunRound && sorted.length > 0) setShowResults(true);
    else void leaveToDashboard();
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

  // Theme class helpers.  Painted with the shared --vb-* design tokens
  // (via the @theme `surface` / `on-surface` / `outline-variant`
  // utilities) so the race host follows the teacher's dashboard palette
  // — light or dark — exactly like every other teacher surface.  The
  // old in-page Moon/Sun toggle is gone: the dashboard theme is now the
  // single source of truth, and brand-coloured accents (fuchsia/indigo/
  // rose buttons) auto-adapt to dark via the global utility remap.
  const A = LIVE_GAME_ACCENTS.race;
  const cardCls = "bg-surface border-outline-variant shadow-lg";
  const headingCls = "text-on-surface";
  const pillIdle = "bg-surface border-outline-variant text-on-surface-variant hover:border-outline";
  const iconBtn = `bg-surface ${A.text600} hover:bg-surface-container border border-outline-variant`;

  // Remove a student — available both in Controls and on the live/projected
  // board, since teachers need to drop a disruptive kid mid-game. The confirm
  // modal guards against an accidental tap in front of the class.
  const onKick = (clientId: string, nickname: string) => setConfirmKick({ clientId, nickname });

  return (
    <div className="min-h-[100dvh] transition-colors" dir={dir} style={presenting ? theme.page : { backgroundColor: 'var(--vb-surface-alt)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-2 mb-3">
          <h1 className={`min-w-0 font-black flex items-center gap-2 ${presenting ? `${theme.name} text-3xl sm:text-5xl min-[1700px]:text-7xl drop-shadow-lg` : `${headingCls} text-xl sm:text-3xl`}`}>
            <span className={`flex-shrink-0 ${presenting ? "text-4xl sm:text-6xl min-[1700px]:text-8xl" : "text-2xl sm:text-3xl"}`}>🌍</span>
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
            // Presentation mode: keep only the join code visible (so late
            // students can still join) + a button back to the controls.
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-base sm:text-lg tracking-[0.12em] ${A.chipStatic}`}>
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
            // Icon-only on phones (labels appear at sm+) so the four
            // actions + title fit a single row without overflowing.
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
                onClick={handleEndAndNew}
                aria-label={t.endNew}
                disabled={restarting}
                style={{ touchAction: "manipulation" }}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm ${A.chip} active:scale-95 transition disabled:opacity-60`}
              >
                <Plus size={16} /> <span className="hidden sm:inline">{restarting ? t.restarting : t.endNew}</span>
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
            game="race"
            language={language === "he" ? "he" : language === "ar" ? "ar" : "en"}
            stage={phase === "setup" ? "setup" : roundActive ? "play" : "room"}
          />
        )}

        {/* Background music — draggable corner pill in the room/projector so it
            never covers the board. */}
        <GameMusicPlayer language={language} floating={presenting || phase === "room"} />

        {phase === "setup" ? (
          /* ─────────────── STEP 1 · Adjust the game ─────────────── */
          <div className="max-w-3xl mx-auto space-y-4 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Teams toggle — Solo vs Red/Blue (in-memory, per session) */}
              <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
                <h2 className={`text-xs font-black uppercase tracking-widest ${A.label} mb-3`}>{t.teams}</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => tokenRef.current && setTeamMode(false, tokenRef.current)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className={`px-3 py-2.5 rounded-xl font-black text-sm border-2 transition ${!teamMode ? `bg-gradient-to-r ${A.grad} text-white border-transparent shadow-md` : pillIdle}`}
                  >
                    {t.teamsOff}
                  </button>
                  <button
                    type="button"
                    onClick={() => tokenRef.current && setTeamMode(true, tokenRef.current)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className={`px-3 py-2.5 rounded-xl font-black text-sm border-2 transition ${teamMode ? "bg-gradient-to-r from-rose-500 to-sky-600 text-white border-transparent shadow-md" : pillIdle}`}
                  >
                    🟥🟦 {t.teamsOn}
                  </button>
                </div>
              </section>

              <GameThemePicker themeId={themeId} onSelect={setThemeId} language={language} />
            </div>

            {/* Round setup */}
            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              <h2 className={`text-xs font-black uppercase tracking-widest ${A.label} mb-3`}>{t.catsHeading}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                <h2 className={`text-xs font-black uppercase tracking-widest ${A.label}`}>{t.timerHeading}</h2>
                <button
                  type="button"
                  onClick={() => setUntimed(u => !u)}
                  style={{ touchAction: "manipulation" }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs transition active:scale-95 ${untimed ? `bg-gradient-to-r ${A.grad} text-white shadow-md` : pillIdle}`}
                >
                  <InfinityIcon size={14} /> {t.untimed}
                </button>
              </div>
              <div className={`grid grid-cols-4 sm:grid-cols-8 gap-2 transition-opacity ${untimed ? "opacity-40 pointer-events-none" : ""}`}>
                {QP_RACE_ROUND_SECONDS.map(opt => {
                  const picked = roundSeconds === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRoundSeconds(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`px-2 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? `bg-gradient-to-r ${A.grad} text-white border-transparent shadow-md` : pillIdle}`}
                    >
                      {t.seconds(opt)}
                    </button>
                  );
                })}
              </div>

              {selectedCats.length === 0 && (
                <p className="mt-3 text-xs font-bold text-rose-600">{t.pickOne}</p>
              )}

              {/* Auto-play toggle — rounds chain themselves after the first. */}
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
              {canStart ? <>{t.openRoom} →</> : t.needCatsShort}
            </button>
          </div>
        ) : (
          /* The projector stage and the teacher rail share live socket state. */
          <>
            {teamMode && <div className="mb-4"><TeamScoreBar entries={sorted} /></div>}
            <div className={`grid gap-4 ${presenting ? "" : "lg:grid-cols-[minmax(0,1fr)_360px]"}`}>
              <section className="relative flex min-h-[430px] flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-orange-200/25 bg-[radial-gradient(circle_at_45%_36%,#623b48,#322b3b_58%,#1c2934)] px-5 py-9 text-center text-white shadow-2xl sm:min-h-[620px]" aria-live="polite">
                <div aria-hidden className="pointer-events-none absolute left-1/2 top-[44%] h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/20 sm:h-[490px] sm:w-[490px]" />
                <div aria-hidden className="pointer-events-none absolute left-1/2 top-[44%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/10 sm:h-[650px] sm:w-[650px]" />
                <span className="relative text-xs font-black uppercase tracking-[.18em] text-orange-200">{roundActive ? t.roundLive : t.inRoom(sorted.length)}</span>
                {currentRace ? <SlotLetter letter={currentRace.letter} roundId={currentRace.roundId} hero /> : <span className="relative my-10 text-[clamp(5rem,16vw,12rem)] font-black leading-none text-orange-100">?</span>}
                <span className="relative text-sm font-bold text-orange-100/80">{roundActive ? t.letterLabel : hasRunRound ? t.nextRound : t.start}</span>
                <div className="relative mt-8 inline-flex min-h-16 items-center gap-3 rounded-full border border-orange-200/35 bg-orange-200/15 px-6 text-2xl font-black tabular-nums text-orange-100">
                  <Clock size={20} aria-hidden />
                  {roundActive && currentRace ? currentRace.untimed ? <InfinityIcon size={32} aria-label={t.untimed} /> : <span className={lowTime ? "animate-pulse" : ""}>{secondsLeft}s</span> : <span>{t.players(sorted.length)}</span>}
                </div>
                <div className="relative mt-8 flex flex-wrap justify-center gap-2">{selectedCats.map(id => { const cat = CATEGORIES.find(item => item.id === id); return cat ? <span key={id} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">{cat.emoji} {categoryLabel(cat, language)}</span> : null; })}</div>
              </section>
              {!presenting && <aside className="flex min-w-0 flex-col gap-4 text-white">
                <section className="rounded-[1.25rem] border border-white/10 bg-[#102532] p-5 shadow-lg">
                  <h2 className="text-lg font-black text-orange-100">{t.catsHeading}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-2">{selectedCats.map(id => { const cat = CATEGORIES.find(item => item.id === id); return cat ? <div key={id} className="min-w-0 rounded-xl border border-white/10 bg-white/5 p-3"><span className="text-2xl" aria-hidden>{cat.emoji}</span><b className="mt-1 block truncate text-xs" title={categoryLabel(cat, language)}>{categoryLabel(cat, language)}</b></div> : null; })}</div>
                </section>
                <section className="flex-1 rounded-[1.25rem] border border-white/10 bg-[#102532] p-5 shadow-lg">
                  <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-black text-orange-100">{t.leaderboard}</h2><span className="text-xs font-bold text-white/60">{t.players(sorted.length)}</span></div>
                  <ol className="mt-3 space-y-1">{sorted.slice(0, 5).map((entry, index) => <li key={entry.clientId} className="flex items-center gap-2 border-b border-white/10 py-2 text-sm"><span className="w-6 font-black text-orange-200">{index + 1}</span><span className="min-w-0 flex-1 truncate font-bold" dir="auto">{entry.nickname}</span><strong className="tabular-nums">{entry.score}</strong><button type="button" onClick={() => onKick(entry.clientId, entry.nickname)} aria-label={`${language === "he" ? "הסר תלמיד" : language === "ar" ? "إزالة الطالب" : "Remove student"}: ${entry.nickname}`} className="rounded px-1 text-white/60 hover:text-rose-200"><X size={14} /></button></li>)}</ol>
                  {sorted.length === 0 && <p className="mt-3 text-sm text-white/60">{t.noStudents}</p>}
                  {sorted.length > 5 && <p className="mt-3 text-xs text-white/60">+{sorted.length - 5} {t.players(sorted.length)}</p>}
                  <div className="mt-5 grid gap-2 border-t border-white/15 pt-4">
                    <button type="button" onClick={handleStart} disabled={!canStart || roundActive} className="min-h-12 rounded-xl bg-orange-200 px-4 font-black text-slate-950 disabled:opacity-50">{autoCountdown !== null ? t.autoNextIn(autoCountdown) : hasRunRound ? t.nextRound : t.start}</button>
                    {roundActive && <button type="button" onClick={handleEndRound} className="min-h-11 rounded-xl border border-rose-300/40 bg-rose-950/60 px-4 font-bold">{t.endRound}</button>}
                    <div className="flex gap-2"><button type="button" onClick={() => setQrEnlarged(true)} className="min-h-11 flex-1 rounded-xl border border-white/20 px-3 font-bold">{t.show} · {liveCode}</button><button type="button" onClick={handleCopy} aria-label={t.copy} className="min-h-11 rounded-xl border border-white/20 px-3 font-bold">{copied ? <Check size={16} /> : <Copy size={16} />}</button>{!hasRunRound && !roundActive && <button type="button" onClick={() => setPhase("setup")} className="min-h-11 rounded-xl border border-white/20 px-3 font-bold">{t.editGame}</button>}</div>
                  </div>
                </section>
              </aside>}
            </div>
          </>
        )}
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
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl ${A.shadow40} bg-gradient-to-r ${A.grad} active:scale-[0.98] transition disabled:opacity-60`}
          >
            {autoCountdown !== null
              ? <><Zap size={20} /> {t.autoNextIn(autoCountdown)}</>
              : <><Play size={20} /> {hasRunRound ? t.nextRound : t.start}</>}
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

      {/* Enlarged QR overlay — projector-friendly so the back row can scan. */}
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
