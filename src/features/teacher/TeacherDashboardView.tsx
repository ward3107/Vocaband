import React from "react";
import {
  Users,
  CheckCircle2,
  BarChart3,
  Trophy,
  UserCircle,
  AlertTriangle,
  Plus,
  Copy,
  Check,
  MessageCircle,
  Info,
  LogOut,
  RefreshCw,
  QrCode,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import { useUI } from "../../shared/contexts/UIContext";
import * as authService from "../../services/authService";
import * as assignmentService from "../../services/assignmentService";
import * as quickPlayService from "../../services/quickPlayService";
import { ALL_WORDS, BAND_1_WORDS } from "../../data/vocabulary";
import type { Word } from "../../shared/types";
import type { ClassData, AssignmentData } from "../../shared/types";
import TopAppBar from "../../shared/components/TopAppBar";
import ActionCard from "../../shared/components/ActionCard";
import ClassCard from "./components/ClassCard";
import { HelpTooltip } from "../../shared/components/HelpTooltip";
import { ErrorTrackingPanel } from "../../shared/components/ErrorTrackingPanel";
import { SOCKET_EVENTS } from "../../core/types";
import type { Toast } from "../../shared/contexts/UIContext";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeacherDashboardViewProps {
  classes: ClassData[];
  teacherAssignments: AssignmentData[];
  setTeacherAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  pendingStudents: Array<{ id: string; displayName: string; classCode: string; className: string; joinedAt: string }>;
  selectedClass: ClassData | null;
  setSelectedClass: (c: ClassData | null) => void;
  setView: (view: string) => void;
  copiedCode: string | null;
  setCopiedCode: (code: string | null) => void;
  openDropdownClassId: string | null;
  setOpenDropdownClassId: (id: string | null) => void;
  showCreateClassModal: boolean;
  setShowCreateClassModal: (show: boolean) => void;
  newClassName: string;
  setNewClassName: (name: string) => void;
  createdClassCode: string | null;
  setCreatedClassCode: (code: string | null) => void;
  createdClassName: string;
  deleteConfirmModal: { id: string; title: string } | null;
  setDeleteConfirmModal: (modal: { id: string; title: string } | null) => void;
  rejectStudentModal: { id: string; displayName: string } | null;
  setRejectStudentModal: (modal: { id: string; displayName: string } | null) => void;
  endQuickPlayModal: boolean;
  setEndQuickPlayModal: (show: boolean) => void;
  quickPlayActiveSession: { id: string; sessionCode: string; wordIds: number[]; words: Word[] } | null;
  setQuickPlayActiveSession: (session: { id: string; sessionCode: string; wordIds: number[]; words: Word[] } | null) => void;
  setQuickPlaySelectedWords: (words: Word[]) => void;
  setQuickPlaySessionCode: (code: string | null) => void;
  setQuickPlayJoinedStudents: (students: { name: string; score: number; avatar: string }[]) => void;
  setQuickPlayCustomWords: (words: Map<string, { hebrew: string; arabic: string }>) => void;
  setQuickPlayAddingCustom: (set: Set<string>) => void;
  setQuickPlayTranslating: (set: Set<string>) => void;
  consentModal: React.ReactNode;
  toasts: Toast[];
  fetchScores: () => void;
  fetchTeacherAssignments: () => void;
  fetchStudents: () => void;
  handleCreateClass: () => void;
  handleDeleteClass: (classId: string) => void;
  loadPendingStudents: () => void;
  confirmRejectStudent: (studentId: string) => Promise<void>;
  setAssignmentStep: (step: number) => void;
  setSelectedWords: (words: number[]) => void;
  setAssignmentTitle: (title: string) => void;
  setAssignmentDeadline: (deadline: string) => void;
  setAssignmentModes: (modes: string[]) => void;
  setAssignmentSentences: (sentences: string[]) => void;
  setEditingAssignment: (assignment: AssignmentData | null) => void;
  setCustomWords: (words: Word[]) => void;
  setSentenceDifficulty: (difficulty: 1 | 2 | 3 | 4) => void;
  setSelectedLevel: (level: "Band 1" | "Band 2" | "Custom") => void;
  setIsLiveChallenge: (value: boolean) => void;
  socket: any;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeacherDashboardView({
  classes,
  teacherAssignments,
  setTeacherAssignments,
  pendingStudents,
  selectedClass,
  setSelectedClass,
  setView,
  copiedCode,
  setCopiedCode,
  openDropdownClassId,
  setOpenDropdownClassId,
  showCreateClassModal,
  setShowCreateClassModal,
  newClassName,
  setNewClassName,
  createdClassCode,
  setCreatedClassCode,
  createdClassName,
  deleteConfirmModal,
  setDeleteConfirmModal,
  rejectStudentModal,
  setRejectStudentModal,
  endQuickPlayModal,
  setEndQuickPlayModal,
  quickPlayActiveSession,
  setQuickPlayActiveSession,
  setQuickPlaySelectedWords,
  setQuickPlaySessionCode,
  setQuickPlayJoinedStudents,
  setQuickPlayCustomWords,
  setQuickPlayAddingCustom,
  setQuickPlayTranslating,
  consentModal,
  toasts,
  fetchScores,
  fetchTeacherAssignments,
  fetchStudents,
  handleCreateClass,
  handleDeleteClass,
  loadPendingStudents,
  confirmRejectStudent,
  setAssignmentStep,
  setSelectedWords,
  setAssignmentTitle,
  setAssignmentDeadline,
  setAssignmentModes,
  setAssignmentSentences,
  setEditingAssignment,
  setCustomWords,
  setSentenceDifficulty,
  setSelectedLevel,
  setIsLiveChallenge,
  socket,
}: TeacherDashboardViewProps) {
  const { user } = useAuth();
  const { showToast, confirmDialog, setConfirmDialog } = useUI();

  return (
    <>
    <div className="min-h-screen bg-surface pt-24 pb-8" style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        {consentModal}

      {/* Top App Bar */}
      <TopAppBar
        title="Vocaband"
        subtitle="ISRAELI ENGLISH CURRICULUM • BANDS VOCABULARY"
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => authService.signOut()}
      />

      <div className="" style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto' }}>
        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Quick Play */}
          <HelpTooltip className="h-full" content="Create a QR code for students to scan and play selected words - no login required!">
            <div className="h-full">
              <ActionCard
                icon={<QrCode size={24} />}
                iconBg="bg-indigo-100"
                iconColor="text-indigo-600"
                title="Quick Online Challenge"
                description="Generate QR code for instant play"
                buttonText="Create"
                buttonVariant="qr-purple"
                onClick={() => setView("quick-play-setup")}
              />
            </div>
          </HelpTooltip>

          {/* Live Challenge - Hidden */}
          {false && (
          <HelpTooltip className="h-full" content="Start a real-time vocabulary competition - students race to answer correctly!">
            <div className="h-full">
              <ActionCard
                icon={<RefreshCw size={24} />}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                title="Live Mode for Classes"
                description="Start a real-time vocabulary competition"
                buttonText="Start"
                buttonVariant="live-green"
                onClick={() => {
                  if (classes.length === 0) showToast("Create a class first!", "error");
                  else if (classes.length === 1) {
                    setSelectedClass(classes[0]);
                    setView("live-challenge");
                    setIsLiveChallenge(true);
                    if (socket) {
                      authService.getSession().then(({ data: { session } }) => {
                        const token = session?.access_token ?? "";
                        socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: classes[0].code, token });
                      });
                    }
                  } else {
                    setView("live-challenge-class-select");
                  }
                }}
              />
            </div>
          </HelpTooltip>
          )}

          {/* Analytics */}
          <HelpTooltip className="h-full" content="See every student's scores across all assignments, identify struggling students, track trends, and find the most-missed words">
            <div className="h-full">
              <ActionCard
                icon={<BarChart3 size={24} />}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                title="Classroom Analytics"
                description="Scores, trends & weak words"
                buttonText="View Insights"
                buttonVariant="analytics-blue"
                onClick={() => { fetchScores(); fetchTeacherAssignments(); setView("analytics"); }}
              />
            </div>
          </HelpTooltip>

          {/* Gradebook & Students */}
          <HelpTooltip className="h-full" content="View all students, track scores, progress, and activity history">
            <div className="h-full">
              <ActionCard
                icon={<Trophy size={24} />}
                iconBg="bg-amber-100"
                iconColor="text-amber-600"
                title="Students & Grades"
                description="All students & scores"
                buttonText="Open Gradebook"
                buttonVariant="gradebook-amber"
                onClick={() => { fetchScores(); fetchStudents(); setView("gradebook"); }}
              />
            </div>
          </HelpTooltip>

          {/* Student Approvals */}
          <HelpTooltip className="h-full" content="Approve students who signed up for your classes">
            <div className="h-full">
              <ActionCard
                icon={<UserCircle size={24} />}
                iconBg="bg-rose-100"
                iconColor="text-rose-600"
                title="Student Approvals"
                description={pendingStudents.length > 0 ? `${pendingStudents.length} waiting` : "No pending approvals"}
                buttonText={pendingStudents.length > 0 ? `Review (${pendingStudents.length})` : "Check"}
                buttonVariant={pendingStudents.length > 0 ? "secondary" : "rose"}
                onClick={() => { loadPendingStudents(); setView("teacher-approvals"); }}
                badge={pendingStudents.length > 0 ? pendingStudents.length : undefined}
              />
            </div>
          </HelpTooltip>
        </div>

        {/* My Classes Section */}
        <div className="bg-surface-container-low rounded-2xl p-6 mb-6 shadow-lg border-2 border-surface-container-high">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
              <Users className="text-primary" size={20} /> My Classes
            </h2>
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-black text-base flex items-center gap-2 active:scale-95 transition-all"
              aria-label="Create new class"
            >
              <Plus size={16} /> New Class
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-on-surface-variant" />
              </div>
              <p className="text-on-surface-variant font-medium">No classes yet. Create one to get a code!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {[...classes].reverse().map(c => {
                // Get assignments for this class
                const classAssignments = teacherAssignments.filter(a => a.classId === c.id);

                return (
                  <div key={c.id} style={{ minWidth: '300px' }}>
                    <ClassCard
                      name={c.name}
                      code={c.code}
                      copiedCode={copiedCode}
                      assignments={classAssignments}
                      openDropdownClassId={openDropdownClassId}
                      onToggleDropdown={setOpenDropdownClassId}
                      onAssign={() => { setSelectedClass(c); setView("create-assignment"); setAssignmentStep(1); setSelectedWords([]); setAssignmentTitle(""); setAssignmentDeadline(""); setAssignmentModes([]); setAssignmentSentences([]); setEditingAssignment(null); }}
                      onCopyCode={() => {
                        navigator.clipboard.writeText(c.code);
                        setCopiedCode(c.code);
                        setTimeout(() => setCopiedCode(null), 2000);
                      }}
                      onWhatsApp={() => {
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${c.name}" on Vocaband!\n\n🔑 Class Code:\n\n${c.code}\n\nCopy the code above and paste it in the app!`)}`,
                        '_blank'
                      );
                    }}
                    onDelete={() => handleDeleteClass(c.id)}
                    onEditAssignment={(assignment) => {
                      console.log('[EDIT BUTTON] Clicked! Assignment:', assignment);
                      console.log('[EDIT BUTTON] Current view before:', "teacher-dashboard");
                      setEditingAssignment(assignment);
                      const knownIds = assignment.wordIds.filter(id => ALL_WORDS.some(w => w.id === id));
                      const unknownWords: Word[] = (assignment.words ?? []).filter((w: Word) => !ALL_WORDS.some(aw => aw.id === w.id));
                      const customIds = unknownWords.map(w => w.id);
                      setSelectedWords([...assignment.wordIds, ...customIds]);
                      setCustomWords(unknownWords);
                      setAssignmentTitle(assignment.title);
                      setAssignmentDeadline(assignment.deadline || '');
                      setAssignmentModes(assignment.allowedModes ?? ["classic","listening","spelling","matching","true-false","flashcards","scramble","reverse","letter-sounds","sentence-builder"]);
                      setAssignmentSentences(assignment.sentences ?? []);
                      setSentenceDifficulty((assignment.sentenceDifficulty ?? 2) as 1 | 2 | 3 | 4);
                      if (knownIds.some(id => BAND_1_WORDS.some(w => w.id === id))) setSelectedLevel("Band 1");
                      else if (unknownWords.length > 0) setSelectedLevel("Custom");
                      else setSelectedLevel("Band 2");
                      setSelectedClass(c);
                      console.log('[EDIT BUTTON] Setting view to create-assignment');
                      setView("create-assignment");
                      console.log('[EDIT BUTTON] State updates queued');
                    }}
                    onDuplicateAssignment={(assignment) => {
                      console.log('[DUPLICATE BUTTON] Clicked! Assignment:', assignment);
                      setEditingAssignment(assignment);
                      const knownIds = assignment.wordIds.filter(id => ALL_WORDS.some(w => w.id === id));
                      const unknownWords: Word[] = (assignment.words ?? []).filter((w: Word) => !ALL_WORDS.some(aw => aw.id === w.id));
                      const customIds = unknownWords.map(w => w.id);
                      setSelectedWords([...assignment.wordIds, ...customIds]);
                      setCustomWords(unknownWords);
                      setAssignmentTitle(assignment.title + ' (copy)');
                      setAssignmentDeadline(assignment.deadline || '');
                      setAssignmentModes(assignment.allowedModes ?? ["classic","listening","spelling","matching","true-false","flashcards","scramble","reverse","letter-sounds","sentence-builder"]);
                      setAssignmentSentences(assignment.sentences ?? []);
                      setSentenceDifficulty((assignment.sentenceDifficulty ?? 2) as 1 | 2 | 3 | 4);
                      if (knownIds.some(id => BAND_1_WORDS.some(w => w.id === id))) setSelectedLevel("Band 1");
                      else if (unknownWords.length > 0) setSelectedLevel("Custom");
                      else setSelectedLevel("Band 2");
                      setSelectedClass(c);
                      setView("create-assignment");
                    }}
                    onDeleteAssignment={async (assignment) => {
                      try {
                        await assignmentService.deleteAssignment(assignment.id);
                        setTeacherAssignments(prev => prev.filter(a => a.id !== assignment.id));
                        showToast("Assignment deleted successfully", "success");
                      } catch (err: any) {
                        showToast("Failed to delete assignment: " + (err?.message || "Unknown error"), "error");
                      }
                    }}
                  />
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      </div>

      {/* Overlay Components - Modals, Toasts, and Panels */}
      {/* Create Class Modal */}
      <AnimatePresence>
        {showCreateClassModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-black mb-2">Create New Class</h2>
              <p className="text-stone-500 mb-6">Enter a name for your class (e.g. Grade 8-B)</p>
              <input
                autoFocus
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Class Name"
                maxLength={50}
                className="w-full px-6 py-4 rounded-2xl border-2 border-blue-100 focus:border-blue-600 outline-none mb-6 font-bold"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateClassModal(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-stone-400 hover:bg-stone-50 transition-colors border-2 border-stone-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateClass}
                  className="flex-1 py-4 bg-blue-700 text-white rounded-2xl font-bold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-100"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Class Created Success Modal */}
      <AnimatePresence>
        {createdClassCode && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-black mb-2">Class Created!</h2>
              <p className="text-stone-500 mb-6">Share this code with your students so they can join.</p>

              <div className="bg-gradient-to-br from-blue-50 to-stone-50 p-6 rounded-3xl border-2 border-blue-100 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-stone-100 rounded-full -ml-8 -mb-8 opacity-50"></div>
                <p className="text-5xl font-mono font-black text-blue-700 tracking-widest relative z-10">{createdClassCode}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${createdClassName} - Class Code: ${createdClassCode}`);
                    setCopiedCode(createdClassCode);
                    setTimeout(() => setCopiedCode(null), 2000);
                  }}
                  className="py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2 hover:scale-105 border-2 border-blue-200"
                >
                  {copiedCode === createdClassCode ? <Check size={20} className="text-blue-700" /> : <Copy size={20} />}
                  <span>Copy</span>
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${createdClassName}" on Vocaband!\n\n🔑 Class Code:\n\n${createdClassCode}\n\nCopy the code above and paste it in the app!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-4 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 hover:scale-105 shadow-lg shadow-green-100"
                >
                  <MessageCircle size={20} />
                  <span>WhatsApp</span>
                </a>
              </div>

              <button
                onClick={() => setCreatedClassCode(null)}
                className="w-full py-4 text-stone-500 font-bold hover:text-stone-700 hover:bg-stone-50 rounded-2xl transition-all"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Assignment Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-black mb-2">Delete Assignment?</h2>
              <p className="text-stone-500 mb-6">
                You're about to delete <strong>"{deleteConfirmModal.title}"</strong>. This action cannot be undone — all student progress and data for this assignment will be permanently removed.
              </p>
              <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
                ⚠️ Make sure you want to delete this assignment before continuing.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-colors border-2 border-stone-200"
                >
                  Keep Assignment
                </button>
                <button
                  onClick={async () => {
                    try {
                      await assignmentService.deleteAssignment(deleteConfirmModal.id);
                    } catch (err: any) {
                      showToast("Failed to delete: " + (err?.message || "Unknown error"), "error");
                      setDeleteConfirmModal(null);
                      return;
                    }
                    setTeacherAssignments(prev => prev.filter(x => x.id !== deleteConfirmModal.id));
                    showToast("Assignment deleted successfully", "success");
                    setDeleteConfirmModal(null);
                  }}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100"
                >
                  Delete Assignment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Student Confirmation Modal */}
      <AnimatePresence>
        {rejectStudentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-black mb-2">Reject Student?</h2>
              <p className="text-stone-500 mb-6">
                You're about to reject <strong>"{rejectStudentModal.displayName}"</strong>. They will need to sign up again with a new class code to join your class.
              </p>
              <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
                ⚠️ This action cannot be undone. The student's profile will be marked as rejected.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectStudentModal(null)}
                  className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all border-2 border-stone-200"
                >
                  Keep Student
                </button>
                <button
                  onClick={async () => {
                    await confirmRejectStudent(rejectStudentModal.id);
                    setRejectStudentModal(null);
                  }}
                  className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
                >
                  Reject Student
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* End Quick Play Session Confirmation Modal */}
      <AnimatePresence>
        {endQuickPlayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100]"
          >
            {console.log('[End Session Modal] Rendering modal, session:', quickPlayActiveSession)}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} />
              </div>
              <h2 className="text-2xl font-black mb-2">End Quick Play Session?</h2>
              <p className="text-stone-500 mb-6">
                Students will no longer be able to join this session using the code <strong>{quickPlayActiveSession?.sessionCode}</strong>. The session and all progress will be permanently ended.
              </p>
              <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
                ⚠️ Make sure all students have finished their games before ending.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log('[End Session] Keep Session clicked');
                    setEndQuickPlayModal(false);
                  }}
                  className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all border-2 border-stone-200"
                >
                  Keep Session
                </button>
                <button
                  onClick={async () => {
                    console.log('[End Session] Confirm button clicked');
                    console.log('[End Session] Session code:', quickPlayActiveSession?.sessionCode);
                    console.log('[End Session] Session ID:', quickPlayActiveSession?.id);

                    showToast("Ending session...", "info");

                    try {
                      await quickPlayService.endQuickPlaySession(quickPlayActiveSession!.sessionCode);
                    } catch (err: any) {
                      console.error('[End Session] Error:', err);
                      showToast("Failed to end session: " + (err?.message || "Unknown error"), "error");
                      setEndQuickPlayModal(false);
                      return;
                    }

                    console.log('[End Session] ✓ Session ended successfully');
                    setView("teacher-dashboard");
                    setQuickPlayActiveSession(null);
                    setQuickPlaySelectedWords([]);
                    setQuickPlaySessionCode(null);
                    setQuickPlayJoinedStudents([]);
                    setQuickPlayCustomWords(new Map());
                    setQuickPlayAddingCustom(new Set());
                    setQuickPlayTranslating(new Set());
                    showToast("Quick Play session ended", "success");
                    setEndQuickPlayModal(false);
                  }}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 min-w-[300px] ${
                toast.type === 'success' ? 'bg-green-600 text-white' :
                toast.type === 'error' ? 'bg-red-600 text-white' :
                'bg-blue-600 text-white'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 size={24} />}
              {toast.type === 'error' && <AlertTriangle size={24} />}
              {toast.type === 'info' && <Info size={24} />}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Error Tracking Panel (Debug Mode) */}
      <ErrorTrackingPanel />

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-black mb-3 text-stone-900">Confirm Action</h3>
              <p className="text-stone-600 mb-8">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: () => {} })}
                  className="flex-1 py-4 bg-stone-200 text-stone-700 rounded-2xl font-bold hover:bg-stone-300 transition-all border-2 border-blue-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
  );
}
