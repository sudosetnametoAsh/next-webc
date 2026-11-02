import { createClient } from "@/lib/db/supabase-server";
import { Courses } from "@/types/courses";

export async function getStaffCourses(staffId: string, deptId?: number) : Promise<Courses[]> {
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select(
      `
        course_id,
        course_name,
        course_sections(
          year,
          section_id,
          semester,
          section_number
        ),
        clearance_templates!inner()
    `,
    )
    .eq("clearance_templates.staff_id", staffId)
    .eq("clearance_templates.is_active", true);

  if (deptId !== undefined) {
    query = query.eq("clearance_templates.dept_id", deptId);
  }

  const { data: courses, error } = await query;

    if (error)  {
        throw new Error("Temporary get course error");
    }

    return courses;

}
