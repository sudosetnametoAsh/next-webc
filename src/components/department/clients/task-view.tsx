"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Eye,
  Loader2,
  Coins,
  Brain,
  Monitor,
  Scale,
  FileText,
  Building,
  BriefcaseMedical,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import SubmissionModal, { SubmittedFile } from "./sumission-modal";
import { createClient } from "@/lib/db/supabase-client";

type TaskStatus = "Cleared" | "Pending" | "Flagged" | "Submitted" | "Rejected";

const getStatusConfig = (status: TaskStatus) => {
  switch (status) {
    case "Cleared":
      return { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-200/80 dark:border-emerald-800/60", label: "Cleared" };
    case "Flagged":
      return { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-800 dark:text-rose-300", border: "border-rose-200/80 dark:border-rose-900/60", label: "Flagged" };
    case "Pending":
      return { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200/80 dark:border-amber-800/60", label: "Pending" };
    case "Submitted":
      return { bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-800 dark:text-sky-300", border: "border-sky-200/80 dark:border-sky-800/60", label: "Needs Review" };
    case "Rejected":
      return { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-800 dark:text-rose-300", border: "border-rose-200/80 dark:border-rose-900/60", label: "Rejected" };
    default:
      return { bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700", label: status };
  }
};

type Tasks = {
  description: string;
  assigned_task_id: number;
  dropbox: string;
  status: TaskStatus;
  assigned_at: string;
  title: string;
  comments?: string;
};

type ClearanceProgress = {
  dept_name: string;
  status: "Signed" | "Pending" | "Incomplete";
  signed_at?: string;
};

export default function TaskView({
  studentTasks,
  studentName,
  studentId,
  currentDepartment = "Cashier",
  onBack,
  viewType = "students",
}: {
  studentTasks: Tasks[];
  studentName: string;
  studentId: string;
  currentDepartment?: string;
  onBack?: () => void;
  viewType?: "students" | "staff";
}) {
  const supabase = useMemo(() => createClient(), []);

  const [tasks, setTasks] = useState<Tasks[]>(studentTasks);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedFiles, setFetchedFiles] = useState<SubmittedFile[]>([]);
  const [lastUpdatedDate, setLastUpdatedDate] = useState<string>("");
  const [progress, setProgress] = useState<ClearanceProgress[]>([]);
  const [approvingTaskId, setApprovingTaskId] = useState<number | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!studentId) return;
      const { data, error } = await supabase
        .from("clearance_records")
        .select(`
          status,
          signed_at,
          clearance_templates (
            dept_id,
            departments:clearance_departments ( dept_name )
          )
        `)
        .eq("user_id", studentId);

      if (!error && data) {
        const formatted: ClearanceProgress[] = (data as unknown as Array<{
          status: "Signed" | "Pending" | "Incomplete";
          signed_at?: string;
          clearance_templates?: {
            departments?: { dept_name?: string } | null;
          } | null;
        }>)
          .map((item) => ({
            dept_name: item.clearance_templates?.departments?.dept_name || "Unknown Department",
            status: item.status,
            signed_at: item.signed_at,
          }))
          .sort((a, b) => a.dept_name.localeCompare(b.dept_name));
        setProgress(formatted);
      }
    };
    fetchProgress();
  }, [studentId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("custom-all-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_tasks" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setTasks((prev) => prev.map((t) => t.assigned_task_id === payload.new.assigned_task_id ? { ...t, ...payload.new } : t));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const hasDropbox = (task: Tasks) => {
    return task.dropbox && task.dropbox.trim() !== "" && task.dropbox.toLowerCase() !== "null";
  };

  /** Whether this task originally required a dropbox upload.
   *  Tasks with "Rejected" status were previously submitted via dropbox,
   *  so they should always be treated as requiring re-upload (not in-person). */
  const originallyRequiredDropbox = (task: Tasks) => {
    return hasDropbox(task) || task.status === "Rejected";
  };

  const handleOpenSubmission = async (taskId: number) => {
    setIsLoading(true);
    setActiveTaskId(taskId);
    try {
      const { data, error } = await supabase.from("clearance_tasks").select("dropbox, uploaded_at").eq("assigned_task_id", taskId).single();
      if (error) throw error;

      const formattedDate = data.uploaded_at ? new Date(data.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown Date";
      setLastUpdatedDate(formattedDate);

      if (data.dropbox) {
        try {
          const parsedFiles = JSON.parse(data.dropbox);
          setFetchedFiles(parsedFiles.map((file: { id?: string; name?: string; size?: string; type?: "pdf" | "image"; url?: string }, index: number) => ({
            id: file.id || String(index),
            name: file.name || "Unknown File",
            size: file.size || "N/A",
            type: file.type || (file.name?.endsWith(".pdf") ? "pdf" : "image"),
            uploadDate: formattedDate,
            url: file.url || "#",
          })));
        } catch {
          const isPdf = data.dropbox.toLowerCase().includes(".pdf");
          setFetchedFiles([{
            id: "1",
            name: decodeURIComponent(data.dropbox.split("/").pop() || "Uploaded File"),
            size: "N/A",
            type: isPdf ? "pdf" : "image",
            uploadDate: formattedDate,
            url: data.dropbox,
          }]);
        }
      } else {
        setFetchedFiles([]);
      }
    } catch (error) {
      console.error("Error fetching submission details:", error);
      setFetchedFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectApprove = async (taskId: number) => {
    setApprovingTaskId(taskId);
    setConfirmApproveId(null);

    setTasks((prev) =>
      prev.map((t) =>
        t.assigned_task_id === taskId ? { ...t, status: "Cleared" as TaskStatus } : t
      )
    );

    try {
      const { error } = await supabase
        .from("clearance_tasks")
        .update({ status: "Cleared" })
        .eq("assigned_task_id", taskId);
      if (error) throw error;
    } catch (error) {
      console.error("Error approving task:", error);
      setTasks((prev) =>
        prev.map((t) =>
          t.assigned_task_id === taskId ? { ...t, status: "Pending" as TaskStatus } : t
        )
      );
    } finally {
      setApprovingTaskId(null);
    }
  };

  const handleUpdateStatus = async (newStatus: "Cleared" | "Flagged", comment: string) => {
    if (activeTaskId === null) return;
    setTasks((prev) => prev.map((t) => t.assigned_task_id === activeTaskId ? { ...t, status: newStatus, comments: comment } : t));
    closeModal();
    try {
      const { error } = await supabase.from("clearance_tasks").update({ status: newStatus, comments: comment }).eq("assigned_task_id", activeTaskId);
      if (error) throw error;
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleRejectWithResubmit = async (comment: string) => {
    if (activeTaskId === null) return;

    // Optimistic update: set to Rejected and clear dropbox
    setTasks((prev) =>
      prev.map((t) =>
        t.assigned_task_id === activeTaskId
          ? { ...t, status: "Rejected" as TaskStatus, dropbox: "", comments: comment }
          : t
      )
    );
    closeModal();

    try {
      const { error } = await supabase
        .from("clearance_tasks")
        .update({
          status: "Rejected",
          dropbox: null,
          comments: comment,
          uploaded_at: null,
        })
        .eq("assigned_task_id", activeTaskId);

      if (error) throw error;
    } catch (error) {
      console.error("Error rejecting with resubmit:", error);
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.assigned_task_id === activeTaskId
            ? { ...t, status: "Submitted" as TaskStatus }
            : t
        )
      );
    }
  };

  const closeModal = () => {
    setActiveTaskId(null);
    setFetchedFiles([]);
  };

  const getDeptIcon = (deptName: string) => {
    const name = deptName.toLowerCase();
    if (name.includes("cashier") || name.includes("finance")) return <Coins size={16} className="text-slate-500 dark:text-slate-400" />;
    if (name.includes("clinic") || name.includes("health")) return <BriefcaseMedical size={16} className="text-slate-500 dark:text-slate-400" />;
    if (name.includes("guidance")) return <Brain size={16} className="text-slate-500 dark:text-slate-400" />;
    if (name.includes("lab") || name.includes("comp")) return <Monitor size={16} className="text-slate-500 dark:text-slate-400" />;
    if (name.includes("discipline")) return <Scale size={16} className="text-slate-500 dark:text-slate-400" />;
    if (name.includes("registrar")) return <FileText size={16} className="text-slate-500 dark:text-slate-400" />;
    return <Building size={16} className="text-slate-400 dark:text-slate-500" />;
  };

  const canViewSubmission = (status: TaskStatus) => status === "Submitted" || status === "Flagged";

  /** In-person approval: only for tasks that never had a dropbox AND are Pending */
  const isDirectApprovable = (task: Tasks) => {
    return !originallyRequiredDropbox(task) && task.status === "Pending";
  };

  const personLabel = viewType === "students" ? "student" : "staff";

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-white font-sans mx-auto border-x border-slate-100 overflow-x-hidden dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-6 w-full dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">Clearance Details</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">Review requirements and submissions</p>
          </div>
        </div>

        {/* Profile */}
        <div className="mt-6 flex items-center gap-4 rounded-xl border border-slate-200/90 p-4 bg-slate-50/70 w-full overflow-hidden dark:bg-slate-800/60 dark:border-slate-700/60">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-sm font-bold text-amber-400 shadow-2xs dark:bg-amber-500/20 dark:border dark:border-amber-500/30">
            {studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{studentName}</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate font-mono">{studentId}</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 w-full overflow-x-hidden">

        {/* Department Progress Section */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-4 w-full">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Department Status</h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {progress.filter(p => p.status === 'Signed').length} of {progress.length} Cleared
            </span>
          </div>

          <div className="flex flex-col gap-2 w-full">
            {progress.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
                No clearance records found.
              </div>
            ) : (
              progress.map((item) => {
                const isCurrent = currentDepartment && item.dept_name.toLowerCase() === currentDepartment.toLowerCase();
                const isSigned = item.status === "Signed";
                const isPending = item.status === "Pending";

                return (
                  <div
                    key={item.dept_name}
                    className={`relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 w-full overflow-hidden ${
                      isCurrent
                        ? "border-[#0B192C]/30 bg-amber-50/20 shadow-2xs dark:border-amber-600/50 dark:bg-amber-950/20"
                        : "border-slate-200/80 bg-white hover:border-slate-300 dark:bg-slate-800/40 dark:border-slate-700/50 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isCurrent
                          ? "bg-[#0B192C] text-amber-400 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {getDeptIcon(item.dept_name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{item.dept_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isCurrent && (
                        <span className="text-xs font-bold text-[#0B192C] dark:text-amber-400 hidden sm:inline">
                          Current Office
                        </span>
                      )}
                      {isSigned ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300">
                          Signed
                        </span>
                      ) : isPending ? (
                        <span className="rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300">
                          Pending
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                          Incomplete
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Active Tasks Section */}
        <section className="w-full overflow-hidden">
          <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-slate-100">Required Tasks</h3>

          <div className="space-y-3 w-full">
            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
                No active tasks assigned.
              </div>
            ) : (
              tasks.map((task) => {
                const statusCfg = getStatusConfig(task.status);
                const isThisLoading = isLoading && activeTaskId === task.assigned_task_id;
                const isApproving = approvingTaskId === task.assigned_task_id;
                const isDirectApp = isDirectApprovable(task);
                const showConfirm = confirmApproveId === task.assigned_task_id;
                const isRejected = task.status === "Rejected";
                const isInPerson = !originallyRequiredDropbox(task) && task.status !== "Cleared";

                return (
                  <div key={task.assigned_task_id} className="group rounded-xl border border-slate-200 bg-white overflow-hidden w-full max-w-full dark:bg-slate-850 dark:border-slate-800">
                    <div className="p-5 w-full">
                      <div className="flex items-start justify-between gap-4 w-full">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="grid grid-cols-[1fr_auto] gap-2 items-start mb-1 w-full">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 break-words whitespace-normal min-w-0">{task.title || "Untitled Task"}</h4>
                            <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                              {statusCfg.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-2">
                            {isInPerson && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200 shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                <UserCheck size={10} />
                                In-Person
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 shrink-0 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
                                <X size={10} />
                                Rejected
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-normal break-all w-full overflow-hidden">{task.description}</p>

                          {/* In-person note */}
                          {isInPerson && (
                            <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200/70 p-2.5 w-full overflow-hidden dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-300">
                              <UserCheck size={14} className="shrink-0 text-slate-400 dark:text-slate-400 mt-0.5" />
                              <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed whitespace-normal break-words flex-1 min-w-0">
                                No file upload required — {personLabel} will complete this in person. You can approve directly.
                              </p>
                            </div>
                          )}

                          {/* Rejected note with reviewer feedback */}
                          {isRejected && (
                            <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-rose-50 border border-rose-200/80 p-3 w-full overflow-hidden dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200">
                              <X size={14} className="shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 whitespace-normal break-words">
                                  Previous submission was rejected — {personLabel} must re-upload via dropbox.
                                </p>
                                {task.comments && (
                                  <div className="mt-2 rounded-md bg-white border border-rose-200/60 p-2 w-full overflow-hidden dark:bg-slate-900/70 dark:border-rose-900/60">
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                                      Reviewer Feedback
                                    </p>
                                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-normal break-words">
                                      {task.comments}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {task.status === "Flagged" && task.comments && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-rose-50 border border-rose-200/80 p-3 w-full overflow-hidden dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200">
                          <AlertTriangle size={16} className="shrink-0 text-rose-500 dark:text-rose-400" />
                          <p className="text-xs font-medium text-rose-700 dark:text-rose-200 leading-relaxed whitespace-normal break-words flex-1 min-w-0">{task.comments}</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50 rounded-b-xl w-full overflow-hidden dark:border-slate-800 dark:bg-slate-900/40">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 truncate flex-1 min-w-0">
                        <Calendar size={14} />
                        Assigned {formatDate(task.assigned_at)}
                      </span>

                      <div className="flex shrink-0 ml-2">
                        {canViewSubmission(task.status) ? (
                          <button
                            onClick={() => handleOpenSubmission(task.assigned_task_id)}
                            disabled={isThisLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B192C] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1A2E46] disabled:opacity-50 cursor-pointer shadow-2xs dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950"
                          >
                            {isThisLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                            {isThisLoading ? "Loading..." : task.status === "Flagged" ? "Review" : "Review File"}
                          </button>
                        ) : isDirectApp ? (
                          <div className="flex items-center gap-2">
                            {showConfirm ? (
                              <>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden lg:inline">Approve?</span>
                                <button
                                  onClick={() => setConfirmApproveId(null)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                  <X size={12} />
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDirectApprove(task.assigned_task_id)}
                                  disabled={isApproving}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white"
                                >
                                  {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                  {isApproving ? "Approving..." : "Confirm"}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmApproveId(task.assigned_task_id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 cursor-pointer shadow-2xs dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white"
                              >
                                <CheckCircle2 size={14} />
                                Approve In-Person
                              </button>
                            )}
                          </div>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 dark:text-rose-400">
                            <XCircle size={14} />
                            Rejected
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${task.status === "Cleared" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                            {task.status === "Cleared" ? (
                              <>
                                <CheckCircle2 size={14} />
                                Approved
                              </>
                            ) : (
                              "Awaiting Submission"
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4 w-full overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 pr-4 w-full">
           <div className="flex items-center gap-2">
             <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending</span>
             <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
               {tasks.filter((t) => t.status === "Pending").length}
             </span>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rejected</span>
             <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600 dark:bg-rose-950/40 dark:text-rose-400">
               {tasks.filter((t) => t.status === "Rejected").length}
             </span>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Needs Review</span>
             <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-sky-950/40 dark:text-sky-400">
               {tasks.filter((t) => t.status === "Submitted" || t.status === "Flagged").length}
             </span>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cleared</span>
             <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
               {tasks.filter((t) => t.status === "Cleared").length}
             </span>
           </div>
        </div>
      </div>

      <SubmissionModal
        isOpen={activeTaskId !== null && !isLoading}
        onClose={closeModal}
        studentName={studentName}
        lastUpdated={lastUpdatedDate}
        files={fetchedFiles}
        onUpdateStatus={handleUpdateStatus}
        onRejectWithResubmit={handleRejectWithResubmit}
      />
    </div>
  );
}
