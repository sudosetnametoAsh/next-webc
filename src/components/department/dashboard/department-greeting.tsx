"use client";

import {
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { getStatCardValuePromise } from "@/modules/staff/application/repository/dashboard-repository";
import { getProgressBarColor } from "@/utils/formatters";

interface DepartmentGreetingProps {
  userName: string;
  department?: string;
  stats: getStatCardValuePromise;
}

export default function DepartmentGreeting({
  userName = "Staff Officer",
  department,
  stats,
}: DepartmentGreetingProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const progressPercent =
    stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#0a101f]/95 p-6 sm:p-7 shadow-xl backdrop-blur-md">
      {/* ── Top Greeting Header ── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
          {department ? (
            <span className="text-slate-300">Today is </span>
          ) : null}
          {today} — You have{" "}
          <strong className="font-semibold text-amber-400">
            {stats.pending} client{stats.pending === 1 ? "" : "s"}
          </strong>{" "}
          awaiting your review.
        </p>
      </div>

      {/* ── 4 Stat Cards Grid ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total Clients */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0c1427]/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              TOTAL CLIENTS
            </span>
          </div>

          <div>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Assigned clearance clients
            </p>
          </div>
        </div>

        {/* Card 2: Pending Review */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0c1427]/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              PENDING REVIEW
            </span>
          </div>

          <div>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-400">
              {stats.pending}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Awaiting sign-off
            </p>
          </div>
        </div>

        {/* Card 3: Incomplete */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0c1427]/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              INCOMPLETE
            </span>
          </div>

          <div>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {stats.incomplete}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Pending client compliance
            </p>
          </div>
        </div>

        {/* Card 4: Overall Progress */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0c1427]/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              OVERALL PROGRESS ({progressPercent}%)
            </span>
          </div>

          <div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-400">
                {stats.signed}
              </span>
              <span className="text-lg font-normal text-slate-400">
                / {stats.total}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressBarColor(progressPercent)}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Clients Approved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
