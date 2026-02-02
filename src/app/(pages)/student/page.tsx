"use client";

import { useMemo } from "react";
import { useFecthRecords } from "@/hooks/student/fetch-student-data";
import { Loader2 } from "lucide-react";

// Import our clean components
import { Navbar } from "@/components/student/navbar";
import { HeroSection } from "@/components/student/hero-section";
import DashboardStats from "@/components/student/dashboard-stats";
import { RequirementsGrid } from "@/components/student/requirements-grid";

// --- TYPES (Defines the shape of our data) ---
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

export default function StudentPage() {
  const { data, isLoading } = useFecthRecords();

  // --- DATA PROCESSING ---
  // We format the raw API data into easy-to-use variables here
  const { studentName, studentId, records, isClearanceComplete, formattedBalance } = useMemo(() => {
    const rawData = data as StudentData | undefined;
    const records = rawData?.students || [];
    
    // Format money (e.g., 5000 -> ₱5,000.00)
    const rawAmt = rawData?.balance?.[0]?.amount || 0;
    const balanceStr = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(rawAmt));

    return {
      studentName: rawData?.name || "Student",
      studentId: rawData?.student_id || "---",
      records: records,
      // Clearance is complete only if ALL departments are "Signed" or "Complete"
      isClearanceComplete:
        records.length > 0 &&
        records.every((r) => r.status === "Signed" || r.status === "Complete"),
      formattedBalance: balanceStr,
    };
  }, [data]);

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#F3F4F6]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Loading Portal...</p>
      </div>
    );
  }

  // --- MAIN LAYOUT ---
  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans pb-12 flex flex-col items-center">
      
      {/* 1. Navbar (Stretches full width) */}
      <div className="w-full">
        <Navbar name={studentName} id={studentId} />
      </div>

      {/* 2. Content Container (Centered, max width of 1280px/7xl) */}
      <main className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        
        {/* A. Hero Profile Card */}
        <HeroSection 
          name={studentName} 
          id={studentId} 
          isComplete={isClearanceComplete} 
        />

        {/* B. Statistics Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 w-full">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6">Clearance Status</h3>
          <DashboardStats records={records} balance={formattedBalance} />
        </div>

        {/* C. Requirements List */}
        <RequirementsGrid records={records} />

      </main>
    </div>
  );
}