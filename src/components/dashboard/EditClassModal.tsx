import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { CLASS_AVATAR_GROUPS } from "../../constants/game";
import type { ClassData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";

interface EditClassModalProps {
  /** The class being edited; null = modal hidden. */
  klass: ClassData | null;
  onClose: () => void;
  /** Persist the new name + avatar.  Caller is responsible for the
   * actual UPDATE — this modal just collects the values. */
  onSave: (next: { name: string; avatar: string | null }) => Promise<void> | void;
}

/**
 * Edit-class modal — lets a teacher rename a class and pick an avatar
 * without deleting / recreating the class.  All foreign keys
 * (assignments, progress, student_profiles) are scoped by class_id and
 * class_code, both of which are preserved here, so renaming/changing
 * the avatar never loses students or work.
 *
 * The avatar pool is curated to meet teaching standards in Israel and
 * internationally (no religious / political / weapons / faces /
 * gestures / national flags) — see CLASS_AVATAR_GROUPS in constants.
 */
export default function EditClassModal({ klass, onClose, onSave }: EditClassModalProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];
  const [name, setName] = useState(klass?.name ?? "");
  const [avatar, setAvatar] = useState<string | null>(klass?.avatar ?? null);
  const [saving, setSaving] = useState(false);

  // Reset form whenever a different class opens this modal.
  useEffect(() => {
    if (klass) {
      setName(klass.name);
      setAvatar(klass.avatar ?? null);
      setSaving(false);
    }
  }, [klass]);

  const trimmed = name.trim();
  const dirty = !!klass && (trimmed !== klass.name || (avatar ?? null) !== (klass.avatar ?? null));
  const valid = trimmed.length > 0 && trimmed.length <= 60;

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({ name: trimmed, avatar });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {klass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
          <motion.div
            dir={dir}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ backgroundColor: 'var(--vb-surface)' }}
            className="rounded-[32px] p-6 sm:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="mb-5">
              <h2 className="text-2xl font-black" style={{ color: 'var(--vb-text-primary)' }}>
                Edit class
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--vb-text-secondary)' }}>
                Rename this class or pick a new avatar — students, assignments,
                and progress all stay intact.  Class code stays the same.
              </p>
            </div>

            {/* Name */}
            <label
              htmlFor="edit-class-name"
              className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--vb-text-muted)' }}
            >
              Class name
            </label>
            <input
              autoFocus
              type="text"
              id="edit-class-name"
              name="className"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.classNameInputPlaceholder}
              maxLength={60}
              style={{
                borderColor: 'var(--vb-border)',
                color: 'var(--vb-text-primary)',
                backgroundColor: 'var(--vb-surface)',
              }}
              className="w-full px-4 py-3 rounded-2xl border-2 outline-none mb-1 font-bold focus:border-[var(--vb-accent)]"
            />
            <div className="flex justify-between mb-5">
              <span className="text-[11px]" style={{ color: 'var(--vb-text-muted)' }}>
                Class code:{' '}
                <span className="font-mono font-bold" style={{ color: 'var(--vb-text-secondary)' }}>{klass.code}</span>{' '}
                (cannot change)
              </span>
              <span
                className="text-[11px] font-bold"
                style={{ color: trimmed.length > 60 ? '#e11d48' : 'var(--vb-text-muted)' }}
              >
                {trimmed.length}/60
              </span>
            </div>

            {/* Avatar picker — grouped by theme so it stays scannable */}
            <label
              className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--vb-text-muted)' }}
            >
              Class avatar
            </label>

            {/* "Default" tile — clears the selection back to the standard icon */}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mb-3">
              <button
                onClick={() => setAvatar(null)}
                type="button"
                style={{
                  touchAction: 'manipulation',
                  backgroundColor: avatar === null ? 'var(--vb-accent-soft)' : 'var(--vb-surface)',
                  borderColor: avatar === null ? 'var(--vb-accent)' : 'var(--vb-border)',
                }}
                title="Use default icon"
                className="aspect-square rounded-xl flex items-center justify-center transition-all border-2"
              >
                <GraduationCap size={18} style={{ color: 'var(--vb-text-secondary)' }} />
              </button>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 -mr-1">
              {CLASS_AVATAR_GROUPS.map(group => (
                <div key={group.label}>
                  <p
                    className="text-[11px] font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: 'var(--vb-text-muted)' }}
                  >
                    {group.label}
                  </p>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                    {group.emojis.map(em => {
                      const selected = avatar === em;
                      return (
                        <button
                          key={em}
                          onClick={() => setAvatar(em)}
                          type="button"
                          style={{
                            touchAction: 'manipulation',
                            backgroundColor: selected ? 'var(--vb-accent-soft)' : 'var(--vb-surface)',
                            borderColor: selected ? 'var(--vb-accent)' : 'var(--vb-border)',
                          }}
                          className={`relative aspect-square rounded-xl flex items-center justify-center text-2xl transition-all border-2 ${selected ? 'scale-105' : 'hover:scale-105'}`}
                        >
                          {em}
                          {selected && (
                            <span
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: 'var(--vb-accent)' }}
                            >
                              <CheckCircle2 size={10} style={{ color: 'var(--vb-accent-text)' }} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div
              className="flex gap-3 mt-6 pt-4 border-t"
              style={{ borderColor: 'var(--vb-border)' }}
            >
              <button
                onClick={onClose}
                disabled={saving}
                type="button"
                style={{
                  touchAction: 'manipulation',
                  borderColor: 'var(--vb-border)',
                  color: 'var(--vb-text-secondary)',
                  backgroundColor: 'var(--vb-surface)',
                }}
                className="flex-1 py-3 rounded-2xl font-bold transition-colors border-2 disabled:opacity-50 hover:opacity-90"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={!valid || !dirty || saving}
                type="button"
                style={{
                  touchAction: 'manipulation',
                  backgroundColor: 'var(--vb-accent)',
                  color: 'var(--vb-accent-text)',
                }}
                className="flex-1 py-3 rounded-2xl font-black hover:opacity-90 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t.saving : t.saveChanges}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
