import { BookOpen, RefreshCw } from "lucide-react";
import StudentAssignmentCard from "./StudentAssignmentCard";
import type { AssignmentData, ProgressData } from "../../core/supabase";
import type { Word } from "../../data/vocabulary";

interface StudentAssignmentsListProps {
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
  studentDataLoading: boolean;
  setActiveAssignment: (a: AssignmentData) => void;
  setAssignmentWords: (w: Word[]) => void;
  setView: (v: string) => void;
  setShowModeSelection: (show: boolean) => void;
}

export default function StudentAssignmentsList({
  studentAssignments, studentProgress, studentDataLoading,
  setActiveAssignment, setAssignmentWords, setView, setShowModeSelection,
}: StudentAssignmentsListProps) {
  return (
    <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] shadow-xl">
      <h2 className="text-xl sm:text-2xl font-black mb-5 sm:mb-6 flex items-center gap-2">
        <BookOpen className="text-blue-700" size={22} /> Your Assignments
      </h2>

      {/* Background loading indicator */}
      {studentDataLoading && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2 animate-pulse">
          <RefreshCw className="text-blue-700 animate-spin" size={16} />
          <span className="text-blue-800 font-bold text-sm">Loading your assignments...</span>
        </div>
      )}

      {studentAssignments.length === 0 && !studentDataLoading ? (
        <p className="text-stone-400 italic text-center py-10 text-base sm:text-sm">
          No assignments yet. Check back later!
        </p>
      ) : (
        <div className="space-y-5 sm:space-y-4">
          {studentAssignments.map((assignment, assignmentIdx) => (
            <StudentAssignmentCard
              key={assignment.id}
              assignment={assignment}
              assignmentIdx={assignmentIdx}
              studentProgress={studentProgress}
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
