import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { examsForLevel } from '../data/exams';
import { BackBar, Panel, LevelBadge } from '../components/ui';
import type { UnitLevel } from '../core/types';

export default function ExamBankView({ level, onBack }: { level: UnitLevel; onBack: () => void }) {
  const { language } = useLanguage();
  const exams = examsForLevel(level);

  return (
    <div>
      <BackBar onBack={onBack} title={t(language, 'pillar_exams')} />
      <div className="space-y-5">
        {exams.map((exam) => (
          <Panel key={exam.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <LevelBadge level={exam.level} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {exam.season} {exam.year}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">{exam.title}</h3>
                <p className="text-sm text-slate-500">{exam.moduleCode}</p>
              </div>
              <div className="shrink-0 text-right text-sm text-slate-500">
                <div className="font-bold text-slate-700">{exam.totalPoints} {t(language, 'points')}</div>
                <div>{exam.durationMinutes} {t(language, 'minutes')}</div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {exam.sections.map((s) => (
                <div key={s.name} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">{s.name}</span>
                    <span className="text-sm text-slate-500">{s.points} {t(language, 'points')}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{s.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              {exam.officialUrl ? (
                <a
                  href={exam.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  {t(language, 'startExam')} ↗
                </a>
              ) : (
                <span className="inline-flex items-center rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-400">
                  PDF — link coming soon
                </span>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
