import type React from "react";
import { Plus, Sparkles } from "lucide-react";
import ClassCard from "../ClassCard";
import type { ClassData, AssignmentData, CompetitionData } from "../../core/supabase";
import { teacherDashboardT } from "../../locales/teacher/dashboard";
import type { Language } from "../../hooks/useLanguage";
import LiveGameHero from "./LiveGameHero";
import MgmtCard from "./MgmtCard";
import FrostedEmoji from "./FrostedEmoji";
import { accentForClass, HERO_AURORA } from "./dashboardAccents";

// Shared "Live games" hero styling — both cards use the identical
// LiveGameHero layout and differ only in colour + copy.
const QP_HERO = {
  background: HERO_AURORA,
  boxShadow: "0 20px 50px -22px rgba(99,102,241,0.55), 0 8px 22px -10px rgba(217,70,239,0.35)",
  accent: "#5B21B6",
  ctaShadow: "0 10px 24px -8px rgba(91,33,182,0.45)",
} as const;
const RACE_HERO = {
  background: "radial-gradient(120% 140% at 0% 0%, #D946EF 0%, #EC4899 45%, #F43F5E 80%, #FB7185 100%)",
  boxShadow: "0 20px 50px -22px rgba(217,70,239,0.5), 0 8px 22px -10px rgba(244,63,94,0.35)",
  accent: "#9D174D",
  ctaShadow: "0 10px 24px -8px rgba(157,23,77,0.45)",
} as const;
const SPEED_HERO = {
  background: "radial-gradient(120% 140% at 0% 0%, #F59E0B 0%, #F97316 45%, #EF4444 80%, #F43F5E 100%)",
  boxShadow: "0 20px 50px -22px rgba(249,115,22,0.5), 0 8px 22px -10px rgba(239,68,68,0.35)",
  accent: "#9A3412",
  ctaShadow: "0 10px 24px -8px rgba(154,52,18,0.45)",
} as const;

