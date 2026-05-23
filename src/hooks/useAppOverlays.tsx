/**
 * The four "rendered-variable" JSX overlays that App.tsx passes to
 * whichever view branch hosts them:
 *
 *   - consentModal       — re-consent gate when the privacy policy
 *                          version bumps
 *   - exitConfirmModal   — hardware-back at the dashboard floor
 *   - classNotFoundBanner— sticky banner when a typed class code
 *                          doesn't exist
 *   - classSwitchModal   — confirm dialog when an approved student
 *                          types a different class code
 *
 * Each one was a small JSX const block; bundling them here gets the
 * markup out of App.tsx and out of the way of the view branches.
 */
import type { ReactNode } from 'react';
import type React from 'react';
import { supabase, type AppUser } from '../core/supabase';
import { PRIVACY_POLICY_VERSION } from '../config/privacy-config';
import { ConsentModal, ExitConfirmModal, ClassSwitchModal } from '../components/AppModals';
import { ClassNotFoundBanner } from '../components/ClassNotFoundBanner';
import type { View } from '../core/views';

export interface UseAppOverlaysDeps {
  user: AppUser | null;
  needsConsent: boolean;
  showOnboarding: boolean;
  consentChecked: boolean;
  setConsentChecked: React.Dispatch<React.SetStateAction<boolean>>;
  consentMode: 'consent' | 'reminder';
  dontShowAgain: boolean;
  setDontShowAgain: React.Dispatch<React.SetStateAction<boolean>>;
  recordConsent: (opts: { mode: 'consent' | 'reminder'; dontShowAgain: boolean }) => void;

  showExitConfirmModal: boolean;
  setShowExitConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  beginExitFlow: () => void;

  classNotFoundIntent: string | null;
  setClassNotFoundIntent: React.Dispatch<React.SetStateAction<string | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;

  pendingClassSwitch: {
    fromCode: string;
    fromClassName: string | null;
    toCode: string;
    toClassName: string | null;
    supabaseUser: { id: string; email?: string | null };
  } | null;
  handleConfirmClassSwitch: () => void;
  handleCancelClassSwitch: () => void;
}

export interface AppOverlays {
  consentModal: ReactNode;
  exitConfirmModal: ReactNode;
  classNotFoundBanner: ReactNode;
  classSwitchModal: ReactNode;
}

export function useAppOverlays(deps: UseAppOverlaysDeps): AppOverlays {
  const consentModal = (
    <ConsentModal
      show={deps.needsConsent && !!deps.user && !deps.showOnboarding}
      policyVersion={PRIVACY_POLICY_VERSION}
      mode={deps.consentMode}
      consentChecked={deps.consentChecked}
      onToggleChecked={deps.setConsentChecked}
      dontShowAgain={deps.dontShowAgain}
      onToggleDontShowAgain={deps.setDontShowAgain}
      onAccept={() => deps.recordConsent({ mode: deps.consentMode, dontShowAgain: deps.dontShowAgain })}
    />
  );

  const exitConfirmModal = (
    <ExitConfirmModal
      show={deps.showExitConfirmModal}
      onStay={() => deps.setShowExitConfirmModal(false)}
      onLeave={() => { deps.beginExitFlow(); supabase.auth.signOut().catch(() => {}); }}
      student={
        deps.user?.role === 'student' && !deps.user.isGuest
          ? { name: deps.user.displayName || '', classCode: deps.user.classCode ?? null }
          : null
      }
    />
  );

  const classNotFoundBanner = (
    <ClassNotFoundBanner
      classCode={deps.classNotFoundIntent}
      onDismiss={() => deps.setClassNotFoundIntent(null)}
      onSignOutAndLogin={async () => {
        deps.setClassNotFoundIntent(null);
        try { await supabase.auth.signOut(); } catch { /* noop */ }
        deps.setView('student-account-login');
      }}
    />
  );

  const classSwitchModal = (
    <ClassSwitchModal
      pendingClassSwitch={deps.pendingClassSwitch}
      onConfirm={deps.handleConfirmClassSwitch}
      onCancel={deps.handleCancelClassSwitch}
    />
  );

  return { consentModal, exitConfirmModal, classNotFoundBanner, classSwitchModal };
}
