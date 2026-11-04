"use client";

import React from "react";
import Link from "next/link";
import { LabelList, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { SubmissionQualityStats } from "@/modules/staff/application/repository/dashboard-repository";
import styles from "./submission-quality-card.module.css";

interface Props {
  submissionQuality: SubmissionQualityStats;
}

export default function SubmissionQualityCard({ submissionQuality }: Props) {
  const {
    totalSubmissions,
    aiVerified,
    manuallyCleared,
    flagged,
    pendingReview,
    aiPassRate,
  } = submissionQuality;

  const total = Math.max(totalSubmissions, 1);
  const aiPct = Math.round((aiVerified / total) * 100);
  const manualPct = Math.round((manuallyCleared / total) * 100);
  const flaggedPct = Math.round((flagged / total) * 100);
  const pendingPct = Math.round((pendingReview / total) * 100);
  const distribution = [
    { name: "AI Pre-Screened", value: aiVerified, fill: "#10b981" },
    { name: "Direct Staff Authorizations", value: manuallyCleared, fill: "#06b6d4" },
    { name: "Flagged Anomalies / Review Needed", value: flagged, fill: "#f43f5e" },
    { name: "Pending Initial Review", value: pendingReview, fill: "#f59e0b" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl">
      {/* ── Card Header ── */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-800 bg-[#070c18] px-6 py-4.5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold tracking-tight text-white">
              Submission Verification Quality
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            AI pre-screening accuracy and document authentication breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3 w-3" />
            {aiPassRate}% Accuracy
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          {/* Verification distribution and persistent category values. */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Verification Distribution</span>
              <span className="font-mono text-white font-medium">
                {totalSubmissions} Total Submissions
              </span>
            </div>

            {totalSubmissions > 0 ? (
              <div className={`${styles.chart} relative h-52 w-full`} role="img" aria-label={`Verification distribution: ${aiVerified} AI pre-screened, ${manuallyCleared} staff authorized, ${flagged} flagged, ${pendingReview} pending review. Exact counts and percentages follow.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution.filter((item) => item.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="90%"
                      stroke="var(--portal-surface, #0a101f)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      <LabelList dataKey="value" position="inside" fill="#07101f" fontSize={12} fontWeight={700} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-bold text-white">{totalSubmissions}</span>
                  <span className="text-xs text-slate-400">Submissions</span>
                </div>
              </div>
            ) : (
              <div className="flex h-52 items-center justify-center text-sm text-slate-400">
                No submissions yet
              </div>
            )}
          </div>

          {/* Breakdown Items */}
          <div className={`${styles.breakdown} space-y-3`}>
            {/* Item 1: AI Verified */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-white">
                    AI Pre-Screened (Factor 1 Passed)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    High-confidence authentic seals & signatures
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {aiVerified}
                </span>
                <span className="ml-1 text-[10px] text-slate-500">
                  ({aiPct}%)
                </span>
              </div>
            </div>

            {/* Item 2: Direct Staff Authorizations */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-white">
                    Direct Staff Authorizations
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Officially cleared and verified by department
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-cyan-400">
                  {manuallyCleared}
                </span>
                <span className="ml-1 text-[10px] text-slate-500">
                  ({manualPct}%)
                </span>
              </div>
            </div>

            {/* Item 3: Flagged Anomalies */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-white">
                    Flagged Anomalies / Review Needed
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ID mismatch or missing verification marks
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-rose-400">
                  {flagged}
                </span>
                <span className="ml-1 text-[10px] text-slate-500">
                  ({flaggedPct}%)
                </span>
              </div>
            </div>

            {/* Item 4: Pending Review */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-white">
                    Pending Initial Review
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Submissions awaiting processing
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-amber-400">
                  {pendingReview}
                </span>
                <span className="ml-1 text-[10px] text-slate-500">
                  ({pendingPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Link ── */}
        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <Link
            href="/department/dashboard"
            className={`${styles.queueLink} flex items-center justify-between text-xs font-semibold text-amber-400 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400`}
          >
            <span>Open Review & Authorization Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
