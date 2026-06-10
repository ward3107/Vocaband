import { useState } from "react";
import type { AssignmentData, ProgressData } from "../core/supabase";
import type { Word } from "../data/vocabulary";

/**
 * The student-side assignment cluster: the assignment currently being
 * played, the full list the student can pick from, their saved progress
 * rows, and the resolved word list for the active assignment. They load
 * and clear as a unit when a student enters or leaves a lesson, so they
 * live behind one hook rather than four loose useState calls.
 */
export function useStudentAssignmentData() {
  const [activeAssignment, setActiveAssignment] = useState<AssignmentData | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<AssignmentData[]>([]);
  const [studentProgress, setStudentProgress] = useState<ProgressData[]>([]);
  const [assignmentWords, setAssignmentWords] = useState<Word[]>([]);
  return {
    activeAssignment, setActiveAssignment,
    studentAssignments, setStudentAssignments,
    studentProgress, setStudentProgress,
    assignmentWords, setAssignmentWords,
  };
}
