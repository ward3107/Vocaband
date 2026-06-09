import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { wordsForLevel } from '../data/vocabulary';
import { useCustomWords } from '../hooks/useCustomWords';
import { passagesForLevel } from '../data/reading';
import { promptsForLevel } from '../data/writing';
import { generateExam, type GeneratedExam } from '../lib/examGen';
import { AiNotConfiguredError } from '../lib/wordImport';
import { BackBar, Panel, Primary } from '../components/ui';
import WordFlow from '../components/WordFlow';
import PassageCard from '../components/PassageCard';
import PromptEditor from '../components/PromptEditor';
import BagrutPaper from '../components/BagrutPaper';
import type { UnitLevel, VocabWord, ReadingPassage, WritingPrompt } from '../core/types';

// One step of an assembled mock exam.
type Stage =
  | { kind: 'vocab'; words: VocabWord[] }
  | { kind: 'reading'; passage: ReadingPassage }
  | { kind: 'writing'; prompt: WritingPrompt };

type Phase = 'build' | 'run' | 'done' | 'export';
type Source = 'bank' | 'ai';

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
  const bankPassages = useMemo(() => passagesForLevel(level), [level]);
  const bankPrompts = useMemo(() => promptsForLevel(level), [level]);

  // Where reading/writing content comes from: the official bank, or an
  // AI-written paper generated from the words (custom words prioritised).
  const [source, setSource] = useState<Source>('bank');
  const aiWordPool = useMemo(
    () => [...customWords.map((w) => w.word), ...wordsForLevel(level).map((w) => w.word)].slice(0, 24),
    [customWords, level],
  );
  const [ai, setAi] = useState<GeneratedExam | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // How many of each block. Vocab is 0/1 (the whole word-flow); reading/
  // writing are counts in bank mode, 0/1 toggles in AI mode (one paper).
  const [vocab, setVocab] = useState(1);
  const [readingN, setReadingN] = useState(1);
  const [writingN, setWritingN] = useState(1);

  const [phase, setPhase] = useState<Phase>('build');
  const [step, setStep] = useState(0);
  const [vocabScore, setVocabScore] = useState<{ known: number; total: number } | null>(null);
  const [includeKey, setIncludeKey] = useState(false);

  // A regenerated paper would be stale if the level changed underneath it.
  useEffect(() => { setAi(null); }, [level]);

  const readingMax = source === 'ai' ? 1 : bankPassages.length;
  const writingMax = source === 'ai' ? 1 : bankPrompts.length;

  // Resolve the chosen reading/writing content for the current source.
  const selPassages = useMemo<ReadingPassage[]>(
    () => (source === 'ai' ? (ai && readingN > 0 ? [ai.passage] : []) : bankPassages.slice(0, readingN)),
    [source, ai, readingN, bankPassages],
  );
  const selPrompts = useMemo<WritingPrompt[]>(
    () => (source === 'ai' ? (ai && writingN > 0 ? [ai.writing] : []) : bankPrompts.slice(0, writingN)),
    [source, ai, writingN, bankPrompts],
  );
  const selWords = vocab > 0 ? words : [];

  // Assemble the ordered exam from the selected blocks.
  const stages = useMemo<Stage[]>(() => {
    const out: Stage[] = [];
    if (selWords.length) out.push({ kind: 'vocab', words: selWords });
    selPassages.forEach((passage) => out.push({ kind: 'reading', passage }));
    selPrompts.forEach((prompt) => out.push({ kind: 'writing', prompt }));
    return out;
  }, [selWords, selPassages, selPrompts]);

  const totalPoints = useMemo(
    () =>
      stages.reduce((sum, s) => {
        if (s.kind === 'reading') return sum + s.passage.questions.reduce((a, q) => a + q.points, 0);
        if (s.kind === 'writing') return sum + s.prompt.rubric.reduce((a, c) => a + c.maxPoints, 0);
        return sum + s.words.length; // 1 pt / word in the flow
      }, 0),
    [stages],
  );

  // In AI mode, a paper must be generated before reading/writing can be used.
  const needsAi = source === 'ai' && (readingN > 0 || writingN > 0);
  const aiReady = !needsAi || ai !== null;
  const canProceed = stages.length > 0 && aiReady;

  const stageLabel = (s: Stage) =>
    s.kind === 'vocab' ? t(language, 'pillar_vocabulary')
      : s.kind === 'reading' ? t(language, 'pillar_reading')
        : t(language, 'pillar_writing');

  const generate = async () => {
    setGenBusy(true);
    setGenError(null);
    try {
      setAi(await generateExam(aiWordPool, level));
    } catch (err) {
      setGenError(t(language, err instanceof AiNotConfiguredError ? 'cw_ai_not_configured' : 'gen_error'));
    } finally {
      setGenBusy(false);
    }
  };

  const switchSource = (s: Source) => {
    setSource(s);
    setGenError(null);
    if (s === 'bank') setAi(null);
  };

  // ── Build phase ─────────────────────────────────────────────────────────
  if (phase === 'build') {
    return (
      <div>
        <BackBar onBack={onBack} title={t(language, 'build_title')} />
        <p className="mb-5 text-slate-600">{t(language, 'build_intro')}</p>

        {/* Content source: official bank vs AI-written from the words */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-slate-500">{t(language, 'src_label')}</p>
          <div className="flex gap-2 rtl-flip">
            {([['bank', '📚', 'src_bank'], ['ai', '✨', 'src_ai']] as const).map(([id, emoji, key]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchSource(id)}
                className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                  source === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-white text-slate-600 ring-1 ring-black/5'
                }`}
              >
                {emoji} {t(language, key)}
              </button>
            ))}
          </div>
        </div>

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
            emoji="📖" title={t(language, 'pillar_reading')}
            subtitle={source === 'ai'
              ? (ai ? ai.passage.title : t(language, 'ai_will_write'))
              : `${bankPassages.length} ${t(language, 'available')}`}
            gradient="from-sky-500 via-cyan-500 to-teal-500"
            count={readingN} max={readingMax} onAdd={() => setReadingN((n) => n + 1)} onRemove={() => setReadingN((n) => Math.max(0, n - 1))}
          />
          <BlockButton
            emoji="✍️" title={t(language, 'pillar_writing')}
            subtitle={source === 'ai'
              ? (ai ? ai.writing.title : t(language, 'ai_will_write'))
              : `${bankPrompts.length} ${t(language, 'available')}`}
            gradient="from-fuchsia-500 via-pink-500 to-rose-500"
            count={writingN} max={writingMax} onAdd={() => setWritingN((n) => n + 1)} onRemove={() => setWritingN((n) => Math.max(0, n - 1))}
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

        {/* AI generation control */}
        {source === 'ai' && needsAi && (
          <div className="mt-4 rounded-2xl bg-violet-50 p-4">
            <p className="text-sm text-slate-600">{t(language, 'gen_hint')}</p>
            <button
              type="button"
              onClick={generate}
              disabled={genBusy}
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-bold text-white shadow-md shadow-fuchsia-500/20 transition hover:brightness-110 disabled:opacity-50"
            >
              {genBusy ? t(language, 'gen_busy') : `✨ ${ai ? t(language, 'gen_again') : t(language, 'gen_btn')}`}
            </button>
            {ai && !genBusy && <p className="mt-2 text-sm font-semibold text-emerald-600">✓ {t(language, 'gen_done')}</p>}
            {genError && <p className="mt-2 text-sm font-semibold text-rose-600">{genError}</p>}
          </div>
        )}

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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-500">{t(language, 'total')}: {totalPoints} {t(language, 'points')}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPhase('export')}
                disabled={!canProceed}
                className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                📄 {t(language, 'export_btn')}
              </button>
              <Primary onClick={() => { setPhase('run'); setStep(0); }} disabled={!canProceed}>
                {t(language, 'buildStart')} →
              </Primary>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // ── Export phase (print / Save as PDF) ───────────────────────────────────
  if (phase === 'export') {
    return (
      <div>
        <div className="no-print">
          <BackBar onBack={() => setPhase('build')} title={t(language, 'export_title')} />
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input type="checkbox" checked={includeKey} onChange={(e) => setIncludeKey(e.target.checked)} className="h-4 w-4" />
              {t(language, 'include_key')}
            </label>
            <Primary onClick={() => window.print()}>🖨️ {t(language, 'print_btn')}</Primary>
            <span className="text-xs text-slate-400">{t(language, 'export_hint')}</span>
          </div>
        </div>

        {/* On-screen preview that mirrors the printed page. */}
        <div className="rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
          <BagrutPaper level={level} words={selWords} passages={selPassages} prompts={selPrompts} includeKey={includeKey} />
        </div>
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
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => setPhase('build')} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-200">
              ↻ {t(language, 'buildAgain')}
            </button>
            <button type="button" onClick={() => setPhase('export')} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-200">
              📄 {t(language, 'export_btn')}
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
