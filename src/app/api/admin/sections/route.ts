import { createClient } from "@/lib/db/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";

// GET: Fetch course sections, optionally filtered by course_id
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const courseIdParam = searchParams.get("course_id");

  try {
    let query = supabase
      .from("course_sections")
      .select(`
        section_id,
        course_id,
        year,
        semester,
        section_number,
        courses (
          course_id,
          course_name
        ),
        enrollments (
          count
        )
      `)
      .order("year", { ascending: true })
      .order("section_number", { ascending: true });

    if (courseIdParam) {
      query = query.eq("course_id", Number(courseIdParam));
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Sections API] Error fetching sections:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format section response
    const formattedSections = (data || []).map((sec: any) => ({
      section_id: sec.section_id,
      course_id: sec.course_id,
      course_name: sec.courses?.course_name || "Unknown Program",
      year: sec.year,
      semester: sec.semester,
      section_number: sec.section_number,
      section_code: `${sec.courses?.course_name || "Program"} ${sec.year}/${sec.semester}-${sec.section_number}`,
      enrolled_count: sec.enrollments?.[0]?.count || 0,
    }));

    return NextResponse.json({ data: formattedSections }, { status: 200 });
  } catch (err: any) {
    console.error("[Sections API] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}

// POST: Create a new course section
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    const { course_id, year, semester, section_number } = await req.json();

    if (!course_id || !year || !semester || !section_number) {
      return NextResponse.json(
        { error: "Missing required fields: course_id, year, semester, section_number." },
        { status: 400 }
      );
    }

    // Check if section already exists
    const { data: existingSection } = await supabase
      .from("course_sections")
      .select("section_id")
      .eq("course_id", Number(course_id))
      .eq("year", Number(year))
      .eq("semester", Number(semester))
      .eq("section_number", Number(section_number))
      .maybeSingle();

    if (existingSection) {
      return NextResponse.json(
        { error: "This course section already exists.", section_id: existingSection.section_id },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("course_sections")
      .insert({
        course_id: Number(course_id),
        year: Number(year),
        semester: Number(semester),
        section_number: Number(section_number),
      })
      .select(`
        section_id,
        course_id,
        year,
        semester,
        section_number,
        courses ( course_name )
      `)
      .single();

    if (error) {
      console.error("[Sections API] Error creating section:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const courseName = (Array.isArray(data.courses) ? (data.courses[0] as any)?.course_name : (data.courses as any)?.course_name) || "Program";

    invalidateServerAdminCache();
    invalidateServerDepartmentCache();

    return NextResponse.json(
      {
        success: true,
        data: {
          ...data,
          section_code: `${courseName} ${data.year}/${data.semester}-${data.section_number}`,
        },
        message: "Section created successfully.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Sections API] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}

// DELETE: Remove a course section
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  try {
    const { section_id } = await req.json();

    if (!section_id) {
      return NextResponse.json({ error: "Missing section_id." }, { status: 400 });
    }

    const { error } = await supabase
      .from("course_sections")
      .delete()
      .eq("section_id", Number(section_id));

    if (error) {
      console.error("[Sections API] Error deleting section:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidateServerAdminCache();
    invalidateServerDepartmentCache();

    return NextResponse.json({ success: true, message: "Section deleted successfully." }, { status: 200 });
  } catch (err: any) {
    console.error("[Sections API] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
