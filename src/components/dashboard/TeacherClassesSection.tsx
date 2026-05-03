import { Users, Plus } from "lucide-react";
import ClassCard from "../ClassCard";
import type { ClassData, AssignmentData } from "../../core/supabase";
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
  /** When true (Midnight dashboard theme), the heading + sub-text on
   *  the page background flip to lighter colours so they don't
   *  disappear against the slate-900 gradient. */
  isDark?: boolean;
}

export default function TeacherClassesSection({
  classes, teacherAssignments, copiedCode, setCopiedCode,
  openDropdownClassId, setOpenDropdownClassId,
  onNewClass, onAssign, onDeleteClass, onEditClass,
  onNameChange, onAvatarChange,
  onEditAssignment, onDuplicateAssignment, onDeleteAssignment,
  isDark = false,
}: TeacherClassesSectionProps) {
  const { language } = useLanguage();
  const t = teacherDashboardT[language];
  return (
    <div data-tour="my-classes">
      <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
        <div>
          <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${isDark ? 'text-stone-50' : 'text-stone-900'}`}>
            <Users size={18} className={isDark ? 'text-stone-300' : 'text-stone-400'} />
            {t.myClassesHeading}
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-stone-300' : 'text-stone-500'}`}>
            {classes.length === 0
              ? t.noClassesYetSubtitle
              : t.classCount(classes.length)}
          </p>
        </div>
        <button
          data-tour="new-class"
          onClick={onNewClass}
          type="button"
          style={{ touchAction: 'manipulation' }}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold text-sm shadow-sm active:scale-95 transition-all"
          aria-label={t.newClassAria}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">{t.newClassFull}</span>
          <span className="sm:hidden">{t.newClassShort}</span>
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-2xl py-16 px-6 text-center">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-stone-400" />
          </div>
          <p className="text-stone-700 font-semibold mb-1">{t.emptyTitle}</p>
          <p className="text-sm text-stone-500 mb-6">{t.emptySubtitle}</p>
          <button
            onClick={onNewClass}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm active:scale-95 transition-all"
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
