"use client";

import { useEffect, useState } from "react";
import { useSignClient } from "@/hooks/department/sign-client";
import { CheckCircle2, PenLine, RotateCcw, Loader2, AlertTriangle, X } from "lucide-react";

type Props = {
  clearanceId: string[];
  currentStatus: string;
  disabled?: boolean;
  className?: string;
  hasPendingTasks?: boolean;
  pendingTasksCount?: number;
  clientName?: string;
};

export default function SignToggleButton({
  clearanceId,
  currentStatus,
  disabled = false,
  className = "",
  hasPendingTasks = false,
  pendingTasksCount = 0,
  clientName,
}: Props) {
  const { mutate, isPending } = useSignClient();
  const [showPendingConfirm, setShowPendingConfirm] = useState(false);
  const selectionKey = clearanceId.join(",");
  const [confirmed, setConfirmed] = useState<{ key: string; status: string } | null>(null);
  useEffect(() => { setConfirmed(null); }, [currentStatus, selectionKey]);

  const effectiveStatus = confirmed?.key === selectionKey ? confirmed.status : currentStatus;
  const isSigned = effectiveStatus === "Signed";
  const targetStatus = isSigned ? "Pending" : "Signed";

  const isDisabled = disabled || isPending || clearanceId.length === 0;

  const handleToggle = () => {
    if (isDisabled) return;

    // If signing a client who has unfulfilled/pending tasks, prompt with alert notice first
    if (targetStatus === "Signed" && hasPendingTasks) {
      setShowPendingConfirm(true);
      return;
    }

    executeSign();
  };

  const executeSign = () => {
    setShowPendingConfirm(false);
    const dateNow = targetStatus === "Signed" ? new Date().toISOString() : null;

    mutate({
      ids: clearanceId,
      status: targetStatus,
      signed_at: dateNow,
    }, {
      // Reflect the persisted result while list/progress refetches finish.
      onSuccess: () => setConfirmed({ key: selectionKey, status: targetStatus }),
    });
  };

  const btnStyle = isSigned
    ? "border-slate-700 bg-slate-800/90 text-slate-300 enabled:hover:border-slate-600 enabled:hover:bg-slate-700 enabled:hover:text-white focus-visible:ring-slate-400/60"
    : "border-slate-700 bg-slate-800/90 text-slate-200 enabled:hover:border-slate-600 enabled:hover:bg-slate-700 enabled:hover:text-white focus-visible:ring-amber-400/60";

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isDisabled}
        aria-busy={isPending}
        className={`inline-flex items-center justify-center gap-1 md:gap-1.5 whitespace-nowrap rounded-lg md:rounded-xl border px-2.5 py-1.5 text-[10px] md:px-3 md:py-2 md:text-xs font-semibold shadow-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070c18] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed motion-reduce:transition-none ${btnStyle} ${className}`}
        title={
          clearanceId.length === 0
            ? "Select clients to sign"
            : isSigned
            ? "Undo sign for selected clients"
            : "Sign clearance for selected clients"
        }
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : isSigned ? (
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        ) : (
          <PenLine aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
        )}
        <span>{isPending ? "Processing..." : isSigned ? "Undo Sign" : "Sign Clearance"}</span>
      </button>

      {/* Confirmation Modal when Signing with Pending Tasks */}
      {showPendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in ease-out fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0a101f] p-6 shadow-2xl shadow-black/80 space-y-4">
            <button
              type="button"
              onClick={() => setShowPendingConfirm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 flex-1 pr-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Sign Client with Pending Tasks?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {clientName ? (
                    <>
                      <strong className="text-white">{clientName}</strong> still has{" "}
                      <span className="font-semibold text-amber-300">
                        {pendingTasksCount > 0
                          ? `${pendingTasksCount} unfulfilled requirement${pendingTasksCount === 1 ? "" : "s"}`
                          : "pending requirements"}
                      </span>.
                    </>
                  ) : (
                    <>
                      {clearanceId.length > 1 ? (
                        <>
                          Selected clients have{" "}
                          <span className="font-semibold text-amber-300">
                            {pendingTasksCount > 0
                              ? `${pendingTasksCount} unfulfilled requirement${pendingTasksCount === 1 ? "" : "s"}`
                              : "pending requirements"}
                          </span>.
                        </>
                      ) : (
                        <>
                          This client still has{" "}
                          <span className="font-semibold text-amber-300">
                            {pendingTasksCount > 0
                              ? `${pendingTasksCount} unfulfilled requirement${pendingTasksCount === 1 ? "" : "s"}`
                              : "pending requirements"}
                          </span>.
                        </>
                      )}
                    </>
                  )}
                  {" "}Signing off will officially clear this department, and any unfulfilled requirements will be bypassed and greyed out.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPendingConfirm(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSign}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-500/20 transition-ui cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Proceed & Sign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
