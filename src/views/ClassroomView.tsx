/**
 * ClassroomView — single entry point that merges Analytics + Gradebook
 * under one view with three tabs.
 *
 * Why this exists: Analytics and Gradebook had drifted into ~40%
 * duplicate code (class picker, struggling-students concept, per-
 * student drill-down, reward action) and forced teachers to context-
 * switch between two pages. ClassroomView is a thin tab-router that
 * renders the existing AnalyticsView for one tab and GradebookView
 * for the other, plus a third "Pulse" tab that just delegates to
 * the Gradebook (which already has the pulse cards at the top).
 *
 * Implementation choice — wrapper rather than rewrite:
 *   * Avoids a 2,000-line refactor right before the demo.
 *   * Existing data flow / props / state in App.tsx don't need to
 *     change; both child views still get the same props they always
 *     did.
 *   * If we later want true unified components per tab (de-duped),
 *     we extract sections out of AnalyticsView / GradebookView one
 *     at a time without breaking this wrapper's contract.
 *
 * Tabs:
 *   1. Pulse    → GradebookView (its top section already shows the
 *                 3 pulse cards + activity chart)
 *   2. Mastery  → AnalyticsView (weak words + struggling students +
 *                 per-student modal with mastery)
 *   3. Records  → GradebookView, scrolled past the pulse section
 *                 (records table + CSV export)
 *
 * Tabs 1 + 3 both render GradebookView for now; the visual scroll
 * difference is purely a UX hint that they emphasise different parts
 * of the same page. Cleanup pass can split them properly later.
 */
import { Suspense, lazy, useState } from "react";
import { motion } from "motion/react";
import { Activity, Brain, FileSpreadsheet } from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { supabase, type ProgressData, type AssignmentData, type ClassData } from "../core/supabase";
import type { View } from "../core/views";
import type { Word } from "../data/vocabulary";

const AnalyticsView = lazy(() => import("./AnalyticsView"));
const GradebookView = lazy(() => import("./GradebookView"));

type Tab = "pulse" | "mastery" | "records";

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
  /** Defaults to "pulse" when entering Classroom from the dashboard,
   *  but the legacy /analytics → /gradebook button paths land on the
   *  matching tab so existing muscle memory still works. */
  initialTab?: Tab;
}

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode; gradient: string }> = [
  { id: "pulse",   label: "Pulse",   icon: <Activity size={16} />,        gradient: "from-emerald-500 to-teal-600" },
  { id: "mastery", label: "Mastery", icon: <Brain size={16} />,           gradient: "from-violet-500 to-fuchsia-600" },
  { id: "records", label: "Records", icon: <FileSpreadsheet size={16} />, gradient: "from-amber-500 to-orange-600" },
];

export default function ClassroomView(props: ClassroomViewProps) {
  const {
    user, allScores, teacherAssignments, classStudents, classes,
    selectedClass, setSelectedClass, selectedWords, setSelectedWords,
    expandedStudent, setExpandedStudent, setView, showToast,
    initialTab = "pulse",
  } = props;

  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="min-h-screen bg-background pb-12">
      <TopAppBar
        title="Classroom"
        subtitle="PULSE · MASTERY · RECORDS"
        showBack
        onBack={() => setView("teacher-dashboard")}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => supabase.auth.signOut()}
      />

      {/* Tab bar — sticky at the top so it stays visible while
          scrolling through the active tab's content. */}
      <div className="sticky top-[72px] sm:top-[80px] z-30 bg-background/90 backdrop-blur-md border-b border-stone-100 mt-24 sm:mt-32">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex gap-2 overflow-x-auto">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                  active
                    ? `bg-gradient-to-br ${t.gradient} text-white shadow-md`
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
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
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Suspense fallback={
          <div className="text-center py-16 text-stone-400 text-sm">Loading…</div>
        }>
          {tab === "mastery" ? (
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
              focus={tab === "records" ? "records" : "pulse"}
            />
          )}
        </Suspense>
      </motion.div>
    </div>
  );
}
