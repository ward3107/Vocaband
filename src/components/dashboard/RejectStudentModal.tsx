import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface RejectStudentModalProps {
  modal: { id: string; displayName: string } | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}

export default function RejectStudentModal({ modal, onCancel, onConfirm }: RejectStudentModalProps) {
  return (
    <AnimatePresence>
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2">Reject Student?</h2>
            <p className="text-stone-500 mb-6">
              You're about to reject <strong>"{modal.displayName}"</strong>. They will need to sign up again with a new class code to join your class.
            </p>
            <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
              ⚠️ This action cannot be undone. The student's profile will be marked as rejected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all border-2 border-stone-200"
              >
                Keep Student
              </button>
              <button
                onClick={() => onConfirm(modal.id)}
                className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
              >
                Reject Student
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
