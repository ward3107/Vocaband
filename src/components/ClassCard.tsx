import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Trash2, Zap, BookOpen, GraduationCap, MoreVertical, ChevronDown, Pencil, CheckCircle2, X, Printer, Tv2, QrCode, Share2, Timer, Users, Trophy, Palette } from "lucide-react";
import { CLASS_AVATAR_GROUPS } from "../constants/game";
import type { Word } from "../data/vocabulary";
import type { VocaId } from "../core/subject";
import type { CompetitionData } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { readableTextOn } from "../utils/contrast";
import { teacherDashboardT } from "../locales/teacher/dashboard";
import { competitionsT } from "../locales/competitions";
import ShareClassLinkModal from "./ShareClassLinkModal";
import CompetitionLeaderboardModal from "./CompetitionLeaderboardModal";
import FrostedEmoji from "./dashboard/FrostedEmoji";
import {
  ACCENTS,
  ACCENT_ORDER,
  BRAND_GRADIENT,
  type AccentName,
} from "./dashboard/dashboardAccents";

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
  /** Per-class school branding — both null until the teacher fills
   *  them in via Edit Class.  When present, the school logo + name
   *  surface as a small strip above the class name. */
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
  /** Per-class background tint hex (e.g. '#fde68a').  Null → use the
   *  theme surface color (legacy behaviour). */
  backgroundColor?: string | null;
  studentCount?: number;
  onAssign: () => void;
  onCopyCode: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
  /** Open the edit-class modal for renaming + changing avatar. */
  onEdit?: () => void;
  /** Open the roster modal — manage students + PINs for this class. */
  onOpenRoster?: () => void;
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
  /** Subject of this class.  Drives the "X words" / "X מילים" badge
   *  on each assignment row.  Defaults to 'english' so cards omitting
   *  the prop render exactly as before. */
  subject?: VocaId;
  /** Optional map of competitions keyed by assignment id.  When set,
   *  assignment rows whose id is in the map render a clickable
   *  "🏆 Live standings" badge that opens the leaderboard. */
  competitionsByAssignment?: Map<string, CompetitionData>;
  /** Visual variant. `classic` (default) keeps the existing themed
   *  card used by VocaHebrew and legacy callers.  `pastel` opts into
   *  the redesigned English-dashboard look: accent-tinted card, frosted
   *  emoji avatar, white/65 code chip, pill-shaped action buttons. */
  variant?: "classic" | "pastel";
  /** Pastel accent for the card background when `variant === 'pastel'`
   *  AND no custom `backgroundColor` hex is set.  Ignored in classic
   *  mode.  Caller (EnglishDashboardLayout) computes this from
   *  `accentForClass(classId)` so every class keeps a stable tint. */
  accent?: AccentName;
  /** Persist a new pastel accent when the teacher picks one inside the
   *  avatar popover.  Optional — popover hides the swatch row when not
   *  wired. */
  onAccentChange?: (next: AccentName) => Promise<void> | void;
}

