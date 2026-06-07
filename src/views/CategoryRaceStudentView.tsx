/**
 * CategoryRaceStudentView — the student side of a live Category Race,
 * from join to play. Owns the whole student journey so it stays simple
 * and self-contained (no shared multi-step Quick Play join flow):
 *
 *   join (name + avatar) → get-ready (audio unlock) → lobby (waiting) →
 *   focus card (answering) → result → back to lobby for the next round,
 *   until the teacher ends.
 *
 * Round state is server-pushed: the teacher starts a round, the server
 * rolls one letter with a shared deadline, the student types in the
 * full-screen focus card, and on submit / timeout the server scores the
 * answers and returns the per-cell result.
 *
 * Polish parity with Quick Play: the tabbed QPAvatarPicker, a get-ready
 * screen that primes iOS audio, a floating help button, friendly error
 * screens, confetti + sound + point count-up + an "on fire" streak on
 * the result.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Hourglass, Trophy, Check, X, RotateCw, Crown, ArrowRight, Loader2 } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import CategoryRaceFocusCard from "../components/game/CategoryRaceFocusCard";
import QPAvatarPicker from "../components/QPAvatarPicker";
import QPAvatar from "../components/QPAvatar";
import QuickPlayHelpButton from "../components/QuickPlayHelpButton";
import QuickPlayErrorScreen from "../components/QuickPlayErrorScreen";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playLetterReveal, playGood, playGentle, playFanfare } from "../utils/raceSfx";
import { CATEGORIES, categoryLabel, type CategoryMeta } from "../data/category-race-bank";
import { containsProfanity } from "../utils/nicknameProfanity";
import type { QpRaceResultPayload } from "../core/quickPlayProtocol";
import type { View } from "../core/views";

interface CategoryRaceStudentViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

type Phase = "join" | "lobby" | "answering" | "result" | "ended" | "kicked";

const DEFAULT_AVATAR = "🦊";

const STRINGS = {
  en: {
    joinTitle: "Category Race", joinSub: "Type your name and jump in!",
    namePlaceholder: "Your name", continueBtn: "Continue", joinBtn: "Join the race", joining: "Joining…",
    nameTaken: "That name is taken — try another.", kicked: "You were removed from this game.",
    joinFailed: "Couldn't join. Check the code and try again.", badName: "Please pick a different name.",
    lobbyTitle: "You're in!", lobbySub: "Waiting for your teacher to start the race…",
    roundOver: "Round over", yourScore: "Your score", waitingNext: "Waiting for the next round…",
    endedTitle: "Race finished!", endedSub: "Thanks for playing.", backHome: "Back to home",
    points: (n: number) => `${n} pts`, rank: (n: number) => `#${n}`,
    onFire: (n: number) => `On fire! ${n} perfect rounds in a row`,
    chase: (pts: number) => `${pts} pts behind the leader — catch them!`,
    nailedIt: "Nailed it — all in English! 🎯",
    niceTry: (n: number) => n > 0 ? `Nice — ${n} in English! Keep going.` : "Keep going — you'll get the next one! 💪",
    speedLabel: "speed bonus", standings: "Live standings", you: "You",
  },
  he: {
    joinTitle: "מרוץ קטגוריות", joinSub: "כתבו את השם והצטרפו!",
    namePlaceholder: "השם שלך", continueBtn: "המשך", joinBtn: "הצטרפו למרוץ", joining: "מצטרפים…",
    nameTaken: "השם תפוס — נסו שם אחר.", kicked: "הוסרת מהמשחק.",
    joinFailed: "ההצטרפות נכשלה. בדקו את הקוד ונסו שוב.", badName: "בחרו שם אחר בבקשה.",
    lobbyTitle: "אתם בפנים!", lobbySub: "ממתינים שהמורה יתחיל את המרוץ…",
    roundOver: "הסבב הסתיים", yourScore: "הניקוד שלך", waitingNext: "ממתינים לסבב הבא…",
    endedTitle: "המרוץ הסתיים!", endedSub: "תודה ששיחקתם.", backHome: "חזרה לבית",
    points: (n: number) => `${n} נק'`, rank: (n: number) => `#${n}`,
    onFire: (n: number) => `אש! ${n} סבבים מושלמים ברצף`,
    chase: (pts: number) => `${pts} נק' מאחורי המוביל — תשיגו אותו!`,
    nailedIt: "מצוין — הכול באנגלית! 🎯",
    niceTry: (n: number) => n > 0 ? `יפה — ${n} באנגלית! המשיכו.` : "המשיכו — תצליחו בסבב הבא! 💪",
    speedLabel: "בונוס מהירות", standings: "דירוג חי", you: "אתם",
  },
  ar: {
    joinTitle: "سباق الفئات", joinSub: "اكتب اسمك وانضم!",
    namePlaceholder: "اسمك", continueBtn: "متابعة", joinBtn: "انضم إلى السباق", joining: "جارٍ الانضمام…",
    nameTaken: "الاسم مأخوذ — جرّب اسمًا آخر.", kicked: "تمت إزالتك من اللعبة.",
    joinFailed: "تعذّر الانضمام. تحقق من الرمز وحاول مجددًا.", badName: "اختر اسمًا مختلفًا من فضلك.",
    lobbyTitle: "أنت في السباق!", lobbySub: "في انتظار أن يبدأ معلمك السباق…",
    roundOver: "انتهت الجولة", yourScore: "نتيجتك", waitingNext: "في انتظار الجولة التالية…",
    endedTitle: "انتهى السباق!", endedSub: "شكرًا للعب.", backHome: "العودة للرئيسية",
    points: (n: number) => `${n} نقطة`, rank: (n: number) => `#${n}`,
    onFire: (n: number) => `رائع! ${n} جولات مثالية متتالية`,
    chase: (pts: number) => `${pts} نقطة خلف المتصدر — الحق به!`,
    nailedIt: "أحسنت — كله بالإنجليزية! 🎯",
    niceTry: (n: number) => n > 0 ? `جيد — ${n} بالإنجليزية! واصل.` : "واصل — ستنجح في الجولة القادمة! 💪",
    speedLabel: "مكافأة السرعة", standings: "الترتيب المباشر", you: "أنت",
  },
} as const;

/** easeOutCubic count-up so a "+45" visibly ticks up instead of snapping. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{display}</span>;
}

export default function CategoryRaceStudentView({ sessionCode, setView }: CategoryRaceStudentViewProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const {
    currentRace, leaderboard, clientId, joinedSessionCode, lastError,
    joinAsStudent, submitRaceAnswers, sendReaction,
    onRaceResult, onRaceEnded, onSessionEnded, onKicked,
  } = qp;

  const [phase, setPhase] = useState<Phase>("join");
  // Join form
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  // Round play
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [focusIndex, setFocusIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lastResult, setLastResult] = useState<QpRaceResultPayload | null>(null);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Motivation: consecutive perfect (all-English) rounds.
  const [streak, setStreak] = useState(0);
  // Category ids where the student used a hint this round (reduced points).
  const [helped, setHelped] = useState<Set<string>>(new Set());

  // Refs so the countdown's auto-submit reads the freshest values.
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const helpedRef = useRef(helped);
  useEffect(() => { helpedRef.current = helped; }, [helped]);
  const raceRef = useRef(currentRace);
  useEffect(() => { raceRef.current = currentRace; }, [currentRace]);
  const submittedRef = useRef(false);

  const categories: CategoryMeta[] = useMemo(
    () => (currentRace ? CATEGORIES.filter(c => currentRace.categories.includes(c.id)) : []),
    [currentRace],
  );

  // ─── Phone back-button trap ─────────────────────────────────────────
  // The race is a single-screen join → game flow, so the hardware back
  // button should never drop the student to the landing page mid-race.
  // Re-push to block exit; the visible Leave / Back-home buttons are the
  // only way out. Capture-phase + stopImmediatePropagation keeps the
  // global trap from also firing.
  useEffect(() => {
    window.history.pushState({ view: "category-race-student" }, "");
    const handler = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      window.history.pushState({ view: "category-race-student" }, "");
    };
    window.addEventListener("popstate", handler, { capture: true });
    return () => window.removeEventListener("popstate", handler, { capture: true });
  }, []);

  // ─── Join ────────────────────────────────────────────────────────────
  // Single-screen join: validate, prime iOS audio inside this tap's
  // gesture context (so the round's first spoken letter isn't swallowed
  // by Safari autoplay), then emit the join. The view advances to the
  // lobby only once the server confirms (joinedSessionCode effect below).
  const handleContinue = () => {
    if (joining) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (containsProfanity(trimmed)) { setJoinError(t.badName); return; }
    setJoinError(null);
    primeAudio();
    setJoining(true);
    joinAsStudent(trimmed, avatar);
  };

  // Advance to the lobby once the server confirms the join.
  useEffect(() => {
    if (joining && joinedSessionCode === sessionCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- socket join confirmation; matches existing convention
      setJoining(false);
      setPhase("lobby");
    }
  }, [joining, joinedSessionCode, sessionCode]);

  // Surface a join rejection (name taken / bad payload) — bounce back to
  // the join form with the reason so the student can fix it.
  useEffect(() => {
    if (!lastError || phase !== "join") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to a socket error payload; matches existing convention
    setJoining(false);
    setPhase("join");
    setJoinError(
      lastError.code === "nickname_taken" ? t.nameTaken
      : lastError.code === "kicked" ? t.kicked
      : t.joinFailed,
    );
  }, [lastError, phase, t]);

  // ─── Round play ──────────────────────────────────────────────────────
  const doSubmit = useCallback(() => {
    const race = raceRef.current;
    if (!race || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    submitRaceAnswers(race.roundId, answersRef.current, [...helpedRef.current]);
  }, [submitRaceAnswers]);

  // A new round started — reset, play the letter-reveal blip, and drop
  // into the focus card.
  useEffect(() => {
    if (phase === "join") return;
    if (currentRace && currentRace.roundId !== activeRoundId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a server-pushed new round resets local play state; matches existing convention
      setActiveRoundId(currentRace.roundId);
      setAnswers({});
      setFocusIndex(0);
      setLastResult(null);
      setHelped(new Set());
      submittedRef.current = false;
      setSubmitting(false);
      setPhase("answering");
      playLetterReveal();
    }
  }, [currentRace, activeRoundId, phase]);

  // Countdown to the shared deadline; auto-submit at zero. Skipped for
  // untimed (relaxed) rounds — the student submits when ready.
  useEffect(() => {
    if (phase !== "answering" || !currentRace || currentRace.untimed) return;
    const tick = () => {
      const left = Math.max(0, Math.round((currentRace.deadlineTs - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) doSubmit();
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [phase, currentRace, doSubmit]);

  useEffect(() => onRaceResult((p) => {
    setSubmitting(false);
    setLastResult(p);
    setPhase("result");

    // Reward feedback: a "perfect" round = every active category answered
    // in English. Perfect → streak ticks up + full confetti + bright chime.
    // Any points → small spark + chime. Nothing → gentle note, streak resets.
    const total = p.cells.length;
    const englishCount = p.cells.filter(c => c.matchedLanguage === "en").length;
    const perfect = total > 0 && englishCount === total;
    if (perfect) {
      setStreak(s => s + 1);
      celebrate(streak >= 1 ? "big" : "normal");
      playGood();
    } else if (p.roundPoints > 0) {
      setStreak(0);
      celebrate("small");
      playGood();
    } else {
      setStreak(0);
      playGentle();
    }
  }), [onRaceResult, streak]);

  // Server says the round closed — final-submit if we never did, else
  // fall back to the lobby so a dropped RACE_RESULT doesn't strand us.
  useEffect(() => onRaceEnded(() => {
    if (submittedRef.current) {
      setSubmitting(false);
      setPhase(prev => (prev === "answering" ? "lobby" : prev));
    } else {
      doSubmit();
    }
  }), [onRaceEnded, doSubmit]);

  // Safety net: a submit went out but no RACE_RESULT came back — don't
  // trap the student on the answering screen.
  useEffect(() => {
    if (phase !== "answering" || !submitting) return;
    const id = window.setTimeout(() => {
      setSubmitting(false);
      setPhase(prev => (prev === "answering" ? "lobby" : prev));
    }, 6000);
    return () => window.clearTimeout(id);
  }, [phase, submitting]);

  useEffect(() => onSessionEnded(() => {
    setPhase("ended");
    playFanfare();
  }), [onSessionEnded]);
  useEffect(() => onKicked(() => setPhase("kicked")), [onKicked]);

  // Derived: this student's live rank + score from the leaderboard.
  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const myIndex = sorted.findIndex(e => e.clientId === clientId);
  const myEntry = myIndex >= 0 ? sorted[myIndex] : null;
  const leaderScore = sorted[0]?.score ?? 0;

  // Fire confetti once when a top-3 finish lands on the ended screen.
  const finishCelebrated = useRef(false);
  useEffect(() => {
    if (phase === "ended" && !finishCelebrated.current && myIndex >= 0 && myIndex < 3) {
      finishCelebrated.current = true;
      celebrate("big");
    }
  }, [phase, myIndex]);

  const helpButton = (
    <QuickPlayHelpButton
      onAlertTeacher={() => sendReaction("🙋")}
      onLeave={() => setView("public-landing")}
    />
  );

  // ─── Join screen (name + rich avatar picker) ─────────────────────────
  if (phase === "join") {
    const canContinue = name.trim().length > 0;
    return (
      <Shell dir={dir}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-[32px] bg-white shadow-2xl shadow-fuchsia-500/20 border border-fuchsia-100 p-7"
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🌍</div>
            <h1 className="text-3xl font-black text-stone-900">{t.joinTitle}</h1>
            <p className="mt-1 text-stone-500 font-semibold">{t.joinSub}</p>
          </div>

          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setJoinError(null); }}
            onKeyDown={e => { if (e.key === "Enter") handleContinue(); }}
            placeholder={t.namePlaceholder}
            maxLength={30}
            autoComplete="off"
            dir="auto"
            className="w-full bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-fuchsia-400 outline-none px-5 py-4 text-xl font-bold text-stone-900 placeholder-stone-300 text-center transition"
          />

          <div className="mt-5">
            <QPAvatarPicker selected={avatar} onSelect={setAvatar} />
          </div>

          {joinError && <p className="mt-4 text-sm font-bold text-rose-600 text-center">{joinError}</p>}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue || joining}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-lg text-white shadow-lg transition ${canContinue && !joining ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]" : "bg-stone-300 cursor-not-allowed"}`}
          >
            {joining ? (
              <><Loader2 size={20} className="animate-spin" /> {t.joining}</>
            ) : (
              <>{t.joinBtn} <ArrowRight size={20} className={dir === "rtl" ? "rotate-180" : ""} /></>
            )}
          </button>
        </motion.div>
      </Shell>
    );
  }

  // ─── Answering: the full-screen focus card ───────────────────────────
  if (phase === "answering" && currentRace && categories.length > 0) {
    return (
      <CategoryRaceFocusCard
        letter={currentRace.letter}
        categories={categories}
        answers={answers}
        onChange={(id, v) => setAnswers(prev => ({ ...prev, [id]: v }))}
        index={focusIndex}
        setIndex={setFocusIndex}
        secondsLeft={secondsLeft}
        totalSeconds={currentRace.roundSeconds}
        untimed={!!currentRace.untimed}
        onHintUsed={(id) => setHelped(prev => new Set(prev).add(id))}
        onSubmit={doSubmit}
        submitting={submitting}
      />
    );
  }

  // ─── Kicked ──────────────────────────────────────────────────────────
  if (phase === "kicked") {
    return (
      <Shell dir={dir}>
        <QuickPlayErrorScreen kind="kicked" onPrimary={() => setView("public-landing")} />
      </Shell>
    );
  }

  // ─── Ended (celebratory finish) ──────────────────────────────────────
  if (phase === "ended") {
    return (
      <Shell dir={dir}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-7xl mb-3">{myIndex === 0 ? "🥇" : myIndex === 1 ? "🥈" : myIndex === 2 ? "🥉" : "🎉"}</div>
          <h1 className="text-3xl font-black text-stone-900">{t.endedTitle}</h1>
          {myEntry && (
            <p className="mt-2 text-lg font-black text-fuchsia-600">
              {t.yourScore}: <CountUp value={myEntry.score} /> {language === "he" ? "נק'" : language === "ar" ? "نقطة" : "pts"}
              {myIndex >= 0 ? ` · ${t.rank(myIndex + 1)}` : ""}
            </p>
          )}
          <p className="mt-1 text-stone-500 font-semibold">{t.endedSub}</p>
          <button
            type="button"
            onClick={() => setView("public-landing")}
            style={{ touchAction: "manipulation" }}
            className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-2xl font-black text-white bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-lg active:scale-95"
          >
            {t.backHome}
          </button>
        </motion.div>
        {helpButton}
      </Shell>
    );
  }

  // ─── Result ──────────────────────────────────────────────────────────
  if (phase === "result" && lastResult) {
    const total = lastResult.cells.length;
    const englishCount = lastResult.cells.filter(c => c.matchedLanguage === "en").length;
    const perfect = total > 0 && englishCount === total;
    const behind = myEntry && leaderScore > myEntry.score ? leaderScore - myEntry.score : 0;
    return (
      <Shell dir={dir}>
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
          <header className="text-center mb-4">
            <motion.div
              initial={{ scale: 0.6, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg mb-2"
            >
              <Trophy size={30} />
            </motion.div>
            <h2 className="text-2xl font-black text-stone-900">{t.roundOver}</h2>
            <p className="mt-1 font-black text-fuchsia-600 text-2xl">
              +<CountUp value={lastResult.roundPoints} /> · {t.yourScore} <CountUp value={lastResult.totalScore} />
            </p>

            {lastResult.speedBonus > 0 && (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.15 }}
                className="mt-1.5 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black text-xs"
              >
                ⚡ +{lastResult.speedBonus} {t.speedLabel}
              </motion.div>
            )}

            {/* Streak / encouragement banner. */}
            {streak >= 2 ? (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-sm shadow-md"
              >
                🔥 {t.onFire(streak)}
              </motion.div>
            ) : (
              <p className="mt-2 text-sm font-bold text-stone-500">{perfect ? t.nailedIt : t.niceTry(englishCount)}</p>
            )}

            {behind > 0 && (
              <p className="mt-1 text-xs font-bold text-fuchsia-500">⚡ {t.chase(behind)}</p>
            )}
          </header>

          <ul className="space-y-2 mb-5">
            {lastResult.cells.map(cell => {
              const meta = CATEGORIES.find(c => c.id === cell.categoryId);
              const isEn = cell.matchedLanguage === "en";
              const isL1 = cell.matchedLanguage === "he" || cell.matchedLanguage === "ar";
              const color = isEn ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : isL1 ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-rose-50 border-rose-200 text-rose-900";
              const Icon = isEn ? Check : isL1 ? RotateCw : X;
              return (
                <li key={cell.categoryId} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${color}`}>
                  <span className="text-xl">{meta?.emoji ?? "•"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{meta ? categoryLabel(meta, language) : cell.categoryId}</div>
                    <div className="font-black text-sm truncate" dir="auto">{cell.typed || "—"}</div>
                  </div>
                  <span className="font-black text-sm">{cell.points > 0 ? `+${cell.points}` : "0"}</span>
                  <Icon size={18} strokeWidth={3} className="flex-shrink-0" />
                </li>
              );
            })}
          </ul>
          {/* Live standings — stays engaging while others finish; updates
              in real time as each submit lands. */}
          {sorted.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 text-center">{t.standings}</div>
              <ul className="space-y-1.5">
                {sorted.slice(0, 5).map((e, i) => {
                  const me = e.clientId === clientId;
                  return (
                    <li key={e.clientId} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${me ? "bg-fuchsia-100 ring-2 ring-fuchsia-300" : "bg-white shadow-sm"}`}>
                      <span className="w-6 text-center font-black text-xs text-stone-500">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                      <span className="flex items-center justify-center text-lg"><QPAvatar value={e.avatar || "🦊"} iconSize={18} /></span>
                      <span className="flex-1 min-w-0 truncate font-black text-sm text-stone-800" dir="auto">{me ? t.you : e.nickname}</span>
                      <span className="font-black text-sm text-fuchsia-600 tabular-nums">{e.score}</span>
                    </li>
                  );
                })}
                {myIndex >= 5 && myEntry && (
                  <li className="flex items-center gap-2 rounded-xl px-3 py-2 bg-fuchsia-100 ring-2 ring-fuchsia-300">
                    <span className="w-6 text-center font-black text-xs text-stone-500">{myIndex + 1}</span>
                    <span className="flex items-center justify-center text-lg"><QPAvatar value={avatar} iconSize={18} /></span>
                    <span className="flex-1 min-w-0 truncate font-black text-sm text-stone-800">{t.you}</span>
                    <span className="font-black text-sm text-fuchsia-600 tabular-nums">{myEntry.score}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-stone-400 font-bold text-sm">
            <Hourglass size={16} className="animate-pulse" /> {t.waitingNext}
          </div>
        </motion.div>
        {helpButton}
      </Shell>
    );
  }

  // ─── Lobby (default / between rounds before first submit) ────────────
  return (
    <Shell dir={dir}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <motion.div
          initial={{ scale: 0.6 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="text-7xl mb-3 flex items-center justify-center"
        >
          <QPAvatar value={avatar} iconSize={72} />
        </motion.div>
        <h1 className="text-3xl font-black text-stone-900">{t.lobbyTitle}</h1>
        <p className="mt-2 text-stone-500 font-semibold max-w-xs mx-auto">{t.lobbySub}</p>
        {myEntry && (
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md font-black text-stone-700">
            {myIndex === 0 && <Crown size={16} className="text-amber-500" />}
            {t.rank(myIndex + 1)} · {t.points(myEntry.score)}
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.span key={i} className="w-2.5 h-2.5 rounded-full bg-fuchsia-400"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      </motion.div>
      {helpButton}
    </Shell>
  );
}

function Shell({ children, dir }: { children: ReactNode; dir: "ltr" | "rtl" }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50" dir={dir}>
      {children}
    </div>
  );
}
