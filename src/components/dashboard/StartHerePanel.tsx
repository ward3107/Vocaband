import { useState } from "react";
import { ChevronDown, Compass } from "lucide-react";
import type { Language } from "../../hooks/useLanguage";
import { startHereT } from "../../locales/teacher/start-here";
import { scrollToDashboardSection, DASHBOARD_SECTION } from "./dashboardScroll";
import HelpAskBox from "./HelpAskBox";

const STORAGE_KEY = "vocaband_starthere_collapsed";

type ChipId = "play" | "gamesDiff" | "setup" | "login" | "homework" | "progress" | "approvals";

interface StartHerePanelProps {
  language: Language;
  isRTL: boolean;
  hasClasses: boolean;
  pendingStudentsCount: number;
  onNewClass: () => void;
  onClassroomClick: () => void;
  onApprovalsClick: () => void;
}

// Soft per-chip tints so each shortcut reads as distinct at a glance
// while staying inside the indigo→violet→fuchsia→amber→emerald brand
// family. Foreground text stays the theme token.
const CHIP_TINT: Record<ChipId, string> = {
  play: "linear-gradient(135deg,#EDE9FE 0%,#DDD6FE 100%)",
  gamesDiff: "linear-gradient(135deg,#FCE7F3 0%,#FBCFE8 100%)",
  setup: "linear-gradient(135deg,#DBEAFE 0%,#C7D8FF 100%)",
  login: "linear-gradient(135deg,#E0E7FF 0%,#C7D2FE 100%)",
  homework: "linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%)",
  progress: "linear-gradient(135deg,#D1FAE5 0%,#A7F3D0 100%)",
  approvals: "linear-gradient(135deg,#CCFBF1 0%,#99F6E4 100%)",
};

const CHIP_EMOJI: Record<ChipId, string> = {
  play: "🎮",
  gamesDiff: "🎲",
  setup: "👥",
  login: "🔑",
  homework: "📝",
  progress: "📊",
  approvals: "✅",
};

/**
 * Intent-based launcher pinned to the top of the English teacher
 * dashboard. Two helpers in one card: an "ask anything" box (type or
 * speak → the AI answers and routes), and a row of small one-tap
 * shortcut chips that jump straight to the matching tool. No nested
 * dropdowns — every chip is a single tap that scrolls to (and flashes)
 * the real card below, which stays the single source of truth.
 */
export default function StartHerePanel({
  language,
  isRTL,
  hasClasses,
  pendingStudentsCount,
  onNewClass,
  onClassroomClick,
  onApprovalsClick,
}: StartHerePanelProps) {
  const t = startHereT[language];
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const setCollapsedPersisted = (next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  };

  // One tap → jump straight to the right tool. Setup + homework start at
  // "create a class" until the teacher has one (you can't assign work or
  // share a join code without a class); "how students log in" lands on
  // My Classes, where the class code / QR / join link live. The
  // approvals chip only appears when students are actually waiting.
  const goToClassesOrCreate = () =>
    hasClasses ? scrollToDashboardSection(DASHBOARD_SECTION.myClasses) : onNewClass();

  const chips: { id: ChipId; label: string; run: () => void }[] = [
    { id: "play", label: t.playTitle, run: () => scrollToDashboardSection(DASHBOARD_SECTION.liveGames) },
    { id: "gamesDiff", label: t.qGamesDiff, run: () => scrollToDashboardSection(DASHBOARD_SECTION.classroomTools) },
    { id: "setup", label: t.setupTitle, run: goToClassesOrCreate },
    { id: "login", label: t.qLogin, run: () => scrollToDashboardSection(DASHBOARD_SECTION.myClasses) },
    { id: "homework", label: t.homeworkTitle, run: goToClassesOrCreate },
    { id: "progress", label: t.progressTitle, run: onClassroomClick },
    ...(pendingStudentsCount > 0
      ? [{ id: "approvals" as const, label: t.progressApprovalsBtn, run: onApprovalsClick }]
      : []),
  ];

  return (
    <section
      className="mb-7 sm:mb-9 rounded-[28px] p-4 sm:p-5"
      style={{
        background: "var(--vb-surface)",
        border: "1.5px solid var(--vb-border)",
        boxShadow: "0 12px 28px -20px rgba(15,23,42,0.4)",
      }}
      data-tour="start-here"
    >
      {/* Header — Compass mark + heading + collapse toggle. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "var(--vb-accent-soft)", color: "var(--vb-accent)" }}
          >
            <Compass size={18} />
          </div>
          <div className="min-w-0">
            <div
              className="text-[15px] sm:text-lg font-extrabold tracking-[-0.01em] leading-tight"
              style={{ color: "var(--vb-text-primary)" }}
            >
              {t.heading}
            </div>
            {!collapsed && (
              <div className="mt-0.5 text-[12px] sm:text-[13px] leading-snug" style={{ color: "var(--vb-text-muted)" }}>
                {t.sub}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsedPersisted(!collapsed)}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", color: "var(--vb-text-muted)" }}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold hover:opacity-80 transition-opacity"
          aria-expanded={!collapsed}
        >
          {collapsed ? t.show : t.hide}
          <ChevronDown size={14} className={collapsed ? "" : "rotate-180"} />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Ask box — type or speak a question; the AI answers inline
              and offers a jump button. */}
          <HelpAskBox
            language={language}
            isRTL={isRTL}
            hasClasses={hasClasses}
            pendingStudentsCount={pendingStudentsCount}
            onNewClass={onNewClass}
            onClassroomClick={onClassroomClick}
            onApprovalsClick={onApprovalsClick}
          />

          {/* Shortcut chips — small emoji + short label squares. One tap
              jumps straight to the matching tool (and flashes it). No
              expanding dropdowns: the only thing that "opens" is the AI
              answer area above. */}
          <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={c.run}
                style={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  background: "var(--vb-surface-alt)",
                  border: "1.5px solid var(--vb-border)",
                }}
                className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2.5 sm:px-3 sm:py-3 text-start hover:-translate-y-0.5 active:scale-[0.98] transition-transform"
              >
                <span
                  className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl text-[19px] sm:text-[21px] leading-none"
                  style={{ background: CHIP_TINT[c.id] }}
                >
                  {CHIP_EMOJI[c.id]}
                </span>
                <span
                  className="min-w-0 flex-1 text-[12.5px] sm:text-[13px] font-bold leading-snug tracking-[-0.01em] line-clamp-2"
                  style={{ color: "var(--vb-text-primary)" }}
                >
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
