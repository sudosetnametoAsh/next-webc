"use client";
import { toast } from "sonner";
import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Check,
  CheckCircle2,
  User,
  UserCheck,
  Calendar,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export type InPersonTaskStatus =
  | "Cleared"
  | "Pending"
  | "Flagged"
  | "Submitted"
  | "Rejected"
  | "Verified";

export interface InPersonTask {
  assigned_task_id: number;
  title: string;
  description?: string;
  status: InPersonTaskStatus;
  assigned_at: string;
  due_date?: string | null;
  comments?: string;
}

export interface InPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  task: InPersonTask | null;
  onUpdateStatus: (
    taskId: number,
    newStatus: InPersonTaskStatus,
    comment: string
  ) => Promise<void>;
  onUpdateFeedback?: (taskId: number, newComment: string) => Promise<void>;
  onEdit?: (task: InPersonTask) => void;
  onDelete?: (task: InPersonTask) => void;
  viewType?: "students" | "staff";
  hasPrevTask?: boolean;
  onPrevTask?: () => void;
  hasNextTask?: boolean;
  onNextTask?: () => void;
  isFirstTask?: boolean;
  isLastTask?: boolean;
  hasPrevClient?: boolean;
  prevClientName?: string;
  onPrevClient?: () => void;
  hasNextClient?: boolean;
  nextClientName?: string;
  onNextClient?: () => void;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString || "—";
  }
}

