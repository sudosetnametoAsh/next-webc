/** Identify current and legacy bottleneck alerts without relying on their recipient. */
export function isBottleneckNotification(notification: {
  title?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
}): boolean {
  return notification.category?.toLowerCase() === "bottleneck"
    || notification.title?.toLowerCase().includes("bottleneck") === true
    || (typeof notification.metadata?.type === "string" && notification.metadata.type.toLowerCase() === "bottleneck");
}

export interface NotificationCourseScope {
  courseIds: number[];
  sectionIds: number[];
}

type ScopedNotification = {
  title?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  user_id?: string | null;
  userId?: string | null;
  target_role?: string | null;
  targetRole?: string | null;
  course_id?: number | null;
  section_id?: number | null;
};

export function isAdminOnlyNotification(notification: ScopedNotification): boolean {
  return isBottleneckNotification(notification)
    || (notification.target_role ?? notification.targetRole)?.toLowerCase() === "admin";
}

/** Applies equally to database rows and the client-facing notification shape. */
export function isNotificationVisible(
  notification: ScopedNotification,
  role: string,
  scope: NotificationCourseScope = { courseIds: [], sectionIds: [] },
): boolean {
  if (role !== "admin" && isAdminOnlyNotification(notification)) return false;
  if (role === "admin") return true;
  // Direct delivery was scoped at creation; course filters apply to shared broadcasts.
  if (notification.user_id ?? notification.userId) return true;
  const courseId = notification.course_id ?? notification.metadata?.courseId;
  const sectionId = notification.section_id ?? notification.metadata?.sectionId;
  if (courseId != null && !scope.courseIds.includes(Number(courseId))) return false;
  if (sectionId != null && !scope.sectionIds.includes(Number(sectionId))) return false;
  const courses = notification.metadata?.courseIds;
  if (courseId == null && Array.isArray(courses) && courses.length
    && !courses.some((id) => scope.courseIds.includes(Number(id)))) return false;
  return true;
}
