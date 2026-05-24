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

// Visual tokens for the toast's leading icon tile.  Match the in-app
// inbox `.iam-row .ic` palette from the Notifications v1 mockup:
// mint for success, coral for error, brand-gradient for info.
const ICON_STYLES: Record<Toast["type"], { background: string; color: string }> = {
  success: { background: "rgba(63,166,137,0.15)", color: "#1F5A4A" },
  error:   { background: "rgba(240,141,135,0.20)", color: "#7A2A24" },
  info:    {
    background: "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
    color: "#FFFFFF",
  },
};

export default function ToastList({ toasts }: ToastListProps) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(toast => {
          const iconStyle = ICON_STYLES[toast.type];
          const Icon =
            toast.type === "success" ? CheckCircle2 :
            toast.type === "error" ? AlertTriangle :
            Info;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.94 }}
              // Notifications v1 in-app inbox row look: white card with
              // hairline indigo border, soft drop-shadow, leading icon
              // tile colored by toast type, bold ink text in the body.
              className="flex items-start gap-3 rounded-2xl border px-4 py-3.5 min-w-[300px] max-w-[420px]"
              style={{
                background: "#FFFFFF",
                borderColor: "rgba(99,102,241,0.10)",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -18px rgba(60,40,120,0.22)",
              }}
            >
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
                style={{ background: iconStyle.background, color: iconStyle.color }}
              >
                <Icon size={18} />
              </div>
              <span
                className="flex-1 text-[13px] font-bold leading-[1.35]"
                style={{ color: "#1F1147" }}
              >
                {toast.message}
              </span>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  type="button"
                  className="ms-1 rounded-full px-3 py-1.5 text-[12px] font-bold transition-transform active:scale-95"
                  style={{
                    background: "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
                    color: "#FFFFFF",
                    boxShadow: "0 8px 18px -10px rgba(139,92,246,0.55)",
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
