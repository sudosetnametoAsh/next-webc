"use client";

import { useFecthRecords } from "@/hooks/student/fetch-student-data";
import { RequirementCard } from "./requirement-card";
import DashboardStats from "./dashboard-stats";
import SignOutButton from "@/components/auth/sign-out-button";

export default function StudentDashboard() {
    const { data, isLoading } = useFecthRecords();

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <p className="text-gray-500 animate-pulse font-medium">Loading Dashboard...</p>
            </div>
        );
    }

    // Safety checks for data
    const studentName = data?.name || "Student";
    const records = data?.students || [];

    // Calculate overall status
    const isClearanceComplete = records.length > 0 && records.every((r: any) => r.status === 'Complete');

    return (
        // UPDATE: Changed max-w-6xl to max-w-7xl and added responsive padding
        <div className="w-full max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
            
            {/* --- SECTION 1: Header Profile Card --- */}
<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
    
    {/* Left: Student Info */}
    <div className="min-w-0"> {/* Added min-w-0 to prevent text overflow */}
        <h1 className="text-2xl font-bold text-gray-800 truncate">{studentName}</h1>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                STUDENT
            </span>
        </div>
    </div>

    {/* Right: Status Badge & Actions */}
    {/* CHANGE: Added 'flex-wrap' and 'justify-end' */}
    <div className="flex flex-wrap items-center gap-3 md:justify-end"> 
        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-lg font-bold text-white flex items-center gap-2 shadow-sm whitespace-nowrap ${isClearanceComplete ? 'bg-green-500' : 'bg-orange-500'}`}>
            {isClearanceComplete ? (
                <><span>✓</span> <span>Clearance Complete</span></>
            ) : (
                <> <span>Clearance Incomplete</span></>
            )}
        </div>
        
        {/* Sign Out Button */}
        <div className="shrink-0">
             <SignOutButton />
        </div>
    </div>
</div>

            {/* --- SECTION 2: Statistics --- */}
            <DashboardStats records={records} />

            {/* --- SECTION 3: Faculty Requirements Grid --- */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Faculty Requirements</h3>
                
                {records.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                        <p>No clearance requirements found for this student.</p>
                    </div>
                ) : (
                    // Grid Layout
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {records.map((row: any, index: number) => {
                             const tasks = row.student_tasks_status?.map(
                                (t: any) => t.clearance_tasks_preset?.description
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