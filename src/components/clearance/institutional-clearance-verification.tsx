"use client";

import { APP_TIME_ZONE } from "@/lib/date-time";

import { officeStatus } from "@/lib/weekly-schedule";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getClearanceRecordsPromise,
  getOfficeHoursPromise,
  getStudentProfilePromise,
  getSummaryPromise,
  getDepartmentDetailsPromise,
} from "@/modules/clearance/application/repository/dashboard-repository";
import DepartmentOverlay from "./deparment-overlay";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  GraduationCap,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { getDepartmentIcon } from "@/lib/department-icons";
import {
  getTaskViewKey,
  isTaskViewed,
  normalizeTimestamp,
  isTaskNotificationAcknowledged,
  markTaskNotificationAcknowledged,
} from "@/lib/clearance-logic";
import { useClearanceData } from "@/hooks/clearance/use-clearance-data";

interface InstitutionalClearanceVerificationProps {
  summary?: getSummaryPromise;
  records?: getClearanceRecordsPromise;
  officeHours?: getOfficeHoursPromise;
  studentProfile?: getStudentProfilePromise | null;
  initialTasks?: getDepartmentDetailsPromise;
  studentId?: string;
}

const INSTITUTIONAL_PRIORITY: Record<string, number> = {
  Cashier: 1,
  Clinic: 2,
  "Computer Laboratory": 2,
  "Guidance Office": 2,
  Library: 2,
  Registrar: 3,
};

