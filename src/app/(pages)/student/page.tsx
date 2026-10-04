import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/get-session";
import { makeGetClearanceRecords } from "@/composition/clearance/make-get-clearance-records";
import { makeGetSummary } from "@/composition/clearance/make-get-summary";
import { makeGetDepartmentDetailsServer } from "@/composition/clearance/make-get-department-details-server";
import { makeGetOfficeHours } from "@/composition/clearance/make-get-office-hours";
import DashBoardRealtimeProvider from "@/components/clearance/dashboard-realtime-provider";
import ClearanceSeal from "@/components/student/clearance-seal";
import ClearanceItem from "@/components/student/clearance-item";
import TasksPage from "@/components/clearance/tasks/tasks-page";
import OfficeHours from "@/components/clearance/office-hours/office-hours";
import { Students } from "@/types/client/student-data";
import { ShieldCheck, FileText, Clock, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentPageProps {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const { user_id } = await getSession();

  const getClearanceRecords = await makeGetClearanceRecords();
  const getSummary = await makeGetSummary();
  const getDepartmentDetailsServer = await makeGetDepartmentDetailsServer();
  const getOfficeHours = await makeGetOfficeHours();

  const [summary, records, tasks, departments] = await Promise.all([
    getSummary.execute(user_id),
    getClearanceRecords.execute(user_id),
    getDepartmentDetailsServer.execute(user_id),
    getOfficeHours.execute(user_id),
  ]);

  const params = searchParams ? await searchParams : {};
  const activeTab = params?.tab || "departments";
  const isDepartmentsTab =
    activeTab === "departments" ||
    activeTab === "overview" ||
    !["tasks", "office-hours"].includes(activeTab);

  const totalDepartments = summary?.department_count ?? records.length;
  const signedDepartments =
    summary?.signed ??
    records.filter((r) => r.status.toLowerCase() === "signed").length;

  const isRegistrar = (name: string) => name.toLowerCase().includes("registrar");
  const isCashier = (name: string) => name.toLowerCase().includes("cashier");

  const sealDepartments = records.map((r, index) => {
    const pendingTasks = Math.max(0, r.task_count - r.cleared_task);
    const isSigned = r.status.toLowerCase() === "signed";

    let order = 2;
    if (isCashier(r.department)) order = 1;
    else if (isRegistrar(r.department)) order = 999;
    else order = index + 2;

    let status: "Signed" | "Pending" | "Incomplete" | "Locked" = "Pending";
    if (isSigned) {
      status = "Signed";
    } else if (
      isRegistrar(r.department) &&
      signedDepartments < Math.max(1, totalDepartments - 1)
    ) {
      status = "Locked";
    } else if (r.status.toLowerCase() === "incomplete") {
      status = "Incomplete";
    } else {
      status = "Pending";
    }

    return {
      dept_name: r.department,
      status,
      staff_name: r.staff,
      signing_order: order,
      pendingTasksCount: pendingTasks,
    };
  });

  const studentsData: Students = records.map((record) => ({
    clearance_id: record.clearance_id,
    status: (
      record.status === "Signed" ||
      record.status === "Pending" ||
      record.status === "Incomplete"
        ? record.status
        : "Pending"
    ) as "Signed" | "Pending" | "Incomplete",
    clearance_templates: {
      departments: { dept_name: record.department },
      staffs: { staff_name: record.staff },
    },
    clearance_tasks: tasks
      .filter((t) => t.department === record.department)
      .map((t) => ({
        title: t.title || "Clearance Requirement",
        assigned_task_id: t.assigned_task_id,
        status: t.status || "Pending",
        dropbox: t.dropbox,
        description: t.description || "",
        uploaded_at: t.uploaded_at,
        comments: t.comments,
      })),
  }));

  const pendingTasksTotal = tasks.filter(
    (t) => t.status !== "Cleared" && t.status !== "Completed"
  ).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Signature Clearance Seal & Approval Chain Meter */}
      <ClearanceSeal
        totalDepartments={totalDepartments}
        signedDepartments={signedDepartments}
        departments={sealDepartments}
      />

      {/* 2. Collegiate Modernist Tab Navigation */}
      <nav className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1.5 border border-slate-200">
        <Link
          href="?tab=departments"
          className={cn(
            "flex flex-1 min-w-[170px] items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all",
            isDepartmentsTab
              ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <ShieldCheck
            size={18}
            className={isDepartmentsTab ? "text-[#10B981]" : "text-slate-400"}
          />
          <span>Clearance Departments</span>
        </Link>

        <Link
          href="?tab=tasks"
          className={cn(
            "flex flex-1 min-w-[170px] items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all",
            activeTab === "tasks"
              ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <FileText
            size={18}
            className={activeTab === "tasks" ? "text-[#F59E0B]" : "text-slate-400"}
          />
          <span>Tasks & Requirements</span>
          {pendingTasksTotal > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
              {pendingTasksTotal}
            </span>
          )}
        </Link>

        <Link
          href="?tab=office-hours"
          className={cn(
            "flex flex-1 min-w-[170px] items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all",
            activeTab === "office-hours"
              ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <Clock
            size={18}
            className={
              activeTab === "office-hours" ? "text-indigo-600" : "text-slate-400"
            }
          />
          <span>Office Hours & Faculty</span>
        </Link>
      </nav>

      {/* 3. Realtime Tab Content Canvas */}
      <DashBoardRealtimeProvider>
        {isDepartmentsTab && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Clearance Departments & Requirements
                </h3>
                <p className="text-xs text-slate-500">
                  Review specific clearing criteria, faculty instructions, and submit required documents for each office.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {records.length} Department{records.length === 1 ? "" : "s"} Assigned
                </span>
              </div>
            </div>

            {records.length > 0 ? (
              <ClearanceItem students={studentsData} id={user_id} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Building2 className="h-10 w-10 text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-800">
                  No Clearance Departments Assigned
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Your clearance record does not have any active departments currently assigned. Please contact the registrar if you believe this is an error.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Tasks & Document Requirements
                </h3>
                <p className="text-xs text-slate-500">
                  All assigned clearance tasks requiring document submissions, in-person verification, or resubmissions.
                </p>
              </div>
            </div>

            <TasksPage task={tasks} studentId={user_id} />
          </div>
        )}

        {activeTab === "office-hours" && (
          <div className="space-y-6">
            <OfficeHours departments={departments} />
          </div>
        )}
      </DashBoardRealtimeProvider>
    </div>
  );
}