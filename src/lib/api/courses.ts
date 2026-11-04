import { cache } from "react";
import { getSession } from "@/lib/auth/get-session";
import { getDepartmentCourses } from "@/lib/services/department-courses";

export const fetchCourseServer = cache(async () => {
  const { user_id, department } = await getSession();
  return getDepartmentCourses(user_id, department);
});
