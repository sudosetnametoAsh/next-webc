import { Students } from "@/types/student/student-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  ChevronDown,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  Minus,
  Upload,
  AlertTriangle,
} from "lucide-react";
import DropBox from "./dropbox";
import { Button } from "../ui/button";

export default function ClearanceItem({
  students,
  id,
}: {
  students: Students;
  id: string;
}) {
  const getDeptPriority = (deptName: string): number => {
    const lowerName = deptName.toLowerCase();
    if (lowerName === "cashier") return 0;
    if (lowerName === "registrar") return 999;
    return 1;
  };

  const sortedStudents = [...students].sort((a, b) => {
    const deptA = a.clearance_templates.departments.dept_name;
    const deptB = b.clearance_templates.departments.dept_name;
    const priorityA = getDeptPriority(deptA);
    const priorityB = getDeptPriority(deptB);
    if (priorityA !== priorityB) return priorityA - priorityB;
    return deptA.toLowerCase().localeCompare(deptB.toLowerCase());
  });

  return (
    <div className="flex w-full flex-col gap-4">
      {sortedStudents.map((item) => {
        const deptName = item.clearance_templates.departments.dept_name;
        const staffName = item.clearance_templates.staffs.staff_name;
        const taskTotal = item.assigned_tasks.length;
        const isSigned = item.status === "Signed";

        const pendingTask = item.assigned_tasks.reduce(
          (acc, curr) => {
            if (
              curr.dropbox === "pending" ||
              curr.dropbox === null ||
              curr.status === "Resubmit" ||
              curr.status === "Flagged"
            ) {
              acc.Task++;
            }
            return acc;
          },
          { Task: 0 },
        );

        return (
          <Accordion
            type="multiple"
            key={item.clearance_id}
            className="w-full"
            defaultValue={
              deptName === "Cashier" ? [item.clearance_id.toString()] : []
            }
          >
            <AccordionItem
              value={item.clearance_id.toString()}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Outer Trigger: Department */}
              <AccordionTrigger
                className={`flex w-full cursor-pointer flex-row items-center justify-between p-6 transition-colors hover:bg-slate-50 hover:no-underline ${
                  taskTotal === 0 ? "pointer-events-none" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex w-6 justify-center">
                    {taskTotal !== 0 && (
                      <ChevronDown
                        className="transition-transform duration-200 group-data-[state=open]:rotate-180"
                        color="#000000"
                        size={20}
                      />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-base font-bold text-slate-900">
                      {deptName}
                    </span>
                    <span className="text-xs font-medium text-[#60A5FA]">
                      {staffName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {pendingTask.Task !== 0 && (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                      {pendingTask.Task} Tasks
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                      isSigned
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {isSigned ? "Signed" : "Pending"}
                  </span>
                </div>
              </AccordionTrigger>

              {/* Outer Content: Task List */}
              <AccordionContent className="border-t border-slate-100 bg-slate-50/30 p-6 pb-6">
                <Accordion type="multiple" className="flex flex-col gap-4">
                  {item.assigned_tasks.map((task) => {
                    const isCompleted =
                      task.status === "Completed" || task.status === "Cleared";
                    const isResubmit =
                      task.status === "Resubmit" || task.status === "Flagged";
                    const needsUpload =
                      task.dropbox === "pending" ||
                      task.dropbox === "NULL" ||
                      isResubmit;

                    const displayTitle = task.title || "Untitled Task";

                    return (
                      <AccordionItem
                        key={task.assigned_task_id}
                        value={task.assigned_task_id.toString()}
                        className={`group/task rounded-lg border bg-white ${
                          isResubmit ? "border-rose-200" : "border-slate-200"
                        }`}
                      >
                        {/* Inner Trigger: Task Title */}
                        <AccordionTrigger
                          className={`flex w-full cursor-pointer flex-row items-center justify-between p-4 transition-all hover:bg-slate-50 hover:no-underline group-data-[state=open]/task:border-b group-data-[state=open]/task:border-slate-100 ${
                            task.dropbox === "NULL" && !isResubmit
                              ? "pointer-events-none"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {task.dropbox === "NULL" && !isResubmit ? (
                              isCompleted ? (
                                <CircleCheckBig color="#06B6D4" size={20} />
                              ) : (
                                <Minus color="#94A3B8" size={20} />
                              )
                            ) : isResubmit ? (
                              <CircleAlert
                                className="text-rose-500"
                                size={20}
                              />
                            ) : task.dropbox === "pending" ? (
                              <Circle color="#94A3B8" size={20} />
                            ) : (
                              <CircleCheckBig color="#06B6D4" size={20} />
                            )}

                            <span
                              className={`${
                                isSigned || isCompleted
                                  ? "line-through text-slate-400"
                                  : isResubmit
                                  ? "text-rose-700"
                                  : "text-slate-800"
                              } text-sm font-bold`}
                            >
                              {displayTitle}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            {isResubmit && (
                              <span className="rounded bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                                Action Needed
                              </span>
                            )}
                            {!needsUpload && !isResubmit && (
                              <div className="flex items-center justify-center gap-1.5 rounded bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white">
                                <Upload size={12} strokeWidth={3} />
                                <span>Submitted</span>
                              </div>
                            )}
                            {(task.dropbox !== "NULL" || isResubmit) && (
                              <ChevronDown
                                className="text-slate-400 transition-transform duration-200 group-data-[state=open]/task:rotate-180"
                                size={18}
                              />
                            )}
                          </div>
                        </AccordionTrigger>

                        {/* Inner Content: Task Description & Details */}
                        <AccordionContent>
                          <div className="flex flex-col gap-6 p-5">
                            {/* Staff Comment/Feedback Box for Resubmissions */}
                            {isResubmit && task.comments && (
                              <div className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50 p-4">
                                <AlertTriangle
                                  size={18}
                                  className="mt-0.5 shrink-0 text-rose-500"
                                />
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-bold text-rose-900">
                                    Staff Feedback
                                  </span>
                                  <span className="text-sm leading-relaxed text-rose-700">
                                    {task.comments}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Actual Database Description */}
                            {task.description && (
                              <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50/50 p-4 border border-slate-100">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Instructions
                                </span>
                                <span className="text-sm leading-relaxed text-slate-700">
                                  {task.description}
                                </span>
                              </div>
                            )}

                            {!needsUpload && task.uploaded_at && (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-500">
                                  <CircleCheck size={18} />
                                  Completed
                                </span>
                                <span className="text-xs text-slate-400">
                                  • {task.uploaded_at}
                                </span>
                              </div>
                            )}

                            {/* STRUCTURED UPLOAD / ACTION BANNER */}
                            {needsUpload ? (
                              <div
                                className={`mt-2 flex items-center justify-between rounded-lg border p-4 shadow-sm ${
                                  isResubmit
                                    ? "border-rose-200 bg-rose-50/50"
                                    : "border-blue-100 bg-blue-50/50"
                                }`}
                              >
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`flex items-center gap-1.5 text-sm font-bold ${
                                      isResubmit
                                        ? "text-rose-700"
                                        : "text-blue-700"
                                    }`}
                                  >
                                    <CircleAlert size={16} />
                                    {isResubmit
                                      ? "Correction Required"
                                      : "Upload Required"}
                                  </span>
                                  <span
                                    className={`text-xs ${
                                      isResubmit
                                        ? "text-rose-600"
                                        : "text-blue-600"
                                    }`}
                                  >
                                    {isResubmit
                                      ? "Please submit a revised file based on the feedback."
                                      : "Please provide the requested document to proceed."}
                                  </span>
                                </div>
                                <div className="shrink-0 pl-4">
                                  <DropBox
                                    task={displayTitle}
                                    taskId={task.assigned_task_id}
                                    deptName={deptName}
                                    studentId={id}
                                    dropbox={task.dropbox}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                                    <CircleCheckBig size={16} />
                                    Document Submitted
                                  </span>
                                  <span className="text-xs text-emerald-600">
                                    Your file has been uploaded successfully.
                                  </span>
                                </div>
                                <div className="shrink-0 pl-4">
                                  <Button
                                    className="w-24 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                                    asChild
                                  >
                                    <a
                                      href={`${task.dropbox}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      View File
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}
    </div>
  );
}
