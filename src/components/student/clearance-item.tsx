"use client";

import React from "react";
import { Students } from "@/types/client/student-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  ExternalLink,
  MessageSquareWarning,
  FileText,
} from "lucide-react";
import DropBox from "./dropbox";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export default function ClearanceItem({
  students,
  id,
}: {
  students: Students;
  id: string;
}) {
  const sortedStudents = [...students].sort((a, b) => {
    const orderA =
      a.signing_order ?? a.clearance_templates.departments.signing_order ?? 2;
    const orderB =
      b.signing_order ?? b.clearance_templates.departments.signing_order ?? 2;
    if (orderA !== orderB) return orderA - orderB;
    return a.clearance_templates.departments.dept_name.localeCompare(
      b.clearance_templates.departments.dept_name
    );
  });

  return (
    <div className="flex w-full flex-col gap-4">
      {sortedStudents.map((item) => {
        const deptName = item.clearance_templates.departments.dept_name;
        const staffName = item.clearance_templates.staffs.staff_name;
        const taskTotal = item.clearance_tasks.length;
        const isSigned = item.status === "Signed";

        const pendingCount = item.clearance_tasks.filter(
          (t) =>
            t.dropbox === "pending" ||
            t.dropbox === null ||
            t.status === "Resubmit" ||
            t.status === "Flagged"
        ).length;

        const hasActionNeeded = item.clearance_tasks.some(
          (t) => t.status === "Resubmit" || t.status === "Flagged"
        );

        return (
          <Accordion
            type="multiple"
            key={item.clearance_id}
            className="w-full"
            defaultValue={[item.clearance_id.toString()]}
          >
            <AccordionItem
              value={item.clearance_id.toString()}
              className={cn(
                "group overflow-hidden rounded-2xl border bg-white shadow-xs transition-colors duration-150 dark:bg-slate-900/80 dark:border-slate-800",
                isSigned
                  ? "border-emerald-200/90 dark:border-emerald-900/60"
                  : hasActionNeeded
                  ? "border-rose-300 dark:border-rose-900/60"
                  : "border-slate-200/90 dark:border-slate-800"
              )}
            >
              {/* Department Header Trigger */}
              <AccordionTrigger className="flex w-full cursor-pointer items-center justify-between px-5 py-4.5 sm:px-6 hover:bg-slate-50/70 hover:no-underline dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-3.5 text-left">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-2xs",
                      isSigned
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : hasActionNeeded
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-[#0B192C] text-amber-400 dark:bg-[#0B192C] dark:text-amber-400"
                    )}
                  >
                    {deptName.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900 tracking-tight dark:text-slate-100">
                        {deptName}
                      </span>
                      {hasActionNeeded && (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          Correction Required
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium dark:text-slate-400">
                      Officer: {staffName || "Department Representative"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Task Count Badge */}
                  {taskTotal > 0 && !isSigned && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {pendingCount > 0
                        ? `${pendingCount} of ${taskTotal} pending`
                        : "All tasks submitted"}
                    </span>
                  )}

                  {/* Status Pill */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                      isSigned
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-300"
                        : hasActionNeeded
                        ? "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300"
                        : "bg-amber-100 text-amber-900 border border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/80 dark:text-amber-300"
                    )}
                  >
                    {isSigned ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Officially Endorsed</span>
                      </>
                    ) : hasActionNeeded ? (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        <span>Action Required</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Pending Sign-off</span>
                      </>
                    )}
                  </span>

                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </AccordionTrigger>

              {/* Requirements & Action Checklist */}
              <AccordionContent className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
                {item.clearance_tasks.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>
                      No specific file uploads required for this department. Verification is completed directly by the officer during office review.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {item.clearance_tasks.map((task) => {
                      const isCompleted =
                        task.status === "Completed" || task.status === "Cleared";
                      const isResubmit =
                        task.status === "Resubmit" || task.status === "Flagged";
                      const needsUpload =
                        task.dropbox === "pending" ||
                        task.dropbox === "NULL" ||
                        task.dropbox === null ||
                        isResubmit;

                      const displayTitle = task.title || "Clearance Requirement";

                      return (
                        <div
                          key={task.assigned_task_id}
                          className={cn(
                            "flex flex-col gap-3 rounded-xl border bg-white p-4 sm:p-5 shadow-2xs transition-colors dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-slate-200",
                            isResubmit
                              ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/60 dark:bg-rose-950/30"
                              : isSigned || isCompleted
                              ? "border-emerald-200/70 dark:border-emerald-900/50"
                              : "border-slate-200/80"
                          )}
                        >
                          {/* Task Top Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 shrink-0">
                                {isSigned || isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                ) : isResubmit ? (
                                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                                )}
                              </div>

                              <div>
                                <h4
                                  className={cn(
                                    "text-sm font-bold tracking-tight",
                                    isSigned || isCompleted
                                      ? "text-slate-700 dark:text-slate-300"
                                      : isResubmit
                                      ? "text-rose-950 font-extrabold dark:text-rose-200"
                                      : "text-slate-900 dark:text-slate-100"
                                  )}
                                >
                                  {displayTitle}
                                </h4>
                                {task.description && (
                                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed dark:text-slate-400">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Status Tag & Direct Action Button */}
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              {needsUpload ? (
                                <DropBox
                                  task={displayTitle}
                                  taskId={task.assigned_task_id}
                                  deptName={deptName}
                                  studentId={id}
                                  dropbox={task.dropbox}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-300">
                                    <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Submitted
                                  </span>

                                  {task.dropbox && task.dropbox !== "NULL" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:bg-[#1A2E46] dark:hover:bg-[#253D5C] dark:text-white dark:border-slate-700"
                                      asChild
                                    >
                                      <a
                                        href={`${task.dropbox}`}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <span>View</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Staff Remarks / Resubmission Feedback Box */}
                          {isResubmit && task.comments && (
                            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200">
                              <MessageSquareWarning className="h-4 w-4 text-rose-600 shrink-0 mt-0.5 dark:text-rose-400" />
                              <div>
                                <span className="font-bold text-rose-900 dark:text-rose-200">
                                  Staff Remarks:
                                </span>{" "}
                                <span className="text-rose-800 leading-relaxed dark:text-rose-300">
                                  {task.comments}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}
    </div>
  );
}
