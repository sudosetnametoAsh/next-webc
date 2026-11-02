"use client";
import React, { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export interface DeleteTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: { assigned_task_id: number; title: string } | null;
  onConfirm: (taskId: number) => Promise<void>;
}

export default function DeleteTaskDialog({
  isOpen,
  onClose,
  task,
  onConfirm,
}: DeleteTaskDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !task) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(task.assigned_task_id);
      onClose();
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#040711]/80 backdrop-blur-md transition-opacity"
        onClick={() => !isDeleting && onClose()}
      />

      {/* Confirmation Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0a101f] p-6 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 mt-0.5">
            <Trash2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white tracking-tight">
              Remove Clearance Requirement?
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-white">
                "{task.title || "Untitled Task"}"
              </span>
              ?
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              This requirement will be permanently removed from this client's clearance requirements.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Remove Requirement</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
