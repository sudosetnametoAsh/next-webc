import React, { useState, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  X,
  Check,
  MessageSquare,
  Clock,
  FileBox,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Pencil,
  Trash2,
  Calendar,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  HelpCircle,
} from "lucide-react";

// --- Types ---
export interface SubmittedFile {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  type: "pdf" | "image";
  url: string;
}

export interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  taskTitle?: string | null;
  taskDescription?: string | null;
  taskDueDate?: string | null;
  taskAssignedAt?: string | null;
  task?: any;
  lastUpdated: string;
  files: SubmittedFile[];
  status?: string;
  comments?: string | null;
  aiAuditReport?: {
    isAuthentic?: boolean;
    authenticityScore?: number;
    detectedStudentId?: string | null;
    detectedStudentName?: string | null;
    detectedDocType?: string;
    issueDate?: string | null;
    studentIdMatches?: boolean;
    authenticityMarkers?: string[];
    flags?: string[];
    flaggedReasons?: string[];
    summary?: string;
    processingFailed?: boolean;
    appeal?: {
      status?: string;
      appealed_at?: string;
      reason?: string;
      student_id?: string;
    };
    [key: string]: any;
  } | null;
  onReopen?: () => Promise<void>;
  onUpdateStatus: (newStatus: "Cleared" | "Flagged", comment: string) => Promise<void>;
  /** Rejects the submission, clears the student's files, and sets status back to Pending */
  onRejectWithResubmit?: (comment: string) => Promise<void>;
  onUpdateFeedback?: (newComment: string) => Promise<void>;
  onEdit?: (task: any) => void;
  onDelete?: (task: any) => void;
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