// Strings for the "Live games" pairing (Quick Play hero + Category
// Race card). Kept inline so this layout doesn't have to thread new
// keys through the shared teacher-dashboard locale.
const LIVE_GAMES_STRINGS = {
  en: { liveGames: "Live games", live: "Live", raceTitle: "Category Race", raceDescription: "Pick a letter, race the class to fill the categories.", raceStart: "Start", speedTitle: "Speed Round", speedDescription: "Drop one word on the class — fastest correct answer wins." },
  he: { liveGames: "משחקים חיים", live: "חי", raceTitle: "מרוץ קטגוריות", raceDescription: "אות אחת — כל הכיתה מתחרה למלא את הקטגוריות.", raceStart: "התחל", speedTitle: "סבב מהיר", speedDescription: "מילה אחת לכל הכיתה — התשובה הנכונה המהירה מנצחת." },
  ar: { liveGames: "ألعاب مباشرة", live: "مباشر", raceTitle: "سباق الفئات", raceDescription: "حرف واحد — يتسابق الصف لملء الفئات.", raceStart: "ابدأ", speedTitle: "جولة سريعة", speedDescription: "كلمة واحدة للصف — الإجابة الصحيحة الأسرع تفوز." },
} as const;

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
  /** True when a dark teacher theme (Midnight / Graphite) is active.
   *  The pastel class cards are a light-mode flourish — on dark themes
   *  we render the theme-token-driven `classic` ClassCard instead so
   *  the cards stay readable and cohesive with the dark surface. */
  isDark?: boolean;

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
  onCategoryRaceClick: () => void;
  onSpeedRoundClick: () => void;
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
  isDark = false,
  classes,
  teacherAssignments,
  competitionsByAssignment,
  pendingStudentsCount,
  copiedCode,
  setCopiedCode,
  openDropdownClassId,
  setOpenDropdownClassId,
  onQuickPlayClick,
  onCategoryRaceClick,
  onSpeedRoundClick,
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
  const rt = LIVE_GAMES_STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  const hasClasses = classes.length > 0;

  return (
    <div>
      {/* Network diagnostic button lives outside this layout (set by
          the parent view) so this component stays focused on the
          three big blocks below. */}

      {/* ─── Live games ─── Quick Play + Category Race, paired so the
          two live, join-by-code experiences sit together (separate from
          the Management utilities below). */}
      <section>
        <SectionLabel>{rt.liveGames}</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
          <LiveGameHero
            emoji="⚡"
            title={t.qpTitle}
            badge={t.qpInstantBadge}
            description={t.qpDescription}
            ctaLabel={t.qpStartBtn}
            onStart={onQuickPlayClick}
            isRTL={isRTL}
            dataTour="quick-play"
            {...QP_HERO}
          />
          <LiveGameHero
            emoji="🌍"
            title={rt.raceTitle}
            badge={rt.live}
            description={rt.raceDescription}
            ctaLabel={rt.raceStart}
            onStart={onCategoryRaceClick}
            isRTL={isRTL}
            dataTour="category-race"
            {...RACE_HERO}
          />
          <LiveGameHero
            emoji="⚡"
            title={rt.speedTitle}
            badge={rt.live}
            description={rt.speedDescription}
            ctaLabel={rt.raceStart}
            onStart={onSpeedRoundClick}
            isRTL={isRTL}
            dataTour="speed-round"
            {...SPEED_HERO}
          />
        </div>
      </section>

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
                background: "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
                color: "var(--vb-accent-text)",
                boxShadow: "0 12px 26px -10px color-mix(in srgb, var(--vb-accent), transparent 45%)",
              }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold active:scale-95 transition-transform"
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
        ) : (() => {
          // The "most recent" class is the one with the most-recently
          // created assignment.  Ties (or no assignments anywhere)
          // fall back to the most-recently-created class id — which is
          // just `classes[classes.length - 1]` because the array is
          // chronological and we reverse it for display.  Computed
          // once per render rather than inline so a class with zero
          // assignments doesn't trigger N empty Math.max calls.
          const lastCreatedClassId = classes[classes.length - 1]?.id ?? null;
          let recentClassId: string | null = null;
          let recentTimestamp = -Infinity;
          for (const a of teacherAssignments) {
            const ts = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            if (ts > recentTimestamp) {
              recentTimestamp = ts;
              recentClassId = a.classId;
            }
          }
          if (!recentClassId) recentClassId = lastCreatedClassId;
          return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
            {[...classes].reverse().map(c => {
              const classAssignments = teacherAssignments.filter(a => a.classId === c.id);
              return (
                <ClassCard
                  key={c.id}
                  variant={isDark ? "classic" : "pastel"}
                  accent={accentForClass(c.id)}
                  isRecent={c.id === recentClassId}
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
          );
        })()}
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-3.5 flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em]"
      style={{ color: "var(--vb-accent)" }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--vb-accent)" }}
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
        background: "var(--vb-accent-soft)",
        border: "1.5px dashed color-mix(in srgb, var(--vb-accent), transparent 60%)",
      }}
    >
      <FrostedEmoji emoji="✨" size={72} tone="gradient" />
      <div className="text-[22px] font-extrabold tracking-[-0.01em]" style={{ color: "var(--vb-text-primary)" }}>
        {title}
      </div>
      <div className="max-w-[360px] text-sm leading-[1.4]" style={{ color: "var(--vb-text-secondary)" }}>
        {sub}
      </div>
      <button
        type="button"
        onClick={onCreate}
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          background: "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
          color: "var(--vb-accent-text)",
          boxShadow: "0 14px 30px -12px color-mix(in srgb, var(--vb-accent), transparent 45%)",
        }}
        className="mt-1.5 inline-flex items-center gap-2 rounded-full px-[22px] py-[14px] text-[15px] font-bold active:scale-95 transition-transform"
      >
        <Sparkles size={16} />
        {cta}
      </button>
    </div>
  );
}
