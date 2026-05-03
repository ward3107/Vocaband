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
 *
 * 2026-05 redesign: both layouts now sit inside the Worksheet/Class
 * Show "card chrome" — a max-w-5xl rounded-3xl card with shadow-2xl
 * over the surface-alt background. Tabs render as a pill row at the
 * top of the card body, and the page-level TopAppBar has been replaced
 * with the same in-card title + Back button used by Worksheet/Class
 * Show. Mobile bottom-nav stays outside the card by design.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Activity, ArrowLeft, Brain } from "lucide-react";
import { type ProgressData, type AssignmentData, type ClassData } from "../core/supabase";
import type { View } from "../core/views";
import StatChip from "../components/classroom/StatChip";
import ReportExportBar from "../components/classroom/ReportExportBar";
import ReportsDashboard from "../components/classroom/ReportsDashboard";
import TopStrugglingWords from "../components/classroom/TopStrugglingWords";
import AttendanceTable from "../components/classroom/AttendanceTable";
import { useLanguage } from "../hooks/useLanguage";
import { teacherClassroomT } from "../locales/teacher/classroom";
import { teacherViewsT } from "../locales/teacher/views";
import { useFirstTimeGuide } from "../hooks/useFirstTimeGuide";
import FirstTimeGuide from "../components/onboarding/FirstTimeGuide";
import GuideTriggerButton from "../components/onboarding/GuideTriggerButton";
import { teacherGuidesT } from "../locales/teacher/guides";

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
  // user is consumed by GradebookView/AnalyticsView via spread props below;
  // referenced in JSX so no unused-var warning.
  void user;

  const { language, dir } = useLanguage();
  const t = teacherClassroomT[language];
  const tViews = teacherViewsT[language];
  const guide = useFirstTimeGuide("classroom");
  const guideStrings = teacherGuidesT[language].classroom;

  // Tab metadata depends on `t` (labels + blurbs) so it has to live
  // inside the component.  Static gradients + emojis don't translate.
  const LEGACY_TABS: Array<{ id: LegacyTab; label: string; icon: React.ReactNode; gradient: string }> = [
    { id: "pulse",   label: t.tabPulse,   icon: <Activity size={16} />, gradient: "from-emerald-500 to-teal-600" },
    { id: "mastery", label: t.tabMastery, icon: <Brain size={16} />,    gradient: "from-violet-500 to-fuchsia-600" },
  ];
  const V2_TABS: Array<{
    id: V2Tab;
    emoji: string;
    label: string;
    gradient: string;
    blurb: string;
  }> = [
    { id: "today",       emoji: "🌡️", label: t.tabToday,       gradient: "from-indigo-500 to-violet-600",  blurb: t.blurbToday },
    { id: "students",    emoji: "👥", label: t.tabStudents,    gradient: "from-violet-500 to-fuchsia-600", blurb: t.blurbStudents },
    { id: "assignments", emoji: "📝", label: t.tabAssignments, gradient: "from-amber-500 to-orange-600",   blurb: t.blurbAssignments },
    { id: "reports",     emoji: "📊", label: t.tabReports,     gradient: "from-emerald-500 to-teal-600",   blurb: t.blurbReports },
  ];

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
        // replaceState (not pushState) so tab navigation doesn't pile
        // up entries in browser history.  The earlier pushState pattern
        // produced a real bug: clicking the in-app back arrow set view
        // to teacher-dashboard but the leftover ?tab= history entries
        // stayed in the stack.  Each subsequent browser-back popped one
        // of them, and once the user was past all tabs the next back
        // hit the dashboard back-button trap → exit confirmation →
        // accidental app exit.  With replaceState the URL still updates
        // (so deep-links + bookmarks work) but back/forward go straight
        // to the pre-classroom view.
        window.history.replaceState({ classroomTab: next }, "", url.toString());
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

  // Shared header chrome — title + Back button, identical to
  // WorksheetView so the teacher feels at home moving between flows.
  // Subtitle is tab-aware in v2 (active blurb), legacySubtitle for v1.
  const handleBack = useCallback(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState({ view: "teacher-dashboard" }, "", url.toString());
    } catch { /* non-browser env */ }
    setView("teacher-dashboard");
  }, [setView]);

  const cardHeader = (subtitle: string) => (
    <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl sm:text-4xl font-black mb-1" style={{ color: 'var(--vb-text-primary)' }}>
          {t.classroomTitle}
        </h1>
        <p className="text-sm sm:text-base truncate" style={{ color: 'var(--vb-text-secondary)' }}>
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <GuideTriggerButton onClick={guide.open} />
        <button
          type="button"
          onClick={handleBack}
          style={{
            borderColor: 'var(--vb-border)',
            color: 'var(--vb-text-secondary)',
            backgroundColor: 'var(--vb-surface)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent' as never,
          }}
          className="px-4 py-2 rounded-xl border-2 inline-flex items-center gap-2 hover:opacity-90"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">{tViews.backToDashboard}</span>
        </button>
      </div>
    </div>
  );

  if (CLASSROOM_V2) {
    const activeTabMeta = V2_TABS.find(tab => tab.id === v2Tab);
    return (
      <div
        dir={dir}
        className="min-h-screen p-4 sm:p-8 pb-28 sm:pb-12"
        style={{ backgroundColor: 'var(--vb-surface-alt)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
          className="max-w-5xl mx-auto rounded-3xl border shadow-2xl p-6 sm:p-10"
        >
          {cardHeader(activeTabMeta?.blurb ?? "")}

          {/* Tab pills — sit inside the card just under the header.
              Hidden on mobile where the fixed bottom-nav (outside the
              card, below) takes over thumb-reach duty. */}
          <div className="hidden sm:block mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
              {t.classroomSectionsAria}
            </h2>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
              {V2_TABS.map(tab => {
                const active = v2Tab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setV2Tab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                      active
                        ? `bg-gradient-to-br ${tab.gradient} text-white shadow-md`
                        : ""
                    }`}
                    style={{
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent" as never,
                      ...(active ? {} : { backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }),
                    }}
                    aria-pressed={active}
                  >
                    <span aria-hidden>{tab.emoji}</span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <motion.div
            key={v2Tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={
              <div className="text-center py-16 text-sm" style={{ color: 'var(--vb-text-muted)' }}>{t.loading}</div>
            }>
              {v2Tab === "today" && (
                <div className="mt-6 space-y-5">
                  {/* Stats row — three chips, dense.  ENROLLED was a fourth
                      chip but it was the same number as the "active /
                      enrolled" caption on the first chip, so teachers
                      saw the roster size twice in a row.  Folded into
                      the active-students caption instead. */}
                  <div className="grid grid-cols-3 gap-2">
                    <StatChip
                      value={`${todayStats.activeStudents}/${todayStats.rosterSize || "—"}`}
                      label={t.statActiveLabel}
                      tone="indigo"
                      tooltip={t.statActiveTooltip}
                    />
                    <StatChip
                      value={todayStats.avgScore == null ? "—" : `${todayStats.avgScore}%`}
                      label={t.statAvgScoreLabel}
                      score={todayStats.avgScore ?? undefined}
                      tone={todayStats.avgScore == null ? "stone" : undefined}
                      tooltip={t.statAvgScoreTooltip}
                    />
                    <StatChip
                      value={todayStats.playsThisWeek}
                      label={t.statPlaysLabel}
                      tone="violet"
                      tooltip={t.statPlaysTooltip}
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
                <div className="mt-6 space-y-4">
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
                  {/* "Who needs help" — moved here from Reports tab on
                      2026-04-28.  Lives next to the per-student roster
                      so the teacher's mental flow is "scan the table →
                      tap a low-attendance student → open their profile". */}
                  <AttendanceTable
                    classCode={classCode}
                    scores={allScores}
                    classStudents={classStudents}
                  />
                </div>
              )}
              {v2Tab === "assignments" && (
                <div className="mt-6 space-y-4">
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
                  {/* "What to reteach" — moved here from Reports tab on
                      2026-04-28.  The "Reteach these" button sends the
                      top-10 word IDs into the Create-Assignment wizard
                      pre-filled, closing the loop teachers couldn't
                      close before (they'd see the words on Reports and
                      have to recreate them by hand on Assignments). */}
                  <TopStrugglingWords
                    classCode={classCode}
                    scores={allScores}
                    classStudents={classStudents}
                    onCreateReteachAssignment={(wordIds) => {
                      // Use the currently-selected class if there is
                      // one, otherwise fall back to the first class
                      // that owns the picked class code (best-effort).
                      const target = classCode
                        ? classes.find(c => c.code === classCode) ?? selectedClass
                        : selectedClass;
                      if (target) setSelectedClass(target);
                      setSelectedWords(wordIds);
                      setView("create-assignment");
                    }}
                  />
                </div>
              )}
              {v2Tab === "reports" && (
                <div className="mt-6 space-y-4">
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
                  {/* Real Reports content — per-week trend, top struggling
                      words, plays/day histogram, attendance.  Sits between
                      the export bar (where teachers grab data) and the
                      legacy AnalyticsView (which keeps "what to reteach"
                      + the CSV-ish per-mode mastery view). */}
                  <ReportsDashboard
                    classCode={classCode}
                    scores={allScores}
                    assignments={teacherAssignments}
                    classStudents={classStudents}
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
        </motion.div>

        {/* Mobile-only bottom nav — fixed, four emoji tabs, finger-sized
            targets (≥44 px). Lives outside the card by design so the
            thumb can reach without scrolling. */}
        <nav
          aria-label={t.classroomSectionsAria}
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-md border-t pb-[env(safe-area-inset-bottom)]"
          style={{ backgroundColor: 'color-mix(in srgb, var(--vb-surface) 95%, transparent)', borderColor: 'var(--vb-border)' }}
        >
          <div className="flex">
            {V2_TABS.map(tab => {
              const active = v2Tab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setV2Tab(tab.id)}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors"
                  style={{
                    color: active ? 'var(--vb-text-primary)' : 'var(--vb-text-muted)',
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent" as never,
                    minHeight: 56,
                  }}
                  aria-pressed={active}
                  aria-label={tab.label}
                >
                  <span className={`text-2xl leading-none transition-transform ${active ? "scale-110" : ""}`} aria-hidden>
                    {tab.emoji}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <FirstTimeGuide
          isOpen={guide.isOpen}
          onDone={guide.dismiss}
          heading={guideStrings.heading}
          subheading={guideStrings.subheading}
          steps={guideStrings.steps}
        />
      </div>
    );
  }

  // ── Legacy 2-tab layout (default until VITE_CLASSROOM_V2=true) ─────────
  return (
    <div
      dir={dir}
      className="min-h-screen p-4 sm:p-8 pb-12"
      style={{ backgroundColor: 'var(--vb-surface-alt)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
        className="max-w-5xl mx-auto rounded-3xl border shadow-2xl p-6 sm:p-10"
      >
        {cardHeader(t.legacySubtitle)}

        {/* Tab pills inside the card. */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            {t.classroomSectionsAria}
          </h2>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
            {LEGACY_TABS.map(tab => {
              const active = legacyTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLegacyTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                    active ? `bg-gradient-to-br ${tab.gradient} text-white shadow-md` : ""
                  }`}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent" as never,
                    ...(active ? {} : { backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }),
                  }}
                  aria-pressed={active}
                >
                  {tab.icon}
                  {tab.label}
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
          className="mt-6"
        >
          <Suspense fallback={
            <div className="text-center py-16 text-sm" style={{ color: 'var(--vb-text-muted)' }}>{t.loading}</div>
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
      </motion.div>

      <FirstTimeGuide
        isOpen={guide.isOpen}
        onDone={guide.dismiss}
        heading={guideStrings.heading}
        subheading={guideStrings.subheading}
        steps={guideStrings.steps}
      />
    </div>
  );
}
