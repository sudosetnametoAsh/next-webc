"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  GraduationCap,
  Sparkles,
  ArrowRight,
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
    step_number?: number;
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

  // Sort departments by signing_order, preserving dynamic DB hierarchy
  const sortedDepartments = [...departments].sort((a, b) => {
    const orderA = a.signing_order ?? 2;
    const orderB = b.signing_order ?? 2;
    if (orderA !== orderB) return orderA - orderB;
    return a.dept_name.localeCompare(b.dept_name);
  });

  // Identify current bottleneck/active department
  const activeDept = sortedDepartments.find(
    (d) => d.status !== "Signed" && d.status !== "Locked"
  );

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:bg-slate-900/90 dark:border-slate-800 dark:shadow-2xs">
      {/* Top Accent Strip */}
      <div
        className={cn(
          "h-1 w-full",
          isComplete
            ? "bg-emerald-600"
            : "bg-linear-to-r from-[#0B192C] via-amber-500 to-emerald-600 dark:from-amber-400 dark:via-amber-500 dark:to-emerald-500"
        )}
      />

      <div className="p-6 sm:p-8">
        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-amber-400 shadow-xs border border-transparent dark:border-amber-500/40 dark:bg-amber-950/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Institutional Clearance Verification
                </h2>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100">
                  AY 2024–2025
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                Official graduation & semester endorsement pipeline
              </p>
            </div>
          </div>

          {/* Verdict Badge */}
          <div className="shrink-0">
            {isComplete ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                <span>Officially Cleared for Graduation</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/80 dark:text-amber-300">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" strokeWidth={2.2} />
                <span>
                  <strong className="tabular-nums font-bold">{signedDepartments}</strong> of{" "}
                  <strong className="tabular-nums font-bold">{totalDepartments}</strong> Offices Cleared
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Executive Progress & Action Strip */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Progress Indicator */}
          <div className="md:col-span-5 flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Clearance Progress
              </span>
              <span className="text-2xl font-black tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                {percentage}%
              </span>
            </div>

            {/* Segmented Progress Track */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex gap-0.5 p-0.5 dark:bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-out",
                  isComplete ? "bg-emerald-600" : "bg-[#0B192C] dark:bg-amber-400"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 flex items-center justify-between dark:text-slate-400">
              <span>{totalDepartments - signedDepartments} endorsements remaining</span>
              <span className="font-medium text-slate-700 tabular-nums dark:text-slate-300">
                {signedDepartments}/{totalDepartments}
              </span>
            </p>
          </div>

          {/* Contextual Action Banner */}
          <div className="md:col-span-7">
            {isComplete ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-200">
                <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 dark:text-emerald-400" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-900 dark:text-emerald-100">
                    All department endorsements verified!
                  </p>
                  <p className="text-emerald-700 mt-0.5 dark:text-emerald-300">
                    Your institutional record is fully certified with the Registrar and Dean.
                  </p>
                </div>
              </div>
            ) : activeDept ? (
              <div className="flex items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 sm:p-4 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-950 dark:text-amber-100">
                      Next Step: {activeDept.dept_name}
                    </p>
                    <p className="text-amber-800/90 mt-0.5 dark:text-amber-300/90">
                      {activeDept.pendingTasksCount > 0
                        ? `${activeDept.pendingTasksCount} requirement${activeDept.pendingTasksCount === 1 ? "" : "s"} required before sign-off.`
                        : "Requirements submitted. Awaiting officer review and endorsement."}
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-amber-200/60 px-2 py-1 text-[11px] font-bold text-amber-900 shrink-0 dark:bg-amber-900/60 dark:text-amber-200">
                  Step {activeDept.step_number || 1}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100">
                Endorsements in progress. Please review individual department guidelines below.
              </div>
            )}
          </div>
        </div>

        {/* Sequential Pipeline Stepper */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sequential Sign-off Pipeline
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Signing order enforced by institutional policy
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {sortedDepartments.map((dept, idx) => {
              const isSigned = dept.status === "Signed";
              const isLocked = dept.status === "Locked";
              const isPending = !isSigned && !isLocked;
              const stepNumber = dept.step_number ?? idx + 1;

              return (
                <div
                  key={`${dept.dept_name}-${idx}`}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150 ease-out hover:shadow-2xs dark:bg-slate-800/40 dark:border-slate-700/60",
                    isSigned && "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 dark:border-emerald-800/60 dark:bg-emerald-950/20 dark:hover:border-emerald-700",
                    isPending && "border-amber-300 bg-white ring-1 ring-amber-400/30 shadow-2xs hover:border-amber-400 dark:border-amber-500/50 dark:bg-slate-800/60 dark:ring-amber-500/20 dark:hover:border-amber-400",
                    isLocked && "border-slate-200 bg-slate-50/60 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500"
                  )}
                >
                  <div>
                    {/* Step & Status Tag */}
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 uppercase tracking-wide",
                          isSigned && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:border dark:border-emerald-800/80 dark:text-emerald-300",
                          isPending && "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:border dark:border-amber-800/80 dark:text-amber-300",
                          isLocked && "bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        Step {stepNumber}
                      </span>

                      {isSigned && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {isPending && (
                        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                      {isLocked && (
                        <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>

                    {/* Department Title */}
                    <div className="mt-2.5">
                      <h4
                        className={cn(
                          "text-sm font-bold tracking-tight truncate",
                          isSigned && "text-slate-900 dark:text-slate-100",
                          isPending && "text-slate-900 font-extrabold dark:text-slate-100",
                          isLocked && "text-slate-500 font-medium dark:text-slate-400"
                        )}
                        title={dept.dept_name}
                      >
                        {dept.dept_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 dark:text-slate-400">
                        {dept.staff_name || "Assigned Officer"}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator Footnote */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span
                      className={cn(
                        "text-[10px] font-semibold block truncate",
                        isSigned && "text-emerald-700 dark:text-emerald-400",
                        isPending && "text-amber-800 dark:text-amber-400",
                        isLocked && "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {isSigned
                        ? "Cleared"
                        : isPending
                        ? dept.pendingTasksCount > 0
                          ? `${dept.pendingTasksCount} Tasks Pending`
                          : "Awaiting Officer"
                        : "Prerequisite Locked"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ClearanceSeal;
