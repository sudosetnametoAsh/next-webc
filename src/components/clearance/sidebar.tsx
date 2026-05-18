import { useState } from "react";
import {
  getClearanceRecordsPromise,
} from "@/modules/clearance/application/repository/dashboard-repository";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  X,
  ExternalLink,
  MessageSquareWarning,
  User
} from "lucide-react";
import TaskSubmissionModal from "./task-submission-modal";
import { getDepartmentDetailsPromise } from "@/modules/clearance/application/repository/department-repository";

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
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50">
              <ShieldCheck className="text-pink-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedRecord.department}
              </h2>
              <p className="text-sm text-gray-500">{selectedRecord.staff}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedRecord(null)}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="text-gray-500" size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-8 rounded-xl border bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold tracking-wider text-gray-500 uppercase">
              Department Information
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Clock size={16} className="text-gray-400" />
                <span>{`${selectedRecord.time_in}AM - ${selectedRecord.time_out}`}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wider text-gray-500 uppercase">
              Assigned Tasks
            </h3>
            <div className="flex flex-col gap-3">
              {departmentTasks.map((task) => {
                // Determine effective status (Flagged appears as Submitted to the client)
                const effectiveStatus = task.status === "Flagged" ? "Submitted" : task.status;

                const isPending = effectiveStatus === "Pending";
                const isCleared = effectiveStatus === "Cleared";
                const isSubmitted = effectiveStatus === "Submitted";
                const isRejected = effectiveStatus === "Rejected";

                // Determine submission type based on dropbox nullability
                const isPhysical = task.dropbox === null;
                const isDigital = task.dropbox !== null;

                return (
                  <div
                    key={task.assigned_task_id}
                    className={`flex flex-col gap-3 rounded-xl border p-4 transition-all ${
                      isRejected
                        ? "border-red-200 bg-red-50/30"
                        : isCleared
                        ? "border-green-100 bg-green-50/30"
                        : "hover:border-blue-200 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {isCleared && <CheckCircle2 className="text-green-500" size={20} />}
                        {isRejected && <AlertCircle className="text-red-500" size={20} />}
                        {isSubmitted && <Clock size={20} className="text-gray-400" />}
                        {isPending && <FileText className="text-gray-400" size={20} />}

                        <div className="flex flex-col">
                          <span
                            className={`text-sm font-semibold ${
                              isCleared ? "text-gray-500 line-through" : "text-gray-900"
                            }`}
                          >
                            {task.title}
                          </span>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-tight ${
                              isRejected
                                ? "text-red-600"
                                : isSubmitted
                                ? "text-gray-400"
                                : isCleared
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            {effectiveStatus}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Pending Actions */}
                        {isPending && isDigital && (
                          <button
                            onClick={() => setActiveTask(task)} // Trigger Modal
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                          >
                            Submit
                          </button>
                        )}
                        {isPending && isPhysical && (
                          <div className="flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-[11px] font-medium text-gray-600">
                            <User size={14} />
                            <span>In-person</span>
                          </div>
                        )}

                        {/* Rejected Actions */}
                        {isRejected && (
                          <button
                            onClick={() => setActiveTask(task)} // Trigger Modal
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Fix & Resubmit
                          </button>
                        )}

                        {/* Submitted Actions */}
                        {isSubmitted && isDigital && task.dropbox && (
                          <a
                            href={task.dropbox}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-amber-50 transition-colors"
                          >
                            <ExternalLink size={14} />
                            <span>View Document</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Rejection Comments */}
                    {isRejected && task.comments && (
                      <div className="mt-1 flex items-start gap-2 rounded-lg bg-red-100/50 p-3 text-sm text-red-800">
                        <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-red-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase text-red-600 mb-0.5">Department Comment</span>
                          <span>{task.comments}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
