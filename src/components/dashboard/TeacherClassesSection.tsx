import { Users, Plus } from "lucide-react";
import ClassCard from "../ClassCard";
import type { ClassData, AssignmentData } from "../../core/supabase";

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
  onEditAssignment: (assignment: AssignmentData, c: ClassData) => void;
  onDuplicateAssignment: (assignment: AssignmentData, c: ClassData) => void;
  onDeleteAssignment: (assignment: AssignmentData) => void;
}

export default function TeacherClassesSection({
  classes, teacherAssignments, copiedCode, setCopiedCode,
  openDropdownClassId, setOpenDropdownClassId,
  onNewClass, onAssign, onDeleteClass,
  onEditAssignment, onDuplicateAssignment, onDeleteAssignment,
}: TeacherClassesSectionProps) {
  return (
    <div
      data-tour="my-classes"
      className="bg-surface-container-low rounded-2xl p-6 mb-6 shadow-lg border-2 border-surface-container-high"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
          <Users className="text-primary" size={20} /> My Classes
        </h2>
        <button
          data-tour="new-class"
          onClick={onNewClass}
          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-black text-base flex items-center gap-2 active:scale-95 transition-all"
          aria-label="Create new class"
        >
          <Plus size={16} /> New Class
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-on-surface-variant" />
          </div>
          <p className="text-on-surface-variant font-medium">No classes yet. Create one to get a code!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {[...classes].reverse().map(c => {
            const classAssignments = teacherAssignments.filter(a => a.classId === c.id);
            return (
              <div key={c.id} style={{ minWidth: '300px' }}>
                <ClassCard
                  name={c.name}
                  code={c.code}
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
                  onEditAssignment={(assignment) => onEditAssignment(assignment, c)}
                  onDuplicateAssignment={(assignment) => onDuplicateAssignment(assignment, c)}
                  onDeleteAssignment={onDeleteAssignment}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
