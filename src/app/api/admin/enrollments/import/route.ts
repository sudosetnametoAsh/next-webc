import { parseEnrollmentName, resolveEnrollmentEmail, isEnrollmentEmail } from "@/lib/enrollment";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { shrinkCourseName } from "@/utils/formatters";
import { dispatchReadyForSigningNotifications } from "@/lib/services/ready-for-signing-notifications";
import { NextRequest, NextResponse } from "next/server";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";

interface StudentImportRecord {
  type?: "student";
  student_id?: string;
  studentId?: string;
  id?: string;
  userId?: string;
  name?: string;
  student_name?: string;
  studentName?: string;
  email: string;
  balance?: number | string;
  section_id?: number | string;
  sectionId?: number | string;
  course_name?: string;
  courseName?: string;
  year?: number | string;
  semester?: number | string;
  section_number?: number | string;
  sectionNumber?: number | string;
}

interface StaffImportRecord {
  type?: "staff";
  staff_id?: string;
  staffId?: string;
  id?: string;
  userId?: string;
  name?: string;
  staff_name?: string;
  staffName?: string;
  email: string;
  balance?: number | string;
}

type ImportRecord = Omit<StudentImportRecord, "type"> & Omit<StaffImportRecord, "type"> & { type?: "student" | "staff" };

