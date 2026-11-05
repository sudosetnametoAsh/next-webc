"use client";

import { useLiveTaskState } from "@/hooks/clearance/use-live-task-state";

import { APP_TIME_ZONE } from "@/lib/date-time";


import { DOCUMENT_ACCEPT, DOCUMENT_FORMAT_LABEL, validateDocumentUpload } from "@/lib/document-upload";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Clock,
  Loader2,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Calendar,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileBox,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  FileCheck,
  User,
  UserCheck,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  isTaskNotificationAcknowledged,
  markTaskNotificationAcknowledged,
} from "@/lib/clearance-logic";

export interface ModalFileItem {
  id: string | number;
  name: string;
  size: string;
  uploadDate: string;
  type: "pdf" | "image";
  url: string;
}

export interface ModalTaskData {
  id: number;
  title: string;
  description: string;
  status: string;
  isInPerson: boolean;
  due_date?: string | null;
  assigned_at?: string | null;
  uploaded_at?: string | null;
  comments?: string | null;
  ai_audit_report?: any;
  files?: ModalFileItem[];
}

export function parseDropboxFiles(
  dropbox: string | null | undefined,
  uploadedAt?: string | null
): ModalFileItem[] {
  if (!dropbox || typeof dropbox !== "string") return [];
  const trimmed = dropbox.trim();
  if (
    trimmed === "" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined" ||
    trimmed.toLowerCase() === "pending"
  ) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((f: any, idx: number) => ({
        id: f.id || String(idx),
        name: f.name || "Uploaded Document",
        size: f.size || "Document File",
        uploadDate: f.uploadDate || uploadedAt || "Recently",
        type:
          f.type ||
          (f.name?.toLowerCase().endsWith(".pdf") ? "pdf" : "image"),
        url: f.url || "#",
      }));
    }
    if (parsed && typeof parsed === "object" && parsed.url) {
      return [
        {
          id: parsed.id || "1",
          name: parsed.name || "Uploaded Document",
          size: parsed.size || "Document File",
          uploadDate: parsed.uploadDate || uploadedAt || "Recently",
          type:
            parsed.type ||
            (parsed.name?.toLowerCase().endsWith(".pdf") ? "pdf" : "image"),
          url: parsed.url,
        },
      ];
    }
  } catch {}
  const isPdf = trimmed.toLowerCase().includes(".pdf");
  return [
    {
      id: "1",
      name:
        decodeURIComponent(trimmed.split("/").pop() || "Uploaded Document"),
      size: "Document File",
      uploadDate: uploadedAt || "Recently",
      type: isPdf ? "pdf" : "image",
      url: trimmed,
    },
  ];
}

