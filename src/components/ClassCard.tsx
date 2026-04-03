import React from "react";
import { Check, Copy, MessageCircle, Trash2, Zap, BookOpen } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  wordIds: string[];
  deadline: string | null;
  words?: any[];
  sentences?: any[];
  allowedModes?: string[];
}

interface ClassCardProps {
  name: string;
  code: string;
  studentCount?: number;
  onAssign: () => void;
  onCopyCode: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
  copiedCode?: string | null;
  assignments?: Assignment[];
  onEditAssignment?: (assignment: Assignment) => void;
  onDuplicateAssignment?: (assignment: Assignment) => void;
  onDeleteAssignment?: (assignment: Assignment) => void;
  openDropdownClassId?: string | null;
  onToggleDropdown?: (classId: string | null) => void;
}

const ClassCard: React.FC<ClassCardProps> = ({
  name,
  code,
  studentCount,
  onAssign,
  onCopyCode,
  onWhatsApp,
  onDelete,
  copiedCode,
  assignments = [],
  onEditAssignment,
  onDuplicateAssignment,
  onDeleteAssignment,
  openDropdownClassId,
  onToggleDropdown,
}) => {
  // Use shared state for dropdown visibility
  const showAssignments = openDropdownClassId === code;

  const handleToggleDropdown = (e: React.MouseEvent | undefined) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Toggle: if clicking this card's dropdown, close it; otherwise open this one
    const newState = showAssignments ? null : code;
    onToggleDropdown?.(newState);
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-xl shadow-stone-900/10 border-2 border-blue-100 relative">
      <div className="p-4">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-on-surface leading-tight truncate">{name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-primary text-white text-xs font-black rounded-full uppercase tracking-wide shadow-md">
                {code}
              </span>
              {studentCount !== undefined && (
                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                  👥 {studentCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap" style={{ position: 'relative', zIndex: 1 }}>
            {assignments.length > 0 && (
              <button
                onClick={handleToggleDropdown}
                className="text-sm font-bold text-white flex items-center gap-1 shrink-0 bg-gradient-to-r from-cyan-500 to-sky-600 px-3 py-2 rounded-xl shadow-lg shadow-cyan-500/40 cursor-pointer transition-all hover:scale-105 active:scale-95 border-2 border-white/30"
              >
                <span style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BookOpen size={16} />
                  {assignments.length} {showAssignments ? '▲' : '▼'}
                  <span className="hidden sm:inline"> Assignments</span>
                </span>
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Zap size={18} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAssign}
            className="signature-gradient text-white py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Zap size={14} /> Assign
          </button>
          <button
            onClick={onCopyCode}
            className="bg-surface-container-low text-on-surface py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all"
          >
            {copiedCode === code ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
            {copiedCode === code ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={onWhatsApp}
            className="bg-[#25D366]/10 text-[#128C7E] py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-[#25D366]/20 active:scale-95 transition-all"
          >
            <MessageCircle size={14} /> WhatsApp
          </button>
          <button
            onClick={onDelete}
            className="bg-error-container/10 text-error py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-error-container/20 active:scale-95 transition-all"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>

        {/* Assignments Section */}
        {assignments.length > 0 && showAssignments && (
          <div className="mt-4 pt-4 border-t-2 border-surface-container-highest space-y-2">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-container-low rounded-xl border-2 border-surface-container-highest">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-on-surface text-sm truncate">{assignment.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    {assignment.wordIds.length} words · {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : 'No deadline'}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {onEditAssignment && (
                    <button
                      onClick={() => onEditAssignment(assignment)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-200 border border-blue-200 transition-all"
                    >
                      Edit
                    </button>
                  )}
                  {onDuplicateAssignment && (
                    <button
                      onClick={() => onDuplicateAssignment(assignment)}
                      className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-lg hover:bg-green-200 border border-green-200 transition-all"
                    >
                      Duplicate
                    </button>
                  )}
                  {onDeleteAssignment && (
                    <button
                      onClick={() => onDeleteAssignment(assignment)}
                      className="px-3 py-1 bg-red-100 text-red-700 font-bold text-xs rounded-lg hover:bg-red-200 border border-red-200 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassCard;
