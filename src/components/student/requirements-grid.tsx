"use client";
import React from "react";
import { RequirementCard } from "./requirement-card";

interface RequirementsGridProps {
  records: any[];
}

export function RequirementsGrid({ records }: RequirementsGridProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 w-full">
      <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-5">Faculty Requirements</h3>

      {records.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 font-medium text-sm">No requirements found.</p>
        </div>
      ) : (
        // --- LAYOUT FIX: items-start ---
        // This ensures cards don't stretch to match the height of their neighbor
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {records.map((row, index) => {
            const tasks = row.student_tasks_status?.map(
              (t: any) => t.clearance_tasks_preset?.description || "Unnamed Task"
            ) || [];
            
            // Generate a unique key so React doesn't get confused
            const deptName = row.clearance_templates?.departments?.dept_name || `dept-${index}`;
            const staffName = row.clearance_templates?.staffs?.staff_name || "staff";
            const uniqueKey = `${deptName}-${staffName}-${index}`.replace(/\s+/g, '-');

            return (
              <RequirementCard
                key={uniqueKey}
                department={deptName}
                staff={staffName}
                status={row.status || "Pending"}
                tasks={tasks}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}