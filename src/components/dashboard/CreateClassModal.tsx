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
            className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-black mb-2">Create New Class</h2>
            <p className="text-stone-500 mb-6">Enter a name for your class (e.g. Grade 8-B)</p>
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
              className="w-full px-6 py-4 rounded-2xl border-2 border-blue-100 focus:border-blue-600 outline-none mb-6 font-bold"
            />
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-4 rounded-2xl font-bold text-stone-400 hover:bg-stone-50 transition-colors border-2 border-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={onCreate}
                className="flex-1 py-4 bg-blue-700 text-white rounded-2xl font-bold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-100"
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
