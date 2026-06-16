/**
 * WheelStudentView — the student side of VocabWheel's LIVE mode. Students
 * scan the teacher's QR, pick an avatar + type a name, and that's it: the
 * wheel itself runs on the teacher's board, so this screen only registers
 * the student (their name shows up as a wheel slice) and then shows a calm
 * "you're in — watch the board" lobby.
 *
 *   join → watching → (kicked / ended → bounce to landing)
 *
 * Join / rejoin / back-trap plumbing mirrors ArenaStudentView; there's no
 * gameplay here because the teacher reads questions aloud and the student
 * answers out loud when the wheel lands on them.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import QPAvatarPicker from "../components/QPAvatarPicker";
import QPAvatar from "../components/QPAvatar";
import { primeAudio } from "../utils/primeAudio";
import { containsProfanity } from "../utils/nicknameProfanity";
import type { View } from "../core/views";

interface WheelStudentViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

type Phase = "join" | "watching" | "kicked" | "ended";

const DEFAULT_AVATAR = "🦊";
const WHEEL_GUEST_KEY = "vocaband_wheel_guest";

const STRINGS = {
  en: {
    title: "Join the wheel", subtitle: "Type your name — it'll appear on the wheel!",
    namePlaceholder: "Your name", join: "Join", joining: "Joining…",
    badName: "Please pick a friendlier name.", nameTaken: "That name is taken — try another.",
    joinFailed: "Couldn't join — check the code and try again.",
    inTitle: "You're in! 🎡", inBody: "Watch the board — when the wheel lands on your name, it's your turn!",
    ended: "The game ended. See you next time! 👋",
  },
  he: {
    title: "הצטרפו לגלגל", subtitle: "הקלידו את שמכם — הוא יופיע על הגלגל!",
    namePlaceholder: "השם שלך", join: "הצטרף", joining: "מצטרף…",
    badName: "בחרו שם נעים יותר בבקשה.", nameTaken: "השם תפוס — נסו אחר.",
    joinFailed: "לא הצלחנו להצטרף — בדקו את הקוד ונסו שוב.",
    inTitle: "אתם בפנים! 🎡", inBody: "צפו בלוח — כשהגלגל נוחת על שמכם, זה תורכם!",
    ended: "המשחק הסתיים. נתראה בפעם הבאה! 👋",
  },
  ar: {
    title: "انضم إلى العجلة", subtitle: "اكتب اسمك — سيظهر على العجلة!",
    namePlaceholder: "اسمك", join: "انضمام", joining: "جارٍ الانضمام…",
    badName: "اختر اسمًا ألطف من فضلك.", nameTaken: "الاسم مأخوذ — جرّب اسمًا آخر.",
    joinFailed: "تعذّر الانضمام — تحقق من الرمز وحاول مجددًا.",
    inTitle: "أنت في اللعبة! 🎡", inBody: "راقب اللوحة — عندما تقف العجلة على اسمك، حان دورك!",
    ended: "انتهت اللعبة. إلى اللقاء! 👋",
  },
} as const;

export default function WheelStudentView({ sessionCode, setView }: WheelStudentViewProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const { joinedSessionCode, lastError, joinAsStudent, onKicked, onSessionEnded } = qp;

  const [phase, setPhase] = useState<Phase>("join");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const forget = useCallback(() => {
    try { sessionStorage.removeItem(WHEEL_GUEST_KEY); } catch { /* storage unavailable */ }
    try { window.history.replaceState({}, "", window.location.pathname); } catch { /* history unavailable */ }
  }, []);

  // Phone back-button trap (mirrors the other live student views).
  useEffect(() => {
    window.history.pushState({ view: "wheel-student" }, "");
    const handler = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      window.history.pushState({ view: "wheel-student" }, "");
    };
    window.addEventListener("popstate", handler, { capture: true });
    return () => window.removeEventListener("popstate", handler, { capture: true });
  }, []);

  const handleJoin = () => {
    if (joining) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (containsProfanity(trimmed)) { setJoinError(t.badName); return; }
    setJoinError(null);
    primeAudio();
    setJoining(true);
    joinAsStudent(trimmed, avatar);
  };

  // Join confirmed → watching.
  useEffect(() => {
    if (joining && joinedSessionCode === sessionCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- socket join confirmation; matches the other live student views
      setJoining(false);
      setPhase("watching");
      try {
        sessionStorage.setItem(WHEEL_GUEST_KEY, JSON.stringify({ sessionCode, name: name.trim(), avatar }));
      } catch { /* storage unavailable */ }
    }
  }, [joining, joinedSessionCode, sessionCode, name, avatar]);

  // Auto-rejoin after a refresh.
  const autoRejoinedRef = useRef(false);
  useEffect(() => {
    if (autoRejoinedRef.current) return;
    autoRejoinedRef.current = true;
    try {
      const saved = sessionStorage.getItem(WHEEL_GUEST_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { sessionCode?: string; name?: string; avatar?: string };
      if (parsed.sessionCode !== sessionCode || !parsed.name) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot replay of a saved join on refresh
      setName(parsed.name);
      setAvatar(parsed.avatar || DEFAULT_AVATAR);
      setJoining(true);
      joinAsStudent(parsed.name, parsed.avatar || DEFAULT_AVATAR);
    } catch { /* storage unavailable / bad JSON */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount; joinAsStudent is stable for this session
  }, [sessionCode]);

  // Surface a join rejection.
  useEffect(() => {
    if (!lastError || phase !== "join") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to a socket error payload
    setJoining(false);
    setJoinError(lastError.code === "nickname_taken" ? t.nameTaken : t.joinFailed);
  }, [lastError, phase, t]);

  // Teacher kicked me / ended the session → bounce to landing.
  useEffect(() => onKicked(() => { setPhase("kicked"); forget(); setView("public-landing"); }), [onKicked, forget, setView]);
  useEffect(() => onSessionEnded(() => { setPhase("ended"); forget(); }), [onSessionEnded, forget]);

  if (phase === "ended" || phase === "kicked") {
    return (
      <div dir={dir} className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
        <Sparkles size={48} />
        <p className="text-2xl font-black">{t.ended}</p>
      </div>
    );
  }

  if (phase === "watching") {
    return (
      <div dir={dir} className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 px-6 text-center bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="flex items-center justify-center w-32 h-32 rounded-full bg-white shadow-2xl">
          <QPAvatar value={avatar} iconSize={72} className="text-violet-600" />
        </motion.div>
        <h1 className="text-3xl font-black">{t.inTitle}</h1>
        <p className="text-lg font-bold text-white/85 max-w-sm">{name}</p>
        <p className="text-base font-medium text-white/80 max-w-sm">{t.inBody}</p>
        <motion.div className="flex gap-2 mt-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-3 w-3 rounded-full bg-white/70"
              animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }} />
          ))}
        </motion.div>
      </div>
    );
  }

  // join screen
  return (
    <div dir={dir} className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 px-6 py-10 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
        <div className="text-5xl mb-2">🎡</div>
        <h1 className="text-2xl font-black text-stone-800">{t.title}</h1>
        <p className="text-sm font-medium text-stone-500 mb-5">{t.subtitle}</p>

        <QPAvatarPicker selected={avatar} onSelect={setAvatar} />

        <input
          type="text"
          value={name}
          maxLength={20}
          placeholder={t.namePlaceholder}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
          dir="auto"
          className="mt-4 w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-lg font-bold text-center"
        />

        {joinError && <p className="mt-2 text-sm font-bold text-rose-600">{joinError}</p>}

        <button
          type="button"
          onClick={handleJoin}
          disabled={joining || !name.trim()}
          style={{ touchAction: "manipulation" }}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-lg text-white shadow-lg transition active:scale-[0.98] ${
            joining || !name.trim() ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-violet-500 to-fuchsia-600 shadow-violet-500/30"
          }`}
        >
          {joining ? <><Loader2 size={20} className="animate-spin" /> {t.joining}</> : <><ArrowRight size={20} /> {t.join}</>}
        </button>
      </div>
    </div>
  );
}
