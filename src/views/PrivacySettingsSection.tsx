import React from "react";
import type { Dispatch, SetStateAction, ReactNode } from "react";
import { lazyWithRetry } from "../utils/lazyWithRetry";
import { LazyWrapper } from "../components/SuspenseWrapper";
import type { View } from "../core/views";
import type { AppUser } from "../core/supabase";
import type { ShowToast } from "../hooks/useToasts";

const PrivacySettingsView = lazyWithRetry(() => import("./PrivacySettingsView"));

type ConfirmDialog = { show: boolean; message: string; onConfirm: () => void };

type Args = {
  view: View;
  user: AppUser | null;
  consentModal: ReactNode;
  exitConfirmModal: ReactNode;
  setView: Dispatch<SetStateAction<View>>;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
  setConfirmDialog: Dispatch<SetStateAction<ConfirmDialog>>;
  showToast: ShowToast;
  /** From #905 — hard reset of the legal consent.  Clears localStorage
   *  acceptance and flips needsConsent so the gate appears in place
   *  (mostly a QA + "I want to re-accept" affordance). */
  setNeedsConsent: Dispatch<SetStateAction<boolean>>;
  /** Re-trigger the privacy-summary modal even if the user previously
   *  ticked "Don't show this again".  Wired from App.tsx via useConsent. */
  onReopenPrivacyReminder: () => void;
};

/**
 * Privacy-settings view. Lazy-loaded since it pulls in the consent
 * audit-log UI. Returns null when the view isn't matched so callers
 * can chain this with other view-branch helpers.
 */
export function renderPrivacySettingsSection(args: Args): React.ReactElement | null {
  if (!args.user || args.view !== "privacy-settings") return null;
  return (
    <LazyWrapper loadingMessage="Loading privacy settings...">
      <PrivacySettingsView
        user={args.user}
        consentModal={args.consentModal}
        exitConfirmModal={args.exitConfirmModal}
        setView={args.setView}
        setUser={args.setUser}
        setConfirmDialog={args.setConfirmDialog}
        showToast={args.showToast}
        setNeedsConsent={args.setNeedsConsent}
        onReopenPrivacyReminder={args.onReopenPrivacyReminder}
      />
    </LazyWrapper>
  );
}
