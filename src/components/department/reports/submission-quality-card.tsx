"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import type { SubmissionQualityStats } from "@/modules/staff/application/repository/dashboard-repository";
import styles from "./submission-quality-card.module.css";

interface Props {
  submissionQuality: SubmissionQualityStats;
}

export default function SubmissionQualityCard({ submissionQuality }: Props) {
  const { totalSubmissions, aiVerified, manuallyCleared, flagged, pendingReview } = submissionQuality;
  const statuses = [
    {
      label: "Passed AI screening",
      description: "AI-verified tasks, including those later cleared by staff.",
      count: aiVerified,
      icon: ShieldCheck,
      color: "text-emerald-400",
      fill: "bg-emerald-400",
    },
    {
      label: "Cleared by staff",
      description: "Staff cleared these tasks without a recorded AI pass.",
      count: manuallyCleared,
      icon: CheckCircle2,
      color: "text-cyan-400",
      fill: "bg-cyan-400",
    },
    {
      label: "Flagged for review",
      description: "Flagged tasks that need a closer look.",
      count: flagged,
      icon: TriangleAlert,
      color: "text-rose-400",
      fill: "bg-rose-400",
    },
    {
      label: "Other task statuses",
      description: "Tasks outside the AI-passed, staff-cleared, and flagged groups.",
      count: pendingReview,
      icon: Clock3,
      color: "text-amber-400",
      fill: "bg-amber-400",
    },
  ];

  return (
    <section aria-labelledby="submission-status-title" className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl">
      <div className="border-b border-slate-800 bg-[#070c18] px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <h3 id="submission-status-title" className="text-base font-bold tracking-tight text-white">Task verification status</h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">How your department’s assigned tasks are currently categorized.</p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold text-white">{totalSubmissions.toLocaleString()}</span>
          <span className="text-xs text-slate-400">assigned {totalSubmissions === 1 ? "task" : "tasks"}</span>
        </div>

        {totalSubmissions > 0 ? (
          <>
            <div className="mt-4 flex h-2 gap-1 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
              {statuses.filter(({ count }) => count > 0).map(({ label, count, fill }) => (
                <div key={label} className={`${fill} min-w-1 rounded-full`} style={{ flexGrow: count, flexBasis: 0 }} />
              ))}
            </div>
            <dl className="mt-4 divide-y divide-slate-800/70">
              {statuses.map(({ label, description, count, icon: Icon, color }) => (
                <div key={label} className="flex items-start gap-3 py-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <dt className="text-sm font-medium text-slate-200">{label}</dt>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
                  </div>
                  <dd className={`font-mono text-lg font-semibold tabular-nums ${color}`}>{count.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-xs leading-relaxed text-slate-400">An AI screening pass does not by itself mean a task has been cleared by staff.</p>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <ShieldCheck className="mb-3 h-8 w-8 text-slate-500" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-200">No assigned tasks yet</p>
            <p className="mt-1 text-xs text-slate-400">Verification counts will appear here once tasks are assigned.</p>
          </div>
        )}

        <div className="mt-auto pt-5">
          <Link href="/department/dashboard" className={`${styles.queueLink} flex items-center justify-between gap-3 border-t border-slate-800/80 pt-4 text-xs font-semibold text-amber-400 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400`}>
            <span>View submissions on dashboard</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
