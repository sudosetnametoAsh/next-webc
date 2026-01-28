"use client";

import { useMemo } from "react";
import { useFecthRecords } from "@/hooks/student/fetch-student-data"; 
import { RequirementCard } from "./requirement-card";
import DashboardStats from "./dashboard-stats";
import SignOutButton from "@/components/auth/sign-out-button";
import { CheckCircle2, AlertCircle, User, Loader2 } from "lucide-react"; 


interface TaskStatus {
  clearance_tasks_preset?: { description: string };
}

interface ClearanceRecord {
  status: string;
  clearance_templates?: {
    departments?: { dept_name: string };
    staffs?: { staff_name: string };
  };
  student_tasks_status?: TaskStatus[];
}

interface StudentData {
  name: string;
  student_id: string;
  students: ClearanceRecord[];
}


function DashboardSkeleton() {
  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-gray-500 font-medium">Loading Dashboard...</p>
    </div>
  );
}

// --- Sub-Component: Header ---
function DashboardHeader({ 
  name, 
  id, 
  isComplete 
}: { name: string; id: string; isComplete: boolean }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
      {/* Left: Student Info */}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800 truncate">{name}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
            <User className="w-4 h-4" /> ID: {id}
          </span>
          <span className=" text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
            STUDENT
          </span>
        </div>
      </div>

      {/* Right: Status & Actions */}
      <div className="flex flex-wrap items-center gap-5 md:justify-center">
        <div
          className={`px-5 py-2 rounded-lg font-bold text-white flex items-center gap-1.5 shadow-sm whitespace-nowrap transition-colors  ${
            isComplete ? "bg-green-500" : "bg-orange-500"
          }`}
        >
          {isComplete ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Clearance Complete</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              <span>Clearance Incomplete</span>
            </>
          )}
        </div>
        <div className="shrink-0">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function StudentDashboard() {
  const { data, isLoading } = useFecthRecords();

  
  const { studentName, studentId, records, isClearanceComplete } = useMemo(() => {
    const rawData = data as StudentData | undefined; 
    const records = rawData?.students || [];
    
    return {
      studentName: rawData?.name || "Student",
      studentId: rawData?.student_id || "---",
      records: records,
      isClearanceComplete: records.length > 0 && records.every((r) => r.status === "Signed"),
    };
  }, [data]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      {/* Section 1: Header */}
      <DashboardHeader 
        name={studentName} 
        id={studentId} 
        isComplete={isClearanceComplete} 
      />

      {/* Section 2: Statistics */}
      <DashboardStats records={records} />

      {/* Section 3: Requirements Grid */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
          Faculty Requirements
        </h3>

        {records.length === 0 ? (
          <div className="p-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
            <p>No clearance requirements found for this student.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {records.map((row, index) => {
              
              const tasks = row.student_tasks_status?.map(
                  (t) => t.clearance_tasks_preset?.description || "Unnamed Task"
                ) || [];

              return (
                <RequirementCard
                  key={index}
                  department={row.clearance_templates?.departments?.dept_name || "Unknown Dept"}
                  staff={row.clearance_templates?.staffs?.staff_name || "Staff"}
                  status={row.status || "Pending"}
                  tasks={tasks}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}