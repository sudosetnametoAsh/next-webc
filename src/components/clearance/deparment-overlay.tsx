"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { getClearanceRecordsPromise } from "@/modules/clearance/application/repository/dashboard-repository";
import {
  CheckCircle2,
  Clock,
  X,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Building2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  Calendar,
  UserCheck,
} from "lucide-react";
import { getDepartmentDetailsPromise } from "@/modules/clearance/application/repository/department-repository";
import RequirementModal, {
  ModalTaskData,
  ModalFileItem,
} from "./requirement-modal";
import { getDepartmentIcon } from "@/lib/department-icons";
import { isTaskViewed, getTaskViewKey } from "@/lib/clearance-logic";

export interface DayScheduleItem {
  key: string;
  name: string;
  shortName: string;
  hours: string;
  isToday: boolean;
  isClosed: boolean;
}

function formatTime12(t?: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr || "00"} ${ampm}`;
}

const getInitials = (name?: string) => {
  if (!name) return "DO";
  const clean = name.replace(/Mrs\.|Mr\.|Ms\.|Dr\./gi, "").trim();
  const parts = clean.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type CustomDaySchedule =
  | string
  | { timeIn?: string | null; timeOut?: string | null; closed?: boolean }
  | null
  | undefined;

type WeeklyScheduleMap = Record<string, CustomDaySchedule>;

function hasValidTime(t?: string | null): boolean {
  return Boolean(t && t.trim() !== "" && t !== "null" && t !== "undefined");
}

function checkHasCustomSchedule(
  customSchedule?: WeeklyScheduleMap | null
): boolean {
  if (!customSchedule || typeof customSchedule !== "object") return false;
  const keys = Object.keys(customSchedule);
  if (keys.length === 0) return false;
  return keys.some((k) => {
    const val = customSchedule[k];
    if (typeof val === "string") {
      const trimmed = val.trim();
      return (
        trimmed.length > 0 &&
        trimmed.toLowerCase() !== "null" &&
        trimmed.toLowerCase() !== "undefined"
      );
    }
    if (val && typeof val === "object") {
      return (
        val.closed === true ||
        (hasValidTime(val.timeIn) && hasValidTime(val.timeOut))
      );
    }
    return false;
  });
}

function getOfficeHoursStatus(
  timeIn?: string | null,
  timeOut?: string | null,
  customWeeklySchedule?: WeeklyScheduleMap | null
): {
  schedule: string;
  isOpen: boolean;
  timeRange: string;
  hasSchedule: boolean;
} {
  const hasBaseSchedule = hasValidTime(timeIn) && hasValidTime(timeOut);
  const hasCustomSchedule = checkHasCustomSchedule(customWeeklySchedule);

  if (!hasBaseSchedule && !hasCustomSchedule) {
    return {
      schedule: "Pending Schedule",
      isOpen: false,
      timeRange: "Hours to be announced",
      hasSchedule: false,
    };
  }

  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const dayKeyMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayKey = dayKeyMap[dayIndex];

  let effectiveIn = hasBaseSchedule ? timeIn : null;
  let effectiveOut = hasBaseSchedule ? timeOut : null;
  let isTodayClosed = dayIndex === 0; // Sun closed by default

  // Saturday default half-day if base times exist
  if (dayIndex === 6 && hasBaseSchedule) {
    effectiveOut = "12:00";
  }

  if (customWeeklySchedule && customWeeklySchedule[todayKey]) {
    const val = customWeeklySchedule[todayKey];
    if (typeof val === "string") {
      if (val.toLowerCase().includes("closed")) {
        isTodayClosed = true;
      }
    } else if (val && typeof val === "object") {
      if (val.closed) {
        isTodayClosed = true;
      } else if (hasValidTime(val.timeIn) && hasValidTime(val.timeOut)) {
        effectiveIn = val.timeIn!;
        effectiveOut = val.timeOut!;
        isTodayClosed = false;
      }
    }
  }

  if (isTodayClosed || !hasValidTime(effectiveIn) || !hasValidTime(effectiveOut)) {
    const nextDayText = dayIndex === 0 ? "Mon" : "tomorrow";
    const nextFormatted = hasValidTime(timeIn) ? formatTime12(timeIn) : "";
    return {
      schedule: nextFormatted ? `Closed · Opens ${nextDayText} ${nextFormatted}` : "Closed",
      isOpen: false,
      timeRange: hasValidTime(timeIn) && hasValidTime(timeOut) ? `${formatTime12(timeIn)} – ${formatTime12(timeOut)}` : "Hours to be announced",
      hasSchedule: true,
    };
  }

  const formattedIn = formatTime12(effectiveIn!);
  const formattedOut = formatTime12(effectiveOut!);
  const timeRange = `${formattedIn} – ${formattedOut}`;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [inH, inM] = effectiveIn!.split(":").map(Number);
  const inMinutes = inH * 60 + (inM || 0);

  const [outH, outM] = effectiveOut!.split(":").map(Number);
  const outMinutes = outH * 60 + (outM || 0);

  if (currentMinutes >= inMinutes && currentMinutes < outMinutes) {
    return {
      schedule: `Open now · Closes ${formattedOut}`,
      isOpen: true,
      timeRange,
      hasSchedule: true,
    };
  } else if (currentMinutes < inMinutes) {
    return {
      schedule: `Closed · Opens at ${formattedIn}`,
      isOpen: false,
      timeRange,
      hasSchedule: true,
    };
  } else {
    const nextDayText = dayIndex === 6 ? "Mon" : "tomorrow";
    return {
      schedule: `Closed · Opens ${nextDayText} ${formattedIn}`,
      isOpen: false,
      timeRange,
      hasSchedule: true,
    };
  }
}

function getWeeklyScheduleList(
  timeIn?: string | null,
  timeOut?: string | null,
  customWeeklySchedule?: WeeklyScheduleMap | null
): { list: DayScheduleItem[]; hasSchedule: boolean } {
  const hasBaseSchedule = hasValidTime(timeIn) && hasValidTime(timeOut);
  const hasCustomSchedule = checkHasCustomSchedule(customWeeklySchedule);

  if (!hasBaseSchedule && !hasCustomSchedule) {
    return { list: [], hasSchedule: false };
  }

  const now = new Date();
  const todayDayIndex = now.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat

  const defaultWeekdayHours = hasBaseSchedule
    ? `${formatTime12(timeIn)} – ${formatTime12(timeOut)}`
    : "Closed";
  const defaultSaturdayHours = hasBaseSchedule
    ? `${formatTime12(timeIn)} – 12:00 PM`
    : "Closed";

  const daysDef = [
    { key: "mon", name: "Monday", shortName: "Mon", dayIndex: 1, defaultHours: defaultWeekdayHours, defaultClosed: !hasBaseSchedule },
    { key: "tue", name: "Tuesday", shortName: "Tue", dayIndex: 2, defaultHours: defaultWeekdayHours, defaultClosed: !hasBaseSchedule },
    { key: "wed", name: "Wednesday", shortName: "Wed", dayIndex: 3, defaultHours: defaultWeekdayHours, defaultClosed: !hasBaseSchedule },
    { key: "thu", name: "Thursday", shortName: "Thu", dayIndex: 4, defaultHours: defaultWeekdayHours, defaultClosed: !hasBaseSchedule },
    { key: "fri", name: "Friday", shortName: "Fri", dayIndex: 5, defaultHours: defaultWeekdayHours, defaultClosed: !hasBaseSchedule },
    { key: "sat", name: "Saturday", shortName: "Sat", dayIndex: 6, defaultHours: defaultSaturdayHours, defaultClosed: !hasBaseSchedule },
    { key: "sun", name: "Sunday", shortName: "Sun", dayIndex: 0, defaultHours: "Closed", defaultClosed: true },
  ];

  const list = daysDef.map((d) => {
    const isToday = todayDayIndex === d.dayIndex;
    let hours = d.defaultHours;
    let isClosed = d.defaultClosed;

    if (customWeeklySchedule && customWeeklySchedule[d.key]) {
      const val = customWeeklySchedule[d.key];
      if (typeof val === "string") {
        hours = val;
        isClosed = val.toLowerCase().includes("closed");
      } else if (val && typeof val === "object") {
        if (val.closed) {
          hours = "Closed";
          isClosed = true;
        } else if (hasValidTime(val.timeIn) && hasValidTime(val.timeOut)) {
          hours = `${formatTime12(val.timeIn!)} – ${formatTime12(val.timeOut!)}`;
          isClosed = false;
        }
      }
    }

    return {
      key: d.key,
      name: d.name,
      shortName: d.shortName,
      hours,
      isToday,
      isClosed,
    };
  });

  return { list, hasSchedule: true };
}

function parseDropboxFiles(
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
    month: "short",
    day: "numeric",
  })}`;
}

