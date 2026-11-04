import { getSession } from "@/lib/auth/get-session";
import { getDepartmentCourses } from "@/lib/services/department-courses";
import { NextResponse } from "next/server";

export async function GET() {
  const { user_id, department } = await getSession();
  try {
    const courses = await getDepartmentCourses(user_id, department);
    return NextResponse.json({ data: courses }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch department courses" }, { status: 500 });
  }
}
