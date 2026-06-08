import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { LEVEL_PLANS, CEFR_BY_LEVEL } from '../data/curriculum';
import { BackBar, Panel } from '../components/ui';
import type { UnitLevel } from '../core/types';

const ARCHIVE_URL =
  'https://pop.education.gov.il/tchumey_daat/english/chativa-elyona/bagrut-exam/bagrut-archives/';

export default function ExamBankView({ level, onBack }: { level: UnitLevel; onBack: () => void }) {
  const { language } = useLanguage();
  const plan = LEVEL_PLANS[level];
  const cefr = CEFR_BY_LEVEL[level];

  return (
    <div>
      <BackBar onBack={onBack} title={t(language, 'pillar_exams')} />

      {/* Level overview — CEFR exit level per Curriculum 2020 */}
      <Panel className="mb-5 bg-gradient-to-br from-indigo-600 to-violet-600 text-white ring-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold">{level} {t(language, 'units')}</div>
            <div className="text-sm text-white/90">{cefr.cefr} · {cefr.name}</div>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{t(language, 'curriculum2020')}</span>
        </div>
        <p className="mt-2 text-sm text-white/80">{t(language, 'examBankIntro')}</p>
      </Panel>

      <div className="space-y-4">
        {plan.written.map(({ module, percentOfGrade }) => (
          <Panel key={module.code}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{module.name}</h3>
                <p className="text-sm text-slate-500">
                  {t(language, 'examNo')} {module.code}
                  {module.internal && <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{t(language, 'internal')}</span>}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm text-slate-500">
                <div className="font-bold text-indigo-600">{percentOfGrade}%</div>
                {module.timeMinutes && <div>{module.timeMinutes} {t(language, 'minutes')}</div>}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {module.sections.map((s) => (
                <div key={s.name} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">{s.name}</span>
                    <span className="text-sm text-slate-500">{s.percentOfModule}%</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500" dir="ltr">{s.detail}</p>
                </div>
              ))}
            </div>
            {module.notes && <p className="mt-2 text-xs italic text-slate-400" dir="ltr">{module.notes}</p>}
          </Panel>
        ))}

        {/* Oral exam */}
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">🎙️ {plan.oral.name}</h3>
              <p className="text-sm text-slate-500">{t(language, 'examNo')} {plan.oral.code}</p>
            </div>
            <div className="font-bold text-indigo-600">{plan.oral.percentOfGrade}%</div>
          </div>
        </Panel>
      </div>

      {/* Real past papers live on the official MoE archive */}
      <a
        href={ARCHIVE_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 font-bold text-white shadow-md transition hover:brightness-110"
      >
        {t(language, 'officialArchive')} ↗
      </a>
    </div>
  );
}
