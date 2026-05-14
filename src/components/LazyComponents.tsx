/**
 * Lazy-loaded component wrappers with Suspense boundaries
 * These components are loaded on-demand to reduce initial bundle size
 */

import { lazy, Suspense, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { LazyErrorBoundary } from './LazyErrorBoundary';
import { useLanguage } from '../hooks/useLanguage';

type LoadingKey =
  | 'default'
  | 'landing' | 'terms' | 'privacy' | 'security'
  | 'a11y' | 'resources' | 'status' | 'demo';

const LOADING_COPY: Record<LoadingKey, { en: string; he: string; ar: string }> = {
  default:   { en: 'Loading...',                       he: 'טוען...',                     ar: 'جارٍ التحميل...' },
  landing:   { en: 'Loading landing page...',          he: 'טוען את עמוד הבית...',          ar: 'جارٍ تحميل الصفحة الرئيسية...' },
  terms:     { en: 'Loading terms...',                 he: 'טוען את התנאים...',             ar: 'جارٍ تحميل الشروط...' },
  privacy:   { en: 'Loading privacy policy...',        he: 'טוען את מדיניות הפרטיות...',    ar: 'جارٍ تحميل سياسة الخصوصية...' },
  security:  { en: 'Loading security...',              he: 'טוען את עמוד האבטחה...',        ar: 'جارٍ تحميل الأمان...' },
  a11y:      { en: 'Loading accessibility statement...', he: 'טוען את הצהרת הנגישות...',    ar: 'جارٍ تحميل بيان الوصول...' },
  resources: { en: 'Loading resources...',             he: 'טוען משאבים...',                ar: 'جارٍ تحميل الموارد...' },
  status:    { en: 'Loading status...',                he: 'טוען סטטוס...',                  ar: 'جارٍ تحميل الحالة...' },
  demo:      { en: 'Loading demo...',                  he: 'טוען הדגמה...',                  ar: 'جارٍ تحميل العرض...' },
};

// Loading fallback component
const LoadingFallback = ({ messageKey = 'default' }: { messageKey?: LoadingKey }) => {
  const { language } = useLanguage();
  const copy = LOADING_COPY[messageKey] ?? LOADING_COPY.default;
  const message = copy[language] ?? copy.en;
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-surface">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
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
