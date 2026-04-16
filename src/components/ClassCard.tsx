import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Trash2, Zap, BookOpen, GraduationCap, MoreVertical, ChevronDown, Pencil } from "lucide-react";

interface Assignment {
  id: string;
  classId: string;
  title: string;
  wordIds: number[];
  deadline?: string | null;
  words?: any[];
  sentences?: string[];
  allowedModes?: string[];
  sentenceDifficulty?: number;
  createdAt?: string;
}

interface ClassCardProps {
  name: string;
  code: string;
  /** Optional emoji avatar; falls back to GraduationCap icon when null. */
  avatar?: string | null;
  studentCount?: number;
  onAssign: () => void;
  onCopyCode: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
  /** Open the edit-class modal for renaming + changing avatar. */
  onEdit?: () => void;
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
  avatar,
  studentCount,
  onAssign,
  onCopyCode,
  onWhatsApp,
  onDelete,
  onEdit,
  copiedCode,
  assignments = [],
  onEditAssignment,
  onDuplicateAssignment,
  onDeleteAssignment,
  openDropdownClassId,
  onToggleDropdown,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const showAssignments = openDropdownClassId === code;

  // Close the "more" menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const handleToggleAssignments = (e: React.MouseEvent | undefined) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newState = showAssignments ? null : code;
    onToggleDropdown?.(newState);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Class avatar — emoji if the teacher picked one, otherwise
                the default GraduationCap inside the gradient tile. */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${avatar ? 'bg-gradient-to-br from-stone-50 to-white border border-stone-200' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
              {avatar ? (
                <span className="text-2xl leading-none">{avatar}</span>
              ) : (
                <GraduationCap size={20} className="text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight truncate">{name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={onCopyCode}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  className="group inline-flex items-center gap-1.5 text-xs font-semibold font-mono tracking-wider text-stone-600 hover:text-indigo-600 transition-colors"
                  title="Copy class code"
                >
                  <span>{code}</span>
                  {copiedCode === code ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="opacity-50 group-hover:opacity-100" />
                  )}
                </button>
                {studentCount !== undefined && (
                  <span className="text-xs text-stone-500 flex items-center gap-1">
                    · 👥 {studentCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* More menu (Delete lives here — kept out of the primary action row to
              reduce visual weight on the destructive action) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              type="button"
              style={{ touchAction: 'manipulation' }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Class options"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-20">
                {onEdit && (
                  <button
                    onClick={() => { onEdit(); setMenuOpen(false); }}
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 text-left"
                  >
                    <Pencil size={14} className="text-indigo-600" />
                    Edit class
                  </button>
                )}
                <button
                  onClick={() => { onWhatsApp(); setMenuOpen(false); }}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 text-left"
                >
                  <MessageCircle size={14} className="text-emerald-600" />
                  Share via WhatsApp
                </button>
                <button
                  onClick={() => { onCopyCode(); setMenuOpen(false); }}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 text-left"
                >
                  <Copy size={14} className="text-stone-500" />
                  Copy class code
                </button>
                <div className="h-px bg-stone-100 my-1" />
                <button
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 text-left"
                >
                  <Trash2 size={14} />
                  Delete class
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Primary action + assignments expand */}
        <div className="flex items-stretch gap-2">
          <button
            onClick={onAssign}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm active:scale-[0.98] transition-all"
          >
            <Zap size={15} />
            New assignment
          </button>
          {assignments.length > 0 && (
            <button
              onClick={handleToggleAssignments}
              type="button"
              style={{ touchAction: 'manipulation' }}
              className="inline-flex items-center gap-1.5 py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold text-sm transition-colors"
              aria-expanded={showAssignments}
            >
              <BookOpen size={15} />
              <span>{assignments.length}</span>
              <ChevronDown size={14} className={`transition-transform ${showAssignments ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Assignments dropdown */}
      {assignments.length > 0 && showAssignments && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-5 py-4 space-y-2 rounded-b-2xl">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-stone-200"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900 text-sm truncate">{assignment.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {assignment.wordIds.length} word{assignment.wordIds.length === 1 ? '' : 's'} · {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : 'No deadline'}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {onEditAssignment && (
                  <button
                    onClick={() => onEditAssignment(assignment)}
                    type="button"
                    className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                )}
                {onDuplicateAssignment && (
                  <button
                    onClick={() => onDuplicateAssignment(assignment)}
                    type="button"
                    className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Duplicate
                  </button>
                )}
                {onDeleteAssignment && (
                  <button
                    onClick={() => onDeleteAssignment(assignment)}
                    type="button"
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label="Delete assignment"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassCard;
