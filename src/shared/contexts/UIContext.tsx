import React, { createContext, useContext, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export interface ConfirmDialog {
  show: boolean;
  message: string;
  onConfirm: () => void;
}

interface UIContextValue {
  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
  // Confirmation dialog
  confirmDialog: ConfirmDialog;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialog>>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within <UIProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    show: false,
    message: "",
    onConfirm: () => {},
  });

  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <UIContext.Provider value={{ toasts, showToast, confirmDialog, setConfirmDialog }}>
      {children}
    </UIContext.Provider>
  );
}
