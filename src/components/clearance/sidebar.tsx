import { useState } from "react";
import {
  getClearanceRecordsPromise,
} from "@/modules/clearance/application/repository/dashboard-repository";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
  MessageSquareWarning,
  Calendar,
  Eye,
  UserCheck,
  XCircle,
  RotateCcw,
} from "lucide-react";
import TaskSubmissionModal from "./task-submission-modal";
import { getDepartmentDetailsPromise } from "@/modules/clearance/application/repository/department-repository";

const getStatusConfig = (status: string) => {
  switch (status) {
    case "Cleared":
      return { bg: "bg-emerald-50", text: "text-emerald-600", label: "Cleared" };
    case "Flagged":
    case "Submitted":
      return { bg: "bg-blue-50", text: "text-blue-600", label: "Submitted" };
    case "Pending":
      return { bg: "bg-amber-50", text: "text-amber-600", label: "Pending" };
    case "Rejected":
      return { bg: "bg-red-50", text: "text-red-600", label: "Rejected" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-600", label: status };
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function Sidebar({
  selectedRecord,
  departmentTasks,
  setSelectedRecord,
  studentId,
}: {
  selectedRecord: getClearanceRecordsPromise[0];
  departmentTasks: getDepartmentDetailsPromise;
  setSelectedRecord: React.Dispatch<
    React.SetStateAction<getClearanceRecordsPromise[0] | null>
  >;
  studentId: string;
}) {
  const [activeTask, setActiveTask] = useState<typeof departmentTasks[0] | null>(null);

  if (!selectedRecord) return null;

  return (
    <section className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity">
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          selectedRecord ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <ShieldCheck className="text-blue-600" size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {selectedRecord.department}
              </h2>
              <p className="text-sm font-medium text-slate-500 truncate">
                {selectedRecord.staff}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedRecord(null)}
            className="rounded-full p-2 hover:bg-slate-100 transition-colors"
          >
            <X className="text-slate-400" size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Department Information */}
          <section>
            <h3 className="mb-4 text-xs font-bold tracking-wider text-slate-400 uppercase">
              Department Information
            </h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-100">
                  <Clock size={16} className="text-slate-400" />
                </div>
                {selectedRecord.time_in && selectedRecord.time_out ? (
                  <span>{`${selectedRecord.time_in}AM - ${selectedRecord.time_out}`}</span>
                ) : (
                  <span className="italic text-slate-400">No schedule set</span>
                )}
              </div>
            </div>
          </section>

          {/* Assigned Tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Assigned Tasks
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                {departmentTasks.length} {departmentTasks.length === 1 ? "TASK" : "TASKS"}
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {departmentTasks.map((task) => {
                const effectiveStatus =
                  task.status === "Flagged" ? "Submitted" : task.status || "Pending";
                const statusCfg = getStatusConfig(effectiveStatus);

                const isPending = effectiveStatus === "Pending";
                const isCleared = effectiveStatus === "Cleared";
                const isSubmitted = effectiveStatus === "Submitted";
                const isRejected = effectiveStatus === "Rejected";

                const hasDropbox =
                  task.dropbox &&
                  task.dropbox.trim() !== "" &&
                  task.dropbox.toLowerCase() !== "null";

                // Improved logic mirroring task-view:
                // A task originally required a dropbox if it currently has one,
                // OR if it's rejected (meaning the previous dropbox submission was rejected)
                const originallyRequiredDropbox = hasDropbox || isRejected;

                // It's in-person ONLY if it has no dropbox, is not rejected, and not cleared
                const isInPerson = !hasDropbox && !isRejected && !isCleared;

                // For pending actions logic
                const isDigital = originallyRequiredDropbox;

                return (
                  <div
                    key={task.assigned_task_id}
                    className="group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:border-slate-300"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <h4
                              className={`text-sm font-bold leading-tight break-words ${
                                isCleared ? "text-slate-400 line-through" : "text-slate-900"
                              }`}
                            >
                              {task.title}
                            </h4>
                            <span
                              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCfg.bg} ${statusCfg.text}`}
                            >
                              {statusCfg.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {isInPerson && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                                <UserCheck size={10} />
                                In-Person
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                <XCircle size={10} />
                                Action Required
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p
                              className={`text-xs leading-relaxed ${
                                isCleared ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {task.description}
                            </p>
                          )}

                          {/* In-person note */}
                          {isInPerson && (
                            <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                              <UserCheck size={14} className="shrink-0 text-slate-400 mt-0.5" />
                              <p className="text-xs text-slate-500 leading-relaxed">
                                No file upload required — please complete this requirement in person at the department office.
                              </p>
                            </div>
                          )}

                          {/* Rejection Note */}
                          {isRejected && task.comments && (
                            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3">
                              <MessageSquareWarning
                                size={14}
                                className="shrink-0 text-red-500 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">
                                  Feedback
                                </p>
                                <p className="text-xs text-red-700 leading-relaxed">
                                  {task.comments}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        <Calendar size={12} />
                        Assigned {formatDate(task.assigned_at)}
                      </span>

                      <div className="flex items-center gap-2">
                        {isPending && isDigital && (
                          <button
                            onClick={() => setActiveTask(task)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                          >
                            Submit
                          </button>
                        )}

                        {isRejected && (
                          <button
                            onClick={() => setActiveTask(task)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
                          >
                            <RotateCcw size={12} />
                            Resubmit
                          </button>
                        )}

                        {isSubmitted && isDigital && task.dropbox && (
                          <a
                            href={task.dropbox}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-slate-50 transition-colors"
                          >
                            <Eye size={12} />
                            View
                          </a>
                        )}

                        {isCleared && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 uppercase tracking-tight">
                            <CheckCircle2 size={14} />
                             Cleared
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Render the modal ONLY if a task is active. Pass the necessary details. */}
      {activeTask && (
        <TaskSubmissionModal
          isOpen={!!activeTask}
          onClose={() => setActiveTask(null)}
          taskTitle={activeTask.title}
          taskId={activeTask.assigned_task_id}
          deptName={selectedRecord.department}
          studentId={studentId}
        />
      )}
    </section>
  );
}
