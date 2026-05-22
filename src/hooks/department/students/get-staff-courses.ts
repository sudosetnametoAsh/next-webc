import { createClient } from "@/lib/db/supabase-server";
import { Courses } from "@/types/courses";

export async function getStaffCourses(staffId: string) : Promise<Courses[]> {
  const supabase = await createClient();

  const { data: courses, error } = await supabase
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
    .eq("clearance_templates.staff_id", staffId);

    if (error)  {
        throw new Error("Temporary get course error");
    }

    return courses;

}
