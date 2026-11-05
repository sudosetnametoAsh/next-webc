"use client";

import { isOnlineSubmission } from "@/lib/task-submission-mode";
import { useLiveTaskState } from "@/hooks/clearance/use-live-task-state";

import { APP_TIME_ZONE } from "@/lib/date-time";


import React, { useState, useMemo, useEffect, useRef, Fragment } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  FileText,
  Building2,
  UserCheck,
  Check,
  HelpCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  getClearanceRecordsPromise,
  getDepartmentDetailsPromise,
  getStudentProfilePromise,
} from "@/modules/clearance/application/repository/dashboard-repository";
import { getDepartmentIcon } from "@/lib/department-icons";
import { useClearanceData } from "@/hooks/clearance/use-clearance-data";
import RequirementModal, {
  ModalTaskData,
  ModalFileItem,
  parseDropboxFiles,
} from "../requirement-modal";
import {
  getTaskViewKey,
  isTaskViewed,
  normalizeTimestamp,
  isTaskNotificationAcknowledged,
  markTaskNotificationAcknowledged,
} from "@/lib/clearance-logic";

export interface ClearanceTaskItem {
  id: number;
  clearanceId?: number | null;
  title: string;
  step: number;
  department: string;
  staff: string;
  dueDate?: string;
  rawDueDate?: string | null;
  isOverdue?: boolean;
  isDueSoon?: boolean;
  assignedAt?: string | null;
  status: "Pending" | "Returned" | "Cleared" | "Submitted" | "In Person" | "Flagged" | "Rejected" | "For review";
  rawStatus?: string | null;
  hasAppeal?: boolean;
  isInPerson?: boolean;
  description: string;
  comments?: string | null;
  dropbox?: string | null;
  fileName?: string;
  files?: ModalFileItem[];
  uploadedAt?: string | null;
  aiAuditReport?: any;
  floor?: string | null;
  room?: string | null;
  iconName?: string | null;
}

type FilterStatus = "All" | "Returned" | "Flagged" | "Pending" | "Submitted" | "Cleared";

const getTaskStatusRank = (status: string, rawStatus?: string | null): number => {
  // Rank 1: Rejected / Returned by department staff
  if (
    status === "Returned" ||
    status === "Rejected" ||
    rawStatus === "Rejected" ||
    rawStatus === "Returned"
  ) {
    return 1;
  }
  // Rank 2: Flagged early by system AI (unappealed)
  if (
    status === "Flagged" ||
    (rawStatus === "Flagged" && status !== "For review")
  ) {
    return 2;
  }
  // Rank 3: Pending (including In Person tasks)
  if (status === "Pending" || status === "In Person" || rawStatus === "Pending") {
    return 3;
  }
  // Rank 4: For review (appealed flagged tasks)
  if (
    status === "For review" ||
    status === "For Review" ||
    (rawStatus === "Flagged" && status === "For review")
  ) {
    return 4;
  }
  // Rank 5: Submitted (awaiting review)
  if (
    status === "Submitted" ||
    status === "Verified" ||
    rawStatus === "Submitted" ||
    rawStatus === "Verified"
  ) {
    return 5;
  }
  // Rank 6: Cleared
  if (status === "Cleared" || rawStatus === "Cleared" || rawStatus === "Signed") {
    return 6;
  }
  return 7;
};

const isTaskActionable = (t: ClearanceTaskItem): boolean => {
  const rank = getTaskStatusRank(t.status, t.rawStatus);
  return rank <= 3; // 1: Rejected, 2: Flagged, 3: Pending / In Person
};

interface TasksPageProps {
  task?: getDepartmentDetailsPromise;
  records?: getClearanceRecordsPromise;
  studentProfile?: getStudentProfilePromise | null;
  studentId?: string;
}

function formatRelativeTimestamp(isoDateStr?: string | null): string {
  if (!isoDateStr) return "Recently";
  const date = new Date(isoDateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
  });
}

function formatSubmittedTime(isoDateStr?: string | null): string {
  if (!isoDateStr) return "Submitted recently";
  const date = new Date(isoDateStr);
  if (isNaN(date.getTime())) return "Submitted recently";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Submitted just now";
  if (diffMinutes < 60) return `Submitted ${diffMinutes}m ago`;
  if (diffHours < 24) return `Submitted ${diffHours}${diffHours === 1 ? "hr" : "hrs"} ago`;
  if (diffDays === 1) return "Submitted yesterday";
  if (diffDays < 7) return `Submitted ${diffDays}d ago`;

  return `Submitted on ${date.toLocaleDateString("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
  })}`;
}

