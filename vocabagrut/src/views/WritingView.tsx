import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { promptsForLevel } from '../data/writing';
import { gradeWriting } from '../lib/aiGrading';
import { BackBar, Panel, LevelBadge, Primary } from '../components/ui';
import type { UnitLevel, WritingPrompt, WritingFeedback } from '../core/types';

function PromptEditor({ prompt }: { prompt: WritingPrompt }) {
  const { language } = useLanguage();
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [loading, setLoading] = useState(false);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const run = async () => {
    setLoading(true);
    setFeedback(null);
    const result = await gradeWriting(prompt, text);
    setFeedback(result);
    setLoading(false);
  };

  return (
    <Panel className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <LevelBadge level={prompt.level} />
        <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold uppercase text-fuchsia-600">
          {prompt.type}
        </span>
      </div>
      <h3 className="text-xl font-bold text-slate-800">{prompt.title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700" dir="ltr">{prompt.prompt}</p>
      <p className="mt-1 text-xs text-slate-400">{prompt.minWords}–{prompt.maxWords} {t(language, 'words')}</p>

      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t(language, 'yourAnswer')}
        dir="ltr"
        className="mt-4 w-full rounded-2xl border border-slate-200 p-4 text-slate-800 outline-none focus:border-indigo-400"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-sm font-semibold ${words >= prompt.minWords && words <= prompt.maxWords ? 'text-emerald-600' : 'text-slate-400'}`}>
          {t(language, 'wordCount')}: {words}
        </span>
        <Primary onClick={run} disabled={loading || words < 10}>
          {loading ? t(language, 'grading') : t(language, 'getFeedback')}
        </Primary>
      </div>

      {feedback && (
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
          <div className="text-3xl font-extrabold text-indigo-700">
            {feedback.totalAwarded}<span className="text-lg text-indigo-400">/{feedback.totalMax}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {feedback.scores.map((s) => (
              <div key={s.criterion} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{s.criterion}</span>
                <span className="font-semibold text-slate-800">{s.awarded}/{s.max}</span>
              </div>
            ))}
          </div>
          {feedback.strengths.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-emerald-700">
              {feedback.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
            </ul>
          )}
          {feedback.improvements.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {feedback.improvements.map((s, i) => <li key={i}>→ {s}</li>)}
            </ul>
          )}
          <p className="mt-4 text-xs italic text-slate-400">{feedback.summary}</p>
        </div>
      )}
    </Panel>
  );
}

export default function WritingView({ level, onBack }: { level: UnitLevel; onBack: () => void }) {
  const { language } = useLanguage();
  const prompts = promptsForLevel(level);
  return (
    <div>
      <BackBar onBack={onBack} title={t(language, 'pillar_writing')} />
      {prompts.map((p) => <PromptEditor key={p.id} prompt={p} />)}
    </div>
  );
}
