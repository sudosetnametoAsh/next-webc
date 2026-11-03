"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Info,
  Building2,
} from "lucide-react";
import type {
  getDepartmentDetailsPromise,
  getOfficeHoursPromise,
} from "@/modules/clearance/application/repository/dashboard-repository";
import { getDepartmentIcon } from "@/lib/department-icons";
import { useClearanceData } from "@/hooks/clearance/use-clearance-data";

interface OfficeScheduleSlot {
  morning?: string;
  afternoon?: string;
  fullDay?: string;
  closed?: boolean;
}

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

const DAYS_HEADER: { key: DayKey; label: string }[] = [
  { key: "mon", label: "MON" },
  { key: "tue", label: "TUE" },
  { key: "wed", label: "WED" },
  { key: "thu", label: "THU" },
  { key: "fri", label: "FRI" },
  { key: "sat", label: "SAT" },
];

const DEFAULT_REQUIREMENTS: Record<string, string[]> = {
  Cashier: [
    "Official receipt of settled tuition balance or assessment voucher",
    "Valid Student Identification Card",
    "Promissory note copy (if under approved financial plan)",
  ],
  Clinic: [
    "Completed Annual Physical Examination Form with physician signature",
    "Updated Dental Examination Record",
    "Medical Certificate (for laboratory or sports exemptions)",
  ],
  "Computer Laboratory": [
    "Laboratory equipment accountability verification",
    "Return of borrowed network peripherals and dev boards",
    "Laboratory locker key turnover",
  ],
  "Guidance Office": [
    "Exit Interview Assessment submission",
    "Career Guidance and Tracking Survey completion",
    "Good Moral Character clearance endorsement",
  ],
  Library: [
    "Return of all overdue borrowed books and periodicals",
    "Settlement of library fine assessment slip (if applicable)",
    "Digital research repository account turnover",
  ],
  Registrar: [
    "Official Transcript of Records evaluation (graduating students)",
    "Original Form 137 / SF10 on file confirmation",
    "Prerequisite clearance signatures from preceding phases",
  ],
};

