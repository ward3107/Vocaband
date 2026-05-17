/**
 * Lazy-loaded component wrappers with Suspense boundaries
 * These components are loaded on-demand to reduce initial bundle size
 */

import { lazy, Suspense, type ComponentType } from 'react';
// Loader2 was the only lucide icon used here; inlined as <svg> so
// this module (eagerly imported by PublicViews → App.tsx) no longer
// drags the ~17 kB gz lucide chunk into the cold-load modulepreload
// chain. Same path data as lucide-react v0.546.0 (ISC).
import { LazyErrorBoundary } from './LazyErrorBoundary';
import { useLanguage } from '../hooks/useLanguage';
import type { Language } from "../hooks/useLanguage";

const InlineLoaderIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

type LoadingKey =
  | 'default'
  | 'landing' | 'terms' | 'privacy' | 'security'
  | 'a11y' | 'resources' | 'status' | 'demo';

const LOADING_COPY: Record<LoadingKey, { en: string; he: string; ar: string; ru: string }> = {
  default:   { en: 'Loading...',                       he: 'טוען...',                     ar: 'جارٍ التحميل...',                     ru: 'Loading...', },
  landing:   { en: 'Loading landing page...',          he: 'טוען את עמוד הבית...',          ar: 'جارٍ تحميل الصفحة الرئيسية...',          ru: 'Loading landing page...', },
  terms:     { en: 'Loading terms...',                 he: 'טוען את התנאים...',             ar: 'جارٍ تحميل الشروط...',             ru: 'Loading terms...', },
  privacy:   { en: 'Loading privacy policy...',        he: 'טוען את מדיניות הפרטיות...',    ar: 'جارٍ تحميل سياسة الخصوصية...',    ru: 'Loading privacy policy...', },
  security:  { en: 'Loading security...',              he: 'טוען את עמוד האבטחה...',        ar: 'جارٍ تحميل الأمان...',        ru: 'Loading security...', },
  a11y:      { en: 'Loading accessibility statement...', he: 'טוען את הצהרת הנגישות...',    ar: 'جارٍ تحميل بيان الوصول...',    ru: 'Loading accessibility statement...', },
  resources: { en: 'Loading resources...',             he: 'טוען משאבים...',                ar: 'جارٍ تحميل الموارد...',                ru: 'Loading resources...', },
  status:    { en: 'Loading status...',                he: 'טוען סטטוס...',                  ar: 'جارٍ تحميل الحالة...',                  ru: 'Loading status...', },
  demo:      { en: 'Loading demo...',                  he: 'טוען הדגמה...',                  ar: 'جارٍ تحميل العرض...',                  ru: 'Loading demo...', },
};

// Loading fallback component
const LoadingFallback = ({ messageKey = 'default' }: { messageKey?: LoadingKey }) => {
  const { language } = useLanguage();
  const copy = LOADING_COPY[messageKey] ?? LOADING_COPY.default;
  const message = copy[language] ?? copy.en;
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-surface">
      <div className="text-center">
        <InlineLoaderIcon className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-on-surface-variant font-medium">{message}</p>
      </div>
    </div>
  );
};

// Lazy load page components - these use default exports
export const LazyLandingPage = lazy(() => import('./LandingPage'));
export const LazyTermsPage = lazy(() => import('./TermsPage'));
export const LazyPublicPrivacyPage = lazy(() => import('./PublicPrivacyPage'));
export const LazyPublicSecurityPage = lazy(() => import('./PublicSecurityPage'));
export const LazyDemoMode = lazy(() => import('./DemoMode'));
export const LazyAccessibilityStatement = lazy(() => import('./AccessibilityStatement'));
export const LazyFreeResourcesView = lazy(() => import('../views/FreeResourcesView'));
export const LazyStatusView = lazy(() => import('../views/StatusView'));

// Wrapper components with Suspense and Error Boundary
export const LandingPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback messageKey="landing" />}>
    <Suspense fallback={<LoadingFallback messageKey="landing" />}>
      <LazyLandingPage {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const TermsPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback messageKey="terms" />}>
    <Suspense fallback={<LoadingFallback messageKey="terms" />}>
      <LazyTermsPage {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const PrivacyPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback messageKey="privacy" />}>
    <Suspense fallback={<LoadingFallback messageKey="privacy" />}>
      <LazyPublicPrivacyPage {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const SecurityPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback messageKey="security" />}>
    <Suspense fallback={<LoadingFallback messageKey="security" />}>
      <LazyPublicSecurityPage {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const AccessibilityStatementWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback messageKey="a11y" />}>
    <Suspense fallback={<LoadingFallback messageKey="a11y" />}>
      <LazyAccessibilityStatement {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const FreeResourcesPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback messageKey="resources" />}>
    <Suspense fallback={<LoadingFallback messageKey="resources" />}>
      <LazyFreeResourcesView {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const StatusPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback messageKey="status" />}>
    <Suspense fallback={<LoadingFallback messageKey="status" />}>
      <LazyStatusView {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const DemoModeWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback messageKey="demo" />}>
    <Suspense fallback={<LoadingFallback messageKey="demo" />}>
      <LazyDemoMode {...props} />
    </Suspense>
  </LazyErrorBoundary>
);
