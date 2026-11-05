import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationCourseScope } from "@/lib/notification-visibility";

export async function getNotificationCourseScope(client: SupabaseClient, userId?: string): Promise<NotificationCourseScope> {
  const courseIds = new Set<number>();
  const sectionIds = new Set<number>();
  if (!userId) return { courseIds: [], sectionIds: [] };
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("enrollments")
      .select("section_id, course_sections!inner(course_id)")
      .eq("student_id", userId).order("section_id").range(offset, offset + 499);
    if (error) throw error;
    for (const row of data || []) {
      const section = Array.isArray(row.course_sections) ? row.course_sections[0] : row.course_sections;
      if (section?.course_id != null) courseIds.add(Number(section.course_id));
      sectionIds.add(Number(row.section_id));
    }
    if (!data || data.length < 500) break;
  }
  return { courseIds: [...courseIds], sectionIds: [...sectionIds] };
}
