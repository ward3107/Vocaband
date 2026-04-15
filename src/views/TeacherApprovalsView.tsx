import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Check, RefreshCw, X, AlertTriangle, Info } from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { supabase } from "../core/supabase";
import type { View } from "../core/views";

interface PendingStudent {
  id: string;
  displayName: string;
  classCode: string;
  className: string;
  joinedAt: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; onClick: () => void };
}

interface TeacherApprovalsViewProps {
  user: { displayName?: string; avatar?: string } | null;
  pendingStudents: PendingStudent[];
  toasts: Toast[];
  consentModal: React.ReactNode;
  exitConfirmModal: React.ReactNode;
  setView: React.Dispatch<React.SetStateAction<View>>;
  loadPendingStudents: () => Promise<void> | void;
  handleApproveStudent: (id: string, displayName: string) => void;
  handleRejectStudent: (id: string, displayName: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function TeacherApprovalsView({
  user,
  pendingStudents,
  toasts,
  consentModal,
  exitConfirmModal,
  setView,
  loadPendingStudents,
  handleApproveStudent,
  handleRejectStudent,
  showToast,
}: TeacherApprovalsViewProps) {
  return (
    <div className="min-h-screen bg-surface pt-24 pb-8 px-4 sm:px-6">
      {consentModal}
      {exitConfirmModal}

      {/* Top App Bar */}
      <TopAppBar
        title="Student Approvals"
        subtitle={`Review and approve student signups`}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => supabase.auth.signOut()}
        showBack
        onBack={() => setView("teacher-dashboard")}
      />

      <div className="max-w-4xl mx-auto mt-8">
        {pendingStudents.length === 0 ? (
          <div className="bg-surface-container-low rounded-3xl p-12 text-center border-2 border-surface-container-high shadow-lg">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-black mb-2">All Caught Up!</h2>
            <p className="text-on-surface-variant font-medium mb-6">
              No students waiting for approval
            </p>
            <button
              onClick={() => setView("teacher-dashboard")}
              className="px-6 py-3 signature-gradient text-white rounded-xl font-bold hover:scale-105 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-black mb-1">
                  Pending Approvals
                </h1>
                <p className="text-on-surface-variant font-medium">
                  {pendingStudents.length} {pendingStudents.length === 1 ? 'student' : 'students'} waiting
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pendingStudents.length > 1 && (
                  <button
                    onClick={async () => {
                      const names = pendingStudents.map(s => s.displayName);
                      for (const student of pendingStudents) {
                        try {
                          await supabase.rpc('approve_student', { p_profile_id: student.id });
                        } catch (e) {
                          console.error('Failed to approve', student.displayName, e);
                        }
                      }
                      await loadPendingStudents();
                      showToast(`Approved ${names.length} students!`, "success");
                    }}
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:scale-105"
                    title="Approve all pending students at once"
                  >
                    <Check size={18} />
                    Approve All ({pendingStudents.length})
                  </button>
                )}
                <button
                  onClick={loadPendingStudents}
                  className="px-4 py-2.5 bg-surface-container-highest hover:bg-surface-container-high rounded-xl font-bold flex items-center gap-2 transition-all"
                  title="Refresh list"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {pendingStudents.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-container-low rounded-2xl p-6 border-2 border-surface-container-high shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Student Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center text-2xl font-bold">
                        🎓
                      </div>
                      <div>
                        <h3 className="text-xl font-black">{student.displayName}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="px-3 py-1 bg-surface-container-highest rounded-full text-xs font-bold">
                            {student.classCode}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            {student.className}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            Joined {new Date(student.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => handleApproveStudent(student.id, student.displayName)}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:scale-105"
                        title="Approve this student - they can then log in and start learning"
                      >
                        <Check size={20} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectStudent(student.id, student.displayName)}
                        className="px-6 py-3 bg-error-container hover:bg-error text-on-error-container rounded-xl font-bold transition-all flex items-center gap-2"
                        title="Reject this student - they'll need to sign up again"
                      >
                        <X size={20} />
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="mt-4 p-3 bg-surface-container-highest rounded-xl">
                    <p className="text-xs text-on-surface-variant">
                      ℹ️ <strong>After approval:</strong> {student.displayName} can log in with class code <code>{student.classCode}</code> and their full name. Their progress will be saved automatically.
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

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
              {toast.type === 'success' && <CheckCircle2 size={20} />}
              {toast.type === 'error' && <AlertTriangle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
