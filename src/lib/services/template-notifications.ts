import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** One personal publication notice per enrolled client in the saved templates' courses. */
export async function notifyTemplatePublication(courseIds: number[]) {
  const courses = [...new Set(courseIds)];
  if (!courses.length) return;
  await db.execute(sql`
    WITH recipients AS (
      SELECT e.student_id AS user_id,
        CASE WHEN count(DISTINCT cs.course_id) = 1 THEN min(cs.course_id) ELSE NULL END AS course_id,
        jsonb_agg(DISTINCT cs.course_id) AS course_ids
      FROM public.enrollments e
      JOIN public.course_sections cs ON cs.section_id = e.section_id
      WHERE cs.course_id IN (${sql.join(courses.map((id) => sql`${id}`), sql`, `)})
        AND EXISTS (SELECT 1 FROM public.clearance_templates t
          WHERE t.course_id = cs.course_id AND t.is_active = true)
      GROUP BY e.student_id
    )
    INSERT INTO public.notifications (
      user_id, course_id, target_role, category, title, description, type, ref_url, is_read, metadata
    )
    SELECT user_id, course_id, 'student', 'template', 'Clearance Templates Published',
      'New clearance templates and requirements have been configured for your academic program.',
      'Info', '/clearance', false, jsonb_build_object('courseId', course_id, 'courseIds', course_ids)
    FROM recipients
  `);
}
