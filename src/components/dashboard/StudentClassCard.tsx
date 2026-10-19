import { GraduationCap, Users } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { classEntryT } from '../../locales/class-entry';

export default function StudentClassCard({
  className,
  onJoin,
  onSwitchStudent,
}: {
  className?: string;
  onJoin: () => void;
  onSwitchStudent?: () => void;
}) {
  const { language } = useLanguage();
  const t = classEntryT[language];
  return (
    <section
      className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950 sm:p-5"
      aria-label={t.homeTitle}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap size={20} aria-hidden="true" />
            {t.homeTitle}
          </p>
          {className && <h2 className="mt-1 text-2xl font-extrabold">{className}</h2>}
        </div>
        {onSwitchStudent && (
          <button
            type="button"
            onClick={onSwitchStudent}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-bold"
          >
            <Users size={18} aria-hidden="true" />
            {t.switchStudent}
          </button>
        )}
      </div>
      <p className="mt-3 text-base leading-relaxed">{t.homeHint}</p>
      <button
        type="button"
        onClick={onJoin}
        className="mt-3 min-h-12 w-full rounded-xl bg-violet-700 px-4 py-3 text-lg font-bold text-white"
      >
        {t.joinGame}
      </button>
    </section>
  );
}
