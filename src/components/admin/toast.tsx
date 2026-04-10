import { useEffect, useState } from "react";
import type { Toast, ToastType } from "./use-toast";

const ICONS: Record<ToastType, React.JSX.Element> = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
};

interface ToastStyles {
  container: string;
  icon: string;
  title: string;
  message: string;
  close: string;
  progress: string;
}

const STYLES: Record<ToastType, ToastStyles> = {
  success: {
    container: "bg-green-50 border border-green-200 text-green-900",
    icon: "text-green-600",
    title: "text-green-700",
    message: "text-green-700",
    close: "text-green-500 hover:text-green-700 hover:bg-green-100",
    progress: "bg-green-500",
  },
  error: {
    container: "bg-red-50 border border-red-200 text-red-900",
    icon: "text-red-600",
    title: "text-red-700",
    message: "text-red-700",
    close: "text-red-400 hover:text-red-600 hover:bg-red-100",
    progress: "bg-red-500",
  },
};

interface ToastItemProps extends Toast {
  duration?: number;
  onDismiss: (id: number) => void;
}

function ToastItem({ id, type, title, message, duration = 4000, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const styles = STYLES[type];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(id), 300);
  };

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), duration - 300);
    const dismissTimer = setTimeout(() => onDismiss(id), duration);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        relative w-full max-w-sm rounded-xl shadow-lg overflow-hidden
        transition-all duration-300 ease-in-out
        ${styles.container}
        ${visible && !leaving ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
      `}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={`mt-0.5 shrink-0 ${styles.icon}`}>
          {ICONS[type]}
        </span>

        <div className="flex-1 min-w-0">
          {title && (
            <p className={`text-sm font-semibold leading-snug ${styles.title}`}>
              {title}
            </p>
          )}
          {message && (
            <p className={`text-sm leading-snug ${title ? "mt-0.5" : ""} ${styles.message}`}>
              {message}
            </p>
          )}
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className={`shrink-0 rounded-md p-1 transition-colors ${styles.close}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        className={`absolute bottom-0 left-0 h-0.5 ${styles.progress}`}
        style={{ animation: `shrink ${duration}ms linear forwards` }}
      />

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  duration?: number;
}

export function ToastContainer({ toasts, onDismiss, duration }: ToastContainerProps) {
  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full px-4 pointer-events-none"
      style={{ maxWidth: "24rem" }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="w-full pointer-events-auto">
          <ToastItem {...toast} duration={duration} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}