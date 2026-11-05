import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { dispatchReadyForSigningNotifications } from "@/lib/services/ready-for-signing-notifications";
import { checkAndDispatchAdminCompletion, revokeAdminCompletion } from "@/lib/services/admin-notifications";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = req.nextUrl.searchParams;
    const requestedStudentId = searchParams.get("studentId") || "02000248919";

    // 1. Fetch all clients (students & staff) with clearance records / templates
    const [studentsRes, staffsRes, coursesRes, departmentsRes] = await Promise.all([
      supabase
        .from("students")
        .select(`
          student_id,
          student_name,
          enrollments:current_enrollments(
            course_sections (
              courses (
                course_id,
                course_name
              )
            )
          )
        `)
        .order("student_id", { ascending: true }),

      supabase
        .from("staffs")
        .select("staff_id, staff_name")
        .order("staff_id", { ascending: true }),

      supabase
        .from("courses")
        .select(`
          course_id,
          course_name,
          course_sections (
            section_id,
            enrollments:current_enrollments(
              student_id
            )
          )
        `)
        .order("course_name", { ascending: true }),

      supabase
        .from("clearance_departments")
        .select(`
          dept_id,
          dept_name,
          icon_name,
          clearance_templates (
            tier
          )
        `)
        .order("dept_name", { ascending: true }),
    ]);

    for (const result of [studentsRes, staffsRes, coursesRes, departmentsRes]) {
      if (result.error) throw new Error(result.error.message);
    }

    const formattedStudents = (studentsRes.data || []).map((s: any) => {
      const sec = Array.isArray(s.enrollments) ? s.enrollments[0]?.course_sections : s.enrollments?.course_sections;
      const cObj = Array.isArray(sec?.courses) ? sec.courses[0] : sec?.courses;
      return {
        student_id: s.student_id,
        student_name: s.student_name,
        course_name: cObj?.course_name || "General Program",
        type: "student" as const,
      };
    });

    const formattedStaff = (staffsRes.data || []).map((st: any) => ({
      student_id: st.staff_id,
      student_name: st.staff_name,
      course_name: "Faculty / Staff",
      type: "staff" as const,
    }));

    const allClients = [...formattedStudents, ...formattedStaff];

    // Formatted courses with student counts
    const formattedCourses = (coursesRes.data || []).map((c: any) => {
      let count = 0;
      if (Array.isArray(c.course_sections)) {
        for (const cs of c.course_sections) {
          if (Array.isArray(cs.enrollments)) {
            count += cs.enrollments.length;
          }
        }
      }
      return {
        course_id: c.course_id,
        course_name: c.course_name,
        student_count: count,
      };
    });

    // Formatted departments with tier
    const formattedDepartments = (departmentsRes.data || []).map((d: any) => {
      const tpls = Array.isArray(d.clearance_templates) ? d.clearance_templates : [];
      const minTier = tpls.length > 0 ? Math.min(...tpls.map((t: any) => t.tier ?? 2)) : 2;
      return {
        dept_id: d.dept_id,
        dept_name: d.dept_name,
        icon_name: d.icon_name,
        tier: minTier,
      };
    });

    // 2. Fetch current client's clearance records with templates & departments
    const { data: recordsData, error: recordsError } = await supabase
      .from("current_clearance_records")
      .select(`
        clearance_id,
        status,
        signed_at,
        created_at,
        template_id,
        clearance_templates (
          tier,
          clearance_departments (
            dept_id,
            dept_name,
            icon_name
          )
        )
      `)
      .eq("user_id", requestedStudentId);

    if (recordsError) throw new Error(recordsError.message);

    const records = (recordsData || [])
      .map((r: any) => {
        const tpl = Array.isArray(r.clearance_templates) ? r.clearance_templates[0] : r.clearance_templates;
        const dept = Array.isArray(tpl?.clearance_departments) ? tpl.clearance_departments[0] : tpl?.clearance_departments;
        return {
          clearance_id: r.clearance_id,
          status: r.status,
          signed_at: r.signed_at,
          created_at: r.created_at,
          tier: tpl?.tier ?? 1,
          dept_id: dept?.dept_id,
          dept_name: dept?.dept_name || "Unknown Office",
          icon_name: dept?.icon_name,
        };
      })
      .sort((a: any, b: any) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return a.dept_name.localeCompare(b.dept_name);
      });

    // 3. Fetch recent notifications related to this user
    const { data: notificationsData, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${requestedStudentId},description.ilike.%${requestedStudentId}%`)
      .order("created_at", { ascending: false })
      .limit(15);

    if (notificationsError) throw new Error(notificationsError.message);

    const activeStudent = allClients.find((s) => s.student_id === requestedStudentId) || {
      student_id: requestedStudentId,
      student_name: "Selected Client",
      course_name: "Clearance Program",
      type: "student",
    };

    return NextResponse.json({
      students: allClients,
      courses: formattedCourses,
      departments: formattedDepartments,
      currentStudent: {
        ...activeStudent,
        clearances: records,
        notifications: notificationsData || [],
      },
    });
  } catch (error: any) {
    console.error("Simulation GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const {
      action,
      userId,
      clearanceId,
      tier,
      hours,
      courseId,
      deptId,
      deptName,
      scope,
    } = body;

    const targetUserId = userId || "02000248919";

    // ── Action: Sign a single clearance record ──
    if (action === "sign") {
      if (!clearanceId) {
        return NextResponse.json({ error: "clearanceId is required for signing" }, { status: 400 });
      }

      const { error: updateErr } = await supabase
        .from("current_clearance_records")
        .update({
          status: "Signed",
          signed_at: new Date().toISOString(),
        })
        .eq("clearance_id", clearanceId);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Dispatch downstream Ready for Signing notifications
      const signedTiersMap = new Map<string, Set<number>>();
      signedTiersMap.set(targetUserId, new Set([tier || 1]));

      await dispatchReadyForSigningNotifications({
        signedUserIds: [targetUserId],
        signedTiersByUser: signedTiersMap,
        adminClient: supabase,
        isSingleRecordSign: true,
      });

      // Check if student has now fully completed clearance and alert admin
      await checkAndDispatchAdminCompletion(targetUserId, supabase);

      invalidateServerClearanceCache(targetUserId);
      invalidateServerDepartmentCache();
      invalidateServerAdminCache();

      return NextResponse.json({
        success: true,
        message: `Clearance record #${clearanceId} signed successfully. Downstream tier notifications dispatched.`,
      });
    }

    // ── Action: Revert a single clearance record back to Pending ──
    if (action === "revert") {
      if (!clearanceId) {
        return NextResponse.json({ error: "clearanceId is required to revert" }, { status: 400 });
      }

      const { error: revertErr } = await supabase
        .from("current_clearance_records")
        .update({
          status: "Pending",
          signed_at: null,
        })
        .eq("clearance_id", clearanceId);

      if (revertErr) {
        return NextResponse.json({ error: revertErr.message }, { status: 500 });
      }

      await revokeAdminCompletion(targetUserId, supabase);

      invalidateServerClearanceCache(targetUserId);
      invalidateServerDepartmentCache();
      invalidateServerAdminCache();

      return NextResponse.json({
        success: true,
        message: `Clearance record #${clearanceId} reverted to Pending.`,
      });
    }

    // ── Action: Sign ALL clearance records for active client ──
    if (action === "sign_all") {
      const { data: records, error: fetchErr } = await supabase
        .from("current_clearance_records")
        .select(`
          clearance_id,
          template_id,
          clearance_templates(tier)
        `)
        .eq("user_id", targetUserId);

      if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      }

      if (!records || records.length === 0) {
        return NextResponse.json({ error: "No clearance records found for client" }, { status: 404 });
      }

      const clearanceIds = records.map((r: any) => r.clearance_id);
      const now = new Date().toISOString();

      const { error: updateAllErr } = await supabase
        .from("current_clearance_records")
        .update({
          status: "Signed",
          signed_at: now,
        })
        .in("clearance_id", clearanceIds);

      if (updateAllErr) {
        return NextResponse.json({ error: updateAllErr.message }, { status: 500 });
      }

      // Collect all tiers to trigger downstream notification cascade
      const signedTiers = new Set<number>();
      for (const r of records) {
        const tpl = Array.isArray(r.clearance_templates) ? r.clearance_templates[0] : r.clearance_templates;
        if (tpl?.tier) signedTiers.add(tpl.tier);
      }
      const signedTiersMap = new Map<string, Set<number>>();
      signedTiersMap.set(targetUserId, signedTiers);

      await dispatchReadyForSigningNotifications({
        signedUserIds: [targetUserId],
        signedTiersByUser: signedTiersMap,
        adminClient: supabase,
        isSingleRecordSign: false,
      });

      await checkAndDispatchAdminCompletion(targetUserId, supabase);

      invalidateServerClearanceCache(targetUserId);
      invalidateServerDepartmentCache();
      invalidateServerAdminCache();

      return NextResponse.json({
        success: true,
        count: clearanceIds.length,
        message: `Signed all ${clearanceIds.length} clearance departments for client ${targetUserId}. Full completion evaluated.`,
      });
    }

    // ── Action: Revert ALL clearance records for active client ──
    if (action === "revert_all") {
      const { error: revAllErr } = await supabase
        .from("current_clearance_records")
        .update({
          status: "Pending",
          signed_at: null,
        })
        .eq("user_id", targetUserId);

      if (revAllErr) {
        return NextResponse.json({ error: revAllErr.message }, { status: 500 });
      }

      await revokeAdminCompletion(targetUserId, supabase);

      invalidateServerClearanceCache(targetUserId);
      invalidateServerDepartmentCache();
      invalidateServerAdminCache();

      return NextResponse.json({
        success: true,
        message: `All clearance records for client ${targetUserId} have been reverted to Pending.`,
      });
    }

    // ── Action: Batch Sign Course Prerequisite (Demonstrates Batch 'Ready for Signing' Notif) ──
    if (action === "batch_sign_course") {
      const targetCourseId = Number(courseId) || 1;
      const targetDeptName = deptName || "Cashier";

      // 1. Get all students enrolled in this course
      const { data: enrolledStudents, error: enrollErr } = await supabase
        .from("current_enrollments")
        .select(`
          student_id,
          course_sections!inner(
            course_id,
            courses!inner(course_name)
          )
        `)
        .eq("course_sections.course_id", targetCourseId);

      if (enrollErr) {
        return NextResponse.json({ error: enrollErr.message }, { status: 500 });
      }

      const studentIds = Array.from(new Set((enrolledStudents || []).map((e: any) => e.student_id)));
      if (studentIds.length === 0) {
        return NextResponse.json({ error: "No students currently enrolled in this course." }, { status: 400 });
      }

      const secObj = Array.isArray(enrolledStudents[0]?.course_sections)
        ? enrolledStudents[0].course_sections[0]
        : enrolledStudents[0].course_sections;
      const cObj = Array.isArray(secObj?.courses) ? secObj.courses[0] : secObj?.courses;
      const courseTitle = cObj?.course_name || `Course #${targetCourseId}`;

      // 2. Fetch pending records for this department among these course students
      const { data: recordsToSign, error: recErr } = await supabase
        .from("current_clearance_records")
        .select(`
          clearance_id,
          user_id,
          clearance_templates!inner(
            tier,
            clearance_departments!inner(dept_name)
          )
        `)
        .in("user_id", studentIds)
        .ilike("clearance_templates.clearance_departments.dept_name", `%${targetDeptName}%`);

      if (recErr) {
        return NextResponse.json({ error: recErr.message }, { status: 500 });
      }

      if (!recordsToSign || recordsToSign.length === 0) {
        return NextResponse.json({
          error: `No ${targetDeptName} clearance records found for students in ${courseTitle}.`,
        }, { status: 404 });
      }

      const clearanceIds = recordsToSign.map((r: any) => r.clearance_id);
      const affectedUserIds = Array.from(new Set(recordsToSign.map((r: any) => r.user_id)));

      // 3. Mark all records as Signed
      const { error: batchUpdateErr } = await supabase
        .from("current_clearance_records")
        .update({
          status: "Signed",
          signed_at: new Date().toISOString(),
        })
        .in("clearance_id", clearanceIds);

      if (batchUpdateErr) {
        return NextResponse.json({ error: batchUpdateErr.message }, { status: 500 });
      }

      // 4. Dispatch batch "Ready for Signing" notifications to subsequent tiers (e.g. Tier 2)
      const signedTiersMap = new Map<string, Set<number>>();
      for (const record of recordsToSign) {
        const template = Array.isArray(record.clearance_templates)
          ? record.clearance_templates[0] : record.clearance_templates;
        if (!signedTiersMap.has(record.user_id)) signedTiersMap.set(record.user_id, new Set());
        signedTiersMap.get(record.user_id)!.add(template?.tier ?? 1);
      }

      await dispatchReadyForSigningNotifications({
        signedUserIds: affectedUserIds,
        signedTiersByUser: signedTiersMap,
        adminClient: supabase,
        isSingleRecordSign: false, // Dispatches grouped batch notification to staff!
      });

      for (const uid of affectedUserIds) {
        invalidateServerClearanceCache(uid);
      }
      invalidateServerDepartmentCache();
      invalidateServerAdminCache();

      return NextResponse.json({
        success: true,
        count: affectedUserIds.length,
        courseName: courseTitle,
        deptName: targetDeptName,
        message: `Batch signed ${targetDeptName} for ${affectedUserIds.length} students in ${courseTitle}. Downstream 'Ready for Signing' batch notifications dispatched to department officers.`,
      });
    }

    // ── Action: Batch Revert Course Prerequisite ──
    if (action === "batch_revert_course") {
      const targetCourseId = Number(courseId) || 1;
      const targetDeptName = deptName || "Cashier";

      const { data: enrolledStudents } = await supabase
        .from("current_enrollments")
        .select(`
          student_id,
          course_sections!inner(
            course_id,
            courses!inner(course_name)
          )
        `)
        .eq("course_sections.course_id", targetCourseId);

      const studentIds = Array.from(new Set((enrolledStudents || []).map((e: any) => e.student_id)));
      if (studentIds.length > 0) {
        const { data: recordsToRevert } = await supabase
          .from("current_clearance_records")
          .select(`
            clearance_id,
            user_id,
            clearance_templates!inner(
              clearance_departments!inner(dept_name)
            )
          `)
          .in("user_id", studentIds)
          .ilike("clearance_templates.clearance_departments.dept_name", `%${targetDeptName}%`);

        if (recordsToRevert && recordsToRevert.length > 0) {
          const ids = recordsToRevert.map((r: any) => r.clearance_id);
          await supabase
            .from("current_clearance_records")
            .update({
              status: "Pending",
              signed_at: null,
            })
            .in("clearance_id", ids);

          // Clean test notifications
          await supabase
            .from("notifications")
            .delete()
            .ilike("title", `%Ready for Signing%`);

          for (const uid of studentIds) {
            invalidateServerClearanceCache(uid);
          }
          invalidateServerDepartmentCache();
          invalidateServerAdminCache();

          return NextResponse.json({
            success: true,
            count: studentIds.length,
            message: `Reverted ${targetDeptName} to Pending for ${studentIds.length} students in course #${targetCourseId}.`,
          });
        }
      }

      return NextResponse.json({
        success: true,
        count: 0,
        message: `No records found to revert for course #${targetCourseId}.`,
      });
    }

    // ── Action: Bottleneck Feature on a Specific Department ──
    if (action === "bottleneck") {
      const shiftHours = hours !== undefined ? Number(hours) : 24;
      const targetDeptName = deptName || "Cashier";
      const targetScope = scope || "single"; // "single" | "all"

      const targetDate = shiftHours > 0
        ? new Date(Date.now() - shiftHours * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();

      // Find matching clearance records
      let query = supabase
        .from("current_clearance_records")
        .select(`
          clearance_id,
          user_id,
          clearance_templates!inner(
            dept_id,
            clearance_departments!inner(dept_id, dept_name)
          )
        `);

      if (deptId) {
        query = query.eq("clearance_templates.dept_id", deptId);
      } else {
        query = query.ilike("clearance_templates.clearance_departments.dept_name", `%${targetDeptName}%`);
      }

      if (targetScope === "single" && targetUserId) {
        query = query.eq("user_id", targetUserId);
      }

      const { data: matchedRecords, error: matchErr } = await query;
      if (matchErr) {
        return NextResponse.json({ error: matchErr.message }, { status: 500 });
      }

      if (!matchedRecords || matchedRecords.length === 0) {
        return NextResponse.json({
          error: `No clearance records found for ${targetDeptName} with scope '${targetScope}'.`,
        }, { status: 404 });
      }

      const clearanceIds = matchedRecords.map((r: any) => r.clearance_id);

      const { error: updateErr } = await supabase
        .from("current_clearance_records")
        .update({ created_at: targetDate })
        .in("clearance_id", clearanceIds);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      if (targetUserId) {
        invalidateServerClearanceCache(targetUserId);
      }
      invalidateServerDepartmentCache();
      invalidateServerAdminCache();

      return NextResponse.json({
        success: true,
        affectedCount: clearanceIds.length,
        department: targetDeptName,
        hours: shiftHours,
        scope: targetScope,
        message: shiftHours > 0
          ? `Injected +${shiftHours}h bottleneck dwell into ${targetDeptName} (${clearanceIds.length} record${clearanceIds.length > 1 ? "s" : ""} affected). Records now register as overdue.`
          : `Reset dwell time to 0h for ${targetDeptName} (${clearanceIds.length} record${clearanceIds.length > 1 ? "s" : ""} affected).`,
      });
    }

    // ── Action: Time Travel (Shift created_at back to simulate overdue dwell) ──
    if (action === "time_travel") {
      const shiftHours = parseInt(hours) || 48;
      const shiftedDate = new Date(Date.now() - shiftHours * 60 * 60 * 1000).toISOString();

      if (clearanceId) {
        await supabase
          .from("current_clearance_records")
          .update({ created_at: shiftedDate })
          .eq("clearance_id", clearanceId);
      } else {
        await supabase
          .from("current_clearance_records")
          .update({ created_at: shiftedDate })
          .eq("user_id", targetUserId);
      }

      invalidateServerClearanceCache(targetUserId);
      invalidateServerDepartmentCache();
      invalidateServerAdminCache();

      return NextResponse.json({
        success: true,
        message: `Simulated ${shiftHours} hours of elapsed time for overdue dwell detection.`,
      });
    }

    // ── Action: Reset Demo Student to Baseline State ──
    if (action === "reset") {
      // 1. Reset all clearance records to Pending and now()
      await supabase
        .from("current_clearance_records")
        .update({
          status: "Pending",
          signed_at: null,
          created_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);

      // 2. Clean up test Ready for Signing notifications for this user
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", targetUserId)
        .ilike("title", "%Ready for Signing%");

      await revokeAdminCompletion(targetUserId, supabase);

      invalidateServerClearanceCache(targetUserId);
      invalidateServerDepartmentCache();
      invalidateServerAdminCache();

      return NextResponse.json({
        success: true,
        message: `Demo student ${targetUserId} reset to baseline (All Clearances: Pending).`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Simulation POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
