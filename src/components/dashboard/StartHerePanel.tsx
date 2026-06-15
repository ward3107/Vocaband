import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Compass } from "lucide-react";
import type { Language } from "../../hooks/useLanguage";
import { startHereT } from "../../locales/teacher/start-here";
import { scrollToDashboardSection, DASHBOARD_SECTION } from "./dashboardScroll";

const STORAGE_KEY = "vocaband_starthere_collapsed";

type GoalId = "play" | "setup" | "homework" | "progress";

interface GoalAction {
  label: string;
  run: () => void;
  /** Primary actions get the filled accent treatment. */
  primary?: boolean;
}

interface StartHerePanelProps {
  language: Language;
  isRTL: boolean;
  hasClasses: boolean;
  pendingStudentsCount: number;
  onNewClass: () => void;
  onClassroomClick: () => void;
  onApprovalsClick: () => void;
}

// Soft per-goal emoji-tile tints so the four goals read as distinct at a
// glance while staying inside the indigo→violet→fuchsia→amber→emerald
// brand family. Foreground stays the theme text token.
const GOAL_TINT: Record<GoalId, string> = {
  play: "linear-gradient(135deg,#EDE9FE 0%,#DDD6FE 100%)",
  setup: "linear-gradient(135deg,#DBEAFE 0%,#C7D8FF 100%)",
  homework: "linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%)",
  progress: "linear-gradient(135deg,#D1FAE5 0%,#A7F3D0 100%)",
};

const GOAL_EMOJI: Record<GoalId, string> = {
  play: "🎮",
  setup: "👥",
  homework: "📝",
  progress: "📊",
};

/**
 * Intent-based launcher pinned to the top of the English teacher
 * dashboard. Answers "where do I even start?" for a teacher who isn't
 * comfortable with software: four plain-language goals, each of which
 * expands into a one-paragraph explainer plus the buttons that take
 * them straight to the right tool. The existing card sections below
 * stay as the familiar "all tools" view.
 *
 * Routing is by section id (see dashboardScroll) so the real cards
 * remain the single source of truth — this panel never duplicates them.
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
  const [open, setOpen] = useState<GoalId | null>(null);
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

  const goals: { id: GoalId; title: string; blurb: string; explainer: string; actions: GoalAction[] }[] = [
    {
      id: "play",
      title: t.playTitle,
      blurb: t.playBlurb,
      explainer: t.playExplainer,
      actions: [
        { label: t.playLiveBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.liveGames), primary: true },
        { label: t.playRoomBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.classroomTools) },
      ],
    },
    {
      id: "setup",
      title: t.setupTitle,
      blurb: t.setupBlurb,
      explainer: t.setupExplainer,
      actions: [
        { label: t.setupCreateBtn, run: onNewClass, primary: true },
        { label: t.setupClassesBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.myClasses) },
      ],
    },
    {
      id: "homework",
      title: t.homeworkTitle,
      blurb: t.homeworkBlurb,
      explainer: t.homeworkExplainer,
      actions: hasClasses
        ? [{ label: t.homeworkClassesBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.myClasses), primary: true }]
        : [{ label: t.homeworkCreateBtn, run: onNewClass, primary: true }],
    },
    {
      id: "progress",
      title: t.progressTitle,
      blurb: t.progressBlurb,
      explainer: t.progressExplainer,
      actions: [
        { label: t.progressClassroomBtn, run: onClassroomClick, primary: true },
        ...(pendingStudentsCount > 0
          ? [{ label: t.progressApprovalsBtn, run: onApprovalsClick }]
          : []),
      ],
    },
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
          {/* Goal grid — compact two-up tiles. On phones the emoji is
              smaller and the chevron / blurb are hidden so the title
              gets the width it needs and stops wrapping word-by-word. */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:gap-3">
            {goals.map((g) => {
              const isActive = open === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setOpen(isActive ? null : g.id)}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    background: isActive ? "var(--vb-accent-soft)" : "var(--vb-surface-alt)",
                    border: `1.5px solid ${isActive ? "var(--vb-accent)" : "var(--vb-border)"}`,
                  }}
                  className="flex items-center gap-2.5 sm:gap-3 rounded-2xl sm:rounded-3xl px-2.5 py-2.5 sm:px-3.5 sm:py-3.5 text-start hover:-translate-y-0.5 transition-transform"
                  aria-expanded={isActive}
                >
                  <span
                    className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl text-[19px] sm:text-[22px] leading-none"
                    style={{ background: GOAL_TINT[g.id] }}
                  >
                    {GOAL_EMOJI[g.id]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-[13px] sm:text-[15px] font-bold leading-snug tracking-[-0.01em] line-clamp-2"
                      style={{ color: "var(--vb-text-primary)" }}
                    >
                      {g.title}
                    </span>
                    <span
                      className="mt-0.5 hidden sm:block text-[12px] leading-snug"
                      style={{ color: "var(--vb-text-muted)" }}
                    >
                      {g.blurb}
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`hidden sm:block shrink-0 transition-transform ${isActive ? "rotate-180" : ""}`}
                    style={{ color: "var(--vb-text-muted)" }}
                  />
                </button>
              );
            })}
          </div>

          {/* Expanded explainer + actions for the selected goal */}
          <AnimatePresence initial={false} mode="wait">
            {open && (() => {
              const g = goals.find((x) => x.id === open)!;
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-3 rounded-3xl p-4 sm:p-[18px]"
                    style={{ background: "var(--vb-surface-alt)", border: "1.5px solid var(--vb-border)" }}
                  >
                    <p
                      className="whitespace-pre-line text-[13px] sm:text-sm leading-relaxed"
                      style={{ color: "var(--vb-text-secondary)" }}
                    >
                      {g.explainer}
                    </p>
                    <div className={`mt-3.5 flex flex-wrap gap-2.5 ${isRTL ? "justify-end" : ""}`}>
                      {g.actions.map((a) => (
                        <button
                          key={a.label}
                          type="button"
                          onClick={() => {
                            a.run();
                            setOpen(null);
                          }}
                          style={
                            a.primary
                              ? {
                                  touchAction: "manipulation",
                                  WebkitTapHighlightColor: "transparent",
                                  background:
                                    "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
                                  color: "var(--vb-accent-text)",
                                  boxShadow: "0 10px 22px -10px color-mix(in srgb, var(--vb-accent), transparent 45%)",
                                }
                              : {
                                  touchAction: "manipulation",
                                  WebkitTapHighlightColor: "transparent",
                                  background: "var(--vb-surface)",
                                  color: "var(--vb-text-primary)",
                                  border: "1.5px solid var(--vb-border)",
                                }
                          }
                          className="inline-flex items-center rounded-full px-[18px] py-2.5 text-[13px] sm:text-sm font-bold active:scale-95 transition-transform"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </>
      )}
    </section>
  );
}
