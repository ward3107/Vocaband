import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; onClick: () => void };
}

interface ToastListProps {
  toasts: Toast[];
}

export default function ToastList({ toasts }: ToastListProps) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-3 min-w-[300px] text-white"
            style={{
              backgroundColor:
                toast.type === 'success' ? 'var(--vb-success)' :
                toast.type === 'error'   ? 'var(--vb-danger)'  :
                                           'var(--vb-info)',
            }}
          >
            {toast.type === 'success' && <CheckCircle2 size={24} />}
            {toast.type === 'error' && <AlertTriangle size={24} />}
            {toast.type === 'info' && <Info size={24} />}
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
