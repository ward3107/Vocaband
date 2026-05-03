import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";

interface DeleteAssignmentModalProps {
  modal: { id: string; title: string } | null;
  onCancel: () => void;
  onConfirm: (id: string, title: string) => void;
}

export default function DeleteAssignmentModal({ modal, onCancel, onConfirm }: DeleteAssignmentModalProps) {
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
            className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2">{t.delAssignTitle}</h2>
            <p className="text-stone-500 mb-6">
              {t.delAssignBody(modal.title)}
            </p>
            <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
              {t.delAssignWarn}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-colors border-2 border-stone-200"
              >
                {t.delAssignKeep}
              </button>
              <button
                onClick={() => onConfirm(modal.id, modal.title)}
                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100"
              >
                {t.delAssignConfirm}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
