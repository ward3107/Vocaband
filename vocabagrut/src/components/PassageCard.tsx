import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { Panel, LevelBadge } from './ui';
import type { ReadingPassage, ReadingQuestion } from '../core/types';

function QuestionBlock({ q }: { q: ReadingQuestion }) {
  const { language } = useLanguage();
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="border-t border-slate-100 pt-4">
      <p className="font-semibold text-slate-800">
        {q.prompt} <span className="text-sm text-slate-400">({q.points} {t(language, 'points')})</span>
      </p>

      {q.type === 'multiple-choice' && q.options ? (
        <div className="mt-3 space-y-2">
          {q.options.map((opt, idx) => {
            const isAnswer = idx === q.answerIndex;
            const chosen = picked === idx;
            const show = picked !== null;
            const cls = !show
              ? 'bg-slate-50 hover:bg-indigo-50'
              : isAnswer
                ? 'bg-emerald-100 ring-1 ring-emerald-400'
                : chosen
                  ? 'bg-rose-100 ring-1 ring-rose-300'
                  : 'bg-slate-50 opacity-70';
            return (
              <button
                key={idx}
                type="button"
                disabled={show}
                onClick={() => setPicked(idx)}
                className={`block w-full rounded-xl px-4 py-2.5 text-left transition ${cls}`}
              >
                {opt}
              </button>
            );
          })}
          {picked !== null && (
            <p className={`text-sm font-bold ${picked === q.answerIndex ? 'text-emerald-600' : 'text-rose-600'}`}>
              {picked === q.answerIndex ? t(language, 'correct') : t(language, 'incorrect')}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            rows={3}
            placeholder={t(language, 'yourAnswer')}
            dir="ltr"
            className="w-full rounded-xl border border-slate-200 p-3 text-slate-800 outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="mt-2 text-sm font-semibold text-indigo-600 hover:underline"
          >
            {t(language, 'showAnswer')}
          </button>
          {revealed && q.sampleAnswer && (
            <p className="mt-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">{q.sampleAnswer}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PassageCard({ passage }: { passage: ReadingPassage }) {
  const { language } = useLanguage();
  return (
    <Panel className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <LevelBadge level={passage.level} />
        <span className="text-xs text-slate-400">{passage.wordCount} {t(language, 'words')}</span>
      </div>
      <h3 className="text-xl font-bold text-slate-800">{passage.title}</h3>
      {passage.hotsFocus && <p className="mt-1 text-xs font-semibold text-violet-500">HOTS · {passage.hotsFocus}</p>}
      <div className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-700" dir="ltr">
        {passage.text}
      </div>
      <div className="mt-5 space-y-4">
        {passage.questions.map((q) => <QuestionBlock key={q.id} q={q} />)}
      </div>
    </Panel>
  );
}
