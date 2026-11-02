import { shrinkCourseName } from "@/utils/formatters";

interface EligibleClientInfo {
  userId: string;
  clearanceId: number | string;
  isStudent: boolean;
  name: string;
  sectionCode?: string;
  pureSecCode?: string;
  courseName?: string;
  sectionId?: number | string;
  deptId: number;
  deptName: string;
  staffId?: string;
}

export interface DispatchReadyForSigningParams {
  signedUserIds: string[];
  /**
   * For each user, the set of tiers that were JUST signed in this event.
   * A pending department with tier T is only unblocked if a signed record has tier < T.
   */
  signedTiersByUser: Map<string, Set<number>>;
  adminClient: any;
  isSingleRecordSign?: boolean;
}

/**
 * Evaluates subsequent clearance prerequisites and dispatches "Ready for Signing"
 * notifications to departments whose prerequisite requirements have JUST been completed.
 *
 * Rules:
 * 1. Only departments with tier > 1 have prerequisites.
 * 2. The department is only notified if one of the records just signed was a prerequisite (tier < currentTier).
 * 3. All prerequisite records (tier < currentTier) must now be 'Signed'.
 * 4. Deduplicates to prevent duplicate active notifications for the same student and department.
 */
export async function dispatchReadyForSigningNotifications({
  signedUserIds,
  signedTiersByUser,
  adminClient,
  isSingleRecordSign = false,
}: DispatchReadyForSigningParams) {
  if (signedUserIds.length === 0) return;

  try {
    // 1. Fetch all clearance records for the affected users
    const { data: allUserClearances } = await adminClient
      .from("clearance_records")
      .select(`
        clearance_id,
        user_id,
        status,
        template_id,
        clearance_templates (
          tier,
          course_id,
          dept_id,
          staff_id,
          is_active,
          clearance_departments (
            dept_id,
            dept_name
          )
        )
      `)
      .in("user_id", signedUserIds);

    if (!allUserClearances || allUserClearances.length === 0) return;

    // 2. Fetch student details, enrollments, and staff details in parallel
    const [studentsRes, enrollmentsRes, staffsRes] = await Promise.all([
      adminClient
        .from("students")
        .select("student_id, student_name")
        .in("student_id", signedUserIds),
      adminClient
        .from("enrollments")
        .select(`
          student_id,
          course_sections (
            section_id,
            section_number,
            year,
            semester,
            courses (
              course_id,
              course_name
            )
          )
        `)
        .in("student_id", signedUserIds),
      adminClient
        .from("staffs")
        .select("staff_id, staff_name")
        .in("staff_id", signedUserIds),
    ]);

    const studentMap = new Map<string, string>();
    for (const s of studentsRes.data || []) {
      if (s.student_id && s.student_name) studentMap.set(s.student_id, s.student_name);
    }

    const sectionMap = new Map<
      string,
      { sectionId: number | string; sectionCode: string; pureSecCode: string; courseName: string }
    >();
    for (const e of (enrollmentsRes.data || []) as any[]) {
      const sec = Array.isArray(e.course_sections) ? e.course_sections[0] : e.course_sections;
      if (sec) {
        const cObj = Array.isArray(sec.courses) ? sec.courses[0] : sec.courses;
        const rawCourseName = cObj?.course_name || "";
        const cName = rawCourseName
          ? shrinkCourseName(rawCourseName) || rawCourseName
          : "General";
        const pureSecCode = `${sec.year || 1}/${sec.semester || 1}-${sec.section_number || 1}`;
        const secCode = `${cName} ${pureSecCode}`;
        sectionMap.set(e.student_id, {
          sectionId: sec.section_id,
          sectionCode: secCode,
          pureSecCode,
          courseName: cName,
        });
      }
    }

    const staffMap = new Map<string, string>();
    for (const st of staffsRes.data || []) {
      if (st.staff_id && st.staff_name) staffMap.set(st.staff_id, st.staff_name);
    }

    const newlyEligibleByDept = new Map<number, EligibleClientInfo[]>();

    for (const uId of signedUserIds) {
      const userSignedTiers = signedTiersByUser.get(uId) || new Set<number>();
      const uRecords = allUserClearances.filter((c: any) => c.user_id === uId);
      const pendingRecords = uRecords.filter((c: any) => c.status === "Pending");

      for (const pr of pendingRecords) {
        const tpl = Array.isArray(pr.clearance_templates) ? pr.clearance_templates[0] : pr.clearance_templates;
        if (tpl?.is_active === false) continue;
        const currentTier = tpl?.tier ?? 1;
        const dept = Array.isArray(tpl?.clearance_departments) ? tpl.clearance_departments[0] : tpl?.clearance_departments;
        const deptId = dept?.dept_id;
        const deptName = dept?.dept_name;

        if (!deptId) continue;

        // RULE 1: Only departments with prerequisites (currentTier > 1) can be unblocked
        if (currentTier <= 1) continue;

        // RULE 2: Did the batch of signatures just executed include a prerequisite for this pending department?
        const justSignedAPrereq = Array.from(userSignedTiers).some((st) => st < currentTier);
        if (!justSignedAPrereq) {
          // Department in same tier or lower tier was signed; this is NOT a prerequisite for current department
          continue;
        }

        // RULE 3: Check if ALL active lower tiers for this user are now Signed
        const blocking = uRecords.filter((c: any) => {
          const itemTpl = Array.isArray(c.clearance_templates) ? c.clearance_templates[0] : c.clearance_templates;
          const itemIsActive = itemTpl?.is_active !== false;
          const itemTier = itemTpl?.tier ?? 1;
          return itemIsActive && itemTier < currentTier && c.status !== "Signed";
        });

        if (blocking.length === 0) {
          const isStudent = studentMap.has(uId);
          const sName = studentMap.get(uId) || staffMap.get(uId) || uId;
          const secInfo = sectionMap.get(uId);

          if (!newlyEligibleByDept.has(deptId)) {
            newlyEligibleByDept.set(deptId, []);
          }

          newlyEligibleByDept.get(deptId)!.push({
            userId: uId,
            clearanceId: pr.clearance_id,
            isStudent,
            name: sName,
            sectionCode: secInfo?.sectionCode,
            pureSecCode: secInfo?.pureSecCode,
            courseName: secInfo?.courseName,
            sectionId: secInfo?.sectionId,
            deptId,
            deptName,
            staffId: tpl?.staff_id,
          });
        }
      }
    }

    if (newlyEligibleByDept.size === 0) return;

    const readyNotifsToInsert: any[] = [];

    for (const [deptId, clients] of newlyEligibleByDept.entries()) {
      const studentGroups = new Map<string, EligibleClientInfo[]>();
      const staffList: EligibleClientInfo[] = [];

      for (const cl of clients) {
        if (cl.isStudent) {
          const key = cl.sectionCode || "General";
          if (!studentGroups.has(key)) studentGroups.set(key, []);
          studentGroups.get(key)!.push(cl);
        } else {
          staffList.push(cl);
        }
      }

      // Student notifications
      for (const [secCode, group] of studentGroups.entries()) {
        if (group.length === 1 && isSingleRecordSign) {
          const item = group[0];
          const notifDesc = `${item.name} (${item.sectionCode || "Student"}) has met all requirements`;
          const effectiveSection = item.pureSecCode || (item.sectionId ? String(item.sectionId) : (item.sectionCode || ""));
          const refUrl = `/department/clients?type=students&course=${encodeURIComponent(item.courseName || "")}&section=${encodeURIComponent(effectiveSection)}&clientId=${encodeURIComponent(item.userId)}`;

          // Check for existing notification to avoid duplicates
          const { data: existing } = await adminClient
            .from("notifications")
            .select("notif_id")
            .eq("department_id", deptId)
            .eq("title", "Ready for Signing")
            .contains("metadata", { studentId: item.userId })
            .maybeSingle();

          if (!existing) {
            readyNotifsToInsert.push({
              user_id: item.staffId || null,
              department_id: deptId,
              target_role: "department",
              category: "clearance",
              title: "Ready for Signing",
              description: notifDesc,
              type: "Info",
              ref_url: refUrl,
              is_read: false,
              metadata: {
                type: "students",
                studentId: item.userId,
                studentName: item.name,
                sectionCode: effectiveSection,
                displaySectionCode: item.sectionCode,
                courseName: item.courseName,
                sectionId: item.sectionId,
                isBatch: false,
              },
            });
          }
        } else {
          // Batch or multi-student display
          const count = group.length;
          const notifDesc = `${count}+ Students from ${secCode} has met all requirements`;
          const first = group[0];
          const effectiveSection = first.pureSecCode || (first.sectionId ? String(first.sectionId) : (first.sectionCode || ""));
          const refUrl = `/department/clients?type=students&course=${encodeURIComponent(first.courseName || "")}&section=${encodeURIComponent(effectiveSection)}`;

          readyNotifsToInsert.push({
            department_id: deptId,
            target_role: "department",
            category: "clearance",
            title: "Ready for Signing",
            description: notifDesc,
            type: "Info",
            ref_url: refUrl,
            is_read: false,
            metadata: {
              type: "students",
              sectionCode: effectiveSection,
              displaySectionCode: secCode,
              courseName: first.courseName,
              sectionId: first.sectionId,
              count,
              isBatch: true,
            },
          });
        }
      }

      // Staff notifications
      if (staffList.length === 1 && isSingleRecordSign) {
        const item = staffList[0];
        const notifDesc = `${item.name} has met all requirements`;
        const refUrl = `/department/clients?type=staff&clientId=${encodeURIComponent(item.userId)}`;

        const { data: existing } = await adminClient
          .from("notifications")
          .select("notif_id")
          .eq("department_id", deptId)
          .eq("title", "Ready for Signing")
          .contains("metadata", { staffId: item.userId })
          .maybeSingle();

        if (!existing) {
          readyNotifsToInsert.push({
            user_id: item.staffId || null,
            department_id: deptId,
            target_role: "department",
            category: "clearance",
            title: "Ready for Signing",
            description: notifDesc,
            type: "Info",
            ref_url: refUrl,
            is_read: false,
            metadata: {
              type: "staff",
              staffId: item.userId,
              staffName: item.name,
              isBatch: false,
            },
          });
        }
      } else if (staffList.length > 0) {
        const count = staffList.length;
        const notifDesc = `${count}+ Staff has met all requirements`;
        const refUrl = `/department/clients?type=staff`;

        readyNotifsToInsert.push({
          department_id: deptId,
          target_role: "department",
          category: "clearance",
          title: "Ready for Signing",
          description: notifDesc,
          type: "Info",
          ref_url: refUrl,
          is_read: false,
          metadata: {
            type: "staff",
            count,
            isBatch: true,
          },
        });
      }
    }

    if (readyNotifsToInsert.length > 0) {
      const { error: readyNotifErr } = await adminClient
        .from("notifications")
        .insert(readyNotifsToInsert);

      if (readyNotifErr) {
        console.error("[Ready for Signing] Failed to insert notifications:", readyNotifErr);
      }
    }
  } catch (err) {
    console.error("[Ready for Signing] Error dispatching notifications:", err);
  }
}
