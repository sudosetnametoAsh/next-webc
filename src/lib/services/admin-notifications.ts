import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

/**
 * Service to manage Admin-specific notifications:
 * Strictly limited to:
 * 1. Bottlenecks (departments with clients stalled past 24 hours)
 * 2. Clearance Completion based on templates (clients who have completed all required department sign-offs)
 */

export async function syncAdminNotifications(adminClient = getSupabaseAdmin()) {
  try {
    // ── 1. Clearance Completion Sync (based on templates) ──
    const { data: allClearances } = await adminClient
      .from("clearance_records")
      .select("user_id, status");

    if (allClearances && allClearances.length > 0) {
      const userClearanceMap = new Map<string, string[]>();
      for (const rec of allClearances) {
        if (!userClearanceMap.has(rec.user_id)) {
          userClearanceMap.set(rec.user_id, []);
        }
        userClearanceMap.get(rec.user_id)!.push(rec.status);
      }

      const completedUserIds: string[] = [];
      for (const [userId, statuses] of userClearanceMap.entries()) {
        if (statuses.length > 0 && statuses.every((s) => s === "Signed")) {
          completedUserIds.push(userId);
        }
      }

      if (completedUserIds.length > 0) {
        // Query existing admin completion notifications to prevent duplicates
        const { data: existingCompletionNotifs } = await adminClient
          .from("notifications")
          .select("metadata")
          .eq("target_role", "admin")
          .or("category.eq.clearance,category.eq.completion,title.ilike.%completed%");

        const alreadyNotifiedUserIds = new Set<string>();
        (existingCompletionNotifs || []).forEach((n: any) => {
          if (n.metadata?.clientId) alreadyNotifiedUserIds.add(String(n.metadata.clientId));
          if (n.metadata?.userId) alreadyNotifiedUserIds.add(String(n.metadata.userId));
        });

        const unnotifiedUserIds = completedUserIds.filter((id) => !alreadyNotifiedUserIds.has(id));

        if (unnotifiedUserIds.length > 0) {
          const [{ data: students }, { data: staffs }, { data: enrollments }] = await Promise.all([
            adminClient.from("students").select("student_id, student_name").in("student_id", unnotifiedUserIds),
            adminClient.from("staffs").select("staff_id, staff_name").in("staff_id", unnotifiedUserIds),
            adminClient.from("enrollments").select("student_id, course_sections(section_code, courses(course_name))").in("student_id", unnotifiedUserIds),
          ]);

          const studentMap = new Map((students || []).map((s: any) => [s.student_id, s.student_name]));
          const staffMap = new Map((staffs || []).map((s: any) => [s.staff_id, s.staff_name]));
          const enrollMap = new Map(
            (enrollments || []).map((e: any) => {
              const cs = Array.isArray(e.course_sections) ? e.course_sections[0] : e.course_sections;
              const crs = Array.isArray(cs?.courses) ? cs.courses[0] : cs?.courses;
              return [e.student_id, cs?.section_code || crs?.course_name || "General"];
            })
          );

          const newNotifs = unnotifiedUserIds.map((userId) => {
            const isStudent = studentMap.has(userId);
            const clientName = studentMap.get(userId) || staffMap.get(userId) || userId;
            const cohort = enrollMap.get(userId) || (isStudent ? "Student Cohort" : "Faculty & Staff");
            const roleLabel = isStudent ? "Student" : "Staff Member";
            const totalDepts = userClearanceMap.get(userId)?.length || 0;

            return {
              target_role: "admin",
              category: "clearance",
              title: `Clearance Completed: ${clientName}`,
              description: `${roleLabel} ${clientName} (${cohort}) has completed all ${totalDepts} required clearance department sign-offs.`,
              type: "Success",
              ref_url: `/admin/clients?status=cleared&clientId=${encodeURIComponent(userId)}`,
              is_read: false,
              metadata: {
                type: "completion",
                clientId: userId,
                clientName,
                cohort,
                totalDepartments: totalDepts,
                completedAt: new Date().toISOString(),
              },
            };
          });

          await adminClient.from("notifications").insert(newNotifs);
        }
      }
    }

    // ── 2. Bottleneck Alerts Sync (departments where clients are stalled > 24 hours) ──
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: stalledRecords } = await adminClient
      .from("clearance_records")
      .select(`
        clearance_id,
        created_at,
        clearance_templates(
          dept_id,
          clearance_departments(dept_id, dept_name)
        )
      `)
      .neq("status", "Signed")
      .lt("created_at", cutoff);

    if (stalledRecords && stalledRecords.length > 0) {
      const deptStalledMap = new Map<number, { deptId: number; deptName: string; count: number }>();
      for (const rec of (stalledRecords as any[])) {
        const tpl = Array.isArray(rec.clearance_templates) ? rec.clearance_templates[0] : rec.clearance_templates;
        const dept = Array.isArray(tpl?.clearance_departments) ? tpl.clearance_departments[0] : tpl?.clearance_departments;
        if (dept?.dept_id) {
          if (!deptStalledMap.has(dept.dept_id)) {
            deptStalledMap.set(dept.dept_id, {
              deptId: dept.dept_id,
              deptName: dept.dept_name,
              count: 0,
            });
          }
          deptStalledMap.get(dept.dept_id)!.count++;
        }
      }

      // Check existing bottleneck notifications created in the last 12 hours
      const twelveHoursAgo = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
      const { data: recentBottlenecks } = await adminClient
        .from("notifications")
        .select("department_id, metadata, created_at")
        .eq("target_role", "admin")
        .eq("category", "bottleneck")
        .gt("created_at", twelveHoursAgo);

      const activeBottleneckDeptIds = new Set<number>();
      (recentBottlenecks || []).forEach((n: any) => {
        if (n.department_id) activeBottleneckDeptIds.add(n.department_id);
        if (n.metadata?.deptId) activeBottleneckDeptIds.add(Number(n.metadata.deptId));
      });

      const bottleneckThreshold = 10;
      const newBottleneckNotifs: any[] = [];

      for (const [deptId, info] of deptStalledMap.entries()) {
        if (info.count >= bottleneckThreshold && !activeBottleneckDeptIds.has(deptId)) {
          newBottleneckNotifs.push({
            target_role: "admin",
            department_id: deptId,
            category: "bottleneck",
            title: `Bottleneck Alert: ${info.deptName}`,
            description: `${info.deptName} has ${info.count} clients stalled past 24 hours waiting for clearance sign-off.`,
            type: "Alert",
            ref_url: `/admin/clients?status=overdue&department=${encodeURIComponent(info.deptName)}`,
            is_read: false,
            metadata: {
              type: "bottleneck",
              deptId,
              deptName: info.deptName,
              stalledCount: info.count,
              detectedAt: new Date().toISOString(),
            },
          });
        }
      }

      if (newBottleneckNotifs.length > 0) {
        await adminClient.from("notifications").insert(newBottleneckNotifs);
      }
    }
  } catch (err) {
    console.warn("[Admin Notifications Sync] Warning:", err);
  }
}

