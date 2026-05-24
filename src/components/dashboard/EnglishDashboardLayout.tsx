import { Plus, Sparkles } from "lucide-react";
import ClassCard from "../ClassCard";
import type { ClassData, AssignmentData, CompetitionData } from "../../core/supabase";
import { teacherDashboardT } from "../../locales/teacher/dashboard";
import type { Language } from "../../hooks/useLanguage";
import AuroraQuickPlayHero from "./AuroraQuickPlayHero";
import MgmtCard from "./MgmtCard";
import FrostedEmoji from "./FrostedEmoji";
import { accentForClass, BRAND_GRADIENT } from "./dashboardAccents";

// Mirrors the WhatsApp share text the legacy section produced — the
// link goes to STUDENTS, so it stays in English here (English Voca).
function buildWhatsAppShareText(code: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.vocaband.com";
  const url = `${origin}/student?class=${encodeURIComponent(code)}`;
  return `Join my class on Vocaband 🎓\n${url}\n(class code: ${code})`;
}

interface EnglishDashboardLayoutProps {
  language: Language;
  isRTL: boolean;

  classes: ClassData[];
  teacherAssignments: AssignmentData[];
  competitionsByAssignment?: Map<string, CompetitionData>;

  pendingStudentsCount: number;

  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;
  openDropdownClassId: string | null;
  setOpenDropdownClassId: React.Dispatch<React.SetStateAction<string | null>>;

  // Top-level dashboard actions
  onQuickPlayClick: () => void;
  onClassroomClick: () => void;
  onApprovalsClick: () => void;
  onWorksheetResultsClick?: () => void;
  onLibraryClick?: () => void;

  // Class-section handlers
  onNewClass: () => void;
  onAssignClass: (c: ClassData) => void;
  onDeleteClass: (classId: string) => void;
  onEditClass: (c: ClassData) => void;
  onOpenRoster?: (c: ClassData) => void;
  onNameChange?: (classId: string, newName: string) => Promise<void>;
  onAvatarChange?: (classId: string, newAvatar: string | null) => Promise<void>;
  onEditAssignment: (a: AssignmentData, c: ClassData) => void;
  onDuplicateAssignment: (a: AssignmentData, c: ClassData) => void;
  onDeleteAssignment: (a: AssignmentData) => void;
  onProjectAssignmentToClass?: (a: AssignmentData) => void;
  onPrintAssignmentWorksheet?: (a: AssignmentData) => void;
}

/**
 * Redesigned English teacher dashboard layout.  Composes the Aurora
 * Quick Play hero, the white-card management grid, and the pastel
 * class-card section.  Owns no data — every callback is forwarded
 * straight through to TeacherDashboardView.
 *
 * This layout is rendered only when `subject === 'english'`.  The
 * VocaHebrew dashboard still uses TeacherQuickActions +
 * TeacherClassesSection so its UX stays untouched.
 */
