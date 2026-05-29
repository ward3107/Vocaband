/**
 * CategoryRaceStudentView — the student side of a live Category Race,
 * from join to play. Owns the whole student journey so it stays simple
 * and self-contained (no shared multi-step Quick Play join flow):
 *
 *   join (name + avatar) → lobby (waiting) → focus card (answering) →
 *   result → back to lobby for the next round, until the teacher ends.
 *
 * Round state is server-pushed: the teacher starts a round, the server
 * rolls one letter with a shared deadline, the student types in the
 * full-screen focus card, and on submit / timeout the server scores the
 * answers and returns the per-cell result.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Hourglass, Trophy, Check, X, RotateCw, Crown, Loader2, ArrowRight } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import CategoryRaceFocusCard from "../components/game/CategoryRaceFocusCard";
import { CATEGORIES, categoryLabel, type CategoryMeta } from "../data/category-race-bank";
import { containsProfanity } from "../utils/nicknameProfanity";
import type { QpRaceResultPayload } from "../core/quickPlayProtocol";
import type { View } from "../core/views";

interface CategoryRaceStudentViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

type Phase = "join" | "lobby" | "answering" | "result" | "ended";

const AVATARS = ["🦊", "🐼", "🐯", "🦁", "🐵", "🐶", "🐱", "🐰", "🐨", "🐸", "🐧", "🦄"];

const STRINGS = {
  en: {
    joinTitle: "Category Race", joinSub: "Type your name and jump in!",
    namePlaceholder: "Your name", joinBtn: "Join the race", joining: "Joining…",
    pickAvatar: "Pick your look",
    nameTaken: "That name is taken — try another.", kicked: "You were removed from this game.",
    joinFailed: "Couldn't join. Check the code and try again.", badName: "Please pick a different name.",
    lobbyTitle: "You're in!", lobbySub: "Waiting for your teacher to start the race…",
    roundOver: "Round over", yourScore: "Your score", waitingNext: "Waiting for the next round…",
    endedTitle: "Race finished!", endedSub: "Thanks for playing.", backHome: "Back to home",
    points: (n: number) => `${n} pts`, rank: (n: number) => `#${n}`,
  },
  he: {
    joinTitle: "מרוץ קטגוריות", joinSub: "כתבו את השם והצטרפו!",
    namePlaceholder: "השם שלך", joinBtn: "הצטרפו למרוץ", joining: "מצטרפים…",
    pickAvatar: "בחרו דמות",
    nameTaken: "השם תפוס — נסו שם אחר.", kicked: "הוסרת מהמשחק.",
    joinFailed: "ההצטרפות נכשלה. בדקו את הקוד ונסו שוב.", badName: "בחרו שם אחר בבקשה.",
    lobbyTitle: "אתם בפנים!", lobbySub: "ממתינים שהמורה יתחיל את המרוץ…",
    roundOver: "הסבב הסתיים", yourScore: "הניקוד שלך", waitingNext: "ממתינים לסבב הבא…",
    endedTitle: "המרוץ הסתיים!", endedSub: "תודה ששיחקתם.", backHome: "חזרה לבית",
    points: (n: number) => `${n} נק'`, rank: (n: number) => `#${n}`,
  },
  ar: {
    joinTitle: "سباق الفئات", joinSub: "اكتب اسمك وانضم!",
    namePlaceholder: "اسمك", joinBtn: "انضم إلى السباق", joining: "جارٍ الانضمام…",
    pickAvatar: "اختر شخصيتك",
    nameTaken: "الاسم مأخوذ — جرّب اسمًا آخر.", kicked: "تمت إزالتك من اللعبة.",
    joinFailed: "تعذّر الانضمام. تحقق من الرمز وحاول مجددًا.", badName: "اختر اسمًا مختلفًا من فضلك.",
    lobbyTitle: "أنت في السباق!", lobbySub: "في انتظار أن يبدأ معلمك السباق…",
    roundOver: "انتهت الجولة", yourScore: "نتيجتك", waitingNext: "في انتظار الجولة التالية…",
    endedTitle: "انتهى السباق!", endedSub: "شكرًا للعب.", backHome: "العودة للرئيسية",
    points: (n: number) => `${n} نقطة`, rank: (n: number) => `#${n}`,
  },
} as const;

export default function CategoryRaceStudentView({ sessionCode, setView }: CategoryRaceStudentViewProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const {
    currentRace, leaderboard, clientId, joinedSessionCode, lastError,
    joinAsStudent, submitRaceAnswers, onRaceResult, onRaceEnded, onSessionEnded, onKicked,
  } = qp;

  const [phase, setPhase] = useState<Phase>("join");
  // Join form
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  // Round play
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [focusIndex, setFocusIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lastResult, setLastResult] = useState<QpRaceResultPayload | null>(null);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  // Real state (not just the ref) so the Submit button reflects the
  // in-flight state and re-renders the focus card with a spinner.
  const [submitting, setSubmitting] = useState(false);

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

  // ─── Join ────────────────────────────────────────────────────────────
  const handleJoin = () => {
    const trimmed = name.trim();
    if (!trimmed || joining) return;
    if (containsProfanity(trimmed)) { setJoinError(t.badName); return; }
    setJoinError(null);
    setJoining(true);
    joinAsStudent(trimmed, avatar);
  };

  // Advance to the lobby once the server confirms the join.
  useEffect(() => {
    if (joining && joinedSessionCode === sessionCode) {
      setJoining(false);
      setPhase("lobby");
    }
  }, [joining, joinedSessionCode, sessionCode]);

  // Surface a join rejection (name taken / kicked / bad payload).
  useEffect(() => {
    if (!lastError || phase !== "join") return;
    setJoining(false);
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
    submitRaceAnswers(race.roundId, answersRef.current);
  }, [submitRaceAnswers]);

  // A new round started — reset and drop into the focus card.
  useEffect(() => {
    if (phase === "join") return;
    if (currentRace && currentRace.roundId !== activeRoundId) {
      setActiveRoundId(currentRace.roundId);
      setAnswers({});
      setFocusIndex(0);
      setLastResult(null);
      submittedRef.current = false;
      setSubmitting(false);
      setPhase("answering");
    }
  }, [currentRace, activeRoundId, phase]);

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

  useEffect(() => onRaceResult((p) => {
    setSubmitting(false);
    setLastResult(p);
    setPhase("result");
  }), [onRaceResult]);

  // Server says the round closed. If we never submitted (clock skew vs.
  // the shared deadline, or the student just sat there), fire one final
  // submit so their typed answers still count within the grace window.
  // If we already submitted, fall back to the lobby so a dropped
  // RACE_RESULT packet doesn't leave the student stuck on the answer
  // card with nothing happening.
  useEffect(() => onRaceEnded(() => {
    if (submittedRef.current) {
      setSubmitting(false);
      setPhase(prev => (prev === "answering" ? "lobby" : prev));
    } else {
      doSubmit();
    }
  }), [onRaceEnded, doSubmit]);

  // Safety net: if a submit goes out but no RACE_RESULT comes back
  // (lost packet, mid-round reconnect), don't trap the student on the
  // answering screen. Drop them to the lobby — their score is already
  // recorded server-side and shows on the next leaderboard tick.
  useEffect(() => {
    if (phase !== "answering" || !submitting) return;
    const id = window.setTimeout(() => {
      setSubmitting(false);
      setPhase(prev => (prev === "answering" ? "lobby" : prev));
    }, 6000);
    return () => window.clearTimeout(id);
  }, [phase, submitting]);

  useEffect(() => onSessionEnded(() => setPhase("ended")), [onSessionEnded]);
  useEffect(() => onKicked(() => setPhase("ended")), [onKicked]);

  // Derived: this student's live rank + score from the leaderboard.
  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const myIndex = sorted.findIndex(e => e.clientId === clientId);
  const myEntry = myIndex >= 0 ? sorted[myIndex] : null;

  // ─── Join screen (large, single step) ────────────────────────────────
  if (phase === "join") {
    const canJoin = name.trim().length > 0 && !joining;
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
            onKeyDown={e => { if (e.key === "Enter") handleJoin(); }}
            placeholder={t.namePlaceholder}
            maxLength={30}
            autoComplete="off"
            dir="auto"
            className="w-full bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-fuchsia-400 outline-none px-5 py-4 text-xl font-bold text-stone-900 placeholder-stone-300 text-center transition"
          />

          <div className="mt-5">
            <div className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2 text-center">{t.pickAvatar}</div>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition ${avatar === a ? "bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-md scale-105" : "bg-stone-100 hover:bg-stone-200"}`}
                  aria-label={a}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {joinError && <p className="mt-4 text-sm font-bold text-rose-600 text-center">{joinError}</p>}

          <button
            type="button"
            onClick={handleJoin}
            disabled={!canJoin}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-lg text-white shadow-lg transition ${canJoin ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]" : "bg-stone-300 cursor-not-allowed"}`}
          >
            {joining ? <><Loader2 size={20} className="animate-spin" /> {t.joining}</> : <>{t.joinBtn} <ArrowRight size={20} className={dir === "rtl" ? "rotate-180" : ""} /></>}
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
        onSubmit={doSubmit}
        submitting={submitting}
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
        <div className="text-6xl mb-3">{avatar}</div>
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
