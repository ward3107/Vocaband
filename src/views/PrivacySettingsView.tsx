import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase, hasTeacherAccess, type AppUser } from "../core/supabase";
import { PRIVACY_POLICY_VERSION, DATA_CONTROLLER, DATA_COLLECTION_POINTS, THIRD_PARTY_REGISTRY } from "../config/privacy-config";
import type { View } from "../core/views";
import { useLanguage } from "../hooks/useLanguage";
import { privacySettingsT } from "../locales/privacy-settings";

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
}

export default function PrivacySettingsView({
  user, consentModal, exitConfirmModal, setView, setUser, setConfirmDialog, showToast,
}: PrivacySettingsViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = privacySettingsT[language];
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");

  const handleExportData = async () => {
    try {
      // Use the export_my_data RPC instead of building the export
      // client-side.  The RPC returns the COMPLETE export (including
      // classes_owned, consent_history, assignments_created — which
      // the old client-side path silently dropped) and writes an
      // audit_log entry for the access — both required under
      // תיקון 13 / PPA accountability.
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
          //   - Cleans up consent_log entries for the user.
          // The old path left orphaned classes/assignments behind
          // for every teacher who deleted their account.
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

  return (
    <div dir={dir} className="min-h-screen bg-stone-100 p-4 sm:p-6">
      {consentModal}
      {exitConfirmModal}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView(hasTeacherAccess(user) ? "teacher-dashboard" : "student-dashboard")} className="text-stone-500 hover:text-stone-700 font-bold flex items-center gap-1">
            <ChevronRight className={isRTL ? "" : "rotate-180"} size={18} /> {t.back}
          </button>
          <h1 className="text-2xl font-black text-stone-900">{t.pageTitle}</h1>
        </div>

        {/* Profile Info (editable name) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">{t.profileTitle}</h2>
          <div className="space-y-2 text-sm text-stone-600">
            <p><strong>{t.role}</strong> {user.role}</p>
            <div className="flex items-center gap-2">
              <strong>{t.name}</strong>
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
                    className="border rounded-lg px-2 py-1 text-sm flex-1"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="text-blue-600 font-bold text-xs">{t.save}</button>
                  <button onClick={() => setEditingName(false)} className="signature-gradient text-white px-4 py-2 rounded-lg font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg">{t.cancel}</button>
                </div>
              ) : (
                <>
                  {user.displayName}
                  <button onClick={() => { setNewDisplayName(user.displayName); setEditingName(true); }} className="text-blue-600 text-xs font-bold ml-2">{t.edit}</button>
                </>
              )}
            </div>
            {user.email && <p><strong>{t.email}</strong> {user.email}</p>}
            {user.classCode && <p><strong>{t.classCode}</strong> {user.classCode}</p>}
          </div>
        </div>

        {/* What data we store */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">{t.whatDataTitle}</h2>
          <div className="space-y-3">
            {DATA_COLLECTION_POINTS
              .filter(p => p.role === user.role || p.role === "both")
              .map((point, i) => (
              <div key={i} className="text-sm border-b border-stone-100 pb-2 last:border-0">
                <p className="font-bold text-stone-700">{point.location}</p>
                <p className="text-stone-500">{t.fieldsPrefix}{point.fields.join(", ")}</p>
                <p className="text-stone-500">{t.purposePrefix}{point.purpose}</p>
                <p className="text-stone-400 text-xs">{point.mandatory ? t.required : t.optional}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Third-party services */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">{t.thirdPartyTitle}</h2>
          <div className="space-y-3">
            {THIRD_PARTY_REGISTRY.map((tp, i) => (
              <div key={i} className="text-sm border-b border-stone-100 pb-2 last:border-0">
                <p className="font-bold text-stone-700">{tp.name} <span className="text-stone-400 font-normal">({tp.hostingRegion})</span></p>
                <p className="text-stone-500">{tp.purpose}</p>
                <p className="text-stone-400 text-xs">{t.dataPrefix}{tp.dataCategories.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Consent status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">{t.consentStatusTitle}</h2>
          <div className="text-sm text-stone-600 space-y-1">
            <p><strong>{t.currentPolicyVersion}</strong> {PRIVACY_POLICY_VERSION}</p>
            <p><strong>{t.yourAcceptedVersion}</strong> {localStorage.getItem('vocaband_consent_version') || t.notYetAccepted}</p>
          </div>
          <div className="flex gap-3 mt-4">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-bold hover:underline">{t.fullPrivacyPolicy}</a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-bold hover:underline">{t.termsOfService}</a>
          </div>
          {localStorage.getItem('vocaband_consent_version') && (
            <button
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
              className="mt-3 text-red-500 text-sm font-bold hover:underline"
            >
              {t.withdrawConsent}
            </button>
          )}
        </div>

        {/* Data export & deletion */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">{t.rightsTitle}</h2>
          <p className="text-sm text-stone-500 mb-4">{t.rightsIntro}</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-200 transition-all"
            >
              {t.downloadMyData}
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-xl text-sm hover:bg-red-200 transition-all"
            >
              {t.deleteMyAccount}
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-3">
            {t.retentionNote(DATA_CONTROLLER.contactEmail)}
          </p>
        </div>
      </div>
    </div>
  );
}
