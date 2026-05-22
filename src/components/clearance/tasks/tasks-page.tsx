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

export default function TasksPage({ task: tasks, studentId = "" }: TasksPageProps) {
  const [activeTask, setActiveTask] = useState<SingleTask | null>(null);

  const formatDateInfo = (dateString: string | null) => {
    if (!dateString) return { formatted: "" };
    const date = new Date(dateString);

    const formatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);

    return { formatted };
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
          const isPhysical = !isDigital;

          return (
            <div
              key={t.assigned_task_id}
              className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">

                {/* --- Left Column: Text Content --- */}
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-[15px] font-bold ${isCleared ? "text-gray-500 line-through" : "text-gray-900"}`}>
                      {t.title}
                    </h3>
                    {isConfidential && <Lock size={14} className="stroke-[2.5px] text-amber-500" />}
                  </div>

                  <p className="max-w-4xl text-[13px] leading-relaxed text-gray-500">
                    {t.description}
                  </p>
                  {isInPerson && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                      <User size={14} className="shrink-0 text-slate-400 mt-0.5" />
                      <p className="text-[12px] text-slate-500 leading-relaxed">
                        No file upload required — please complete this requirement in person at the department office.
                      </p>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Building2 size={14} />
                      <span>{t.department}</span>
                    </div>

                    {t.assigned_at && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar size={14} />
                        <span>{dateText}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* --- Right Column: Badges & Actions --- */}
                <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">

                  {/* Status Badge */}
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                      isRejected ? "bg-red-50 text-red-700" :
                      isCleared ? "bg-green-50 text-green-700" :
                      isSubmitted ? "bg-blue-50 text-blue-700" :
                      "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {isCleared && <CheckCircle2 size={14} className="stroke-[2.5px]" />}
                    {isRejected && <AlertCircle size={14} className="stroke-[2.5px]" />}
                    {isSubmitted && <FileText size={14} className="stroke-[2.5px]" />}
                    {isPending && <Clock size={14} className="stroke-[2.5px]" />}
                    <span>{effectiveStatus}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto">
                    {isInPerson && (
                      <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-600">
                        <User size={14} />
                        <span>In-person</span>
                      </div>
                    )}
                    {isPending && isDigital && (
                      <button
                        onClick={() => setActiveTask(t)}
                        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                      >
                        Submit
                      </button>
                    )}
                    {isRejected && (
                      <button
                        onClick={() => setActiveTask(t)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        Fix & Resubmit
                      </button>
                    )}
                    {isSubmitted && isDigital && t.dropbox && (
                      <a
                        href={t.dropbox}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <ExternalLink size={14} />
                        <span>View Document</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Rejection Comments */}
              {isRejected && t.comments && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                  <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-red-500" />
                  <div className="flex flex-col">
                    <span className="mb-0.5 text-xs font-bold uppercase text-red-600">Department Comment</span>
                    <span className="text-red-800">{t.comments}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500">
          No tasks available at the moment.
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
