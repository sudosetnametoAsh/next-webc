import ClientEnrollmentGuard from "@/components/auth/client-enrollment-guard";
import EnrollmentNotice from "@/components/auth/enrollment-notice";
import DepartmentCalendarClient from "@/components/department/calendar/department-calendar-client";
import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import DepartmentHeader from "@/components/department/header";
import SubmissionModal from "@/components/department/clients/sumission-modal";
import { rejectSubmission } from "@/lib/api/reject-submission";
import TaskView from "@/components/department/clients/task-view";
import RealtimeDashboardListener from "@/components/department/dashboard-listener";
import AdminRealtimeListener from "@/components/admin/admin-realtime-listener";
import ProgramCompletionTable from "@/components/admin/reports/program-completion-table";
import AdminClientsClient from "@/components/admin/clients-page-client";
import DepartmentClientsClient from "@/components/department/clients/clients-client";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function ReviewFixture() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Flagged");
  const showProgress = new URLSearchParams(location.search).has("progress");
  const showAdmin = new URLSearchParams(location.search).has("adminprogress");
  const showDepartmentClients = new URLSearchParams(location.search).has("deptclients");
  const taskMode = new URLSearchParams(location.search).get("task");
  const fixtureTasks = useMemo(() => taskMode ? [{
    assigned_task_id: 12, title: taskMode === "digital" ? "Digital Receipt" : "Office Visit",
    description: "Test requirement", dropbox: taskMode === "digital" ? "[]" : "",
    status: taskMode === "digital" ? "Flagged" as const : "Pending" as const,
    assigned_at: "2026-11-04T00:00:00Z", ai_audit_report: taskMode === "digital" ? { isAuthentic: false, flags: ["Wrong receipt"] } : null,
  }] : [], [taskMode]);
  return <QueryClientProvider client={queryClient}>
    <DepartmentHeader user_id="test-officer" user_name="Test Officer" department="Clinic" />
    {new URLSearchParams(location.search).get("notice") === "not-enrolled" ? <EnrollmentNotice /> : new URLSearchParams(location.search).has("enrollment") ? <ClientEnrollmentGuard userId="test-client"><div data-testid="private-clearance">Private clearance data</div></ClientEnrollmentGuard> : new URLSearchParams(location.search).has("calendar") ? <DepartmentCalendarClient
      userId="test-officer" userName="Test Officer" departmentName="Clinic" iconName="Building2" floor="1" room="101"
      initialWeeklySchedule={new URLSearchParams(location.search).has("savedweek") ? { mon: { active: true, time_in: "09:00", time_out: "16:00" } } : null}
    /> : showAdmin ? <>
      <AdminRealtimeListener />
      <div data-testid="report-programs"><ProgramCompletionTable /></div>
      <div data-testid="admin-clients"><AdminClientsClient /></div>
    </> : showDepartmentClients ? <>
      <RealtimeDashboardListener />
      <DepartmentClientsClient />
    </> : showProgress ? <>
      <RealtimeDashboardListener />
      <TaskView studentTasks={fixtureTasks} studentName="Test Client" studentId="test-client" currentDepartment="Clinic" clearanceId="2" clientStatus="Pending" />
    </> : <>
    <main>
      <output data-testid="saved-status">{status}</output>
      <button onClick={() => setOpen(true)}>Review flagged submission</button>
    </main>
    <SubmissionModal isOpen={open} onClose={() => setOpen(false)}
      studentName="Test Client" taskTitle="Test Receipt" lastUpdated="2026-11-04T00:00:00Z"
      files={[]} status={status} aiAuditReport={{ isAuthentic: false, flags: ["Wrong receipt"] }}
      onUpdateStatus={async () => { throw new Error("Unexpected approval"); }}
      onRejectWithResubmit={async (reason) => {
        const saved = await rejectSubmission(12, reason);
        setStatus(saved.status);
      }} />
    </>}
    <Toaster />
  </QueryClientProvider>;
}
createRoot(document.getElementById("root")!).render(<ReviewFixture />);
