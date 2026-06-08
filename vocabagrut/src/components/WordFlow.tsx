import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { LevelBadge, FreqBadge, Primary } from './ui';
import type { VocabWord } from '../core/types';

// The "flow of words" — a continuous flip-and-self-mark flashcard stream.
// Shared by the standalone Vocabulary pillar AND the Build-Your-Bagrut
// runner so the word-learning feel is identical everywhere.
export default function WordFlow({
  words,
  onComplete,
}: {
  words: VocabWord[];
  /** Called once the learner reaches the end of the stream. */
  onComplete?: (known: number, total: number) => void;
}) {
  const { language } = useLanguage();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [finished, setFinished] = useState(false);

  const word = words[i];

  const advance = (gotIt: boolean) => {
    const nextKnown = gotIt ? known + 1 : known;
    setKnown(nextKnown);
    setFlipped(false);
    if (i + 1 >= words.length) {
      setFinished(true);
      onComplete?.(nextKnown, words.length);
    } else {
      setI((n) => n + 1);
    }
  };

  const restart = () => {
    setI(0);
    setKnown(0);
    setFlipped(false);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <div className="text-5xl">🎉</div>
        <p className="mt-3 text-xl font-bold text-slate-800">
          {t(language, 'score')}: {known} / {words.length}
        </p>
        <div className="mt-5">
          <Primary onClick={restart}>↻</Primary>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-500">
        <span>{i + 1} / {words.length}</span>
        <span>{t(language, 'score')}: {known}</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        style={{ touchAction: 'manipulation' }}
        className="grid min-h-[15rem] w-full place-items-center rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-8 text-center text-white shadow-lg shadow-fuchsia-500/20 transition active:scale-[0.99]"
      >
        {!flipped ? (
          <div>
            <div className="text-4xl font-extrabold">{word.word}</div>
            <div className="mt-2 text-sm uppercase tracking-wide text-white/80">{word.partOfSpeech}</div>
            <div className="mt-4 text-xs text-white/70">{t(language, 'flip')}</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xl font-bold">{word.he}</div>
            <div className="text-xl">{word.ar}</div>
            <div className="mt-3 text-sm text-white/90">{word.definition}</div>
            <div className="mt-2 text-sm italic text-white/80">“{word.example}”</div>
          </div>
        )}
      </button>

      <div className="mt-4 flex items-center justify-center gap-3">
        <LevelBadge level={word.level} />
        <FreqBadge freq={word.frequency} />
      </div>

      {flipped && (
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => advance(false)}
            className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-200"
          >
            {t(language, 'reviewAgain')}
          </button>
          <button
            type="button"
            onClick={() => advance(true)}
            className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white shadow-md shadow-emerald-500/20 transition hover:brightness-110"
          >
            {t(language, 'knewIt')} ✓
          </button>
        </div>
      )}
    </div>
  );
}
