"use client";

import React, { useState } from "react";
import {
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  ExternalLink,
  User,
  MessageSquareWarning,
  Building2
} from "lucide-react";
import TaskSubmissionModal from "../task-submission-modal"; // Adjust path if needed

export type getDepartmentDetailsPromise = {
  assigned_task_id: number;
  title: string;
  description: string;
  status: string | null;
  assigned_at: string | null;
  uploaded_at: string | null;
  comments: string | null;
  dropbox: string | null;
  department: string;
}[];

type SingleTask = getDepartmentDetailsPromise[0];

interface TasksPageProps {
  task: getDepartmentDetailsPromise;
  studentId?: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

export default function TasksPage({ task: tasks, studentId = "" }: TasksPageProps) {
  const [activeTask, setActiveTask] = useState<SingleTask | null>(null);

  const formatDateInfo = (dateString: string | null) => {
    if (!dateString) return { formatted: "" };
    const date = new Date(dateString);
    return { formatted: DATE_FORMATTER.format(date) };
  };

  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-6">
      {tasks && tasks.length > 0 ? (
        tasks.map((t) => {
          const { formatted: dateText } = formatDateInfo(t.assigned_at);

          // Confidential check based on title/description
          const isConfidential =
            t.description?.toLowerCase().includes("personally") ||
            t.title?.toLowerCase().includes("confidential");

          // Status and submission type normalization
          const effectiveStatus = t.status === "Flagged" ? "Submitted" : t.status || "Pending";
          const isPending = effectiveStatus === "Pending";
          const isCleared = effectiveStatus === "Cleared";
          const isSubmitted = effectiveStatus === "Submitted";
          const isRejected = effectiveStatus === "Rejected";

          const hasDropbox =
            t.dropbox &&
            t.dropbox.trim() !== "" &&
            t.dropbox.toLowerCase() !== "null";

          const originallyRequiredDropbox = hasDropbox || isRejected;
          const isInPerson = !hasDropbox && !isRejected && !isCleared;
          const isDigital = originallyRequiredDropbox;

          return (
            <div
              key={t.assigned_task_id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">

                {/* --- Left Column: Text Content --- */}
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${isCleared ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
                      {t.title}
                    </h3>
                    {isConfidential && <Lock size={14} className="stroke-[2.5px] text-amber-500" />}
                  </div>

                  <p className="max-w-4xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {t.description}
                  </p>
                  {isInPerson && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200/70 p-3 dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-300">
                      <User size={15} className="shrink-0 text-slate-400 mt-0.5" />
                      <p className="text-xs text-slate-600 leading-relaxed dark:text-slate-300">
                        No digital upload required — please complete this requirement in person at the department office.
                      </p>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Building2 size={14} className="text-slate-400" />
                      <span>{t.department}</span>
                    </div>

                    {t.assigned_at && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{dateText}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* --- Right Column: Badges & Actions --- */}
                <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">

                  {/* Status Badge */}
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide border ${
                      isRejected ? "bg-rose-50 border-rose-200/80 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300" :
                      isCleared ? "bg-emerald-50 border-emerald-200/80 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-300" :
                      isSubmitted ? "bg-sky-50 border-sky-200/80 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800/80 dark:text-sky-300" :
                      "bg-amber-50 border-amber-200/80 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/80 dark:text-amber-300"
                    }`}
                  >
                    {isCleared && <CheckCircle2 size={14} className="stroke-[2.5px] text-emerald-600 dark:text-emerald-400" />}
                    {isRejected && <AlertCircle size={14} className="stroke-[2.5px] text-rose-600 dark:text-rose-400" />}
                    {isSubmitted && <FileText size={14} className="stroke-[2.5px] text-sky-600 dark:text-sky-400" />}
                    {isPending && <Clock size={14} className="stroke-[2.5px] text-amber-600 dark:text-amber-400" />}
                    <span>{effectiveStatus}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto">
                    {isInPerson && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <User size={13} />
                        <span>In-person</span>
                      </div>
                    )}
                    {isPending && isDigital && (
                      <button
                        onClick={() => setActiveTask(t)}
                        className="rounded-xl bg-[#0B192C] px-4 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#1A2E46] cursor-pointer dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950"
                      >
                        Submit Document
                      </button>
                    )}
                    {isRejected && (
                      <button
                        onClick={() => setActiveTask(t)}
                        className="rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100/70 cursor-pointer dark:bg-rose-950/50 dark:border-rose-800/80 dark:text-rose-200 dark:hover:bg-rose-900/50"
                      >
                        Fix & Resubmit
                      </button>
                    )}
                    {isSubmitted && isDigital && t.dropbox && (
                      <a
                        href={t.dropbox}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <ExternalLink size={13} className="text-slate-400 dark:text-slate-400" />
                        <span>View Document</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Rejection Comments */}
              {isRejected && t.comments && (
                <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/60 p-3.5 text-xs dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200">
                  <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div className="flex flex-col">
                    <span className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Department Remark</span>
                    <span className="text-rose-900 leading-relaxed font-medium dark:text-rose-200">{t.comments}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-400">
          <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No clearance tasks assigned</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">All departmental requirements will appear here once requested.</p>
        </div>
      )}

      {/* Submission Modal */}
      {activeTask && (
        <TaskSubmissionModal
          isOpen={!!activeTask}
          onClose={() => setActiveTask(null)}
          taskTitle={activeTask.title}
          taskId={activeTask.assigned_task_id}
          deptName={activeTask.department}
          studentId={studentId}
        />
      )}
    </div>
  );
}
