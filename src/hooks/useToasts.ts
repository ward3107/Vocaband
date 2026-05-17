import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
};

type ShowToastOptions = { action?: { label: string; onClick: () => void } };

export type ShowToast = (
  message: string,
  type?: ToastType,
  options?: ShowToastOptions,
) => void;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Stable across renders so consumers can put `showToast` in
  // useEffect / useCallback dep arrays without causing churn.
  const showToast = useCallback<ShowToast>((message, type = "info", options) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, action: options?.action }]);
    // Errors and toasts with an action stay longer so the user has time
    // to read + click before auto-dismissal.
    const duration = (type === "error" || options?.action) ? 8000 : 3000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  // Paywall toast — used when an AI / OCR endpoint returns 403
  // ai_requires_pro.  Adds an "Upgrade" button that opens the same
  // mailto the dashboard's trial-expired banner uses.
  const showPaywallToast = useCallback((message: string) => {
    showToast(message, "error", {
      action: {
        label: "Upgrade",
        onClick: () => {
          window.location.href = "mailto:contact@vocaband.com?subject=Upgrade%20to%20Pro";
        },
      },
    });
  }, [showToast]);

  return { toasts, setToasts, showToast, showPaywallToast };
}
