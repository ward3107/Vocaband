import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useLanguage, type Language } from "../hooks/useLanguage";
import { primeAudio } from "../utils/primeAudio";
import QPAvatar from "./QPAvatar";

interface Props {
  name: string;
  avatar: string;
  /** True while we're waiting on the server's JOINED reply. */
  joining?: boolean;
  /** Fires after primeAudio() unlocks iOS Safari audio. The parent
   *  is responsible for the actual STUDENT_JOIN emit + UI advance. */
  onStart: () => void;
  /** Optional — how many students have already joined this session.
   *  Renders as social-proof copy ("12 players joined") when > 0. */
  joinedCount?: number;
}

interface Copy {
  hi: string;
  ready: string;
  audioTip: string;
  silentTip: string;
  start: string;
  joining: string;
  others: (n: number) => string;
}

const COPY: Record<Language, Copy> = {
  en: {
    hi: "Hi",
    ready: "Ready to play?",
    audioTip: "Tap below to turn on sound",
    silentTip: "If you can't hear anything, turn off silent mode 🔇",
    start: "🎮 Start playing!",
    joining: "Joining the game…",
    others: (n) => n === 1 ? "1 other player is here 👋" : `${n} other players are here 👋`,
  },
  he: {
    hi: "היי",
    ready: "מוכנים לשחק?",
    audioTip: "לחצו למטה כדי להפעיל קול",
    silentTip: "אם אינכם שומעים — בטלו מצב שקט 🔇",
    start: "🎮 בואו נתחיל!",
    joining: "מצטרפים למשחק…",
    others: (n) => n === 1 ? "שחקן אחד נוסף כאן 👋" : `${n} שחקנים נוספים כאן 👋`,
  },
  ar: {
    hi: "مرحبًا",
    ready: "هل أنت مستعد للعب؟",
    audioTip: "اضغط أدناه لتشغيل الصوت",
    silentTip: "إذا لم تسمع شيئًا، أوقف الوضع الصامت 🔇",
    start: "🎮 لنبدأ!",
    joining: "ينضم إلى اللعبة…",
    others: (n) => n === 1 ? "لاعب آخر هنا 👋" : `${n} لاعبون آخرون هنا 👋`,
  },
  ru: {
    hi: "Привет",
    ready: "Готов играть?",
    audioTip: "Нажми ниже, чтобы включить звук",
    silentTip: "Не слышно? Отключите беззвучный режим 🔇",
    start: "🎮 Начать игру!",
    joining: "Подключение к игре…",
    others: (n) => n === 1 ? "1 игрок уже здесь 👋" : `Игроков здесь: ${n} 👋`,
  },
};

export default function QuickPlayGetReady({ name, avatar, joining, onStart, joinedCount = 0 }: Props) {
  const { language, dir } = useLanguage();
  const c = COPY[language] ?? COPY.en;

  const handleStart = () => {
    // The user-gesture context is ALIVE in this synchronous handler.
    // Prime audio FIRST so iOS Safari unlocks both speechSynthesis and
    // any Web Audio context Howler will lazily open. The actual join
    // emit fires next; by the time the game speaks its first word the
    // audio stack is already unlocked.
    primeAudio();
    onStart();
  };

  return (
    <div dir={dir} className="w-full max-w-md text-center py-6 sm:py-10">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="text-7xl sm:text-8xl mb-4 select-none flex items-center justify-center"
        aria-hidden
      >
        <QPAvatar value={avatar || "🦊"} iconSize={84} />
      </motion.div>

      <motion.h1
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl sm:text-3xl font-black text-on-surface mb-1"
      >
        {/* <bdi> isolates the user's nickname from the surrounding RTL
            run so the trailing "!" anchors to the visual end of the
            name, not the start. Without it, Hebrew/Arabic greetings
            render as "!ward" instead of "ward!". */}
        {c.hi}, <bdi>{name}</bdi>! 👋
      </motion.h1>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-base sm:text-lg text-on-surface-variant font-bold mb-6"
      >
        {c.ready}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-sm text-on-surface-variant font-bold mb-3"
      >
        🔊 {c.audioTip}
      </motion.p>

      <motion.button
        type="button"
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 220, damping: 18 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        disabled={joining}
        onClick={handleStart}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
        className="w-full py-4 sm:py-5 bg-gradient-to-r from-indigo-500 via-purple-600 to-fuchsia-600 text-white rounded-2xl font-black text-lg sm:text-xl shadow-xl shadow-purple-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {joining ? (
          <>
            <Loader2 className="animate-spin w-5 h-5" />
            {c.joining}
          </>
        ) : (
          c.start
        )}
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-xs text-on-surface-variant mt-4 leading-relaxed"
      >
        {c.silentTip}
      </motion.p>

      {joinedCount > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-xs text-on-surface-variant font-bold mt-3"
        >
          {c.others(joinedCount)}
        </motion.p>
      )}
    </div>
  );
}
