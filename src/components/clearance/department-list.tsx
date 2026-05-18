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
              className={`group flex flex-col gap-5 rounded-[2rem] border bg-white p-7 shadow-sm transition-all ${item.task_count > 0
                  ? `cursor-pointer hover:-translate-y-0.5 hover:shadow-xl ${isSigned
                    ? "border-green-200 hover:border-green-400"
                    : (isPending || isIncomplete)
                      ? "border-amber-200 hover:border-amber-400"
                      : "border-slate-200 hover:border-slate-300"
                  }`
                  : "cursor-not-allowed border-slate-100"
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div
                    className={`flex h-16 w-16 flex-none items-center justify-center rounded-[1.25rem] transition-colors ${isSigned
                        ? "bg-green-50 group-hover:bg-green-100"
                        : (isPending || isIncomplete)
                          ? "bg-amber-50 group-hover:bg-amber-100"
                          : "bg-slate-50 group-hover:bg-slate-100"
                      }`}
                  >
                    <ShieldCheck
                      className={`h-8 w-8 ${isSigned
                          ? "text-green-600"
                          : (isPending || isIncomplete)
                            ? "text-amber-500"
                            : "text-slate-400"
                        }`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl leading-tight font-extrabold text-gray-950">
                      {item.department}
                    </span>
                    <span className="text-sm font-medium text-gray-500">
                      {item.staff}
                    </span>
                  </div>
                </div>

                {/* Dynamic Status Badge */}
                {isSigned ? (
                  <span className="flex-none rounded-full bg-green-100 px-3 py-1 text-xs font-bold tracking-wide text-green-700">
                    Signed
                  </span>
                ) : (isPending || isIncomplete) ? (
                  <span className="flex-none rounded-full bg-amber-100 px-3 py-1 text-xs font-bold tracking-wide text-amber-700">
                    {isIncomplete ? "Incomplete" : "Pending"}
                  </span>
                ) : null}
              </div>

              {hasTasks ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-gray-400">
                      {item.cleared_task}/{item.task_count} tasks
                    </span>
                    <span
                      className={`text-xl font-bold text-gray-950 ${allCompleted ? "text-green-600" : ""
                        }`}
                    >
                      {percentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${allCompleted ? "bg-green-500" : "bg-amber-400"
                        }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex h-10 items-center justify-center border-t border-dashed border-gray-200">
                  <p className="text-sm font-medium text-gray-500 italic">
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
