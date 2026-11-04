export async function updateTaskStatus(taskId: number, status: string, comment: string) {
  const response = await fetch("/api/department/clients/tasks/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, status, comment }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not update task status.");
  if (result.data?.status !== status) throw new Error("Task status was not saved.");
  window.dispatchEvent(new Event("department_data_invalidated"));
  window.dispatchEvent(new Event("notifications_updated"));
  return result.data as { assigned_task_id: number; status: "Cleared" | "Pending"; comments: string };
}
