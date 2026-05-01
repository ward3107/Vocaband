import { motion, AnimatePresence } from "framer-motion";

interface CreateClassModalProps {
  show: boolean;
  newClassName: string;
  setNewClassName: React.Dispatch<React.SetStateAction<string>>;
  onCancel: () => void;
  onCreate: () => void;
}

export default function CreateClassModal({
  show, newClassName, setNewClassName, onCancel, onCreate,
}: CreateClassModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ backgroundColor: 'var(--vb-surface)' }}
            className="rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--vb-text-primary)' }}>
              Create New Class
            </h2>
            <p className="mb-6" style={{ color: 'var(--vb-text-secondary)' }}>
              Enter a name for your class (e.g. Grade 8-B)
            </p>
            <input
              autoFocus
              type="text"
              id="create-class-name"
              name="className"
              autoComplete="off"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Class Name"
              maxLength={50}
              style={{
                borderColor: 'var(--vb-border)',
                color: 'var(--vb-text-primary)',
                backgroundColor: 'var(--vb-surface)',
              }}
              className="w-full px-6 py-4 rounded-2xl border-2 outline-none mb-6 font-bold focus:border-[var(--vb-accent)]"
            />
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                style={{
                  borderColor: 'var(--vb-border)',
                  color: 'var(--vb-text-secondary)',
                  backgroundColor: 'var(--vb-surface)',
                }}
                className="flex-1 py-4 rounded-2xl font-bold transition-colors border-2 hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={onCreate}
                style={{
                  backgroundColor: 'var(--vb-accent)',
                  color: 'var(--vb-accent-text)',
                }}
                className="flex-1 py-4 rounded-2xl font-bold hover:opacity-90 transition-colors shadow-lg"
              >
                Create
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
