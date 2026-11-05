"use client";
import { campusClock, officeStatus as getOfficeStatus } from "@/lib/weekly-schedule";

import React, { useState, useMemo, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
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
  existing?: WeeklySchedule | null
): WeeklySchedule => {
  const normIn = "08:00";
  const normOut = "17:00";
  return {
    mon: existing?.mon ?? { active: false, time_in: normIn, time_out: normOut },
    tue: existing?.tue ?? { active: false, time_in: normIn, time_out: normOut },
    wed: existing?.wed ?? { active: false, time_in: normIn, time_out: normOut },
    thu: existing?.thu ?? { active: false, time_in: normIn, time_out: normOut },
    fri: existing?.fri ?? { active: false, time_in: normIn, time_out: normOut },
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
  initialWeeklySchedule,
  initialEarlyOutDate,
}: DepartmentCalendarClientProps) {
  const { mutate: updateSchedule, isPending: isSaving } = useUpdateSchedule();

  // Dynamic Weekly Schedule state
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(() =>
    buildDefaultWeeklySchedule(initialWeeklySchedule)
  );

  const [savedSchedule, setSavedSchedule] = useState<WeeklySchedule>(() => buildDefaultWeeklySchedule(initialWeeklySchedule));
  const hasScheduleChanges = DAYS_OF_WEEK.some(({ key }) => {
    const draft = weeklySchedule[key], saved = savedSchedule[key];
    return draft.active !== saved.active || draft.time_in.slice(0, 5) !== saved.time_in.slice(0, 5) || draft.time_out.slice(0, 5) !== saved.time_out.slice(0, 5);
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refreshClock = () => setNow(new Date());
    const timer = setInterval(refreshClock, 15000);
    window.addEventListener('focus', refreshClock);
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshClock); };
  }, []);
  const clock = campusClock(now);
  const currentDayKey = clock.dayKey;

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
  const todayDateStr = clock.date;
  const [earlyOutDate, setEarlyOutDate] = useState<string | null>(initialEarlyOutDate || null);
  const [showEarlyOutDialog, setShowEarlyOutDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [isEarlyOutSubmitting, setIsEarlyOutSubmitting] = useState(false);

  const isEarlyOutActive = earlyOutDate === todayDateStr;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const DeptIcon = getDepartmentIcon(iconName, departmentName);

  // Early out always applies to today's saved hours, independent of the editor selection.
  const todaySchedule = savedSchedule[currentDayKey];
  const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const isEarlyOutAllowed = Boolean(todaySchedule?.active &&
    clock.minutes >= toMinutes(todaySchedule.time_in) && clock.minutes < toMinutes(todaySchedule.time_out));

  const officeStatus = useMemo(() => {
    const status = getOfficeStatus(weeklySchedule, earlyOutDate, now);
    const isLunch = status.schedule.startsWith("Lunch break");
    return { isOpen: status.isOpen, isEarlyOut: isEarlyOutActive, isLunch,
      label: status.schedule,
      shortBadge: isEarlyOutActive ? "CLOSED EARLY" : isLunch ? "LUNCH BREAK" : status.isOpen ? "OPEN NOW" : "CLOSED" };
  }, [weeklySchedule, earlyOutDate, isEarlyOutActive, now]);

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

  const areAllSelectedDaysActive = Array.from(selectedDayKeys).every(
    (key) => weeklySchedule[key]?.active
  );

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
    if (!hasScheduleChanges || isSaving) return;
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

    updateSchedule(
      {
        weekly_schedule: weeklySchedule,
        early_out_date: earlyOutDate,
      },
      {
        onSuccess: () => setSavedSchedule(weeklySchedule),
        onError: (err: any) => {
          setErrorMessage(err.message || "Failed to save office hours.");
        },
      }
    );
  };

  const handleConfirmEarlyOut = () => {
    const current = campusClock();
    const today = savedSchedule[current.dayKey];
    if (!today?.active || current.minutes < toMinutes(today.time_in) || current.minutes >= toMinutes(today.time_out) || isSaving) {
      setShowEarlyOutDialog(false);
      setErrorMessage('Early out is only available during today’s saved working hours.');
      return;
    }
    setIsEarlyOutSubmitting(true);
    updateSchedule(
      { action: "early_out", early_out_date: campusClock().date },
      {
        onSuccess: () => {
          setEarlyOutDate(campusClock().date);
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
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* ── 1. Department Identity & Office Overview Header ── */}
      <header className="bg-[#101726] border border-slate-800/80 rounded-2xl p-3 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4 shadow-xl shadow-black/20">
        {/* Main Title & User Info */}
        <div className="flex items-start md:items-center gap-2.5 md:gap-3.5">
          <div className="p-2 md:p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0 mt-0.5 md:mt-0">
            <DeptIcon className="w-5 h-5 md:w-6 md:h-6" />
          </div>

          <div>
            <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight leading-snug">
              Office Hours
            </h1>
          </div>
        </div>

        {/* Right Action Controls & Status */}
        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          {/* Early Out Action Button (Only functional on the current day) */}
          <button
            type="button"
            onClick={() => {
              if (!isEarlyOutAllowed || isSaving) return;
              if (isEarlyOutActive) {
                setShowResumeDialog(true);
              } else {
                setShowEarlyOutDialog(true);
              }
            }}
            disabled={!isEarlyOutAllowed || isSaving}
            className={`text-[10px] md:text-xs font-medium px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full flex items-center gap-1.5 border transition-ui duration-200 active:scale-95 ${
              !isEarlyOutAllowed || isSaving
                ? "border border-slate-800 bg-[#070c18] text-slate-500 opacity-50 cursor-not-allowed"
                : isEarlyOutActive
                ? "bg-amber-500 text-slate-950 border-amber-400 font-semibold shadow-lg shadow-amber-500/20 cursor-pointer"
                : isEarlyOutAllowed
                ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                : "border border-slate-800 bg-[#070c18] text-slate-500 opacity-60 cursor-not-allowed"
            }`}
            title={
              isEarlyOutActive
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Left Column: Schedule Configuration */}
        <div className="lg:col-span-7 xl:col-span-8 min-w-0 space-y-3 md:space-y-5">
          {/* MAIN DYNAMIC WEEKLY SCHEDULE CARD */}
          <div className="bg-[#101726] border border-slate-800/80 rounded-2xl p-3 md:p-6 shadow-xl shadow-black/20 space-y-4 md:space-y-6">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-white tracking-tight">
                    Dynamic Weekly Schedule
                  </h2>
                  <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed">
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

              <div className="grid grid-cols-8 md:grid-cols-7 gap-1.5 sm:gap-2">
                {DAYS_OF_WEEK.map((day, index) => {
                  const cfg = weeklySchedule[day.key] || { active: false, time_in: "08:00", time_out: "17:00" };
                  const isSelected = selectedDayKeys.has(day.key);

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDaySelection(day.key)}
                      className={`relative col-span-2 md:col-span-1 ${index === 4 ? "col-start-2 md:col-start-auto" : ""} flex flex-col items-center justify-center py-2 md:py-2.5 px-1 rounded-xl border transition-ui duration-150 cursor-pointer ${
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
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 md:p-5 space-y-3 md:space-y-5">
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
                  onClick={() => updateSelectedDays({ active: !areAllSelectedDaysActive })}
                  aria-label={areAllSelectedDaysActive ? "Deactivate selected days" : "Activate selected days"}
                  aria-pressed={areAllSelectedDaysActive}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border flex items-center transition-colors cursor-pointer ${
                    isAnySelectedDayActive
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                      : "bg-slate-800/60 border-slate-700 text-slate-400"
                  }`}
                >
                  {areAllSelectedDaysActive ? "Active" : isAnySelectedDayActive ? "Mixed · Activate all" : "Inactive"}
                </button>
              </div>

              {isAnySelectedDayActive ? (
                <>
                  {/* Quick Shift Presets Grid */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Quick Shift Presets
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-2.5">
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
                            className={`p-2 md:p-3 rounded-xl border text-left transition-ui duration-150 cursor-pointer ${
                              isPresetActive
                                ? "bg-amber-500/10 border-amber-500 text-white shadow-sm shadow-amber-500/20"
                                : "bg-slate-900/80 hover:bg-slate-800/80 border-slate-800/80 text-slate-300"
                            }`}
                          >
                            <div className={`text-[10px] md:text-xs font-semibold ${isPresetActive ? "text-amber-400" : "text-slate-200"}`}>
                              {preset.label}
                            </div>
                            <div className="text-[9px] md:text-[11px] text-slate-400 font-mono mt-0.5">
                              {preset.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Opening and Closing Time Selectors */}
                  <div className="grid grid-cols-2 gap-2 md:gap-4 pt-1">
                    {/* Opening Time Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Opening Time<span className="block md:inline"> <span>(Time In)</span></span></span>
                        </label>
                      </div>

                      <input
                        type="time"
                        value={primaryDayConfig.time_in}
                        onChange={(e) => updateSelectedDays({ time_in: e.target.value })}
                        className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-xl py-2 px-2 text-xs md:py-2.5 md:px-3.5 md:text-sm font-mono tracking-normal md:tracking-widest font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Closing Time Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Closing Time<span className="block md:inline"> <span>(Time Out)</span></span></span>
                        </label>
                      </div>

                      <input
                        type="time"
                        value={primaryDayConfig.time_out}
                        onChange={(e) => updateSelectedDays({ time_out: e.target.value })}
                        className="w-full min-w-0 bg-slate-900 border border-slate-800 rounded-xl py-2 px-2 text-xs md:py-2.5 md:px-3.5 md:text-sm font-mono tracking-normal md:tracking-widest font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
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
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 md:p-4 flex items-start gap-2.5 md:gap-3.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Campus Daily Lunch Window</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  <span className="md:hidden">In-person signing pauses daily from 12:00 PM to 1:00 PM; online submissions stay open.</span>
                  <span className="hidden md:inline">
                  Offices observe a 12:00 PM – 1:00 PM break window daily. In-person clearance signing pauses during this period, while online submission queues remain open. Early out remains accessible during lunch break.
                  </span>
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
                setWeeklySchedule(buildDefaultWeeklySchedule(savedSchedule));
                setSelectedDayKeys(new Set([currentDayKey]));
                setErrorMessage(null);
              }}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-2 transition-ui cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSaving || !hasScheduleChanges}
              className="text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 px-3 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-ui cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="lg:col-span-5 xl:col-span-4 min-w-0 space-y-3 md:space-y-5">
          {/* 1. Visual Weekly Schedule Grid */}
          <div className="bg-[#101726] border border-slate-800/80 rounded-2xl p-3 md:p-5 shadow-xl shadow-black/20 space-y-3 md:space-y-4">
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
          <div className="bg-[#101726] border border-slate-800/80 rounded-2xl p-3 md:p-5 shadow-xl shadow-black/20 space-y-3 md:space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <Eye className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Student Portal Live Preview
              </h2>
            </div>

            {/* Single Sleek Card Matching Screenshot */}
            <div className="rounded-xl border border-slate-800/80 bg-[#070c18] p-2.5 md:p-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
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
                  <h4 className="text-xs md:text-sm font-bold text-white truncate">
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
