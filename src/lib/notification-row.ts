import type { ClearanceNotification } from "@/types/clearance";

export function notificationFromRow(row: Record<string, unknown>): ClearanceNotification {
  return {
    id: String(row.notif_id),
    title: String(row.title || "Notification"),
    description: String(row.description || ""),
    timestamp: String(row.created_at || ""),
    type: String(row.type || "info").toLowerCase(),
    category: String(row.category || "system"),
    targetRole: typeof row.target_role === "string" ? row.target_role : undefined,
    departmentId: typeof row.department_id === "number" ? row.department_id : undefined,
    userId: typeof row.user_id === "string" ? row.user_id : undefined,
    read: Boolean(row.is_read),
    metadata: {
      refUrl: typeof row.ref_url === "string" ? row.ref_url : undefined,
      sectionId: typeof row.section_id === "number" ? row.section_id : undefined,
      courseId: typeof row.course_id === "number" ? row.course_id : undefined,
      ...(typeof row.metadata === "object" && row.metadata !== null ? row.metadata : {}),
    },
  };
}
