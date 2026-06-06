/**
 * Dev-only preview that mounts REAL teacher pages against fake data with
 * a live theme switcher, so the Daylight / Midnight / Graphite palettes
 * can be inspected without logging in as a teacher.
 *
 * Entry: http://localhost:5173/dev/teacher-theme
 *
 * Pages (switch bottom-left): Dashboard · Gradebook · Classroom · Library.
 * Theme (switch bottom-right): Daylight · Midnight · Graphite.
 *
 * Applies the active theme exactly like production — useApplyTeacherTheme
 * writes the palette to CSS custom properties and the theme's `bg` class
 * is set on the page root.  Library self-fetches (no auth here, so it
 * shows its themed empty/loading state — enough to eyeball chrome colors).
 * Gated behind `import.meta.env.DEV` in main.tsx.
 */
import { useState } from "react";
import { LanguageProvider } from "../hooks/useLanguage";
import EnglishDashboardLayout from "../components/dashboard/EnglishDashboardLayout";
import GradebookView from "../views/GradebookView";
import ClassroomView from "../views/ClassroomView";
import VocabularyLibraryView from "../views/VocabularyLibraryView";
import { useApplyTeacherTheme } from "../hooks/useApplyTeacherTheme";
import { TEACHER_DASHBOARD_THEMES } from "../constants/teacherDashboardThemes";
import type { ClassData, AssignmentData, ProgressData, AppUser } from "../core/supabase";
import type { View } from "../core/views";

const NOW = new Date().toISOString();

const FAKE_USER: AppUser = {
  uid: "preview-teacher",
  email: "teacher@example.com",
  role: "teacher",
  displayName: "Ms. Cohen",
  plan: "pro",
  coins: 0,
};

const FAKE_CLASSES: ClassData[] = [
  { id: "c1", name: "Class 7B", code: "ABCD12", teacherUid: "t1", avatar: "🦊", subject: "english", schoolName: null, schoolLogoUrl: null, backgroundColor: null },
  { id: "c2", name: "Class 8A", code: "WXYZ99", teacherUid: "t1", avatar: "🐼", subject: "english", schoolName: null, schoolLogoUrl: null, backgroundColor: null },
];

const FAKE_ASSIGNMENTS: AssignmentData[] = [
  { id: "a1", classId: "c1", wordIds: [1, 2, 3, 4, 5], title: "Unit 4 — Animals", allowedModes: ["classic", "listening", "spelling"], subject: "english", createdAt: NOW },
  { id: "a2", classId: "c1", wordIds: [10, 11, 12], title: "Unit 5 — Daily routine", allowedModes: ["classic", "matching"], subject: "english", createdAt: NOW },
  { id: "a3", classId: "c2", wordIds: [20, 21, 22, 23], title: "Unit 1 — Greetings", allowedModes: ["classic"], subject: "english", createdAt: NOW },
];

const FAKE_SCORES: ProgressData[] = [
  { id: "s1", studentName: "Dana", studentUid: "u1", assignmentId: "a1", classCode: "ABCD12", score: 92, mode: "classic", completedAt: NOW, avatar: "🦊", mistakes: [3] },
  { id: "s2", studentName: "Dana", studentUid: "u1", assignmentId: "a1", classCode: "ABCD12", score: 78, mode: "listening", completedAt: NOW, avatar: "🦊", mistakes: [2, 5] },
  { id: "s3", studentName: "Omar", studentUid: "u2", assignmentId: "a1", classCode: "ABCD12", score: 45, mode: "classic", completedAt: NOW, avatar: "🐼", mistakes: [1, 2, 4] },
  { id: "s4", studentName: "Lara", studentUid: "u3", assignmentId: "a2", classCode: "ABCD12", score: 88, mode: "matching", completedAt: NOW, avatar: "🐰" },
  { id: "s5", studentName: "Noa", studentUid: "u4", assignmentId: "a3", classCode: "WXYZ99", score: 64, mode: "classic", completedAt: NOW, avatar: "🐯", mistakes: [21] },
];

const FAKE_STUDENTS = [
  { name: "Dana", classCode: "ABCD12", lastActive: NOW },
  { name: "Omar", classCode: "ABCD12", lastActive: NOW },
  { name: "Lara", classCode: "ABCD12", lastActive: NOW },
  { name: "Noa", classCode: "WXYZ99", lastActive: NOW },
];

const noop = () => {};
const noopAsync = async () => {};
const showToast = (m: string) => console.log("[toast]", m);