/**
 * Checks and creates an admin "Clearance Completed" notification when a client completes all clearances.
 */
export async function checkAndDispatchAdminCompletion(userId: string, adminClient = getSupabaseAdmin()) {
  try {
    const { data: userRecs } = await adminClient
      .from("clearance_records")
      .select("status")
      .eq("user_id", userId);

    if (!userRecs || userRecs.length === 0) return;

    const isAllSigned = userRecs.every((c: any) => c.status === "Signed");
    if (!isAllSigned) return;

    // Check if already notified
    const { data: existing } = await adminClient
      .from("notifications")
      .select("notif_id")
      .eq("target_role", "admin")
      .contains("metadata", { clientId: userId, type: "completion" })
      .maybeSingle();

    if (existing) return;

    const [{ data: stu }, { data: stf }, { data: enr }] = await Promise.all([
      adminClient.from("students").select("student_name").eq("student_id", userId).maybeSingle(),
      adminClient.from("staffs").select("staff_name").eq("staff_id", userId).maybeSingle(),
      adminClient.from("enrollments").select("course_sections(section_code, courses(course_name))").eq("student_id", userId).maybeSingle(),
    ]);

    const clientName = stu?.student_name || stf?.staff_name || userId;
    const cs = Array.isArray(enr?.course_sections) ? enr.course_sections[0] : (enr?.course_sections as any);
    const crs = Array.isArray(cs?.courses) ? cs.courses[0] : cs?.courses;
    const cohort = cs?.section_code || crs?.course_name || "General";
    const clientType = stu ? "Student" : "Staff Member";

    await adminClient.from("notifications").insert({
      target_role: "admin",
      category: "clearance",
      title: `Clearance Completed: ${clientName}`,
      description: `${clientType} ${clientName} (${cohort}) has completed all ${userRecs.length} required clearance department sign-offs.`,
      type: "Success",
      ref_url: `/admin/clients?status=cleared&clientId=${encodeURIComponent(userId)}`,
      is_read: false,
      metadata: {
        type: "completion",
        clientId: userId,
        clientName,
        cohort,
        totalDepartments: userRecs.length,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("[Admin Completion Dispatch] Warning:", err);
  }
}

/**
 * Revokes any admin "Clearance Completed" notification if clearance was reverted.
 */
export async function revokeAdminCompletion(userId: string, adminClient = getSupabaseAdmin()) {
  try {
    await adminClient
      .from("notifications")
      .delete()
      .eq("target_role", "admin")
      .contains("metadata", { clientId: userId, type: "completion" });
  } catch (err) {
    console.warn("[Admin Completion Revoke] Warning:", err);
  }
}
