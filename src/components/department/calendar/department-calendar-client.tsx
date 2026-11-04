"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Building2,
  Calendar,
  CalendarDays,
  Coffee,
  Check,
  Eye,
  LogOut,
  CalendarCheck,
  Sparkles,
} from "lucide-react";
import { getDepartmentIcon } from "@/lib/department-icons";
import { useUpdateSchedule } from "@/hooks/department/update-schedule";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type DayScheduleConfig = {
  active: boolean;
  time_in: string;
  time_out: string;
};

export type WeeklySchedule = Record<string, DayScheduleConfig>;

interface DepartmentCalendarClientProps {
  userId: string;
  userName: string;
  departmentName: string;
  iconName: string;
  floor: string;
  room: string;
  initialTimeIn: string | null;
  initialTimeOut: string | null;
  initialWeeklySchedule?: WeeklySchedule | null;
  initialEarlyOutDate?: string | null;
}

const PRESET_SHIFTS = [
  { label: "Standard Shift", in: "08:00", out: "17:00", desc: "8:00 AM – 5:00 PM" },
  { label: "Early Shift", in: "07:30", out: "16:30", desc: "7:30 AM – 4:30 PM" },
  { label: "Late Shift", in: "09:00", out: "18:00", desc: "9:00 AM – 6:00 PM" },
  { label: "Morning Only", in: "08:00", out: "12:00", desc: "8:00 AM – 12:00 PM" },
];

const DAYS_OF_WEEK = [
  { key: "mon", short: "Mon", full: "Monday" },
  { key: "tue", short: "Tue", full: "Tuesday" },
  { key: "wed", short: "Wed", full: "Wednesday" },
  { key: "thu", short: "Thu", full: "Thursday" },
  { key: "fri", short: "Fri", full: "Friday" },
  { key: "sat", short: "Sat", full: "Saturday" },
  { key: "sun", short: "Sun", full: "Sunday" },
];

