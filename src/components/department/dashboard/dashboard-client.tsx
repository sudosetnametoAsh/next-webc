"use client";

import React from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Activity,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  getRecentActivityPromise,
  getRecentSubmissionsPromise,
  getStatCardValuePromise,
} from "@/modules/staff/application/repository/dashboard-repository";
import RealtimeDashboardListener from "../dashboard-listener";
import PrioritySignQueue from "./priority-sign-queue";
import Link from "next/link";

export default function DashboardClient({
  user_name,
  stats,
  recentSubmissions,
  recentActivity,
}: {
  user_name: string;
  stats: getStatCardValuePromise;
  recentSubmissions: getRecentSubmissionsPromise[];
  recentActivity: getRecentActivityPromise[];
}) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const completionRate =
    stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0;

  return (
    <section className="flex h-full flex-col gap-6 max-w-7xl mx-auto">
      <RealtimeDashboardListener />

      {/* 1. Executive Faculty Header & Command Strip */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Faculty Workspace</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {today}
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {user_name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Review submissions, verify student requirements, and issue official department clearance endorsements.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/department/clients"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B192C] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 active:scale-[0.98] dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950"
            >
              <span>View Client Queue</span>
              <ArrowUpRight className="h-4 w-4 text-amber-400 dark:text-slate-950" />
            </Link>
          </div>
        </div>

        {/* 2. Integrated Operational Metrics Ribbon */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
          {/* Metric 1: Total Enrolled */}
          <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-transparent dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
              <span>Assigned Clients</span>
            </span>
            <div className="mt-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                {stats.total}
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Total students in clearance roster
              </p>
            </div>
          </div>

          {/* Metric 2: Cleared & Endorsed */}
          <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-transparent dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Endorsed ({completionRate}%)</span>
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {stats.signed}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  / {stats.total}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-[width] duration-500 ease-out"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metric 3: Pending Endorsement */}
          <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-transparent dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Pending Review</span>
            </span>
            <div className="mt-2">
              <span className="text-3xl font-black tracking-tight text-amber-700 dark:text-amber-400 tabular-nums">
                {stats.pending}
              </span>
              <p className="mt-0.5 text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Awaiting officer endorsement
              </p>
            </div>
          </div>

          {/* Metric 4: Incomplete / Action Required */}
          <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-transparent dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
              <span>Incomplete Tasks</span>
            </span>
            <div className="mt-2">
              <span className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 tabular-nums">
                {stats.incomplete}
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Students with missing files
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Priority Sign-Off Action Desk */}
      <PrioritySignQueue />

      {/* 4. Split Operational Canvas: Submissions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Submissions */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden dark:bg-slate-900/90 dark:border-slate-800">
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Recent Document Submissions
              </h2>
            </div>
            <Link
              href="/department/clients"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:bg-slate-800/70 dark:text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-4 py-3">ID Number</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((sub) => (
                    <tr
                      key={sub.assignedTaskId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {sub.studentName || "Student"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                        #{sub.studentId}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                        {sub.course}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/department/clients?search=${sub.studentId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B192C] hover:underline dark:text-amber-400 dark:hover:text-amber-300"
                        >
                          <span>Review</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-xs text-slate-400 dark:text-slate-500"
                    >
                      No recent submissions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Endorsements & Activity */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden dark:bg-slate-900/90 dark:border-slate-800">
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Clearance Activity Feed
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Real-time</span>
          </div>

          <div className="p-4 sm:p-6 divide-y divide-slate-100 overflow-y-auto max-h-[360px] dark:divide-slate-800 dark:bg-slate-900/70 dark:text-slate-100">
            {recentActivity.length > 0 ? (
              recentActivity.map((act, idx) => (
                <div
                  key={`${act.actions}-${act.created_at}-${idx}`}
                  className="py-3 first:pt-0 last:pb-0 flex items-start gap-3"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {act.actions}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {act.message}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                    {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No recent activity logged for this session.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
