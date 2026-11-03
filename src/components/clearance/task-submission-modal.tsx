"use client";

import { DOCUMENT_ACCEPT, DOCUMENT_FORMAT_LABEL, validateDocumentUpload } from "@/lib/document-upload";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Building2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getDepartmentIcon } from "@/lib/department-icons";

export interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: number;
  deptName: string;
  studentId: string;
  iconName?: string | null;
  onSuccess?: () => void;
}

export default function TaskSubmissionModal({
  isOpen,
  onClose,
  taskTitle,
  taskId,
  deptName,
  studentId,
  iconName,
  onSuccess,
}: TaskSubmissionModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const DeptIcon = getDepartmentIcon(iconName, deptName) || Building2;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const validationError = validateDocumentUpload(selected);
      if (validationError) {
        setFile(null);
        setErrorMsg(validationError);
        return;
      }
      setFile(selected);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("A document file is required to submit.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("task", taskTitle);
      formData.append("taskId", taskId.toString());
      formData.append("department", deptName);
      formData.append("studentId", studentId);

      const res = await fetch("/api/student/submissions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit document");
      }

      if (data.status === "Verified") {
        toast.success(
          "Document AI Verified (Factor 1 Passed)! Awaiting officer sign-off.",
        );
      } else if (data.status === "Cleared") {
        toast.success("Document uploaded & cleared!");
      } else if (data.status === "Flagged") {
        toast.warning(
          "Document uploaded with AI anomaly flags. An officer will manually review.",
        );
      } else if (data.aiReport?.processingFailed) {
        toast.info(
          "Document submitted. Queued for manual officer verification.",
        );
      } else {
        toast.success("Document submitted successfully for review!");
      }

      window.dispatchEvent(new Event("clearance_data_invalidated"));
      router.refresh();
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMsg(err.message || "Failed to submit task. Please try again.");
      toast.error(err.message || "Failed to submit task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setFile(null);
          setErrorMsg(null);
          onClose();
        }
      }}
    >
      <DialogContent className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0a101f] p-6 shadow-2xl [&>button]:hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <DeptIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Submit Requirement
              </DialogTitle>
              <p className="text-xs text-slate-400">
                {deptName} · Document Verification
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task Title Card */}
        <div className="rounded-xl border border-slate-800/90 bg-[#070c18] p-3.5 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Requirement
          </span>
          <p className="text-sm font-semibold text-white mt-0.5">{taskTitle}</p>
        </div>

        {/* AI Multimodal Verification Callout */}
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300">
          <Sparkles className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Your upload will be analyzed automatically by{" "}
            <span className="font-semibold text-blue-200">AI Vision</span> to
            verify authenticity, date validity, and student matching.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="file-upload"
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                errorMsg
                  ? "border-rose-500/50 bg-rose-950/10 hover:border-rose-500"
                  : file
                  ? "border-amber-500/50 bg-amber-500/5 hover:border-amber-500"
                  : "border-slate-800 bg-[#070c18] hover:border-slate-700 hover:bg-[#091122]"
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 mb-2">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-white max-w-xs truncate">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to replace file
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/60 text-slate-400 mb-2">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">
                    Click to select file or drag &amp; drop
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {DOCUMENT_FORMAT_LABEL}
                  </p>
                </div>
              )}

              <input
                id="file-upload"
                type="file"
                accept={DOCUMENT_ACCEPT}
                className="hidden"
                disabled={isSubmitting}
                onChange={handleFileChange}
              />
            </label>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500 py-2.5 text-xs font-bold text-slate-950 shadow-sm hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Verifying with AI Vision...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Confirm Submission</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
