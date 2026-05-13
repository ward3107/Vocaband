import { GraduationCap, UserCircle, Tv2, Printer, Zap, Sparkles, Users } from "lucide-react";
import { HelpTooltip } from "../HelpTooltip";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherDashboardT } from "../../locales/teacher/dashboard";
import type { VocaId } from "../../core/subject";

interface TeacherQuickActionsProps {
  pendingStudentsCount: number;
  onQuickPlayClick: () => void;
  onClassroomClick: () => void;
  onApprovalsClick: () => void;
  onClassShowClick?: () => void;
  onWorksheetClick?: () => void;
  onVocabagrutClick?: () => void;
  /** Pass-around single-device classroom mode.  Optional so the
   *  VocaHebrew dashboard (no Hebrew analog yet) can omit it. */
  onHotSeatClick?: () => void;
  /** Drives Hebrew-locked locale + RTL when the dashboard is showing a
   *  Hebrew class context. Defaults to "english" so existing callers
   *  keep their current behaviour. */
  subject?: VocaId;
}

export default function TeacherQuickActions({
  pendingStudentsCount,
  onQuickPlayClick, onClassroomClick, onApprovalsClick, onClassShowClick, onWorksheetClick, onVocabagrutClick, onHotSeatClick,
  subject = "english",
}: TeacherQuickActionsProps) {
  const { language } = useLanguage();
  // VocaHebrew surfaces lock to Hebrew copy + RTL regardless of the
  // teacher's UI-language pref — same rule as TeacherDashboardView.
  const isHebrew = subject === "hebrew";
  const effectiveLanguage = isHebrew ? "he" : language;
  const t = teacherDashboardT[effectiveLanguage];

  return (
    <div className="mb-8 sm:mb-10" dir={isHebrew ? "rtl" : undefined} lang={isHebrew ? "he" : undefined}>
      {/* ───────────────────────────────────────────── */}
      {/* Quick Play Hero Section — prominent, gradient  */}
      {/* ───────────────────────────────────────────── */}
      <HelpTooltip content={t.qpTooltip}>
        <button
          type="button"
          onClick={onQuickPlayClick}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className={`group relative w-full rounded-3xl p-6 sm:p-8 ${isHebrew ? "text-right" : "text-left"} overflow-hidden transition-all hover:shadow-xl active:scale-[0.99] mb-6`}
          data-tour="quick-play"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 opacity-90" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNnptMCAzYTMgMyAwIDEgMCAwLTYgMyAzIDAgMCAwIDAgNnptMC0xNWEzIDMgMCAxIDAgMC02IDMgMyAzIDAgMCAwIDAgNnoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />

          {/* Content */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Zap size={32} className="sm:w-10 sm:h-10 text-white fill-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {t.qpTitle}
                </h2>
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded-full text-xs font-bold text-white">
                  {t.qpInstantBadge}
                </span>
              </div>
              <p className="text-white/90 text-sm sm:text-base max-w-lg">
                {t.qpDescription}
              </p>
            </div>

            {/* CTA Button */}
            <div className="shrink-0 self-center sm:self-auto">
              <div className="flex items-center gap-2 px-6 py-3 bg-[var(--vb-surface)] text-violet-600 rounded-xl font-bold shadow-lg group-hover:shadow-xl group-hover:bg-white/95 transition-all">
                <span>{t.qpStartBtn}</span>
                <svg className={`w-5 h-5 ${isHebrew ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      </HelpTooltip>

      {/* ───────────────────────────────────────────── */}
      {/* For your classes — teaching tools              */}
      {/* ───────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--vb-text-muted)' }}>
          {t.forYourClassesHeading}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Class Show */}
          {onClassShowClick && (
            <HelpTooltip className="h-full" content={t.classShowTooltip}>
              <div className="h-full" data-tour="class-show">
                <CompactActionCard
                  icon={<Tv2 size={20} />}
                  iconBg="bg-fuchsia-100"
                  iconColor="text-fuchsia-600"
                  title={t.classShowTitle}
                  description={t.classShowDescription}
                  onClick={onClassShowClick}
                  isHebrew={isHebrew}
                />
              </div>
            </HelpTooltip>
          )}

          {/* Worksheet */}
          {onWorksheetClick && (
            <HelpTooltip className="h-full" content={t.worksheetTooltip}>
              <div className="h-full" data-tour="worksheet">
                <CompactActionCard
                  icon={<Printer size={20} />}
                  iconBg="bg-emerald-100"
                  iconColor="text-emerald-600"
                  title={t.worksheetTitle}
                  description={t.worksheetDescription}
                  onClick={onWorksheetClick}
                  isHebrew={isHebrew}
                />
              </div>
            </HelpTooltip>
          )}

          {/* Hot Seat — single-device pass-around mode.  English-only
              for now: HotSeatView ships with EN/HE/AR copy internally,
              but the dashboard tile is gated by !isHebrew to match the
              Vocabagrut precedent (Hebrew dashboard surfaces only the
              Hebrew-native flows).  If Hebrew teachers want the tile,
              just drop the gate. */}
          {!isHebrew && onHotSeatClick && (
            <HelpTooltip className="h-full" content={t.hotSeatTooltip}>
              <div className="h-full" data-tour="hot-seat">
                <CompactActionCard
                  icon={<Users size={20} />}
                  iconBg="bg-orange-100"
                  iconColor="text-orange-600"
                  title={t.hotSeatTitle}
                  description={t.hotSeatDescription}
                  onClick={onHotSeatClick}
                  isHebrew={isHebrew}
                />
              </div>
            </HelpTooltip>
          )}

          {/* Vocabagrut — Bagrut-style mock exam.
              English-Bagrut-specific (the Israeli English matriculation
              paper); no Hebrew analog, so the tile is suppressed entirely
              on the VocaHebrew dashboard rather than translated. */}
          {!isHebrew && onVocabagrutClick && (
            <HelpTooltip className="h-full" content={t.vocabagrutTooltip}>
              <div className="h-full" data-tour="vocabagrut">
                <CompactActionCard
                  icon={<Sparkles size={20} />}
                  iconBg="bg-violet-100"
                  iconColor="text-violet-600"
                  title={t.vocabagrutTitle}
                  description={t.vocabagrutDescription}
                  onClick={onVocabagrutClick}
                  isHebrew={isHebrew}
                />
              </div>
            </HelpTooltip>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* Management — admin tasks                       */}
      {/* ───────────────────────────────────────────── */}
      <div>
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--vb-text-muted)' }}>
          {t.managementHeading}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Classroom */}
          <HelpTooltip className="h-full" content={t.classroomTooltip}>
            <div className="h-full" data-tour="classroom">
              <CompactActionCard
                icon={<GraduationCap size={20} />}
                iconBg="bg-violet-100"
                iconColor="text-violet-600"
                title={t.classroomTitle}
                description={t.classroomDescription}
                onClick={onClassroomClick}
                isHebrew={isHebrew}
              />
            </div>
          </HelpTooltip>

          {/* Approvals */}
          <HelpTooltip className="h-full" content={t.approvalsTooltip}>
            <div className="h-full" data-tour="approvals">
              <CompactActionCard
                icon={<UserCircle size={20} />}
                iconBg={pendingStudentsCount > 0 ? "bg-rose-100" : "bg-[var(--vb-surface-alt)]"}
                iconColor={pendingStudentsCount > 0 ? "text-rose-600" : "text-[var(--vb-text-muted)]"}
                title={t.approvalsTitle}
                description={pendingStudentsCount > 0 ? t.approvalsWaiting(pendingStudentsCount) : t.approvalsNoPending}
                onClick={onApprovalsClick}
                badge={pendingStudentsCount > 0 ? pendingStudentsCount : undefined}
                isHebrew={isHebrew}
              />
            </div>
          </HelpTooltip>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CompactActionCard — smaller variant for the grid below the hero section.
   Less padding, smaller icon, no button text — just click the card.
────────────────────────────────────────────────────────────────────────────────── */
interface CompactActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  title: string;
  description: string;
  onClick: () => void;
  badge?: number;
  /** Flip chevron + use start-aligned text in RTL contexts. */
  isHebrew?: boolean;
}

const CompactActionCard: React.FC<CompactActionCardProps> = ({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  onClick,
  badge,
  isHebrew,
}) => {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: 'var(--vb-surface)',
        borderColor: 'var(--vb-border)',
      }}
      className={`group relative w-full rounded-2xl p-4 ${isHebrew ? "text-right" : "text-left"} border shadow-sm hover:shadow-md active:scale-[0.99] transition-all`}
    >
      {badge != null && badge > 0 && (
        <span className={`absolute top-3 ${isHebrew ? "left-3" : "right-3"} bg-rose-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shadow-sm`}>
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 style={{ color: 'var(--vb-text-primary)' }} className="text-sm font-bold leading-tight mb-0.5">
            {title}
          </h3>
          <p style={{ color: 'var(--vb-text-secondary)' }} className="text-xs leading-snug line-clamp-1">
            {description}
          </p>
        </div>
        <svg className={`w-4 h-4 text-[var(--vb-text-muted)] group-hover:text-[var(--vb-accent)] transition-colors shrink-0 ${isHebrew ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};
