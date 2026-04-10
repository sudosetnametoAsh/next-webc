import { useState, useCallback } from "react";

export type ToastType = "success" | "error";

export interface Toast {
  id: number;
  type: ToastType;
  title?: string;
  message?: string;
}

export interface UseToastOptions {
  maxToasts?: number;
  duration?: number;
}

export interface UseToastReturn {
  toasts: Toast[];
  dismiss: (id: number) => void;
  success: (message: string, title?: string) => number;
  error: (message: string, title?: string) => number;
}

let idCounter = 0;

export function useToast(options: UseToastOptions = {}): UseToastReturn {
  const { maxToasts = 3, duration = 4000 } = options;
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, message, title }: Omit<Toast, "id">): number => {
      const id = ++idCounter;

      setToasts((prev) => {
        const next = [{ id, type, message, title }, ...prev];
        return next.slice(0, maxToasts);
      });

      setTimeout(() => dismiss(id), duration);

      return id;
    },
    [dismiss, maxToasts, duration]
  );

  const success = useCallback(
    (message: string, title?: string) => toast({ type: "success", message, title }),
    [toast]
  );

  const error = useCallback(
    (message: string, title?: string) => toast({ type: "error", message, title }),
    [toast]
  );

  return { toasts, dismiss, success, error };
}