export default function InPersonModal({
  isOpen,
  onClose,
  studentName,
  task,
  onUpdateStatus,
  onUpdateFeedback,
  onEdit,
  onDelete,
  viewType = "students",
  hasPrevTask = false,
  onPrevTask,
  hasNextTask = false,
  onNextTask,
  isFirstTask = false,
  isLastTask = false,
  hasPrevClient = false,
  prevClientName,
  onPrevClient,
  hasNextClient = false,
  nextClientName,
  onNextClient,
}: InPersonModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [showFlaggedApproveConfirm, setShowFlaggedApproveConfirm] = useState(false);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  useEffect(() => {
    setShowReopenConfirm(false);
    setShowFlaggedApproveConfirm(false);
    setIsEditingFeedback(false);
    setEditedFeedback(task?.comments || "");
  }, [task?.assigned_task_id, task?.comments, isOpen]);

  if (!isOpen || !task) return null;

  const isOverdue =
    task.due_date &&
    task.status !== "Cleared" &&
    new Date(task.due_date).getTime() < Date.now();

  const personLabel = viewType === "students" ? "student" : "staff";

  const handleApprove = async () => {
    if (task.status === "Flagged" && !showFlaggedApproveConfirm) {
      setShowFlaggedApproveConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateStatus(
        task.assigned_task_id,
        "Cleared",
        task.comments ?? ""
      );
      toast.success("Requirement cleared");
      resetAndClose();
    } catch (error) {
      console.error("Failed to approve in-person requirement:", error);
      toast.error(error instanceof Error ? error.message : "Could not update task status.");
    } finally {
      setIsSubmitting(false);
      setShowFlaggedApproveConfirm(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!task) return;
    setIsSavingFeedback(true);
    try {
      if (onUpdateFeedback) {
        await onUpdateFeedback(task.assigned_task_id, editedFeedback);
        toast.success("Feedback saved");
      }
      setIsEditingFeedback(false);
    } catch (err) {
      console.error("Failed to update feedback", err);
      toast.error("Could not save feedback. Please try again.");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleConfirmReopen = async () => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(task.assigned_task_id, "Pending", task.comments ?? "");
      toast.success("Requirement reopened");
      resetAndClose();
    } catch (error) {
      console.error("Failed to reopen requirement:", error);
      toast.error(error instanceof Error ? error.message : "Could not update task status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setShowReopenConfirm(false);
    setShowFlaggedApproveConfirm(false);
    setIsEditingFeedback(false);
    setEditedFeedback("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-[#040711]/80 backdrop-blur-md transition-opacity"
        onClick={resetAndClose}
      />

      {/* Outer Positioning Container (unclipped for outside navigation buttons) */}
      <div className="relative w-full max-w-2xl px-11 sm:px-0 z-10 flex items-center justify-center">
        {/* Left Navigation Group */}
        <div className="absolute left-0.5 sm:left-auto sm:right-[calc(100%+14px)] top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
          {/* Previous Client '<<' Button (Appears beside chevron at start of task list) */}
          {isFirstTask && hasPrevClient && (
            <button
              type="button"
              onClick={onPrevClient}
              title={prevClientName ? `Previous client: ${prevClientName}` : "Previous client"}
              className="flex h-9 sm:h-10 px-2.5 sm:px-3 shrink-0 items-center justify-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-xl shadow-amber-500/10 backdrop-blur-md hover:bg-amber-500/25 hover:border-amber-400 hover:text-amber-200 transition-ui cursor-pointer font-bold text-xs group whitespace-nowrap animate-in ease-out fade-in zoom-in-90 duration-150"
            >
              <ChevronsLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden md:inline font-semibold">Prev Client</span>
            </button>
          )}

          {/* Left Navigation Chevron */}
          <button
            type="button"
            onClick={onPrevTask}
            disabled={!hasPrevTask}
            title={hasPrevTask ? "Previous requirement" : "First requirement"}
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border shadow-xl backdrop-blur-md transition-ui ${
              hasPrevTask
                ? "border-slate-800 bg-[#0a101f]/95 text-slate-300 hover:border-amber-500/50 hover:bg-slate-800 hover:text-white cursor-pointer"
                : "border-slate-800/40 bg-[#0a101f]/40 text-slate-600 opacity-30 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Dialog */}
        <div className="relative w-full rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[92vh] animate-in ease-out fade-in zoom-in-95 duration-150">
        {/* Header Section */}
        <div className="bg-[#070c18] border-b border-slate-800 px-6 py-5 flex justify-between items-start gap-4">
          <div className="flex gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 mt-0.5">
              <UserCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                {studentName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate font-medium">
                {task.title || "In-Person Requirement"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
            {task.status === "Cleared" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Cleared
              </span>
            ) : task.status === "Flagged" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/15 px-2.5 py-1 text-xs font-bold text-blue-300">
                <AlertTriangle className="h-3.5 w-3.5 text-blue-400" /> Flagged
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-300">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" /> In person
              </span>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(task)}
                disabled={isSubmitting}
                title="Edit requirement"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Pencil size={14} />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(task)}
                disabled={isSubmitting}
                title="Remove requirement"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={resetAndClose}
              disabled={isSubmitting}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Requirement Details & Meta */}
          <div className="space-y-3">
            {task.description && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Requirement Description
                </label>
                <div className="w-full p-3.5 border border-slate-800/80 rounded-xl text-xs bg-[#070c18] text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </div>
              </div>
            )}

            {/* Meta Details: Deadline & Assigned Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-[#070c18] p-3">
                <Calendar
                  size={16}
                  className={isOverdue ? "text-rose-400 shrink-0" : "text-amber-400 shrink-0"}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Deadline
                  </p>
                  <p
                    className={`text-xs font-semibold mt-0.5 truncate ${
                      isOverdue ? "text-rose-400" : "text-slate-200"
                    }`}
                  >
                    {task.due_date ? formatDate(task.due_date) : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-[#070c18] p-3">
                <Clock size={16} className="text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Assigned Date
                  </p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
                    {formatDate(task.assigned_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. In-Person Clearance Requirement Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-4.5 flex items-start gap-3.5 text-amber-200">
            <User className="text-amber-400 w-5 h-5 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-amber-200/90 leading-relaxed">
                In-person clearance: Please ensure the <span className="font-bold text-amber-300">{personLabel}</span> completes this requirement or presents required physical documents at your office before clearance can be authorized.
              </p>
            </div>
          </div>

          {/* Reviewer Feedback / History if flagged or rejected */}
          {(task.status === "Flagged" || task.status === "Rejected") && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Feedback
                </label>
                {!isEditingFeedback && onUpdateFeedback && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedFeedback(task.comments || "");
                      setIsEditingFeedback(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <Pencil size={12} />
                    <span>Edit Feedback</span>
                  </button>
                )}
              </div>

              {isEditingFeedback ? (
                <div className="space-y-2.5">
                  <textarea
                    value={editedFeedback}
                    onChange={(e) => setEditedFeedback(e.target.value)}
                    placeholder="Update review notes or feedback for the client..."
                    disabled={isSavingFeedback}
                    rows={3}
                    className="w-full p-3 border border-amber-500/50 rounded-xl text-xs bg-[#070c18] text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingFeedback(false)}
                      disabled={isSavingFeedback}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFeedback}
                      disabled={isSavingFeedback}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isSavingFeedback ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={12} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full p-3.5 border border-slate-800/80 rounded-xl text-xs bg-[#070c18] text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {task.comments || <span className="text-slate-500 italic">No feedback remarks recorded.</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {task.status === "Cleared" ? (
          /* Cleared State Footer */
          !showReopenConfirm ? (
            <div className="p-4 border-t border-slate-800 bg-[#070c18] flex gap-3 sm:flex-row flex-col">
              <button
                type="button"
                onClick={() => setShowReopenConfirm(true)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-colors focus:ring-2 focus:ring-slate-600 focus:outline-none cursor-pointer text-center disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm border border-slate-700/60"
              >
                <RotateCcw size={15} />
                <span>Reopen (Mark Pending)</span>
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                <CheckCircle2 size={16} />
                <span>Requirement Cleared</span>
              </button>
            </div>
          ) : (
            <div className="p-4 border-t border-amber-500/30 bg-amber-500/10 space-y-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <RotateCcw size={15} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">
                    Reopen this in-person requirement?
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    This will set the status back to Pending for the {personLabel}.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 sm:flex-row flex-col">
                <button
                  type="button"
                  onClick={() => setShowReopenConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors focus:ring-2 focus:ring-slate-600 focus:outline-none cursor-pointer text-center text-xs sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReopen}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-amber-500/50 focus:outline-none cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>Confirm Reopen</span>
                </button>
              </div>
            </div>
          )
        ) : showFlaggedApproveConfirm ? (
          /* Flagged In-Person Approval Confirmation */
          <div className="p-4 border-t border-amber-500/40 bg-amber-500/10 space-y-3 animate-in ease-out fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle size={15} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">
                  Notice: Approve Flagged Requirement?
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  This requirement was marked as Flagged. Are you sure you want to approve and clear this requirement?
                </p>
              </div>
            </div>
            <div className="flex gap-3 sm:flex-row flex-col">
              <button
                type="button"
                onClick={() => setShowFlaggedApproveConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors focus:ring-2 focus:ring-slate-600 focus:outline-none cursor-pointer text-center text-xs sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-amber-500/50 focus:outline-none shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>Override & Approve</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal In-Person Approve Action */
          <div className="p-4 border-t border-slate-800 bg-[#070c18] flex gap-3 sm:flex-row flex-col">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-amber-500/50 focus:outline-none shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="stroke-[2.5]" />
                  <span>Approve & Clear</span>
                </>
              )}
            </button>
          </div>
        )}
        </div>

        {/* Right Navigation Group */}
        <div className="absolute right-0.5 sm:right-auto sm:left-[calc(100%+14px)] top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
          {/* Right Navigation Chevron */}
          <button
            type="button"
            onClick={onNextTask}
            disabled={!hasNextTask}
            title={hasNextTask ? "Next requirement" : "Last requirement"}
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border shadow-xl backdrop-blur-md transition-ui ${
              hasNextTask
                ? "border-slate-800 bg-[#0a101f]/95 text-slate-300 hover:border-amber-500/50 hover:bg-slate-800 hover:text-white cursor-pointer"
                : "border-slate-800/40 bg-[#0a101f]/40 text-slate-600 opacity-30 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Next Client '>>' Button (Appears beside chevron at end of task list) */}
          {isLastTask && hasNextClient && (
            <button
              type="button"
              onClick={onNextClient}
              title={nextClientName ? `Next client: ${nextClientName}` : "Next client"}
              className="flex h-9 sm:h-10 px-2.5 sm:px-3 shrink-0 items-center justify-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-xl shadow-amber-500/10 backdrop-blur-md hover:bg-amber-500/25 hover:border-amber-400 hover:text-amber-200 transition-ui cursor-pointer font-bold text-xs group whitespace-nowrap animate-in ease-out fade-in zoom-in-90 duration-150"
            >
              <span className="hidden md:inline font-semibold">Next Client</span>
              <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
