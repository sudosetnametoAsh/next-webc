"use client";

import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import {
  getRecentActivityPromise,
  getRecentSubmissionsPromise,
  getStatCardValuePromise,
} from "@/modules/staff/application/repository/dashboard-repository";
import RealtimeDashboardListener from "../dashboard-listener";

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

  return (
    <section className="flex h-full flex-col gap-6">

      <RealtimeDashboardListener />

      {/* Banner Container */}
      <div className="overflow-hidden rounded-xl bg-linear-to-r from-[#0a1128] via-[#1c3a76] to-[#c4323b] text-white shadow-md">
        <div className="px-8 py-8">
          <span className="text-sm font-medium text-slate-300">
            Good Morning,
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {user_name}
          </h1>
          <span className="flex items-center gap-1 pt-1 text-sm text-slate-300">
            {today} — You have
            <span className="mr-1 ml-1 font-semibold text-[#ffcc00]">
              {stats.pending} pending clearances
            </span>
            today
          </span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Total Students */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Students</p>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-slate-400">Currently enrolled</p>
          </div>
        </div>

        {/* Cleared */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Cleared</p>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {stats.signed}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Completed requirements
            </p>
          </div>
        </div>

        {/* Pending */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Pending</p>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="mt-2 text-3xl font-bold text-amber-500">
              {stats.pending}
            </p>
            <p className="mt-1 text-xs text-slate-400">Awaiting your review</p>
          </div>
        </div>

        {/* Incomplete */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Incomplete</p>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {stats.incomplete}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Students with pending tasks
            </p>
          </div>
        </div>
      </div>

      {/* Bottom portion */}
      <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto lg:grid-cols-3">
        {/* Submissions */}
        <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <h2 className="flex items-center border-b border-slate-200 px-6 py-4 text-lg font-semibold text-slate-800">
            Recent Submissions
          </h2>

          <div className="p-0">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">ID Number</th>
                  <th className="px-6 py-3">Program</th>
                  {/* <th className="px-6 py-3 text-right">Action</th> */}
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((submission) => (
                    <tr
                      key={submission.assignedTaskId}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {submission.studentName || "Unknown Student"}
                      </td>
                      <td className="px-6 py-4">{submission.studentId}</td>
                      <td className="px-6 py-4">{submission.course}</td>
                      <td className="px-6 py-4 text-right">
                        {/* <button className="rounded bg-[#1c3a76] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0a1128]">
                          Review
                        </button> */}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      No recent submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Recent Activity
            </h2>
          </div>
          <div className="flex-1 p-6">
            <ul className="space-y-4 text-sm text-slate-600">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => {
                  const isApproved =
                    activity.actions?.toLowerCase() === "sign clearance" ||
                    activity.actions?.toLowerCase() === "signed";

                  const timeDate = new Date(activity.created_at);
                  const formattedTime = timeDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <li key={index} className="flex gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          isApproved
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {isApproved ? "✓" : "!"}
                      </span>
                      <div>
                        <p>
                          <span className="font-medium text-slate-800">
                            {activity.message}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400">
                          Today at {formattedTime}
                        </p>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="py-4 text-center text-slate-400">
                  No recent activity to display.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
