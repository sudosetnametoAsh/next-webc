"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { getClearanceRecordsPromise } from "@/modules/clearance/application/repository/dashboard-repository";
import { makeGetDepartmentDetails } from "@/composition/clearance/make-get-department-details";
import Sidebar from "./sidebar";
import { getDepartmentDetailsPromise } from "@/modules/clearance/application/repository/department-repository";

export default function DepartmenList({
  records,
}: {
  records: getClearanceRecordsPromise;
}) {
  const getDepartmentDetails = makeGetDepartmentDetails();

  const [selectedRecord, setSelectedRecord] = useState<
    getClearanceRecordsPromise[0] | null
  >(null);

  const [departmentTasks, setDepartmentTasks] =
    useState<getDepartmentDetailsPromise>([]);

  const getDepartmentTasks = async (item: getClearanceRecordsPromise[0]) => {
    setSelectedRecord(item);

    try {
      const departmentTasks = await getDepartmentDetails.execute(item.staff_id);
      console.log(departmentTasks);
      setDepartmentTasks(departmentTasks);
    } catch (error) {
      alert("Failed to fetch tasks");
      console.error(error);
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    if (a.department === "Cashier") return -1; // 'a' moves to the front
    if (b.department === "Cashier") return 1;  // 'b' moves to the front
    if (a.department === "Registrar") return 1;  // 'a' moves to the back
    if (b.department === "Registrar") return -1; // 'b' moves to the back
    return 0;
  });

  return (
    <>
      {/* DEPT LIST */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedRecords.map((item) => {
          const hasTasks = item.task_count > 0;
          const percentage = hasTasks
            ? Math.round((item.cleared_task / item.task_count) * 100)
            : 0;
          
          const isSigned = item.status.toLowerCase() === "signed" || item.status.toLowerCase() === "cleared";
          const isPending = item.status.toLowerCase() === "pending";
          const isIncomplete = item.status.toLowerCase() === "incomplete";

          const allCompleted = isSigned || (hasTasks && item.cleared_task === item.task_count);

          return (
            <div
              key={item.clearance_id}
              onClick={() => item.task_count > 0 && getDepartmentTasks(item)}
              className={`group flex flex-col gap-5 rounded-2xl border bg-white p-6 shadow-sm transition-all dark:bg-slate-900/90 ${item.task_count > 0
                  ? `cursor-pointer hover:-translate-y-0.5 hover:shadow-lg ${isSigned
                    ? "border-emerald-200 hover:border-emerald-400 dark:border-emerald-800/60 dark:hover:border-emerald-700"
                    : (isPending || isIncomplete)
                      ? "border-amber-200 hover:border-amber-400 dark:border-amber-800/60 dark:hover:border-amber-700"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  }`
                  : "cursor-not-allowed border-slate-100 dark:border-slate-800/60"
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 flex-none items-center justify-center rounded-xl transition-colors ${isSigned
                        ? "bg-emerald-50 group-hover:bg-emerald-100 dark:bg-emerald-950/40 dark:group-hover:bg-emerald-900/50"
                        : (isPending || isIncomplete)
                          ? "bg-amber-50 group-hover:bg-amber-100 dark:bg-amber-950/40 dark:group-hover:bg-amber-900/50"
                          : "bg-slate-50 group-hover:bg-slate-100 dark:bg-slate-800 dark:group-hover:bg-slate-750"
                      }`}
                  >
                    <ShieldCheck
                      className={`h-7 w-7 ${isSigned
                          ? "text-emerald-600 dark:text-emerald-400"
                          : (isPending || isIncomplete)
                            ? "text-amber-500 dark:text-amber-400"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg leading-tight font-extrabold text-slate-900 dark:text-slate-100">
                      {item.department}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {item.staff}
                    </span>
                  </div>
                </div>

                {/* Dynamic Status Badge */}
                {isSigned ? (
                  <span className="flex-none rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold tracking-wide text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/60">
                    Signed
                  </span>
                ) : (isPending || isIncomplete) ? (
                  <span className="flex-none rounded-full bg-amber-100 px-3 py-1 text-xs font-bold tracking-wide text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-800/60">
                    {isIncomplete ? "Incomplete" : "Pending"}
                  </span>
                ) : null}
              </div>

              {hasTasks ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {item.cleared_task}/{item.task_count} tasks
                    </span>
                    <span
                      className={`text-lg font-bold text-slate-900 dark:text-slate-100 ${allCompleted ? "text-emerald-600 dark:text-emerald-400" : ""
                        }`}
                    >
                      {percentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${allCompleted ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex h-10 items-center justify-center border-t border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">
                    No tasks assigned.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedRecord && (
        <Sidebar
          selectedRecord={selectedRecord}
          departmentTasks={departmentTasks}
          setSelectedRecord={setSelectedRecord}
          studentId="02000609703"
        />
      )}
    </>
  );
}
