import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast],
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: "success", title, message, duration }),
    [showToast],
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: "error", title, message, duration }),
    [showToast],
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: "warning", title, message, duration }),
    [showToast],
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: "info", title, message, duration }),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        clearToasts,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="sb-toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const iconMap: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠️",
    info: "ℹ️",
  };

  return (
    <div className={`sb-toast sb-toast-${toast.type}`} role="alert">
      <div className="sb-toast-icon">{iconMap[toast.type]}</div>
      <div className="sb-toast-content">
        <h5 className="sb-toast-title">{toast.title}</h5>
        {toast.message && <p className="sb-toast-message">{toast.message}</p>}
      </div>
      <button
        type="button"
        className="sb-toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
      {toast.duration && toast.duration > 0 && (
        <div
          className="sb-toast-timer-bar"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}
    </div>
  );
}