const ClassCard: React.FC<ClassCardProps> = ({
  name,
  code,
  avatar,
  schoolName,
  schoolLogoUrl,
  backgroundColor,
  studentCount,
  onAssign,
  onCopyCode,
  onWhatsApp,
  onDelete,
  onEdit,
  onOpenRoster,
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
  subject = "english",
  competitionsByAssignment,
  variant = "classic",
  accent,
  onAccentChange,
}) => {
  const { language } = useLanguage();
  const isPastel = variant === "pastel";
  // In pastel mode the accent map drives both the card background and
  // a single hardcoded ink colour for text + icons.  Custom hex tints
  // (backgroundColor prop) still take precedence so a teacher's saved
  // colour wins over the deterministic accent.
  const accentDef = accent ? ACCENTS[accent] : null;
  const pastelBg = isPastel && !backgroundColor && accentDef ? accentDef.bg : null;
  // Foreground inks for elements sitting on the pastel/tinted band.
  // Hex+alpha is widely supported and saves a colour-mix dance.
  const pastelInk = isPastel && accentDef
    ? {
        primary: accentDef.ink,
        secondary: `${accentDef.ink}CC`,
        muted: `${accentDef.ink}99`,
      }
    : null;
  const [activeCompetition, setActiveCompetition] = useState<CompetitionData | null>(null);
  // Hebrew classes belong to VocaHebrew — force the card chrome to
  // Hebrew copy so a teacher with English UI still sees Hebrew on
  // their VocaHebrew classes (matches the unified dashboard rule).
  const effectiveLanguage = subject === "hebrew" ? "he" : language;
  const t = teacherDashboardT[effectiveLanguage];
  const tComp = competitionsT[effectiveLanguage];
  // When a class has a custom tint, the default --vb-text-* vars are
  // wrong (e.g. white text on pale yellow). Compute a readable text
  // triple from the tint's luminance once and use it for every label
  // sitting on the tinted band. Untinted cards keep using CSS vars
  // so dark mode + theme switches still work.
  // Pastel-variant cards without a custom hex tint fall back to the
  // hardcoded accent ink so labels stay readable on the gradient.
  const tintText = backgroundColor
    ? readableTextOn(backgroundColor)
    : pastelInk;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Trigger + portaled menu node refs.  The menu is rendered in a portal
  // (see render below) so it escapes the card's overflow-hidden clip;
  // these refs let the click-outside handler tell taps on the trigger
  // apart from taps on the portaled menu vs taps anywhere else.
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);
  // Viewport-relative position for the portaled menu.  Computed from the
  // trigger's bounding rect when the menu opens; reset to null on close.
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const showAssignments = openDropdownClassId === code;

  // Inline name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Avatar picker popover state.  The popover is portaled to body
  // (same pattern as the ⋮ menu) so it escapes the card's
  // overflow-hidden clip and the dashboard's stacking context — the
  // in-flow `absolute` version got buried behind the sticky TopAppBar
  // (z-50) and clipped by the card body, which is why teachers
  // couldn't reach the emoji grid.
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarPickerPos, setAvatarPickerPos] = useState<{ top: number; left: number } | null>(null);
  const avatarPickerRef = useRef<HTMLDivElement>(null);
  const avatarPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const avatarPickerPortalRef = useRef<HTMLDivElement>(null);
  // Share-class-link modal: digital share with on-screen QR + copyable
  // /student?class= URL.  Distinct from the printable poster (which
  // opens /poster.html) because teachers usually want to drop a link
  // into a class WhatsApp / email rather than print a sheet.
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareClassMinuteOpen, setShareClassMinuteOpen] = useState(false);
  // Per-assignment share — when set, the share modal opens with this
  // assignment's id baked into the URL so opening the link auto-routes
  // the student straight into this assignment after they join.
  const [sharingAssignment, setSharingAssignment] = useState<Assignment | null>(null);
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

  // Close the avatar picker on outside click.  Same dual-ref check
  // as the ⋮ menu — the picker is portaled, so we need to test both
  // the trigger wrapper and the portaled node before treating a
  // click as "outside".  Dismiss on outer page scroll / resize so the
  // fixed-position popover doesn't strand itself when the page
  // moves under it — but ignore scrolls that originate *inside* the
  // popover (the emoji grid has its own `max-h-48 overflow-y-auto`
  // scroller; the previous unconditional dismiss closed the picker
  // the moment the teacher tried to scroll the grid).
  useEffect(() => {
    if (!avatarPickerOpen) return;
    const isInsidePicker = (target: Node) =>
      (avatarPickerRef.current?.contains(target) ?? false) ||
      (avatarPickerPortalRef.current?.contains(target) ?? false);
    const onDoc = (e: MouseEvent) => {
      if (!isInsidePicker(e.target as Node)) setAvatarPickerOpen(false);
    };
    const onScroll = (e: Event) => {
      if (!isInsidePicker(e.target as Node)) setAvatarPickerOpen(false);
    };
    const onResize = () => setAvatarPickerOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
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

  // Close the "more" menu on outside click.  The menu is portaled so
  // menuRef alone wouldn't contain the dropdown — also check the
  // portaled menu node and the trigger itself.  Scrolling or resizing
  // the viewport detaches the fixed-position menu from its trigger, so
  // close it then too rather than rendering a stranded dropdown.
  useEffect(() => {
    if (!menuOpen) return;
    const isInsideMenu = (target: Node) =>
      (menuRef.current?.contains(target) ?? false) ||
      (menuPortalRef.current?.contains(target) ?? false);
    const onDoc = (e: MouseEvent) => {
      if (!isInsideMenu(e.target as Node)) setMenuOpen(false);
    };
    const onDismiss = () => setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
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
      style={
        isPastel
          ? {
              // Pastel: outer card carries the accent gradient (or
              // custom hex tint) directly so the whole card reads as
              // one tinted surface. No border — the soft shadow does
              // the lifting.
              background: backgroundColor ?? pastelBg ?? "var(--vb-surface)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.25)",
            }
          : {
              backgroundColor: 'var(--vb-surface)',
              borderColor: 'var(--vb-border)',
            }
      }
      className={
        isPastel
          ? "rounded-[28px] overflow-hidden"
          : "rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      }
    >
      {/* Header band — wraps the school strip + class-name row so the
          per-class tint (backgroundColor prop) sits behind those two
          elements only.  Rest of the card stays neutral so the
          assignment-list dropdown keeps its alt-surface contrast and
          long classroom names stay readable on bright tints.
          In pastel mode the outer card already carries the tint, so
          this inner band stays transparent. */}
      <div
        style={!isPastel && backgroundColor ? { backgroundColor } : undefined}
      >
      {/* School branding strip — only rendered when set, so legacy
          classes (no school configured yet) keep their existing
          compact header.  Logo is a small 24px square so the strip
          stays subtle; the name is the focus. */}
      {(schoolName || schoolLogoUrl) && (
        <div
          className="flex items-center gap-2 px-5 pt-4"
          style={{ color: tintText?.secondary ?? 'var(--vb-text-secondary)' }}
        >
          {schoolLogoUrl && (
            <img
              src={schoolLogoUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-6 h-6 rounded object-contain bg-white"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {schoolName && (
            <span className="text-xs font-bold uppercase tracking-wider truncate">
              {schoolName}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className={isPastel ? "p-[22px]" : "p-5 pb-4"}>
        <div className={isPastel ? "flex items-start justify-between gap-3 mb-[18px]" : "flex items-start justify-between gap-3 mb-4"}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Class avatar — now clickable! Opens popover picker. */}
            <div className="relative" ref={avatarPickerRef}>
              <button
                ref={avatarPickerTriggerRef}
                onClick={() => {
                  setAvatarPickerOpen(prev => {
                    const next = !prev;
                    if (next && avatarPickerTriggerRef.current) {
                      // Anchor the portaled picker to the trigger's
                      // bottom-left, flipping above when the bottom of
                      // the viewport doesn't leave room.  Estimate the
                      // popover at ~420 px (header + default tile +
                      // capped emoji grid `max-h-48` + padding) — same
                      // strategy as the ⋮ menu.  Clamp `left` so the
                      // 288 px popover never overflows on narrow
                      // phones.
                      const rect = avatarPickerTriggerRef.current.getBoundingClientRect();
                      const ESTIMATED_HEIGHT = 420;
                      const POPOVER_WIDTH = 288;
                      const VIEWPORT_MARGIN = 12;
                      const fitsBelow =
                        rect.bottom + 8 + ESTIMATED_HEIGHT <= window.innerHeight - VIEWPORT_MARGIN;
                      const top = fitsBelow
                        ? rect.bottom + 8
                        : Math.max(VIEWPORT_MARGIN, rect.top - ESTIMATED_HEIGHT - 8);
                      const left = Math.max(
                        VIEWPORT_MARGIN,
                        Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN),
                      );
                      setAvatarPickerPos({ top, left });
                    } else {
                      setAvatarPickerPos(null);
                    }
                    return next;
                  });
                }}
                type="button"
                style={isPastel
                  ? { touchAction: 'manipulation', background: 'transparent', border: 'none', padding: 0 }
                  : {
                      touchAction: 'manipulation',
                      ...(avatar ? { backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' } : {}),
                    }
                }
                className={
                  isPastel
                    ? "relative shrink-0 rounded-[18px]"
                    : `w-11 h-11 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-105 active:scale-95 ${avatar ? 'border' : 'bg-gradient-to-br from-indigo-300 to-violet-400'}`
                }
                title={t.changeAvatarTitle}
              >
                {isPastel ? (
                  <>
                    <FrostedEmoji emoji={avatar || "🎓"} size={56} tone="frost" />
                    {/* Palette badge — visual hint that the avatar tile
                        is also the customise entry point.  Tucked at the
                        trailing-bottom corner using `end-*` so it flips
                        in RTL. */}
                    <span
                      className="absolute -bottom-0.5 -end-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white"
                      style={{
                        color: pastelInk?.primary ?? '#5B21B6',
                        boxShadow: '0 4px 10px -4px rgba(60,40,120,0.4)',
                      }}
                    >
                      <Palette size={12} />
                    </span>
                  </>
                ) : avatar ? (
                  <span className="text-2xl leading-none">{avatar}</span>
                ) : (
                  <GraduationCap size={20} className="text-white" />
                )}
              </button>

              {/* Avatar picker popover — portaled so it escapes the
                  card's overflow-hidden clip + the dashboard stacking
                  context. */}
              {avatarPickerOpen && avatarPickerPos && onAvatarChange && createPortal(
                <div
                  ref={avatarPickerPortalRef}
                  style={{
                    backgroundColor: 'var(--vb-surface)',
                    borderColor: 'var(--vb-border)',
                    position: 'fixed',
                    top: avatarPickerPos.top,
                    left: avatarPickerPos.left,
                    zIndex: 1000,
                  }}
                  className="w-72 rounded-xl border shadow-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--vb-text-muted)' }}>{t.pickAvatarHeading}</span>
                    <button
                      onClick={() => setAvatarPickerOpen(false)}
                      type="button"
                      className="w-6 h-6 rounded-full hover:bg-[var(--vb-surface-alt)] flex items-center justify-center"
                    >
                      <X size={14} style={{ color: 'var(--vb-text-muted)' }} />
                    </button>
                  </div>

                  {/* Accent-colour swatch row — only shown in pastel mode
                      AND when the caller wired `onAccentChange`.  Lets
                      a teacher repaint the card tint without leaving
                      the inline picker. */}
                  {isPastel && onAccentChange && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--vb-text-muted)' }}>{t.accentColorHeading}</p>
                      <div className="flex gap-2">
                        {ACCENT_ORDER.map(name => {
                          const active = accent === name;
                          return (
                            <button
                              key={name}
                              type="button"
                              aria-label={name}
                              onClick={async () => {
                                await onAccentChange(name);
                              }}
                              className="aspect-square flex-1 rounded-xl border-0"
                              style={{
                                background: ACCENTS[name].bg,
                                boxShadow: active
                                  ? 'inset 0 0 0 2.5px #8B5CF6, 0 4px 10px -4px rgba(139,92,246,0.4)'
                                  : 'inset 0 0 0 1px rgba(0,0,0,0.04)',
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                    className={`w-full mb-3 px-3 py-2 rounded-lg flex items-center gap-2 transition-all border-2 ${
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
                </div>,
                document.body,
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
                    placeholder={t.classNamePlaceholder}
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
                    style={{ color: tintText?.primary ?? 'var(--vb-text-primary)' }}
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
                  style={isPastel
                    ? {
                        touchAction: 'manipulation',
                        color: tintText?.primary ?? 'var(--vb-text-secondary)',
                        backgroundColor: 'rgba(255,255,255,0.65)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                      }
                    : { touchAction: 'manipulation', color: tintText?.secondary ?? 'var(--vb-text-secondary)' }
                  }
                  className={isPastel
                    ? "group inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold font-mono tracking-wider transition-transform active:scale-95"
                    : "group inline-flex items-center gap-1.5 text-xs font-semibold font-mono tracking-wider transition-colors hover:text-[var(--vb-accent)]"
                  }
                  title={t.copyClassCodeTitle}
                >
                  <span>{code}</span>
                  {copiedCode === code ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="opacity-60 group-hover:opacity-100" />
                  )}
                </button>
                {studentCount !== undefined && (
                  <span
                    style={{ color: tintText?.muted ?? 'var(--vb-text-muted)' }}
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
          <div className="shrink-0" ref={menuRef}>
            <button
              ref={menuTriggerRef}
              onClick={() => {
                setMenuOpen(prev => {
                  const next = !prev;
                  if (next && menuTriggerRef.current) {
                    // Anchor the portaled menu to the trigger's
                    // right edge so the dropdown still aligns with
                    // the ⋮ button after escaping the card's
                    // overflow-hidden clip.  `mt-1` (4 px) matches
                    // the pre-portal spacing.
                    const rect = menuTriggerRef.current.getBoundingClientRect();
                    // Flip the menu above the trigger when the
                    // class card sits near the viewport bottom and
                    // the default below-anchored position would
                    // truncate the dropdown.  Estimate menu height
                    // generously (5 items × ~36 px + padding); the
                    // exact measure isn't worth a second render
                    // pass for a one-off layout decision.
                    const ESTIMATED_HEIGHT = 280;
                    const VIEWPORT_MARGIN = 12;
                    const fitsBelow =
                      rect.bottom + 4 + ESTIMATED_HEIGHT <= window.innerHeight - VIEWPORT_MARGIN;
                    const top = fitsBelow
                      ? rect.bottom + 4
                      : Math.max(VIEWPORT_MARGIN, rect.top - ESTIMATED_HEIGHT - 4);
                    setMenuPos({
                      top,
                      right: window.innerWidth - rect.right,
                    });
                  } else {
                    setMenuPos(null);
                  }
                  return next;
                });
              }}
              type="button"
              style={isPastel
                ? {
                    touchAction: 'manipulation',
                    color: tintText?.primary ?? 'var(--vb-text-muted)',
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  }
                : { touchAction: 'manipulation', color: tintText?.muted ?? 'var(--vb-text-muted)' }
              }
              className={isPastel
                ? "w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-95"
                : "w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--vb-surface-alt)] hover:text-[var(--vb-text-primary)]"
              }
              aria-label={t.classOptionsAria}
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && menuPos && createPortal(
              <div
                ref={menuPortalRef}
                style={{
                  backgroundColor: 'var(--vb-surface)',
                  borderColor: 'var(--vb-border)',
                  position: 'fixed',
                  top: menuPos.top,
                  right: menuPos.right,
                  zIndex: 1000,
                }}
                className="w-48 rounded-lg border shadow-lg py-1"
              >
                {/* Edit class — opens the full EditClassModal (name,
                    avatar, school branding).  Placed at the top of the
                    menu because it's the canonical "change anything"
                    entry point; inline name + avatar editing on the
                    card itself are shortcuts, but they don't expose
                    school branding which lives only in the modal. */}
                {onEdit && (
                  <button
                    onClick={() => { onEdit(); setMenuOpen(false); }}
                    type="button"
                    style={{ color: 'var(--vb-text-secondary)' }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--vb-surface-alt)]"
                  >
                    <Pencil size={14} className="text-violet-600" />
                    Edit class
                  </button>
                )}
                {onOpenRoster && (
                  <button
                    onClick={() => { onOpenRoster(); setMenuOpen(false); }}
                    type="button"
                    style={{ color: 'var(--vb-text-secondary)' }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--vb-surface-alt)]"
                  >
                    <Users size={14} className="text-fuchsia-600" />
                    Manage roster
                  </button>
                )}
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
                  onClick={() => { setShareClassMinuteOpen(true); setMenuOpen(false); }}
                  type="button"
                  style={{ color: 'var(--vb-text-secondary)' }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--vb-surface-alt)]"
                >
                  <Timer size={14} className="text-amber-600" />
                  Send Class Minute
                </button>
                <div className="h-px my-1" style={{ backgroundColor: 'var(--vb-border)' }} />
                <button
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  type="button"
                  style={{ color: 'var(--vb-danger)' }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--vb-danger-soft)]"
                >
                  <Trash2 size={14} />
                  {t.deleteClass}
                </button>
              </div>,
              document.body,
            )}
          </div>
        </div>

        {/* Primary action + assignments expand */}
        <div className="flex items-stretch gap-2">
          <button
            onClick={onAssign}
            type="button"
            style={isPastel
              ? {
                  touchAction: 'manipulation',
                  background: BRAND_GRADIENT,
                  color: '#fff',
                  boxShadow: '0 10px 22px -10px rgba(99,102,241,0.55)',
                }
              : {
                  touchAction: 'manipulation',
                  backgroundColor: 'var(--vb-accent)',
                  color: 'var(--vb-accent-text)',
                }
            }
            className={isPastel
              ? "flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-sm transition-transform active:scale-[0.98]"
              : "flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
            }
          >
            <Zap size={15} />
            {t.newAssignment}
          </button>
          {onOpenRoster && (
            <button
              onClick={onOpenRoster}
              type="button"
              style={isPastel
                ? {
                    touchAction: 'manipulation',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    color: tintText?.primary ?? 'var(--vb-text-secondary)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  }
                : {
                    touchAction: 'manipulation',
                    backgroundColor: 'var(--vb-surface-alt)',
                    color: 'var(--vb-text-secondary)',
                  }
              }
              className={isPastel
                ? "inline-flex items-center gap-1.5 py-3 px-4 rounded-full font-bold text-sm transition-transform active:scale-95"
                : "inline-flex items-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-sm transition-colors hover:opacity-90"
              }
              title={t.rosterButtonTitle}
              aria-label={t.rosterButtonAria}
            >
              <Users size={15} />
              <span className="hidden sm:inline">{t.rosterShortLabel}</span>
            </button>
          )}
          {assignments.length > 0 && (
            <button
              onClick={handleToggleAssignments}
              type="button"
              style={isPastel
                ? {
                    touchAction: 'manipulation',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    color: tintText?.primary ?? 'var(--vb-text-secondary)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  }
                : {
                    touchAction: 'manipulation',
                    backgroundColor: 'var(--vb-surface-alt)',
                    color: 'var(--vb-text-secondary)',
                  }
              }
              className={isPastel
                ? "inline-flex items-center gap-1.5 py-3 px-3 rounded-full font-bold text-sm transition-transform active:scale-95"
                : "inline-flex items-center gap-1.5 py-2.5 px-3 rounded-lg font-semibold text-sm transition-colors hover:opacity-90"
              }
              aria-expanded={showAssignments}
            >
              <BookOpen size={15} />
              <span>{assignments.length}</span>
              <ChevronDown size={14} className={`transition-transform ${showAssignments ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>
      </div>{/* /header-band */}

      {/* Assignments dropdown. The wrapper ref lets us auto-scroll the
          list into view when the teacher expands it — on a dashboard
          with many classes the dropdown often opens below the fold,
          so the click looked like a no-op unless the teacher remembered
          to scroll. */}
      {assignments.length > 0 && showAssignments && (
        <div
          ref={assignmentsListRef}
          style={{
            borderColor: isPastel ? 'rgba(255,255,255,0.4)' : 'var(--vb-border)',
            backgroundColor: isPastel ? 'rgba(255,255,255,0.55)' : 'var(--vb-surface-alt)',
            backdropFilter: isPastel ? 'blur(8px)' : undefined,
            WebkitBackdropFilter: isPastel ? 'blur(8px)' : undefined,
          }}
          className={isPastel
            ? "border-t px-5 py-4 space-y-2 rounded-b-[28px]"
            : "border-t px-5 py-4 space-y-2 rounded-b-xl"
          }
        >
          {assignments.map((assignment) => {
            const competition = competitionsByAssignment?.get(assignment.id) ?? null;
            return (
            <div
              key={assignment.id}
              style={{
                // Pastel dropdown sits on a frosted white-55 surface
                // against an accent gradient — bumping each row to
                // solid white lifts the title out of that wash.
                backgroundColor: isPastel ? '#fff' : 'var(--vb-surface)',
                borderColor: isPastel ? 'rgba(255,255,255,0.6)' : 'var(--vb-border)',
              }}
              // Stack title + buttons vertically.  Six action buttons
              // don't reliably fit beside a long assignment title on
              // a 2-up class-card grid, and the old `sm:flex-row`
              // layout squeezed the title column down to a 1-char
              // vertical stack of letters.  Stacking is one extra
              // row of vertical space but always readable.
              className="flex flex-col gap-2 p-3 rounded-lg border min-w-0"
            >
              <div className="min-w-0">
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
                  {subject === "hebrew"
                    ? `${assignment.wordIds.length} ${assignment.wordIds.length === 1 ? "מילה" : "מילים"}`
                    : `${assignment.wordIds.length} word${assignment.wordIds.length === 1 ? "" : "s"}`}
                  {" · "}
                  {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : "No deadline"}
                </p>
                {competition && (
                  <button
                    type="button"
                    onClick={() => setActiveCompetition(competition)}
                    className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full transition-transform active:scale-95 ${
                      competition.status === 'live'
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm'
                        : 'bg-stone-700 text-white'
                    }`}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <Trophy size={10} className="fill-current" />
                    {competition.status === 'live' ? tComp.badgeLive : tComp.badgeEnded}
                  </button>
                )}
              </div>
              {/* Buttons sit on their own row under the title (see
                  comment on parent).  flex-wrap covers the case where
                  even on one row the six buttons don't fit. */}
              <div className="flex flex-wrap gap-1.5 justify-end">
                <button
                  onClick={() => setSharingAssignment(assignment)}
                  type="button"
                  style={{
                    touchAction: 'manipulation',
                    backgroundColor: 'var(--vb-accent-soft)',
                    color: 'var(--vb-accent)',
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1 hover:opacity-90 transition-colors"
                  aria-label={t.shareAssignmentAria}
                  title={t.shareAssignmentTitle}
                >
                  <Share2 size={13} />
                  <span className="hidden sm:inline">{t.shareShortLabel}</span>
                </button>
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
                    aria-label={t.projectToClassAria}
                    title={t.projectToClassAria}
                  >
                    <Tv2 size={13} />
                    <span className="hidden sm:inline">{t.projectShortLabel}</span>
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
                    aria-label={t.printWorksheetAria}
                    title={t.printWorksheetAria}
                  >
                    <Printer size={13} />
                    <span className="hidden sm:inline">{t.printShortLabel}</span>
                  </button>
                )}
                {onDeleteAssignment && (
                  <button
                    onClick={() => onDeleteAssignment(assignment)}
                    type="button"
                    style={{ color: 'var(--vb-danger)' }}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors hover:bg-[var(--vb-danger-soft)]"
                    aria-label={t.deleteAssignmentAria}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            );
          })}
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
    <ShareClassLinkModal
      open={sharingAssignment !== null}
      onClose={() => setSharingAssignment(null)}
      className={name}
      code={code}
      assignmentId={sharingAssignment?.id}
      assignmentTitle={sharingAssignment?.title}
    />
    <ShareClassLinkModal
      open={shareClassMinuteOpen}
      onClose={() => setShareClassMinuteOpen(false)}
      className={name}
      code={code}
      playMode="class-minute"
    />
    {activeCompetition && (
      <CompetitionLeaderboardModal
        competition={activeCompetition}
        canEnd
        onClose={() => setActiveCompetition(null)}
        onEnded={() => setActiveCompetition(null)}
      />
    )}
    </>
  );
};

export default ClassCard;
