import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** One personal notification per assigned client, across all of the officer's active templates. */
export async function notifyScheduleUpdate(staffId: string) {
  // INSERT ... SELECT keeps recipient selection and delivery atomic, without
  // Supabase's response row limit or a separate request per client.
  await db.execute(sql`
    WITH recipients AS (
      SELECT r.user_id,
        CASE WHEN count(DISTINCT t.dept_id) = 1 THEN min(t.dept_id) ELSE NULL END AS department_id,
        string_agg(DISTINCT d.dept_name, ', ' ORDER BY d.dept_name) AS department_name
      FROM public.clearance_records r
      JOIN public.clearance_templates t ON t.template_id = r.template_id
      JOIN public.clearance_departments d ON d.dept_id = t.dept_id
      WHERE t.staff_id = ${staffId} AND t.is_active = true
      GROUP BY r.user_id
    )
    INSERT INTO public.notifications (
      user_id, target_role, department_id, category, title, description,
      type, ref_url, is_read, metadata
    )
    SELECT user_id, 'student', department_id, 'schedule', 'Department Schedule Updated',
      department_name || ' updated their weekly office hours.',
      'Info', '/clearance/schedules', false,
      jsonb_build_object('staffId', ${staffId}::text, 'departmentId', department_id,
        'departmentName', department_name)
    FROM recipients
  `);
}
