import { supabase, type AppUser } from "../../core/supabase";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";

interface PowerUpToolbarProps {
  user: AppUser;
  gameMode: string;
  feedback: "correct" | "wrong" | "show-answer" | null;
  options: Word[];
  hiddenOptions: number[];
  setHiddenOptions: React.Dispatch<React.SetStateAction<number[]>>;
  currentWord: Word | undefined;
  gameWordsLength: number;
  spellingInput: string;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  shuffle: <T>(arr: T[]) => T[];
}

export default function PowerUpToolbar({
  user, gameMode, feedback, options, hiddenOptions, setHiddenOptions,
  currentWord, gameWordsLength, spellingInput, setSpellingInput,
  setCurrentIndex, setUser, shuffle,
}: PowerUpToolbarProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const powerUps = user.powerUps ?? {};
  const showFiftyFifty = (gameMode === "classic" || gameMode === "listening" || gameMode === "reverse")
    && (powerUps['fifty_fifty'] ?? 0) > 0 && hiddenOptions.length === 0 && !feedback;
  const showSkip = (powerUps['skip'] ?? 0) > 0 && !feedback;
  const showHint = (gameMode === "spelling" || gameMode === "letter-sounds")
    && (powerUps['reveal_letter'] ?? 0) > 0 && !feedback && spellingInput.length === 0;

  return (
    <div className="flex justify-center gap-2 mb-3">
      {showFiftyFifty && currentWord && (
        <button
          onClick={() => {
            const wrong = options.filter(o => o.id !== currentWord.id);
            const toHide = shuffle(wrong).slice(0, 2).map(o => o.id);
            const newPowerUps = { ...powerUps, fifty_fifty: (powerUps['fifty_fifty'] ?? 1) - 1 };
            setHiddenOptions(toHide);
            setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
            // Server-side atomic decrement — the F2 trigger blocks direct
            // users.power_ups updates from authenticated callers, so this
            // MUST go through the consume_power_up RPC. Optimistic UI
            // update above stays for snappiness.
            setTimeout(() => { supabase.rpc('consume_power_up', { p_kind: 'fifty_fifty' }); }, 0);
          }}
          aria-label={t.powerUpFiftyFiftyAria}
          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1 border border-amber-200"
        >
          <span aria-hidden="true">✂️</span> {t.powerUpFiftyFifty} <span className="bg-amber-200 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps['fifty_fifty']}</span>
        </button>
      )}
      {showSkip && (
        <button
          onClick={() => {
            const newPowerUps = { ...powerUps, skip: (powerUps['skip'] ?? 1) - 1 };
            setCurrentIndex(prev => Math.min(prev + 1, gameWordsLength - 1));
            setHiddenOptions([]);
            setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
            setTimeout(() => { supabase.rpc('consume_power_up', { p_kind: 'skip' }); }, 0);
          }}
          aria-label={t.powerUpSkipAria}
          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-1 border border-blue-200"
        >
          <span aria-hidden="true">⏭️</span> {t.powerUpSkip} <span className="bg-blue-200 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps['skip']}</span>
        </button>
      )}
      {showHint && (
        <button
          onClick={() => {
            const newPowerUps = { ...powerUps, reveal_letter: (powerUps['reveal_letter'] ?? 1) - 1 };
            if (currentWord) setSpellingInput(currentWord.english[0]);
            setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
            setTimeout(() => { supabase.rpc('consume_power_up', { p_kind: 'reveal_letter' }); }, 0);
          }}
          aria-label={t.powerUpHintAria}
          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-all flex items-center gap-1 border border-green-200"
        >
          <span aria-hidden="true">💡</span> {t.powerUpHint} <span className="bg-green-200 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps['reveal_letter']}</span>
        </button>
      )}
    </div>
  );
}
