import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Trash2, Zap, BookOpen, GraduationCap, MoreVertical, ChevronDown, Pencil, CheckCircle2, X, Printer, Tv2, QrCode } from "lucide-react";
import { CLASS_AVATAR_GROUPS } from "../constants/game";
import type { Word } from "../data/vocabulary";
import { useLanguage } from "../hooks/useLanguage";
import { teacherDashboardT } from "../locales/teacher/dashboard";
import ShareClassLinkModal from "./ShareClassLinkModal";

interface Assignment {
  id: string;
  classId: string;
  title: string;
  wordIds: number[];
  deadline?: string | null;
  words?: Word[];
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
  /** Project this assignment to the classroom via Class Show. */
  onProjectAssignmentToClass?: (assignment: Assignment) => void;
  /** Print this assignment as a worksheet. */
  onPrintAssignmentWorksheet?: (assignment: Assignment) => void;
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
  onProjectAssignmentToClass,
  onPrintAssignmentWorksheet,
  openDropdownClassId,
  onToggleDropdown,
}) => {
  const { language } = useLanguage();
  const t = teacherDashboardT[language];
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
  // Share-class-link modal: digital share with on-screen QR + copyable
  // /student?class= URL.  Distinct from the printable poster (which
  // opens /poster.html) because teachers usually want to drop a link
  // into a class WhatsApp / email rather than print a sheet.
  const [shareModalOpen, setShareModalOpen] = useState(false);
  // Ref on the assignments list so we can scroll it into view when the
  // teacher expands it (otherwise it often opens below the fold and the
  // click looks like it did nothing).
  const assignmentsListRef = useRef<HTMLDivElement>(null);

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

  // Bring the assignments dropdown into view the first render after it
  // opens. `block: 'nearest'` only scrolls if needed, so if the list is
  // already visible we don't jump the page around.
  useEffect(() => {
    if (!showAssignments) return;
    const id = requestAnimationFrame(() => {
      assignmentsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [showAssignments]);

  // Same treatment for the avatar picker popover — without it the grid
  // opens below the fold on taller class cards and teachers don't
  // realise the picker is there until they scroll.
  useEffect(() => {
    if (!avatarPickerOpen) return;
    const id = requestAnimationFrame(() => {
      avatarPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(id);
  }, [avatarPickerOpen]);

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
    <>
    <div
      style={{
        backgroundColor: 'var(--vb-surface)',
        borderColor: 'var(--vb-border)',
      }}
      className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Class avatar — now clickable! Opens popover picker. */}
            <div className="relative" ref={avatarPickerRef}>
              <button
                onClick={() => setAvatarPickerOpen(v => !v)}
                type="button"
                style={{
                  touchAction: 'manipulation',
                  ...(avatar ? { backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' } : {}),
                }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-105 active:scale-95 ${avatar ? 'border' : 'bg-gradient-to-br from-indigo-300 to-violet-400'}`}
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
                <div
                  className="absolute left-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl z-30 p-4"
                  style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--vb-text-muted)' }}>Pick avatar</span>
                    <button
                      onClick={() => setAvatarPickerOpen(false)}
                      type="button"
                      className="w-6 h-6 rounded-full hover:bg-[var(--vb-surface-alt)] flex items-center justify-center"
                    >
                      <X size={14} style={{ color: 'var(--vb-text-muted)' }} />
                    </button>
                  </div>

                  {/* Default option — sits inline with "Default" label so it
                      looks like a picker tile, not a giant hero preview. The
                      previous version used `aspect-square w-full` which
                      stretched this single tile to 288×288 inside a 288px
                      popover, burying the emoji grid below the fold. */}
                  <button
                    onClick={() => handleAvatarPick(null)}
                    type="button"
                    style={{
                      touchAction: 'manipulation',
                      backgroundColor: avatar === null ? 'var(--vb-accent-soft)' : 'var(--vb-surface)',
                      borderColor: avatar === null ? 'var(--vb-accent)' : 'var(--vb-border)',
                      color: avatar === null ? 'var(--vb-accent)' : 'var(--vb-text-secondary)',
                    }}
                    className={`w-full mb-3 px-3 py-2 rounded-xl flex items-center gap-2 transition-all border-2 ${
                      avatar === null ? 'ring-2 ring-[var(--vb-accent-soft)]' : 'hover:border-[var(--vb-text-muted)]'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--vb-surface-alt)' }}
                    >
                      <GraduationCap size={18} style={{ color: 'var(--vb-text-secondary)' }} />
                    </span>
                    <span className="text-sm font-bold">{t.defaultAvatarLabel}</span>
                  </button>

                  {/* Emoji grid - scrollable */}
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {CLASS_AVATAR_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--vb-text-muted)' }}>{group.label}</p>
                        <div className="grid grid-cols-8 gap-1">
                          {group.emojis.map(em => {
                            const selected = avatar === em;
                            return (
                              <button
                                key={em}
                                onClick={() => handleAvatarPick(em)}
                                type="button"
                                style={{
                                  touchAction: 'manipulation',
                                  backgroundColor: selected ? 'var(--vb-accent-soft)' : 'var(--vb-surface)',
                                  borderColor: selected ? 'var(--vb-accent)' : 'var(--vb-border)',
                                }}
                                className={`aspect-square rounded-lg flex items-center justify-center text-xl transition-all border-2 ${
                                  selected ? 'scale-105' : 'hover:scale-105 hover:border-[var(--vb-text-muted)]'
                                }`}
                              >
                                {em}
                                {selected && (
                                  <span
                                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--vb-accent)' }}
                                  >
                                    <CheckCircle2 size={8} style={{ color: 'var(--vb-accent-text)' }} />
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
                    id={`class-rename-${code}`}
                    name="className"
                    autoComplete="off"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    onBlur={handleNameSave}
                    maxLength={60}
                    placeholder="Class name"
                    style={{ color: 'var(--vb-text-primary)', backgroundColor: 'var(--vb-surface-alt)' }}
                    className="flex-1 text-lg sm:text-xl font-bold leading-tight border-2 border-[var(--vb-accent)] rounded-lg px-2 py-1 outline-none"
                    disabled={savingName}
                  />
                  {savingName && <span className="text-xs" style={{ color: 'var(--vb-text-muted)' }}>Saving...</span>}
                </div>
              ) : (
                <button
                  onClick={() => onNameChange && setIsEditingName(true)}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  className="group text-left w-full"
                  title={onNameChange ? t.clickToEditNameTitle : undefined}
                >
                  <h3
                    style={{ color: 'var(--vb-text-primary)' }}
                    className="text-lg sm:text-xl font-bold leading-tight truncate transition-colors flex items-center gap-2 group-hover:text-[var(--vb-accent)]"
                  >
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
                  style={{ touchAction: 'manipulation', color: 'var(--vb-text-secondary)' }}
                  className="group inline-flex items-center gap-1.5 text-xs font-semibold font-mono tracking-wider transition-colors hover:text-[var(--vb-accent)]"
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
                  <span
                    style={{ color: 'var(--vb-text-muted)' }}
                    className="text-xs flex items-center gap-1"
                  >
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
              style={{ touchAction: 'manipulation', color: 'var(--vb-text-muted)' }}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--vb-surface-alt)] hover:text-[var(--vb-text-primary)]"
              aria-label="Class options"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div
                style={{
                  backgroundColor: 'var(--vb-surface)',
                  borderColor: 'var(--vb-border)',
                }}
                className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg py-1 z-20"
              >
                <button
                  onClick={() => { setShareModalOpen(true); setMenuOpen(false); }}
                  type="button"
                  style={{ color: 'var(--vb-text-secondary)' }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--vb-surface-alt)]"
                >
                  <QrCode size={14} className="text-indigo-600" />
                  {t.shareClassLink}
                </button>
                <button
                  onClick={() => { onWhatsApp(); setMenuOpen(false); }}
                  type="button"
                  style={{ color: 'var(--vb-text-secondary)' }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--vb-surface-alt)]"
                >
                  <MessageCircle size={14} className="text-emerald-600" />
                  {t.shareWhatsApp}
                </button>
                <button
                  onClick={() => { onCopyCode(); setMenuOpen(false); }}
                  type="button"
                  style={{ color: 'var(--vb-text-secondary)' }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--vb-surface-alt)]"
                >
                  <Copy size={14} style={{ color: 'var(--vb-text-muted)' }} />
                  Copy class code
                </button>
                <button
                  onClick={() => {
                    // Open the printable poster in a new tab. Includes the
                    // class code in the QR so when students scan, they
                    // land on the join flow already pre-filled. The page
                    // itself uses window.print() — teacher chooses Print
                    // or Save as PDF in the browser dialog.
                    //
                    // Link to /poster (no .html) because Cloudflare
                    // Workers Assets defaults to `auto-trailing-slash`,
                    // which 301-redirects /poster.html → /poster.  That
                    // redirect was getting cached by the Service Worker
                    // and then rejected by the browser on subsequent
                    // navigations ("a redirected response was used for
                    // a request whose redirect mode is not 'follow'").
                    // Hitting /poster directly skips the redirect hop.
                    const url = `/poster?class=${encodeURIComponent(code)}&ref=teacher-${encodeURIComponent(code)}`;
                    window.open(url, '_blank', 'noopener');
                    setMenuOpen(false);
                  }}
                  type="button"
                  style={{ color: 'var(--vb-text-secondary)' }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--vb-surface-alt)]"
                >
                  <Printer size={14} className="text-indigo-600" />
                  {t.printPoster}
                </button>
                <div className="h-px my-1" style={{ backgroundColor: 'var(--vb-border)' }} />
                <button
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 text-left"
                >
                  <Trash2 size={14} />
                  {t.deleteClass}
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
            style={{
              touchAction: 'manipulation',
              backgroundColor: 'var(--vb-accent)',
              color: 'var(--vb-accent-text)',
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Zap size={15} />
            {t.newAssignment}
          </button>
          {assignments.length > 0 && (
            <button
              onClick={handleToggleAssignments}
              type="button"
              style={{
                touchAction: 'manipulation',
                backgroundColor: 'var(--vb-surface-alt)',
                color: 'var(--vb-text-secondary)',
              }}
              className="inline-flex items-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors hover:opacity-90"
              aria-expanded={showAssignments}
            >
              <BookOpen size={15} />
              <span>{assignments.length}</span>
              <ChevronDown size={14} className={`transition-transform ${showAssignments ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Assignments dropdown. The wrapper ref lets us auto-scroll the
          list into view when the teacher expands it — on a dashboard
          with many classes the dropdown often opens below the fold,
          so the click looked like a no-op unless the teacher remembered
          to scroll. */}
      {assignments.length > 0 && showAssignments && (
        <div
          ref={assignmentsListRef}
          style={{
            borderColor: 'var(--vb-border)',
            backgroundColor: 'var(--vb-surface-alt)',
          }}
          className="border-t px-5 py-4 space-y-2 rounded-b-2xl"
        >
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              style={{
                backgroundColor: 'var(--vb-surface)',
                borderColor: 'var(--vb-border)',
              }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border"
            >
              <div className="min-w-0 flex-1">
                <p
                  style={{ color: 'var(--vb-text-primary)' }}
                  className="font-semibold text-sm truncate"
                >
                  {assignment.title}
                </p>
                <p
                  style={{ color: 'var(--vb-text-muted)' }}
                  className="text-xs mt-0.5"
                >
                  {assignment.wordIds.length} word{assignment.wordIds.length === 1 ? '' : 's'} · {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : 'No deadline'}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {onEditAssignment && (
                  <button
                    onClick={() => onEditAssignment(assignment)}
                    type="button"
                    style={{ color: 'var(--vb-text-secondary)' }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors hover:bg-[var(--vb-surface-alt)]"
                  >
                    {t.editAssignment}
                  </button>
                )}
                {onDuplicateAssignment && (
                  <button
                    onClick={() => onDuplicateAssignment(assignment)}
                    type="button"
                    style={{ color: 'var(--vb-text-secondary)' }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors hover:bg-[var(--vb-surface-alt)]"
                  >
                    {t.duplicateAssignment}
                  </button>
                )}
                {onProjectAssignmentToClass && (
                  <button
                    onClick={() => onProjectAssignmentToClass(assignment)}
                    type="button"
                    style={{
                      backgroundColor: 'var(--vb-accent-soft)',
                      color: 'var(--vb-accent)',
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1 hover:opacity-90 transition-colors"
                    aria-label="Project to class"
                    title="Project to class"
                  >
                    <Tv2 size={13} />
                    <span className="hidden sm:inline">Project</span>
                  </button>
                )}
                {onPrintAssignmentWorksheet && (
                  <button
                    onClick={() => onPrintAssignmentWorksheet(assignment)}
                    type="button"
                    style={{
                      backgroundColor: 'var(--vb-surface-alt)',
                      color: 'var(--vb-text-secondary)',
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1 hover:opacity-90 transition-colors"
                    aria-label="Print worksheet"
                    title="Print worksheet"
                  >
                    <Printer size={13} />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                )}
                {onDeleteAssignment && (
                  <button
                    onClick={() => onDeleteAssignment(assignment)}
                    type="button"
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label={t.deleteAssignmentAria}
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
    <ShareClassLinkModal
      open={shareModalOpen}
      onClose={() => setShareModalOpen(false)}
      className={name}
      code={code}
      onWhatsApp={onWhatsApp}
    />
    </>
  );
};

export default ClassCard;