export default function TasksPage({
  task: propTask = [],
  records: propRecords = [],
  studentProfile: propStudentProfile,
  studentId = "",
}: TasksPageProps) {
  const {
    tasks: liveTasks,
    records,
    studentProfile,
  } = useClearanceData(studentId, {
    initialData: {
      tasks: propTask,
      records: propRecords,
      studentProfile: propStudentProfile,
    },
  });

  const [tasksList, setTasksList] = useLiveTaskState(liveTasks);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("All");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  // ── Priority Elevation & Viewed Tasks Persistence ──
  const tasksPageStorageKey = `student_tasks_page_viewed_${studentId || "default"}`;
  const deptStorageKey = `student_viewed_tasks_${studentId || "default"}`;
  const ackSessionStorageKey = `student_ack_tasks_v2_${studentId || "default"}`;

  const [isMounted, setIsMounted] = useState(false);
  const [viewedTaskIds, setViewedTaskIds] = useState<Set<string | number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const pageKey = `student_tasks_page_viewed_${studentId || "default"}`;
      const deptKey = `student_viewed_tasks_${studentId || "default"}`;
      const storedPage = localStorage.getItem(pageKey);
      const storedDept = localStorage.getItem(deptKey);
      const parsedPage = storedPage ? JSON.parse(storedPage) : [];
      const parsedDept = storedDept ? JSON.parse(storedDept) : [];
      return new Set<string | number>([
        ...(Array.isArray(parsedPage) ? parsedPage : []),
        ...(Array.isArray(parsedDept) ? parsedDept : []),
      ]);
    } catch {
      return new Set();
    }
  });
  const [sessionAcknowledgedTaskIds, setSessionAcknowledgedTaskIds] = useState<Set<string | number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const ackKey = `student_ack_tasks_v2_${studentId || "default"}`;
      const storedAck = sessionStorage.getItem(ackKey) || localStorage.getItem(ackKey);
      const parsedAck = storedAck ? JSON.parse(storedAck) : [];
      return new Set<string | number>(Array.isArray(parsedAck) ? parsedAck : []);
    } catch {
      return new Set();
    }
  });

  // Helper to load combined viewed task keys from both tasksPageStorageKey and deptStorageKey
  const loadViewedFromStorage = React.useCallback(() => {
    try {
      const storedPage = localStorage.getItem(tasksPageStorageKey);
      const storedDept = localStorage.getItem(deptStorageKey);
      const parsedPage = storedPage ? JSON.parse(storedPage) : [];
      const parsedDept = storedDept ? JSON.parse(storedDept) : [];
      const combined = new Set<string | number>([
        ...(Array.isArray(parsedPage) ? parsedPage : []),
        ...(Array.isArray(parsedDept) ? parsedDept : []),
      ]);
      setViewedTaskIds(combined);

      const storedAck =
        sessionStorage.getItem(ackSessionStorageKey) ||
        localStorage.getItem(ackSessionStorageKey);
      if (storedAck) {
        const parsedAck = JSON.parse(storedAck);
        setSessionAcknowledgedTaskIds(
          new Set(Array.isArray(parsedAck) ? parsedAck : [])
        );
      }
    } catch {}
  }, [tasksPageStorageKey, deptStorageKey, ackSessionStorageKey]);

  // Mount effect: safely load localStorage / sessionStorage after hydration to prevent SSR mismatch
  useEffect(() => {
    setIsMounted(true);
    loadViewedFromStorage();
  }, [loadViewedFromStorage]);

  const mountedAtRef = useRef<number>(Date.now());
  const currentElevatedKeysRef = useRef<string[]>([]);
  const allTasksRef = useRef<ClearanceTaskItem[]>([]);

  // Synchronize viewedTaskIds when studentId is available or updated
  useEffect(() => {
    if (typeof window === "undefined" || !studentId) return;
    loadViewedFromStorage();
  }, [studentId, loadViewedFromStorage]);

  // Listen for viewed task events across browser tabs/components
  useEffect(() => {
    const handleUpdate = () => {
      loadViewedFromStorage();
    };
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === tasksPageStorageKey ||
        e.key === deptStorageKey ||
        e.key === ackSessionStorageKey
      ) {
        handleUpdate();
      }
    };
    window.addEventListener("student_tasks_page_viewed_updated", handleUpdate);
    window.addEventListener("student_tasks_viewed_updated", handleUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("student_tasks_page_viewed_updated", handleUpdate);
      window.removeEventListener("student_tasks_viewed_updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [tasksPageStorageKey, deptStorageKey, ackSessionStorageKey, loadViewedFromStorage]);

  // Check if a task is a returned / rejected requirement that has not been acknowledged yet
  const isTaskReturnedElevated = (t: ClearanceTaskItem) => {
    if (!isMounted) return false;
    if (t.id <= 0 || t.status === "Cleared") return false;
    if (t.status === "Submitted" || t.rawStatus === "Submitted") return false;
    const isReturned =
      t.status === "Returned" ||
      t.rawStatus === "Rejected";
    if (!isReturned) return false;
    if (isTaskViewed(t.id, t.rawStatus || t.status, viewedTaskIds, t.uploadedAt, t.comments)) return false;
    if (isTaskViewed(t.id, t.rawStatus || t.status, sessionAcknowledgedTaskIds, t.uploadedAt, t.comments)) return false;
    return true;
  };

  // Check if a task is a flagged requirement (flagged early by AI) that has not been acknowledged yet
  const isTaskFlaggedElevated = (t: ClearanceTaskItem) => {
    if (!isMounted) return false;
    if (t.id <= 0 || t.status === "Cleared") return false;
    if (
      t.status === "Submitted" ||
      t.rawStatus === "Submitted" ||
      t.status === "For review" ||
      t.hasAppeal
    )
      return false;
    const isFlagged =
      t.status === "Flagged" ||
      t.rawStatus === "Flagged";
    if (!isFlagged) return false;
    if (isTaskViewed(t.id, t.rawStatus || t.status, viewedTaskIds, t.uploadedAt, t.comments)) return false;
    if (isTaskViewed(t.id, t.rawStatus || t.status, sessionAcknowledgedTaskIds, t.uploadedAt, t.comments)) return false;
    return true;
  };

  // Check if a task is a newly assigned requirement (Pending / In Person) that has not been acknowledged yet
  const isTaskNewElevated = (t: ClearanceTaskItem) => {
    if (!isMounted) return false;
    if (t.id <= 0 || t.status === "Cleared") return false;
    if (t.status === "Submitted" || t.rawStatus === "Submitted") return false;
    const isReturnedOrFlagged =
      t.status === "Returned" ||
      t.status === "Flagged" ||
      t.rawStatus === "Rejected" ||
      t.rawStatus === "Flagged";
    if (isReturnedOrFlagged) return false;
    if (isTaskViewed(t.id, t.rawStatus || t.status, viewedTaskIds, t.uploadedAt, t.comments)) return false;
    if (isTaskViewed(t.id, t.rawStatus || t.status, sessionAcknowledgedTaskIds, t.uploadedAt, t.comments)) return false;
    return true;
  };

  // Combined elevated check (returned, flagged, or newly assigned)
  const isTaskElevated = (t: ClearanceTaskItem) => {
    return isTaskReturnedElevated(t) || isTaskFlaggedElevated(t) || isTaskNewElevated(t);
  };

  // Helper to mark corresponding database notifications as read for a viewed task (idempotent)
  const markNotificationsAsReadForTask = (taskId: number, taskTitle?: string) => {
    if (!studentId || !taskId || isTaskNotificationAcknowledged(studentId, taskId)) return;
    markTaskNotificationAcknowledged(studentId, taskId);

    try {
      fetch("/api/student/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          taskTitle,
          userId: studentId,
        }),
      })
        .then(() => {
          window.dispatchEvent(new Event("notifications_updated"));
        })
        .catch(() => {});
    } catch {}
  };

  // Mark task as viewed permanently and acknowledge it in current session so it reorders
  const markTaskViewed = (
    taskId: number,
    status?: string | null,
    uploadedAt?: string | null,
    comments?: string | null
  ) => {
    if (!taskId || taskId <= 0) return;
    const taskObj = allTasksRef.current.find((t) => t.id === taskId);
    markNotificationsAsReadForTask(taskId, taskObj?.title);
    const fullKey = getTaskViewKey(taskId, status, uploadedAt, comments);
    const normalized = (status || "").toLowerCase();
    const isFlagged = normalized === "flagged";
    const isRejected = normalized === "rejected" || normalized === "returned";
    const cleanUpload = normalizeTimestamp(uploadedAt);

    setViewedTaskIds((prev) => {
      const hasFull = prev.has(fullKey);
      const hasBase = isFlagged
        ? prev.has(`${taskId}_flagged`)
        : isRejected
        ? prev.has(`${taskId}_rejected`)
        : prev.has(`${taskId}_assigned`);
      if (hasFull && hasBase) return prev;
      const next = new Set(prev);
      next.add(fullKey);
      if (isFlagged) {
        if (cleanUpload) next.add(`${taskId}_flagged_${cleanUpload}`);
        next.add(`${taskId}_flagged`);
      } else if (isRejected) {
        if (cleanUpload) next.add(`${taskId}_rejected_${cleanUpload}`);
        next.add(`${taskId}_rejected`);
      } else {
        next.add(`${taskId}_assigned`);
        next.add(taskId);
        next.add(String(taskId));
      }
      try {
        localStorage.setItem(tasksPageStorageKey, JSON.stringify(Array.from(next)));
        window.dispatchEvent(new Event("student_tasks_page_viewed_updated"));

        // Also acknowledge for department overlay so the badge on /clearance clears when viewed here
        const storedDept = localStorage.getItem(deptStorageKey);
        const deptSet = new Set<string | number>(storedDept ? JSON.parse(storedDept) : []);
        next.forEach((k) => deptSet.add(k));
        localStorage.setItem(deptStorageKey, JSON.stringify(Array.from(deptSet)));
        window.dispatchEvent(new Event("student_tasks_viewed_updated"));
      } catch {}
      return next;
    });

    setSessionAcknowledgedTaskIds((prev) => {
      const hasFull = prev.has(fullKey);
      const hasBase = isFlagged
        ? prev.has(`${taskId}_flagged`)
        : isRejected
        ? prev.has(`${taskId}_rejected`)
        : prev.has(`${taskId}_assigned`);
      if (hasFull && hasBase) return prev;
      const next = new Set(prev);
      next.add(fullKey);
      if (isFlagged) {
        if (cleanUpload) next.add(`${taskId}_flagged_${cleanUpload}`);
        next.add(`${taskId}_flagged`);
      } else if (isRejected) {
        if (cleanUpload) next.add(`${taskId}_rejected_${cleanUpload}`);
        next.add(`${taskId}_rejected`);
      } else {
        next.add(`${taskId}_assigned`);
        next.add(taskId);
        next.add(String(taskId));
      }
      try {
        sessionStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
        localStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Acknowledge all currently elevated tasks across viewedTaskIds and session storage
  // When onlyNewTasks=true, preserves Returned and Flagged action items and only marks New Tasks as viewed
  const acknowledgeAllElevatedTasks = (onlyNewTasks = false) => {
    const elevated = allTasksRef.current.filter((t) =>
      onlyNewTasks ? isTaskNewElevated(t) : isTaskElevated(t)
    );
    if (elevated.length === 0) return;

    // Batch acknowledge notifications only for tasks not yet acknowledged
    const unacked = elevated.filter((t) => !isTaskNotificationAcknowledged(studentId, t.id));
    if (unacked.length > 0) {
      markTaskNotificationAcknowledged(studentId, unacked.map((t) => t.id));
      try {
        fetch("/api/student/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskIds: unacked.map((t) => t.id),
            taskTitles: unacked.map((t) => t.title),
            userId: studentId,
          }),
        })
          .then(() => {
            window.dispatchEvent(new Event("notifications_updated"));
          })
          .catch(() => {});
      } catch {}
    }

    const keysToAdd: (string | number)[] = [];
    for (const t of elevated) {
      const fullKey = getTaskViewKey(t.id, t.rawStatus || t.status, t.uploadedAt, t.comments);
      const normalized = (t.rawStatus || t.status || "").toLowerCase();
      const isFlagged = normalized === "flagged";
      const isRejected = normalized === "rejected" || normalized === "returned";
      const cleanUpload = normalizeTimestamp(t.uploadedAt);

      keysToAdd.push(fullKey);
      if (isFlagged) {
        if (cleanUpload) keysToAdd.push(`${t.id}_flagged_${cleanUpload}`);
        keysToAdd.push(`${t.id}_flagged`);
      } else if (isRejected) {
        if (cleanUpload) keysToAdd.push(`${t.id}_rejected_${cleanUpload}`);
        keysToAdd.push(`${t.id}_rejected`);
      } else {
        keysToAdd.push(`${t.id}_assigned`, t.id, String(t.id));
      }
    }

    setViewedTaskIds((prev) => {
      const next = new Set(prev);
      keysToAdd.forEach((k) => next.add(k));
      try {
        localStorage.setItem(tasksPageStorageKey, JSON.stringify(Array.from(next)));
        window.dispatchEvent(new Event("student_tasks_page_viewed_updated"));

        const storedDept = localStorage.getItem(deptStorageKey);
        const deptSet = new Set<string | number>(storedDept ? JSON.parse(storedDept) : []);
        keysToAdd.forEach((k) => deptSet.add(k));
        localStorage.setItem(deptStorageKey, JSON.stringify(Array.from(deptSet)));
        window.dispatchEvent(new Event("student_tasks_viewed_updated"));
      } catch {}
      return next;
    });

    setSessionAcknowledgedTaskIds((prev) => {
      const next = new Set(prev);
      keysToAdd.forEach((k) => next.add(k));
      try {
        sessionStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
        localStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Synchronous acknowledgment for page unmount and beforeunload
  const acknowledgeAllElevatedTasksSync = (onlyNewTasks = false) => {
    const elevated = allTasksRef.current.filter((t) =>
      onlyNewTasks ? isTaskNewElevated(t) : isTaskElevated(t)
    );
    if (elevated.length === 0) return;

    // Batch acknowledge notifications only for tasks not yet acknowledged
    const unacked = elevated.filter((t) => !isTaskNotificationAcknowledged(studentId, t.id));
    if (unacked.length > 0) {
      markTaskNotificationAcknowledged(studentId, unacked.map((t) => t.id));
      try {
        fetch("/api/student/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskIds: unacked.map((t) => t.id),
            taskTitles: unacked.map((t) => t.title),
            userId: studentId,
          }),
        })
          .then(() => {
            window.dispatchEvent(new Event("notifications_updated"));
          })
          .catch(() => {});
      } catch {}
    }

    try {
      const storedViewed = localStorage.getItem(tasksPageStorageKey);
      const existingViewed = storedViewed ? JSON.parse(storedViewed) : [];
      const viewedSet = new Set(existingViewed);

      const storedAck =
        sessionStorage.getItem(ackSessionStorageKey) ||
        localStorage.getItem(ackSessionStorageKey);
      const existingAck = storedAck ? JSON.parse(storedAck) : [];
      const ackSet = new Set(existingAck);

      for (const t of elevated) {
        const fullKey = getTaskViewKey(t.id, t.rawStatus || t.status, t.uploadedAt, t.comments);
        const normalized = (t.rawStatus || t.status || "").toLowerCase();
        const isFlagged = normalized === "flagged";
        const isRejected = normalized === "rejected" || normalized === "returned";
        const cleanUpload = normalizeTimestamp(t.uploadedAt);

        viewedSet.add(fullKey);
        ackSet.add(fullKey);
        if (isFlagged) {
          if (cleanUpload) {
            viewedSet.add(`${t.id}_flagged_${cleanUpload}`);
            ackSet.add(`${t.id}_flagged_${cleanUpload}`);
          }
          viewedSet.add(`${t.id}_flagged`);
          ackSet.add(`${t.id}_flagged`);
        } else if (isRejected) {
          if (cleanUpload) {
            viewedSet.add(`${t.id}_rejected_${cleanUpload}`);
            ackSet.add(`${t.id}_rejected_${cleanUpload}`);
          }
          viewedSet.add(`${t.id}_rejected`);
          ackSet.add(`${t.id}_rejected`);
        } else {
          viewedSet.add(`${t.id}_assigned`);
          viewedSet.add(t.id);
          viewedSet.add(String(t.id));
          ackSet.add(`${t.id}_assigned`);
          ackSet.add(t.id);
          ackSet.add(String(t.id));
        }
      }

      localStorage.setItem(tasksPageStorageKey, JSON.stringify(Array.from(viewedSet)));
      sessionStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(ackSet)));
      localStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(ackSet)));
      window.dispatchEvent(new Event("student_tasks_page_viewed_updated"));

      const storedDept = localStorage.getItem(deptStorageKey);
      const deptSet = new Set<string | number>(storedDept ? JSON.parse(storedDept) : []);
      viewedSet.forEach((k: any) => deptSet.add(k));
      localStorage.setItem(deptStorageKey, JSON.stringify(Array.from(deptSet)));
      window.dispatchEvent(new Event("student_tasks_viewed_updated"));
    } catch {}
  };

  // When switching filters (department or status), acknowledge elevated tasks so they reorder
  const prevFilterRef = useRef({ dept: selectedDepartment, status: selectedStatus });
  useEffect(() => {
    if (!isMounted) return;
    if (
      prevFilterRef.current.dept !== selectedDepartment ||
      prevFilterRef.current.status !== selectedStatus
    ) {
      prevFilterRef.current = { dept: selectedDepartment, status: selectedStatus };
      acknowledgeAllElevatedTasks(true);
    }
  }, [selectedDepartment, selectedStatus, isMounted]);

  // When client leaves the browser tab (visibility change / hidden), acknowledge new tasks
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        acknowledgeAllElevatedTasks(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // When navigating away from the page (unmount > 1000ms), acknowledge new tasks
  useEffect(() => {
    return () => {
      if (Date.now() - mountedAtRef.current > 1000) {
        acknowledgeAllElevatedTasksSync(true);
      }
    };
  }, [tasksPageStorageKey, deptStorageKey, ackSessionStorageKey]);

  // Catch window unload / page navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Date.now() - mountedAtRef.current > 1000) {
        acknowledgeAllElevatedTasksSync(true);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [tasksPageStorageKey, deptStorageKey, ackSessionStorageKey]);

  // 1. Build all unified tasks from live database (digital tasks + in-person department cards)
  const allTasks = useMemo(() => {
    // Map digital tasks
    const digitalList: ClearanceTaskItem[] = tasksList.map((t) => {
      const matchingRecord = records.find(
        (r) => r.department.toLowerCase() === t.department.toLowerCase()
      );

      // Check if dropbox was enabled for this task by staff
      const parsedFiles = parseDropboxFiles(t.dropbox, t.uploaded_at);
      const hasUploadedFile = parsedFiles.length > 0;
      const primaryFile = parsedFiles[0];

      const isRejected =
        t.status?.toLowerCase() === "rejected" ||
        t.status?.toLowerCase() === "returned";

      const isDropboxRequired = isOnlineSubmission(t.dropbox);

      const isInPerson = !isDropboxRequired;

      let hasAppeal = false;
      let appealTime: string | null = null;
      if (!isRejected && t.ai_audit_report) {
        let rep = t.ai_audit_report;
        if (typeof rep === "string") {
          try {
            rep = JSON.parse(rep);
          } catch {}
        }
        if (rep && typeof rep === "object" && rep.appeal) {
          hasAppeal = true;
          appealTime = rep.appeal.appealed_at || null;
        }
      }

      let uiStatus: ClearanceTaskItem["status"] = "Pending";
      if (t.status === "Cleared") {
        uiStatus = "Cleared";
      } else if (isRejected) {
        uiStatus = "Returned";
      } else if (t.status === "Flagged") {
        uiStatus = hasAppeal ? "For review" : "Flagged";
      } else if (
        t.status === "Submitted" ||
        t.status === "Verified" ||
        t.status === "For review"
      ) {
        uiStatus = "Submitted";
      } else if (isInPerson) {
        uiStatus = "In Person";
      } else {
        uiStatus = "Pending";
      }

      const now = Date.now();
      const dueTime = t.due_date ? new Date(t.due_date).getTime() : 0;
      const diffMs = dueTime - now;
      const isOverdue =
        Boolean(t.due_date) &&
        t.status !== "Cleared" &&
        diffMs < 0;
      const isDueSoon =
        Boolean(t.due_date) &&
        t.status !== "Cleared" &&
        diffMs >= 0 &&
        diffMs <= 24 * 60 * 60 * 1000;

      let formattedDueDate: string | undefined = undefined;
      if (t.due_date) {
        formattedDueDate = `Due on ${new Date(t.due_date).toLocaleDateString(
          "en-US",
          { timeZone: APP_TIME_ZONE, month: "short", day: "numeric", year: "numeric" }
        )}`;
      } else {
        formattedDueDate = "No deadline";
      }

      return {
        id: t.assigned_task_id,
        clearanceId: t.clearance_id ?? matchingRecord?.clearance_id,
        title: t.title,
        step: t.tier ?? matchingRecord?.tier ?? 1,
        department: t.department,
        staff: t.staff ?? matchingRecord?.staff ?? "Department Officer",
        dueDate: formattedDueDate,
        rawDueDate: t.due_date,
        isOverdue: Boolean(isOverdue),
        isDueSoon: Boolean(isDueSoon),
        assignedAt: t.assigned_at,
        status: uiStatus,
        rawStatus: t.status,
        hasAppeal: hasAppeal,
        isInPerson: isInPerson,
        description: t.description || "Clearance requirement.",
        comments: t.comments,
        dropbox: hasUploadedFile ? (primaryFile.url ?? null) : null,
        fileName: primaryFile?.name,
        files: parsedFiles,
        uploadedAt: t.uploaded_at || appealTime || primaryFile?.uploadDate,
        aiAuditReport: t.ai_audit_report,
        floor: t.floor ?? matchingRecord?.floor,
        room: t.room ?? matchingRecord?.room,
        iconName: t.icon_name ?? matchingRecord?.icon_name,
      };
    });

    return digitalList.sort((a, b) => {
      // 1. Status rank: rejected/flagged (1) -> pending (2) -> submitted (3) -> cleared (4)
      const rankA = getTaskStatusRank(a.status, a.rawStatus);
      const rankB = getTaskStatusRank(b.status, b.rawStatus);
      if (rankA !== rankB) return rankA - rankB;

      // 2. Phase (step) priority ascending within same status tier
      if (a.step !== b.step) return a.step - b.step;

      // 3. For submitted tasks, newest submission first
      if (a.status === "Submitted" && b.status === "Submitted") {
        if (a.uploadedAt && b.uploadedAt) {
          return (
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
        }
      }

      // 4. By due date ascending (soonest deadline first)
      if (a.rawDueDate && b.rawDueDate) {
        return (
          new Date(a.rawDueDate).getTime() - new Date(b.rawDueDate).getTime()
        );
      }
      if (a.rawDueDate) return -1;
      if (b.rawDueDate) return 1;

      // 5. Alphabetical department, then ID
      if (a.department !== b.department)
        return a.department.localeCompare(b.department);
      return a.id - b.id;
    });
  }, [tasksList, records]);

  // Keep allTasksRef and currentElevatedKeysRef synchronized
  useEffect(() => {
    allTasksRef.current = allTasks;
    if (!isMounted) return;
    const elevated = allTasks.filter(isTaskElevated);
    const keys: string[] = [];
    for (const t of elevated) {
      const fullKey = getTaskViewKey(t.id, t.rawStatus || t.status, t.uploadedAt, t.comments);
      const normalized = (t.rawStatus || t.status || "").toLowerCase();
      const isFlagged = normalized === "flagged";
      const isRejected = normalized === "rejected" || normalized === "returned";
      keys.push(fullKey);
      if (!isFlagged && !isRejected) {
        keys.push(`${t.id}_assigned`, String(t.id));
      }
    }
    currentElevatedKeysRef.current = keys;
  }, [allTasks, viewedTaskIds, sessionAcknowledgedTaskIds, isMounted]);

  // Immediately synchronize database notifications upon viewing the tasks page (once per session)
  const syncStorageKey = `student_tasks_notifs_synced_${studentId || "default"}`;
  useEffect(() => {
    if (!isMounted || !studentId || allTasks.length === 0) return;

    try {
      if (sessionStorage.getItem(syncStorageKey) === "true") {
        return;
      }
    } catch {}

    const validTaskIds = allTasks.map((t) => t.id).filter((id) => id > 0);
    const validTitles = allTasks.map((t) => t.title).filter(Boolean);

    if (validTaskIds.length > 0) {
      try {
        sessionStorage.setItem(syncStorageKey, "true");
      } catch {}

      fetch("/api/student/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: validTaskIds,
          taskTitles: validTitles,
          userId: studentId,
        }),
      })
        .then(() => {
          window.dispatchEvent(new Event("notifications_updated"));
        })
        .catch(() => {});
    }
  }, [allTasks, studentId, isMounted, syncStorageKey]);

  // 2. Extract dynamic departments for the filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    allTasks.forEach((t) => set.add(t.department));
    return Array.from(set).sort();
  }, [allTasks]);

  // Determine available statuses within the active department scope (or allTasks)
  const scopedTasks = useMemo(() => {
    if (selectedDepartment === "All") return allTasks;
    return allTasks.filter((t) => t.department === selectedDepartment);
  }, [allTasks, selectedDepartment]);

  const statusOptions = useMemo(() => {
    const options: { key: FilterStatus; label: string }[] = [
      { key: "All", label: "All" },
    ];
    if (scopedTasks.some((t) => t.status === "Returned")) {
      options.push({ key: "Returned", label: "Rejected" });
    }
    if (scopedTasks.some((t) => t.status === "Flagged")) {
      options.push({ key: "Flagged", label: "Flagged" });
    }
    if (
      scopedTasks.some(
        (t) => t.status === "Pending" || t.status === "In Person"
      )
    ) {
      options.push({ key: "Pending", label: "Pending" });
    }
    if (scopedTasks.some((t) => t.status === "Submitted")) {
      options.push({ key: "Submitted", label: "Submitted" });
    }
    if (scopedTasks.some((t) => t.status === "Cleared")) {
      options.push({ key: "Cleared", label: "Cleared" });
    }
    return options;
  }, [scopedTasks]);

  useEffect(() => {
    if (
      selectedStatus !== "All" &&
      !statusOptions.some((opt) => opt.key === selectedStatus)
    ) {
      setSelectedStatus("All");
    }
  }, [statusOptions, selectedStatus]);

  // 4. Dynamic academic subtitle
  const programSubtitle = useMemo(() => {
    if (!studentProfile?.course_name) {
      return "Everything the offices asked you to comply with — submit documents online where allowed, or visit in person.";
    }
    const parts: string[] = [studentProfile.course_name];
    if (studentProfile.year) {
      parts.push(`Year ${studentProfile.year}`);
    }
    if (studentProfile.semester) {
      const semOrdinal =
        studentProfile.semester === 1
          ? "1st"
          : studentProfile.semester === 2
          ? "2nd"
          : `${studentProfile.semester}th`;
      parts.push(`${semOrdinal} Sem`);
    }
    return `Everything required for ${parts.join(
      " · "
    )} — submit documents online where allowed, or visit in person.`;
  }, [studentProfile]);

  // 5. Filter tasks based on search, department, and status, and elevate New Tasks to top
  const filteredTasks = useMemo(() => {
    const list = allTasks.filter((t) => {
      // Search filter
      const matchesSearch =
        searchQuery.trim() === "" ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.staff.toLowerCase().includes(searchQuery.toLowerCase());

      // Department filter
      const matchesDept =
        selectedDepartment === "All" || t.department === selectedDepartment;

      // Status filter
      const matchesStatus =
        selectedStatus === "All" ||
        t.status === selectedStatus ||
        (selectedStatus === "Pending" &&
          (t.status === "Pending" ||
           t.status === "In Person" ||
           t.status === "Returned" ||
           t.status === "Flagged"));

      // Always keep unviewed urgent elevated tasks (Returned or Flagged) visible unless viewing Cleared
      const isUrgentElevated =
        (isTaskReturnedElevated(t) || isTaskFlaggedElevated(t)) &&
        selectedStatus !== "Cleared";

      return matchesSearch && matchesDept && (matchesStatus || isUrgentElevated);
    });

    const elevatedReturned: ClearanceTaskItem[] = [];
    const elevatedFlagged: ClearanceTaskItem[] = [];
    const elevatedNew: ClearanceTaskItem[] = [];
    const regular: ClearanceTaskItem[] = [];

    for (const t of list) {
      if (isTaskReturnedElevated(t)) {
        elevatedReturned.push(t);
      } else if (isTaskFlaggedElevated(t)) {
        elevatedFlagged.push(t);
      } else if (isTaskNewElevated(t)) {
        elevatedNew.push(t);
      } else {
        regular.push(t);
      }
    }

    const sortElevated = (items: ClearanceTaskItem[]) => {
      items.sort((a, b) => {
        const timeA = a.uploadedAt
          ? new Date(a.uploadedAt).getTime()
          : a.assignedAt
          ? new Date(a.assignedAt).getTime()
          : 0;
        const timeB = b.uploadedAt
          ? new Date(b.uploadedAt).getTime()
          : b.assignedAt
          ? new Date(b.assignedAt).getTime()
          : 0;
        if (timeA !== timeB) return timeB - timeA;
        return b.id - a.id;
      });
    };

    if (elevatedReturned.length > 0) {
      sortElevated(elevatedReturned);
    }
    if (elevatedFlagged.length > 0) {
      sortElevated(elevatedFlagged);
    }
    if (elevatedNew.length > 0) {
      sortElevated(elevatedNew);
    }

    return [...elevatedReturned, ...elevatedFlagged, ...elevatedNew, ...regular];
  }, [allTasks, searchQuery, selectedDepartment, selectedStatus, viewedTaskIds, sessionAcknowledgedTaskIds, isMounted]);

  // Set of task IDs currently elevated under "Returned Documents"
  const elevatedReturnedTaskIds = useMemo(() => {
    const set = new Set<number>();
    for (const t of filteredTasks) {
      if (isTaskReturnedElevated(t)) {
        set.add(t.id);
      }
    }
    return set;
  }, [filteredTasks, viewedTaskIds, sessionAcknowledgedTaskIds, isMounted]);

  // Set of task IDs currently elevated under "Flagged Documents"
  const elevatedFlaggedTaskIds = useMemo(() => {
    const set = new Set<number>();
    for (const t of filteredTasks) {
      if (isTaskFlaggedElevated(t)) {
        set.add(t.id);
      }
    }
    return set;
  }, [filteredTasks, viewedTaskIds, sessionAcknowledgedTaskIds, isMounted]);

  // Set of task IDs currently elevated under "New Tasks"
  const elevatedNewTaskIds = useMemo(() => {
    const set = new Set<number>();
    for (const t of filteredTasks) {
      if (isTaskNewElevated(t)) {
        set.add(t.id);
      }
    }
    return set;
  }, [filteredTasks, viewedTaskIds, sessionAcknowledgedTaskIds, isMounted]);

  // Combined set of all elevated task IDs
  const elevatedTaskIds = useMemo(() => {
    const set = new Set<number>();
    for (const id of elevatedReturnedTaskIds) set.add(id);
    for (const id of elevatedFlaggedTaskIds) set.add(id);
    for (const id of elevatedNewTaskIds) set.add(id);
    return set;
  }, [elevatedReturnedTaskIds, elevatedFlaggedTaskIds, elevatedNewTaskIds]);

  // First elevated returned task ID to show the Returned Documents header
  const firstReturnedTaskId = useMemo(() => {
    const first = filteredTasks.find((t) => elevatedReturnedTaskIds.has(t.id));
    return first ? first.id : null;
  }, [filteredTasks, elevatedReturnedTaskIds]);

  // First elevated flagged task ID to show the Flagged Documents header
  const firstFlaggedTaskId = useMemo(() => {
    const first = filteredTasks.find((t) => elevatedFlaggedTaskIds.has(t.id));
    return first ? first.id : null;
  }, [filteredTasks, elevatedFlaggedTaskIds]);

  // First elevated new task ID to show the New Tasks header
  const firstNewTaskId = useMemo(() => {
    const first = filteredTasks.find((t) => elevatedNewTaskIds.has(t.id));
    return first ? first.id : null;
  }, [filteredTasks, elevatedNewTaskIds]);

  // First non-elevated task ID to delineate the separation boundary
  const firstRegularTaskId = useMemo(() => {
    if (elevatedTaskIds.size === 0) return null;
    const firstRegular = filteredTasks.find((t) => !elevatedTaskIds.has(t.id));
    return firstRegular ? firstRegular.id : null;
  }, [filteredTasks, elevatedTaskIds]);

  // ── Deep-Link URL & Event Navigation (e.g. from Notifications) ──
  useEffect(() => {
    if (typeof window === "undefined" || allTasks.length === 0) return;

    const checkUrlTask = () => {
      let targetTaskId: string | null = null;
      let targetTaskTitle: string | null = null;
      let targetUrl: string | null = null;

      // 1. Check for pending task handed off from notification click on another page
      try {
        const pendingStr = sessionStorage.getItem("pending_open_task");
        if (pendingStr) {
          sessionStorage.removeItem("pending_open_task");
          const parsed = JSON.parse(pendingStr);
          targetTaskId = parsed.taskId ? String(parsed.taskId) : null;
          targetTaskTitle = parsed.taskTitle ? String(parsed.taskTitle) : null;
          targetUrl = parsed.url || null;
        }
      } catch {}

      // 2. Fall back to current URL search params
      if (!targetTaskId && !targetTaskTitle) {
        const params = new URLSearchParams(window.location.search);
        targetTaskId = params.get("taskId");
        targetTaskTitle = params.get("taskTitle");
      }

      if (!targetTaskId && !targetTaskTitle) return;

      let matched: ClearanceTaskItem | undefined = undefined;
      if (targetTaskId) {
        matched = allTasks.find((t) => String(t.id) === String(targetTaskId));
      }
      if (!matched && targetTaskTitle) {
        const decoded = decodeURIComponent(targetTaskTitle).toLowerCase().trim();
        matched = allTasks.find(
          (t) => t.title.toLowerCase().trim() === decoded
        );
      }

      if (matched) {
        if (selectedDepartment !== "All" && selectedDepartment !== matched.department) {
          setSelectedDepartment("All");
        }
        if (selectedStatus !== "All" && selectedStatus !== matched.status) {
          setSelectedStatus("All");
        }
        markTaskViewed(
          matched.id,
          matched.rawStatus || matched.status,
          matched.uploadedAt,
          matched.comments
        );
        setActiveTaskId(matched.id);

        if (targetUrl) {
          window.history.replaceState({}, "", targetUrl);
        }
      }
    };

    checkUrlTask();

    const handleCustomOpen = (e: any) => {
      const { taskId, taskTitle } = e.detail || {};
      let matched: ClearanceTaskItem | undefined = undefined;
      if (taskId) {
        matched = allTasks.find((t) => String(t.id) === String(taskId));
      }
      if (!matched && taskTitle) {
        const decoded = String(taskTitle).toLowerCase().trim();
        matched = allTasks.find(
          (t) => t.title.toLowerCase().trim() === decoded
        );
      }
      if (matched) {
        if (selectedDepartment !== "All" && selectedDepartment !== matched.department) {
          setSelectedDepartment("All");
        }
        if (selectedStatus !== "All" && selectedStatus !== matched.status) {
          setSelectedStatus("All");
        }
        markTaskViewed(
          matched.id,
          matched.rawStatus || matched.status,
          matched.uploadedAt,
          matched.comments
        );
        setActiveTaskId(matched.id);
      }
    };

    window.addEventListener("popstate", checkUrlTask);
    window.addEventListener("open_task_modal", handleCustomOpen);

    return () => {
      window.removeEventListener("popstate", checkUrlTask);
      window.removeEventListener("open_task_modal", handleCustomOpen);
    };
  }, [allTasks, selectedDepartment, selectedStatus]);

  const handleTaskClick = (t: ClearanceTaskItem) => {
    markTaskViewed(t.id, t.rawStatus || t.status, t.uploadedAt, t.comments);
    setActiveTaskId(t.id);
  };

  const handleCloseModal = () => {
    setActiveTaskId(null);
    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has("taskId") || params.has("taskTitle")) {
        params.delete("taskId");
        params.delete("taskTitle");
        const newQuery = params.toString();
        const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "");
        window.history.replaceState({}, "", newUrl);
      }
    }
  };

  const currentTaskIndex = useMemo(() => {
    if (activeTaskId === null) return -1;
    return filteredTasks.findIndex((t) => String(t.id) === String(activeTaskId));
  }, [filteredTasks, activeTaskId]);

  const activeTaskItem = useMemo(() => {
    if (currentTaskIndex !== -1) return filteredTasks[currentTaskIndex];
    if (activeTaskId !== null) {
      return allTasks.find((t) => String(t.id) === String(activeTaskId)) || null;
    }
    return null;
  }, [filteredTasks, currentTaskIndex, activeTaskId, allTasks]);

  const hasPrevTask = currentTaskIndex > 0;
  const hasNextTask =
    currentTaskIndex >= 0 && currentTaskIndex < filteredTasks.length - 1;

  const handlePrevTask = () => {
    if (hasPrevTask) {
      const prevTask = filteredTasks[currentTaskIndex - 1];
      if (prevTask) {
        markTaskViewed(
          prevTask.id,
          prevTask.rawStatus || prevTask.status,
          prevTask.uploadedAt,
          prevTask.comments
        );
      }
      setActiveTaskId(filteredTasks[currentTaskIndex - 1].id);
    }
  };

  const handleNextTask = () => {
    if (hasNextTask) {
      const nextTask = filteredTasks[currentTaskIndex + 1];
      if (nextTask) {
        markTaskViewed(
          nextTask.id,
          nextTask.rawStatus || nextTask.status,
          nextTask.uploadedAt,
          nextTask.comments
        );
      }
      setActiveTaskId(filteredTasks[currentTaskIndex + 1].id);
    }
  };

  const modalTask: ModalTaskData | null = useMemo(() => {
    if (!activeTaskItem) return null;
    const isReturned =
      activeTaskItem.rawStatus?.toLowerCase() === "rejected" ||
      activeTaskItem.rawStatus?.toLowerCase() === "returned" ||
      activeTaskItem.status === "Returned" ||
      activeTaskItem.status === "Rejected";

    const isSubmittedStatus =
      activeTaskItem.status === "Submitted" ||
      activeTaskItem.status === "For review" ||
      activeTaskItem.rawStatus === "Submitted" ||
      activeTaskItem.rawStatus === "Verified";

    const isAiComment =
      Boolean(activeTaskItem.comments?.startsWith("[AI")) ||
      Boolean(activeTaskItem.comments?.startsWith("Queued for manual")) ||
      Boolean(activeTaskItem.comments?.startsWith("Submitted for manual"));

    return {
      id: activeTaskItem.id,
      title: activeTaskItem.title,
      description: activeTaskItem.description || "Clearance requirement.",
      status: isReturned
        ? "Rejected"
        : activeTaskItem.rawStatus === "Flagged" && !activeTaskItem.hasAppeal
        ? "Flagged"
        : activeTaskItem.status,
      isInPerson: Boolean(activeTaskItem.isInPerson),
      due_date: activeTaskItem.rawDueDate,
      assigned_at: activeTaskItem.assignedAt,
      comments: isSubmittedStatus || isAiComment ? null : activeTaskItem.comments,
      ai_audit_report: activeTaskItem.aiAuditReport,
      files: activeTaskItem.files || [],
    };
  }, [activeTaskItem]);

  const handleSubmissionSuccess = (
    taskId: number,
    uploadedUrl: string,
    fileName: string,
    newStatus: string,
    aiReport?: any
  ) => {
    // Purge previous notification acknowledgment keys for this task so new flags or rejections trigger
    setViewedTaskIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((k) => {
          if (typeof k !== "string") return k !== taskId;
          return (
            !k.startsWith(`${taskId}_rejected`) &&
            !k.startsWith(`${taskId}_flagged`) &&
            k !== `${taskId}_rejected` &&
            k !== `${taskId}_flagged` &&
            k !== String(taskId)
          );
        })
      );
      try {
        localStorage.setItem(tasksPageStorageKey, JSON.stringify(Array.from(next)));
        window.dispatchEvent(new Event("student_tasks_page_viewed_updated"));

        const storedDept = localStorage.getItem(deptStorageKey);
        if (storedDept) {
          const parsedDept = JSON.parse(storedDept);
          const filteredDept = parsedDept.filter((k: string | number) => {
            if (typeof k !== "string") return k !== taskId;
            return (
              !k.startsWith(`${taskId}_rejected`) &&
              !k.startsWith(`${taskId}_flagged`) &&
              k !== `${taskId}_rejected` &&
              k !== `${taskId}_flagged` &&
              k !== String(taskId)
            );
          });
          localStorage.setItem(deptStorageKey, JSON.stringify(filteredDept));
        }
        window.dispatchEvent(new Event("student_tasks_viewed_updated"));
      } catch {}
      return next;
    });

    setSessionAcknowledgedTaskIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((k) => {
          if (typeof k !== "string") return k !== taskId;
          return (
            !k.startsWith(`${taskId}_rejected`) &&
            !k.startsWith(`${taskId}_flagged`) &&
            k !== `${taskId}_rejected` &&
            k !== `${taskId}_flagged` &&
            k !== String(taskId)
          );
        })
      );
      try {
        sessionStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
        localStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    setTasksList((prev) =>
      prev.map((t) => {
        if (t.assigned_task_id === taskId) {
          return {
            ...t,
            status: newStatus,
            dropbox: uploadedUrl,
            uploaded_at: new Date().toISOString(),
            ai_audit_report: aiReport ?? t.ai_audit_report,
            comments: null,
          };
        }
        return t;
      })
    );
  };

  const handleAppealSuccess = (taskId: number, newReport: any) => {
    setTasksList((prev) =>
      prev.map((t) => {
        if (t.assigned_task_id === taskId) {
          return {
            ...t,
            ai_audit_report: newReport,
          };
        }
        return t;
      })
    );
    // Acknowledge all elevated tasks so the appealed task moves down immediately
    acknowledgeAllElevatedTasks();
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Top Header Text ── */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
          Your requirements, all in one place
        </h1>
        <p className="mt-1 text-xs text-slate-400 md:text-sm">
          {programSubtitle}
        </p>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 shadow-2xl backdrop-blur-sm space-y-3">
        {/* Top Row: Search Input + Department Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requirements, offices, or staff..."
              className="w-full rounded-xl border border-slate-800 bg-[#070c18] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/40 transition-colors"
            />
          </div>

          {/* Department Dropdown Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between gap-2.5 shrink-0 rounded-xl border border-slate-800 bg-[#070c18] px-3.5 py-2.5 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer select-none min-w-[170px] sm:min-w-[190px] focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="font-medium truncate">
                    {selectedDepartment === "All"
                      ? "All departments"
                      : selectedDepartment}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-[#070c18] p-1.5 shadow-2xl text-slate-300 backdrop-blur-md z-50 custom-scrollbar"
            >
              <DropdownMenuItem
                onClick={() => {
                  acknowledgeAllElevatedTasks(true);
                  setSelectedDepartment("All");
                }}
                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                  selectedDepartment === "All"
                    ? "bg-amber-500/15 text-amber-300 font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>All departments</span>
                </div>
                {selectedDepartment === "All" && (
                  <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                )}
              </DropdownMenuItem>

              {departmentOptions.map((dept) => {
                const isSelected = selectedDepartment === dept;
                const DeptIcon = getDepartmentIcon(undefined, dept) || Building2;
                return (
                  <DropdownMenuItem
                    key={dept}
                    onClick={() => {
                      acknowledgeAllElevatedTasks(true);
                      setSelectedDepartment(dept);
                    }}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-amber-500/15 text-amber-300 font-semibold"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <DeptIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{dept}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bottom Row: Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {statusOptions.map((st) => {
            const isActive = selectedStatus === st.key;
            return (
              <button
                type="button"
                key={st.key}
                onClick={() => {
                  setSelectedStatus(st.key);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-ui cursor-pointer ${
                  isActive
                    ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                    : "border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Requirements & Tasks List ── */}
      <div className="flex flex-col gap-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((t, index) => {
            const isReturnedElevated = elevatedReturnedTaskIds.has(t.id);
            const isFlaggedElevated = elevatedFlaggedTaskIds.has(t.id);
            const isNewElevated = elevatedNewTaskIds.has(t.id);
            const isElevated = isReturnedElevated || isFlaggedElevated || isNewElevated;

            const showReturnedHeader = t.id === firstReturnedTaskId;
            const showFlaggedHeader = t.id === firstFlaggedTaskId;
            const showNewTasksHeader = t.id === firstNewTaskId;
            const showRegularDivider = t.id === firstRegularTaskId;
            const DeptIcon = getDepartmentIcon(t.iconName, t.department) || Building2;

            const prevTask = index > 0 ? filteredTasks[index - 1] : null;
            const isTransitionToSubmittedOrCleared = Boolean(
              prevTask &&
              isTaskActionable(prevTask) &&
              !isTaskActionable(t)
            );
            const showStatusSeparator =
              isTransitionToSubmittedOrCleared &&
              !showReturnedHeader &&
              !showFlaggedHeader &&
              !showNewTasksHeader &&
              !showRegularDivider;

            return (
              <Fragment key={t.id}>
                {/* ── Horizontal Status Group Separator ── */}
                {showStatusSeparator && (
                  <Separator className="bg-slate-800/80 my-1.5" />
                )}

                {/* ── Returned Documents Header ── */}
                {showReturnedHeader && (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 shadow-sm animate-in ease-out fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                        Returned Documents ({elevatedReturnedTaskIds.size})
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Flagged Documents Header (Early AI Flag) ── */}
                {showFlaggedHeader && (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 shadow-sm animate-in ease-out fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-blue-400" />
                        Flagged Documents ({elevatedFlaggedTaskIds.size})
                      </span>
                    </div>
                    {/* <span className="text-[10px] text-blue-300 font-semibold flex items-center gap-1">
                      Appeal
                      <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    </span> */}
                  </div>
                )}

                {/* ── New Tasks Header ── */}
                {showNewTasksHeader && (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 shadow-sm animate-in ease-out fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        New Tasks ({elevatedNewTaskIds.size})
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Regular Tasks Divider ── */}
                {showRegularDivider && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-xl border border-slate-800 bg-[#070c18] my-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {selectedStatus === "All"
                        ? "All Requirements"
                        : selectedStatus === "Returned"
                        ? "Rejected Requirements"
                        : selectedStatus === "Flagged"
                        ? "Flagged Requirements"
                        : `${selectedStatus} Requirements`}
                    </span>
                    {/* <span className="text-[10px] text-slate-500 font-medium">
                      Standard priority
                    </span> */}
                  </div>
                )}

                {/* Task Item Card */}
                <div
                  key={t.id}
                  onClick={() => handleTaskClick(t)}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:px-5 shadow-sm backdrop-blur-sm transition-ui hover:bg-[#0c1427]/90 cursor-pointer ${
                    isReturnedElevated
                      ? "border-rose-500/40 bg-[#0a101f]/95 ring-1 ring-rose-500/20 hover:border-rose-500/60"
                      : isFlaggedElevated
                      ? "border-blue-500/40 bg-[#0a101f]/95 ring-1 ring-blue-500/20 hover:border-blue-500/60"
                      : isNewElevated
                      ? "border-amber-500/40 bg-[#0a101f]/95 ring-1 ring-amber-500/20 hover:border-amber-500/60"
                      : "border-slate-800/80 bg-[#0a101f]/80 hover:border-slate-700"
                  }`}
                >
                  {/* Left: Department Icon + Info */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-colors relative ${
                        isReturnedElevated
                          ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                          : isFlaggedElevated
                          ? "border-blue-500/40 bg-blue-500/15 text-blue-400"
                          : isNewElevated
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                          : t.status === "Cleared"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : t.status === "Returned"
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                          : t.status === "Flagged"
                          ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                          : t.status === "Submitted" || t.status === "For review"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                          : "border-slate-800 bg-[#070c18] text-slate-400"
                      }`}
                    >
                      <DeptIcon className="h-5 w-5" />
                      {isReturnedElevated ? (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[#070c18]" />
                        </span>
                      ) : isFlaggedElevated ? (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 ring-2 ring-[#070c18]" />
                        </span>
                      ) : isNewElevated ? (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 ring-2 ring-[#070c18]" />
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                          {t.title}
                        </span>
                      </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <span>{t.department}</span>
                      <span className="text-slate-600">—</span>
                      <span>{t.staff}</span>
                      {/* Once in For review or Submitted: remove due date, just display elapsed time */}
                      {t.status === "Submitted" || t.status === "For review" ? (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 font-medium">
                            {formatSubmittedTime(t.uploadedAt)}
                          </span>
                        </>
                      ) : (
                        /* Otherwise (Actionable / Pending / Returned / Flagged / Cleared): display due date indicator */
                        t.rawDueDate ? (
                          <>
                            <span className="text-slate-600">·</span>
                            {t.isOverdue ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                Overdue ({new Date(t.rawDueDate).toLocaleDateString("en-US", { timeZone: APP_TIME_ZONE, month: "short", day: "numeric" })})
                              </span>
                            ) : t.isDueSoon ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                {t.dueDate}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">
                                {t.dueDate}
                              </span>
                            )}
                          </>
                        ) : t.dueDate ? (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-500">No deadline</span>
                          </>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill & Chevron */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      t.status === "Cleared"
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : t.status === "Returned"
                        ? "border border-rose-500/40 bg-rose-500/10 text-rose-400 font-bold"
                        : t.status === "Flagged"
                        ? "border border-blue-500/40 bg-blue-500/10 text-blue-400 font-bold"
                        : t.status === "Submitted" || t.status === "For review"
                        ? "border border-amber-500/40 bg-amber-500/10 text-amber-400 font-medium"
                        : "border border-slate-700/60 bg-slate-800/80 text-slate-300"
                    }`}
                  >
                    {t.status === "Cleared" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : t.status === "Returned" ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : t.status === "Flagged" ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-blue-400" />
                    ) : t.status === "In Person" ? (
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {t.status === "Flagged"
                        ? "Flagged"
                        : t.status === "Returned"
                        ? "Rejected"
                        : t.status === "Submitted"
                        ? "Submitted"
                        : t.status === "For review"
                        ? "For review"
                        : t.status === "In Person"
                        ? "In Person"
                        : t.status}
                    </span>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-ui" />
                </div>
              </div>
            </Fragment>
          );
        })
        ) : (
          <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#0a101f]/40 p-6 text-center">
            <FileText className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-400">
              No requirements match your filters
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search terms or clearing status filters.
            </p>
          </div>
        )}
      </div>

      {/* ── Inspection & Submission Modal (Matching department-overlay.tsx) ── */}
      <RequirementModal
        isOpen={activeTaskId !== null}
        onClose={handleCloseModal}
        task={modalTask}
        deptName={activeTaskItem?.department || "Department"}
        tierNumber={activeTaskItem?.step ?? 1}
        studentId={studentId}
        hasPrevTask={hasPrevTask}
        onPrevTask={handlePrevTask}
        hasNextTask={hasNextTask}
        onNextTask={handleNextTask}
        onSubmissionSuccess={handleSubmissionSuccess}
        onAppealSuccess={handleAppealSuccess}
      />
    </div>
  );
}
