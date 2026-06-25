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
import { Play, Clock, Users, LogOut, Check, Copy, Maximize2, Plus, X, Monitor, Minimize2, Square, Zap, Infinity as InfinityIcon } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { useAutoAdvance } from "../hooks/useAutoAdvance";
import { CATEGORIES, categoryLabel, LETTER_POOL } from "../data/category-race-bank";
import CategoryRacePodium from "../components/game/CategoryRacePodium";
import GameMusicPlayer from "../components/game/GameMusicPlayer";
import LobbyRoster from "../components/game/LobbyRoster";
import KickConfirmModal from "../components/game/KickConfirmModal";
import GameThemePicker from "../components/game/GameThemePicker";
import { useGameTheme } from "../hooks/useGameTheme";
import GameResults from "../components/game/GameResults";
import TeamScoreBar from "../components/game/TeamScoreBar";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playRoundStart } from "../utils/raceSfx";
import { QP_RACE_ROUND_SECONDS, QP_CATEGORY_RACE_MODE } from "../core/quickPlayProtocol";
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

  // The board shows the top racers; the rest collapse into a "+N more"
  // summary so a full class stays readable on a projector.
  const TOP_N = 8;
  const shownEntries = useMemo(() => sorted.slice(0, presenting ? 12 : TOP_N), [sorted, presenting]);
  const moreCount = Math.max(0, sorted.length - shownEntries.length);
  const classAvg = sorted.length ? Math.round(sorted.reduce((s, e) => s + e.score, 0) / sorted.length) : 0;
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
  const cardCls = "bg-surface border-outline-variant shadow-lg";
  const headingCls = "text-on-surface";
  const pillIdle = "bg-surface border-outline-variant text-on-surface-variant hover:border-outline";
  const iconBtn = "bg-surface text-fuchsia-600 hover:bg-surface-container border border-outline-variant";

  // Remove a student — available both in Controls and on the live/projected
  // board, since teachers need to drop a disruptive kid mid-game. The confirm
  // modal guards against an accidental tap in front of the class.
  const onKick = (clientId: string, nickname: string) => setConfirmKick({ clientId, nickname });

  return (
    <div className="min-h-[100dvh] transition-colors" dir={dir} style={presenting ? theme.page : { backgroundColor: 'var(--vb-surface-alt)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-2 mb-3">
          <h1 className={`min-w-0 text-xl sm:text-3xl font-black flex items-center gap-2 ${presenting ? theme.name : headingCls}`}>
            <span className="text-2xl sm:text-3xl flex-shrink-0">🌍</span>
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
              <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-base sm:text-lg tracking-[0.12em] bg-fuchsia-50 text-fuchsia-700">
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
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95 transition"
              >
                <Monitor size={16} /> <span className="hidden sm:inline">{t.present}</span>
              </button>
              <button
                type="button"
                onClick={handleEndAndNew}
                disabled={restarting}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 active:scale-95 transition disabled:opacity-60"
              >
                <Plus size={16} /> <span className="hidden sm:inline">{restarting ? t.restarting : t.endNew}</span>
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

        {/* Step indicator — Adjust game → Open room. Hidden in projector mode. */}
        {!presenting && (
          <div className="flex items-center justify-center gap-2 mb-5 text-xs font-black">
            {([["setup", "1", t.stepAdjust], ["room", "2", t.stepRoom]] as const).map(([p, num, label], i) => {
              const active = phase === p;
              const done = phase === "room" && p === "setup";
              return (
                <div key={p} className="flex items-center gap-2">
                  {i > 0 && <span className="w-7 h-px bg-stone-300" />}
                  <span className={`inline-flex items-center gap-1.5 ${active ? "text-fuchsia-600" : done ? "text-emerald-600" : "text-stone-400"}`}>
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] ${active ? "bg-fuchsia-500 text-white" : done ? "bg-emerald-500 text-white" : "bg-stone-200 text-stone-500"}`}>
                      {done ? <Check size={12} strokeWidth={3} /> : num}
                    </span>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
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
                <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.teams}</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => tokenRef.current && setTeamMode(false, tokenRef.current)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className={`px-3 py-2.5 rounded-xl font-black text-sm border-2 transition ${!teamMode ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-transparent shadow-md" : pillIdle}`}
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
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.catsHeading}</h2>
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
              <div className={`grid grid-cols-4 sm:grid-cols-8 gap-2 transition-opacity ${untimed ? "opacity-40 pointer-events-none" : ""}`}>
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

              {/* Auto-play toggle — rounds chain themselves after the first. */}
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
            </section>

            {/* Open the room → moves to Step 2 (students can now scan in). */}
            <button
              type="button"
              onClick={() => canStart && setPhase("room")}
              disabled={!canStart}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${canStart ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]" : "bg-stone-300 cursor-not-allowed"}`}
            >
              {canStart ? <>{t.openRoom} →</> : t.needCatsShort}
            </button>
          </div>
        ) : (
          /* ─────────────── STEP 2 · The room + live play ─────────────── */
          <>
            {/* Round banner — only shown while a round is live. */}
            <AnimatePresence>
              {roundActive && currentRace && (
                <motion.section
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mb-4 rounded-3xl border p-6 sm:p-7 text-center shadow-lg ${
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

            {/* Live Red vs Blue total — only in team mode. */}
            {teamMode && <div className="mb-4"><TeamScoreBar entries={sorted} /></div>}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: join card (QR + code) + play controls. */}
              {!presenting && (
                <aside className="lg:col-span-4 space-y-4">
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
                        <QRCodeSVG value={joinUrl} size={150} />
                      </button>
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
                        {!hasRunRound && !roundActive && (
                          <button
                            type="button"
                            onClick={() => setPhase("setup")}
                            style={{ touchAction: "manipulation" }}
                            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 active:scale-[0.98] transition"
                          >
                            ← {t.editGame}
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Play controls — start / next / end-round. */}
                  <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={selectedCats.length === 0 || roundActive}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${roundActive || selectedCats.length === 0 ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]"}`}
                    >
                      {roundActive
                        ? <><Clock size={18} /> {t.roundLive}{currentRace?.untimed ? "" : ` · ${secondsLeft}s`}</>
                        : autoCountdown !== null
                          ? <><Zap size={18} /> {t.autoNextIn(autoCountdown)}</>
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
              )}

              {/* Main: the board — live roster (pre-game) or leaderboard. */}
              <div className={`${presenting ? "lg:col-span-12" : "lg:col-span-8"}`}>
                {hasRunRound || roundActive ? (
                  <section className={`rounded-3xl shadow-lg border p-5 sm:p-6 ${presenting ? theme.card : cardCls}`}>
                    <h2 className="text-sm font-black uppercase tracking-widest text-fuchsia-500 mb-4 flex items-center gap-2">
                      <Users size={18} /> {t.leaderboard}
                      <span className="ms-auto text-stone-400 normal-case tracking-normal">{t.players(sorted.length)}</span>
                    </h2>
                    <CategoryRacePodium entries={shownEntries} emptyText={t.noStudents} large={presenting} onKick={onKick} theme={presenting ? theme : undefined} />
                    {moreCount > 0 && (
                      <div className={`mt-3 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border px-4 py-3 text-center text-xs font-bold ${presenting ? "border-white/15 text-white/80" : "border-outline-variant bg-surface-container text-on-surface-variant"}`}>
                        {t.morePlaying(moreCount, classAvg)} · {t.ownRankHint}
                      </div>
                    )}
                  </section>
                ) : (
                  <section className={`rounded-3xl shadow-lg border p-5 sm:p-6 ${presenting ? theme.card : cardCls}`}>
                    <LobbyRoster
                      players={sorted}
                      countLabel={t.inRoom}
                      emptyLabel={t.noStudents}
                      accent="from-fuchsia-500 to-pink-600"
                      large={presenting}
                      onKick={onKick}
                      theme={presenting ? theme : undefined}
                    />
                  </section>
                )}
              </div>
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl shadow-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500 to-pink-600 active:scale-[0.98] transition disabled:opacity-60"
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
          <GameResults entries={sorted} onBack={leaveToDashboard} accent="from-fuchsia-500 to-pink-600" />
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
