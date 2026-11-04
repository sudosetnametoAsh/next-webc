import { createClient } from "@/lib/db/supabase-server";
import type { Courses } from "@/types/courses";

/** Shared by the page render and API, avoiding an HTTP round trip back into the app. */
export async function getDepartmentCourses(userId: string, department: string): Promise<Courses[]> {
  const supabase = await createClient();
  let deptId: number | null = null;
  if (department) {
    const { data: deptData } = await supabase
      .from("clearance_departments")
      .select("dept_id")
      .ilike("dept_name", department.trim())
      .maybeSingle();
    if (deptData) deptId = deptData.dept_id;
  }

  let query = supabase
    .from("courses")
    .select(`course_id, course_name,
      course_sections(year, section_id, semester, section_number),
      clearance_templates!inner()`)
    .eq("clearance_templates.staff_id", userId)
    .eq("clearance_templates.is_active", true);
  if (deptId !== null) query = query.eq("clearance_templates.dept_id", deptId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
