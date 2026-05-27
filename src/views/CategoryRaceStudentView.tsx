/**
 * CategoryRaceStudentView — the student side of a live Category Race.
 *
 * The student has already joined via QuickPlayStudentView (name + avatar
 * + Quick Play socket). This view owns the round loop:
 *   lobby (waiting for the teacher) → focus card (answering) → result →
 *   back to lobby for the next round, until the teacher ends the session.
 *
 * All round state is server-pushed: the teacher starts a round, the
 * server rolls one letter with a shared deadline, the student types in
 * the full-screen focus card, and on submit / timeout the server scores
 * the answers and sends back the per-cell result.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Hourglass, Trophy, Check, X, RotateCw, Crown } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import CategoryRaceFocusCard from "../components/game/CategoryRaceFocusCard";
import { CATEGORIES, categoryLabel, type CategoryMeta } from "../data/category-race-bank";
import type { QpRaceResultPayload } from "../core/quickPlayProtocol";
import type { View } from "../core/views";

interface CategoryRaceStudentViewProps {
  sessionCode: string;
  studentName: string;
  avatar: string;
  setView: (v: View) => void;
}

type Phase = "lobby" | "answering" | "result" | "ended";

const STRINGS = {
  en: {
    lobbyTitle: "You're in!", lobbySub: "Waiting for your teacher to start the race…",
    roundOver: "Round over", you: "You", points: (n: number) => `${n} pts`,
    yourScore: "Your score", waitingNext: "Waiting for the next round…",
    endedTitle: "Race finished!", endedSub: "Thanks for playing.", backHome: "Back to home",
    rank: (n: number) => `#${n}`,
  },
  he: {
    lobbyTitle: "אתם בפנים!", lobbySub: "ממתינים שהמורה יתחיל את המרוץ…",
    roundOver: "הסבב הסתיים", you: "אתם", points: (n: number) => `${n} נק'`,
    yourScore: "הניקוד שלך", waitingNext: "ממתינים לסבב הבא…",
    endedTitle: "המרוץ הסתיים!", endedSub: "תודה ששיחקתם.", backHome: "חזרה לבית",
    rank: (n: number) => `#${n}`,
  },
  ar: {
    lobbyTitle: "أنت في السباق!", lobbySub: "في انتظار أن يبدأ معلمك السباق…",
    roundOver: "انتهت الجولة", you: "أنت", points: (n: number) => `${n} نقطة`,
    yourScore: "نتيجتك", waitingNext: "في انتظار الجولة التالية…",
    endedTitle: "انتهى السباق!", endedSub: "شكرًا للعب.", backHome: "العودة للرئيسية",
    rank: (n: number) => `#${n}`,
  },
} as const;

export default function CategoryRaceStudentView({ sessionCode, studentName, avatar, setView }: CategoryRaceStudentViewProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const { currentRace, leaderboard, clientId, joinAsStudent, submitRaceAnswers, onRaceResult, onSessionEnded, onKicked } = qp;

  const [phase, setPhase] = useState<Phase>("lobby");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [focusIndex, setFocusIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lastResult, setLastResult] = useState<QpRaceResultPayload | null>(null);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);

  // Refs so the countdown's auto-submit reads the freshest values.
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const raceRef = useRef(currentRace);
  useEffect(() => { raceRef.current = currentRace; }, [currentRace]);
  const submittedRef = useRef(false);

  const categories: CategoryMeta[] = useMemo(
    () => (currentRace ? CATEGORIES.filter(c => currentRace.categories.includes(c.id)) : []),
    [currentRace],
  );

  // Ensure THIS hook instance is the registered owner (the join happened
  // in QuickPlayStudentView's instance). Re-emitting is idempotent: the
  // server keeps the existing score for the same clientId/nickname.
  useEffect(() => {
    joinAsStudent(studentName, avatar);
  }, [joinAsStudent, studentName, avatar]);

  const doSubmit = useCallback(() => {
    const race = raceRef.current;
    if (!race || submittedRef.current) return;
    submittedRef.current = true;
    submitRaceAnswers(race.roundId, answersRef.current);
  }, [submitRaceAnswers]);

  // A new round started — reset and drop into the focus card.
  useEffect(() => {
    if (currentRace && currentRace.roundId !== activeRoundId) {
      setActiveRoundId(currentRace.roundId);
      setAnswers({});
      setFocusIndex(0);
      setLastResult(null);
      submittedRef.current = false;
      setPhase("answering");
    }
  }, [currentRace, activeRoundId]);

  // Countdown to the shared deadline; auto-submit at zero.
  useEffect(() => {
    if (phase !== "answering" || !currentRace) return;
    const tick = () => {
      const left = Math.max(0, Math.round((currentRace.deadlineTs - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) doSubmit();
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [phase, currentRace, doSubmit]);

  // Server scored our submission → show the result screen.
  useEffect(() => onRaceResult((p) => {
    setLastResult(p);
    setPhase("result");
  }), [onRaceResult]);

  useEffect(() => onSessionEnded(() => setPhase("ended")), [onSessionEnded]);
  useEffect(() => onKicked(() => setPhase("ended")), [onKicked]);

  // Derived: this student's live rank + score from the leaderboard.
  const sorted = useMemo(
    () => [...leaderboard].sort((a, b) => b.score - a.score),
    [leaderboard],
  );
  const myIndex = sorted.findIndex(e => e.clientId === clientId);
  const myEntry = myIndex >= 0 ? sorted[myIndex] : null;

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
        onSubmit={doSubmit}
        submitting={submittedRef.current}
      />
    );
  }

  // ─── Ended ───────────────────────────────────────────────────────────
  if (phase === "ended") {
    return (
      <Shell dir={dir}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-6xl mb-3">🎉</div>
          <h1 className="text-3xl font-black text-stone-900">{t.endedTitle}</h1>
          {myEntry && <p className="mt-2 text-lg font-bold text-fuchsia-600">{t.yourScore}: {t.points(myEntry.score)}{myIndex >= 0 ? ` · ${t.rank(myIndex + 1)}` : ""}</p>}
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
      </Shell>
    );
  }

  // ─── Result ──────────────────────────────────────────────────────────
  if (phase === "result" && lastResult) {
    return (
      <Shell dir={dir}>
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
          <header className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg mb-2">
              <Trophy size={30} />
            </div>
            <h2 className="text-2xl font-black text-stone-900">{t.roundOver}</h2>
            <p className="mt-1 font-black text-fuchsia-600 text-lg">+{lastResult.roundPoints} · {t.yourScore} {lastResult.totalScore}</p>
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
          <div className="flex items-center justify-center gap-2 text-stone-400 font-bold text-sm">
            <Hourglass size={16} className="animate-pulse" /> {t.waitingNext}
          </div>
        </motion.div>
      </Shell>
    );
  }

  // ─── Lobby (default / between rounds before first submit) ────────────
  return (
    <Shell dir={dir}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <div className="text-6xl mb-3">{avatar || "🦊"}</div>
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
    </Shell>
  );
}

function Shell({ children, dir }: { children: React.ReactNode; dir: "ltr" | "rtl" }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50" dir={dir}>
      {children}
    </div>
  );
}
