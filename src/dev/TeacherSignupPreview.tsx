/**
 * Dev-only preview that mounts the REAL self-serve teacher sign-up screen
 * (TeacherSignupView) with no-op deps, so the "I'm a teacher + pick your
 * school" flow and the Ministry-of-Education school dropdown can be
 * inspected / screenshotted without a Google OAuth session.
 *
 * Entry: http://localhost:5174/dev/teacher-signup   (add ?lang=he|ar for RTL)
 *
 * Gated behind `import.meta.env.DEV` in main.tsx — never ships to production.
 */
import { LanguageProvider } from '../hooks/useLanguage';
import TeacherSignupView from '../views/TeacherSignupView';
import type { AppUser } from '../core/supabase';
import type { View } from '../core/views';

export default function TeacherSignupPreview() {
  const noopView = (_v: React.SetStateAction<View>) => {};
  const noopUser = (_u: React.SetStateAction<AppUser | null>) => {};
  const noopToast = (_m: string) => {};

  return (
    <LanguageProvider>
      <TeacherSignupView
        setView={noopView}
        setUser={noopUser}
        showToast={noopToast}
        cookieBannerOverlay={null}
      />
    </LanguageProvider>
  );
}
