import { Users, Plus } from "lucide-react";
import ClassCard from "../ClassCard";
import type { ClassData, AssignmentData } from "../../core/supabase";
import type { VocaId } from "../../core/subject";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherDashboardT } from "../../locales/teacher/dashboard";

interface TeacherClassesSectionProps {
  classes: ClassData[];
  teacherAssignments: AssignmentData[];
  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;
  openDropdownClassId: string | null;
  setOpenDropdownClassId: React.Dispatch<React.SetStateAction<string | null>>;
  onNewClass: () => void;
  onAssign: (c: ClassData) => void;
  onDeleteClass: (classId: string) => void;
  /** Open the rename + change-avatar modal for this class. */
  onEditClass: (c: ClassData) => void;
  /** Quick inline name change. */
  onNameChange?: (classId: string, newName: string) => Promise<void>;
  /** Quick inline avatar change. */
  onAvatarChange?: (classId: string, newAvatar: string | null) => Promise<void>;
  onEditAssignment: (assignment: AssignmentData, c: ClassData) => void;
  onDuplicateAssignment: (assignment: AssignmentData, c: ClassData) => void;
  onDeleteAssignment: (assignment: AssignmentData) => void;
  /** Project this assignment to the classroom via Class Show. */
  onProjectAssignmentToClass?: (assignment: AssignmentData) => void;
  /** Print this assignment as a worksheet. */
  onPrintAssignmentWorksheet?: (assignment: AssignmentData) => void;
  /** Kept for source-compat with the previous theme system; the
   *  component now reads colours from CSS custom properties (var(--vb-*))
   *  set by useTeacherTheme() so this prop is unused. */
  isDark?: boolean;
  /** Active Voca for this teacher's session.  When 'hebrew', the
   *  section title flips to "Hebrew classes" so a teacher with both
   *  Vocas can tell at a glance which side they're on.  Defaults to
   *  'english' for source-compat. */
  subject?: VocaId;
}

export default function TeacherClassesSection({
  classes, teacherAssignments, copiedCode, setCopiedCode,
  openDropdownClassId, setOpenDropdownClassId,
  onNewClass, onAssign, onDeleteClass, onEditClass,
  onNameChange, onAvatarChange,
  onEditAssignment, onDuplicateAssignment, onDeleteAssignment,
  onProjectAssignmentToClass, onPrintAssignmentWorksheet,
  subject = "english",
}: TeacherClassesSectionProps) {
  const { language } = useLanguage();
  const t = teacherDashboardT[language];
  const sectionTitle =
    subject === "hebrew" ? "My Hebrew classes" : "My classes";
  return (
    <div data-tour="my-classes">
      <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
        <div>
          <h2
            className="text-lg sm:text-xl font-bold flex items-center gap-2"
            style={{ color: 'var(--vb-text-primary)' }}
          >
            <Users size={18} style={{ color: 'var(--vb-text-muted)' }} />
            {sectionTitle}
          </h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--vb-text-secondary)' }}>
            {classes.length === 0
              ? t.noClassesYetSubtitle
              : t.classCount(classes.length)}
          </p>
        </div>
        <button
          data-tour="new-class"
          onClick={onNewClass}
          type="button"
          style={{
            touchAction: 'manipulation',
            backgroundColor: 'var(--vb-accent)',
            color: 'var(--vb-accent-text)',
          }}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all"
          aria-label="Create new class"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">{t.newClassFull}</span>
          <span className="sm:hidden">{t.newClassShort}</span>
        </button>
      </div>

      {classes.length === 0 ? (
        <div
          className="border border-dashed rounded-2xl py-16 px-6 text-center"
          style={{
            backgroundColor: 'var(--vb-surface)',
            borderColor: 'var(--vb-border)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--vb-surface-alt)' }}
          >
            <Users size={24} style={{ color: 'var(--vb-text-muted)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--vb-text-primary)' }}>
            No classes yet
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--vb-text-secondary)' }}>
            Create your first class to get a shareable join code.
          </p>
          <button
            onClick={onNewClass}
            type="button"
            style={{
              touchAction: 'manipulation',
              backgroundColor: 'var(--vb-accent)',
              color: 'var(--vb-accent-text)',
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={16} />
            {t.emptyCta}
          </button>
        </div>
      ) : (
        // items-start stops CSS grid's default "stretch" alignment, so
        // expanding one card's assignment list doesn't force the sibling
        // card in the same row to grow to match. Without this, clicking
        // the assignments icon on the right card leaves the left card
        // stretched with a huge empty footer — user-reported bug.
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
          {[...classes].reverse().map(c => {
            const classAssignments = teacherAssignments.filter(a => a.classId === c.id);
            return (
              <ClassCard
                key={c.id}
                subject={c.subject ?? subject}
                name={c.name}
                code={c.code}
                avatar={c.avatar}
                copiedCode={copiedCode}
                assignments={classAssignments}
                openDropdownClassId={openDropdownClassId}
                onToggleDropdown={setOpenDropdownClassId}
                onAssign={() => onAssign(c)}
                onCopyCode={() => {
                  navigator.clipboard.writeText(c.code);
                  setCopiedCode(c.code);
                  setTimeout(() => setCopiedCode(null), 2000);
                }}
                onWhatsApp={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(c.code)}`, '_blank');
                }}
                onDelete={() => onDeleteClass(c.id)}
                onEdit={() => onEditClass(c)}
                onNameChange={onNameChange ? (newName) => onNameChange(c.id, newName) : undefined}
                onAvatarChange={onAvatarChange ? (newAvatar) => onAvatarChange(c.id, newAvatar) : undefined}
                onEditAssignment={(assignment) => onEditAssignment(assignment, c)}
                onDuplicateAssignment={(assignment) => onDuplicateAssignment(assignment, c)}
                onDeleteAssignment={onDeleteAssignment}
                onProjectAssignmentToClass={onProjectAssignmentToClass}
                onPrintAssignmentWorksheet={onPrintAssignmentWorksheet}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
