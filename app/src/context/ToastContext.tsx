import React from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  persistent?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
  duration?: number;
}

type ToastInput =
  | string
  | {
      message: string;
      type?: ToastType;
      title?: string;
      options?: ToastOptions;
    };

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  persistent: boolean;
  action: ToastOptions["action"] | null;
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: ToastInput, type?: ToastType, options?: ToastOptions) => number;
  removeToast: (id: number) => void;
  clearAllToasts: () => void;
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  warning: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: "OK",
  error: "!",
  warning: "!",
  info: "i",
};

let nextToastId = 1;

const getNextToastId = () => {
  const id = nextToastId;
  nextToastId += 1;
  return id;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const resolveToastInput = React.useCallback(
    (message: ToastInput, type: ToastType, options: ToastOptions) => {
      if (typeof message === "string") {
        return { message, type, options };
      }

      const resolvedType = message.type ?? type;
      const resolvedOptions = message.options ?? options;
      const resolvedMessage = message.title
        ? `${message.title}: ${message.message}`
        : message.message;

      return { message: resolvedMessage, type: resolvedType, options: resolvedOptions };
    },
    [],
  );

  const addToast = React.useCallback(
    (message: ToastInput, type: ToastType = "info", options: ToastOptions = {}) => {
      const resolved = resolveToastInput(message, type, options);
      const id = getNextToastId();
      const toast: Toast = {
        id,
        message: resolved.message,
        type: resolved.type,
        persistent: resolved.options.persistent ?? false,
        action: resolved.options.action ?? null,
        duration: resolved.options.duration ?? TOAST_DURATIONS[resolved.type],
      };

      setToasts((current) => [...current, toast]);

      if (!toast.persistent) {
        window.setTimeout(() => {
          removeToast(id);
        }, toast.duration);
      }

      return id;
    },
    [removeToast, resolveToastInput],
  );

  const clearAllToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      removeToast,
      clearAllToasts,
      success: (message, options) => addToast(message, "success", options),
      error: (message, options) => addToast(message, "error", options),
      warning: (message, options) => addToast(message, "warning", options),
      info: (message, options) => addToast(message, "info", options),
    }),
    [addToast, clearAllToasts, removeToast, toasts],
  );

  React.useEffect(() => {
    const toastWindow = window as Window & {
      showToast?: (message: string, type?: ToastType) => void;
    };

    toastWindow.showToast = (message, type = "info") => {
      addToast(message, type);
    };

    return () => {
      delete toastWindow.showToast;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: number) => void;
}) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-item-${toast.type}`}>
          <span className="toast-icon" aria-hidden="true">
            {TOAST_ICONS[toast.type]}
          </span>
          <div className="toast-body">
            <span>{toast.message}</span>
            {toast.action ? (
              <button type="button" className="toast-action" onClick={toast.action.handler}>
                {toast.action.label}
              </button>
            ) : null}
          </div>
          {!toast.persistent ? (
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => onRemove(toast.id)}
              aria-label="Dismiss notification"
            >
              x
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
};
