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
import { Suspense, lazy, useState } from "react";
import { motion } from "motion/react";
import { Activity, Brain } from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { supabase, type ProgressData, type AssignmentData, type ClassData } from "../core/supabase";
import type { View } from "../core/views";

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
  const [v2Tab, setV2Tab] = useState<V2Tab>(legacyToV2[initialTab]);

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
            takes over for thumb-reach. */}
        <div className="hidden sm:block sticky top-[72px] sm:top-[80px] z-30 bg-background/90 backdrop-blur-md border-b border-stone-100 mt-24 sm:mt-32">
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

        {/* Mobile spacer so content clears the TopAppBar. The top nav on
            desktop already adds that spacing via its own mt-24/mt-32. */}
        <div className="sm:hidden h-24" />

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
              />
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
              />
            )}
            {v2Tab === "reports" && (
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
