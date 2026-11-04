import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import DepartmentHeader from "@/components/department/header";
import SubmissionModal from "@/components/department/clients/sumission-modal";
import { rejectSubmission } from "@/lib/api/reject-submission";
import TaskView from "@/components/department/clients/task-view";
import RealtimeDashboardListener from "@/components/department/dashboard-listener";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function ReviewFixture() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Flagged");
  const showProgress = new URLSearchParams(location.search).has("progress");
  const taskMode = new URLSearchParams(location.search).get("task");
  const fixtureTasks = useMemo(() => taskMode ? [{
    assigned_task_id: 12, title: taskMode === "digital" ? "Digital Receipt" : "Office Visit",
    description: "Test requirement", dropbox: taskMode === "digital" ? "[]" : "",
    status: taskMode === "digital" ? "Flagged" as const : "Pending" as const,
    assigned_at: "2026-11-04T00:00:00Z", ai_audit_report: taskMode === "digital" ? { isAuthentic: false, flags: ["Wrong receipt"] } : null,
  }] : [], [taskMode]);
  return <QueryClientProvider client={queryClient}>
    <DepartmentHeader user_id="test-officer" user_name="Test Officer" department="Clinic" />
    {showProgress ? <>
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
