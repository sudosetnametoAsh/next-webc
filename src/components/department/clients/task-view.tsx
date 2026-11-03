"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  X,
  XCircle,
  Sparkles,
  Pencil,
  Trash2,
  HelpCircle,
} from "lucide-react";
import SubmissionModal, { SubmittedFile } from "./sumission-modal";
import InPersonModal from "./in-person-modal";
import EditTaskModal from "./edit-task-modal";
import DeleteTaskDialog from "./delete-task-dialog";
import { ClientStatus } from "./client-filter-toolbar";
import { createClient } from "@/lib/db/supabase-client";
import { getDepartmentIcon } from "@/lib/department-icons";
import SignToggleButton from "../sign-button";
import AddTask from "../button/add-task";
import AddPreset from "../button/add-preset";
import { useFetchPreset } from "@/hooks/department/fetch-presets";
import { useDepartmentContext } from "@/context/deparment";

type TaskStatus = "Cleared" | "Pending" | "Flagged" | "Submitted" | "Rejected" | "Verified";

const renderLeftStatusIcon = (status: TaskStatus, isInPerson: boolean = false) => {
  if (status === "Pending" && isInPerson) {
    return <UserCheck className="w-4 h-4 text-slate-400" />;
  }
  switch (status) {
    case "Cleared":
    case "Verified":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "Submitted":
      return <Clock className="w-4 h-4 text-amber-400" />;
    case "Flagged":
      return <AlertTriangle className="w-4 h-4 text-blue-400" />;
    case "Rejected":
      return <XCircle className="w-4 h-4 text-rose-400" />;
    case "Pending":
    default:
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
};

const renderStatusBadge = (status: TaskStatus, isInPerson: boolean = false) => {
  if (status === "Pending" && isInPerson) {
    return (
      <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-slate-700/60 bg-slate-800/80 text-slate-300">
        <UserCheck className="w-2.5 h-2.5 text-slate-400" />
        <span>In person</span>
      </span>
    );
  }
  switch (status) {
    case "Cleared":
      return (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
          <span>Cleared</span>
        </span>
      );
    case "Verified":
      return (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
          <span>AI Verified</span>
        </span>
      );
    case "Submitted":
      return (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-amber-500/40 bg-amber-500/10 text-amber-400">
          <Clock className="w-2.5 h-2.5 text-amber-400" />
          <span>For review</span>
        </span>
      );
    case "Flagged":
      return (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-bold border-blue-500/40 bg-blue-500/10 text-blue-300">
          <AlertTriangle className="w-2.5 h-2.5 text-blue-400" />
          <span>Flagged</span>
        </span>
      );
    case "Rejected":
      return (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-bold border-rose-500/40 bg-rose-500/10 text-rose-400">
          <XCircle className="w-2.5 h-2.5 text-rose-400" />
          <span>Rejected</span>
        </span>
      );
    case "Pending":
    default:
      return (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-slate-700/60 bg-slate-800/80 text-slate-300">
          <Clock className="w-2.5 h-2.5 text-slate-400" />
          <span>Pending</span>
        </span>
      );
  }
};

type Tasks = {
  description: string;
  assigned_task_id: number;
  task_id?: number | string | null;
  dropbox: string;
  status: TaskStatus;
  assigned_at: string;
  uploaded_at?: string | null;
  due_date?: string | null;
  title: string;
  comments?: string;
  ai_audit_report?: any;
};

const getTaskSubmissionKey = (task: {
  assigned_task_id: number;
  uploaded_at?: string | null;
  assigned_at?: string | null;
  ai_audit_report?: any;
}) => {
  let appealSuffix = "";
  if (task.ai_audit_report) {
    let rep = task.ai_audit_report;
    if (typeof rep === "string") {
      try {
        rep = JSON.parse(rep);
      } catch {}
    }
    if (rep && typeof rep === "object" && rep.appeal) {
      appealSuffix = `_appeal_${rep.appeal.appealed_at || "pending"}`;
    }
  }
  return `${task.assigned_task_id}_${task.uploaded_at || task.assigned_at || "sub"}${appealSuffix}`;
};

// Order: for review, flagged, pending, rejected, cleared
const getTaskOrderRank = (status: TaskStatus): number => {
  switch (status) {
    case "Submitted":
    case "Verified":
      return 1; // for review
    case "Flagged":
      return 2; // flagged
    case "Pending":
      return 3; // pending
    case "Rejected":
      return 4; // rejected
    case "Cleared":
      return 5; // cleared
    default:
      return 6;
  }
};

type ClearanceProgress = {
  dept_name: string;
  status: "Signed" | "Pending" | "Incomplete";
  signed_at?: string;
  tier?: number;
  icon_name?: string;
};

export default function TaskView({
  studentTasks,
  studentName,
  studentId,
  clearanceId,
  clientStatus,
  isLocked = false,
  sectionId,
  preset,
  currentDepartment = "Cashier",
  onBack,
  viewType = "students",
  viewedSubmissionIds,
  viewedSubmissionKeys,
  onViewSubmission,
  onRejectTask,
  initialTaskId,
  hasPrevClient = false,
  prevClientName,
  onPrevClient,
  hasNextClient = false,
  nextClientName,
  onNextClient,
  selectedStatus,
}: {
  studentTasks: Tasks[];
  studentName: string;
  studentId: string;
  clearanceId?: string;
  clientStatus?: "Signed" | "Pending";
  selectedStatus?: ClientStatus;
  isLocked?: boolean;
  sectionId?: string | null;
  preset?: any;
  currentDepartment?: string;
  onBack?: () => void;
  viewType?: "students" | "staff";
  viewedSubmissionIds?: Set<number | string>;
  viewedSubmissionKeys?: Set<string>;
  onViewSubmission?: (taskId: number, taskOrKey?: any) => void;
  onRejectTask?: (taskId: number) => void;
  initialTaskId?: number | null;
  hasPrevClient?: boolean;
  prevClientName?: string;
  onPrevClient?: () => void;
  hasNextClient?: boolean;
  nextClientName?: string;
  onNextClient?: () => void;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const { data: fetchedPreset } = useFetchPreset();
  const activePreset = preset || fetchedPreset;
  const deptCtx = useDepartmentContext();
  const currentDeptName = deptCtx?.departmentName || "Department Staff";

  const [tasks, setTasks] = useState<Tasks[]>(studentTasks);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedFiles, setFetchedFiles] = useState<SubmittedFile[]>([]);
  const [lastUpdatedDate, setLastUpdatedDate] = useState<string>("");
  const [progress, setProgress] = useState<ClearanceProgress[]>([]);
  const [aiAuditReport, setAiAuditReport] = useState<any>(null);
  const [activeInPersonTaskId, setActiveInPersonTaskId] = useState<number | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Tasks | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Tasks | null>(null);
  const [autoOpenTaskMode, setAutoOpenTaskMode] = useState<"first" | "last" | null>(null);

  const activeInPersonTask = useMemo(() => {
    if (activeInPersonTaskId === null) return null;
    return tasks.find((t) => t.assigned_task_id === activeInPersonTaskId) || null;
  }, [tasks, activeInPersonTaskId]);

  // States for AddTask & AddPreset
  const [taskId, setTaskId] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [title, setTitle] = useState<string>("");

  // Sort tasks: for review, flagged, pending, rejected, cleared
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const rankA = getTaskOrderRank(a.status);
      const rankB = getTaskOrderRank(b.status);
      if (rankA !== rankB) return rankA - rankB;

      // Within same status, sort by due date (soonest first)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return b.assigned_task_id - a.assigned_task_id;
    });
  }, [tasks]);

  // Task Navigation Tracking
  const currentActiveTaskId = activeTaskId ?? activeInPersonTaskId;
  const currentTaskIndex = sortedTasks.findIndex(
    (t) => t.assigned_task_id === currentActiveTaskId
  );
  const isFirstTask = currentTaskIndex === 0;
  const hasPrevTask = currentTaskIndex > 0;
  const hasNextTask =
    currentTaskIndex >= 0 && currentTaskIndex < sortedTasks.length - 1;
  const isLastTask =
    sortedTasks.length > 0 && currentTaskIndex === sortedTasks.length - 1;

  // Previous and next client modal navigation is exclusive to Submissions or Incomplete status
  const isClientModalNavEnabled =
    selectedStatus === "submissions" || selectedStatus === "incomplete";

  const navigateToTask = (targetTask: Tasks) => {
    if (!targetTask) return;
    const taskKey = getTaskSubmissionKey(targetTask);
    if (isTaskInPerson(targetTask)) {
      onViewSubmission?.(targetTask.assigned_task_id, taskKey);
      setActiveTaskId(null);
      setActiveInPersonTaskId(targetTask.assigned_task_id);
    } else {
      setActiveInPersonTaskId(null);
      handleOpenSubmission(targetTask.assigned_task_id);
    }
  };

  const handlePrevTask = () => {
    if (hasPrevTask) {
      navigateToTask(sortedTasks[currentTaskIndex - 1]);
    }
  };

  const handleNextTask = () => {
    if (hasNextTask) {
      navigateToTask(sortedTasks[currentTaskIndex + 1]);
    }
  };

  const handleNextClientClick = () => {
    if (onNextClient) {
      setAutoOpenTaskMode("first");
      onNextClient();
    }
  };

  const handlePrevClientClick = () => {
    if (onPrevClient) {
      setAutoOpenTaskMode("last");
      onPrevClient();
    }
  };

  // Auto-open first or last task when advancing to next/prev client via >> or << button
  useEffect(() => {
    if (!autoOpenTaskMode) return;
    const mode = autoOpenTaskMode;
    setAutoOpenTaskMode(null);

    if (studentTasks.length === 0) {
      setActiveTaskId(null);
      setActiveInPersonTaskId(null);
      return;
    }

    const sorted = [...studentTasks].sort((a, b) => {
      const rankA = getTaskOrderRank(a.status);
      const rankB = getTaskOrderRank(b.status);
      if (rankA !== rankB) return rankA - rankB;

      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return b.assigned_task_id - a.assigned_task_id;
    });

    const targetTask = mode === "last" ? sorted[sorted.length - 1] : sorted[0];
    if (!targetTask) return;

    if (isTaskInPerson(targetTask)) {
      onViewSubmission?.(targetTask.assigned_task_id);
      setActiveTaskId(null);
      setActiveInPersonTaskId(targetTask.assigned_task_id);
    } else {
      setActiveInPersonTaskId(null);
      handleOpenSubmission(targetTask.assigned_task_id);
    }
  }, [studentId, studentTasks, autoOpenTaskMode]);

  const autoOpenedTaskIdRef = useRef<number | null>(null);

  // Auto-open specific task when deep-linked via initialTaskId (e.g. from notification)
  useEffect(() => {
    if (!initialTaskId || (tasks.length === 0 && studentTasks.length === 0)) return;
    if (autoOpenedTaskIdRef.current === initialTaskId) return;

    const targetTask =
      tasks.find((t) => t.assigned_task_id === initialTaskId) ||
      studentTasks.find((t) => t.assigned_task_id === initialTaskId);
    if (!targetTask) return;

    autoOpenedTaskIdRef.current = initialTaskId;

    if (isTaskInPerson(targetTask)) {
      onViewSubmission?.(targetTask.assigned_task_id);
      setActiveTaskId(null);
      setActiveInPersonTaskId(targetTask.assigned_task_id);
    } else {
      setActiveInPersonTaskId(null);
      handleOpenSubmission(targetTask.assigned_task_id);
    }
  }, [initialTaskId, tasks, studentTasks]);

  // Listen for open_department_submission event to open modal immediately if task view is mounted
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ clientId?: string; taskId?: number | string }>;
      const { clientId, taskId } = customEvent.detail || {};
      if (!taskId) return;
      if (clientId && studentId && clientId !== studentId) return;

      const numericTaskId = Number(taskId);
      const targetTask =
        tasks.find((t) => t.assigned_task_id === numericTaskId) ||
        studentTasks.find((t) => t.assigned_task_id === numericTaskId);
      if (!targetTask) return;

      autoOpenedTaskIdRef.current = numericTaskId;

      if (isTaskInPerson(targetTask)) {
        onViewSubmission?.(targetTask.assigned_task_id);
        setActiveTaskId(null);
        setActiveInPersonTaskId(targetTask.assigned_task_id);
      } else {
        setActiveInPersonTaskId(null);
        handleOpenSubmission(targetTask.assigned_task_id);
      }
    };

    window.addEventListener("open_department_submission", handleOpenEvent);
    return () => {
      window.removeEventListener("open_department_submission", handleOpenEvent);
    };
  }, [tasks, studentTasks, studentId]);

  // Sync tasks when studentTasks prop changes
  useEffect(() => {
    setTasks(studentTasks);
  }, [studentTasks]);

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
            tier,
            is_active,
            departments:clearance_departments ( dept_name, icon_name )
          )
        `)
        .eq("user_id", studentId);

      if (!error && data) {
        const formatted: ClearanceProgress[] = data
          .filter((item: any) => item.clearance_templates?.is_active !== false)
          .map((item: any) => ({
            dept_name: item.clearance_templates?.departments?.dept_name || "Unknown Department",
            status: item.status,
            signed_at: item.signed_at,
            tier: item.clearance_templates?.tier ?? 1,
            icon_name: item.clearance_templates?.departments?.icon_name,
          }))
          .sort((a: any, b: any) => {
            if (a.tier !== b.tier) return a.tier - b.tier;
            return a.dept_name.localeCompare(b.dept_name);
          });
        setProgress(formatted);
      }
    };
    fetchProgress();
  }, [studentId, clientStatus, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("custom-all-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_tasks" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setTasks((prev) => prev.map((t) => t.assigned_task_id === payload.new.assigned_task_id ? { ...t, ...payload.new } : t));
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.assigned_task_id !== (payload.old as any).assigned_task_id));
        } else if (payload.eventType === "INSERT") {
          setTasks((prev) => {
            if (prev.some((t) => t.assigned_task_id === payload.new.assigned_task_id)) return prev;
            return [...prev, payload.new as Tasks];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isTaskOverdue = (task: Tasks) => {
    if (!task.due_date || task.status === "Cleared") return false;
    return new Date(task.due_date).getTime() < Date.now();
  };

  const handleSaveEditTask = async (updated: {
    assigned_task_id: number;
    title: string;
    description: string;
    due_date: string | null;
    dropbox: string;
  }) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.assigned_task_id === updated.assigned_task_id
          ? {
              ...t,
              title: updated.title,
              description: updated.description,
              due_date: updated.due_date,
              dropbox: updated.dropbox,
            }
          : t
      )
    );

    try {
      const res = await fetch(
        `/api/department/clients/tasks/${clearanceId || "bulk"}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }
      );
      if (!res.ok) {
        const { error } = await supabase
          .from("clearance_tasks")
          .update({
            title: updated.title,
            description: updated.description,
            due_date: updated.due_date,
            dropbox: updated.dropbox,
          })
          .eq("assigned_task_id", updated.assigned_task_id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to edit task:", err);
      alert("Failed to update task");
    }
  };

  const handleConfirmDeleteTask = async (taskId: number) => {
    const existingTask = tasks.find((t) => t.assigned_task_id === taskId);
    setTasks((prev) => prev.filter((t) => t.assigned_task_id !== taskId));
    if (activeInPersonTaskId === taskId) setActiveInPersonTaskId(null);
    if (activeTaskId === taskId) setActiveTaskId(null);

    try {
      const res = await fetch(
        `/api/department/clients/tasks/${clearanceId || "bulk"}?taskId=${taskId}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const { error } = await supabase
          .from("clearance_tasks")
          .delete()
          .eq("assigned_task_id", taskId);
        if (error) throw error;
      }

      // Optimistically clean up notifications for this deleted task via direct Supabase
      if (studentId && existingTask?.title) {
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", studentId)
          .ilike("description", `%"${existingTask.title}"%`);
      }

      // Check if all remaining tasks are fulfilled; if so, reset clearance record to Pending
      const remaining = tasks.filter((t) => t.assigned_task_id !== taskId);
      const stillHasUnfulfilled = remaining.some(
        (t) => t.status !== "Cleared"
      );
      if (clearanceId && clientStatus !== "Signed") {
        const nextRecordStatus = stillHasUnfulfilled ? "Incomplete" : "Pending";
        await supabase
          .from("clearance_records")
          .update({ status: nextRecordStatus })
          .eq("clearance_id", clearanceId);
      }
      queryClient.invalidateQueries({ queryKey: ["department-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (err) {
      console.error("Failed to delete task:", err);
      alert("Failed to remove task");
    }
  };

  const hasDropbox = (task: Tasks) => {
    return task.dropbox && task.dropbox.trim() !== "" && task.dropbox.toLowerCase() !== "null";
  };

  const originallyRequiredDropbox = (task: Tasks) => {
    return hasDropbox(task) || task.status === "Rejected";
  };

  const handleOpenSubmission = async (taskId: number) => {
    const existingTask =
      tasks.find((t) => t.assigned_task_id === taskId) ||
      studentTasks.find((t) => t.assigned_task_id === taskId);
    const subKey = existingTask ? getTaskSubmissionKey(existingTask) : `${taskId}_sub`;
    onViewSubmission?.(taskId, subKey);
    setIsLoading(true);
    setActiveTaskId(taskId);

    // Pre-populate immediately from existingTask if available
    if (existingTask) {
      if (existingTask.uploaded_at) {
        const formattedDate = new Date(existingTask.uploaded_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        setLastUpdatedDate(formattedDate);
      }
      if (existingTask.ai_audit_report) {
        let parsed = existingTask.ai_audit_report;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {}
        }
        setAiAuditReport(parsed);
      }
      if (existingTask.dropbox) {
        try {
          const parsedFiles = JSON.parse(existingTask.dropbox);
          const list = Array.isArray(parsedFiles) ? parsedFiles : [parsedFiles];
          setFetchedFiles(
            list.map((file: any, index: number) => ({
              id: file.id || String(index),
              name: file.name || "Unknown File",
              size: file.size || "N/A",
              type: file.type || (file.name?.endsWith(".pdf") ? "pdf" : "image"),
              uploadDate: existingTask.uploaded_at
                ? new Date(existingTask.uploaded_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Unknown Date",
              url: file.url || "#",
            }))
          );
        } catch {
          const isPdf = existingTask.dropbox.toLowerCase().includes(".pdf");
          setFetchedFiles([
            {
              id: "1",
              name: decodeURIComponent(existingTask.dropbox.split("/").pop() || "Uploaded File"),
              size: "N/A",
              type: isPdf ? "pdf" : "image",
              uploadDate: existingTask.uploaded_at
                ? new Date(existingTask.uploaded_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Unknown Date",
              url: existingTask.dropbox,
            },
          ]);
        }
      }
    }

    try {
      const { data, error } = await supabase
        .from("clearance_tasks")
        .select("dropbox, uploaded_at, ai_audit_report")
        .eq("assigned_task_id", taskId)
        .single();
      if (error) throw error;

      const formattedDate = data.uploaded_at
        ? new Date(data.uploaded_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Unknown Date";
      setLastUpdatedDate(formattedDate);

      if (data.ai_audit_report) {
        let parsed = data.ai_audit_report;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {}
        }
        setAiAuditReport(parsed);
      } else if (!existingTask?.ai_audit_report) {
        setAiAuditReport(null);
      }

      if (data.dropbox) {
        try {
          const parsedFiles = JSON.parse(data.dropbox);
          const list = Array.isArray(parsedFiles) ? parsedFiles : [parsedFiles];
          setFetchedFiles(
            list.map((file: any, index: number) => ({
              id: file.id || String(index),
              name: file.name || "Unknown File",
              size: file.size || "N/A",
              type: file.type || (file.name?.endsWith(".pdf") ? "pdf" : "image"),
              uploadDate: formattedDate,
              url: file.url || "#",
            }))
          );
        } catch {
          const isPdf = data.dropbox.toLowerCase().includes(".pdf");
          setFetchedFiles([
            {
              id: "1",
              name: decodeURIComponent(data.dropbox.split("/").pop() || "Uploaded File"),
              size: "N/A",
              type: isPdf ? "pdf" : "image",
              uploadDate: formattedDate,
              url: data.dropbox,
            },
          ]);
        }
      } else if (!existingTask?.dropbox) {
        setFetchedFiles([]);
      }
    } catch (error) {
      console.error("Error fetching submission details:", error);
      if (!existingTask?.dropbox) {
        setFetchedFiles([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "Cleared" | "Flagged" | "Pending", comment: string) => {
    if (activeTaskId === null) return;
    const targetTaskId = activeTaskId; // Capture ID before modal closes
    const targetTask = tasks.find((t) => t.assigned_task_id === targetTaskId);

    setTasks((prev) => prev.map((t) => t.assigned_task_id === targetTaskId ? { ...t, status: newStatus, comments: comment } : t));
    try {
      const { error } = await supabase.from("clearance_tasks").update({ status: newStatus, comments: comment }).eq("assigned_task_id", targetTaskId);
      if (error) throw error;

      // Check remaining tasks for this client to synchronize clearance_records status:
      // If all tasks are cleared/completed, set to "Pending"
      // If any unfulfilled tasks remain, set to "Incomplete"
      const updatedTasks = tasks.map((t) =>
        t.assigned_task_id === targetTaskId ? { ...t, status: newStatus, comments: comment } : t
      );
      const hasRemainingUnfulfilled = updatedTasks.some(
        (t) => t.status !== "Cleared"
      );

      if (clearanceId && clientStatus !== "Signed") {
        const nextRecordStatus = hasRemainingUnfulfilled ? "Incomplete" : "Pending";
        await supabase
          .from("clearance_records")
          .update({ status: nextRecordStatus })
          .eq("clearance_id", clearanceId);
      }
      queryClient.invalidateQueries({ queryKey: ["department-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });

      if (newStatus === "Cleared" && studentId) {
        const taskTitle = targetTask?.title || "Clearance Requirement";

        // Remove any prior returned or rejected notifications for this task
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", studentId)
          .or(`title.ilike.%Returned%,title.ilike.%Rejected%`)
          .ilike("description", `%"${taskTitle}"%`);

        try {
          await supabase.from("notifications").insert({
            user_id: studentId,
            target_role: "student",
            category: "task",
            title: "Requirement Cleared",
            description: `Your requirement "${taskTitle}" has been approved and cleared by ${currentDeptName}.`,
            type: "Success",
            ref_url: `/clearance/tasks?taskId=${targetTaskId}`,
            is_read: false,
            metadata: {
              studentId,
              taskId: targetTaskId,
              taskTitle,
              departmentName: currentDeptName,
            },
          });
        } catch (notifErr) {
          console.error("Failed to insert cleared notification:", notifErr);
        }
      }
    } catch (error) {
      if (targetTask) {
        setTasks((prev) => prev.map((task) =>
          task.assigned_task_id === targetTaskId ? targetTask : task
        ));
      }
      console.error("Error updating task status:", error);
      throw error;
    }
  };

  const handleRejectWithResubmit = async (comment: string) => {
    if (activeTaskId === null) return;

    onRejectTask?.(activeTaskId);

    // Strip appeal from ai_audit_report so the appeal is cleanly resolved upon rejection
    let cleanAiAuditReport: any = null;
    const currentTask = tasks.find((t) => t.assigned_task_id === activeTaskId);
    const existingReport = currentTask?.ai_audit_report ?? aiAuditReport;
    if (existingReport) {
      let parsed = existingReport;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = null;
        }
      }
      if (parsed && typeof parsed === "object") {
        const { appeal, ...rest } = parsed;
        cleanAiAuditReport = Object.keys(rest).length > 0 ? rest : null;
      }
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.assigned_task_id === activeTaskId
          ? {
              ...t,
              status: "Rejected" as TaskStatus,
              comments: comment,
              ai_audit_report: cleanAiAuditReport,
            }
          : t
      )
    );
    setAiAuditReport(cleanAiAuditReport);
    closeModal();

    try {
      const { error } = await supabase
        .from("clearance_tasks")
        .update({
          status: "Rejected",
          comments: comment,
          ai_audit_report: cleanAiAuditReport,
        })
        .eq("assigned_task_id", activeTaskId);

      if (error) throw error;

      if (clearanceId && clientStatus !== "Signed") {
        await supabase
          .from("clearance_records")
          .update({ status: "Incomplete" })
          .eq("clearance_id", clearanceId);
      }
      queryClient.invalidateQueries({ queryKey: ["department-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });

      if (studentId) {
        const rejectedTask = tasks.find((t) => t.assigned_task_id === activeTaskId);
        const taskTitle = rejectedTask?.title || "requirement";

        // Remove any prior cleared notifications for this task
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", studentId)
          .ilike("title", "%Cleared%")
          .ilike("description", `%"${taskTitle}"%`);

        try {
          await supabase.from("notifications").insert({
            user_id: studentId,
            target_role: "student",
            category: "submission",
            title: "Submission Rejected",
            description: `Your submission for "${taskTitle}" was rejected. Reason: ${comment}`,
            type: "Warning",
            ref_url: `/clearance/tasks?taskId=${activeTaskId}`,
            is_read: false,
            metadata: {
              studentId,
              taskId: activeTaskId,
              taskTitle,
              reason: comment,
            },
          });
        } catch (notifErr) {
          console.error("Failed to insert reject notification:", notifErr);
        }
      }
    } catch (error) {
      console.error("Error rejecting with resubmit:", error);
      setTasks((prev) =>
        prev.map((t) =>
          t.assigned_task_id === activeTaskId
            ? { ...t, status: "Submitted" as TaskStatus }
            : t
        )
      );
    }
  };

  const handleUpdateFeedback = async (newComment: string) => {
    if (activeTaskId === null) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.assigned_task_id === activeTaskId
          ? { ...t, comments: newComment }
          : t
      )
    );

    try {
      const { error } = await supabase
        .from("clearance_tasks")
        .update({ comments: newComment })
        .eq("assigned_task_id", activeTaskId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating feedback:", error);
      throw error;
    }
  };

  const closeModal = () => {
    setActiveTaskId(null);
    setFetchedFiles([]);
    setAiAuditReport(null);
  };

  const getDeptIcon = (deptName: string, iconName?: string) => {
    const IconComp = getDepartmentIcon(iconName, deptName);
    return <IconComp size={16} className="text-amber-400" />;
  };

  const canViewSubmission = (status: TaskStatus) =>
    status === "Submitted" || status === "Flagged" || status === "Verified";

  const isTaskInPerson = (task: Tasks) => {
    return !originallyRequiredDropbox(task);
  };

  const handleUpdateInPersonTaskStatus = async (
    taskId: number,
    newStatus: TaskStatus,
    comment: string
  ) => {
    const targetTask = tasks.find((t) => t.assigned_task_id === taskId);
    setTasks((prev) =>
      prev.map((t) =>
        t.assigned_task_id === taskId
          ? { ...t, status: newStatus, comments: comment }
          : t
      )
    );
    try {
      const { error } = await supabase
        .from("clearance_tasks")
        .update({ status: newStatus, comments: comment })
        .eq("assigned_task_id", taskId);
      if (error) throw error;

      // Check remaining tasks for this client to synchronize clearance_records status:
      // If all tasks are cleared/completed, set to "Pending"
      // If any unfulfilled tasks remain, set to "Incomplete"
      const updatedTasks = tasks.map((t) =>
        t.assigned_task_id === taskId ? { ...t, status: newStatus, comments: comment } : t
      );
      const hasRemainingUnfulfilled = updatedTasks.some(
        (t) => t.status !== "Cleared"
      );

      if (clearanceId && clientStatus !== "Signed") {
        const nextRecordStatus = hasRemainingUnfulfilled ? "Incomplete" : "Pending";
        await supabase
          .from("clearance_records")
          .update({ status: nextRecordStatus })
          .eq("clearance_id", clearanceId);
      }
      queryClient.invalidateQueries({ queryKey: ["department-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });

      if (newStatus === "Cleared" && studentId) {
        const taskTitle = targetTask?.title || "In-Person Requirement";

        // Remove any prior returned notifications
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", studentId)
          .ilike("title", "%Returned%")
          .ilike("description", `%"${taskTitle}"%`);

        try {
          await supabase.from("notifications").insert({
            user_id: studentId,
            target_role: "student",
            category: "task",
            title: "Requirement Cleared",
            description: `Your requirement "${taskTitle}" has been approved and cleared by ${currentDeptName}.`,
            type: "Success",
            ref_url: `/clearance/tasks?taskId=${taskId}`,
            is_read: false,
            metadata: {
              studentId,
              taskId,
              taskTitle,
              departmentName: currentDeptName,
            },
          });
        } catch (notifErr) {
          console.error("Failed to insert in-person cleared notification:", notifErr);
        }
      } else if (newStatus === "Pending" && studentId && targetTask?.title) {
        // If reverted to pending, clean up "Requirement Cleared" notification
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", studentId)
          .ilike("title", "%Cleared%")
          .ilike("description", `%"${targetTask.title}"%`);
      }
    } catch (error) {
      console.error("Error updating in-person task status:", error);
      throw error;
    }
  };

  const handleUpdateInPersonFeedback = async (taskId: number, newComment: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.assigned_task_id === taskId
          ? { ...t, comments: newComment }
          : t
      )
    );

    try {
      const { error } = await supabase
        .from("clearance_tasks")
        .update({ comments: newComment })
        .eq("assigned_task_id", taskId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating in-person feedback:", error);
      throw error;
    }
  };

  const personLabel = viewType === "students" ? "student" : "staff";

  return (
    <div className="relative flex h-full w-full flex-col bg-[#0a101f] text-slate-100 font-sans mx-auto border-x border-slate-800 select-none overflow-hidden">
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-[#070c18] border-b border-slate-800 px-6 py-5 w-full shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white tracking-tight truncate">Clearance Details</h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Review requirements and submissions</p>
          </div>
        </div>

        {/* Profile */}
        <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-slate-800 p-3.5 bg-[#0a101f] w-full overflow-hidden shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-sm font-bold text-amber-400 shadow-inner">
            {studentName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{studentName}</h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">{studentId}</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 w-full">
        {/* Department Progress Section */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-3 w-full">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Department Status</h3>
            <span className="text-xs font-mono text-slate-400">
              {progress.filter((p) => p.status === "Signed").length} / {progress.length} Cleared
            </span>
          </div>

          <div className="flex flex-col gap-2 w-full">
            {progress.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-[#070c18]/50 px-4 py-8 text-center text-xs text-slate-500">
                No clearance records found.
              </div>
            ) : (
              progress.map((item) => {
                const isCurrent =
                  currentDepartment &&
                  item.dept_name.toLowerCase() === currentDepartment.toLowerCase();
                const isSigned = item.status === "Signed";
                const isPending = item.status === "Pending";

                return (
                  <div
                    key={item.dept_name}
                    className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-ui duration-200 w-full overflow-hidden ${
                      isCurrent
                        ? "border-amber-500/40 bg-amber-500/10 shadow-xs"
                        : "border-slate-800 bg-[#070c18] hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
                        {getDeptIcon(item.dept_name, item.icon_name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {item.dept_name}
                          </span>
                          <span className="rounded-full border border-slate-700/60 bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            P{item.tier ?? 1}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isCurrent && (
                        <span className="text-[11px] font-medium text-amber-400 hidden sm:inline">
                          Your Office
                        </span>
                      )}
                      {isSigned ? (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Signed
                        </span>
                      ) : isPending ? (
                        <span className="rounded-full border border-slate-700/70 bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          Pending
                        </span>
                      ) : (
                        <span className="rounded-full border border-blue-500/40 bg-blue-950/40 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
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
        <section className="w-full">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Required Tasks</h3>

          <div className="space-y-3 w-full">
            {sortedTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-[#070c18]/50 px-4 py-8 text-center text-xs text-slate-500">
                No active tasks assigned.
              </div>
            ) : (
              sortedTasks.map((task) => {
                const isThisLoading = isLoading && activeTaskId === task.assigned_task_id;
                const isRejected = task.status === "Rejected";
                const isInPerson = isTaskInPerson(task);
                const isOverdue = isTaskOverdue(task);
                const isSubmittedTask = canViewSubmission(task.status);
                const subKey = getTaskSubmissionKey(task);
                const isUnviewed =
                  isSubmittedTask &&
                  (viewedSubmissionKeys
                    ? !viewedSubmissionKeys.has(subKey)
                    : !viewedSubmissionIds || !viewedSubmissionIds.has(task.assigned_task_id));

                let hasAppeal = false;
                if (task.status !== "Rejected" && task.status !== "Cleared" && task.ai_audit_report) {
                  let rep = task.ai_audit_report;
                  if (typeof rep === "string") {
                    try {
                      rep = JSON.parse(rep);
                    } catch {}
                  }
                  if (rep && typeof rep === "object" && rep.appeal) {
                    hasAppeal = true;
                  }
                }

                const isBypassed =
                  clientStatus === "Signed" &&
                  task.status !== "Cleared";

                return (
                  <div
                    key={task.assigned_task_id}
                    className={`relative group rounded-xl border transition-ui shadow-xs ${
                      isBypassed
                        ? "border-slate-800/40 bg-[#070c18]/40 opacity-45 grayscale hover:opacity-75"
                        : "border-slate-800 bg-[#070c18] hover:bg-slate-800/30"
                    }`}
                  >
                    {/* Top right corner indicator: HelpCircle if appealed, red dot if unviewed submission */}
                    {!isBypassed && (
                      hasAppeal ? (
                        <div
                          title={
                            isUnviewed
                              ? "Client appealed document authenticity (Unviewed)"
                              : "Client appealed document authenticity (Viewed)"
                          }
                          className="absolute top-2 right-2 z-10 flex items-center justify-center pointer-events-none"
                        >
                          <HelpCircle
                            className={`w-3.5 h-3.5 ${
                              isUnviewed ? "text-blue-400 animate-pulse" : "text-slate-500"
                            }`}
                          />
                        </div>
                      ) : (
                        isUnviewed && (
                          <span
                            title="New unviewed submission"
                            className="absolute top-2 right-2 flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#070c18] animate-pulse shadow-sm z-10"
                          />
                        )
                      )
                    )}

                    {/* Main Row based on image */}
                    <div
                      onClick={() => {
                        const taskKey = getTaskSubmissionKey(task);
                        if (isInPerson) {
                          onViewSubmission?.(task.assigned_task_id, taskKey);
                          setActiveInPersonTaskId(task.assigned_task_id);
                        } else {
                          handleOpenSubmission(task.assigned_task_id);
                        }
                      }}
                      className="p-3.5 sm:p-4 flex items-center justify-between w-full text-left cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Status Icon */}
                        <div className={`flex-shrink-0 ${isBypassed ? "opacity-60" : ""}`}>
                          {renderLeftStatusIcon(task.status, isInPerson)}
                        </div>

                        {/* Title and Due Date (replacing 'Online') */}
                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`font-semibold text-sm transition-colors truncate block max-w-[170px] sm:max-w-[210px] ${
                                isBypassed
                                  ? "line-through text-slate-500"
                                  : "text-white group-hover:text-amber-300"
                              }`}
                              title={
                                isBypassed
                                  ? `${task.title || "Untitled Task"} (Waived upon sign-off)`
                                  : task.title
                              }
                            >
                              {task.title || "Untitled Task"}
                            </span>
                            {isBypassed && (
                              <span className="shrink-0 text-[10px] font-medium text-slate-500 bg-slate-800/60 border border-slate-700/50 rounded-md px-1.5 py-0.2 select-none">
                                Waived
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 min-w-0">
                            <Calendar
                              size={12}
                              className={
                                isBypassed
                                  ? "text-slate-600 shrink-0"
                                  : isOverdue
                                  ? "text-rose-400 shrink-0"
                                  : task.due_date
                                  ? "text-slate-400 shrink-0"
                                  : "text-slate-500 shrink-0"
                              }
                            />
                            {task.due_date ? (
                              <span
                                className={`text-xs truncate ${
                                  isBypassed
                                    ? "text-slate-600 line-through"
                                    : isOverdue
                                    ? "text-rose-400 font-medium"
                                    : "text-slate-400"
                                }`}
                              >
                                {formatDate(task.due_date)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 truncate">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side Status Badge and Chevron */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {isBypassed ? (
                          <span
                            title="This requirement was bypassed because the client was signed off"
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-slate-700/60 bg-slate-800/60 text-slate-400 whitespace-nowrap shadow-xs select-none"
                          >
                            BYPASSED
                          </span>
                        ) : (
                          renderStatusBadge(task.status, isInPerson)
                        )}

                        {isThisLoading && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        )}

                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-amber-300 transition-ui shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ACTION FOOTER */}
      <div className="sticky bottom-0 z-20 border-t border-slate-800 bg-[#070c18] px-5 py-3.5 w-full shrink-0">
        <div className="flex items-center justify-between gap-2.5 w-full">
          {/* Sign Toggle Button */}
          <div className="flex-1 min-w-0">
            {(() => {
              const unfulfilledTasks = tasks.filter(
                (t) => t.status !== "Cleared"
              );
              const hasPendingTasks = unfulfilledTasks.length > 0;
              const pendingTasksCount = unfulfilledTasks.length;

              return (
                <SignToggleButton
                  clearanceId={clearanceId ? [clearanceId] : []}
                  currentStatus={clientStatus || "Pending"}
                  disabled={isLocked && clientStatus !== "Signed"}
                  hasPendingTasks={hasPendingTasks}
                  pendingTasksCount={pendingTasksCount}
                  clientName={studentName}
                  className="w-full justify-center py-2 text-xs"
                />
              );
            })()}
          </div>

          {/* Add & Preset Actions & Direct Client Navigation */}
          <div className="flex items-center gap-2 shrink-0">
            {activePreset && (
              <>
                <AddTask
                  preset={activePreset}
                  clearanceId={clearanceId ? [clearanceId] : []}
                  taskId={taskId}
                  description={description}
                  setDescription={setDescription}
                  title={title}
                  setTitle={setTitle}
                  sectionId={sectionId}
                  existingTasks={tasks}
                  buttonClassName="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 hover:text-white text-slate-200 px-3 py-2 text-xs font-semibold transition-ui cursor-pointer shadow-xs"
                />
                <AddPreset
                  preset={activePreset}
                  taskId={taskId}
                  setTaskId={setTaskId}
                  clearanceId={clearanceId ? [clearanceId] : []}
                  description={description}
                  sectionId={sectionId}
                  existingTasks={tasks}
                  buttonClassName="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 hover:text-white text-slate-200 px-3 py-2 text-xs font-semibold transition-ui cursor-pointer shadow-xs"
                />
              </>
            )}

            {/* Direct Client Navigation: Previous Client & Next Client */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
              <button
                type="button"
                onClick={onPrevClient}
                disabled={!hasPrevClient}
                title={hasPrevClient ? (prevClientName ? `Previous client: ${prevClientName}` : "Previous client") : "First client"}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-ui ${
                  hasPrevClient
                    ? "border-slate-700 bg-slate-800/90 hover:bg-slate-700 hover:text-white text-slate-200 cursor-pointer shadow-xs"
                    : "border-slate-800/40 bg-slate-900/30 text-slate-600 opacity-40 cursor-not-allowed"
                }`}
                aria-label="Previous client"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNextClient}
                disabled={!hasNextClient}
                title={hasNextClient ? (nextClientName ? `Next client: ${nextClientName}` : "Next client") : "Last client"}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-ui ${
                  hasNextClient
                    ? "border-slate-700 bg-slate-800/90 hover:bg-slate-700 hover:text-white text-slate-200 cursor-pointer shadow-xs"
                    : "border-slate-800/40 bg-slate-900/30 text-slate-600 opacity-40 cursor-not-allowed"
                }`}
                aria-label="Next client"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SubmissionModal
        isOpen={activeTaskId !== null && !isLoading}
        onClose={closeModal}
        studentName={studentName}
        task={tasks.find((t) => t.assigned_task_id === activeTaskId)}
        taskTitle={tasks.find((t) => t.assigned_task_id === activeTaskId)?.title}
        taskDescription={tasks.find((t) => t.assigned_task_id === activeTaskId)?.description}
        taskDueDate={tasks.find((t) => t.assigned_task_id === activeTaskId)?.due_date}
        taskAssignedAt={tasks.find((t) => t.assigned_task_id === activeTaskId)?.assigned_at}
        lastUpdated={lastUpdatedDate}
        files={fetchedFiles}
        status={tasks.find((t) => t.assigned_task_id === activeTaskId)?.status}
        comments={tasks.find((t) => t.assigned_task_id === activeTaskId)?.comments}
        aiAuditReport={aiAuditReport}
        onUpdateStatus={handleUpdateStatus}
        onReopen={() => handleUpdateStatus("Pending", tasks.find((t) => t.assigned_task_id === activeTaskId)?.comments ?? "")}
        onRejectWithResubmit={handleRejectWithResubmit}
        onUpdateFeedback={handleUpdateFeedback}
        onEdit={(t) => {
          closeModal();
          const found = t || tasks.find((item) => item.assigned_task_id === activeTaskId);
          if (found) setTaskToEdit(found);
        }}
        onDelete={(t) => {
          closeModal();
          const found = t || tasks.find((item) => item.assigned_task_id === activeTaskId);
          if (found) setTaskToDelete(found);
        }}
        viewType={viewType}
        hasPrevTask={hasPrevTask}
        onPrevTask={handlePrevTask}
        hasNextTask={hasNextTask}
        onNextTask={handleNextTask}
        isFirstTask={isFirstTask}
        isLastTask={isLastTask}
        hasPrevClient={isClientModalNavEnabled && hasPrevClient}
        prevClientName={prevClientName}
        onPrevClient={handlePrevClientClick}
        hasNextClient={isClientModalNavEnabled && hasNextClient}
        nextClientName={nextClientName}
        onNextClient={handleNextClientClick}
      />

      <InPersonModal
        isOpen={activeInPersonTaskId !== null}
        onClose={() => setActiveInPersonTaskId(null)}
        studentName={studentName}
        task={activeInPersonTask}
        onUpdateStatus={handleUpdateInPersonTaskStatus}
        onUpdateFeedback={handleUpdateInPersonFeedback}
        onEdit={(t) => {
          setActiveInPersonTaskId(null);
          const found = tasks.find((item) => item.assigned_task_id === t.assigned_task_id);
          if (found) setTaskToEdit(found);
        }}
        onDelete={(t) => {
          setActiveInPersonTaskId(null);
          const found = tasks.find((item) => item.assigned_task_id === t.assigned_task_id);
          if (found) setTaskToDelete(found);
        }}
        viewType={viewType}
        hasPrevTask={hasPrevTask}
        onPrevTask={handlePrevTask}
        hasNextTask={hasNextTask}
        onNextTask={handleNextTask}
        isFirstTask={isFirstTask}
        isLastTask={isLastTask}
        hasPrevClient={isClientModalNavEnabled && hasPrevClient}
        prevClientName={prevClientName}
        onPrevClient={handlePrevClientClick}
        hasNextClient={isClientModalNavEnabled && hasNextClient}
        nextClientName={nextClientName}
        onNextClient={handleNextClientClick}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={taskToEdit !== null}
        onClose={() => setTaskToEdit(null)}
        task={taskToEdit}
        onSave={handleSaveEditTask}
      />

      {/* Delete Task Dialog */}
      <DeleteTaskDialog
        isOpen={taskToDelete !== null}
        onClose={() => setTaskToDelete(null)}
        task={taskToDelete}
        onConfirm={handleConfirmDeleteTask}
      />
    </div>
  );
}
