"use client";

import {
  createContext,
  CSSProperties,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastTone = "success" | "info" | "warning" | "error";

export type ToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
  accent?: string;
  durationMs?: number;
};

type ToastItem = Required<Omit<ToastInput, "message">> & {
  id: string;
  message?: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const defaultAccentByTone: Record<ToastTone, string> = {
  success: "#d7c8a4",
  info: "#8fb0d8",
  warning: "#ffda03",
  error: "#c93a4d",
};

const defaultDurationByTone: Record<ToastTone, number> = {
  success: 3000,
  info: 3000,
  warning: 4000,
  error: 5000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRefs = useRef<Record<string, number>>({});

  const dismissToast = useCallback((id: string) => {
    window.clearTimeout(timeoutRefs.current[id]);
    delete timeoutRefs.current[id];
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const tone = toast.tone || "success";
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const durationMs = toast.durationMs ?? defaultDurationByTone[tone];
      const nextToast: ToastItem = {
        id,
        title: toast.title,
        message: toast.message,
        tone,
        accent: toast.accent || defaultAccentByTone[tone],
        durationMs,
      };

      setToasts((currentToasts) => [nextToast, ...currentToasts].slice(0, 2));
      timeoutRefs.current[id] = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="gc-toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className={`gc-toast gc-toast-${toast.tone}`}
            style={{ "--toast-accent": toast.accent } as CSSProperties}
          >
            <span className="gc-toast-mark" aria-hidden="true">
              {toast.tone === "error"
                ? "!"
                : toast.tone === "warning"
                  ? "!"
                  : "✓"}
            </span>
            <span className="min-w-0">
              <span className="gc-toast-title">{toast.title}</span>
              {toast.message && (
                <span className="gc-toast-message">{toast.message}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
