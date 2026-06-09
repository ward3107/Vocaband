import { useMemo, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { wordsForLevel } from '../data/vocabulary';
import { useCustomWords } from '../hooks/useCustomWords';
import { passagesForLevel } from '../data/reading';
import { promptsForLevel } from '../data/writing';
import { BackBar, Panel, Primary } from '../components/ui';
import WordFlow from '../components/WordFlow';
import PassageCard from '../components/PassageCard';
import PromptEditor from '../components/PromptEditor';
import type { UnitLevel, VocabWord, ReadingPassage, WritingPrompt } from '../core/types';

// One step of an assembled mock exam.
type Stage =
  | { kind: 'vocab'; words: VocabWord[] }
  | { kind: 'reading'; passage: ReadingPassage }
  | { kind: 'writing'; prompt: WritingPrompt };

type Phase = 'build' | 'run' | 'done';

// A clickable block the student adds to their Bagrut.
function BlockButton({
  emoji,
  title,
  subtitle,
  gradient,
  count,
  max,
  onAdd,
  onRemove,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  gradient: string;
  count: number;
  max: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const active = count > 0;
  return (
    <div className={`rounded-3xl p-5 text-white shadow-lg transition ${active ? `bg-gradient-to-br ${gradient}` : 'bg-slate-300'}`}>
      <div className="flex items-center gap-4 rtl-flip">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm">{emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold">{title}</div>
          <div className="text-sm text-white/90">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRemove}
            disabled={count === 0}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/25 text-xl font-bold transition hover:bg-white/40 disabled:opacity-40"
            aria-label="remove"
          >−</button>
          <span className="w-6 text-center text-lg font-extrabold tabular-nums">{count}</span>
          <button
            type="button"
            onClick={onAdd}
            disabled={count >= max}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/25 text-xl font-bold transition hover:bg-white/40 disabled:opacity-40"
            aria-label="add"
          >+</button>
        </div>
      </div>
    </div>
  );
}

export default function BuildBagrutView({
  level,
  onBack,
  onManageWords,
}: {
  level: UnitLevel;
  onBack: () => void;
  onManageWords: () => void;
}) {
  const { language } = useLanguage();
  const { words: customWords } = useCustomWords();

  // Curriculum words for the level + the student's own custom words.
  const words = useMemo(() => [...wordsForLevel(level), ...customWords], [level, customWords]);
  const passages = useMemo(() => passagesForLevel(level), [level]);
  const prompts = useMemo(() => promptsForLevel(level), [level]);

  // How many of each block the student has clicked in. Vocab is 0/1
  // (the whole word-flow), reading/writing are counts.
  const [vocab, setVocab] = useState(1);
  const [readingN, setReadingN] = useState(1);
  const [writingN, setWritingN] = useState(1);

  const [phase, setPhase] = useState<Phase>('build');
  const [step, setStep] = useState(0);
  const [vocabScore, setVocabScore] = useState<{ known: number; total: number } | null>(null);

  // Assemble the ordered exam from the selected blocks.
  const stages = useMemo<Stage[]>(() => {
    const out: Stage[] = [];
    if (vocab > 0 && words.length) out.push({ kind: 'vocab', words });
    passages.slice(0, readingN).forEach((passage) => out.push({ kind: 'reading', passage }));
    prompts.slice(0, writingN).forEach((prompt) => out.push({ kind: 'writing', prompt }));
    return out;
  }, [vocab, words, passages, readingN, prompts, writingN]);

  const totalPoints = useMemo(
    () =>
      stages.reduce((sum, s) => {
        if (s.kind === 'reading') return sum + s.passage.questions.reduce((a, q) => a + q.points, 0);
        if (s.kind === 'writing') return sum + s.prompt.rubric.reduce((a, c) => a + c.maxPoints, 0);
        return sum + s.words.length; // 1 pt / word in the flow
      }, 0),
    [stages],
  );

  const stageLabel = (s: Stage) =>
    s.kind === 'vocab' ? t(language, 'pillar_vocabulary')
      : s.kind === 'reading' ? t(language, 'pillar_reading')
        : t(language, 'pillar_writing');

  // ── Build phase ─────────────────────────────────────────────────────────
  if (phase === 'build') {
    return (
      <div>
        <BackBar onBack={onBack} title={t(language, 'build_title')} />
        <p className="mb-5 text-slate-600">{t(language, 'build_intro')}</p>

        <div className="space-y-3">
          <BlockButton
            emoji="📚" title={t(language, 'pillar_vocabulary')}
            subtitle={
              `${words.length} ${t(language, 'words')}` +
              (customWords.length ? ` · +${customWords.length} ${t(language, 'cw_yourWordsShort')}` : ` · ${t(language, 'wordFlow')}`)
            }
            gradient="from-indigo-500 via-violet-500 to-fuchsia-500"
            count={vocab} max={1} onAdd={() => setVocab(1)} onRemove={() => setVocab(0)}
          />
          <BlockButton
            emoji="📖" title={t(language, 'pillar_reading')} subtitle={`${passages.length} ${t(language, 'available')}`}
            gradient="from-sky-500 via-cyan-500 to-teal-500"
            count={readingN} max={passages.length} onAdd={() => setReadingN((n) => n + 1)} onRemove={() => setReadingN((n) => Math.max(0, n - 1))}
          />
          <BlockButton
            emoji="✍️" title={t(language, 'pillar_writing')} subtitle={`${prompts.length} ${t(language, 'available')}`}
            gradient="from-fuchsia-500 via-pink-500 to-rose-500"
            count={writingN} max={prompts.length} onAdd={() => setWritingN((n) => n + 1)} onRemove={() => setWritingN((n) => Math.max(0, n - 1))}
          />
        </div>

        {/* Bring your own words into the vocabulary block */}
        <button
          type="button"
          onClick={onManageWords}
          className="mt-3 w-full rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-3 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50"
        >
          ➕ {t(language, 'cw_addYourOwn')}
        </button>

        {/* Live preview of the assembled Bagrut */}
        <Panel className="mt-6">
          <h3 className="text-lg font-bold text-slate-800">{t(language, 'yourBagrut')}</h3>
          {stages.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{t(language, 'addBlocks')}</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {stages.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white">{i + 1}</span>
                  <span className="font-semibold text-slate-700">{stageLabel(s)}</span>
                  <span className="ms-auto text-sm text-slate-400">
                    {s.kind === 'vocab' && `${s.words.length} ${t(language, 'words')}`}
                    {s.kind === 'reading' && s.passage.title}
                    {s.kind === 'writing' && s.prompt.title}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">{t(language, 'total')}: {totalPoints} {t(language, 'points')}</span>
            <Primary onClick={() => { setPhase('run'); setStep(0); }} disabled={stages.length === 0}>
              {t(language, 'buildStart')} →
            </Primary>
          </div>
        </Panel>
      </div>
    );
  }

  // ── Done phase ──────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div>
        <BackBar onBack={onBack} title={t(language, 'build_title')} />
        <Panel className="text-center">
          <div className="text-6xl">🏆</div>
          <h3 className="mt-3 text-2xl font-extrabold text-slate-800">{t(language, 'build_done')}</h3>
          <p className="mt-2 text-slate-600">{stages.length} {t(language, 'sectionsCompleted')}</p>
          {vocabScore && (
            <p className="mt-1 font-semibold text-indigo-600">
              {t(language, 'pillar_vocabulary')}: {vocabScore.known}/{vocabScore.total}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => setPhase('build')} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-200">
              ↻ {t(language, 'buildAgain')}
            </button>
            <Primary onClick={onBack}>🏠</Primary>
          </div>
        </Panel>
      </div>
    );
  }

  // ── Run phase ───────────────────────────────────────────────────────────
  const current = stages[step];
  const last = step >= stages.length - 1;
  const next = () => (last ? setPhase('done') : setStep((s) => s + 1));

  return (
    <div>
      <BackBar onBack={() => setPhase('build')} title={t(language, 'build_title')} />

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm font-semibold text-slate-500">
          <span>{t(language, 'section')} {step + 1} / {stages.length} · {stageLabel(current)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${((step + 1) / stages.length) * 100}%` }} />
        </div>
      </div>

      {current.kind === 'vocab' && (
        <WordFlow words={current.words} onComplete={(known, total) => setVocabScore({ known, total })} />
      )}
      {current.kind === 'reading' && <PassageCard passage={current.passage} />}
      {current.kind === 'writing' && <PromptEditor prompt={current.prompt} />}

      <div className="mt-6 flex justify-end">
        <Primary onClick={next}>
          {last ? `${t(language, 'finish')} 🏁` : `${t(language, 'next')} →`}
        </Primary>
      </div>
    </div>
  );
}
