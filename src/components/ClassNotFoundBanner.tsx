/**
 * ClassNotFoundBanner — sticky rose-red banner the student sees on
 * the dashboard when the class code they typed doesn't exist.
 *
 * Previously inlined in App.tsx (~48 lines of JSX plus handler
 * closures that call supabase.auth.signOut() inline).  Moved here
 * for the same reasons as the other modal extractions: the banner
 * is pure presentation + two user-action callbacks, the business
 * logic stays in App.tsx.
 */
import React from "react";
import { useLanguage } from "../hooks/useLanguage";
import { teacherViewsT } from "../locales/teacher/views";

export interface ClassNotFoundBannerProps {
  /** The class code the student typed.  When null, the banner hides. */
  classCode: string | null;
  /** Dismiss the banner without leaving the page. */
  onDismiss: () => void;
  /** Sign the student out and send them to the login screen so they
   * can try another class code. */
  onSignOutAndLogin: () => void;
}

export const ClassNotFoundBanner: React.FC<ClassNotFoundBannerProps> = ({
  classCode,
  onDismiss,
  onSignOutAndLogin,
}) => {
  const { language, dir } = useLanguage();
  const t = teacherViewsT[language];
  if (!classCode) return null;
  return (
    <div dir={dir} className="max-w-4xl mx-auto mb-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-rose-500 to-pink-500 text-white shadow-lg p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">⚠️</div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm sm:text-base">{t.classNotFoundTitle(classCode)}</p>
            <p className="text-xs sm:text-sm text-white/90 mt-0.5 leading-relaxed">
              {t.classNotFoundBody}
            </p>
          </div>
          <button
            onClick={onDismiss}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-black transition-colors"
            aria-label={t.dismissAria}
          >
            ×
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onSignOutAndLogin}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-rose-700 bg-white hover:bg-rose-50 px-4 py-2 rounded-xl shadow-md transition-all"
          >
            {t.signOutAndTryAgain}
          </button>
          <button
            onClick={onDismiss}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all"
          >
            {t.stayHere}
          </button>
        </div>
      </div>
    </div>
  );
};
