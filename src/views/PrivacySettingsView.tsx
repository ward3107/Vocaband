import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase, type AppUser } from "../core/supabase";
import { PRIVACY_POLICY_VERSION, DATA_CONTROLLER, DATA_COLLECTION_POINTS, THIRD_PARTY_REGISTRY } from "../config/privacy-config";
import type { View } from "../core/views";

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
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");

  const handleExportData = async () => {
    try {
      // Client-side data export — fetch user's own data via RLS-protected queries
      const [userResult, progressResult] = await Promise.all([
        supabase.from('users').select('*').eq('uid', user.uid).maybeSingle(),
        supabase.from('progress').select('*').eq('student_uid', user.uid),
      ]);
      const exportData = {
        exported_at: new Date().toISOString(),
        user: userResult.data,
        progress: progressResult.data ?? [],
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocaband-data-${user.uid.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data exported successfully!", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export data.", "error");
    }
  };

  const handleDeleteAccount = async () => {
    setConfirmDialog({
      show: true,
      message: "This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?",
      onConfirm: async () => {
        try {
          // Delete user's progress and profile
          await supabase.from('progress').delete().eq('student_uid', user.uid);
          await supabase.from('users').delete().eq('uid', user.uid);
          localStorage.removeItem('vocaband_consent_version');
          await supabase.auth.signOut();
          showToast("Account deleted successfully.", "success");
        } catch (err) {
          console.error("Delete account error:", err);
          showToast("Failed to delete account.", "error");
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
      showToast("Name updated!", "success");
    } catch {
      showToast("Failed to update name.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
      {consentModal}
      {exitConfirmModal}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView(user.role === "teacher" ? "teacher-dashboard" : "student-dashboard")} className="text-stone-500 hover:text-stone-700 font-bold flex items-center gap-1">
            <ChevronRight className="rotate-180" size={18} /> Back
          </button>
          <h1 className="text-2xl font-black text-stone-900">Privacy & Data Settings</h1>
        </div>

        {/* Profile Info (editable name) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">Your Profile</h2>
          <div className="space-y-2 text-sm text-stone-600">
            <p><strong>Role:</strong> {user.role}</p>
            <div className="flex items-center gap-2">
              <strong>Name:</strong>
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
                  <button onClick={handleSaveName} className="text-blue-600 font-bold text-xs">Save</button>
                  <button onClick={() => setEditingName(false)} className="signature-gradient text-white px-4 py-2 rounded-lg font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg">Cancel</button>
                </div>
              ) : (
                <>
                  {user.displayName}
                  <button onClick={() => { setNewDisplayName(user.displayName); setEditingName(true); }} className="text-blue-600 text-xs font-bold ml-2">Edit</button>
                </>
              )}
            </div>
            {user.email && <p><strong>Email:</strong> {user.email}</p>}
            {user.classCode && <p><strong>Class Code:</strong> {user.classCode}</p>}
          </div>
        </div>

        {/* What data we store */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">What Data We Store</h2>
          <div className="space-y-3">
            {DATA_COLLECTION_POINTS
              .filter(p => p.role === user.role || p.role === "both")
              .map((point, i) => (
              <div key={i} className="text-sm border-b border-stone-100 pb-2 last:border-0">
                <p className="font-bold text-stone-700">{point.location}</p>
                <p className="text-stone-500">Fields: {point.fields.join(", ")}</p>
                <p className="text-stone-500">Purpose: {point.purpose}</p>
                <p className="text-stone-400 text-xs">{point.mandatory ? "Required" : "Optional"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Third-party services */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">Third-Party Services</h2>
          <div className="space-y-3">
            {THIRD_PARTY_REGISTRY.map((tp, i) => (
              <div key={i} className="text-sm border-b border-stone-100 pb-2 last:border-0">
                <p className="font-bold text-stone-700">{tp.name} <span className="text-stone-400 font-normal">({tp.hostingRegion})</span></p>
                <p className="text-stone-500">{tp.purpose}</p>
                <p className="text-stone-400 text-xs">Data: {tp.dataCategories.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Consent status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">Consent Status</h2>
          <div className="text-sm text-stone-600 space-y-1">
            <p><strong>Current policy version:</strong> {PRIVACY_POLICY_VERSION}</p>
            <p><strong>Your accepted version:</strong> {localStorage.getItem('vocaband_consent_version') || "Not yet accepted"}</p>
          </div>
          <div className="flex gap-3 mt-4">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-bold hover:underline">Full Privacy Policy</a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-bold hover:underline">Terms of Service</a>
          </div>
          {localStorage.getItem('vocaband_consent_version') && (
            <button
              onClick={() => {
                setConfirmDialog({
                  show: true,
                  message: "Withdrawing consent will log you out. You can re-accept when you log in again. Continue?",
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
              Withdraw Consent
            </button>
          )}
        </div>

        {/* Data export & deletion */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-stone-800 mb-3">Your Data Rights</h2>
          <p className="text-sm text-stone-500 mb-4">Under Israeli privacy law (PPA Amendment 13), you have the right to access, correct, and delete your personal data.</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-200 transition-all"
            >
              Download My Data (JSON)
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-xl text-sm hover:bg-red-200 transition-all"
            >
              Delete My Account
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-3">
            Note: Data in encrypted backups may be retained for up to 30 days after deletion.
            Contact {DATA_CONTROLLER.contactEmail} for questions.
          </p>
        </div>
      </div>
    </div>
  );
}
