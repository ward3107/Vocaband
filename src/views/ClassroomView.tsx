/**
 * ClassroomView — single entry point for Analytics + Gradebook under a
 * tabbed UI.
 *
 * Two layouts live here, gated by the `VITE_CLASSROOM_V2` env flag:
 *
 * 1. Legacy (flag OFF — default today): two tabs — Pulse and Mastery.
 *    Pulse renders the full GradebookView; Mastery renders the full
 *    AnalyticsView. Kept untouched so existing demos / pilots don't
 *    break while v2 is being validated.
 *
 * 2. v2 (flag ON): four task-oriented tabs — 🌡️ Today, 👥 Students,
 *    📝 Assignments, 📊 Reports. Each tab renders a slice of the
 *    existing views by passing `sections` into GradebookView; Reports
 *    renders AnalyticsView as-is. Desktop gets horizontal pill-tabs at
 *    the top; mobile gets a fixed bottom nav bar so tab switching is
 *    thumb-reachable.
 *
 * Legacy `initialTab` values ("pulse" / "mastery") still work — they
 * map onto the closest v2 tab when the flag is on.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Activity, Brain } from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { supabase, type ProgressData, type AssignmentData, type ClassData } from "../core/supabase";
import type { View } from "../core/views";
import StatChip from "../components/classroom/StatChip";
import ReportExportBar from "../components/classroom/ReportExportBar";

const AnalyticsView = lazy(() => import("./AnalyticsView"));
const GradebookView = lazy(() => import("./GradebookView"));

type LegacyTab = "pulse" | "mastery";
type V2Tab = "today" | "students" | "assignments" | "reports";

const CLASSROOM_V2 = import.meta.env.VITE_CLASSROOM_V2 === "true";

interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
}

interface ClassroomViewProps {
  user: { displayName?: string; avatar?: string } | null;
  allScores: ProgressData[];
  teacherAssignments: AssignmentData[];
  classStudents: ClassStudent[];
  classes: ClassData[];
  selectedClass: ClassData | null;
  setSelectedClass: React.Dispatch<React.SetStateAction<ClassData | null>>;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  expandedStudent: string | null;
  setExpandedStudent: (key: string | null) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  /** Legacy tab entry point — kept so /analytics and /gradebook button
   *  paths still land on something familiar. "pulse" -> "today" in v2,
   *  "mastery" -> "reports" in v2. */
  initialTab?: LegacyTab;
}

const LEGACY_TABS: Array<{ id: LegacyTab; label: string; icon: React.ReactNode; gradient: string }> = [
  { id: "pulse",   label: "Pulse",   icon: <Activity size={16} />, gradient: "from-emerald-500 to-teal-600" },
  { id: "mastery", label: "Mastery", icon: <Brain size={16} />,    gradient: "from-violet-500 to-fuchsia-600" },
];

const V2_TABS: Array<{
  id: V2Tab;
  emoji: string;
  label: string;
  gradient: string;
  blurb: string;
}> = [
  { id: "today",       emoji: "🌡️", label: "Today",       gradient: "from-indigo-500 to-violet-600",  blurb: "Who needs my attention today?" },
  { id: "students",    emoji: "👥", label: "Students",    gradient: "from-violet-500 to-fuchsia-600", blurb: "Deep-dive on one kid" },
  { id: "assignments", emoji: "📝", label: "Assignments", gradient: "from-amber-500 to-orange-600",   blurb: "How did my class do on this?" },
  { id: "reports",     emoji: "📊", label: "Reports",     gradient: "from-emerald-500 to-teal-600",   blurb: "Plan my next lesson" },
];

const legacyToV2: Record<LegacyTab, V2Tab> = {
  pulse: "today",
  mastery: "reports",
};

