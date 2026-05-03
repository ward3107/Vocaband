import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Check, RefreshCw, X, AlertTriangle, Info, GraduationCap } from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { supabase } from "../core/supabase";
import type { View } from "../core/views";
import { useLanguage } from "../hooks/useLanguage";
import { teacherViewsT } from "../locales/teacher/views";

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
  const { language, dir } = useLanguage();
  const t = teacherViewsT[language];
  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-4 sm:px-6" style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
      {consentModal}
      {exitConfirmModal}

      {/* Top App Bar */}
      <TopAppBar
        title={t.approvalsTitle}
        subtitle={t.approvalsSubtitle}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => supabase.auth.signOut()}
        showBack
        onBack={() => setView("teacher-dashboard")}
      />

      <div className="max-w-4xl mx-auto pt-2 sm:pt-4">
        {pendingStudents.length === 0 ? (
          /* Empty state — calm, friendly, matches the dashboard's
             dashed-border empty state rather than the old peach card. */
          <div
            className="border border-dashed rounded-2xl py-16 px-6 text-center"
            style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: 'var(--vb-text-primary)' }}>All caught up!</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--vb-text-muted)' }}>
              No students are waiting for approval right now.
            </p>
            <button
              onClick={() => setView("teacher-dashboard")}
              type="button"
              style={{ touchAction: 'manipulation', backgroundColor: 'var(--vb-accent)', color: 'var(--vb-accent-text)' }}
              className="inline-flex items-center gap-2 px-5 py-2.5 hover:opacity-90 rounded-xl font-semibold text-sm shadow-sm active:scale-95 transition-all"
            >
              {t.backToDashboard}
            </button>
          </div>
        ) : (
          <>
            {/* Header with count + actions */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--vb-text-primary)' }}>
                  Pending approvals
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--vb-text-muted)' }}>
                  {pendingStudents.length} {pendingStudents.length === 1 ? 'student' : 'students'} waiting for you to approve or reject.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadPendingStudents}
                  type="button"
                  style={{ touchAction: 'manipulation', backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-secondary)' }}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 hover:bg-[var(--vb-surface-alt)] border rounded-xl font-semibold text-sm active:scale-95 transition-all"
                  title="Refresh list"
                >
                  <RefreshCw size={15} />
                  <span className="hidden sm:inline">{t.refresh}</span>
                </button>
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
                      showToast(t.approvedNToast(names.length), "success");
                    }}
                    type="button"
                    style={{ touchAction: 'manipulation' }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm active:scale-95 transition-all"
                    title={t.approveAllTitle}
                  >
                    <Check size={15} />
                    {t.approveAllN(pendingStudents.length)}
                  </button>
                )}
              </div>
            </div>

            {/* Student cards */}
            <div className="space-y-3">
              {pendingStudents.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
                  className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Student identity */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
                        <GraduationCap size={20} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold truncate" style={{ color: 'var(--vb-text-primary)' }}>
                          {student.displayName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs" style={{ color: 'var(--vb-text-muted)' }}>
                          <span className="font-mono font-semibold" style={{ color: 'var(--vb-text-secondary)' }}>
                            {student.classCode}
                          </span>
                          <span>·</span>
                          <span className="truncate">{student.className}</span>
                          <span>·</span>
                          <span>{t.joinedOn(new Date(student.joinedAt).toLocaleDateString(language === 'he' ? 'he-IL' : language === 'ar' ? 'ar' : undefined))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Approve / Reject */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRejectStudent(student.id, student.displayName)}
                        type="button"
                        style={{ touchAction: 'manipulation', color: 'var(--vb-text-muted)' }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Reject this student — they'll need to sign up again"
                      >
                        <X size={16} />
                        <span className="hidden sm:inline">{t.rejectShort}</span>
                      </button>
                      <button
                        onClick={() => handleApproveStudent(student.id, student.displayName)}
                        type="button"
                        style={{ touchAction: 'manipulation' }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm active:scale-95 transition-all"
                        title={t.approveTitle}
                      >
                        <Check size={16} />
                        {t.approve}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom helper */}
            <div
              className="mt-6 p-4 border rounded-xl flex gap-3"
              style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}
            >
              <Info size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--vb-text-muted)' }} />
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--vb-text-secondary)' }}>
                After approval, students can log in immediately with their class code and start earning XP.
                Their progress is saved automatically.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 px-4 w-full max-w-md">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`px-5 py-3.5 rounded-2xl shadow-lg font-semibold text-sm flex items-center gap-2.5 ${
                toast.type === 'success' ? 'bg-emerald-600 text-white' :
                toast.type === 'error' ? 'bg-rose-600 text-white' :
                'bg-indigo-600 text-white'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 size={18} />}
              {toast.type === 'error' && <AlertTriangle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
