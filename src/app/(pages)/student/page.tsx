"use client";

import { useMemo } from "react";
import { useFecthRecords } from "@/hooks/student/fetch-student-data";
import { Loader2 } from "lucide-react";

// Component Imports
import { Navbar } from "@/components/student/navbar";
import { HeroSection } from "@/components/student/hero-section";
import DashboardStats from "@/components/student/dashboard-stats";
import { RequirementsGrid } from "@/components/student/requirements-grid";

// --- TYPES ---
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
  balance?: { amount: number | string }[];
}

// --- 1. DEFINE MOCK DATA HERE ---
const MOCK_DATA: ClearanceRecord[] = [
  {
    status: "Signed",
    clearance_templates: {
      departments: { dept_name: "Library Services" },
      staffs: { staff_name: "Ms. Sarah Librarian" }
    },
    student_tasks_status: []
  },
  {
    status: "Pending",
    clearance_templates: {
      departments: { dept_name: "Laboratory Dept" },
      staffs: { staff_name: "Mr. John Tech" }
    },
    student_tasks_status: [
      { clearance_tasks_preset: { description: "Replace broken beaker" } },
      { clearance_tasks_preset: { description: "Clean workstation #4" } }
    ]
  },
  {
    status: "Signed",
    clearance_templates: {
      departments: { dept_name: "Guidance Office" },
      staffs: { staff_name: "Dr. Emily Counselor" }
    },
    student_tasks_status: []
  },
  {
    status: "Pending",
    clearance_templates: {
      departments: { dept_name: "Prefect of Discipline" },
      staffs: { staff_name: "Mr. Robert Strict" }
    },
    student_tasks_status: [
      { clearance_tasks_preset: { description: "Submit apology letter" } }
    ]
  },
  {
    status: "Signed",
    clearance_templates: {
      departments: { dept_name: "School Clinic" },
      staffs: { staff_name: "Nurse Joy" }
    },
    student_tasks_status: []
  }
];

export default function StudentPage() {
  const { data, isLoading } = useFecthRecords();

  const { studentName, studentId, records, isClearanceComplete, formattedBalance } = useMemo(() => {
    const rawData = data as StudentData | undefined;
    
    // --- 2. MERGE REAL DATA WITH MOCK DATA ---
    const realRecords = rawData?.students || [];
    // Combine them so you see both!
    const combinedRecords = [...realRecords, ...MOCK_DATA];

    const rawAmt = rawData?.balance?.[0]?.amount || 0;
    const balanceStr = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(rawAmt));

    return {
      studentName: rawData?.name || "Student",
      studentId: rawData?.student_id || "---",
      records: combinedRecords, // Use the combined list
      isClearanceComplete:
        combinedRecords.length > 0 &&
        combinedRecords.every((r) => r.status === "Signed" || r.status === "Signed"),
      formattedBalance: balanceStr,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#F3F4F6]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Loading Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans pb-12 flex flex-col items-center">
      
      {/* 1. Navbar */}
      <div className="w-full">
        <Navbar name={studentName} id={studentId} />
      </div>

      {/* 2. Main Content */}
      <main className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        
        {/* Profile Card */}
        <HeroSection 
          name={studentName} 
          id={studentId} 
          isComplete={isClearanceComplete} 
        />

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 w-full">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6">Clearance Status</h3>
          <DashboardStats records={records} balance={formattedBalance} />
        </div>

        {/* Requirements Grid (Now with Mock Data!) */}
        <RequirementsGrid records={records} />

      </main>
    </div>
  );
}