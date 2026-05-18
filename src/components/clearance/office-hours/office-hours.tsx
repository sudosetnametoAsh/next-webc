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
    // Swapped to light mode container
    <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">

      {/* Header Section */}
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Clock className="text-amber-500" size={20} />
          <h2>Department Office Hours</h2>
        </div>
        <p className="text-sm text-slate-500">
          View the office hours, contact information, and clearance requirements for each department. Open departments are highlighted for your convenience.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          <Clock className="inline-block mr-1.5 pb-0.5 text-slate-400" size={14} />
          Today is <span className="font-bold text-slate-700">{currentDay}</span>. Open departments are highlighted.
        </p>
      </div>

      {/* List Section */}
      <div className="flex flex-col gap-3">
        {sortedDepartments.map((dept) => {
          const hasSchedule = dept.time_in !== null && dept.time_out !== null;
          const isOpen = checkIsOpen(dept.time_in, dept.time_out);

          return (
            <div
              key={dept.dept_id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                isOpen
                  ? "border-green-200 bg-green-50"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/50"
              }`}
            >
              {/* Left: Avatar + Details */}
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-100 text-xs font-bold tracking-wider text-amber-700">
                  {getAbbreviation(dept.dept_name)}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">
                    {dept.dept_name}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {dept.staff_name || "No assigned staff"}
                  </span>
                </div>
              </div>

              {/* Right: Status Badge & Time */}
              <div className="flex items-center gap-4 sm:ml-auto">
                <div className="flex items-center gap-3">
                  {!hasSchedule ? (
                    <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      No schedule set
                    </div>
                  ) : isOpen ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      <CheckCircle2 size={14} strokeWidth={2.5} />
                      <span>Open Now</span>
                    </div>
                  ) : (
                    <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      Closed Today
                    </div>
                  )}

                  {/* Time Range */}
                  {hasSchedule && (
                    <span className="w-32 text-right text-sm font-semibold text-slate-600">
                      {formatTime(dept.time_in)} - {formatTime(dept.time_out)}
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