export default function EnglishDashboardLayout({
  language,
  isRTL,
  classes,
  teacherAssignments,
  competitionsByAssignment,
  pendingStudentsCount,
  copiedCode,
  setCopiedCode,
  openDropdownClassId,
  setOpenDropdownClassId,
  onQuickPlayClick,
  onClassroomClick,
  onApprovalsClick,
  onWorksheetResultsClick,
  onLibraryClick,
  onNewClass,
  onAssignClass,
  onDeleteClass,
  onEditClass,
  onOpenRoster,
  onNameChange,
  onAvatarChange,
  onEditAssignment,
  onDuplicateAssignment,
  onDeleteAssignment,
  onProjectAssignmentToClass,
  onPrintAssignmentWorksheet,
}: EnglishDashboardLayoutProps) {
  const t = teacherDashboardT[language];
  const hasClasses = classes.length > 0;

  return (
    <div>
      {/* Network diagnostic button lives outside this layout (set by
          the parent view) so this component stays focused on the
          three big blocks below. */}

      <AuroraQuickPlayHero
        title={t.qpTitle}
        instantBadge={t.qpInstantBadge}
        description={t.qpDescription}
        ctaLabel={t.qpStartBtn}
        onStart={onQuickPlayClick}
        isRTL={isRTL}
      />

      {/* ─── Management ─── */}
      <section className="mt-7 sm:mt-9">
        <SectionLabel>{t.managementHeading}</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-[14px]">
          <MgmtCard
            emoji="🎓"
            title={t.classroomTitle}
            sub={t.classroomDescription}
            onClick={onClassroomClick}
            isRTL={isRTL}
            tour="classroom"
          />
          {onWorksheetResultsClick && (
            <MgmtCard
              emoji="📋"
              title={t.worksheetResultsTitle}
              sub={t.worksheetResultsDescription}
              onClick={onWorksheetResultsClick}
              isRTL={isRTL}
              tour="worksheet-results"
            />
          )}
          {onLibraryClick && (
            <MgmtCard
              emoji="📚"
              title={t.libraryTitle}
              sub={t.libraryDescription}
              onClick={onLibraryClick}
              isRTL={isRTL}
              tour="vocabulary-library"
            />
          )}
          {pendingStudentsCount > 0 && (
            <MgmtCard
              emoji="🙋"
              title={t.approvalsTitle}
              sub={t.approvalsWaiting(pendingStudentsCount)}
              onClick={onApprovalsClick}
              badge={pendingStudentsCount}
              isRTL={isRTL}
              tour="approvals"
            />
          )}
        </div>
      </section>

      {/* ─── My classes ─── */}
      <section className="mt-7 sm:mt-9" data-tour="my-classes">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionLabel>{t.myClassesHeading}</SectionLabel>
            <div
              className="flex items-baseline gap-2.5 font-extrabold leading-none tracking-[-0.02em] text-2xl sm:text-[28px]"
              style={{ color: "var(--vb-text-primary)" }}
            >
              {t.myClassesHeading}
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--vb-text-muted)" }}
              >
                {t.classCount(classes.length)}
              </span>
            </div>
          </div>

          {hasClasses && (
            <button
              type="button"
              onClick={onNewClass}
              data-tour="new-class"
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                background: BRAND_GRADIENT,
                boxShadow: "0 12px 26px -10px rgba(139,92,246,0.55)",
              }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white active:scale-95 transition-transform"
              aria-label={t.newClassAria}
            >
              <Plus size={16} />
              {t.newClassFull}
            </button>
          )}
        </div>

        {!hasClasses ? (
          <EmptyState
            title={t.emptyTitle}
            sub={t.emptySubtitle}
            cta={t.emptyCta}
            onCreate={onNewClass}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
            {[...classes].reverse().map(c => {
              const classAssignments = teacherAssignments.filter(a => a.classId === c.id);
              return (
                <ClassCard
                  key={c.id}
                  variant="pastel"
                  accent={accentForClass(c.id)}
                  subject={c.subject ?? "english"}
                  name={c.name}
                  code={c.code}
                  avatar={c.avatar}
                  schoolName={c.schoolName}
                  schoolLogoUrl={c.schoolLogoUrl}
                  backgroundColor={c.backgroundColor}
                  copiedCode={copiedCode}
                  assignments={classAssignments}
                  openDropdownClassId={openDropdownClassId}
                  onToggleDropdown={setOpenDropdownClassId}
                  onAssign={() => onAssignClass(c)}
                  onCopyCode={() => {
                    navigator.clipboard.writeText(c.code);
                    setCopiedCode(c.code);
                    setTimeout(() => setCopiedCode(null), 2000);
                  }}
                  onWhatsApp={() => {
                    const text = buildWhatsAppShareText(c.code);
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  onDelete={() => onDeleteClass(c.id)}
                  onEdit={() => onEditClass(c)}
                  onOpenRoster={onOpenRoster ? () => onOpenRoster(c) : undefined}
                  onNameChange={onNameChange ? (newName) => onNameChange(c.id, newName) : undefined}
                  onAvatarChange={onAvatarChange ? (newAvatar) => onAvatarChange(c.id, newAvatar) : undefined}
                  onEditAssignment={(a) => onEditAssignment(a, c)}
                  onDuplicateAssignment={(a) => onDuplicateAssignment(a, c)}
                  onDeleteAssignment={onDeleteAssignment}
                  onProjectAssignmentToClass={onProjectAssignmentToClass}
                  onPrintAssignmentWorksheet={onPrintAssignmentWorksheet}
                  competitionsByAssignment={competitionsByAssignment}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8B5CF6]">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}
      />
      {children}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  sub: string;
  cta: string;
  onCreate: () => void;
}

function EmptyState({ title, sub, cta, onCreate }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center gap-[14px] rounded-[28px] px-7 py-9 text-center"
      style={{
        background: "linear-gradient(135deg, #F3EBFF 0%, #FDE8FF 100%)",
        border: "1.5px dashed rgba(139,92,246,0.35)",
      }}
    >
      <FrostedEmoji emoji="✨" size={72} tone="gradient" />
      <div className="text-[22px] font-extrabold tracking-[-0.01em] text-[#2A1B5C]">
        {title}
      </div>
      <div className="max-w-[360px] text-sm leading-[1.4] text-[#6B6388]">
        {sub}
      </div>
      <button
        type="button"
        onClick={onCreate}
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          background: BRAND_GRADIENT,
          boxShadow: "0 14px 30px -12px rgba(139,92,246,0.55)",
        }}
        className="mt-1.5 inline-flex items-center gap-2 rounded-full px-[22px] py-[14px] text-[15px] font-bold text-white active:scale-95 transition-transform"
      >
        <Sparkles size={16} />
        {cta}
      </button>
    </div>
  );
}