export interface RequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ModalTaskData | null;
  deptName: string;
  tierNumber?: number;
  studentId: string;
  hasPrevTask?: boolean;
  onPrevTask?: () => void;
  hasNextTask?: boolean;
  onNextTask?: () => void;
  isFirstTask?: boolean;
  isLastTask?: boolean;
  hasPrevDept?: boolean;
  prevDeptName?: string;
  onPrevDept?: () => void;
  hasNextDept?: boolean;
  nextDeptName?: string;
  onNextDept?: () => void;
  isLoadingDept?: boolean;
  onSubmissionSuccess?: (
    taskId: number,
    uploadedUrl: string,
    fileName: string,
    newStatus: string,
    aiReport?: any
  ) => void;
  onAppealSuccess?: (taskId: number, newReport: any) => void;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      timeZone: APP_TIME_ZONE,
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
      timeZone: APP_TIME_ZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (dateStr.includes("T") || dateStr.includes(":")) {
      const timeFormatted = d.toLocaleTimeString("en-US", {
        timeZone: APP_TIME_ZONE,
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

export default function RequirementModal({
  isOpen,
  onClose,
  task,
  deptName,
  tierNumber = 1,
  studentId,
  hasPrevTask = false,
  onPrevTask,
  hasNextTask = false,
  onNextTask,
  isFirstTask = false,
  isLastTask = false,
  hasPrevDept = false,
  prevDeptName,
  onPrevDept,
  hasNextDept = false,
  nextDeptName,
  onNextDept,
  isLoadingDept = false,
  onSubmissionSuccess,
  onAppealSuccess,
}: RequirementModalProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAppealing, setIsAppealing] = useState(false);
  const [localFiles, setLocalFiles] = useState<ModalFileItem[]>(task?.files || []);
  const [localStatus, setLocalStatus] = useLiveTaskState<string>(task?.status || "");
  const [localAiReport, setLocalAiReport] = useState<any>(null);
  const [prevTaskId, setPrevTaskId] = useState<number | null>(task?.id ?? null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);

  // Synchronize state immediately during render when task changes or modal opens
  if (task && (task.id !== prevTaskId || (isOpen && !prevIsOpen))) {
    setPrevTaskId(task.id);
    setPrevIsOpen(isOpen);
    setSelectedFile(null);
    setLocalFiles(task.files || []);
    setLocalStatus(task.status);
    let parsedAi = task.ai_audit_report;
    if (typeof parsedAi === "string") {
      try {
        parsedAi = JSON.parse(parsedAi);
      } catch {
        parsedAi = null;
      }
    }
    setLocalAiReport(parsedAi || null);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
    setSelectedFile(null);
  }

  // Update local server data if task data changes for the same task without wiping selectedFile
  useEffect(() => {
    if (task && isOpen) {
      if (task.files) {
        setLocalFiles(task.files);
      }
      if (task.ai_audit_report !== undefined) {
        let parsedAi = task.ai_audit_report;
        if (typeof parsedAi === "string") {
          try {
            parsedAi = JSON.parse(parsedAi);
          } catch {
            parsedAi = null;
          }
        }
        setLocalAiReport(parsedAi || null);
      }
    }
  }, [task?.id, task?.status, task?.files, task?.ai_audit_report, isOpen]);

  // Automatically mark corresponding database notifications as read when opening a task requirement (idempotent)
  useEffect(() => {
    if (!isOpen || !task?.id || !studentId) return;
    if (isTaskNotificationAcknowledged(studentId, task.id)) return;
    markTaskNotificationAcknowledged(studentId, task.id);

    try {
      fetch("/api/student/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          userId: studentId,
        }),
      })
        .then(() => {
          window.dispatchEvent(new Event("notifications_updated"));
        })
        .catch(() => {});
    } catch {}
  }, [isOpen, task?.id, task?.title, studentId]);

  if (!isOpen) return null;
  if (!task && !isLoadingDept) return null;

  const currentStatus = localStatus || task?.status || "Pending";
  const now = Date.now();
  const dueTime = task?.due_date ? new Date(task.due_date).getTime() : 0;
  const diffMs = dueTime - now;
  const isOverdue =
    Boolean(task?.due_date) &&
    currentStatus !== "Cleared" &&
    diffMs < 0;
  const isDueSoon =
    Boolean(task?.due_date) &&
    currentStatus !== "Cleared" &&
    diffMs >= 0 &&
    diffMs <= 24 * 60 * 60 * 1000;
  const isUrgent = isOverdue || isDueSoon;

  const isReturned =
    currentStatus === "Returned" ||
    currentStatus === "Rejected" ||
    task?.status === "Returned" ||
    task?.status === "Rejected";

  const appealInfo =
    (localAiReport && typeof localAiReport === "object" ? localAiReport.appeal : null) ||
    (task?.ai_audit_report && typeof task.ai_audit_report === "object" ? task.ai_audit_report.appeal : null);
  const hasAppeal = !isReturned && Boolean(appealInfo);

  const isFlagged = !isReturned && (currentStatus === "Flagged" || task?.status === "Flagged");
  const isVerified = !isReturned && currentStatus === "Verified";
  const isCleared = !isReturned && currentStatus === "Cleared";
  const isForReview =
    !isReturned &&
    (currentStatus === "Submitted" ||
      currentStatus === "For review" ||
      currentStatus === "For Review" ||
      hasAppeal);
  const isPending =
    !isReturned &&
    (currentStatus === "Pending" ||
      currentStatus === "In Person" ||
      (!isCleared && !isVerified && !isFlagged && !isForReview));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationError = validateDocumentUpload(file);
      if (validationError) {
        setSelectedFile(null);
        toast.error(validationError);
        return;
      }
      setSelectedFile(file);
    }
    e.target.value = "";
  };

  const handleUploadSubmit = async () => {
    if (!task) return;
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!studentId) {
      toast.error("Student session identifier not found");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("task", task.title);
      formData.append("taskId", String(task.id));
      formData.append("studentId", studentId);
      formData.append("department", deptName);

      const res = await fetch("/api/student/submissions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit document");
      }

      const isPdf = selectedFile.name.toLowerCase().endsWith(".pdf");
      const newFileItem: ModalFileItem = {
        id: String(Date.now()),
        name: selectedFile.name,
        size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadDate: new Date().toISOString(),
        type: isPdf ? "pdf" : "image",
        url: data.url || "#",
      };

      const updatedFiles = [newFileItem, ...localFiles];
      const newStatus = data.status || "Submitted";

      setLocalFiles(updatedFiles);
      setLocalStatus(newStatus);
      if (data.aiReport) {
        setLocalAiReport(data.aiReport);
      }
      setSelectedFile(null);

      if (data.status === "Verified") {
        toast.success(
          "Document verified. Awaiting staff approval."
        );
      } else if (data.status === "Cleared") {
        toast.success("Document uploaded and cleared.");
      } else if (data.status === "Flagged") {
        toast.warning(
          "Document submitted. Staff will review the issues found during verification."
        );
      } else {
        toast.success("Document submitted for review.");
      }

      window.dispatchEvent(new Event("clearance_data_invalidated"));
      router.refresh();
      // Purge any existing rejected or flagged keys for this task so a subsequent staff rejection or new flag triggers a fresh notification
      try {
        const studentStorageKey = `student_viewed_tasks_${studentId || "default"}`;
        const stored = localStorage.getItem(studentStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = parsed.filter((k: string | number) => {
            if (typeof k !== "string") return k !== task.id;
            return (
              !k.startsWith(`${task.id}_rejected`) &&
              !k.startsWith(`${task.id}_flagged`) &&
              k !== `${task.id}_rejected` &&
              k !== `${task.id}_flagged` &&
              k !== String(task.id)
            );
          });
          localStorage.setItem(studentStorageKey, JSON.stringify(filtered));
          window.dispatchEvent(new Event("student_tasks_viewed_updated"));
        }

        const tasksPageKey = `student_tasks_page_viewed_${studentId || "default"}`;
        const storedTasksPage = localStorage.getItem(tasksPageKey);
        if (storedTasksPage) {
          const parsedPage = JSON.parse(storedTasksPage);
          const filteredPage = parsedPage.filter((k: string | number) => {
            if (typeof k !== "string") return k !== task.id;
            return (
              !k.startsWith(`${task.id}_rejected`) &&
              !k.startsWith(`${task.id}_flagged`) &&
              k !== `${task.id}_rejected` &&
              k !== `${task.id}_flagged` &&
              k !== String(task.id)
            );
          });
          localStorage.setItem(tasksPageKey, JSON.stringify(filteredPage));
          window.dispatchEvent(new Event("student_tasks_page_viewed_updated"));
        }
        const ackKey = `student_ack_tasks_v2_${studentId || "default"}`;
        const storedAck = sessionStorage.getItem(ackKey) || localStorage.getItem(ackKey);
        if (storedAck) {
          const parsedAck = JSON.parse(storedAck);
          const filteredAck = parsedAck.filter((k: string | number) => {
            if (typeof k !== "string") return k !== task.id;
            return (
              !k.startsWith(`${task.id}_rejected`) &&
              !k.startsWith(`${task.id}_flagged`) &&
              k !== `${task.id}_rejected` &&
              k !== `${task.id}_flagged` &&
              k !== String(task.id)
            );
          });
          sessionStorage.setItem(ackKey, JSON.stringify(filteredAck));
          localStorage.setItem(ackKey, JSON.stringify(filteredAck));
        }
      } catch {}

      if (onSubmissionSuccess) {
        onSubmissionSuccess(task.id, data.url || "", selectedFile.name, newStatus, data.aiReport);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleInitiateAppeal = async () => {
    if (!task) return;
    if (!studentId) {
      toast.error("Student session identifier not found.");
      return;
    }
    setIsAppealing(true);
    try {
      const res = await fetch("/api/student/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          studentId,
          reason: "Student appealed early AI audit authenticity flag.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit appeal");

      const updatedReport = data.ai_audit_report;
      setLocalAiReport(updatedReport);
      setLocalStatus("For review");
      toast.success("Appeal submitted for department review.");
      if (onAppealSuccess) {
        onAppealSuccess(task.id, updatedReport);
      }
      window.dispatchEvent(new Event("clearance_data_invalidated"));
      router.refresh();
    } catch (err: any) {
      console.error("Appeal error:", err);
      toast.error(err.message || "Failed to submit appeal");
    } finally {
      setIsAppealing(false);
    }
  };

  const renderStatusBadge = () => {
    if (isLoadingDept) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/80 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-slate-400 whitespace-nowrap shrink-0">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400 shrink-0" />
          <span className="shrink-0">Loading</span>
        </span>
      );
    }
    if (isCleared) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-emerald-300 whitespace-nowrap shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="shrink-0">Cleared</span>
        </span>
      );
    }
    if (isVerified) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-emerald-300 whitespace-nowrap shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="shrink-0">AI Verified</span>
        </span>
      );
    }
    if (isReturned) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-rose-300 whitespace-nowrap shrink-0">
          <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          <span className="shrink-0">Rejected</span>
        </span>
      );
    }
    if (hasAppeal) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-amber-300 whitespace-nowrap shrink-0">
          <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="shrink-0">For Review</span>
        </span>
      );
    }
    if (isFlagged) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-blue-300 whitespace-nowrap shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="shrink-0">Flagged</span>
        </span>
      );
    }
    if (isForReview) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-amber-300 whitespace-nowrap shrink-0">
          <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="shrink-0">
            {currentStatus === "Submitted" ? "Submitted" : "For Review"}
          </span>
        </span>
      );
    }
    if (task?.isInPerson || currentStatus === "In Person") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/80 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-slate-300 whitespace-nowrap shrink-0">
          <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="shrink-0">In Person</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-800/80 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-slate-300 whitespace-nowrap shrink-0">
        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="shrink-0">Pending</span>
      </span>
    );
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-sans"
    >
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-[#040711]/80 backdrop-blur-md transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Outer Positioning Container (unclipped for outside navigation buttons) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl pt-12 lg:pt-0 z-10 flex items-center justify-center"
      >
        {/* Left Navigation Group */}
        <div className="absolute left-0 top-0 lg:left-auto lg:right-[calc(100%+14px)] lg:top-1/2 lg:-translate-y-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
          {/* Previous Department '<<' Button (Appears beside chevron at start of task list) */}
          {isFirstTask && hasPrevDept && (
            <button
              type="button"
              disabled={isLoadingDept}
              onClick={(e) => {
                e.stopPropagation();
                onPrevDept?.();
              }}
              title={prevDeptName ? `Previous department: ${prevDeptName}` : "Previous department"}
              className="flex h-9 sm:h-10 px-2.5 sm:px-3 shrink-0 items-center justify-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-xl shadow-amber-500/10 backdrop-blur-md hover:bg-amber-500/25 hover:border-amber-400 hover:text-amber-200 transition-ui cursor-pointer font-bold text-xs group whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden md:inline font-semibold">Prev Dept</span>
            </button>
          )}

          {/* Left Navigation Chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrevTask?.();
            }}
            disabled={!hasPrevTask || isLoadingDept}
            title={hasPrevTask ? "Previous requirement" : "First requirement"}
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border shadow-xl backdrop-blur-md transition-ui ${
              hasPrevTask && !isLoadingDept
                ? "border-slate-800 bg-[#0a101f]/95 text-slate-300 hover:border-amber-500/50 hover:bg-slate-800 hover:text-white cursor-pointer"
                : "border-slate-800/40 bg-[#0a101f]/40 text-slate-600 opacity-30 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Right Navigation Group */}
        <div className="absolute right-0 top-0 lg:right-auto lg:left-[calc(100%+14px)] lg:top-1/2 lg:-translate-y-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
          {/* Right Navigation Chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNextTask?.();
            }}
            disabled={!hasNextTask || isLoadingDept}
            title={hasNextTask ? "Next requirement" : "Last requirement"}
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border shadow-xl backdrop-blur-md transition-ui ${
              hasNextTask && !isLoadingDept
                ? "border-slate-800 bg-[#0a101f]/95 text-slate-300 hover:border-amber-500/50 hover:bg-slate-800 hover:text-white cursor-pointer"
                : "border-slate-800/40 bg-[#0a101f]/40 text-slate-600 opacity-30 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Next Department '>>' Button (Appears beside chevron at end of task list) */}
          {isLastTask && hasNextDept && (
            <button
              type="button"
              disabled={isLoadingDept}
              onClick={(e) => {
                e.stopPropagation();
                onNextDept?.();
              }}
              title={nextDeptName ? `Next department: ${nextDeptName}` : "Next department"}
              className="flex h-9 sm:h-10 px-2.5 sm:px-3 shrink-0 items-center justify-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-xl shadow-amber-500/10 backdrop-blur-md hover:bg-amber-500/25 hover:border-amber-400 hover:text-amber-200 transition-ui cursor-pointer font-bold text-xs group whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="hidden md:inline font-semibold">Next Dept</span>
              <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {/* Modal Dialog Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[calc(100dvh-6rem)] lg:max-h-[92dvh]"
        >
          {/* Header Section */}
          <div className="bg-[#070c18] border-b border-slate-800 px-3 sm:px-6 py-3 sm:py-5 flex flex-nowrap justify-between items-start gap-2 sm:gap-4">
            <div className="flex flex-1 gap-2 sm:gap-3 min-w-0">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 mt-0.5">
                {task?.isInPerson && isPending ? (
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <FileBox className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 title={task?.title || "Clearance Requirement"} className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {isLoadingDept
                    ? "Loading..."
                    : task?.title || "Clearance Requirement"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 truncate font-medium">
                  {deptName} · Phase {tierNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto sm:ml-4">
              {/* Status Badge */}
              {renderStatusBadge()}

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Section */}
          <div className="p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-5 flex-1 custom-scrollbar">
            {isLoadingDept ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
                <p className="text-xs text-slate-400 font-medium">
                  Loading department requirements...
                </p>
              </div>
            ) : task ? (
              <>
                {/* 1. Requirement Description & Meta Details */}
                <div className="space-y-3">
                  {task.description && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Requirement Description
                      </label>
                      <div className="w-full p-2.5 sm:p-3.5 border border-slate-800/80 rounded-xl text-xs bg-[#070c18] text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </div>
                    </div>
                  )}

                  {/* Meta Details: Deadline (Left) & Assigned Date (Right) */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-[11px] sm:text-xs">
                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-[#070c18] p-2 sm:p-3">
                      <Calendar
                        size={16}
                        className={
                          isUrgent
                            ? "text-rose-400 shrink-0"
                            : "text-amber-400 shrink-0"
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Deadline
                        </p>
                        <p
                          className={`text-[11px] sm:text-xs font-semibold mt-0.5 break-words ${
                            isUrgent ? "text-rose-400" : "text-slate-200"
                          }`}
                        >
                          {task.due_date
                            ? isOverdue
                              ? `Overdue (${formatDate(task.due_date)})`
                              : isDueSoon
                              ? `Due Soon (${formatDate(task.due_date)})`
                              : formatDate(task.due_date)
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-[#070c18] p-2 sm:p-3">
                      <Clock size={16} className="text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Assigned Date
                        </p>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-200 mt-0.5 break-words">
                          {formatDate(task.assigned_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. AI Vision Assessment Card (if available) */}
                {localAiReport && (
                  localAiReport.processingFailed ? (
                    <div className="bg-[#10172A] border border-amber-500/30 rounded-xl p-3 sm:p-5">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm tracking-wide mb-2">
                        <Clock className="w-[18px] h-[18px]" />
                        <h3>Manual Staff Verification Queued</h3>
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                        {localAiReport.summary ||
                          "Automated AI document analysis could not be completed. Please wait for an officer to review your submission manually."}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#10172A] border border-blue-900/40 rounded-xl p-3 sm:p-5">
                      <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="text-blue-400 w-[18px] h-[18px]" />
                          <h3 className="text-blue-400 font-semibold text-sm tracking-wide">
                            Multimodal AI Vision Assessment
                          </h3>
                        </div>
                        {localAiReport.authenticityScore !== undefined && (
                          <div className="bg-blue-950/60 border border-blue-900/60 text-blue-300 text-xs px-2.5 py-1 rounded-full font-medium">
                            {localAiReport.authenticityScore}% Authenticity
                          </div>
                        )}
                      </div>

                      {localAiReport.summary && (
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                          {localAiReport.summary}
                        </p>
                      )}

                      {((localAiReport.flags && localAiReport.flags.length > 0) ||
                        (localAiReport.flaggedReasons && localAiReport.flaggedReasons.length > 0)) && (
                        <div>
                          <h4 className="text-rose-400 text-sm font-semibold mb-2">
                            Review Flags:
                          </h4>
                          <ul className="text-rose-300/90 text-[13.5px] space-y-1.5">
                            {(localAiReport.flags || localAiReport.flaggedReasons).map(
                              (flag: string, idx: number) => (
                                <li key={idx} className="flex gap-2.5 items-start">
                                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-rose-400/80 shrink-0"></span>
                                  <span>{flag}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* 3. In-Person Guidance OR Submitted Documents & Upload Dropzone */}
                {isCleared ? (
                  localFiles.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                        Submitted Document
                      </h3>
                      <div className="flex flex-col gap-2.5">
                        {localFiles.map((file) => (
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
                                {(file.type === "pdf" || /\.(docx|txt|csv)(?:$|[?#])/i.test(file.name || file.url)) ? (
                                  <FileText size={18} />
                                ) : (
                                  <ImageIcon size={18} />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {file.size !== "N/A" && `${file.size} · `}Uploaded{" "}
                                  {formatUploadedAt(file.uploadDate)}
                                </p>
                              </div>
                            </div>

                            <ExternalLink
                              size={14}
                              className="text-slate-500 group-hover:text-amber-300 transition-colors shrink-0 mr-1"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                ) : task.isInPerson ? (
                  /* In-Person Guidance (When not cleared and not rejected) */
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 sm:p-4.5 flex items-start gap-2.5 sm:gap-3.5 text-amber-200">
                    <User className="text-amber-400 w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm leading-relaxed">
                      In-person clearance: Please visit the{" "}
                      <span className="font-bold text-amber-300">{deptName}</span> office
                      during their staffed hours.
                    </p>
                  </div>
                ) : (
                  /* Online Requirement: Submitted Document list & Dropzone */
                  <div className="space-y-4">
                    {/* Submitted Files List */}
                    {localFiles.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                          Submitted Document
                        </h3>
                        <div className="flex flex-col gap-2.5">
                          {localFiles.map((file) => (
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
                                  {(file.type === "pdf" || /\.(docx|txt|csv)(?:$|[?#])/i.test(file.name || file.url)) ? (
                                    <FileText size={18} />
                                  ) : (
                                    <ImageIcon size={18} />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {file.size !== "N/A" && `${file.size} · `}Uploaded{" "}
                                    {formatUploadedAt(file.uploadDate)}
                                  </p>
                                </div>
                              </div>

                              <ExternalLink
                                size={14}
                                className="text-slate-500 group-hover:text-amber-300 transition-colors shrink-0 mr-1"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dropzone: Shown when NOT Cleared and NOT Submitted/In Review, OR when Rejected */}
                    {(!isForReview || isReturned) && (
                      <div className="space-y-3">
                        {isReturned ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                              {/* <Upload className="w-3.5 h-3.5 text-rose-400" /> */}
                              Resubmit Document
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Comply Online
                            </span>
                          </div>
                        )}

                        <label className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-[#070c18] hover:bg-slate-800/30 p-4 sm:p-7 text-center transition-ui cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept={DOCUMENT_ACCEPT}
                          />
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 mb-3 shadow-sm group-hover:scale-105 transition-transform">
                            <Upload className="h-5 w-5" />
                          </div>
                          <p className="text-xs sm:text-sm text-gray-200">
                            Drag &amp; drop or{" "}
                            <span className="text-amber-400 font-semibold underline underline-offset-2 hover:text-amber-300">
                              browse files
                            </span>
                          </p>
                          <span className="text-xs text-slate-400 mt-1">
                            {DOCUMENT_FORMAT_LABEL}
                          </span>
                        </label>

                        {/* Selected File Banner & Submit Action */}
                        {selectedFile && (
                          <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-[#070c18] p-3.5 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileCheck className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                              <span className="truncate font-semibold text-white">
                                {selectedFile.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => setSelectedFile(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Remove file"
                              >
                                <X size={15} />
                              </button>
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={handleUploadSubmit}
                                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-md shadow-amber-500/10"
                              >
                                {isUploading && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                )}
                                <span>
                                  {isUploading
                                    ? "Uploading & Verifying..."
                                    : isReturned
                                    ? "Resubmit File"
                                    : "Submit File"}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Feedback Section (Hidden on submitted status or when AI auto-generated) */}
                {task.comments &&
                  !isForReview &&
                  currentStatus !== "Submitted" &&
                  currentStatus !== "Verified" &&
                  !task.comments.startsWith("[AI") &&
                  !task.comments.startsWith("Queued for manual") &&
                  !task.comments.startsWith("Submitted for manual") && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Feedback
                      </label>
                      <div className="w-full p-2.5 sm:p-3.5 border border-slate-800/80 rounded-xl text-xs bg-[#070c18] text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {task.comments}
                      </div>
                    </div>
                  )}

                {/* 5. Appeal Notice & Action for Flagged Requirements (placed at the bottom below Feedback and Submitted Documents) */}
                {isFlagged && !hasAppeal && !isReturned && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 sm:p-4.5 flex items-start gap-2.5 sm:gap-3.5 text-blue-200">
                    <HelpCircle className="text-blue-400 w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm leading-relaxed text-blue-200/90">
                      <span className="font-bold text-blue-300">
                        Appeal Document Authenticity?
                      </span>{" "}
                      If you believe the AI audit was mistaken, request a manual review by department staff.{" "}
                      <button
                        type="button"
                        disabled={isAppealing}
                        onClick={handleInitiateAppeal}
                        className="font-bold text-blue-300 underline underline-offset-2 hover:text-blue-100 transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        {isAppealing && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin inline shrink-0" />
                        )}
                        <span>Appeal Now.</span>
                      </button>
                    </p>
                  </div>
                )}

                {/* 5. Cleared Notice (placed at the bottom of the modal below the feedback element and submitted document) */}
                {isCleared && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 sm:p-4.5 flex items-start gap-2.5 sm:gap-3.5 text-emerald-200">
                    <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm leading-relaxed min-w-0 flex-1">
                      <span className="font-bold text-emerald-300">Requirement Cleared:</span>{" "}
                      This clearance requirement has been approved and cleared by the{" "}
                      <span className="font-bold text-emerald-300">{deptName}</span> officer. No further action is required.
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
