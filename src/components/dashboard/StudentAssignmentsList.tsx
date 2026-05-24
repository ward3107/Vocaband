import { BookOpen, RefreshCw } from "lucide-react";
import StudentAssignmentCard from "./StudentAssignmentCard";
import OfflineReadyBadge from "./OfflineReadyBadge";
import type { AssignmentData, CompetitionData, ProgressData } from "../../core/supabase";
import type { Word } from "../../data/vocabulary";
import type { View } from "../../core/views";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface StudentAssignmentsListProps {
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
  studentDataLoading: boolean;
  /** Student's uid — forwarded to each card so the rounds counter
   * reads from this student's localStorage bucket. */
  userUid: string;
  /** Optional map of competitions keyed by assignment id.  Cards
   *  whose assignment is in this map render the competition badge
   *  + open the leaderboard modal on tap.  Optional so callers that
   *  haven't wired the hook yet still render fine. */
  competitionsByAssignment?: Map<string, CompetitionData>;
  setActiveAssignment: (a: AssignmentData) => void;
  setAssignmentWords: (w: Word[]) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setShowModeSelection: (show: boolean) => void;
}

export default function StudentAssignmentsList({
  studentAssignments, studentProgress, studentDataLoading, userUid,
  competitionsByAssignment,
  setActiveAssignment, setAssignmentWords, setView, setShowModeSelection,
}: StudentAssignmentsListProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
  // Repainted with v1 chrome — hairline indigo border + soft shadow,
  // section-label eyebrow (violet dot + uppercase) above the title,
  // brand-violet accent on the BookOpen glyph instead of blue-700.
  return (
    <div
      className="rounded-2xl p-5 sm:p-8 bg-white border border-indigo-500/[0.10]"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
      }}
    >
      <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8B5CF6]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}
            />
            {t.yourAssignments}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-[-0.01em] text-[#1F1147] flex items-center gap-2">
            <BookOpen className="text-[#8B5CF6]" size={22} /> {t.yourAssignments}
          </h2>
        </div>
        <OfflineReadyBadge />
      </div>

      {/* Background loading indicator — repainted to match the v1
          tip / status callouts used elsewhere in the redesign. */}
      {studentDataLoading && (
        <div
          className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 animate-pulse"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.18)",
          }}
        >
          <RefreshCw className="text-[#8B5CF6] animate-spin" size={16} />
          <span className="text-[#4A3B7A] font-bold text-sm">{t.loadingAssignments}</span>
        </div>
      )}

      {studentAssignments.length === 0 && !studentDataLoading ? (
        <p className="text-[#8B85AB] italic text-center py-10 text-base sm:text-sm">
          {t.noAssignmentsYet}
        </p>
      ) : (
        <div className="space-y-5 sm:space-y-4">
          {studentAssignments.map((assignment, assignmentIdx) => (
            <StudentAssignmentCard
              key={assignment.id}
              assignment={assignment}
              assignmentIdx={assignmentIdx}
              studentProgress={studentProgress}
              userUid={userUid}
              competition={competitionsByAssignment?.get(assignment.id) ?? null}
              setActiveAssignment={setActiveAssignment}
              setAssignmentWords={setAssignmentWords}
              setView={setView}
              setShowModeSelection={setShowModeSelection}
            />
          ))}
        </div>
      )}
    </div>
  );
}
