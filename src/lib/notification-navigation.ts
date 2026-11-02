/**
 * Utility functions for notification deep-linking and action handling.
 */

/**
 * Extracts a quoted task title from a notification description,
 * e.g., 'Your submission for "Medical Examination" was returned.' -> 'Medical Examination'
 */
export function extractTaskTitleFromDescription(desc?: string): string | null {
  if (!desc) return null;
  const match = desc.match(/"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Checks if a notification represents a Clearance Signed Off notification.
 * Per requirement, these notifications must NOT have a 'view'/redirect function.
 */
export function isClearanceSignedNotification(notif: {
  title?: string;
  description?: string;
  category?: string;
  type?: string;
}): boolean {
  const title = (notif.title || "").toLowerCase();
  const desc = (notif.description || "").toLowerCase();
  const fullText = `${title} ${desc}`;

  // If it's an assignment or completion notification, it is NOT signed off
  if (
    title.includes("clearance completed") ||
    title.includes("assigned") ||
    fullText.includes("assigned")
  ) {
    return false;
  }

  return (
    title.includes("clearance signed off") ||
    title.includes("clearance signed") ||
    title === "signed" ||
    fullText.includes("clearance signed off") ||
    fullText.includes("has been approved and signed") ||
    fullText.includes("approved and signed") ||
    fullText.includes("clearance cleared")
  );
}

/**
 * Returns the direct deep-link target URL for a notification, or null if the notification
 * does not have a view/redirect function (such as Clearance Signed Off).
 */
export function getNotificationDirectUrl(notif: {
  title?: string;
  description?: string;
  category?: string;
  type?: string;
  targetRole?: string;
  metadata?: any;
}): string | null {
  // 1. Explicit exclusion: Clearance Signed Off has NO view/redirect function
  if (isClearanceSignedNotification(notif)) {
    return null;
  }

  const title = (notif.title || "").toLowerCase();
  const desc = (notif.description || "").toLowerCase();
  const meta = notif.metadata || {};

  // 1.5. Full Clearance Completed -> View clearance overview & certificate
  if (
    title.includes("clearance completed") ||
    notif.category === "completion" ||
    meta.type === "clearance_completion"
  ) {
    return "/clearance";
  }

  // 1.8. Department role or Department console notifications
  const isDeptTarget =
    notif.targetRole === "department" ||
    (typeof meta.refUrl === "string" && meta.refUrl.startsWith("/department")) ||
    meta.type === "department_template" ||
    meta.type === "ready_to_sign" ||
    Boolean(meta.studentId && meta.taskId && title.includes("submitted"));

  if (isDeptTarget) {
    if (
      title.includes("flagged") ||
      title.includes("verified") ||
      title.includes("submission") ||
      title.includes("appeal") ||
      notif.category === "submission" ||
      notif.category === "appeal"
    ) {
      const clientId = meta.studentId || meta.clientId;
      const taskId = meta.taskId;
      let targetUrl = "/department/clients?status=submissions";
      if (clientId) targetUrl += `&clientId=${encodeURIComponent(clientId)}`;
      if (taskId) targetUrl += `&taskId=${encodeURIComponent(taskId)}`;
      return targetUrl;
    }

    if (
      title.includes("ready for signing") ||
      title.includes("signing") ||
      notif.category === "clearance"
    ) {
      const isStaff = meta.type === "staff" || desc.includes("staff");
      if (isStaff) {
        let targetUrl = "/department/clients?type=staff";
        if (meta.staffId || meta.clientId) {
          targetUrl += `&clientId=${encodeURIComponent(meta.staffId || meta.clientId)}`;
        }
        return targetUrl;
      }
      return meta.refUrl || "/department/clients";
    }

    if (meta.refUrl) {
      return meta.refUrl;
    }

    return "/department/clients";
  }

  // If refUrl explicitly contains a specific task query, prefer that
  if (typeof meta.refUrl === "string" && meta.refUrl.includes("taskId=")) {
    return meta.refUrl;
  }

  // 2. Identify task ID or task title from metadata or description
  const taskId = meta.taskId;
  const taskTitle = meta.taskTitle || extractTaskTitleFromDescription(notif.description);

  const isTaskNotification =
    notif.category === "task" ||
    notif.category === "submission" ||
    title.includes("submission") ||
    title.includes("requirement") ||
    title.includes("returned") ||
    title.includes("reject") ||
    title.includes("cleared") ||
    title.includes("assigned") ||
    title.includes("appeal") ||
    title.includes("flagged");

  if (isTaskNotification) {
    if (taskId) {
      return `/clearance/tasks?taskId=${taskId}`;
    }
    if (taskTitle) {
      return `/clearance/tasks?taskTitle=${encodeURIComponent(taskTitle)}`;
    }
    return "/clearance/tasks";
  }

  // 3. Department schedules and office hours
  if (
    notif.category === "schedule" ||
    title.includes("schedule") ||
    desc.includes("office hours")
  ) {
    return "/clearance/schedules";
  }

  // 4. Fallback to refUrl if provided
  if (meta.refUrl) {
    return meta.refUrl;
  }

  return "/clearance/tasks";
}
