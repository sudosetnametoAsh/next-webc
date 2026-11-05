import { NextRequest, NextResponse } from "next/server";
import { adminReadClient } from "@/lib/services/admin-read-client";
import { parseCourseImport } from "@/lib/course-import";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";

export async function POST(request: NextRequest) {
  if (!(await adminReadClient()))
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  let preview;
  try {
    const body = await request.json();
    if (typeof body.text !== "string")
      throw new Error("CSV or JSON text is required.");
    preview = parseCourseImport(body.text);
    if (preview.errors.length)
      return NextResponse.json(
        {
          error: "Fix the flagged rows before importing.",
          errors: preview.errors,
        },
        { status: 400 },
      );
    if (!preview.courses.length) throw new Error("No courses to import.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid import." },
      { status: 400 },
    );
  }
  try {
    const [{ db }, { courses, courseSections }] = await Promise.all([
      import("@/lib/db"),
      import("@/lib/db/schema"),
    ]);
    const summary = await db.transaction(async (transaction) => {
      const existing = new Set(
        (
          await transaction.select({ name: courses.courseName }).from(courses)
        ).map((course) => course.name.trim().toLowerCase()),
      );
      const duplicates = preview.courses.filter((course) =>
        existing.has(course.course_name.toLowerCase()),
      );
      if (duplicates.length)
        throw new Error(
          `Courses already exist: ${duplicates.map((course) => course.course_name).join(", ")}`,
        );
      for (const course of preview.courses) {
        const [saved] = await transaction
          .insert(courses)
          .values({ courseName: course.course_name })
          .returning();
        if (course.sections.length)
          await transaction
            .insert(courseSections)
            .values(
              course.sections.map((section) => ({
                courseId: saved.courseId,
                year: section.year,
                semester: section.semester,
                sectionNumber: section.section_number,
              })),
            );
      }
      return {
        coursesCreated: preview.courses.length,
        sectionsCreated: preview.courses.reduce(
          (count, course) => count + course.sections.length,
          0,
        ),
      };
    });
    invalidateServerAdminCache();
    invalidateServerDepartmentCache();
    return NextResponse.json({ summary }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Courses already exist:")
    )
      return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Course import failed:", error);
    return NextResponse.json(
      { error: "Import failed. No courses or sections were saved." },
      { status: 500 },
    );
  }
}
