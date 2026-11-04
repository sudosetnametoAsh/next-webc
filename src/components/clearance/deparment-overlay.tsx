"use client";
import { officeStatus, campusClock, hasWeeklySchedule, formatOfficeTime } from "@/lib/weekly-schedule";
import type { WeeklySchedule } from "@/modules/staff/application/repository/schedule-repository";

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

function getOfficeHoursStatus(schedule?: WeeklySchedule | null, earlyOutDate?: string | null) {
  return officeStatus(schedule, earlyOutDate);
}
function getWeeklyScheduleList(schedule?: WeeklySchedule | null): { list: DayScheduleItem[]; hasSchedule: boolean } {
  const today = campusClock().dayKey;
  const days = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];
  return { hasSchedule: hasWeeklySchedule(schedule), list: days.map(([key, name]) => {
    const day = schedule?.[key];
    const isClosed = !day?.active || !day.time_in || !day.time_out;
    return { key, name, shortName: name.slice(0, 3), isToday: key === today, isClosed,
      hours: isClosed ? "Closed" : `${formatOfficeTime(day.time_in)} – ${formatOfficeTime(day.time_out)}` };
  }) };
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

    customSchedule,
    (selectedRecord as any)?.early_out_date
  );

  const { list: weeklyScheduleList } = getWeeklyScheduleList(

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
        className="relative flex h-full w-full max-w-lg flex-col border-l border-[#1f2937] bg-[#0b0e14] shadow-2xl transition-transform duration-200 ease-in-out overflow-hidden"
      >
        {/* Scrollable Content Area */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 p-6 sm:p-7 custom-scrollbar">
          {/* 1. Header Section */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex gap-3.5 items-start">
              {/* Icon Box */}
              <div className="w-11 h-11 rounded-xl border border-[#2d281a] bg-[#1a160c] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#EAB308]">
                <DeptIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {deptName}
                  </h1>
                  {/* Status Badge */}
                  <span
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
                      isCleared
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : isIncomplete
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold"
                        : "border-slate-700/60 bg-slate-800/80 text-slate-300"
                    }`}
                  >
                    {isCleared ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : isIncomplete ? (
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Clock className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{deptStatusLabel}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasSchedule && isOpen ? "bg-emerald-400" : "bg-gray-500"
                    }`}
                  />
                  <span>{hasSchedule ? hoursStatus : "Pending Schedule"}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Divider with balanced top/bottom margin */}
          <hr className="border-[#1f2937] my-7" />

          {/* 2. Staff Responsible Section */}
          <div className="mb-9">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3.5">
              Staff
            </h2>

            <div className="bg-[#131822] border border-[#1f2937] rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-[#423314] bg-[#231a08] flex items-center justify-center text-[#EAB308] font-bold text-sm shrink-0">
                {staffInitials}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-white font-semibold text-sm truncate">
                  {staffName}
                </span>
                <span className="text-gray-400 text-xs truncate">
                  Clearance Signatory · signs off this step
                </span>
              </div>
            </div>

            {/* Location with balanced breathing room */}
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-300">
              <MapPin className="w-3.5 h-3.5 text-[#EAB308] shrink-0" />
              <span>{location}</span>
            </div>
          </div>

          {/* 3. Office Hours Section */}
          <div className="mb-9">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-gray-500 tracking-widest uppercase">
                Office Hours
              </h2>
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  hasSchedule
                    ? isOpen
                      ? "text-emerald-400"
                      : "text-gray-400"
                    : "text-gray-400 font-medium"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasSchedule && isOpen
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-gray-500"
                  }`}
                />
                <span>{hasSchedule ? hoursStatus : "Pending Schedule"}</span>
              </div>
            </div>

            {hasSchedule ? (
              <div className="bg-[#131822] border border-[#1f2937] rounded-xl overflow-hidden text-xs">
                {weeklyScheduleList.map((slot, index) => (
                  <div
                    key={slot.key}
                    className={`flex justify-between items-center py-3.5 px-4.5
                      ${index !== weeklyScheduleList.length - 1 ? "border-b border-[#1f2937]" : ""}
                      ${slot.isToday ? "bg-[#2a2212]/30 text-[#EAB308]" : "text-white"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-medium ${
                          slot.isToday ? "text-[#EAB308] font-semibold" : "text-gray-200"
                        }`}
                      >
                        {slot.name}
                      </span>
                      {slot.isToday && (
                        <span className="bg-[#423314] text-[#EAB308] text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Today
                        </span>
                      )}
                    </div>
                    <span
                      className={`${slot.isClosed ? "text-gray-500" : ""} ${
                        slot.isToday ? "font-semibold text-[#EAB308]" : "text-gray-300"
                      }`}
                    >
                      {slot.hours}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#131822] border border-[#1f2937] rounded-xl p-4 flex items-start gap-3 text-xs text-gray-400">
                <Clock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-gray-200">
                    No designated schedule set
                  </p>
                  <p className="leading-relaxed text-gray-400">
                    This department has not published specific operating hours
                    yet. Please visit the office at{" "}
                    <strong className="text-gray-200">{location}</strong> during
                    regular campus administrative hours.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 4. Requirements Section */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-4">
              Department Requirements ({sortedTasks.length})
            </h2>

            {/* Gap between cards */}
            <div className="flex flex-col gap-3.5">
              {sortedTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1f2937] bg-[#131822]/50 px-4 py-8 text-center text-xs text-gray-500">
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
                    className="relative bg-[#131822] hover:bg-[#1a212f] transition-colors border border-[#1f2937] rounded-xl p-4 sm:p-4.5 flex items-center justify-between w-full text-left group cursor-pointer"
                  >
                    {/* Unviewed task pulse dot */}
                    {isUnviewed && (
                      <span
                        title="New unviewed requirement"
                        className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#131822] animate-pulse z-10"
                      />
                    )}

                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Status Icon matching task-view.tsx */}
                      <div className="flex-shrink-0">
                        {isCleared && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {isVerified && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {isForReview && (
                          <Clock className="w-4 h-4 text-amber-400" />
                        )}
                        {isFlagged && (
                          <AlertTriangle className="w-4 h-4 text-blue-400" />
                        )}
                        {isRejected && (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        {isPending &&
                          (req.isInPerson ? (
                            <UserCheck className="w-4 h-4 text-slate-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400" />
                          ))}
                      </div>

                      {/* Title and Calendar Due Indicator */}
                      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        <span
                          className="text-white font-semibold text-sm group-hover:text-amber-300 transition-colors truncate block max-w-[170px] sm:max-w-[210px]"
                          title={req.title}
                        >
                          {req.title}
                        </span>

                        {/* Once in For review or Submitted: remove due date, just display elapsed time */}
                        {isForReview && req.uploaded_at ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Clock size={12} className="text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-400 font-medium truncate">
                              {formatSubmittedTime(req.uploaded_at)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Calendar
                              size={12}
                              className={
                                isUrgent
                                  ? "text-rose-400 shrink-0"
                                  : req.due_date
                                  ? "text-slate-400 shrink-0"
                                  : "text-slate-500 shrink-0"
                              }
                            />
                            {req.due_date ? (
                              <span
                                className={`text-xs truncate ${
                                  isUrgent
                                    ? "text-rose-400 font-medium"
                                    : "text-slate-400"
                                }`}
                              >
                                {isOverdue
                                  ? `Overdue (${formatDate(req.due_date)})`
                                  : isDueSoon
                                  ? `Due Soon (${formatDate(req.due_date)})`
                                  : formatDate(req.due_date)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 truncate">
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
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Cleared</span>
                        </span>
                      )}
                      {isVerified && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
                          <span>AI Verified</span>
                        </span>
                      )}
                      {isForReview && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-amber-500/40 bg-amber-500/10 text-amber-400">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          <span>{req.status === "For review" ? "For review" : "Submitted"}</span>
                        </span>
                      )}
                      {isFlagged && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-bold border-blue-500/40 bg-blue-500/10 text-blue-300">
                          <AlertTriangle className="w-2.5 h-2.5 text-blue-400" />
                          <span>Flagged</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-bold border-rose-500/40 bg-rose-500/10 text-rose-400">
                          <XCircle className="w-2.5 h-2.5 text-rose-400" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {isPending &&
                        (req.isInPerson ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-slate-700/60 bg-slate-800/80 text-slate-300">
                            <UserCheck className="w-2.5 h-2.5 text-slate-400" />
                            <span>In person</span>
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border font-medium border-slate-700/60 bg-slate-800/80 text-slate-300">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span>Pending</span>
                          </span>
                        ))}

                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-amber-300 transition-ui shrink-0" />
                    </div>
                  </button>
                );
              })
            )}
            </div>

            {/* 5. Footer Helper Text with balanced top spacing */}
            {sortedTasks.length > 0 && (
              <p className="mt-6 text-xs text-gray-500 leading-relaxed max-w-[90%]">
                Click a requirement to inspect details, submit documents online, or review clearance status.
              </p>
            )}
          </div>
        </div>

        {/* Sticky Action Footer: Department Navigation */}
        <div className="sticky bottom-0 z-20 border-t border-[#1f2937] bg-[#0b0e14]/95 backdrop-blur-md px-5 py-3.5 w-full shrink-0">
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
                  ? "border-slate-800 bg-[#131822] hover:bg-[#1a212f] hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer shadow-xs active:scale-95"
                  : "border-slate-800/40 bg-slate-900/30 text-slate-600 opacity-40 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
            </button>

            {/* Department Index / Phase info in the middle */}
            <div className="flex flex-col items-center justify-center text-center px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Phase {tierNumber}
              </span>
              <span className="text-xs font-medium text-slate-400">
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
                  ? "border-slate-800 bg-[#131822] hover:bg-[#1a212f] hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer shadow-xs active:scale-95"
                  : "border-slate-800/40 bg-slate-900/30 text-slate-600 opacity-40 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
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
                background-color: #374151;
                border-radius: 20px;
                border: 2px solid #0b0e14;
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
