import type { Dispatch, SetStateAction } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import StudentAssignmentCard from "./StudentAssignmentCard";
import OfflineReadyBadge from "./OfflineReadyBadge";
import type { AssignmentData, CompetitionData, ProgressData } from "../../core/supabase";
import type { Word } from "../../data/vocabulary";
import type { View } from "../../core/views";
import { useLanguage } from "../../hooks/useLanguage";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { ARCADE_CARD } from "../arcade/theme";
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
  setView: Dispatch<SetStateAction<View>>;
  setShowModeSelection: (show: boolean) => void;
}

export default function StudentAssignmentsList({
  studentAssignments, studentProgress, studentDataLoading, userUid,
  competitionsByAssignment,
  setActiveAssignment, setAssignmentWords, setView, setShowModeSelection,
}: StudentAssignmentsListProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
  // Arcade theme: transparent container on the dark dashboard (so the
  // white heading + frosted cards read), gold/cyan accents. Falls back
  // to the v1 white-card chrome when off.
  const arcade = useFeatureFlag('arcade_hub', false);
  // Repainted with v1 chrome — hairline indigo border + soft shadow,
  // section-label eyebrow (violet dot + uppercase) above the title,
  // brand-violet accent on the BookOpen glyph instead of blue-700.
  return (
    <div
      className={arcade ? "rounded-2xl p-5 sm:p-8" : "rounded-2xl p-5 sm:p-8 bg-white border border-indigo-500/[0.10]"}
      style={
        arcade
          ? undefined
          : {
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
            }
      }
    >
      <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className={`mb-1.5 flex items-center gap-2 text-[11px] font-extrabold uppercase ${arcade ? 'tracking-widest text-cyan-200' : 'tracking-[0.14em] text-[#8B5CF6]'}`}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}
            />
            {t.yourAssignments}
          </div>
          <h2 className={`flex items-center gap-2 ${arcade ? 'text-lg font-extrabold text-white' : 'text-xl sm:text-2xl font-black tracking-[-0.01em] text-[#1F1147]'}`}>
            <BookOpen className={arcade ? 'text-white' : 'text-[#8B5CF6]'} size={22} /> {t.yourAssignments}
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
        <p className={arcade ? `${ARCADE_CARD} text-white/70 italic text-center py-10 px-4 text-base sm:text-sm` : "text-[#8B85AB] italic text-center py-10 text-base sm:text-sm"}>
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
              arcade={arcade}
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