function formatTime12(t?: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

function getOfficeCurrentStatus(
  timeIn?: string | null,
  timeOut?: string | null,
  weeklySchedule?: Record<string, { active: boolean; time_in: string; time_out: string }> | null,
  earlyOutDate?: string | null,
): {
  statusText: string;
  isOpenNow: boolean;
  timeRange: string;
  hasHoursToday: boolean;
} {
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sun, 6 = Sat
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const currentDayKey = dayMap[dayIndex];
  const todayDateStr = now.toISOString().slice(0, 10);

  // Check Early Out
  if (earlyOutDate === todayDateStr) {
    const nextDayIndex = (dayIndex + 1) % 7;
    const nextDayKey = dayMap[nextDayIndex];
    const nextSched = weeklySchedule?.[nextDayKey];
    const nextIn = nextSched?.active ? formatTime12(nextSched.time_in) : (timeIn ? formatTime12(timeIn) : "8:00 AM");
    return {
      statusText: `Closed early · Reopens tomorrow at ${nextIn}`,
      isOpenNow: false,
      timeRange: "Closed Early",
      hasHoursToday: false,
    };
  }

  // Determine today's active time_in and time_out
  let activeIn = timeIn;
  let activeOut = timeOut;
  let isDayActive = dayIndex !== 0; // Default: Sunday closed

  if (weeklySchedule && weeklySchedule[currentDayKey]) {
    const dayConfig = weeklySchedule[currentDayKey];
    isDayActive = dayConfig.active;
    activeIn = dayConfig.time_in;
    activeOut = dayConfig.time_out;
  }

  if (!isDayActive || !activeIn || !activeOut) {
    const nextActiveDayName = dayIndex === 6 ? "Mon" : "tomorrow";
    return {
      statusText: `Closed today · Opens ${nextActiveDayName}`,
      isOpenNow: false,
      timeRange: "Closed",
      hasHoursToday: false,
    };
  }

  const formattedIn = formatTime12(activeIn);
  const formattedOut = formatTime12(activeOut);
  const timeRange = `${formattedIn} – ${formattedOut}`;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [inH, inM] = activeIn.split(":").map(Number);
  const inMinutes = inH * 60 + (inM || 0);

  const [outH, outM] = activeOut.split(":").map(Number);
  const outMinutes = outH * 60 + (outM || 0);

  // Lunch break check (12:00 PM - 1:00 PM)
  if (currentMinutes >= 720 && currentMinutes < 780 && currentMinutes >= inMinutes && currentMinutes < outMinutes) {
    return {
      statusText: "Lunch break · Resumes at 1:00 PM",
      isOpenNow: false,
      timeRange,
      hasHoursToday: true,
    };
  }

  if (currentMinutes >= inMinutes && currentMinutes < outMinutes) {
    return {
      statusText: `Open now · Closes ${formattedOut}`,
      isOpenNow: true,
      timeRange,
      hasHoursToday: true,
    };
  } else if (currentMinutes < inMinutes) {
    return {
      statusText: `Closed · Opens at ${formattedIn}`,
      isOpenNow: false,
      timeRange,
      hasHoursToday: true,
    };
  } else {
    const nextDayText = dayIndex === 6 ? "Mon" : "tomorrow";
    return {
      statusText: `Closed · Opens ${nextDayText} ${formattedIn}`,
      isOpenNow: false,
      timeRange,
      hasHoursToday: true,
    };
  }
}

interface ProcessedDepartmentSchedule {
  id: number;
  name: string;
  staff: string;
  role: string;
  statusText: string;
  isOpenNow: boolean;
  hasHoursToday: boolean;
  hasSchedule: boolean;
  timeRange: string;
  iconName?: string | null;
  location: string;
  email: string;
  tier: number;
  requirements: string[];
  schedule: Record<DayKey, OfficeScheduleSlot>;
}

export default function OfficeHours({
  departments: propDepartments = [],
  tasks: propTasks = [],
  studentId = "",
}: {
  departments?: getOfficeHoursPromise;
  tasks?: getDepartmentDetailsPromise;
  studentId?: string;
}) {
  const { officeHours: liveOfficeHours, tasks: liveTasks } = useClearanceData(
    studentId,
    {
      initialData: {
        officeHours: propDepartments,
        tasks: propTasks,
      },
    }
  );

  const departments = liveOfficeHours || propDepartments;
  const tasks = liveTasks || propTasks;

  const [todayDayKey, setTodayDayKey] = useState<DayKey>("mon");
  const [todayFullDateStr, setTodayFullDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const dayIndex = now.getDay();
    const dayMap: Record<number, DayKey> = {
      1: "mon",
      2: "tue",
      3: "wed",
      4: "thu",
      5: "fri",
      6: "sat",
    };
    if (dayMap[dayIndex]) {
      setTodayDayKey(dayMap[dayIndex]);
    } else {
      setTodayDayKey("mon");
    }

    const dateFormatted = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeFormatted = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    setTodayFullDateStr(`${dateFormatted} · ${timeFormatted}`);
  }, []);

  // Transform live database department records into schedule items
  const processedDepartments = useMemo(() => {
    return departments.map((d) => {
      const { statusText, isOpenNow, timeRange, hasHoursToday } = getOfficeCurrentStatus(
        d.time_in,
        d.time_out,
        d.weekly_schedule,
        d.early_out_date
      );

      // Extract requirements: assigned tasks from database or institutional fallback
      const matchingTasks = tasks.filter(
        (t) => t.department.toLowerCase() === d.dept_name.toLowerCase()
      );

      let reqs: string[] = [];
      if (matchingTasks.length > 0) {
        reqs = matchingTasks.map((t) =>
          t.description ? `${t.title} — ${t.description}` : t.title
        );
      } else if (DEFAULT_REQUIREMENTS[d.dept_name]) {
        reqs = DEFAULT_REQUIREMENTS[d.dept_name];
      } else {
        reqs = [
          "Physical document verification and sign-off endorsement",
          "Valid Student Identification Card",
          "Settlement of office-specific clearance accountabilities",
        ];
      }

      // Build weekly schedule grid dynamically
      const buildDaySlot = (key: DayKey): OfficeScheduleSlot => {
        if (d.weekly_schedule && d.weekly_schedule[key]) {
          const cfg = d.weekly_schedule[key];
          if (!cfg.active || !cfg.time_in || !cfg.time_out) {
            return { closed: true };
          }
          return { fullDay: `${formatTime12(cfg.time_in)} – ${formatTime12(cfg.time_out)}` };
        }

        // Fallback for Saturday
        if (key === "sat") {
          const saturdayClosedDepts = ["Guidance Office", "Computer Laboratory"];
          const isSatClosed =
            saturdayClosedDepts.includes(d.dept_name) || !d.time_in || !d.time_out;
          return isSatClosed ? { closed: true } : { fullDay: "8:00 AM – 12:00 PM" };
        }

        // Fallback for weekdays
        return d.time_in && d.time_out
          ? { fullDay: `${formatTime12(d.time_in)} – ${formatTime12(d.time_out)}` }
          : { closed: true };
      };

      const schedule: Record<DayKey, OfficeScheduleSlot> = {
        mon: buildDaySlot("mon"),
        tue: buildDaySlot("tue"),
        wed: buildDaySlot("wed"),
        thu: buildDaySlot("thu"),
        fri: buildDaySlot("fri"),
        sat: buildDaySlot("sat"),
      };

      const location =
        d.floor && d.room
          ? `${d.floor} · ${d.room}`
          : "Campus Administrative Office";

      const email =
        d.email || `${d.dept_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@sti.edu.ph`;

      return {
        id: d.dept_id,
        name: d.dept_name,
        staff: d.staff_name || "Department Officer",
        role: "Clearance Signatory",
        statusText,
        isOpenNow,
        hasHoursToday,
        hasSchedule: Boolean(d.time_in && d.time_out),
        timeRange,
        iconName: d.icon_name,
        location,
        email,
        tier: d.tier ?? 1,
        requirements: reqs,
        schedule,
      };
    });
  }, [departments, tasks]);

  // Count open offices right now
  const openCount = useMemo(() => {
    return processedDepartments.filter((d) => d.isOpenNow).length;
  }, [processedDepartments]);

  const renderScheduleCell = (slot: OfficeScheduleSlot, isToday: boolean) => {
    if (slot.closed) {
      return <span className="text-slate-500 font-bold text-sm">—</span>;
    }

    const pillClass = isToday
      ? "rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold px-2 py-1 text-xs text-center shadow-sm w-full block truncate"
      : "rounded-md border border-slate-800/80 bg-slate-900/60 text-slate-300 font-medium px-2 py-1 text-xs text-center w-full block truncate";

    return (
      <div className="flex flex-col gap-1 items-center justify-center w-full max-w-[135px] mx-auto">
        {slot.fullDay ? (
          <span className={pillClass}>{slot.fullDay}</span>
        ) : (
          <>
            {slot.morning && <span className={pillClass}>{slot.morning}</span>}
            {slot.afternoon && <span className={pillClass}>{slot.afternoon}</span>}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Top Header Row (Title, Description, Status Badges & Controls) ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Weekly office hours
            </h1>
            <p className="mt-1 text-[13px] text-slate-400 md:text-sm">
              Staffed hours and weekly availability for participating clearance departments.
            </p>
          </div>

          {/* Right Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timestamp Badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-[13px] text-slate-300 font-medium shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span>{todayFullDateStr || "Campus Schedule"}</span>
            </div>

            {/* Offices Open Badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-[13px] text-slate-300 font-medium shadow-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  openCount > 0
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                    : "bg-slate-500"
                }`}
              />
              <span>
                {openCount} of {processedDepartments.length} offices open now
              </span>
            </div>
          </div>
        </div>

        {/* Legend Aligned to the Right */}
        <div className="flex items-center justify-end pt-1">
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-400 bg-transparent" />
              <span className="text-slate-300">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span className="text-slate-300">Open right now</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold text-sm">—</span>
              <span className="text-slate-400">Closed / TBA</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Weekly Schedule Table ── */}
      <div className="w-full rounded-2xl border border-portal-border bg-portal-surface shadow-2xl backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            {/* Table Header */}
            <thead className="border-b border-portal-border bg-portal-inset text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-4 px-6 text-left w-[31%]">DEPARTMENT</th>
                {DAYS_HEADER.map(({ key, label }) => {
                  const isToday = key === todayDayKey;
                  return (
                    <th
                      key={key}
                      className={`py-4 px-2 text-center w-[11.5%] ${
                        isToday ? "bg-amber-500/[0.04]" : ""
                      }`}
                    >
                      <span className={isToday ? "text-amber-400 font-bold" : ""}>
                        {label}
                      </span>
                      {isToday && (
                        <span className="ml-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                          Today
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-800/70">
              {processedDepartments.length > 0 ? (
                processedDepartments.map((dept) => {
                  const DeptIcon = getDepartmentIcon(dept.iconName, dept.name) || Building2;

                  return (
                    <tr
                      key={dept.id}
                      className="hover:bg-slate-800/20 transition-colors"
                    >
                      {/* Department Info */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-colors ${
                              dept.isOpenNow
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-slate-800/90 bg-[#070c18] text-amber-400"
                            }`}
                          >
                            <DeptIcon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-bold text-white truncate">
                                {dept.name}
                              </span>
                            </div>
                            <span
                              className="text-[13px] text-slate-400 truncate mt-0.5"
                              title={`${dept.staff} · ${dept.location}`}
                            >
                              {dept.staff} · {dept.location}
                            </span>
                            <span
                              className={`text-xs mt-1 flex items-center gap-1.5 ${
                                dept.isOpenNow
                                  ? "text-emerald-400 font-semibold"
                                  : "text-slate-400"
                              }`}
                            >
                              {dept.isOpenNow ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" />
                              )}
                              <span>{dept.statusText}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Day Schedule Slots */}
                      {DAYS_HEADER.map(({ key }) => {
                        const isToday = key === todayDayKey;
                        return (
                          <td
                            key={key}
                            className={`py-4 px-2 text-center align-middle ${
                              isToday ? "bg-amber-500/[0.04]" : ""
                            }`}
                          >
                            {renderScheduleCell(dept.schedule[key], isToday)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-xs text-slate-400 font-medium"
                  >
                    No department schedules found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Callout Card: "Today at a glance" ── */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0a101f]/80 p-5 md:p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-amber-400 shrink-0" />
          <h3 className="text-[15px] font-bold tracking-tight text-white">
            Today at a glance
          </h3>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
          {openCount > 0
            ? `${openCount} of ${processedDepartments.length} clearance offices are currently open for walk-in verification and physical sign-offs today.`
            : processedDepartments.some((d) => d.hasHoursToday)
            ? "Clearance offices are currently closed for the moment. Check the weekly schedule grid to see operating hours and upcoming opening times."
            : "No clearance offices have operating hours scheduled today. Check the weekly schedule grid for the next open business day."}
        </p>
      </div>
    </div>
  );
}