export async function POST(req: NextRequest) {
  try {
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const globalType = body.type as "student" | "staff" | undefined;
    const records: ImportRecord[] = Array.isArray(body.clients)
      ? body.clients
      : Array.isArray(body.records)
      ? body.records
      : Array.isArray(body)
      ? body
      : body.client && typeof body.client === "object"
      ? [body.client]
      : body.record && typeof body.record === "object"
      ? [body.record]
      : (body.student_id || body.staff_id || body.id || body.email)
      ? [body]
      : [];

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No records provided. Expecting a JSON array of student or staff records." },
        { status: 400 }
      );
    }

    const results = {
      total: records.length,
      successCount: 0,
      failedCount: 0,
      sectionsCreated: 0,
      coursesCreated: 0,
      errors: [] as { row: number; id?: string; error: string }[],
    };

    // Cache for courses and sections to prevent duplicate queries during batch import
    const courseCache = new Map<string, number>(); // course_name -> course_id
    const sectionCache = new Map<string, number>(); // "course_id:year:sem:sec_num" -> section_id
    const settledUserIds: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const rowNum = i + 1;
      const recordType = (rec.type || globalType || "student").toLowerCase();

      try {
        const rawId = (rec.student_id || rec.studentId || rec.staff_id || rec.staffId || rec.id || rec.userId)?.toString().trim();
        const nameInput = (rec.name || rec.student_name || rec.studentName || rec.staff_name || rec.staffName)?.toString().trim();
        const rawEmail = resolveEnrollmentEmail(rec.email?.toString() || "");
        const initialBalance = rec.balance !== undefined && !isNaN(Number(rec.balance)) ? Number(rec.balance) : 0.00;

        if (recordType !== "student" && recordType !== "staff") throw new Error("Invalid client type.");

        if (recordType === "student" && !rawId) {
          results.failedCount++;
          results.errors.push({ row: rowNum, error: "Missing required student ID." });
          continue;
        }

        if (!rawEmail) {
          results.failedCount++;
          results.errors.push({ row: rowNum, id: rawId, error: "Missing required email address." });
          continue;
        }

        if (!isEnrollmentEmail(rawEmail)) throw new Error("Invalid email address.");
        const parsedName = parseEnrollmentName(nameInput || "");
        if (!parsedName) throw new Error("Full name must use Last Name, First Name (for example Dela Cruz, Juan).");
        const rawName = parsedName.fullName;
        if (rawId && rawId.length > 11) throw new Error("ID exceeds 11 characters.");
        if (recordType === "staff") {
          const { data: staffId, error: staffError } = await adminClient.rpc("enroll_staff_identity", {
            p_email: rawEmail, p_name: rawName || "", p_staff_id: rawId || null,
          });
          if (staffError) throw new Error(`Failed to enroll staff: ${staffError.message}`);
          if (typeof staffId !== "string" || !staffId) throw new Error("Staff enrollment did not return an internal ID.");
          results.successCount++;
          continue;
        }

        // Student IDs remain required and supplied by the enrollment roster.
        // 1. Upsert into public.users (Identity Base)
        const { error: userError } = await adminClient
          .from("users")
          .upsert(
            {
              user_id: rawId,
              email: rawEmail,
            },
            { onConflict: "user_id" }
          );

        if (userError) {
          throw new Error(`Failed to insert into users: ${userError.message}`);
        }

        {
          // --- STUDENT ENROLLMENT FLOW ---

          const { error: studentError } = await adminClient
            .from("students")
            .upsert(
              {
                student_id: rawId,
                student_name: rawName || rawId,
              },
              { onConflict: "student_id" }
            );

          if (studentError) {
            throw new Error(`Failed to insert student: ${studentError.message}`);
          }

          // Resolve section_id
          let targetSectionId: number | null = null;
          if (rec.section_id || rec.sectionId) {
            targetSectionId = Number(rec.section_id || rec.sectionId);
          } else if (rec.course_name || rec.courseName) {
            // Intelligent section auto-resolution from course + cohort
            const courseName = (rec.course_name || rec.courseName)!.toString().trim();
            const year = Number(rec.year) || 1;
            const semester = Number(rec.semester) || 1;
            const sectionNumber = Number(rec.section_number || rec.sectionNumber) || 1;

            // 1. Resolve Course
            let courseId: number | undefined = courseCache.get(courseName.toLowerCase());
            if (courseId === undefined) {
              const { data: allCourses } = await adminClient
                .from("courses")
                .select("course_id, course_name");

              const matchedCourse = allCourses?.find(
                (c) =>
                  c.course_name.toLowerCase() === courseName.toLowerCase() ||
                  shrinkCourseName(c.course_name).toLowerCase() === courseName.toLowerCase() ||
                  c.course_name.toLowerCase().includes(courseName.toLowerCase())
              );

              if (matchedCourse) {
                courseId = matchedCourse.course_id;
              } else {
                const { data: newCourse, error: createCourseErr } = await adminClient
                  .from("courses")
                  .insert({ course_name: courseName })
                  .select("course_id")
                  .single();

                if (createCourseErr) throw createCourseErr;
                courseId = newCourse.course_id;
                results.coursesCreated++;
              }
              if (courseId !== undefined) {
                courseCache.set(courseName.toLowerCase(), courseId);
              }
            }

            if (!courseId) {
              throw new Error(`Could not resolve course ID for program '${courseName}'.`);
            }

            // 2. Resolve Section
            const sectionKey = `${courseId}:${year}:${semester}:${sectionNumber}`;
            let sectionId: number | undefined = sectionCache.get(sectionKey);

            if (sectionId === undefined) {
              const { data: existingSec } = await adminClient
                .from("course_sections")
                .select("section_id")
                .eq("course_id", courseId)
                .eq("year", year)
                .eq("semester", semester)
                .eq("section_number", sectionNumber)
                .maybeSingle();

              if (existingSec) {
                sectionId = existingSec.section_id;
              } else {
                const { data: newSec, error: createSecErr } = await adminClient
                  .from("course_sections")
                  .insert({
                    course_id: courseId,
                    year,
                    semester,
                    section_number: sectionNumber,
                  })
                  .select("section_id")
                  .single();

                if (createSecErr) throw createSecErr;
                sectionId = newSec.section_id;
                results.sectionsCreated++;
              }
              if (sectionId !== undefined) {
                sectionCache.set(sectionKey, sectionId);
              }
            }

            targetSectionId = sectionId || null;
          }

          // Link student to section in enrollments (fires tr_enrollment_create_clearance!)
          if (targetSectionId) {
            const { error: enrollError } = await adminClient
              .from("enrollments")
              .upsert(
                {
                  student_id: rawId,
                  section_id: targetSectionId,
                },
                { onConflict: "student_id, section_id" }
              );

            if (enrollError) {
              throw new Error(`Failed to link enrollment: ${enrollError.message}`);
            }
          }
        }

        results.successCount++;
      } catch (rowErr: any) {
        results.failedCount++;
        results.errors.push({
          row: rowNum,
          id: (rec.student_id || rec.studentId || rec.staff_id || rec.id)?.toString(),
          error: rowErr?.message || "Unknown error processing record.",
        });
      }
    }

    // 4. Dispatch "Ready for Signing" notifications strictly for clients whose Cashier was auto-settled
    if (settledUserIds.length > 0) {
      try {
        const signedTiersByUser = new Map<string, Set<number>>();
        settledUserIds.forEach((id) => signedTiersByUser.set(id, new Set([1])));

        await dispatchReadyForSigningNotifications({
          signedUserIds: settledUserIds,
          signedTiersByUser,
          adminClient,
          isSingleRecordSign: settledUserIds.length === 1,
        });
      } catch (readyErr) {
        console.warn("[Bulk Import API] Warning dispatching ready for signing notifications:", readyErr);
      }
    }

    invalidateServerAdminCache();
    invalidateServerDepartmentCache();
    invalidateServerClearanceCache();

    return NextResponse.json(
      {
        success: results.failedCount === 0,
        message: `Roster import completed: ${results.successCount} of ${results.total} records enrolled successfully.`,
        summary: results,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Bulk Import API] Fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during bulk import." },
      { status: 500 }
    );
  }
}
