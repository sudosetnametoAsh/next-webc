import { useState, useEffect, useRef } from "react";
import { CheckIcon, TrashIcon, AlertTriangle } from "lucide-react";
 
/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export type ConfirmationModalVariant = "neutral" | "destructive";

export interface ImpactWarningInfo {
  enrolledCount?: number;
  signedCount?: number;
  tasksCount?: number;
  confirmationKeyword?: string;
}
 
export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id?: number) => void | Promise<void>;
  variant?: ConfirmationModalVariant;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  impactInfo?: ImpactWarningInfo | null;
}
 
/* ─────────────────────────────────────────────
   Icons
───────────────────────────────────────────── */
// const TrashIcon = () => (
//   <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
//        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//     <polyline points="3 6 5 6 21 6"/>
//     <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
//     <path d="M10 11v6M14 11v6"/>
//     <path d="M9 6V4h6v2"/>
//   </svg>
// );
 
// const CheckIcon = () => (
//   <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
//        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//     <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
//     <polyline points="22 4 12 14.01 9 11.01"/>
//   </svg>
// );
 
const SpinnerIcon = () => (
  <svg
    className="animate-spin"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);
 
/* ─────────────────────────────────────────────
   ConfirmationModal
 
   Props:
   - isOpen:          boolean                   — controls visibility
   - onClose:         () => void                — called on cancel / backdrop / Escape
   - onConfirm:       (id?: number) => void | Promise<void>
                                                — called on confirm; id is optional,
                                                  captured from the caller's closure
   - variant:         'neutral' | 'destructive' — visual style (default: 'neutral')
   - title:           string                    — modal heading
   - description:     string                    — body copy
   - confirmLabel:    string                    — confirm button text (auto if omitted)
   - cancelLabel:     string                    — cancel button text (default: 'Cancel')
   - isLoading:       boolean                   — shows spinner, disables buttons
   - closeOnBackdrop: boolean                   — dismiss on backdrop click (default: true)
   - closeOnEscape:   boolean                   — dismiss on Escape key (default: true)
───────────────────────────────────────────── */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  variant = "neutral",
  title = "Are you sure?",
  description = "Please confirm you want to proceed.",
  confirmLabel,
  cancelLabel = "Cancel",
  isLoading = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  impactInfo = null,
}: ConfirmationModalProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [animOut, setAnimOut] = useState<boolean>(false);
  const [confirmKeywordInput, setConfirmKeywordInput] = useState<string>("");
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
 
  const isDestructive = variant === "destructive";
  const label = confirmLabel ?? (isDestructive ? "Delete" : "Confirm");

  const requiredKeyword = impactInfo?.confirmationKeyword?.trim().toUpperCase();
  const hasActiveImpact = Boolean(impactInfo && ((impactInfo.signedCount ?? 0) > 0 || (impactInfo.enrolledCount ?? 0) > 0));
  const isKeywordMatched = !requiredKeyword || confirmKeywordInput.trim().toUpperCase() === requiredKeyword;
  const isConfirmDisabled = isLoading || (hasActiveImpact && Boolean(requiredKeyword) && !isKeywordMatched);
 
  /* open / close lifecycle with exit animation */
  useEffect(() => {
    if (isOpen) {
      setAnimOut(false);
      setVisible(true);
      setConfirmKeywordInput("");
    } else if (visible) {
      setAnimOut(true);
      const t = setTimeout(() => {
        setVisible(false);
        setConfirmKeywordInput("");
      }, 180);
      return () => clearTimeout(t);
    }
  }, [isOpen]);
 
  /* auto-focus confirm button on open */
  useEffect(() => {
    if (visible && !animOut) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [visible, animOut]);
 
  /* Escape key handler */
  useEffect(() => {
    if (!visible || !closeOnEscape || isLoading) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, closeOnEscape, isLoading, onClose]);
 
  const handleBackdrop = () => {
    if (closeOnBackdrop && !isLoading) onClose();
  };
 
  // Wraps onConfirm so the button's MouseEvent is not accidentally passed through
  const handleConfirm = () => {
    if (!isLoading) onConfirm();
  };
 
  if (!visible) return null;
 
  /* Variant styles */
  const iconWrapClass = isDestructive
    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
    : "bg-amber-500/20 text-amber-400 border border-amber-500/30";
 
  const confirmBtnClass = isDestructive
    ? "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-md shadow-rose-950/40"
    : "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20";
 
  const backdropAnim = animOut
    ? "opacity-0 transition-opacity duration-[180ms]"
    : "opacity-100 transition-opacity duration-[180ms]";
 
  const modalAnim = animOut
    ? "opacity-0 scale-95 translate-y-1 transition-all duration-[180ms]"
    : "opacity-100 scale-100 translate-y-0 transition-all duration-[220ms]";
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-xs ${backdropAnim}`}
        onClick={handleBackdrop}
        aria-hidden="true"
      />
 
      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
        aria-describedby="cm-desc"
        className={`relative w-full max-w-md bg-[#0a101f] border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden ${modalAnim}`}
      >
        {/* Body */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconWrapClass}`}>
              {isDestructive ? <TrashIcon /> : <CheckIcon />}
            </div>
 
            {/* Text */}
            <div className="flex-1 pt-0.5">
              <h2
                id="cm-title"
                className="text-[15px] font-bold text-white leading-snug mb-1"
              >
                {title}
              </h2>
              <p
                id="cm-desc"
                className="text-xs text-slate-400 leading-relaxed"
              >
                {description}
              </p>

              {/* Active Clearance Season Impact Warning */}
              {hasActiveImpact && (
                <div className="mt-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Active Clearance Impact Warning</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed">
                    This template currently has <strong className="text-white font-semibold">{impactInfo?.enrolledCount ?? 0} enrolled clients</strong> with <strong className="text-amber-300 font-semibold">{impactInfo?.signedCount ?? 0} signed approvals</strong> ({impactInfo?.tasksCount ?? 0} requirements). Deleting will permanently remove this template, all student clearance records, sign-offs, and submitted tasks across all databases.
                  </p>

                  {requiredKeyword && (
                    <div className="mt-3 pt-2.5 border-t border-amber-500/20">
                      <p className="text-[11px] text-slate-400 mb-1.5">
                        To confirm, type <span className="font-mono font-bold text-rose-400 select-all">{requiredKeyword}</span> below:
                      </p>
                      <input
                        type="text"
                        value={confirmKeywordInput}
                        onChange={(e) => setConfirmKeywordInput(e.target.value)}
                        placeholder={`Type ${requiredKeyword} to confirm`}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono tracking-wider"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
 
        {/* Divider */}
        <div className="h-px bg-slate-800 mx-6" />
 
        {/* Footer */}
        <div className="px-6 py-4 bg-[#070c18] border-t border-slate-800 flex items-center justify-end gap-3">
          {/* Cancel */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            {cancelLabel}
          </button>
 
          {/* Confirm */}
          <button
            ref={confirmBtnRef}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                        transition-colors duration-150
                        cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                        ${confirmBtnClass}`}
          >
            {isLoading && <SpinnerIcon />}
            {isLoading ? "Processing…" : label}
          </button>
        </div>
      </div>
    </div>
  );
}