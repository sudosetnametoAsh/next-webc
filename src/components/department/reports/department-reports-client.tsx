"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { DepartmentReportData } from "@/modules/staff/application/repository/dashboard-repository";
import { getDepartmentIcon } from "@/lib/department-icons";
import DailyThroughputChart from "./daily-throughput-chart";
import SectionAuditTable from "./section-audit-table";

interface Props {
  reportData: DepartmentReportData;
}

export default function DepartmentReportsClient({ reportData }: Props) {
  const { departmentName, metrics, dailyThroughput, programs } =
    reportData;

  const DeptIcon = getDepartmentIcon(departmentName);

  return (
    <>
      <div className="space-y-6 pb-10">
        {/* ── 1. Page Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-3.5">
            <div className="flex h-9 w-9 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10">
              <DeptIcon className="h-4.5 w-4.5 md:h-6 md:w-6 stroke-[2]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-3xl font-extrabold leading-snug text-white tracking-tight">
                  Clearance Reports & Audit
                </h1>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed md:text-sm text-slate-400">
                Departmental signing activity and section compliance audits
              </p>
            </div>
          </div>


        </div>

        {/* ── 2. Executive Audit Metric Strip (3 Cards) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Department Compliance */}
          <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                DEPARTMENT COMPLIANCE
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-extrabold text-white">
                {metrics.complianceRate}%
              </div>
              <p className="mt-1 text-xs text-slate-400">
                <strong className="text-emerald-400 font-mono">
                  {metrics.clearedCount}
                </strong>{" "}
                of {metrics.totalClients} clients cleared
              </p>
            </div>
          </div>

          {/* Card 2: Pending Review */}
          <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                PENDING REVIEW
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-extrabold text-amber-400">
                {metrics.pendingCount}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                <strong className="text-amber-400 font-mono">
                  {metrics.pendingCount}
                </strong>{" "}
                client{metrics.pendingCount === 1 ? "" : "s"} awaiting review
              </p>
            </div>
          </div>

          {/* Card 3: Today's Velocity */}
          <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                TODAY&apos;S SIGNING VELOCITY
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-extrabold text-cyan-400">
                {metrics.clearedToday}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Signed today · 7-day average:{" "}
                <strong className="text-white font-mono">
                  {metrics.dailyAverage}
                </strong>
                /day
              </p>
            </div>
          </div>


        </div>

        {/* ── 3. Daily Signing Throughput ── */}
        <DailyThroughputChart
          dailyThroughput={dailyThroughput}
          dailyAverage={metrics.dailyAverage}
        />

        {/* ── 4. Granular Section & Program Audit Table ── */}
        <SectionAuditTable
          programs={programs}
          departmentName={departmentName}
        />
      </div>
    </>
  );
}