function formatUploadedAt(dateStr?: string | null): string {
  if (!dateStr || dateStr === "Unknown Date") return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (dateStr.includes("T") || dateStr.includes(":")) {
      const timeFormatted = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${dateFormatted} · ${timeFormatted}`;
    }
    return dateFormatted;
  } catch {
    return dateStr || "Recently";
  }
}

// --- Component ---
export default function SubmissionModal({
  isOpen,
  onClose,
  studentName,
  taskTitle,
  taskDescription,
  taskDueDate,
  taskAssignedAt,
  task,
  lastUpdated,
  files,
  status = "Submitted",
  comments,
  aiAuditReport,
  onUpdateStatus,
  onReopen,
  onRejectWithResubmit,
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
}: SubmissionModalProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showFlaggedApproveConfirm, setShowFlaggedApproveConfirm] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  useEffect(() => {
    setIsEditingFeedback(false);
    setEditedFeedback(comments || "");
  }, [comments, isOpen]);

  const dueDateVal = taskDueDate || task?.due_date;
  const isOverdue =
    dueDateVal &&
    status !== "Cleared" &&
    new Date(dueDateVal).getTime() < Date.now();

  const isVerified = status === "Verified" || aiAuditReport?.isAuthentic === true;
  const isFlagged =
    status === "Flagged" ||
    (aiAuditReport && !aiAuditReport.isAuthentic && !aiAuditReport.processingFailed);

  const handleApprove = async () => {
    // If submission is flagged, require explicit confirmation before approving
    if (isFlagged && !showFlaggedApproveConfirm) {
      setShowFlaggedApproveConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateStatus("Cleared", comment || (comments ?? ""));
      resetAndClose();
    } catch (error) {
      console.error("Failed to approve", error);
    } finally {
      setIsSubmitting(false);
      setShowFlaggedApproveConfirm(false);
    }
  };

  const handleSaveFeedback = async () => {
    setIsSavingFeedback(true);
    try {
      if (onUpdateFeedback) {
        await onUpdateFeedback(editedFeedback);
      }
      setIsEditingFeedback(false);
    } catch (err) {
      console.error("Failed to update feedback", err);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleRejectClick = () => {
    // If user hasn't typed a comment but AI has flags, pre-fill with AI flags
    if (!comment.trim() && aiAuditReport?.flags && aiAuditReport.flags.length > 0) {
      setComment(aiAuditReport.flags.join("; "));
    }
    setShowRejectConfirm(true);
  };

  const handleConfirmReject = async () => {
    if (!comment.trim()) {
      setCommentError("A reason is required when rejecting a submission.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (onRejectWithResubmit) {
        await onRejectWithResubmit(comment);
      } else {
        await onUpdateStatus("Flagged", comment);
      }
      resetAndClose();
    } catch (error) {
      console.error("Failed to reject with resubmit", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    if (commentError && value.trim()) {
      setCommentError("");
    }
  };

  const handleConfirmReopen = async () => {
    if (!onReopen) return;
    setIsSubmitting(true);
    try {
      await onReopen();
      resetAndClose();
    } catch (error) {
      console.error("Failed to reopen requirement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setComment("");
    setShowReopenConfirm(false);
    setShowRejectConfirm(false);
    setShowFlaggedApproveConfirm(false);
    setCommentError("");
    setIsEditingFeedback(false);
    setEditedFeedback("");
    onClose();
  };

  if (!isOpen) return null;

  const personLabel = viewType === "students" ? "student" : "staff";

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
        <div className="relative w-full rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Section */}
        <div className="bg-[#070c18] border-b border-slate-800 px-6 py-5 flex justify-between items-start gap-4">
          <div className="flex gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 mt-0.5">
              <FileBox size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                {studentName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate font-medium">
                {taskTitle || "Clearance Requirement"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
            {status === "Cleared" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Cleared
              </span>
            ) : status === "Pending" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-300">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Pending
              </span>
            ) : status === "Verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> AI Verified
              </span>
            ) : status === "Flagged" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/15 px-2.5 py-1 text-xs font-bold text-blue-300">
                <AlertTriangle className="h-3.5 w-3.5 text-blue-400" /> Flagged
              </span>
            ) : status === "Rejected" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-300">
                <XCircle className="h-3.5 w-3.5 text-rose-400" /> Rejected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> For Review
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
            {taskDescription && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Requirement Description
                </label>
                <div className="w-full p-3.5 border border-slate-800/80 rounded-xl text-xs bg-[#070c18] text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {taskDescription}
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
                    {dueDateVal ? formatDate(dueDateVal) : "—"}
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
                    {formatDate(taskAssignedAt || task?.assigned_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Firsthand Authenticity Audit Card */}
          {aiAuditReport && (
            aiAuditReport.processingFailed ? (
              <div className="bg-[#10172A] border border-amber-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm tracking-wide mb-2">
                  <Clock className="w-[18px] h-[18px]" />
                  <h3>Manual Staff Verification Queued</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {aiAuditReport.summary ||
                    "Automated AI document analysis could not be completed. Please review the submitted document manually and approve or return as appropriate."}
                </p>
              </div>
            ) : (
              <div className="bg-[#10172A] border border-blue-900/40 rounded-xl p-5">
                {/* AI Header */}
                <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-400 w-[18px] h-[18px]" />
                    <h3 className="text-blue-400 font-semibold text-sm tracking-wide">
                      Multimodal AI Vision Assessment
                    </h3>
                  </div>
                  {aiAuditReport.authenticityScore !== undefined && (
                    <div className="bg-blue-950/60 border border-blue-900/60 text-blue-300 text-xs px-2.5 py-1 rounded-full font-medium">
                      {aiAuditReport.authenticityScore}% Authenticity
                    </div>
                  )}
                </div>

                {/* AI Feedback / Summary */}
                {aiAuditReport.summary && (
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">
                    {aiAuditReport.summary}
                  </p>
                )}

                {/* Review Flags */}
                {((aiAuditReport.flags && aiAuditReport.flags.length > 0) ||
                  (aiAuditReport.flaggedReasons && aiAuditReport.flaggedReasons.length > 0)) && (
                  <div>
                    <h4 className="text-rose-400 text-sm font-semibold mb-2">
                      Review Flags:
                    </h4>
                    <ul className="text-rose-300/90 text-[13.5px] space-y-1.5">
                      {(aiAuditReport.flags || aiAuditReport.flaggedReasons || []).map((flag: string, idx: number) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                          <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-rose-400/80 shrink-0"></span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          )}

          {/* Files List (Hidden on Pending status) */}
          {status !== "Pending" && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Submitted Document
                </h3>
              </div>

              {files.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-[#070c18]/70 hover:border-amber-500/40 hover:bg-[#0c1427]/90 transition-ui cursor-pointer"
                      title={`Click to preview ${file.name}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            (file.type === "pdf" || /\.(docx|txt|csv)(?:$|[?#])/i.test(file.name || file.url))
                              ? "border-rose-500/30 bg-rose-500/15 text-rose-400 group-hover:border-rose-500/50"
                              : "border-blue-500/30 bg-blue-500/15 text-blue-400 group-hover:border-blue-500/50"
                          }`}
                        >
                          {(file.type === "pdf" || /\.(docx|txt|csv)(?:$|[?#])/i.test(file.name || file.url)) ? <FileText size={18} /> : <ImageIcon size={18} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {file.size !== "N/A" && `${file.size} · `}Uploaded {formatUploadedAt(file.uploadDate || lastUpdated)}
                          </p>
                        </div>
                      </div>

                      <ExternalLink size={14} className="text-slate-500 group-hover:text-amber-300 transition-colors shrink-0 mr-1" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 bg-[#070c18]/60 p-4 text-center text-xs text-slate-500">
                  {status === "Rejected"
                    ? "Submission rejected. Waiting for the client to re-upload files."
                    : "No documents attached."}
                </div>
              )}
            </div>
          )}

          {/* Feedback Section (Hidden for pending and cleared tasks) */}
          {status !== "Pending" && status !== "Cleared" && (
            status === "Rejected" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Feedback
                  </label>
                  {!isEditingFeedback && onUpdateFeedback && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditedFeedback(comments || "");
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
                    {comments || <span className="text-slate-500 italic">No feedback remarks recorded.</span>}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Feedback
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  placeholder="Add your review notes or feedback for the client..."
                  disabled={isSubmitting}
                  className={`w-full h-20 p-3 border rounded-xl text-xs bg-[#070c18] text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none disabled:opacity-50 ${
                    commentError ? "border-rose-500/50 bg-rose-500/5" : "border-slate-800"
                  }`}
                />
                {commentError && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-400">
                    <AlertTriangle size={12} />
                    {commentError}
                  </p>
                )}
              </div>
            )
          )}

          {/* Appeal Notice (displayed strictly when student has submitted an appeal) */}
          {status !== "Rejected" && Boolean(aiAuditReport?.appeal) && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 sm:p-4.5 flex items-start gap-3.5 text-blue-200">
              <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm leading-relaxed text-blue-200/90">
                <p>
                  <span className="font-bold text-blue-300">
                    An appeal was submitted for this document.
                  </span>{" "}
                  Please conduct a manual review to verify authenticity and update the status.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {status === "Cleared" ? (
          /* Cleared State Footer */
          !showReopenConfirm ? (
            <div className="p-4 border-t border-slate-800 bg-[#070c18] flex gap-3 sm:flex-row flex-col">
              <button
                type="button"
                onClick={() => setShowReopenConfirm(true)}
                disabled={isSubmitting || !onReopen}
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
                    Reopen this requirement?
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
          /* Flagged Approval Confirmation View */
          <div className="p-4 border-t border-amber-500/40 bg-amber-500/10 space-y-3 animate-in ease-out fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle size={15} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">
                  Notice: Approve Flagged Submission?
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  This document was flagged by the system
                  {aiAuditReport?.flags && aiAuditReport.flags.length > 0
                    ? ` (${aiAuditReport.flags.join(", ")})`
                    : ""}
                  . Are you sure you want to override the flag and approve this requirement?
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
        ) : !showRejectConfirm ? (
          <div className="p-4 border-t border-slate-800 bg-[#070c18] flex gap-3 sm:flex-row flex-col">
            {status === "Rejected" || status === "Pending" ? (
              <div className="w-full py-3 px-4 bg-slate-800/60 border border-slate-800 text-slate-400 font-medium rounded-xl text-center flex items-center justify-center gap-2 text-xs sm:text-sm select-none">
                <Clock size={15} className="text-slate-400" />
                <span>Awaiting client submission</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRejectClick}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors focus:ring-2 focus:ring-slate-600 focus:outline-none cursor-pointer text-center disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>Request Resubmission</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-amber-500/50 focus:outline-none shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {/* <CheckCircle2 size={16} className="stroke-[2.5]" /> */}
                      <span>
                        {status === "Verified"
                          ? "Authorize & Clear"
                          : "Approve & Clear"}
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        ) : (
          /* Rejection Confirmation View */
          <div className="p-4 border-t border-rose-500/30 bg-rose-500/10 space-y-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <AlertTriangle size={15} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">
                  Reject this submission and request resubmission?
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  The {personLabel} will be notified with your feedback and required to upload a corrected file.
                </p>
              </div>
            </div>

            <div className="flex gap-3 sm:flex-row flex-col">
              <button
                type="button"
                onClick={() => setShowRejectConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors focus:ring-2 focus:ring-slate-600 focus:outline-none cursor-pointer text-center text-xs sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-rose-500/50 focus:outline-none shadow-lg shadow-rose-600/10 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  // <RotateCcw size={16} />
                  null
                )}
                <span>Confirm</span>
              </button>
            </div>
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
