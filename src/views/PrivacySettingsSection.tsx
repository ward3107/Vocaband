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
  setNeedsConsent: Dispatch<SetStateAction<boolean>>;
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
      />
    </LazyWrapper>
  );
}
