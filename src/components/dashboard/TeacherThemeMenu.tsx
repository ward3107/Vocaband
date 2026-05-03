/**
 * TeacherThemeMenu — small modal that lets a teacher pick one of the
 * predefined dashboard themes.  Triggered from a "Theme" button in the
 * teacher dashboard chrome.  Saving:
 *   1. Optimistically updates the local user state (instant repaint).
 *   2. Persists `teacher_dashboard_theme` on the public.users row.
 *   3. Closes the modal.
 *
 * If the DB write fails we surface a console warning but DON'T revert
 * the local state — the next page-load mapper would just read back the
 * old value, which is fine as a soft failure.  Real users won't see a
 * hard error from a transient Supabase blip.
 */
import { motion } from "motion/react";
import { X } from "lucide-react";
import { TEACHER_DASHBOARD_THEMES } from "../../constants/teacherDashboardThemes";
import { supabase, type AppUser } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";

interface TeacherThemeMenuProps {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  onClose: () => void;
}

export default function TeacherThemeMenu({ user, setUser, onClose }: TeacherThemeMenuProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];
  const currentId = user?.teacherDashboardTheme ?? 'default';

  const pick = async (themeId: string) => {
    // Optimistic local update so the dashboard repaints immediately.
    setUser(prev => prev ? { ...prev, teacherDashboardTheme: themeId } : prev);
    onClose();
    if (!user?.uid) return;
    const { error } = await supabase
      .from('users')
      .update({ teacher_dashboard_theme: themeId })
      .eq('uid', user.uid);
    if (error) {
      console.warn('[Theme] Failed to persist teacher_dashboard_theme:', error.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        dir={dir}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          backgroundColor: 'var(--vb-surface)',
          borderColor: 'var(--vb-border)',
        }}
        className="rounded-3xl p-6 max-w-2xl w-full shadow-2xl border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black" style={{ color: 'var(--vb-text-primary)' }}>
            Dashboard theme
          </h2>
          <button
            onClick={onClose}
            type="button"
            style={{ color: 'var(--vb-text-muted)' }}
            className="p-2 rounded-full hover:opacity-80"
            aria-label="Close theme picker"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm mb-5" style={{ color: 'var(--vb-text-secondary)' }}>
          Pick a look for your teacher dashboard.  Only you see this — students keep their own theme from the shop.
        </p>

        {/* Light themes */}
        <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--vb-text-muted)' }}>
          Light themes
        </p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {TEACHER_DASHBOARD_THEMES.filter(t => !t.dark).map(theme => {
            const selected = theme.id === currentId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => pick(theme.id)}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className={`relative ${theme.swatch} rounded-xl p-2 h-20 flex flex-col items-center justify-center gap-1 ring-2 transition-all
                  ${selected ? 'ring-stone-900 shadow-lg scale-[1.02]' : 'ring-transparent hover:ring-stone-300 hover:scale-[1.02]'}`}
              >
                <span className="text-2xl">{theme.emoji}</span>
                <span className={`text-xs font-black ${theme.dark ? 'text-white' : 'text-stone-900'}`}>
                  {theme.name}
                </span>
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-stone-900 ring-2 ring-white" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dark themes */}
        <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--vb-text-muted)' }}>
          Dark themes
        </p>
        <div className="grid grid-cols-4 gap-2">
          {TEACHER_DASHBOARD_THEMES.filter(t => t.dark).map(theme => {
            const selected = theme.id === currentId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => pick(theme.id)}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className={`relative ${theme.swatch} rounded-xl p-2 h-20 flex flex-col items-center justify-center gap-1 ring-2 transition-all
                  ${selected ? 'ring-stone-900 shadow-lg scale-[1.02]' : 'ring-transparent hover:ring-stone-300 hover:scale-[1.02]'}`}
              >
                <span className="text-2xl">{theme.emoji}</span>
                <span className={`text-xs font-black ${theme.dark ? 'text-white' : 'text-stone-900'}`}>
                  {theme.name}
                </span>
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-stone-900 ring-2 ring-white" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
