import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IOSCard, IOSButton } from "../components/ios";
import { supabase, hasTeacherAccess, type AppUser } from "../core/supabase";
import { PRIVACY_POLICY_VERSION, DATA_CONTROLLER, DATA_COLLECTION_POINTS, THIRD_PARTY_REGISTRY, RETENTION_PERIODS } from "../config/privacy-config";
import type { View } from "../core/views";
import { useLanguage } from "../hooks/useLanguage";
import { privacySettingsT } from "../locales/privacy-settings";
import PushSettingsToggle from "../components/PushSettingsToggle";

// (Parent Weekly Digest opt-in was removed in the 2026-05-18 privacy
// review.  See migration 20260618000000_drop_parent_digest_stub.sql
// and PRIVACY_CHECKLIST §6.  Re-introduce alongside the worker + cron
// + privacy-policy disclosure if/when the Friday-digest feature ships.)

type ToastType = "success" | "error" | "info";

interface ConfirmDialogState {
  show: boolean;
  message: string;
  onConfirm: () => void;
}

interface PrivacySettingsViewProps {
  user: AppUser;
  consentModal: React.ReactNode;
  exitConfirmModal: React.ReactNode;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  showToast: (message: string, type?: ToastType) => void;
  /** From #905 — hard reset of the legal consent.  Clears localStorage
   *  acceptance and flips needsConsent on so the gate appears in place
   *  (no sign-out).  Useful for QA + users who want to formally
   *  re-accept. */
  setNeedsConsent: React.Dispatch<React.SetStateAction<boolean>>;
  /** Reopens the privacy-summary modal in reminder mode (no required
   *  "I agree" tick) even when the user previously ticked "Don't show
   *  this again".  Source-of-truth lives in useConsent.reopenReminder(). */
  onReopenPrivacyReminder: () => void;
}

