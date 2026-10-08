"use client";

import React, { useMemo } from "react";
import { useFetchAdminStats } from "@/hooks/admin/fetch-stats";
import { Users, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminStats() {
  const { data: stats, isLoading } = useFetchAdminStats();

  const total = stats?.totalStudents ?? 0;
  const signed = stats?.signed ?? 0;
  const incomplete = stats?.incomplete ?? 0;
  const pending = stats?.pending ?? 0;

  const clearanceRate = total > 0 ? Math.round((signed / total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:bg-slate-900/90 dark:border-slate-800"
          >
            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse dark:bg-slate-800" />
            <div className="h-8 w-16 bg-slate-100 rounded animate-pulse dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Enrolled */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
            <span>Total Enrolled</span>
          </span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Roster
          </span>
        </div>
        <div className="mt-3">
          <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {total}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Active candidate students
          </p>
        </div>
      </div>

      {/* 2. Officially Cleared */}
      <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/90 bg-emerald-50/20 p-5 shadow-2xs dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:text-emerald-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Fully Cleared</span>
          </span>
          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 tabular-nums">
            {clearanceRate}%
          </span>
        </div>
        <div className="mt-3">
          <p className="text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-300 tabular-nums">
            {signed}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-800/80 dark:text-emerald-400/80">
            All departments endorsed
          </p>
        </div>
      </div>

      {/* 3. Incomplete / Tasks Required */}
      <div className="flex flex-col justify-between rounded-2xl border border-amber-200/90 bg-amber-50/20 p-5 shadow-2xs dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Incomplete Tasks</span>
          </span>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
            Hold
          </span>
        </div>
        <div className="mt-3">
          <p className="text-3xl font-black tracking-tight text-amber-900 dark:text-amber-300 tabular-nums">
            {incomplete}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800/80 dark:text-amber-400/80">
            Pending document submission
          </p>
        </div>
      </div>

      {/* 4. Awaiting Office Review */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
            <span>Pending Review</span>
          </span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            In Queue
          </span>
        </div>
        <div className="mt-3">
          <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {pending}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Awaiting staff signature
          </p>
        </div>
      </div>
    </div>
  );
}