/**
 * Three JSX-const overlays that need to be available BEFORE the
 * heavier useAppOverlays (consent/exit-confirm/etc.) — they sit on
 * top of the public/auth views that render before the user is
 * authenticated.
 *
 *   - cookieBannerOverlay  — first-visit cookie banner + global
 *                            QuickPlayResumeBanner + OfflineIndicator
 *   - ocrCropModal         — image crop modal when a teacher picks a
 *                            photo for OCR (null until ocrPendingFile)
 *   - configErrorBanner    — red banner when Supabase env vars are
 *                            missing
 */
import { Suspense, type ReactNode } from 'react';
import type React from 'react';
import { OfflineIndicator } from '../components/OfflineIndicator';
import SvgAlertTriangle from '../components/svg/SvgAlertTriangle';
import { isSupabaseConfigured } from '../core/supabase';
import type { AppUser } from '../core/supabase';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const CookieBanner = lazyWithRetry(() => import('../components/CookieBanner'));
const QuickPlayResumeBanner = lazyWithRetry(() => import('../components/QuickPlayResumeBanner'));
const ImageCropModal = lazyWithRetry(() => import('../components/ImageCropModal'));
// PwaInstallGate + InAppBrowserWarning intentionally NOT mounted here:
// cookieBannerOverlay is only rendered by public + auth-flow view branches
// in App.tsx, so housing them here meant they never appeared on the
// dashboards where real users spend their time. They now mount once as a
// sibling of <App /> in main.tsx — see src/components/GlobalOverlays.tsx.

export interface UseAppPreOverlaysDeps {
  user: AppUser | null;
  showCookieBanner: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleCookieAccept: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleCookieCustomize: any;
  handleCookieReject: () => void;
  qpResumeSuppress: boolean;
  ocrPendingFile: { file: File; inputRef: React.ChangeEvent<HTMLInputElement> | null } | null;
  setOcrPendingFile: React.Dispatch<
    React.SetStateAction<{ file: File; inputRef: React.ChangeEvent<HTMLInputElement> | null } | null>
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processOcrFile: (file: File, inputRef?: any) => void;
}

export interface AppPreOverlays {
  cookieBannerOverlay: ReactNode;
  ocrCropModal: ReactNode;
  configErrorBanner: ReactNode;
}

export function useAppPreOverlays(deps: UseAppPreOverlaysDeps): AppPreOverlays {
  const cookieBannerOverlay = (
    <>
      {deps.showCookieBanner && !deps.user && (
        <Suspense fallback={null}>
          <CookieBanner
            onAccept={deps.handleCookieAccept}
            onCustomize={deps.handleCookieCustomize}
            onReject={deps.handleCookieReject}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <QuickPlayResumeBanner suppress={deps.qpResumeSuppress} />
      </Suspense>
      {/* Global amber pill when the browser reports the network is down.
          See OfflineIndicator + useOnlineStatus for the implementation. */}
      <OfflineIndicator />
    </>
  );

  // OCR crop modal — shown when a teacher picks a photo, before upload.
  const ocrCropModal = deps.ocrPendingFile ? (
    <Suspense fallback={null}>
      <ImageCropModal
        file={deps.ocrPendingFile.file}
        onConfirm={(croppedFile) => deps.processOcrFile(croppedFile, deps.ocrPendingFile?.inputRef)}
        onCancel={() => {
          if (deps.ocrPendingFile?.inputRef?.target) deps.ocrPendingFile.inputRef.target.value = '';
          deps.setOcrPendingFile(null);
        }}
      />
    </Suspense>
  ) : null;

  // Red banner shown when Supabase env vars are missing.
  const configErrorBanner = !isSupabaseConfigured ? (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white px-4 py-3 text-center text-sm font-bold z-[9999]">
      <SvgAlertTriangle size={16} className="inline mr-2" />
      Supabase is not configured. Copy <code className="bg-red-700 px-1 rounded">.env.example</code> to{' '}
      <code className="bg-red-700 px-1 rounded">.env</code> and add your credentials, then restart the server.
    </div>
  ) : null;

  return { cookieBannerOverlay, ocrCropModal, configErrorBanner };
}
