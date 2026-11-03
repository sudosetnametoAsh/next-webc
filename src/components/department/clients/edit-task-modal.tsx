"use client";
import React, { useState, useEffect } from "react";
import {
  X,
  Pencil,
  Loader2,
  Calendar,
  Upload,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

export interface EditableTask {
  assigned_task_id: number;
  title: string;
  description: string;
  dropbox: string;
  due_date?: string | null;
  status?: string;
}

export interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: EditableTask | null;
  onSave: (updated: {
    assigned_task_id: number;
    title: string;
    description: string;
    due_date: string | null;
    dropbox: string;
  }) => Promise<void>;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  task,
  onSave,
}: EditTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hasDropbox, setHasDropbox] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      const isOnline = Boolean(
        task.dropbox &&
          task.dropbox.trim() !== "" &&
          task.dropbox.toLowerCase() !== "null"
      );
      setHasDropbox(isOnline);
      // Use the same local calendar date shown in the task view, not the UTC date.
      const deadline = task.due_date ? new Date(task.due_date) : null;
      setDueDate(deadline
        ? `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, "0")}-${String(deadline.getDate()).padStart(2, "0")}`
        : "");
      setTitleError("");
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Requirement title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDueDate = dueDate
        ? new Date(`${dueDate}T23:59:59`).toISOString()
        : null;

      // Determine dropbox value:
      // If toggled online, set to "pending" (or keep existing submission url if already online)
      let dropboxValue = "NULL";
      if (hasDropbox) {
        if (
          task.dropbox &&
          task.dropbox.trim() !== "" &&
          task.dropbox.toLowerCase() !== "null"
        ) {
          dropboxValue = task.dropbox;
        } else {
          dropboxValue = "pending";
        }
      }

      await onSave({
        assigned_task_id: task.assigned_task_id,
        title: title.trim(),
        description: description.trim(),
        due_date: formattedDueDate,
        dropbox: dropboxValue,
      });

      onClose();
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-[#040711]/80 backdrop-blur-md transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#070c18] border-b border-slate-800 px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Pencil size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                Edit Requirement
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Update requirement details, submission mode, and deadline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError("");
              }}
              placeholder="e.g., Medical Examination, Library Clearance"
              disabled={isSubmitting}
              className={`w-full rounded-xl border bg-[#070c18] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-colors focus:ring-1 focus:ring-amber-500 ${
                titleError
                  ? "border-rose-500/60 focus:border-rose-500"
                  : "border-slate-800 focus:border-amber-500"
              }`}
            />
            {titleError && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-400">
                <AlertTriangle size={12} />
                {titleError}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Instructions / Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide clear instructions or requirements for this clearance item..."
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-800 bg-[#070c18] p-3 text-xs text-white placeholder:text-slate-500 outline-none resize-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Submission Mode: Dropbox Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#070c18] p-3.5">
            <div className="flex items-start gap-3 min-w-0 pr-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border mt-0.5 ${
                  hasDropbox
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                    : "border-slate-700 bg-slate-800 text-slate-400"
                }`}
              >
                {hasDropbox ? <Upload size={16} /> : <UserCheck size={16} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {hasDropbox ? "Online Dropbox Submission" : "In-Person Requirement"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {hasDropbox
                    ? "Client uploads file documents or photos online for staff review."
                    : "Client settles requirement in person at the department office."}
                </p>
              </div>
            </div>
            <Switch
              checked={hasDropbox}
              onCheckedChange={setHasDropbox}
              disabled={isSubmitting}
              className="data-[state=checked]:bg-amber-500 cursor-pointer shrink-0"
            />
          </div>

          {/* Deadline / Due Date Field */}
          <div className="rounded-xl border border-slate-800 bg-[#070c18] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  Deadline <span className="text-[10px] font-normal text-slate-500">(Optional)</span>
                </span>
              </div>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="text-[11px] text-slate-400 hover:text-rose-400 underline transition-colors cursor-pointer"
                >
                  Clear deadline
                </button>
              )}
            </div>
            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-700 bg-[#0a101f] px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <p className="text-[10px] text-slate-500">
              {dueDate
                ? `Clients must settle this task by ${new Date(dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
                : "Leave blank for clearance season (—)."}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/10 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
