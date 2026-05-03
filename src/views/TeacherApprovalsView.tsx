import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Check, RefreshCw, X, AlertTriangle, Info, GraduationCap, ArrowLeft } from "lucide-react";
import { supabase } from "../core/supabase";
import type { View } from "../core/views";
import { useLanguage } from "../hooks/useLanguage";
import { teacherViewsT } from "../locales/teacher/views";
import { useFirstTimeGuide } from "../hooks/useFirstTimeGuide";
import FirstTimeGuide from "../components/onboarding/FirstTimeGuide";
import GuideTriggerButton from "../components/onboarding/GuideTriggerButton";
import { teacherGuidesT } from "../locales/teacher/guides";

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

/**
 * 2026-05 redesign — drops the page-level TopAppBar in favour of the
 * Worksheet/Class Show "card chrome" pattern. Title + Back live inside
 * the card header; per-student rows become a subtle inset (surface-alt)
 * since they're already nested inside the white surface card.
 */
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
  const guide = useFirstTimeGuide("approvals");
  const guideStrings = teacherGuidesT[language].approvals;
  // user is unused on the page itself now that TopAppBar is gone, but
  // we still accept it from the parent so adding the avatar back later
  // is a one-liner.  Reference it to silence the unused-prop warning.
  void user;

  return (
    <div dir={dir} className="min-h-screen p-4 sm:p-8" style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
      {consentModal}
      {exitConfirmModal}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
        className="max-w-5xl mx-auto rounded-3xl border shadow-2xl p-6 sm:p-10"
      >
        {/* Header — title + Back button, identical chrome to Worksheet. */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-black mb-1" style={{ color: 'var(--vb-text-primary)' }}>
              {t.approvalsTitle}
            </h1>
            <p className="text-sm sm:text-base truncate" style={{ color: 'var(--vb-text-secondary)' }}>
              {t.approvalsSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <GuideTriggerButton onClick={guide.open} />
            <button
              type="button"
              onClick={() => setView("teacher-dashboard")}
              style={{
                borderColor: 'var(--vb-border)',
                color: 'var(--vb-text-secondary)',
                backgroundColor: 'var(--vb-surface)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent' as never,
              }}
              className="px-4 py-2 rounded-xl border-2 inline-flex items-center gap-2 hover:opacity-90"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{t.backToDashboard}</span>
            </button>
          </div>
        </div>

        {pendingStudents.length === 0 ? (
          /* Empty state — calm, friendly, dashed border treatment now
             sits naturally inside the white surface card. */
          <div
            className="border border-dashed rounded-2xl py-16 px-6 text-center"
            style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: 'var(--vb-text-primary)' }}>{t.allCaughtUp}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--vb-text-muted)' }}>
              {t.allCaughtUpBlurb}
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
            {/* Section sub-header + count + actions */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--vb-text-muted)' }}>
                  {t.pendingApprovals}
                </h2>
                <p className="text-sm" style={{ color: 'var(--vb-text-muted)' }}>
                  {t.pendingSummary(pendingStudents.length)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadPendingStudents}
                  type="button"
                  style={{ touchAction: 'manipulation', backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-secondary)' }}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 hover:bg-[var(--vb-surface-alt)] border rounded-xl font-semibold text-sm active:scale-95 transition-all"
                  title={t.refreshTitle}
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

            {/* Student cards — surface-alt + border-2 so they read as
                inset rows inside the outer white card, not a card-in-card. */}
            <div className="space-y-3">
              {pendingStudents.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}
                  className="rounded-2xl border-2 transition-shadow p-4 sm:p-5"
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
                        title={t.rejectTitle}
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

            {/* Bottom helper — surface-alt inset to match the row cards. */}
            <div
              className="mt-6 p-4 border rounded-xl flex gap-3"
              style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}
            >
              <Info size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--vb-text-muted)' }} />
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--vb-text-secondary)' }}>
                {t.approvalsHelper}
              </p>
            </div>
          </>
        )}
      </motion.div>

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

      <FirstTimeGuide
        isOpen={guide.isOpen}
        onDone={guide.dismiss}
        heading={guideStrings.heading}
        subheading={guideStrings.subheading}
        steps={guideStrings.steps}
      />
    </div>
  );
}