type Page = "dashboard" | "gradebook" | "classroom" | "library";
const PAGES: Array<{ id: Page; label: string }> = [
  { id: "dashboard", label: "🏠 Dashboard" },
  { id: "gradebook", label: "📊 Gradebook" },
  { id: "classroom", label: "🎓 Classroom" },
  { id: "library", label: "📚 Library" },
];

export default function TeacherThemePreview() {
  const [themeId, setThemeId] = useState<string>("midnight");
  const [page, setPage] = useState<Page>("dashboard");

  // Shared bits the views need.
  const [, setView] = useState<View>("teacher-dashboard");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [openDropdownClassId, setOpenDropdownClassId] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(FAKE_CLASSES[0]);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);

  useApplyTeacherTheme(themeId);
  const theme = TEACHER_DASHBOARD_THEMES.find(t => t.id === themeId) ?? TEACHER_DASHBOARD_THEMES[0];

  return (
    <LanguageProvider>
      <div className={`min-h-screen ${theme.bg}`}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          {page === "dashboard" && (
            <EnglishDashboardLayout
              language="en"
              isRTL={false}
              isDark={theme.dark}
              classes={FAKE_CLASSES}
              teacherAssignments={FAKE_ASSIGNMENTS}
              competitionsByAssignment={new Map()}
              pendingStudentsCount={3}
              copiedCode={copiedCode}
              setCopiedCode={setCopiedCode}
              openDropdownClassId={openDropdownClassId}
              setOpenDropdownClassId={setOpenDropdownClassId}
              onQuickPlayClick={noop}
              onCategoryRaceClick={noop}
              onClassroomClick={() => setPage("classroom")}
              onApprovalsClick={noop}
              onWorksheetResultsClick={noop}
              onLibraryClick={() => setPage("library")}
              onNewClass={noop}
              onAssignClass={noop}
              onDeleteClass={noop}
              onEditClass={noop}
              onOpenRoster={noop}
              onNameChange={noopAsync}
              onAvatarChange={noopAsync}
              onEditAssignment={noop}
              onDuplicateAssignment={noop}
              onDeleteAssignment={noop}
              onProjectAssignmentToClass={noop}
              onPrintAssignmentWorksheet={noop}
            />
          )}

          {page === "gradebook" && (
            <GradebookView
              user={FAKE_USER}
              allScores={FAKE_SCORES}
              teacherAssignments={FAKE_ASSIGNMENTS}
              classStudents={FAKE_STUDENTS}
              classes={FAKE_CLASSES}
              expandedStudent={expandedStudent}
              setExpandedStudent={setExpandedStudent}
              setView={setView}
              showToast={showToast}
              embedded
            />
          )}

          {page === "classroom" && (
            <ClassroomView
              user={FAKE_USER}
              allScores={FAKE_SCORES}
              teacherAssignments={FAKE_ASSIGNMENTS}
              classStudents={FAKE_STUDENTS}
              classes={FAKE_CLASSES}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              selectedWords={selectedWords}
              setSelectedWords={setSelectedWords}
              expandedStudent={expandedStudent}
              setExpandedStudent={setExpandedStudent}
              setView={setView}
              showToast={showToast}
              subject="english"
            />
          )}

          {page === "library" && (
            <VocabularyLibraryView
              user={FAKE_USER}
              classes={FAKE_CLASSES}
              onBack={() => setPage("dashboard")}
              showToast={showToast}
            />
          )}
        </div>

        {/* DEV page switcher — floated bottom-start. */}
        <div className="fixed bottom-4 start-4 z-50 flex flex-col items-start gap-1.5 rounded-2xl border border-white/15 bg-black/55 p-2 backdrop-blur">
          <span className="px-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/60">DEV page</span>
          {PAGES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(p.id)}
              className={`w-full rounded-full px-3 py-1.5 text-start text-xs font-bold transition ${
                page === p.id ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* DEV theme switcher — floated bottom-end. */}
        <div className="fixed bottom-4 end-4 z-50 flex flex-col items-end gap-1.5 rounded-2xl border border-white/15 bg-black/55 p-2 backdrop-blur">
          <span className="px-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/60">DEV theme</span>
          {TEACHER_DASHBOARD_THEMES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className={`w-full rounded-full px-3 py-1.5 text-start text-xs font-bold transition ${
                themeId === t.id ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
      </div>
    </LanguageProvider>
  );
}
