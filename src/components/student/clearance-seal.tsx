"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClearanceSealProps {
  totalDepartments: number;
  signedDepartments: number;
  departments: Array<{
    dept_name: string;
    status: "Signed" | "Pending" | "Incomplete" | "Locked";
    staff_name?: string;
    signing_order?: number;
    pendingTasksCount: number;
  }>;
}

export function ClearanceSeal({
  totalDepartments,
  signedDepartments,
  departments,
}: ClearanceSealProps) {
  const percentage =
    totalDepartments > 0
      ? Math.round((signedDepartments / totalDepartments) * 100)
      : 0;

  const isComplete = percentage === 100 && totalDepartments > 0;

  // Circular gauge calculations
  const radius = 72;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference;

  // Sort departments by signing_order, then cashier first / registrar last convention
  const sortedDepartments = [...departments].sort((a, b) => {
    if (a.signing_order !== undefined && b.signing_order !== undefined) {
      if (a.signing_order !== b.signing_order) {
        return a.signing_order - b.signing_order;
      }
    }
    const nameA = a.dept_name.toLowerCase();
    const nameB = b.dept_name.toLowerCase();
    if (nameA === "cashier") return -1;
    if (nameB === "cashier") return 1;
    if (nameA === "registrar") return 1;
    if (nameB === "registrar") return -1;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      {/* Top Collegiate Accent Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0B192C] via-[#F59E0B] to-[#10B981]" />

      <div className="p-6 sm:p-8">
        {/* Header Badge & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-[#F59E0B] shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                  Clearance Seal & Approval Chain
                </h2>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  AY 2024–2025
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official institutional clearance certification and sequential approval pipeline
              </p>
            </div>
          </div>

          {/* Quick Status Tag */}
          <div className="flex items-center gap-2">
            {isComplete ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                <span>Clearance Fully Approved</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 shadow-2xs">
                <Clock className="h-3.5 w-3.5 text-[#F59E0B]" strokeWidth={2.5} />
                <span>
                  {signedDepartments} of {totalDepartments} Offices Cleared
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid: Seal / Meter + Pipeline */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* SEAL / METER (Left Column on Desktop) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
            <div className="relative flex items-center justify-center">
              {/* Embossed Outer Subtle Ring Shadow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-100/80 to-transparent blur-xs -z-10" />

              <svg
                width={190}
                height={190}
                viewBox="0 0 190 190"
                className="transform -rotate-90 drop-shadow-xs"
              >
                <defs>
                  {/* STI Gold to Verified Emerald Gradient */}
                  <linearGradient id="sealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="60%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>

                  {/* Complete 100% Emerald Gradient */}
                  <linearGradient id="completeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                </defs>

                {/* Outer Decorative Academic Embossed Border */}
                <circle
                  cx={95}
                  cy={95}
                  r={87}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />

                {/* Inner Decorative Subtle Ring */}
                <circle
                  cx={95}
                  cy={95}
                  r={60}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />

                {/* Background Ring Track */}
                <circle
                  cx={95}
                  cy={95}
                  r={radius}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth={strokeWidth}
                />

                {/* Active Progress Ring with STI Gold and Verified Emerald */}
                <circle
                  cx={95}
                  cy={95}
                  r={radius}
                  fill="none"
                  stroke={isComplete ? "url(#completeGradient)" : "url(#sealGradient)"}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                  {percentage}%
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Clearance Progress
                </span>
                <span className="mt-0.5 text-xs font-semibold text-slate-700">
                  {signedDepartments} of {totalDepartments} Signed
                </span>
              </div>
            </div>

            {/* Verification Stamp Badge when 100% complete */}
            {isComplete ? (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-400 bg-emerald-50 px-4 py-1.5 text-xs font-black tracking-wider text-emerald-800 shadow-sm uppercase animate-in fade-in zoom-in-95 duration-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                <span>Official Clearance Verified</span>
              </div>
            ) : (
              <div className="mt-4 text-center">
                <span className="text-xs font-medium text-slate-400">
                  {totalDepartments - signedDepartments} department{totalDepartments - signedDepartments === 1 ? "" : "s"} remaining
                </span>
              </div>
            )}
          </div>

          {/* APPROVAL CHAIN FLOW (Right Column on Desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Approval Chain Pipeline
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Sequential Signing Sequence
              </span>
            </div>

            {/* Pipeline Cards Grid / Horizontal Wrap */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
              {sortedDepartments.map((dept, idx) => {
                const isSigned = dept.status === "Signed";
                const isLocked = dept.status === "Locked";
                const isPendingOrIncomplete = !isSigned && !isLocked;
                const hasPendingTasks = dept.pendingTasksCount > 0;

                const stepNumber = dept.signing_order ?? idx + 1;

                return (
                  <div
                    key={`${dept.dept_name}-${idx}`}
                    className={cn(
                      "relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200",
                      isSigned &&
                        "border-emerald-200/90 bg-emerald-50/30 hover:border-emerald-300 hover:shadow-xs",
                      isPendingOrIncomplete &&
                        "border-amber-300 bg-white ring-2 ring-amber-400/25 shadow-xs hover:border-amber-400",
                      isLocked &&
                        "border-slate-200 bg-slate-50/70 text-slate-400 opacity-80"
                    )}
                  >
                    {/* Top Row: Step Tag & Connector indicator */}
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] uppercase tracking-wide",
                          isSigned && "bg-emerald-100 text-emerald-800",
                          isPendingOrIncomplete && "bg-amber-100 text-amber-900",
                          isLocked && "bg-slate-200 text-slate-600"
                        )}
                      >
                        Step {stepNumber}
                      </span>

                      {idx < sortedDepartments.length - 1 && (
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white border shadow-2xs",
                            isSigned
                              ? "border-emerald-200 text-emerald-600"
                              : "border-slate-200 text-slate-300"
                          )}
                        />
                      )}
                    </div>

                    {/* Department Name & Staff */}
                    <div className="mt-3 flex flex-col gap-0.5">
                      <h4
                        className={cn(
                          "text-sm font-bold tracking-tight line-clamp-1",
                          isSigned && "text-slate-900",
                          isPendingOrIncomplete && "text-slate-900 font-extrabold",
                          isLocked && "text-slate-600"
                        )}
                        title={dept.dept_name}
                      >
                        {dept.dept_name}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 line-clamp-1">
                        {dept.staff_name || "Assigned Officer"}
                      </p>
                    </div>

                    {/* Distinct Status State Badge */}
                    <div className="mt-4 pt-3 border-t border-slate-100/80">
                      {isSigned && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
                          <span>Cleared</span>
                        </div>
                      )}

                      {isPendingOrIncomplete && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                          {hasPendingTasks ? (
                            <>
                              <AlertCircle className="h-3.5 w-3.5 text-[#F59E0B]" strokeWidth={2.5} />
                              <span>Action Needed</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 text-[#F59E0B]" strokeWidth={2.5} />
                              <span>In Review</span>
                            </>
                          )}
                        </div>
                      )}

                      {isLocked && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                          <Lock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2.5} />
                          <span>Prerequisite Pending</span>
                        </div>
                      )}

                      {/* Pending Tasks Count Helper */}
                      {hasPendingTasks && !isSigned && (
                        <p className="mt-1 text-[10px] font-medium text-amber-700">
                          {dept.pendingTasksCount} task{dept.pendingTasksCount === 1 ? "" : "s"} required
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClearanceSeal;