export default function ClassroomView(props: ClassroomViewProps) {
  const {
    user, allScores, teacherAssignments, classStudents, classes,
    selectedClass, setSelectedClass, selectedWords, setSelectedWords,
    expandedStudent, setExpandedStudent, setView, showToast,
    initialTab = "pulse",
  } = props;

  const [legacyTab, setLegacyTab] = useState<LegacyTab>(initialTab);

  // V2 tab state is mirrored into `?tab=…` so mobile back steps through
  // tabs (Reports → Assignments → Students → Today → teacher dashboard)
  // instead of escaping on the first tap.  Read the initial value from
  // the URL, fall back to legacy initialTab mapping.  The URL is the
  // single source of truth; setting the tab pushes a new history entry
  // so browser back / forward are wired up for free.
  const readTabFromUrl = (): V2Tab => {
    if (typeof window === "undefined") return legacyToV2[initialTab];
    const raw = new URLSearchParams(window.location.search).get("tab");
    if (raw === "today" || raw === "students" || raw === "assignments" || raw === "reports") {
      return raw;
    }
    return legacyToV2[initialTab];
  };
  const [v2Tab, setV2TabState] = useState<V2Tab>(readTabFromUrl);

  const setV2Tab = useCallback((next: V2Tab) => {
    setV2TabState(prev => {
      if (prev === next) return prev;
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", next);
        window.history.pushState({ classroomTab: next }, "", url.toString());
      } catch { /* non-browser env */ }
      return next;
    });
  }, []);

  // Walk tabs in reverse as the back button is pressed.  Keeps the
  // classroom experience self-contained on mobile; only once the user
  // is on the Today tab does back pop further up the stack (into the
  // teacher dashboard).
  useEffect(() => {
    if (!CLASSROOM_V2) return;
    const onPop = () => {
      const next = readTabFromUrl();
      setV2TabState(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared class selection across the v2 tabs so picking a class on
  // Today keeps it selected when the teacher jumps to Students /
  // Assignments / Reports. Stays in sync with whatever the parent
  // page passed in as `classes`.
  const [classCode, setClassCode] = useState<string>(() => classes[0]?.code ?? "");
  useEffect(() => {
    if (classes.length === 0) return;
    if (!classes.some(c => c.code === classCode)) {
      setClassCode(classes[0].code);
    }
  }, [classes, classCode]);

  // Derived stats for the Today tab — cheap and pure from props. Scoped
  // to the currently selected class only; "all classes" view isn't a
  // goal of Today (it's about a concrete class right now).
  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const classScores = useMemo(
    () => allScores.filter(s => s.classCode === classCode),
    [allScores, classCode]
  );
  const todayStats = useMemo(() => {
    const weekScores = classScores.filter(
      s => new Date(s.completedAt).getTime() >= sevenDaysAgoMs
    );
    const activeStudents = new Set(
      weekScores.map(s => s.studentName.trim().toLowerCase())
    ).size;
    const rosterSize = classStudents.filter(cs => cs.classCode === classCode).length;
    const avgScore = weekScores.length === 0
      ? null
      : Math.round(weekScores.reduce((sum, s) => sum + s.score, 0) / weekScores.length);
    const playsThisWeek = weekScores.length;
    return { activeStudents, rosterSize, avgScore, playsThisWeek };
    // sevenDaysAgoMs is computed inline on every render and is stable
    // enough for a stats panel; no memo dep on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classScores, classStudents, classCode]);

  if (CLASSROOM_V2) {
    return (
      <div className="min-h-screen bg-background pb-28 sm:pb-12">
        <TopAppBar
          title="Classroom"
          subtitle={V2_TABS.find(t => t.id === v2Tab)?.blurb.toUpperCase() ?? ""}
          showBack
          onBack={() => setView("teacher-dashboard")}
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />

        {/* Desktop/tablet top nav — hidden on mobile where the bottom nav
            takes over for thumb-reach.
            mt-32 sm:mt-40 = clear the TopAppBar's full height on every
            viewport (the previous mt-24/sm:mt-32 was a hair short and
            the top of the active-tab pill peeked above the AppBar's
            bottom edge — teacher screenshot showed that as a "cutoff").
            top-32 sm:top-40 keeps the same clearance applied to the
            sticky position so scrolled-content doesn't slide back
            under the AppBar either. */}
        <div className="hidden sm:block sticky top-32 sm:top-40 z-30 bg-background/90 backdrop-blur-md border-b border-stone-100 mt-32 sm:mt-40">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex gap-2 overflow-x-auto">
            {V2_TABS.map(t => {
              const active = v2Tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setV2Tab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                    active
                      ? `bg-gradient-to-br ${t.gradient} text-white shadow-md`
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                  aria-pressed={active}
                >
                  <span aria-hidden>{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile spacer so content clears the TopAppBar.  Bumped to
            h-32 to match the desktop top-nav offset. */}
        <div className="sm:hidden h-32" />

        <motion.div
          key={v2Tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Suspense fallback={
            <div className="text-center py-16 text-stone-400 text-sm">Loading…</div>
          }>
            {v2Tab === "today" && (
              <div className="pt-4 px-4 sm:px-6 max-w-5xl mx-auto space-y-5">
                {/* Stats row — three chips, dense.  ENROLLED was a fourth
                    chip but it was the same number as the "active /
                    enrolled" caption on the first chip, so teachers
                    saw the roster size twice in a row.  Folded into
                    the active-students caption instead. */}
                <div className="grid grid-cols-3 gap-2">
                  <StatChip
                    value={`${todayStats.activeStudents}/${todayStats.rosterSize || "—"}`}
                    label="active"
                    tone="indigo"
                    tooltip="Active = students who completed at least one game this week. The /N is the class roster total."
                  />
                  <StatChip
                    value={todayStats.avgScore == null ? "—" : `${todayStats.avgScore}%`}
                    label="avg score"
                    score={todayStats.avgScore ?? undefined}
                    tone={todayStats.avgScore == null ? "stone" : undefined}
                    tooltip="Mean score across every completed game in the last 7 days. Green ≥80, amber 50–79, rose under 50."
                  />
                  <StatChip
                    value={todayStats.playsThisWeek}
                    label="plays"
                    tone="violet"
                    tooltip="Every time a student finishes a game mode counts as one play. Last 7 days."
                  />
                </div>

                {/* The existing pulse cards + activity chart come from
                    GradebookView, sliced via the sections prop. Class
                    selection is controlled so switching tabs doesn't
                    lose the teacher's pick.  Export button is hidden
                    here (CSV + PDF now live exclusively on the Reports
                    tab per teacher feedback). */}
                <GradebookView
                  user={user}
                  allScores={allScores}
                  teacherAssignments={teacherAssignments}
                  classStudents={classStudents}
                  classes={classes}
                  expandedStudent={expandedStudent}
                  setExpandedStudent={setExpandedStudent}
                  setView={setView}
                  showToast={showToast}
                  embedded
                  sections={["pulse", "activity"]}
                  hideExport
                  selectedClassCode={classCode}
                  onSelectedClassChange={setClassCode}
                />
                {/* "Suggestions for today" action list was removed 2026-04-24 —
                    teachers found it cluttered the Today view and its three
                    inactive-student / most-missed-word / incomplete-assignment
                    rules already surface via the Students / Reports / Assignments
                    tabs directly. */}
              </div>
            )}
            {v2Tab === "students" && (
              <GradebookView
                user={user}
                allScores={allScores}
                teacherAssignments={teacherAssignments}
                classStudents={classStudents}
                classes={classes}
                expandedStudent={expandedStudent}
                setExpandedStudent={setExpandedStudent}
                setView={setView}
                showToast={showToast}
                embedded
                sections={["students"]}
                hideExport
                useDrawerDrill
                selectedClassCode={classCode}
                onSelectedClassChange={setClassCode}
              />
            )}
            {v2Tab === "assignments" && (
              <GradebookView
                user={user}
                allScores={allScores}
                teacherAssignments={teacherAssignments}
                classStudents={classStudents}
                classes={classes}
                expandedStudent={expandedStudent}
                setExpandedStudent={setExpandedStudent}
                setView={setView}
                showToast={showToast}
                embedded
                sections={["assignments"]}
                hideExport
                useDrawerDrill
                selectedClassCode={classCode}
                onSelectedClassChange={setClassCode}
              />
            )}
            {v2Tab === "reports" && (
              <div className="pt-4 px-4 sm:px-6 max-w-5xl mx-auto space-y-4">
                {/* Exports live on the Reports tab only — teachers asked
                    us to stop showing them on Today / Students because
                    they hunted for "where's the download" and found it
                    in three different places.  CSV + PDF both formatted
                    with the same underlying rows so the numbers line up. */}
                <ReportExportBar
                  classCode={classCode}
                  classes={classes}
                  scores={allScores}
                  assignments={teacherAssignments}
                  classStudents={classStudents}
                  showToast={showToast}
                />
                <AnalyticsView
                  user={user}
                  classes={classes}
                  allScores={allScores}
                  teacherAssignments={teacherAssignments}
                  setView={setView}
                  selectedClass={selectedClass}
                  setSelectedClass={setSelectedClass}
                  selectedWords={selectedWords}
                  setSelectedWords={setSelectedWords}
                  embedded
                />
              </div>
            )}
          </Suspense>
        </motion.div>

        {/* Mobile-only bottom nav — fixed, four emoji tabs, finger-sized
            targets (≥44 px). Replaces the desktop pill-bar on narrow
            screens. */}
        <nav
          aria-label="Classroom sections"
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex">
            {V2_TABS.map(t => {
              const active = v2Tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setV2Tab(t.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                    active ? "text-stone-900" : "text-stone-400"
                  }`}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent" as never,
                    minHeight: 56,
                  }}
                  aria-pressed={active}
                  aria-label={t.label}
                >
                  <span className={`text-2xl leading-none transition-transform ${active ? "scale-110" : ""}`} aria-hidden>
                    {t.emoji}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // ── Legacy 2-tab layout (default until VITE_CLASSROOM_V2=true) ─────────
  return (
    <div className="min-h-screen bg-background pb-12">
      <TopAppBar
        title="Classroom"
        subtitle="PULSE · MASTERY"
        showBack
        onBack={() => setView("teacher-dashboard")}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => supabase.auth.signOut()}
      />

      <div className="sticky top-[72px] sm:top-[80px] z-30 bg-background/90 backdrop-blur-md border-b border-stone-100 mt-24 sm:mt-32">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex gap-2 overflow-x-auto">
          {LEGACY_TABS.map(t => {
            const active = legacyTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setLegacyTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                  active
                    ? `bg-gradient-to-br ${t.gradient} text-white shadow-md`
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                aria-pressed={active}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        key={legacyTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Suspense fallback={
          <div className="text-center py-16 text-stone-400 text-sm">Loading…</div>
        }>
          {legacyTab === "mastery" ? (
            <AnalyticsView
              user={user}
              classes={classes}
              allScores={allScores}
              teacherAssignments={teacherAssignments}
              setView={setView}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              selectedWords={selectedWords}
              setSelectedWords={setSelectedWords}
              embedded
            />
          ) : (
            <GradebookView
              user={user}
              allScores={allScores}
              teacherAssignments={teacherAssignments}
              classStudents={classStudents}
              classes={classes}
              expandedStudent={expandedStudent}
              setExpandedStudent={setExpandedStudent}
              setView={setView}
              showToast={showToast}
              embedded
              focus="pulse"
            />
          )}
        </Suspense>
      </motion.div>
    </div>
  );
}
