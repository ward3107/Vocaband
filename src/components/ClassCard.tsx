import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Trash2, Zap, BookOpen, GraduationCap, MoreVertical, ChevronDown, Pencil, CheckCircle2, X } from "lucide-react";
import { CLASS_AVATAR_GROUPS } from "../constants/game";

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
  /** Called when user changes the class name inline. */
  onNameChange?: (newName: string) => Promise<void> | void;
  /** Called when user picks a new avatar. */
  onAvatarChange?: (newAvatar: string | null) => Promise<void> | void;
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
  onNameChange,
  onAvatarChange,
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

  // Inline name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Avatar picker popover state
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const avatarPickerRef = useRef<HTMLDivElement>(null);

  // Reset edited name when prop changes
  useEffect(() => {
    setEditedName(name);
  }, [name]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Close avatar picker on outside click
  useEffect(() => {
    if (!avatarPickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (avatarPickerRef.current && !avatarPickerRef.current.contains(e.target as Node)) {
        setAvatarPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [avatarPickerOpen]);

  const handleNameSave = async () => {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === name || savingName) {
      setEditedName(name);
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await onNameChange?.(trimmed);
      setIsEditingName(false);
    } finally {
      setSavingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(name);
      setIsEditingName(false);
    }
  };

  const handleAvatarPick = async (newAvatar: string | null) => {
    setAvatarPickerOpen(false);
    await onAvatarChange?.(newAvatar);
  };

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
            {/* Class avatar — now clickable! Opens popover picker. */}
            <div className="relative" ref={avatarPickerRef}>
              <button
                onClick={() => setAvatarPickerOpen(v => !v)}
                type="button"
                style={{ touchAction: 'manipulation' }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-105 active:scale-95 ${avatar ? 'bg-gradient-to-br from-stone-50 to-white border border-stone-200' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}
                title="Change avatar"
              >
                {avatar ? (
                  <span className="text-2xl leading-none">{avatar}</span>
                ) : (
                  <GraduationCap size={20} className="text-white" />
                )}
              </button>

              {/* Avatar picker popover */}
              {avatarPickerOpen && onAvatarChange && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-stone-200 shadow-2xl z-30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Pick avatar</span>
                    <button
                      onClick={() => setAvatarPickerOpen(false)}
                      type="button"
                      className="w-6 h-6 rounded-full hover:bg-stone-100 flex items-center justify-center"
                    >
                      <X size={14} className="text-stone-400" />
                    </button>
                  </div>

                  {/* Default option */}
                  <button
                    onClick={() => handleAvatarPick(null)}
                    type="button"
                    style={{ touchAction: 'manipulation' }}
                    className={`aspect-square rounded-xl flex items-center justify-center transition-all border-2 mb-3 w-full ${
                      avatar === null
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <GraduationCap size={20} className="text-stone-600" />
                  </button>

                  {/* Emoji grid - scrollable */}
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {CLASS_AVATAR_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">{group.label}</p>
                        <div className="grid grid-cols-8 gap-1">
                          {group.emojis.map(em => {
                            const selected = avatar === em;
                            return (
                              <button
                                key={em}
                                onClick={() => handleAvatarPick(em)}
                                type="button"
                                style={{ touchAction: 'manipulation' }}
                                className={`aspect-square rounded-lg flex items-center justify-center text-xl transition-all border-2 ${
                                  selected
                                    ? 'bg-indigo-50 border-indigo-500 scale-105'
                                    : 'bg-white border-stone-200 hover:border-stone-300 hover:scale-105'
                                }`}
                              >
                                {em}
                                {selected && (
                                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-500 flex items-center justify-center">
                                    <CheckCircle2 size={8} className="text-white" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* Class name — inline editable */}
              {isEditingName && onNameChange ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    onBlur={handleNameSave}
                    maxLength={60}
                    placeholder="Class name"
                    className="flex-1 text-lg sm:text-xl font-bold text-stone-900 leading-tight bg-stone-50 border-2 border-indigo-400 rounded-lg px-2 py-1 outline-none"
                    disabled={savingName}
                  />
                  {savingName && <span className="text-xs text-stone-400">Saving...</span>}
                </div>
              ) : (
                <button
                  onClick={() => onNameChange && setIsEditingName(true)}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  className="group text-left w-full"
                  title={onNameChange ? "Click to edit name" : undefined}
                >
                  <h3 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight truncate group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                    <span className="truncate">{name}</span>
                    {onNameChange && (
                      <Pencil size={14} className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                    )}
                  </h3>
                </button>
              )}

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