export default function PrivacySettingsView({
  user, consentModal, exitConfirmModal, setView, setUser, setConfirmDialog, showToast,
  setNeedsConsent, onReopenPrivacyReminder,
}: PrivacySettingsViewProps) {
  const { language, dir, isRTL, textAlign } = useLanguage();
  const t = privacySettingsT[language];
  // Back chevron points backwards in the reading direction (flips in RTL).
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");

  const handleExportData = async () => {
    try {
      // Use the export_my_data RPC instead of building the export
      // client-side.  The RPC returns the COMPLETE export (including
      // classes_owned, consent_history, assignments_created, audit
      // log entries the user is actor / target of, student / teacher
      // profile rows, and AI usage counters) and writes an
      // audit_log entry for the access — both required under
      // תיקון 13 / PPA accountability.  Format version is bumped
      // alongside the underlying RPC (see migration
      // 20260522020000) so consumers can branch on
      // `export_format_version` if the schema evolves.
      const { data, error } = await supabase.rpc('export_my_data');
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocaband-data-${user.uid.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t.toastDataExported, "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast(t.toastExportFailed, "error");
    }
  };

  const handleDeleteAccount = async () => {
    setConfirmDialog({
      show: true,
      message: t.deleteConfirm,
      onConfirm: async () => {
        try {
          // Use the delete_my_account RPC instead of issuing two
          // direct DELETEs.  The RPC:
          //   - Writes the audit_log entry BEFORE deleting (so we
          //     keep a record even after the user is gone).
          //   - Branches on role: a teacher's account cascades to
          //     all owned classes / assignments / linked students,
          //     not just the users + progress rows that the old
          //     client-side path touched.
          //   - Explicitly deletes student_profiles and
          //     teacher_profiles (FK posture leaves them as orphans
          //     otherwise — see migration 20260522020000).
          //   - Deletes auth.users so email + login history don't
          //     survive in the auth schema.
          //   - Retains audit_log entries under GDPR Art. 17(3)(b)/(e)
          //     legal-retention exemption; they age out at 730 days.
          //   - Cleans up consent_log entries for the user.
          const { error } = await supabase.rpc('delete_my_account');
          if (error) throw error;
          localStorage.removeItem('vocaband_consent_version');
          await supabase.auth.signOut();
          showToast(t.toastAccountDeleted, "success");
        } catch (err) {
          console.error("Delete account error:", err);
          showToast(t.toastDeleteFailed, "error");
        }
        setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
      },
    });
  };

  const handleSaveName = async () => {
    const trimmed = newDisplayName.trim().slice(0, 30);
    if (!trimmed) return;
    try {
      const { error: updateErr } = await supabase.from('users').update({ display_name: trimmed }).eq('uid', user.uid);
      if (updateErr) throw updateErr;
      setUser(prev => prev ? { ...prev, displayName: trimmed } : prev);
      setEditingName(false);
      showToast(t.toastNameUpdated, "success");
    } catch {
      showToast(t.toastNameFailed, "error");
    }
  };

  // iOS grouped-list settings screen. Every section is an IOSCard on the
  // grouped background; colors come from the --ios-* tokens so the page
  // follows light/dark with the rest of the app instead of the old
  // hard-coded violet chrome.
  const consentVersion = localStorage.getItem('vocaband_consent_version');

  return (
    <div
      dir={dir}
      className="min-h-screen p-4 sm:p-6"
      style={{ background: "var(--ios-grouped-bg)" }}
    >
      {consentModal}
      {exitConfirmModal}
      <div className="max-w-2xl mx-auto">
        <div className="mb-1 flex items-center gap-3">
          <IOSButton
            variant="plain"
            size="sm"
            onClick={() => setView(hasTeacherAccess(user) ? "teacher-dashboard" : "student-dashboard")}
          >
            <BackChevron size={18} strokeWidth={2.5} aria-hidden /> {t.back}
          </IOSButton>
        </div>
        <h1
          className={`ios-large-title mb-6 mt-3 ${textAlign}`}
          style={{ color: "var(--ios-label)" }}
        >
          {t.pageTitle}
        </h1>

        {/* Push-notification on/off (self-hides unless enabled for the
            class + supported by the browser) */}
        <PushSettingsToggle user={user} />

        {/* Profile Info (editable name) */}
        <IOSCard header={t.profileTitle} className="mb-6">
          <div className="space-y-2 text-sm" style={{ color: "var(--ios-label-secondary)" }}>
            <p><strong style={{ color: "var(--ios-label)" }}>{t.role}</strong> {user.role}</p>
            <div className="flex items-center gap-2">
              <strong style={{ color: "var(--ios-label)" }}>{t.name}</strong>
              {editingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    id="privacy-display-name"
                    name="displayName"
                    autoComplete="name"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    maxLength={30}
                    className="flex-1 rounded-[8px] px-2.5 py-1.5 text-sm outline-none"
                    style={{
                      background: "var(--ios-fill-tertiary)",
                      color: "var(--ios-label)",
                      fontSize: "16px",
                    }}
                    autoFocus
                  />
                  <IOSButton variant="plain" size="sm" onClick={handleSaveName}>{t.save}</IOSButton>
                  <IOSButton variant="plain" size="sm" onClick={() => setEditingName(false)}>{t.cancel}</IOSButton>
                </div>
              ) : (
                <>
                  <span style={{ color: "var(--ios-label)" }}>{user.displayName}</span>
                  <IOSButton variant="plain" size="sm" onClick={() => { setNewDisplayName(user.displayName); setEditingName(true); }}>{t.edit}</IOSButton>
                </>
              )}
            </div>
            {user.email && <p><strong style={{ color: "var(--ios-label)" }}>{t.email}</strong> {user.email}</p>}
            {user.classCode && <p><strong style={{ color: "var(--ios-label)" }}>{t.classCode}</strong> {user.classCode}</p>}
          </div>
        </IOSCard>

        {/* What data we store */}
        <IOSCard header={t.whatDataTitle} className="mb-6">
          <div className="space-y-3">
            {DATA_COLLECTION_POINTS
              .filter(p => p.role === user.role || p.role === "both")
              .map((point, i, arr) => (
              <div
                key={i}
                className={`text-sm pb-2 ${i < arr.length - 1 ? "ios-hairline" : ""}`}
              >
                <p className="font-bold" style={{ color: "var(--ios-label)" }}>{point.location}</p>
                <p style={{ color: "var(--ios-label-secondary)" }}>{t.fieldsPrefix}{point.fields.join(", ")}</p>
                <p style={{ color: "var(--ios-label-secondary)" }}>{t.purposePrefix}{point.purpose}</p>
                <p className="text-xs" style={{ color: "var(--ios-label-tertiary)" }}>{point.mandatory ? t.required : t.optional}</p>
              </div>
            ))}
          </div>
        </IOSCard>

        {/* Third-party services */}
        <IOSCard header={t.thirdPartyTitle} className="mb-6">
          <div className="space-y-3">
            {THIRD_PARTY_REGISTRY.map((tp, i, arr) => (
              <div
                key={i}
                className={`text-sm pb-2 ${i < arr.length - 1 ? "ios-hairline" : ""}`}
              >
                <p className="font-bold" style={{ color: "var(--ios-label)" }}>{tp.name} <span className="font-normal" style={{ color: "var(--ios-label-tertiary)" }}>({tp.hostingRegion})</span></p>
                <p style={{ color: "var(--ios-label-secondary)" }}>{tp.purpose}</p>
                <p className="text-xs" style={{ color: "var(--ios-label-tertiary)" }}>{t.dataPrefix}{tp.dataCategories.join(", ")}</p>
              </div>
            ))}
          </div>
        </IOSCard>

        {/* Consent status */}
        <IOSCard header={t.consentStatusTitle} className="mb-6">
          <div className="text-sm space-y-1" style={{ color: "var(--ios-label-secondary)" }}>
            <p><strong style={{ color: "var(--ios-label)" }}>{t.currentPolicyVersion}</strong> {PRIVACY_POLICY_VERSION}</p>
            <p><strong style={{ color: "var(--ios-label)" }}>{t.yourAcceptedVersion}</strong> {consentVersion || t.notYetAccepted}</p>
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            <IOSButton type="button" variant="plain" size="sm" onClick={() => setView('public-privacy')}>{t.fullPrivacyPolicy}</IOSButton>
            <IOSButton type="button" variant="plain" size="sm" onClick={() => setView('public-terms')}>{t.termsOfService}</IOSButton>
          </div>
          {/* Two complementary affordances:
              - "Show privacy summary" (tinted) — reopens the informational
                reminder modal in reminder mode (no required tick).  Source:
                useConsent.reopenReminder() — clears the "don't show again"
                dismissal flag.
              - "Review consent again" (plain) — hard reset of legal consent:
                wipes localStorage acceptance + flips needsConsent so the gate
                appears in place.  Useful for QA and for users who want to
                formally re-accept without signing out.  No DB write until
                they re-accept.  */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <IOSButton
              type="button"
              variant="tinted"
              size="sm"
              onClick={onReopenPrivacyReminder}
            >
              {t.showPrivacySummary}
            </IOSButton>
            <IOSButton
              type="button"
              variant="plain"
              size="sm"
              onClick={() => {
                localStorage.removeItem('vocaband_consent_version');
                setNeedsConsent(true);
                showToast(t.toastConsentReset, "info");
              }}
            >
              {t.reviewConsentAgain}
            </IOSButton>
          </div>
          {consentVersion && (
            <div className="mt-2">
              <IOSButton
                variant="plain"
                size="sm"
                tint="var(--ios-red)"
                onClick={() => {
                  setConfirmDialog({
                    show: true,
                    message: t.withdrawConfirm,
                    onConfirm: async () => {
                      localStorage.removeItem('vocaband_consent_version');
                      if (user?.uid) {
                        try {
                          await supabase.from('consent_log').insert({
                            uid: user.uid,
                            policy_version: PRIVACY_POLICY_VERSION,
                            terms_version: PRIVACY_POLICY_VERSION,
                            action: 'withdraw',
                          });
                        } catch { /* non-critical — sign out regardless */ }
                      }
                      await supabase.auth.signOut();
                      setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
                    },
                  });
                }}
              >
                {t.withdrawConsent}
              </IOSButton>
            </div>
          )}
        </IOSCard>

        {/* Data export & deletion */}
        <IOSCard header={t.rightsTitle} footer={t.retentionNote(DATA_CONTROLLER.contactEmail, RETENTION_PERIODS.backupSupabasePlatformDays, RETENTION_PERIODS.backupOffsiteR2Days)} className="mb-6">
          <p className="text-sm mb-4" style={{ color: "var(--ios-label-secondary)" }}>{t.rightsIntro}</p>
          <div className="flex flex-wrap gap-2">
            <IOSButton variant="tinted" size="sm" onClick={handleExportData}>
              {t.downloadMyData}
            </IOSButton>
            <IOSButton variant="tinted" size="sm" tint="var(--ios-red)" onClick={handleDeleteAccount}>
              {t.deleteMyAccount}
            </IOSButton>
          </div>
        </IOSCard>
      </div>
    </div>
  );
}