function formatTimeString(timeStr?: string | null): string {
  if (!timeStr) return "Not Set";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

const buildDefaultWeeklySchedule = (
  defaultIn: string,
  defaultOut: string,
  existing?: WeeklySchedule | null
): WeeklySchedule => {
  const normIn = defaultIn || "08:00";
  const normOut = defaultOut || "17:00";
  return {
    mon: existing?.mon ?? { active: true, time_in: normIn, time_out: normOut },
    tue: existing?.tue ?? { active: true, time_in: normIn, time_out: normOut },
    wed: existing?.wed ?? { active: true, time_in: normIn, time_out: normOut },
    thu: existing?.thu ?? { active: true, time_in: normIn, time_out: normOut },
    fri: existing?.fri ?? { active: true, time_in: normIn, time_out: normOut },
    sat: existing?.sat ?? { active: false, time_in: "08:00", time_out: "12:00" },
    sun: existing?.sun ?? { active: false, time_in: "08:00", time_out: "12:00" },
  };
};

export default function DepartmentCalendarClient({
  userId,
  userName,
  departmentName,
  iconName,
  floor,
  room,
  initialTimeIn,
  initialTimeOut,
  initialWeeklySchedule,
  initialEarlyOutDate,
}: DepartmentCalendarClientProps) {
  const { mutate: updateSchedule, isPending: isSaving } = useUpdateSchedule();

  const defaultIn = initialTimeIn ? initialTimeIn.slice(0, 5) : "08:00";
  const defaultOut = initialTimeOut ? initialTimeOut.slice(0, 5) : "17:00";

  // Dynamic Weekly Schedule state
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(() =>
    buildDefaultWeeklySchedule(defaultIn, defaultOut, initialWeeklySchedule)
  );

  // Current day key in view
  const dayIndex = useMemo(() => new Date().getDay(), []); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayMap = useMemo(() => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"], []);
  const currentDayKey = dayMap[dayIndex];

  // Multiple day selection for batch configuration (defaults to today)
  const [selectedDayKeys, setSelectedDayKeys] = useState<Set<string>>(
    () => new Set([currentDayKey])
  );

  const toggleDaySelection = (dayKey: string) => {
    setSelectedDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        if (next.size > 1) {
          next.delete(dayKey);
        }
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  const isAllDaysSelected = selectedDayKeys.size === DAYS_OF_WEEK.length;
  const handleToggleSelectAll = () => {
    if (isAllDaysSelected) {
      setSelectedDayKeys(new Set([currentDayKey]));
    } else {
      setSelectedDayKeys(new Set(DAYS_OF_WEEK.map((d) => d.key)));
    }
  };

  // Early Out state
  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [earlyOutDate, setEarlyOutDate] = useState<string | null>(initialEarlyOutDate || null);
  const [showEarlyOutDialog, setShowEarlyOutDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [isEarlyOutSubmitting, setIsEarlyOutSubmitting] = useState(false);

  const isEarlyOutActive = earlyOutDate === todayDateStr;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const DeptIcon = getDepartmentIcon(iconName, departmentName);

  // Early Out Allowed Check:
  // Rule: Disabled during non-office hours, daily lunch window not included (accessible during lunch window).
  // Strictly only functional on the current day (today).
  const isTodaySelected = selectedDayKeys.has(currentDayKey);

  const isEarlyOutAllowed = useMemo(() => {
    // Only functional on the current day
    if (!isTodaySelected) {
      return false;
    }

    const todaySched = weeklySchedule[currentDayKey];
    if (!todaySched || !todaySched.active || !todaySched.time_in || !todaySched.time_out) {
      return false;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [inH, inM] = todaySched.time_in.split(":").map(Number);
    const [outH, outM] = todaySched.time_out.split(":").map(Number);
    const inTotal = inH * 60 + (inM || 0);
    const outTotal = outH * 60 + (outM || 0);

    // Enabled during operating hours (inclusive of lunch break 12:00 - 1:00 PM)
    return currentMinutes >= inTotal && currentMinutes < outTotal;
  }, [weeklySchedule, currentDayKey, isTodaySelected]);

  // Live status calculation (Open vs Closed vs Lunch vs Early Out)
  const officeStatus = useMemo(() => {
    const todaySched = weeklySchedule[currentDayKey];

    // 1. Early Out check
    if (isEarlyOutActive) {
      const nextDayIdx = (dayIndex + 1) % 7;
      const nextDayKey = dayMap[nextDayIdx];
      const nextSched = weeklySchedule[nextDayKey];
      const nextOpenTime = nextSched?.active ? formatTimeString(nextSched.time_in) : "8:00 AM";
      const nextDayLabel = nextDayIdx === 1 && dayIndex === 6 ? "Monday" : "tomorrow";
      return {
        isOpen: false,
        isEarlyOut: true,
        isLunch: false,
        label: `Closed early · Reopens ${nextDayLabel} at ${nextOpenTime}`,
        shortBadge: "CLOSED EARLY",
      };
    }

    // 2. Closed Today check
    if (!todaySched || !todaySched.active || !todaySched.time_in || !todaySched.time_out) {
      const dayName = DAYS_OF_WEEK.find((d) => d.key === currentDayKey)?.full || "Today";
      return {
        isOpen: false,
        isEarlyOut: false,
        isLunch: false,
        label: `Closed Today (${dayName})`,
        shortBadge: "CLOSED",
      };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [inH, inM] = todaySched.time_in.split(":").map(Number);
    const [outH, outM] = todaySched.time_out.split(":").map(Number);
    const inTotal = inH * 60 + (inM || 0);
    const outTotal = outH * 60 + (outM || 0);

    // 3. Lunch Window check (12:00 PM – 1:00 PM)
    if (currentMinutes >= 720 && currentMinutes < 780 && currentMinutes >= inTotal && currentMinutes < outTotal) {
      return {
        isOpen: false,
        isEarlyOut: false,
        isLunch: true,
        label: "Lunch break · Resumes at 1:00 PM",
        shortBadge: "LUNCH BREAK",
      };
    }

    // 4. Open Now check
    if (currentMinutes >= inTotal && currentMinutes < outTotal) {
      return {
        isOpen: true,
        isEarlyOut: false,
        isLunch: false,
        label: `Open now · Closes ${formatTimeString(todaySched.time_out)}`,
        shortBadge: "OPEN NOW",
      };
    }

    // 5. Closed - Opens later today
    if (currentMinutes < inTotal) {
      return {
        isOpen: false,
        isEarlyOut: false,
        isLunch: false,
        label: `Closed · Opens today at ${formatTimeString(todaySched.time_in)}`,
        shortBadge: "CLOSED",
      };
    }

    // 6. Closed - Reopens next operating day
    const nextDayIdx = (dayIndex + 1) % 7;
    const nextDayKey = dayMap[nextDayIdx];
    const nextSched = weeklySchedule[nextDayKey];
    const nextOpenTime = nextSched?.active ? formatTimeString(nextSched.time_in) : "8:00 AM";
    const nextDayText = nextDayIdx === 1 && dayIndex === 6 ? "Monday" : "tomorrow";

    return {
      isOpen: false,
      isEarlyOut: false,
      isLunch: false,
      label: `Closed · Opens ${nextDayText} at ${nextOpenTime}`,
      shortBadge: "CLOSED",
    };
  }, [weeklySchedule, currentDayKey, dayIndex, dayMap, isEarlyOutActive]);

  // Selected Days configuration helpers
  const primarySelectedDayKey =
    DAYS_OF_WEEK.find((d) => selectedDayKeys.has(d.key))?.key || currentDayKey;

  const primaryDayConfig = weeklySchedule[primarySelectedDayKey] || {
    active: true,
    time_in: "08:00",
    time_out: "17:00",
  };

  const isAnySelectedDayActive = useMemo(() => {
    return Array.from(selectedDayKeys).some((k) => weeklySchedule[k]?.active);
  }, [weeklySchedule, selectedDayKeys]);

  const updateSelectedDays = (patch: Partial<DayScheduleConfig>) => {
    setWeeklySchedule((prev) => {
      const next = { ...prev };
      for (const key of selectedDayKeys) {
        next[key] = {
          ...next[key],
          ...patch,
        };
      }
      return next;
    });

    setErrorMessage(null);
  };

  const applyPresetToSelectedDays = (presetIn: string, presetOut: string) => {
    updateSelectedDays({ active: true, time_in: presetIn, time_out: presetOut });
  };

  const getSelectedDaysTitle = () => {
    const selectedList = DAYS_OF_WEEK.filter((d) => selectedDayKeys.has(d.key));
    if (selectedList.length === 1) {
      return `${selectedList[0].full} Hours`;
    }
    if (selectedList.length === 7) {
      return "All Days Hours";
    }
    const isWeekdays =
      selectedList.length === 5 &&
      ["mon", "tue", "wed", "thu", "fri"].every((k) => selectedDayKeys.has(k));
    if (isWeekdays) {
      return "Weekday Hours (Mon–Fri)";
    }
    if (selectedList.length <= 3) {
      return `${selectedList.map((d) => d.short).join(", ")} Hours`;
    }
    return `Selected Days (${selectedList.length}) Hours`;
  };

  const getSelectedDaysInactiveLabel = () => {
    const selectedList = DAYS_OF_WEEK.filter((d) => selectedDayKeys.has(d.key));
    if (selectedList.length === 1) {
      return selectedList[0].full;
    }
    if (selectedList.length === 7) {
      return "all days of the week";
    }
    if (selectedList.length <= 3) {
      return selectedList.map((d) => d.short).join(", ");
    }
    return `selected days (${selectedList.length})`;
  };

  const handleSaveSchedule = () => {
    // Validate all active days
    for (const [dayKey, cfg] of Object.entries(weeklySchedule)) {
      if (cfg.active) {
        if (!cfg.time_in || !cfg.time_out) {
          setErrorMessage(`Please configure both opening and closing times for ${dayKey.toUpperCase()}.`);
          return;
        }
        if (cfg.time_out <= cfg.time_in) {
          setErrorMessage(`Closing time must be later than opening time for ${dayKey.toUpperCase()}.`);
          return;
        }
      }
    }

    setErrorMessage(null);

    // Primary time_in/time_out fallback from Monday or first active day
    const primaryActive =
      Object.values(weeklySchedule).find((d) => d.active) || {
        time_in: "08:00",
        time_out: "17:00",
      };

    updateSchedule(
      {
        time_in: primaryActive.time_in,
        time_out: primaryActive.time_out,
        weekly_schedule: weeklySchedule,
        early_out_date: earlyOutDate,
      },
      {
        onError: (err: any) => {
          setErrorMessage(err.message || "Failed to save office hours.");
        },
      }
    );
  };

  const handleConfirmEarlyOut = () => {
    setIsEarlyOutSubmitting(true);
    updateSchedule(
      { action: "early_out", early_out_date: todayDateStr },
      {
        onSuccess: () => {
          setEarlyOutDate(todayDateStr);
          setShowEarlyOutDialog(false);
          setIsEarlyOutSubmitting(false);
        },
        onError: (err: any) => {
          setErrorMessage(err.message || "Failed to activate early out.");
          setIsEarlyOutSubmitting(false);
        },
      }
    );
  };

  const handleConfirmResumeSchedule = () => {
    setIsEarlyOutSubmitting(true);
    updateSchedule(
      { action: "resume_schedule" },
      {
        onSuccess: () => {
          setEarlyOutDate(null);
          setShowResumeDialog(false);
          setIsEarlyOutSubmitting(false);
        },
        onError: (err: any) => {
          setErrorMessage(err.message || "Failed to resume schedule.");
          setIsEarlyOutSubmitting(false);
        },
      }
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* ── 1. Department Identity & Office Overview Header ── */}
      <header className="bg-[#101726] border border-slate-800/80 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-black/20">
        {/* Main Title & User Info */}
        <div className="flex items-start md:items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0 mt-0.5 md:mt-0">
            <DeptIcon className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">
              My Calendar & Office Hours
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-amber-400/90" />
                {userName} · <span className="text-slate-400">Signatory Officer</span>
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-amber-400/90" />
                {floor} · {room}
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Controls & Status */}
        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          {/* Early Out Action Button (Only functional on the current day) */}
          <button
            type="button"
            onClick={() => {
              if (!isTodaySelected) return;
              if (isEarlyOutActive) {
                setShowResumeDialog(true);
              } else {
                setShowEarlyOutDialog(true);
              }
            }}
            disabled={!isTodaySelected || (!isEarlyOutAllowed && !isEarlyOutActive)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border transition-ui duration-200 active:scale-95 ${
              !isTodaySelected
                ? "border border-slate-800 bg-[#070c18] text-slate-500 opacity-50 cursor-not-allowed"
                : isEarlyOutActive
                ? "bg-amber-500 text-slate-950 border-amber-400 font-semibold shadow-lg shadow-amber-500/20 cursor-pointer"
                : isEarlyOutAllowed
                ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                : "border border-slate-800 bg-[#070c18] text-slate-500 opacity-60 cursor-not-allowed"
            }`}
            title={
              !isTodaySelected
                ? `Early Out is only functional on the current day (${DAYS_OF_WEEK.find((d) => d.key === currentDayKey)?.full}).`
                : isEarlyOutActive
                ? "Early out active. Click to resume normal schedule."
                : isEarlyOutAllowed
                ? "Clear schedule for remaining hours today (Early Out)."
                : "Early out is only accessible during active office hours & lunch window."
            }
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isEarlyOutActive ? "Early Out Active" : "Early Out"}</span>
          </button>
        </div>
      </header>

      {/* Early Out Active Alert Banner */}
      {isEarlyOutActive && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2.5">
            <LogOut className="h-4 w-4 text-rose-400 shrink-0" />
            <span>
              <strong>Early Out is currently active.</strong> Office hours for the remainder of today have been cleared. Regular schedule will automatically resume tomorrow.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowResumeDialog(true)}
            className="text-xs font-bold underline hover:text-white transition-colors cursor-pointer ml-3 shrink-0"
          >
            Resume Schedule
          </button>
        </div>
      )}

      {/* ── 2. Two-Column Operational Configuration Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Schedule Configuration */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* MAIN DYNAMIC WEEKLY SCHEDULE CARD */}
          <div className="bg-[#101726] border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-xl shadow-black/20 space-y-6">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    Dynamic Weekly Schedule
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Customize operating hours differently for each day of the week
                  </p>
                </div>
              </div>
            </div>

            {/* Day Selector Strip with Select All Feature */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Select Day to Configure
                </p>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  {isAllDaysSelected ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const cfg = weeklySchedule[day.key] || { active: false, time_in: "08:00", time_out: "17:00" };
                  const isSelected = selectedDayKeys.has(day.key);

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDaySelection(day.key)}
                      className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-ui duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10"
                          : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {/* Day indicator dot for selected tab */}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                        </span>
                      )}

                      <span className={`text-sm font-semibold ${isSelected ? "text-amber-400" : "text-slate-200"}`}>
                        {day.short}
                      </span>

                      <span
                        className={`text-[11px] font-medium mt-0.5 ${
                          cfg.active ? "text-teal-400" : "text-slate-500"
                        }`}
                      >
                        {cfg.active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CURRENT DAY SHIFT CONFIGURATION PANEL */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 md:p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {getSelectedDaysTitle()}
                  </h3>
                </div>

                {/* Day Active Toggle */}
                <button
                  type="button"
                  onClick={() => updateSelectedDays({ active: !isAnySelectedDayActive })}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border flex items-center transition-colors cursor-pointer ${
                    isAnySelectedDayActive
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                      : "bg-slate-800/60 border-slate-700 text-slate-400"
                  }`}
                >
                  {isAnySelectedDayActive ? "Active" : "Inactive"}
                </button>
              </div>

              {isAnySelectedDayActive ? (
                <>
                  {/* Quick Shift Presets Grid */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Quick Shift Presets
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {PRESET_SHIFTS.map((preset) => {
                        const isPresetActive =
                          Array.from(selectedDayKeys).every(
                            (k) =>
                              weeklySchedule[k]?.time_in === preset.in &&
                              weeklySchedule[k]?.time_out === preset.out &&
                              weeklySchedule[k]?.active
                          );

                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyPresetToSelectedDays(preset.in, preset.out)}
                            className={`p-3 rounded-xl border text-left transition-ui duration-150 cursor-pointer ${
                              isPresetActive
                                ? "bg-amber-500/10 border-amber-500 text-white shadow-sm shadow-amber-500/20"
                                : "bg-slate-900/80 hover:bg-slate-800/80 border-slate-800/80 text-slate-300"
                            }`}
                          >
                            <div className={`text-xs font-semibold ${isPresetActive ? "text-amber-400" : "text-slate-200"}`}>
                              {preset.label}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {preset.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Opening and Closing Time Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Opening Time Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Opening Time (Time In)
                        </label>
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {formatTimeString(primaryDayConfig.time_in)}
                        </span>
                      </div>

                      <input
                        type="time"
                        value={primaryDayConfig.time_in}
                        onChange={(e) => updateSelectedDays({ time_in: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm font-mono tracking-widest font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Closing Time Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Closing Time (Time Out)
                        </label>
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {formatTimeString(primaryDayConfig.time_out)}
                        </span>
                      </div>

                      <input
                        type="time"
                        value={primaryDayConfig.time_out}
                        onChange={(e) => updateSelectedDays({ time_out: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm font-mono tracking-widest font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 italic space-y-1">
                  <p className="font-semibold text-slate-300">
                    Office is marked inactive on {getSelectedDaysInactiveLabel()}.
                  </p>
                  <p className="text-xs text-slate-400">
                    Students viewing the schedule will see this office as closed on {selectedDayKeys.size > 1 ? "these days" : "this day"}.
                  </p>
                </div>
              )}
            </div>

            {/* CAMPUS DAILY LUNCH WINDOW INFO CARD */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 flex items-start gap-3.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Campus Daily Lunch Window</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  Offices observe a 12:00 PM – 1:00 PM break window daily. In-person clearance signing pauses during this period, while online submission queues remain open. Early out remains accessible during lunch break.
                </p>
              </div>
            </div>

            {/* Error or Success Banners */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* BOTTOM ACTIONS BAR */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setWeeklySchedule(buildDefaultWeeklySchedule(defaultIn, defaultOut, initialWeeklySchedule));
                setSelectedDayKeys(new Set([currentDayKey]));
                setErrorMessage(null);
              }}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-ui cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSaving}
              className="text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-ui cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Weekly Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Visual Weekly Timeline & Student Portal Preview */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* 1. Visual Weekly Schedule Grid */}
          <div className="bg-[#101726] border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Weekly Service Timeline
                </h2>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                7-Day Overview
              </span>
            </div>

            <div className="space-y-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const cfg = weeklySchedule[day.key] || { active: false, time_in: "08:00", time_out: "17:00" };
                const isToday = currentDayKey === day.key;
                const isSelected = selectedDayKeys.has(day.key);

                return (
                  <div
                    key={day.key}
                    onClick={() => toggleDaySelection(day.key)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-ui cursor-pointer ${
                      isToday
                        ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                        : isSelected
                        ? "bg-amber-500/[0.08] border-slate-800"
                        : "bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          isToday
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : cfg.active
                            ? "bg-slate-800 text-slate-200"
                            : "bg-slate-900 text-slate-500"
                        }`}
                      >
                        {day.short}
                      </span>
                      <span className="text-xs font-medium text-slate-200">
                        {day.full}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded">
                          TODAY
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      {cfg.active ? (
                        <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                          {formatTimeString(cfg.time_in)} – {formatTimeString(cfg.time_out)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 font-mono select-none pr-1">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Live Student Portal Preview */}
          <div className="bg-[#101726] border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <Eye className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Student Portal Live Preview
              </h2>
            </div>

            {/* Single Sleek Card Matching Screenshot */}
            <div className="rounded-xl border border-slate-800/80 bg-[#070c18] p-3.5 sm:p-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    officeStatus.isOpen
                      ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                      : officeStatus.isLunch
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-slate-800 bg-slate-900/60 text-slate-500"
                  }`}
                >
                  <DeptIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">
                    {departmentName}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {officeStatus.label}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Live card displayed to students on their office hours & schedule dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Early Out Confirmation Dialog ── */}
      <Dialog open={showEarlyOutDialog} onOpenChange={setShowEarlyOutDialog}>
        <DialogContent className="max-w-md border border-slate-800 bg-[#0a101f] text-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Confirm Early Out
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Clear office hours for the remainder of today
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-300 leading-relaxed">
            <p>
              Are you sure you want to activate <strong>Early Out</strong> for {departmentName}?
            </p>
            <div className="rounded-xl border border-slate-800 bg-[#070c18] p-3 text-xs text-slate-300 space-y-1.5">
              <p>• The office will immediately be displayed as <strong>Closed Early</strong> on student portals.</p>
              <p>• In-person clearance visits will be paused for today.</p>
              <p>• Your regular schedule will automatically resume tomorrow morning.</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setShowEarlyOutDialog(false)}
              disabled={isEarlyOutSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmEarlyOut}
              disabled={isEarlyOutSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isEarlyOutSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Closing...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Confirm Early Out</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 4. Resume Schedule Confirmation Dialog ── */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-md border border-slate-800 bg-[#0a101f] text-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Resume Regular Schedule
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Undo early out and restore today's hours
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              Do you want to cancel Early Out and restore normal operating hours for {departmentName} for today?
            </p>
            <p className="text-xs text-slate-400">
              Students will immediately see your live office hours restored.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setShowResumeDialog(false)}
              disabled={isEarlyOutSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResumeSchedule}
              disabled={isEarlyOutSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isEarlyOutSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Resuming...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Resume Schedule</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
