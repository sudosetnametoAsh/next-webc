"use client";

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { getOfficeHoursPromise } from "@/modules/clearance/application/repository/dashboard-repository";

export default function OfficeHours({
  departments,
}: {
  departments: getOfficeHoursPromise;
}) {
  const [currentDay, setCurrentDay] = useState("");
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(0);

  // Update time on mount to avoid hydration mismatches
  useEffect(() => {
    const now = new Date();
    setCurrentDay(now.toLocaleDateString("en-US", { weekday: "long" }));
    setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());

    // Optional: Update time every minute to keep "Open Now" statuses perfectly accurate
    const interval = setInterval(() => {
      const time = new Date();
      setCurrentTimeMinutes(time.getHours() * 60 + time.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper: Convert Postgres "HH:mm:ss" to readable "h:mm A"
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "N/A";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  // Helper: Check if current time falls within staff timeIn and timeOut
  const checkIsOpen = (timeIn: string | null, timeOut: string | null) => {
    if (!timeIn || !timeOut) return false;

    const [inH, inM] = timeIn.split(":").map(Number);
    const [outH, outM] = timeOut.split(":").map(Number);

    const startMinutes = inH * 60 + inM;
    const endMinutes = outH * 60 + outM;

    return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
  };

  // Helper: Generate a short 3-4 letter abbreviation for the avatar
  const getAbbreviation = (name: string) => {
    const skipWords = ["office", "department", "of", "and", "&"];
    const words = name.split(" ").filter(w => !skipWords.includes(w.toLowerCase()));
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return (words[0].substring(0, 2) + (words[1] ? words[1].substring(0, 1) : "")).toUpperCase();
  };

  if (!currentDay) return null; // Prevent hydration mismatch flash

  // Apply the custom sorting logic
  // Cashier moves to the front (-1), Registrar moves to the back (1)
  const sortedDepartments = [...departments].sort((a, b) => {
    if (a.dept_name === "Cashier") return -1;
    if (b.dept_name === "Cashier") return 1;
    if (a.dept_name === "Registrar") return 1;
    if (b.dept_name === "Registrar") return -1;
    return 0;
  });

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 text-slate-900 shadow-2xs dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100">

      {/* Header Section */}
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B192C] text-amber-400 border border-transparent dark:border-amber-500/30 dark:bg-amber-950/20">
            <Clock size={16} />
          </div>
          <h2>Department Operating Hours</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Directory of academic and administrative service windows. Offices currently in session are highlighted.
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="text-slate-400" size={13} />
          Today is <span className="font-bold text-slate-800 dark:text-slate-200">{currentDay}</span>.
        </p>
      </div>

      {/* List Section */}
      <div className="flex flex-col gap-3">
        {sortedDepartments.map((dept) => {
          const isWeekend = currentDay === "Saturday" || currentDay === "Sunday";
          const hasSchedule = dept.time_in !== null && dept.time_out !== null;
          const isOpen = !isWeekend && checkIsOpen(dept.time_in, dept.time_out);

          return (
            <div
              key={dept.dept_id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4.5 transition-all ${
                isOpen
                  ? "border-emerald-300/80 bg-emerald-50/30 shadow-2xs dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-200"
                  : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800/80 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold tracking-wider font-mono shadow-2xs ${
                  isOpen 
                    ? "border-emerald-300 bg-emerald-600 text-white dark:border-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-200" 
                    : "border-slate-200 bg-[#0B192C] text-amber-400 dark:border-slate-700 dark:bg-[#0B192C] dark:text-amber-400"
                }`}>
                  {getAbbreviation(dept.dept_name)}
                </div>
                <div className="flex flex-col">
                  <span className={`font-bold text-sm ${isOpen ? "text-emerald-950 dark:text-emerald-100" : "text-slate-900 dark:text-slate-100"}`}>
                    {dept.dept_name}
                  </span>
                  <span className={`text-xs font-medium ${isOpen ? "text-emerald-700/80 dark:text-emerald-300/80" : "text-slate-500 dark:text-slate-400"}`}>
                    {dept.staff_name ? `Staff: ${dept.staff_name}` : "No assigned signatory staff"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:ml-auto">
                <div className="flex items-center gap-3">
                  {!hasSchedule ? (
                    <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      No schedule listed
                    </div>
                  ) : isOpen ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      <span>Open Now</span>
                    </div>
                  ) : isWeekend ? (
                    <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      Closed on Weekends
                    </div>
                  ) : (
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                      Closed Now
                    </div>
                  )}

                  {hasSchedule && (
                    <span className={`w-36 text-right text-xs font-bold tabular-nums ${isOpen ? "text-emerald-800 dark:text-emerald-300" : "text-slate-600 dark:text-slate-200"}`}>
                      {formatTime(dept.time_in)} – {formatTime(dept.time_out)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
