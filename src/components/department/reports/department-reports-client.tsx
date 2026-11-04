"use client";

import React, { useState } from "react";
import {
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  Building2,
} from "lucide-react";
import { DepartmentReportData } from "@/modules/staff/application/repository/dashboard-repository";
import { exportDepartmentClearanceReport } from "@/utils/export-clearance-report";
import { getDepartmentIcon } from "@/lib/department-icons";
import { useToast } from "@/hooks/use-toast";
import DailyThroughputChart from "./daily-throughput-chart";
import SubmissionQualityCard from "./submission-quality-card";
import SectionAuditTable from "./section-audit-table";

interface Props {
  reportData: DepartmentReportData;
}

export default function DepartmentReportsClient({ reportData }: Props) {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const { success, error } = useToast();

  const { departmentName, metrics, dailyThroughput, submissionQuality, programs, records } =
    reportData;

  const DeptIcon = getDepartmentIcon(departmentName);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const res = exportDepartmentClearanceReport({
        departmentName,
        records,
      });

      if (res.success) {
        success(
          `Successfully exported ${res.totalRecords} clearance records to CSV.`,
          "Department Audit Export",
        );
      }
    } catch (err: any) {
      error(
        err.message || "Failed to export department clearance report",
        "Export Error",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-10">
        {/* ── 1. Page Header with Department Identity & CSV Export ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10">
              <DeptIcon className="h-6 w-6 stroke-[2]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Clearance Reports & Audit
                </h1>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  {departmentName}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Departmental turnaround velocity, document verification accuracy, and section compliance audits
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-ui cursor-pointer self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <Download className="h-4 w-4 stroke-[2.5]" />
            )}
            <span>Export Audit (CSV)</span>
          </button>
        </div>

        {/* ── 2. Executive Audit Metric Strip (4 Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

          {/* Card 4: AI Pre-Screening Pass Rate */}
          <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                AI PRE-SCREENING ACCURACY
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-extrabold text-amber-400">
                {metrics.aiPassRate}%
              </div>
              <p className="mt-1 text-xs text-slate-400">
                <strong className="text-white font-mono">
                  {submissionQuality.aiVerified}
                </strong>{" "}
                passed Factor 1 authenticity inspection
              </p>
            </div>
          </div>
        </div>

        {/* ── 3. Velocity & Submission Quality Analytics Grid (2 Columns) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7">
            <DailyThroughputChart
              dailyThroughput={dailyThroughput}
              clearedToday={metrics.clearedToday}
              dailyAverage={metrics.dailyAverage}
            />
          </div>

          <div className="lg:col-span-5">
            <SubmissionQualityCard submissionQuality={submissionQuality} />
          </div>
        </div>

        {/* ── 4. Granular Section & Program Audit Table ── */}
        <SectionAuditTable
          programs={programs}
          departmentName={departmentName}
        />
      </div>
    </>
  );
}
