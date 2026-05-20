import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";

interface RejectStudentModalProps {
  modal: { id: string; displayName: string } | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}

export default function RejectStudentModal({ modal, onCancel, onConfirm }: RejectStudentModalProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];
  return (
    <AnimatePresence>
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
          <motion.div
            dir={dir}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ backgroundColor: 'var(--vb-surface)' }}
            className="rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--vb-warning-soft)', color: 'var(--vb-warning)' }}
            >
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--vb-text-primary)' }}>
              {t.rejectTitle}
            </h2>
            <p className="mb-6" style={{ color: 'var(--vb-text-secondary)' }}>
              {t.rejectBody(modal.displayName)}
            </p>
            <p
              className="px-4 py-3 rounded-xl mb-6 font-medium border-2"
              style={{
                color: 'var(--vb-warning)',
                backgroundColor: 'var(--vb-warning-soft)',
                borderColor: 'var(--vb-warning)',
              }}
            >
              {t.rejectWarn}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                style={{
                  backgroundColor: 'var(--vb-surface-alt)',
                  color: 'var(--vb-text-secondary)',
                  borderColor: 'var(--vb-border)',
                }}
                className="flex-1 py-4 rounded-xl font-bold hover:opacity-90 transition-all border-2"
              >
                {t.rejectKeep}
              </button>
              <button
                onClick={() => onConfirm(modal.id)}
                style={{ backgroundColor: 'var(--vb-warning)', color: '#ffffff' }}
                className="flex-1 py-4 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
              >
                {t.rejectConfirm}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
