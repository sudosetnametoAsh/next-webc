export async function rejectSubmission(taskId: number, reason: string) {
  const response = await fetch("/api/department/clients/tasks/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, reason }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save rejection.");
  if (result.data?.status !== "Rejected") throw new Error("Rejection was not saved.");
  window.dispatchEvent(new Event("department_data_invalidated"));
  window.dispatchEvent(new Event("notifications_updated"));
  return result.data as { status: "Rejected"; comments: string; ai_audit_report: unknown };
}