// Order hierarchy matching tasks-page.tsx:
// 1. Rejected / Returned
// 2. Flagged
// 3. Pending / In Person
// 4. For review (appealed flagged tasks)
// 5. Submitted / Verified
// 6. Cleared
const getTaskOrderRank = (status: string): number => {
  switch (status) {
    case "Rejected":
    case "Returned":
      return 1;
    case "Flagged":
      return 2;
    case "Pending":
    case "In Person":
      return 3;
    case "For review":
    case "For Review":
      return 4;
    case "Submitted":
    case "Verified":
      return 5;
    case "Cleared":
      return 6;
    default:
      return 7;
  }
};

const isTaskOverdue = (task: { due_date?: string | null; status?: string }) => {
  if (!task.due_date || task.status === "Cleared") return false;
  return new Date(task.due_date).getTime() < Date.now();
};

const isTaskDueSoon = (task: { due_date?: string | null; status?: string }) => {
  if (!task.due_date || task.status === "Cleared") return false;
  const diffMs = new Date(task.due_date).getTime() - Date.now();
  return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
};

export default function DepartmentOverlay({
  selectedRecord,
  departmentTasks,
  setSelectedRecord,
  studentId,
  allRecords = [],
  onSelectDepartment,
  viewedTaskIds,
  onViewTask,
}: {
  selectedRecord: getClearanceRecordsPromise[0];
  departmentTasks: getDepartmentDetailsPromise;
  setSelectedRecord: React.Dispatch<
    React.SetStateAction<getClearanceRecordsPromise[0] | null>
  >;
  studentId: string;
  allRecords?: getClearanceRecordsPromise;
  onSelectDepartment?: (
    record: getClearanceRecordsPromise[0]
  ) => Promise<getDepartmentDetailsPromise | void> | void;
  viewedTaskIds?: Set<string | number>;
  onViewTask?: (
    taskId: number,
    status?: string | null,
    uploadedAt?: string | null,
    comments?: string | null
  ) => void;
}) {
  const [tasks, setTasks] = useState(departmentTasks || []);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [autoOpenTaskMode, setAutoOpenTaskMode] = useState<
    "first" | "last" | null
  >(null);
  const [isNavigatingDept, setIsNavigatingDept] = useState(false);

  useEffect(() => {
    setTasks(departmentTasks || []);
  }, [departmentTasks]);

  const deptName = selectedRecord?.department || "Department";
  const DeptIcon =
    getDepartmentIcon(selectedRecord?.icon_name, deptName) || Building2;
  const tierNumber = selectedRecord?.tier ?? 1;

  const staffName = selectedRecord?.staff || "Department Officer";
  const staffInitials = getInitials(staffName);

  const rawStatus = selectedRecord?.status || "Pending";
  const isCleared = rawStatus === "Cleared" || rawStatus === "Signed";
  const isIncomplete = rawStatus === "Incomplete";
  const deptStatusLabel = isCleared
    ? "Cleared"
    : isIncomplete
    ? "Incomplete"
    : "Pending";

  const location =
    selectedRecord?.floor && selectedRecord?.room
      ? `${selectedRecord.floor} · ${selectedRecord.room}`
      : selectedRecord?.floor ||
        selectedRecord?.room ||
        "Campus Administrative Office";

  const customSchedule =
    (selectedRecord as any)?.weekly_schedule ||
    (selectedRecord as any)?.schedule ||
    null;

  const {
    schedule: hoursStatus,
    isOpen,
    hasSchedule,
  } = getOfficeHoursStatus(
    selectedRecord?.time_in,
    selectedRecord?.time_out,
    customSchedule
  );

  const { list: weeklyScheduleList } = getWeeklyScheduleList(
    selectedRecord?.time_in,
    selectedRecord?.time_out,
    customSchedule
  );

  // Department Navigation Tracking
  const currentDeptIndex = useMemo(() => {
    if (!allRecords || allRecords.length === 0 || !selectedRecord) return -1;
    return allRecords.findIndex(
      (r) =>
        r.clearance_id === selectedRecord.clearance_id ||
        r.department === selectedRecord.department
    );
  }, [allRecords, selectedRecord]);

  const totalDepts = allRecords?.length || 1;
  const currentDeptNumber = currentDeptIndex >= 0 ? currentDeptIndex + 1 : 1;

  const hasPrevDept = currentDeptIndex > 0;
  const hasNextDept =
    currentDeptIndex >= 0 && currentDeptIndex < totalDepts - 1;

  const prevRecord = hasPrevDept ? allRecords[currentDeptIndex - 1] : null;
  const nextRecord = hasNextDept ? allRecords[currentDeptIndex + 1] : null;

  const prevDeptName = prevRecord?.department;
  const nextDeptName = nextRecord?.department;

  // Build requirements list from database tasks
  const tasksToDisplay: ModalTaskData[] = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    return tasks.map((t) => {
      const isRejected =
        t.status?.toLowerCase() === "rejected" ||
        t.status?.toLowerCase() === "returned";

      const isDropboxRequired = Boolean(
        (t.dropbox &&
          t.dropbox.trim() !== "" &&
          t.dropbox.toLowerCase() !== "null" &&
          t.dropbox.toLowerCase() !== "undefined") ||
          isRejected ||
          t.status === "Submitted" ||
          t.status === "Verified" ||
          t.status === "Flagged" ||
          (t.ai_audit_report !== null && t.ai_audit_report !== undefined)
      );

      const files = parseDropboxFiles(t.dropbox, t.uploaded_at);

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

      let taskStatusLabel = "Pending";
      if (isCleared || t.status === "Cleared") {
        taskStatusLabel = "Cleared";
      } else if (isRejected) {
        taskStatusLabel = "Rejected";
      } else if (t.status === "Flagged") {
        taskStatusLabel = hasAppeal ? "For review" : "Flagged";
      } else if (
        t.status === "Submitted" ||
        t.status === "Verified" ||
        t.status === "For review"
      ) {
        taskStatusLabel = "Submitted";
      } else {
        taskStatusLabel = "Pending";
      }

      const isSubmittedStatus =
        taskStatusLabel === "Submitted" ||
        taskStatusLabel === "For review" ||
        t.status === "Submitted" ||
        t.status === "Verified";
      const isAiComment =
        Boolean(t.comments?.startsWith("[AI")) ||
        Boolean(t.comments?.startsWith("Queued for manual")) ||
        Boolean(t.comments?.startsWith("Submitted for manual"));

      return {
        id: t.assigned_task_id,
        title: t.title,
        description: t.description || "Institutional clearance requirement.",
        status: isRejected ? "Rejected" : taskStatusLabel,
        isInPerson: isRejected ? false : !isDropboxRequired,
        due_date: t.due_date,
        assigned_at: t.assigned_at,
        uploaded_at: t.uploaded_at || appealTime,
        comments: isSubmittedStatus || isAiComment ? null : t.comments,
        ai_audit_report: t.ai_audit_report,
        files,
      };
    });
  }, [tasks]);

  // Sort tasks strictly by:
  // 1. Pending (including In person pending)
  // 2. Rejected / Returned
  // 3. Flagged
  // 4. Submitted (Submitted / Verified)
  // 5. Cleared
  // Sub-sorted by due_date ascending, then ID descending
  const sortedTasks = useMemo(() => {
    return [...tasksToDisplay].sort((a, b) => {
      const rankA = getTaskOrderRank(a.status);
      const rankB = getTaskOrderRank(b.status);
      if (rankA !== rankB) return rankA - rankB;

      if (a.due_date && b.due_date) {
        return (
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        );
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return b.id - a.id;
    });
  }, [tasksToDisplay]);

  // Task Navigation Tracking
  const currentTaskIndex = sortedTasks.findIndex(
    (t) => String(t.id) === String(activeTaskId)
  );

  const activeTask = useMemo(() => {
    if (activeTaskId === null) return null;
    const found = sortedTasks.find(
      (t) => String(t.id) === String(activeTaskId)
    );
    if (found) return found;

    // Automatic Fallback when switching departments while modal is open:
    if (sortedTasks.length === 0) return null;
    return autoOpenTaskMode === "last"
      ? sortedTasks[sortedTasks.length - 1]
      : sortedTasks[0];
  }, [sortedTasks, activeTaskId, autoOpenTaskMode]);

  // Synchronize activeTaskId whenever activeTask resolves to a new task (e.g. after department switch)
  useEffect(() => {
    if (
      activeTaskId !== null &&
      activeTask &&
      String(activeTaskId) !== String(activeTask.id)
    ) {
      setActiveTaskId(activeTask.id);
      setAutoOpenTaskMode(null);
    } else if (
      activeTaskId !== null &&
      sortedTasks.length === 0 &&
      !isNavigatingDept
    ) {
      setActiveTaskId(null);
      setAutoOpenTaskMode(null);
    }
  }, [activeTaskId, activeTask, sortedTasks.length, isNavigatingDept]);

  const onViewTaskRef = useRef(onViewTask);
  useEffect(() => {
    onViewTaskRef.current = onViewTask;
  }, [onViewTask]);

  const lastViewedTaskKeyRef = useRef<string | null>(null);

  // Mark task as viewed when inspected in the modal
  useEffect(() => {
    if (activeTaskId !== null && activeTask && activeTask.id) {
      const uploadTime =
        (activeTask as any).uploaded_at || activeTask.files?.[0]?.uploadDate || "";
      const markKey = `${activeTask.id}_${activeTask.status || ""}_${uploadTime}_${
        activeTask.comments || ""
      }`;
      if (lastViewedTaskKeyRef.current === markKey) return;
      lastViewedTaskKeyRef.current = markKey;

      onViewTaskRef.current?.(
        activeTask.id,
        activeTask.status,
        uploadTime,
        activeTask.comments
      );
    }
  }, [activeTaskId, activeTask]);

  const hasPrevTask = currentTaskIndex > 0;
  const hasNextTask =
    currentTaskIndex >= 0 && currentTaskIndex < sortedTasks.length - 1;
  const isFirstTask = currentTaskIndex === 0;
  const isLastTask =
    sortedTasks.length > 0 && currentTaskIndex === sortedTasks.length - 1;

  const handlePrevTask = () => {
    if (hasPrevTask && currentTaskIndex > 0) {
      setActiveTaskId(sortedTasks[currentTaskIndex - 1].id);
    }
  };

  const handleNextTask = () => {
    if (hasNextTask && currentTaskIndex < sortedTasks.length - 1) {
      setActiveTaskId(sortedTasks[currentTaskIndex + 1].id);
    }
  };

  const handlePrevDepartment = async () => {
    if (!hasPrevDept || !prevRecord || isNavigatingDept) return;
    setIsNavigatingDept(true);
    try {
      const fetched = await onSelectDepartment?.(prevRecord);
      if (fetched) setTasks(fetched);
    } catch (err) {
      console.error("Failed to switch department:", err);
    } finally {
      setIsNavigatingDept(false);
    }
  };

  const handleNextDepartment = async () => {
    if (!hasNextDept || !nextRecord || isNavigatingDept) return;
    setIsNavigatingDept(true);
    try {
      const fetched = await onSelectDepartment?.(nextRecord);
      if (fetched) setTasks(fetched);
    } catch (err) {
      console.error("Failed to switch department:", err);
    } finally {
      setIsNavigatingDept(false);
    }
  };

  const handlePrevDeptFromModal = async () => {
    if (!hasPrevDept || !prevRecord || isNavigatingDept) return;
    setIsNavigatingDept(true);
    setAutoOpenTaskMode("last");
    try {
      const fetchedTasks = await onSelectDepartment?.(prevRecord);
      if (fetchedTasks) {
        setTasks(fetchedTasks);
      }
    } catch (err) {
      console.error("Failed to navigate to previous department:", err);
    } finally {
      setIsNavigatingDept(false);
    }
  };

  const handleNextDeptFromModal = async () => {
    if (!hasNextDept || !nextRecord || isNavigatingDept) return;
    setIsNavigatingDept(true);
    setAutoOpenTaskMode("first");
    try {
      const fetchedTasks = await onSelectDepartment?.(nextRecord);
      if (fetchedTasks) {
        setTasks(fetchedTasks);
      }
    } catch (err) {
      console.error("Failed to navigate to next department:", err);
    } finally {
      setIsNavigatingDept(false);
    }
  };

  const handleSubmissionSuccess = (
    taskId: number,
    uploadedUrl: string,
    fileName: string,
    newStatus: string,
    aiReport?: any
  ) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.assigned_task_id === taskId) {
          return {
            ...t,
            status: newStatus,
            dropbox: uploadedUrl,
            uploaded_at: new Date().toISOString(),
            ai_audit_report: aiReport ?? t.ai_audit_report,
          };
        }
        return t;
      })
    );
  };

  const handleAppealSuccess = (taskId: number, newReport: any) => {
    setTasks((prev) =>
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
  };

  if (!selectedRecord) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-transparent transition-opacity font-sans"
      onClick={() => setSelectedRecord(null)}
    >
      {/* Main Drawer/Panel Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-lg flex-col border-l border-portal-border bg-portal-surface shadow-2xl transition-transform duration-200 ease-in-out overflow-hidden"
      >
        {/* Scrollable Content Area */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 p-6 sm:p-7 custom-scrollbar">
          {/* 1. Header Section */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex gap-3.5 items-start">
              {/* Icon Box */}
              <div className="w-11 h-11 rounded-xl border border-portal-accent/30 bg-portal-accent-soft flex items-center justify-center flex-shrink-0 mt-0.5 text-portal-accent">
                <DeptIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h1 className="text-xl font-bold text-portal-foreground tracking-tight">
                    {deptName}
                  </h1>
                  {/* Status Badge */}
                  <span
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
                      isCleared
                        ? "border-portal-success/30 bg-portal-success-soft text-portal-success"
                        : isIncomplete
                        ? "border-portal-warning/40 bg-portal-warning-soft text-portal-warning font-bold"
                        : "border-portal-border bg-portal-inset text-portal-muted"
                    }`}
                  >
                    {isCleared ? (
                      <CheckCircle2 className="w-3 h-3 text-portal-success" />
                    ) : isIncomplete ? (
                      <AlertCircle className="w-3 h-3 text-portal-warning" />
                    ) : (
                      <Clock className="w-3 h-3 text-portal-muted" />
                    )}
                    <span>{deptStatusLabel}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-portal-muted">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasSchedule && isOpen ? "bg-portal-success" : "bg-portal-muted"
                    }`}
                  />
                  <span>{hasSchedule ? hoursStatus : "Pending Schedule"}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="p-1 rounded-md text-portal-muted hover:text-portal-foreground hover:bg-portal-inset transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Divider with balanced top/bottom margin */}
          <hr className="border-portal-border my-7" />

          {/* 2. Staff Responsible Section */}
          <div className="mb-9">
            <h2 className="text-xs font-bold text-portal-muted tracking-widest uppercase mb-3.5">
              Staff
            </h2>

            <div className="bg-portal-inset border border-portal-border rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-portal-accent/30 bg-portal-accent-soft flex items-center justify-center text-portal-accent font-bold text-sm shrink-0">
                {staffInitials}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-portal-foreground font-semibold text-sm truncate">
                  {staffName}
                </span>
                <span className="text-portal-muted text-xs truncate">
                  Clearance Signatory · signs off this step
                </span>
              </div>
            </div>

            {/* Location with balanced breathing room */}
            <div className="flex items-center gap-2 mt-4 text-xs text-portal-muted">
              <MapPin className="w-3.5 h-3.5 text-portal-accent shrink-0" />
              <span>{location}</span>
            </div>
          </div>

          {/* 3. Office Hours Section */}
          <div className="mb-9">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-portal-muted tracking-widest uppercase">
                Office Hours
              </h2>
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  hasSchedule
                    ? isOpen
                      ? "text-portal-success"
                      : "text-portal-muted"
                    : "text-portal-muted font-medium"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                      hasSchedule && isOpen
                      ? "bg-portal-success animate-pulse"
                      : "bg-portal-muted"
                  }`}
                />
                <span>{hasSchedule ? hoursStatus : "Pending Schedule"}</span>
              </div>
            </div>

            {hasSchedule ? (
              <div className="bg-portal-inset border border-portal-border rounded-xl overflow-hidden text-xs">
                {weeklyScheduleList.map((slot, index) => (
                  <div
                    key={slot.key}
                    className={`flex justify-between items-center py-3.5 px-4.5
                      ${index !== weeklyScheduleList.length - 1 ? "border-b border-portal-border" : ""}
                      ${slot.isToday ? "bg-portal-accent-soft text-portal-accent" : "text-portal-foreground"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-medium ${
                          slot.isToday ? "text-portal-accent font-semibold" : "text-portal-foreground"
                        }`}
                      >
                        {slot.name}
                      </span>
                      {slot.isToday && (
                        <span className="bg-portal-accent-soft text-portal-accent text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Today
                        </span>
                      )}
                    </div>
                    <span
                      className={`${slot.isClosed ? "text-portal-muted" : ""} ${
                        slot.isToday ? "font-semibold text-portal-accent" : "text-portal-muted"
                      }`}
                    >
                      {slot.hours}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-portal-inset border border-portal-border rounded-xl p-4 flex items-start gap-3 text-xs text-portal-muted">
                <Clock className="w-4 h-4 text-portal-muted shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-portal-foreground">
                    No designated schedule set
                  </p>
                  <p className="leading-relaxed text-portal-muted">
                    This department has not published specific operating hours
                    yet. Please visit the office at{" "}
                    <strong className="text-portal-foreground">{location}</strong> during
                    regular campus administrative hours.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 4. Requirements Section */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-portal-muted tracking-widest uppercase mb-4">
              Department Requirements ({sortedTasks.length})
            </h2>

            {/* Gap between cards */}
            <div className="flex flex-col gap-3.5">
              {sortedTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-portal-border bg-portal-inset px-4 py-8 text-center text-xs text-portal-muted">
                  No clearance requirements assigned for this department.
                </div>
              ) : (
                sortedTasks.map((req) => {
                const isOverdue = isTaskOverdue(req);
                const isDueSoon = isTaskDueSoon(req);
                const isUrgent = isOverdue || isDueSoon;
                const isForReview =
                  req.status === "For review" || req.status === "Submitted";
                const isRejected =
                  req.status === "Rejected" || req.status === "Returned";
                const isCleared = req.status === "Cleared";
                const isVerified = req.status === "Verified";
                const isFlagged = req.status === "Flagged";
                const isPending = req.status === "Pending";
                const isUnviewed = Boolean(
                  viewedTaskIds &&
                    req.status !== "Cleared" &&
                    req.status !== "Submitted" &&
                    req.status !== "For review" &&
                    !isTaskViewed(
                      req.id,
                      req.status,
                      viewedTaskIds,
                      req.uploaded_at || req.files?.[0]?.uploadDate,
                      req.comments
                    )
                );

                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => {
                      setActiveTaskId(req.id);
                      if (req.id) {
                        onViewTask?.(
                          req.id,
                          req.status,
                          req.uploaded_at || req.files?.[0]?.uploadDate,
                          req.comments
                        );
                      }
                    }}
                    className="relative bg-portal-inset hover:bg-portal-surface transition-colors border border-portal-border rounded-xl p-4 sm:p-4.5 flex items-center justify-between w-full text-left group cursor-pointer"
                  >
                    {/* Unviewed task pulse dot */}
                    {isUnviewed && (
                      <span
                        title="New unviewed requirement"
                        className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-portal-inset animate-pulse z-10"
                      />
                    )}

                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Status Icon matching task-view.tsx */}
                      <div className="flex-shrink-0">
                        {isCleared && (
                          <CheckCircle2 className="w-4 h-4 text-portal-success" />
                        )}
                        {isVerified && (
                          <CheckCircle2 className="w-4 h-4 text-portal-success" />
                        )}
                        {isForReview && (
                          <Clock className="w-4 h-4 text-portal-warning" />
                        )}
                        {isFlagged && (
                          <AlertTriangle className="w-4 h-4 text-portal-info" />
                        )}
                        {isRejected && (
                          <XCircle className="w-4 h-4 text-portal-danger" />
                        )}
                        {isPending &&
                          (req.isInPerson ? (
                            <UserCheck className="w-4 h-4 text-portal-muted" />
                          ) : (
                            <Clock className="w-4 h-4 text-portal-muted" />
                          ))}
                      </div>

                      {/* Title and Calendar Due Indicator */}
                      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        <span
                          className="text-portal-foreground font-semibold text-sm group-hover:text-portal-accent transition-colors truncate block max-w-[170px] sm:max-w-[210px]"
                          title={req.title}
                        >
                          {req.title}
                        </span>

                        {/* Once in For review or Submitted: remove due date, just display elapsed time */}
                        {isForReview && req.uploaded_at ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Clock size={12} className="text-portal-muted shrink-0" />
                            <span className="text-xs text-portal-muted font-medium truncate">
                              {formatSubmittedTime(req.uploaded_at)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Calendar
                              size={12}
                              className={
                                isUrgent
                                  ? "text-portal-danger shrink-0"
                                  : req.due_date
                                  ? "text-portal-muted shrink-0"
                                  : "text-portal-muted shrink-0"
                              }
                            />
                            {req.due_date ? (
                              <span
                                className={`text-xs truncate ${
                                  isUrgent
                                    ? "text-portal-danger font-medium"
                                    : "text-portal-muted"
                                }`}
                              >
                                {isOverdue
                                  ? `Overdue (${formatDate(req.due_date)})`
                                  : isDueSoon
                                  ? `Due Soon (${formatDate(req.due_date)})`
                                  : formatDate(req.due_date)}
                              </span>
                            ) : (
                              <span className="text-xs text-portal-muted truncate">
                                —
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side Status Badge and Chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {isCleared && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-portal-success/30 bg-portal-success-soft text-portal-success">
                          <CheckCircle2 className="w-2.5 h-2.5 text-portal-success" />
                          <span>Cleared</span>
                        </span>
                      )}
                      {isVerified && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-portal-success/30 bg-portal-success-soft text-portal-success">
                          <Sparkles className="w-2.5 h-2.5 text-portal-success" />
                          <span>AI Verified</span>
                        </span>
                      )}
                      {isForReview && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-portal-warning/40 bg-portal-warning-soft text-portal-warning">
                          <Clock className="w-2.5 h-2.5 text-portal-warning" />
                          <span>{req.status === "For review" ? "For review" : "Submitted"}</span>
                        </span>
                      )}
                      {isFlagged && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-bold border-portal-info/40 bg-portal-info-soft text-portal-info">
                          <AlertTriangle className="w-2.5 h-2.5 text-portal-info" />
                          <span>Flagged</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-bold border-portal-danger/40 bg-portal-danger-soft text-portal-danger">
                          <XCircle className="w-2.5 h-2.5 text-portal-danger" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {isPending &&
                        (req.isInPerson ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-portal-border bg-portal-inset text-portal-muted">
                            <UserCheck className="w-2.5 h-2.5 text-portal-muted" />
                            <span>In person</span>
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-portal-border bg-portal-inset text-portal-muted">
                            <Clock className="w-2.5 h-2.5 text-portal-muted" />
                            <span>Pending</span>
                          </span>
                        ))}

                      <ChevronRight className="w-3.5 h-3.5 text-portal-muted group-hover:translate-x-0.5 group-hover:text-portal-accent transition-ui shrink-0" />
                    </div>
                  </button>
                );
              })
            )}
            </div>

            {/* 5. Footer Helper Text with balanced top spacing */}
            {sortedTasks.length > 0 && (
              <p className="mt-6 text-xs text-portal-muted leading-relaxed max-w-[90%]">
                Click a requirement to inspect details, submit documents online, or review clearance status.
              </p>
            )}
          </div>
        </div>

        {/* Sticky Action Footer: Department Navigation */}
        <div className="sticky bottom-0 z-20 border-t border-portal-border bg-portal-surface/95 backdrop-blur-md px-5 py-3.5 w-full shrink-0">
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Previous Department Button with chevron left */}
            <button
              type="button"
              onClick={handlePrevDepartment}
              disabled={!hasPrevDept}
              title={prevDeptName ? `Previous department: ${prevDeptName}` : "First department"}
              aria-label={prevDeptName ? `Previous department: ${prevDeptName}` : "First department"}
              className={`p-2.5 rounded-xl border transition-ui flex items-center justify-center ${
                hasPrevDept
                  ? "border-portal-border bg-portal-inset hover:bg-portal-surface hover:border-portal-border text-portal-muted hover:text-portal-foreground cursor-pointer shadow-xs active:scale-95"
                  : "border-portal-border/40 bg-portal-inset/30 text-portal-muted opacity-40 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4 shrink-0 text-portal-muted" />
            </button>

            {/* Department Index / Phase info in the middle */}
            <div className="flex flex-col items-center justify-center text-center px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-accent">
                Phase {tierNumber}
              </span>
              <span className="text-xs font-medium text-portal-muted">
                {currentDeptNumber} of {totalDepts}
              </span>
            </div>

            {/* Next Department Button with chevron right */}
            <button
              type="button"
              onClick={handleNextDepartment}
              disabled={!hasNextDept}
              title={nextDeptName ? `Next department: ${nextDeptName}` : "Last department"}
              aria-label={nextDeptName ? `Next department: ${nextDeptName}` : "Last department"}
              className={`p-2.5 rounded-xl border transition-ui flex items-center justify-center ${
                hasNextDept
                  ? "border-portal-border bg-portal-inset hover:bg-portal-surface hover:border-portal-border text-portal-muted hover:text-portal-foreground cursor-pointer shadow-xs active:scale-95"
                  : "border-portal-border/40 bg-portal-inset/30 text-portal-muted opacity-40 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-4 h-4 shrink-0 text-portal-muted" />
            </button>
          </div>
        </div>

        {/* Custom scrollbar styling */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: var(--portal-border);
                border-radius: 20px;
                border: 2px solid var(--portal-surface);
              }
            `,
          }}
        />
      </div>

      {/* ── Inspection & Submission Modal (Centered dialog matching task-view.tsx) ── */}
      <RequirementModal
        isOpen={activeTaskId !== null}
        onClose={() => setActiveTaskId(null)}
        task={activeTask}
        deptName={deptName}
        tierNumber={tierNumber}
        studentId={studentId}
        hasPrevTask={hasPrevTask}
        onPrevTask={handlePrevTask}
        hasNextTask={hasNextTask}
        onNextTask={handleNextTask}
        isFirstTask={isFirstTask}
        isLastTask={isLastTask}
        hasPrevDept={hasPrevDept}
        prevDeptName={prevDeptName}
        onPrevDept={handlePrevDeptFromModal}
        hasNextDept={hasNextDept}
        nextDeptName={nextDeptName}
        onNextDept={handleNextDeptFromModal}
        isLoadingDept={isNavigatingDept}
        onSubmissionSuccess={handleSubmissionSuccess}
        onAppealSuccess={handleAppealSuccess}
      />
    </div>
  );
}