function getOfficeHoursStatus(
  weeklySchedule?: Record<string, { active: boolean; time_in: string; time_out: string }> | null,
  earlyOutDate?: string | null,
) {
  const status = officeStatus(weeklySchedule, earlyOutDate);
  return { ...status, statusText: status.schedule, isOpenNow: status.isOpen };
}
export default function InstitutionalClearanceVerification({
  summary: propSummary,
  records: propRecords,
  officeHours: propOfficeHours = [],
  studentProfile: propStudentProfile,
  initialTasks: propInitialTasks = [],
  studentId = "",
}: InstitutionalClearanceVerificationProps) {
  const {
    summary,
    records,
    officeHours,
    studentProfile,
    tasks: liveTasks,
  } = useClearanceData(studentId, {
    initialData: {
      summary: propSummary,
      records: propRecords,
      officeHours: propOfficeHours,
      studentProfile: propStudentProfile,
      tasks: propInitialTasks,
    },
  });

  const [selectedRecord, setSelectedRecord] = useState<
    getClearanceRecordsPromise[0] | null
  >(null);
  const [todayStr, setTodayStr] = useState("Fri, Oct 16");
  const [officeHoursPage, setOfficeHoursPage] = useState(0);
  const [pipelinePage, setPipelinePage] = useState(0);
  const [departmentsPerPage, setDepartmentsPerPage] = useState(3);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setDepartmentsPerPage(desktop.matches ? 6 : 3);
      setPipelinePage(0);
    };
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);
  const DEPARTMENTS_PER_PAGE = departmentsPerPage;
  const OFFICE_HOURS_PER_PAGE = 6;

  const allTasks = useMemo<getDepartmentDetailsPromise>(() => {
    return liveTasks;
  }, [liveTasks]);

  const departmentTasks = useMemo<getDepartmentDetailsPromise>(() => {
    if (!selectedRecord || !allTasks) return [];
    return allTasks.filter(
      (t) =>
        (t.clearance_id && t.clearance_id === selectedRecord.clearance_id) ||
        (t.department &&
          t.department.toLowerCase() ===
            selectedRecord.department.toLowerCase())
    );
  }, [allTasks, selectedRecord?.clearance_id, selectedRecord?.department]);

  useEffect(() => {
    if (selectedRecord && records) {
      const updated = records.find(
        (r) => r.clearance_id === selectedRecord.clearance_id
      );
      if (updated) {
        setSelectedRecord(updated);
      }
    }
  }, [records]);

  const [isMounted, setIsMounted] = useState(false);
  const storageKey = `student_viewed_tasks_${studentId || "default"}`;
  const tasksPageStorageKey = `student_tasks_page_viewed_${studentId || "default"}`;
  const [viewedTaskIds, setViewedTaskIds] = useState<Set<string | number>>(new Set());

  const getCombinedViewed = useCallback(() => {
    try {
      const storedDept = localStorage.getItem(storageKey);
      const storedPage = localStorage.getItem(tasksPageStorageKey);
      const combined = new Set<string | number>([
        ...(storedDept ? JSON.parse(storedDept) : []),
        ...(storedPage ? JSON.parse(storedPage) : []),
      ]);
      return combined;
    } catch {
      return new Set<string | number>();
    }
  }, [storageKey, tasksPageStorageKey]);

  useEffect(() => {
    setIsMounted(true);
    setViewedTaskIds(getCombinedViewed());
  }, [studentId, getCombinedViewed]);

  useEffect(() => {
    const handleUpdate = () => {
      setViewedTaskIds(getCombinedViewed());
    };
    window.addEventListener("student_tasks_viewed_updated", handleUpdate);
    window.addEventListener("student_tasks_page_viewed_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("student_tasks_viewed_updated", handleUpdate);
      window.removeEventListener("student_tasks_page_viewed_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [getCombinedViewed]);

  const handleViewTask = useCallback(
    (
      taskId: number,
      status?: string | null,
      uploadedAt?: string | null,
      comments?: string | null
    ) => {
      if (!taskId) return;
      const task = allTasks.find((t) => t.assigned_task_id === taskId);
      const resolvedStatus = status || task?.status;
      const resolvedUploadedAt =
        uploadedAt !== undefined ? uploadedAt : task?.uploaded_at;
      const resolvedComments =
        comments !== undefined ? comments : task?.comments;

      const fullKey = getTaskViewKey(
        taskId,
        resolvedStatus,
        resolvedUploadedAt,
        resolvedComments
      );
      const normalized = (resolvedStatus || "").toLowerCase();
      const isFlagged = normalized === "flagged";
      const isRejected = normalized === "rejected" || normalized === "returned";
      const cleanUpload = normalizeTimestamp(resolvedUploadedAt);

      let existingDept: (string | number)[] = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) existingDept = JSON.parse(stored);
      } catch {}
      const deptSet = new Set(existingDept);
      const hasFull = deptSet.has(fullKey);
      const hasBase = isFlagged
        ? deptSet.has(`${taskId}_flagged`)
        : isRejected
        ? deptSet.has(`${taskId}_rejected`)
        : deptSet.has(`${taskId}_assigned`);

      if (!hasFull || !hasBase) {
        deptSet.add(fullKey);
        if (isFlagged) {
          if (cleanUpload) deptSet.add(`${taskId}_flagged_${cleanUpload}`);
          deptSet.add(`${taskId}_flagged`);
        } else if (isRejected) {
          if (cleanUpload) deptSet.add(`${taskId}_rejected_${cleanUpload}`);
          deptSet.add(`${taskId}_rejected`);
        } else {
          deptSet.add(`${taskId}_assigned`);
          deptSet.add(taskId);
          deptSet.add(String(taskId));
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(deptSet)));
          window.dispatchEvent(new Event("student_tasks_viewed_updated"));
        } catch {}

        if (studentId && taskId && !isTaskNotificationAcknowledged(studentId, taskId)) {
          markTaskNotificationAcknowledged(studentId, taskId);
          try {
            fetch("/api/student/notifications", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskId,
                taskTitle: task?.title,
                userId: studentId,
              }),
            })
              .then(() => {
                window.dispatchEvent(new Event("notifications_updated"));
              })
              .catch(() => {});
          } catch {}
        }

        setViewedTaskIds(getCombinedViewed());
      }
    },
    [allTasks, storageKey, getCombinedViewed]
  );

  const getDeptUnviewedTasks = (
    record: getClearanceRecordsPromise[0]
  ) => {
    if (record.status === "Cleared" || record.status === "Signed") {
      return [];
    }

    const deptTasks = allTasks.filter(
      (t) =>
        (t.clearance_id && t.clearance_id === record.clearance_id) ||
        (t.department &&
          t.department.toLowerCase() === record.department.toLowerCase())
    );

    if (deptTasks.length > 0) {
      return deptTasks.filter(
        (t) =>
          t.status !== "Cleared" &&
          t.status !== "Submitted" &&
          !isTaskViewed(
            t.assigned_task_id,
            t.status,
            viewedTaskIds,
            t.uploaded_at,
            t.comments
          )
      );
    }

    return [];
  };

  const getDeptUnviewedTasksCount = (
    record: getClearanceRecordsPromise[0]
  ): number => {
    return getDeptUnviewedTasks(record).length;
  };

  useEffect(() => {
    const now = new Date();
    setTodayStr(
      now.toLocaleDateString("en-US", {
        timeZone: APP_TIME_ZONE,
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    );
  }, []);

  const handleDepartmentClick = async (
    record: getClearanceRecordsPromise[0],
  ): Promise<getDepartmentDetailsPromise> => {
    setSelectedRecord(record);
    const existing = allTasks.filter(
      (t) =>
        (t.clearance_id && t.clearance_id === record.clearance_id) ||
        (t.department &&
          t.department.toLowerCase() === record.department.toLowerCase())
    );
    return existing;
  };

  const effectiveRecords = records || [];
  const effectiveSummary = summary || {
    department_count: effectiveRecords.length,
    cleared_department: effectiveRecords.filter(
      (r) => r.status === "Cleared" || r.status === "Signed",
    ).length,
    remaining_department: effectiveRecords.filter(
      (r) => r.status !== "Cleared" && r.status !== "Signed",
    ).length,
    signed: effectiveRecords.filter((r) => r.status === "Signed").length,
    incomplete: effectiveRecords.filter((r) => r.status === "Incomplete")
      .length,
    pending: effectiveRecords.filter((r) => r.status === "Pending").length,
  };

  // Sort records by Phase / Tier priority, then alphabetically by department
  const sortedRecords = [...effectiveRecords].sort((a, b) => {
    const tierA = a.tier ?? INSTITUTIONAL_PRIORITY[a.department] ?? 50;
    const tierB = b.tier ?? INSTITUTIONAL_PRIORITY[b.department] ?? 50;
    if (tierA !== tierB) return tierA - tierB;
    return a.department.localeCompare(b.department);
  });

  const totalPipelinePages = Math.ceil(sortedRecords.length / DEPARTMENTS_PER_PAGE);
  const currentPipelinePage = Math.min(
    pipelinePage,
    Math.max(0, totalPipelinePages - 1),
  );
  const pagedRecords = sortedRecords.slice(
    currentPipelinePage * DEPARTMENTS_PER_PAGE,
    (currentPipelinePage + 1) * DEPARTMENTS_PER_PAGE,
  );

  const totalCount =
    effectiveSummary.department_count || sortedRecords.length || 0;
  const clearedCount =
    effectiveSummary.cleared_department ??
    sortedRecords.filter(
      (r) => r.status === "Cleared" || r.status === "Signed",
    ).length;
  const remainingCount = Math.max(0, totalCount - clearedCount);
  const percentage =
    totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0;

  const isFullyCleared = totalCount > 0 && clearedCount === totalCount;

  // Identify lowest uncompleted tier (the active phase)
  const uncompletedRecords = sortedRecords.filter(
    (r) => r.status !== "Cleared" && r.status !== "Signed",
  );
  const activePhaseTier =
    uncompletedRecords.length > 0
      ? Math.min(
          ...uncompletedRecords.map(
            (r) => r.tier ?? INSTITUTIONAL_PRIORITY[r.department] ?? 1,
          ),
        )
      : 1;

  // Active records within this active phase
  const activePhaseRecords = uncompletedRecords.filter(
    (r) =>
      (r.tier ?? INSTITUTIONAL_PRIORITY[r.department] ?? 1) === activePhaseTier,
  );
  const nextStepRecord = activePhaseRecords[0] || null;

  // Office hours list for the right sidebar
  const officeHoursList =
    officeHours && officeHours.length > 0
      ? officeHours
      : sortedRecords.map((r) => ({
          dept_id: r.clearance_id,
          dept_name: r.department,
          staff_name: r.staff,

          floor: r.floor,
          room: r.room,
          icon_name: r.icon_name,
          weekly_schedule: (r as any).weekly_schedule || null,
          early_out_date: (r as any).early_out_date || null,
        }));

  const openOfficesCount = officeHoursList.filter(
    (o) => getOfficeHoursStatus(o.weekly_schedule, o.early_out_date).isOpen,
  ).length;

  const totalOfficeHoursPages = Math.ceil(
    officeHoursList.length / OFFICE_HOURS_PER_PAGE,
  );
  const pagedOfficeHoursList =
    totalOfficeHoursPages > 1
      ? officeHoursList.slice(
          officeHoursPage * OFFICE_HOURS_PER_PAGE,
          (officeHoursPage + 1) * OFFICE_HOURS_PER_PAGE,
        )
      : officeHoursList;

  // Description for next step card
  const getNextStepDescription = () => {
    if (isFullyCleared) {
      return "All institutional endorsements completed. Proceed to release.";
    }
    if (!nextStepRecord) {
      return "Requirements submitted. Awaiting officer review and endorsement.";
    }
    if (
      nextStepRecord.status === "Submitted" ||
      nextStepRecord.status === "Flagged" ||
      nextStepRecord.status === "Verified"
    ) {
      return "Requirements submitted. Awaiting officer review and endorsement.";
    }
    if (
      nextStepRecord.task_count > 0 &&
      nextStepRecord.cleared_task < nextStepRecord.task_count
    ) {
      return "Clearance tasks required. Complete and submit requirements for department review.";
    }
    return `Phase ${activePhaseTier} active. Awaiting officer evaluation and sign-off endorsement.`;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
      {/* ── 4-Component Balanced Grid (Even Square / 2x2 Layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
        {/* ── LEFT COLUMN: Verification + How To Comply ── */}
        <div className="min-w-0 lg:col-span-8 flex flex-col gap-5">
          {/* 1. Institutional Clearance Verification */}
          <section className="w-full lg:flex-1 rounded-2xl border border-slate-800/80 bg-[#0a101f]/80 p-6 md:p-7 shadow-2xl backdrop-blur-sm space-y-6">
            {/* ── 1. Top Header Row ── */}
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0 md:gap-x-4">
                {/* Amber Graduation Cap Icon */}
                <div className="col-[1/2] row-[1/2] md:row-[1/3] flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 shadow-inner md:h-12 md:w-12">
                  <GraduationCap className="h-5 w-5 md:h-6 md:w-6" />
                </div>

                    <h1 className="col-[2/4] row-[1/2] md:col-[2/3] min-w-0 text-base font-bold leading-snug tracking-tight text-white sm:text-lg md:text-2xl">
                      Campus Clearance Overview
                    </h1>
                  <p className="col-[2/3] row-[2/3] min-w-0 text-[11px] leading-relaxed text-slate-400 sm:text-xs md:mt-1 md:text-sm">
                    {[
                      studentProfile?.semester != null ? `Term ${studentProfile.semester}` : null,
                      studentProfile?.academic_year ? `AY ${studentProfile.academic_year}` : null,
                    ].filter(Boolean).join(" · ") || "No current academic period"}
                  </p>

              {/* Dynamic Status Pill */}
              <div
                className={`col-[3/4] row-[2/3] md:row-[1/3] flex items-center justify-self-end gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold sm:gap-1.5 sm:px-2.5 sm:text-[11px] md:gap-2 md:px-3.5 md:py-1.5 md:text-xs ${
                  isFullyCleared
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
              >
                {isFullyCleared ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                <span>
                  {clearedCount} of {totalCount}<span className="hidden sm:inline"> Offices</span> Cleared
                </span>
              </div>
            </div>

            {/* ── 2. Middle Row: Progress & Next Step Callout ── */}
            <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
              {/* Clearance Progress Card */}
              <div className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-800/80 bg-[#070c18]/90 p-4 md:p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Clearance Progress
                  </span>
                  <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                    {percentage}%
                  </span>
                </div>

                {/* Dual-Tone Track & Amber Bar */}
                <div className="my-3 h-2 md:my-3.5 md:h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                  <div
                    className="h-full rounded-full bg-[#F59E0B] w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none shadow-sm shadow-amber-500/30"
                    style={{ transform: `scaleX(${(percentage) / 100})` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {remainingCount}{" "}
                    {remainingCount === 1 ? "endorsement" : "endorsements"}{" "}
                    remaining
                  </span>
                  <span className="font-semibold text-slate-400">
                    {clearedCount}/{totalCount}
                  </span>
                </div>
              </div>

              {/* Next Step Alert Card */}
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 dark:border-amber-600/35 bg-gradient-to-r from-portal-accent-soft via-portal-accent-soft/60 to-transparent dark:from-amber-950/30 dark:via-amber-950/15 p-4 md:p-5 md:gap-4 md:flex-nowrap shadow-sm">
                <div className="flex min-w-0 flex-1 items-start gap-2 md:gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 md:h-5 md:w-5 shrink-0 text-amber-500 dark:text-amber-400" />
                  <div className="flex min-w-0 flex-col break-words">
                    <span className="text-[13px] md:text-sm font-bold text-white">
                      {isFullyCleared
                        ? "Clearance Complete"
                        : `Phase ${activePhaseTier} Active: ${
                            nextStepRecord?.department || "Pending"
                          }`}
                    </span>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/80">
                      {getNextStepDescription()}
                    </p>
                  </div>
                </div>

                {!isFullyCleared && nextStepRecord && (
                  <button
                    type="button"
                    onClick={() => handleDepartmentClick(nextStepRecord)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-[11px] md:px-3.5 md:py-1.5 md:text-xs font-bold text-amber-300 shadow-sm transition-colors hover:bg-amber-500/30 cursor-pointer"
                  >
                    Phase {activePhaseTier} →
                  </button>
                )}
              </div>
            </div>

            {/* ── 3. Bottom Row: Sequential Sign-Off Pipeline ── */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Sequential Sign-Off Pipeline
                </span>
                <span className="hidden text-xs text-slate-500 sm:inline">
                  Click a department to view requirements &amp; office details
                </span>
              </div>

              {/* Mobile shows three departments in one column; desktop shows six in three columns. */}
              {sortedRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-[#070c18]/60">
                  <AlertCircle className="h-8 w-8 text-amber-400 mb-2.5" />
                  <span className="text-sm font-bold text-white">
                    No Clearance Template Assigned
                  </span>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    You currently have no clearance records assigned. Please check
                    back later or consult the Registrar.
                  </p>
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-1 md:grid-cols-3 gap-3">
                  {pagedRecords.map((record, idx) => {
                    const itemTier =
                      record.tier ??
                      INSTITUTIONAL_PRIORITY[record.department] ??
                      currentPipelinePage * DEPARTMENTS_PER_PAGE + idx + 1;
                    const isCleared =
                      record.status === "Cleared" || record.status === "Signed";
                    const isActive = !isCleared && itemTier === activePhaseTier;
                    const isFuture = !isCleared && itemTier > activePhaseTier;
                    const unviewedTasks = isMounted
                      ? getDeptUnviewedTasks(record)
                      : [];
                    const unviewedCount = unviewedTasks.length;
                    const hasReturnedTasks = isMounted && unviewedTasks.some(
                      (t) => t.status === "Rejected" || t.status === "Returned"
                    );

                    const DeptIcon = getDepartmentIcon(
                      record.icon_name,
                      record.department,
                    );

                    // Card container styling
                    let cardClasses =
                      "group relative flex min-w-0 min-h-[140px] flex-col justify-between rounded-xl p-3.5 sm:p-4 transition-ui text-left cursor-pointer hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-500/40";
                    let badgeClasses =
                      "rounded-md px-2 py-0.5 text-[10px] font-bold border transition-colors";
                    let statusTextClass = "text-xs font-semibold";
                    let statusLabel = record.status || "Pending";

                    if (isCleared) {
                      cardClasses +=
                        " border border-emerald-500/25 bg-[#061817]/40 text-emerald-400 hover:border-emerald-500/50 hover:bg-[#061817]/60";
                      badgeClasses +=
                        " bg-emerald-950/60 border-emerald-500/30 text-emerald-400";
                      statusTextClass += " text-emerald-400";
                      statusLabel = "Cleared";
                    } else if (hasReturnedTasks) {
                      cardClasses +=
                        " border-2 border-rose-500/80 bg-rose-950/20 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/40 hover:border-rose-400 hover:bg-rose-950/30";
                      badgeClasses +=
                        " bg-rose-500/20 border-rose-500/50 text-rose-300";
                      statusTextClass += " text-rose-400 font-bold";
                      statusLabel = "Action Required";
                    } else if (isActive) {
                      cardClasses +=
                        " border-2 border-amber-500/80 bg-amber-950/20 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40 hover:border-amber-400 hover:bg-amber-950/30";
                      badgeClasses +=
                        " bg-amber-500/20 border-amber-500/50 text-amber-300";
                      statusTextClass += " text-amber-400";
                      statusLabel =
                        record.status === "Submitted" ||
                        record.status === "Flagged" ||
                        record.status === "Verified"
                          ? "Awaiting Officer"
                          : record.status || "Pending";
                    } else {
                      cardClasses +=
                        " border border-slate-800/80 bg-slate-900/40 text-slate-400 opacity-80 hover:opacity-100 hover:border-slate-700 hover:bg-slate-900/60";
                      badgeClasses +=
                        " bg-slate-800/80 border-slate-700/60 text-slate-400";
                      statusTextClass +=
                        record.status === "Incomplete"
                          ? " text-slate-300"
                          : " text-slate-400";
                      statusLabel = isFuture
                        ? `Phase ${itemTier} (Pending)`
                        : record.status || "Pending";
                    }

                    return (
                      <button
                        type="button"
                        key={record.clearance_id || idx}
                        onClick={() => handleDepartmentClick(record)}
                        className={cardClasses}
                      >
                        {/* Task Notification Badge on top right corner */}
                        {unviewedCount > 0 && !isCleared && (
                          <span
                            title={
                              hasReturnedTasks
                                ? `${unviewedCount} returned requirement${
                                    unviewedCount > 1 ? "s" : ""
                                  } — revision requested`
                                : `${unviewedCount} ${
                                    unviewedCount === 1 ? "task" : "tasks"
                                  } assigned by staff`
                            }
                            className="absolute -top-2 -right-2 flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-md ring-2 ring-[#0a101f] z-10 "
                          >
                            {hasReturnedTasks && (
                              <span className="absolute -inset-0.5 rounded-full bg-rose-500 opacity-60 animate-ping -z-10" />
                            )}
                            {unviewedCount}
                          </span>
                        )}

                        {/* Phase Badge + Status Icon */}
                        <div className="flex w-full items-center justify-between">
                          <span className={badgeClasses}>PHASE {itemTier}</span>
                          {isCleared ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Clock
                              className={`h-4 w-4 ${
                                isActive ? "text-amber-400" : "text-slate-500"
                              }`}
                            />
                          )}
                        </div>

                        {/* Office Info */}
                        <div className="my-2 flex flex-col min-w-0">
                          <span
                            className="truncate text-sm font-bold text-white group-hover:text-amber-300 transition-colors"
                            title={record.department}
                          >
                            {record.department}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 min-w-0">
                            <DeptIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span
                              className="truncate"
                              title={record.staff || "Department Staff"}
                            >
                              {record.staff || "Department Staff"}
                            </span>
                          </div>
                        </div>

                        {/* Status Footer */}
                        <div className="w-full border-t border-slate-800/70 pt-2 flex items-center justify-between">
                          <span className={statusTextClass}>{statusLabel}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {totalPipelinePages > 1 && (
                <nav
                  aria-label="Department pipeline pages"
                  className="flex items-center justify-center gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={() => setPipelinePage(Math.max(0, currentPipelinePage - 1))}
                    disabled={currentPipelinePage === 0}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Previous department page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-2">
                    {Array.from({ length: totalPipelinePages }, (_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPipelinePage(idx)}
                        aria-label={`Go to department page ${idx + 1}`}
                        aria-current={currentPipelinePage === idx ? "page" : undefined}
                        className={`h-1 shrink-0 rounded-full transition-ui duration-200 cursor-pointer ${
                          currentPipelinePage === idx
                            ? "w-6 bg-amber-400"
                            : "w-3 bg-slate-700 hover:bg-slate-500"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPipelinePage(Math.min(totalPipelinePages - 1, currentPipelinePage + 1))}
                    disabled={currentPipelinePage === totalPipelinePages - 1}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Next department page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </nav>
              )}
            </div>
          </section>

          {/* 2. How To Comply Component */}
          <div className="w-full rounded-2xl border border-slate-800/80 bg-[#0a101f]/80 p-5 md:p-6 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <Lightbulb className="h-4 w-4 text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold tracking-tight text-white">
                How to comply
              </h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
              Submit requirements online by uploading files where allowed, or
              visit the office in person during its posted hours. Check the{" "}
              <Link
                href="/clearance/schedules"
                className="font-semibold text-slate-200 underline decoration-slate-600 underline-offset-2 transition-colors hover:text-amber-400 hover:decoration-amber-400"
              >
                Office Hours
              </Link>{" "}
              tab before going — in-person sign-offs are verified by the office
              staff directly.
            </p>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Office Hours Today + Staff Lunch Break Notice ── */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* 3. Office Hours Today Component */}
          <div className="w-full rounded-2xl border border-slate-800/80 bg-[#0a101f]/80 p-5 md:p-6 shadow-2xl backdrop-blur-sm flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    Office hours today
                  </h3>
                  <span className="text-[11px] text-slate-400">{todayStr}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 font-medium">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    openOfficesCount > 0 ? "bg-emerald-400" : "bg-slate-400"
                  }`}
                />
                <span>
                  {openOfficesCount} of {officeHoursList.length} open
                </span>
              </div>
            </div>

            {/* Reserve six 66px rows plus five 8px gaps on every page. */}
            <div className="grid min-h-[436px] auto-rows-[66px] content-start gap-2">
              {officeHoursList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 italic">
                  No office schedules configured.
                </div>
              ) : (
                pagedOfficeHoursList.map((office) => {
                  const matchingRecord = sortedRecords.find(
                    (r) => r.department === office.dept_name,
                  );
                  const Icon = getDepartmentIcon(
                    office.icon_name || matchingRecord?.icon_name,
                    office.dept_name,
                  );
                  const { schedule, isOpen } = getOfficeHoursStatus(

                    office.weekly_schedule,
                    office.early_out_date,
                  );

                  return (
                    <div
                      key={office.dept_id}
                      className="flex h-[66px] w-full items-center justify-between rounded-xl border border-slate-800/70 bg-[#070c18]/60 px-3.5 py-2.5 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-inner transition-colors ${
                            isOpen
                              ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                              : "border-slate-800/90 bg-slate-900/90 text-amber-400"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0 justify-center">
                          <span className="truncate text-xs sm:text-sm font-bold text-white">
                            {office.dept_name}
                          </span>
                          <span className="flex items-center gap-1.5 truncate text-xs text-slate-400 mt-0.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                isOpen ? "bg-emerald-400" : "bg-slate-500"
                              }`}
                            />
                            <span className="truncate">{schedule}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dashed Page Indicator (appears when departments exceed 6) */}
            {totalOfficeHoursPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOfficeHoursPage((p) => Math.max(0, p - 1))}
                  disabled={officeHoursPage === 0}
                  className="p-1 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalOfficeHoursPages }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setOfficeHoursPage(idx)}
                      aria-label={`Go to page ${idx + 1}`}
                      className={`h-1 rounded-full transition-ui duration-200 cursor-pointer ${
                        officeHoursPage === idx
                          ? "w-6 bg-amber-400"
                          : "w-3 bg-slate-700 hover:bg-slate-500"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOfficeHoursPage((p) =>
                      Math.min(totalOfficeHoursPages - 1, p + 1),
                    )
                  }
                  disabled={officeHoursPage === totalOfficeHoursPages - 1}
                  className="p-1 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* 4. Staff Lunch Break Notice Component (Both columns stretch to align their bottom cards) */}
          <div className="w-full flex-1 rounded-2xl border border-slate-800/80 bg-[#0a101f]/80 p-5 md:p-6 shadow-2xl backdrop-blur-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    Staff Lunch Break
                  </h3>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3.5 mt-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 mt-0.5">
                    <Coffee className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-amber-300">
                      Daily Noon Recess
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                      Clearance offices and staff desks pause in-person processing from 12:00 PM to 1:00 PM daily.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-slate-400">
                In-person document verifications, inquiries, and physical sign-offs resume promptly at 1:00 PM.
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Online dropbox submissions remain accessible 24/7.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Department Overlay Sheet ── */}
      {selectedRecord && (
        <DepartmentOverlay
          selectedRecord={selectedRecord}
          departmentTasks={departmentTasks}
          setSelectedRecord={setSelectedRecord}
          studentId={studentId}
          allRecords={sortedRecords}
          onSelectDepartment={handleDepartmentClick}
          viewedTaskIds={viewedTaskIds}
          onViewTask={handleViewTask}
        />
      )}
    </div>
  );
}
