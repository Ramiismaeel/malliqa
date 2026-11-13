"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Emoji } from "./emoji";

type ToastTone = "success" | "info" | "error";

interface ToastItem {
  id: number;
  message: string;
  emoji?: string;
  tone: ToastTone;
}

interface ToastOptions {
  emoji?: string;
  tone?: ToastTone;
}

type ShowToast = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ShowToast | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "bg-neutral text-neutral-content",
  info: "bg-neutral text-neutral-content",
  error: "bg-error text-error-content",
};

const TOAST_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback<ShowToast>((message, options) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, message, emoji: options?.emoji, tone: options?.tone ?? "success" }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_MS);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`flex animate-pop items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg ${TONE_CLASSES[toast.tone]}`}
          >
            {toast.emoji && <Emoji>{toast.emoji}</Emoji>}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
