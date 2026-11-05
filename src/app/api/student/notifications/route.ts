import { createClient } from "@/lib/db/supabase-server";
import { getNotificationCourseScope } from "@/lib/services/notification-course-scope";
import { isNotificationVisible } from "@/lib/notification-visibility";
import { getSession } from "@/lib/auth/get-session";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { syncAdminNotifications } from "@/lib/services/admin-notifications";
import { syncStudentDueNotifications } from "@/lib/services/due-notifications";
import { syncStudentCompletionNotification } from "@/lib/services/student-completion";
import { NextRequest, NextResponse } from "next/server";

async function hasAdminNotificationAccess() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  const roles = user?.user_metadata?.custom_claims?.roles;
  return !error && Array.isArray(roles) && roles.includes("Admin");
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = req.nextUrl.searchParams;
    let session;
    try { session = await getSession(); }
    catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    const userId = session.user_id;
    const role = (searchParams.get("role") || "student").toLowerCase();
    let deptId: string | null = searchParams.get("departmentId");
    if (!["student", "department", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid notification role" }, { status: 400 });
    }
    if (role === "admin" && !await hasAdminNotificationAccess()) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }
    const courseScope = role === "admin" ? undefined : await getNotificationCourseScope(supabase, userId);

    // Auto-detect department association if not explicitly passed
    if (!deptId && userId) {
      const { data: staffTmpl } = await supabase
        .from("clearance_templates")
        .select("dept_id")
        .eq("staff_id", userId)
        .limit(1)
        .maybeSingle();

      if (staffTmpl?.dept_id) {
        deptId = String(staffTmpl.dept_id);
      }
    }

    if (!userId && !deptId && role !== "admin") {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // 1. Fetch existing notifications based on target role & scope
    let query = supabase.from("notifications").select("*");

    if (role === "admin") {
      await syncAdminNotifications(supabase);
      query = supabase
        .from("notifications")
        .select("*")
        .eq("target_role", "admin")
        .or("category.eq.bottleneck,category.eq.clearance,category.eq.completion,category.eq.template,title.ilike.%bottleneck%,title.ilike.%completed%");
    } else if (role === "department") {
      // Synchronize client clearance deadlines & completion alerts for the officer
      if (userId) {
        await syncStudentDueNotifications(userId, supabase);
        await syncStudentCompletionNotification(userId, supabase);
      }

      // Department staff receive both their direct notifications (personal clearance + assigned duties)
      // and department broadcasts
      const orClauses: string[] = [];
      if (userId) {
        orClauses.push(`user_id.eq.${userId}`);
      }
      if (deptId) {
        orClauses.push(`and(user_id.is.null,department_id.eq.${deptId})`);
      }
      orClauses.push(`and(user_id.is.null,department_id.is.null,target_role.eq.department)`);
      query = query.or(orClauses.join(","));
    } else {
      // Default: regular student / client — sync approaching deadlines (< 24 hours) and clearance completion
      if (userId) {
        await syncStudentDueNotifications(userId, supabase);
        await syncStudentCompletionNotification(userId, supabase);
      }

      query = userId
        ? query.or(`user_id.eq.${userId},and(target_role.eq.student,user_id.is.null)`)
        : query.eq("target_role", "student");
    }

    const { data: existingNotifs, error: fetchErr } = await query.order("created_at", { ascending: false });

    if (fetchErr) {
      console.error("Fetch notifications error:", fetchErr);
    }

    const notifList = existingNotifs || [];

    // For department notifications, resolve any raw student IDs in descriptions to client names
    let studentNameMap = new Map<string, { name: string; sectionCode?: string; courseName?: string }>();
    if (role === "department" && notifList.length > 0) {
      const studentIdsToLookup = new Set<string>();
      for (const n of notifList) {
        if (n.metadata?.studentId && !n.metadata?.studentName) {
          studentIdsToLookup.add(String(n.metadata.studentId));
        }
        const sMatch = (n.description || "").match(/Student\s+([0-9A-Za-z_-]+)/i);
        if (sMatch && sMatch[1]) {
          studentIdsToLookup.add(sMatch[1]);
        }
        const rMatch = (n.description || "").match(/\(([0-9]{8,15})\)/);
        if (rMatch && rMatch[1]) {
          studentIdsToLookup.add(rMatch[1]);
        }
      }

      if (studentIdsToLookup.size > 0) {
        const [studentsData, enrollmentsData] = await Promise.all([
          supabase
            .from("students")
            .select("student_id, student_name")
            .in("student_id", Array.from(studentIdsToLookup)),
          supabase
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
            .in("student_id", Array.from(studentIdsToLookup)),
        ]);

        const enrollMap = new Map<string, { sectionCode: string; courseName: string }>();
        for (const e of (enrollmentsData.data || []) as any[]) {
          const sec = Array.isArray(e.course_sections) ? e.course_sections[0] : e.course_sections;
          if (sec) {
            const cObj = Array.isArray(sec.courses) ? sec.courses[0] : sec.courses;
            const rawCourseName = cObj?.course_name || "";
            const cName = rawCourseName.includes("Computer Science") ? "BSCS" : rawCourseName || "General";
            const sCode = `${cName} ${sec.year || 1}/${sec.semester || 1}-${sec.section_number || 1}`;
            enrollMap.set(e.student_id, { sectionCode: sCode, courseName: cName });
          }
        }

        for (const s of studentsData.data || []) {
          if (s.student_id && s.student_name) {
            const secInfo = enrollMap.get(s.student_id);
            studentNameMap.set(s.student_id, {
              name: s.student_name,
              sectionCode: secInfo?.sectionCode,
              courseName: secInfo?.courseName,
            });
          }
        }
      }
    }

    const defaultRefUrl =
      role === "admin"
        ? "/admin/dashboard"
        : role === "department"
        ? "/department/clients"
        : "/clearance/tasks";

    const formatted = notifList
      .filter((n: any) => {
        if (!isNotificationVisible(n, role, courseScope)) return false;
        if (role === "department") {
          const t = (n.title || "").toLowerCase();
          if (t.includes("requirement cleared") || t.includes("clearance signed")) {
            return false;
          }
        }
        return true;
      })
      .map((n: any) => {
        let desc = n.description;

        // If department role, format description to ensure client name instead of raw student ID
        if (role === "department") {
          const sMatch = desc.match(/Student\s+([0-9A-Za-z_-]+)/i);
          if (sMatch && sMatch[1] && studentNameMap.has(sMatch[1])) {
            desc = desc.replace(sMatch[0], studentNameMap.get(sMatch[1])!.name);
          }

          // If "Name (02000248919) has met all prerequisites" -> replace with "Name (BSCS 4/1-1) has met all requirements"
          const rMatch = desc.match(/\(([0-9]{8,15})\)/);
          if (rMatch && rMatch[1] && studentNameMap.has(rMatch[1])) {
            const secCode = studentNameMap.get(rMatch[1])?.sectionCode || "Student";
            desc = desc.replace(rMatch[0], `(${secCode}) has met all requirements`);
            if (desc.includes("has met all prerequisites")) {
              desc = desc.replace(/\s*has met all prerequisites\.\s*$/, "");
            }
          }

          // Ensure any "has met all prerequisites" is unified to "has met all requirements"
          if (desc.includes("has met all prerequisites")) {
            desc = desc.replace(/has met all prerequisites/gi, "has met all requirements");
          }
        }

        return {
          id: String(n.notif_id),
          title: n.title,
          description: desc,
          timestamp: n.created_at,
          type: (n.type || "info").toLowerCase(),
          category: n.category || "system",
          targetRole: n.target_role,
          departmentId: n.department_id,
          userId: n.user_id,
          read: Boolean(n.is_read),
          metadata: {
            refUrl: n.ref_url || defaultRefUrl,
            sectionId: n.section_id,
            courseId: n.course_id,
            ...(typeof n.metadata === "object" && n.metadata !== null ? n.metadata : {}),
          },
        };
      });

    const unreadCount = formatted.filter((n: any) => !n.read).length;

    return NextResponse.json({
      notifications: formatted,
      unreadCount,
    });
  } catch (err: any) {
    console.error("Notifications API Error:", err);
    return NextResponse.json(
      { notifications: [], unreadCount: 0, error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Use the signed-in client so the admin-only database read policy also constrains updates.
    const supabase = await createClient();
    const body = await req.json();
    const { notifId, all, role, departmentId } = body;
    let session;
    try { session = await getSession(); }
    catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    const targetUserId = session.user_id;
    let targetDeptId = departmentId;
    if (role === "admin" && !await hasAdminNotificationAccess()) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    if (!targetDeptId && targetUserId) {
      const { data: staffTmpl } = await supabase
        .from("clearance_templates")
        .select("dept_id")
        .eq("staff_id", targetUserId)
        .limit(1)
        .maybeSingle();
      if (staffTmpl?.dept_id) {
        targetDeptId = staffTmpl.dept_id;
      }
    }

    if (all) {
      if (role === "admin") {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .or(`target_role.eq.admin${targetUserId ? `,user_id.eq.${targetUserId}` : ""}`)
          .eq("is_read", false);
      } else if (role === "department" || targetDeptId) {
        const orClauses: string[] = [];
        if (targetUserId) {
          orClauses.push(`user_id.eq.${targetUserId}`);
        }
        if (targetDeptId) {
          orClauses.push(`and(user_id.is.null,department_id.eq.${targetDeptId})`);
        }
        orClauses.push(`and(user_id.is.null,department_id.is.null,target_role.eq.department)`);

        await supabase
          .from("notifications")
          .update({ is_read: true })
          .or(orClauses.join(","))
          .eq("is_read", false);
      } else if (targetUserId) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", targetUserId)
          .eq("is_read", false);
      }
    } else if (notifId) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("notif_id", parseInt(notifId));
    } else if (Array.isArray(body.taskIds) && body.taskIds.length > 0 && targetUserId) {
      const orClauses: string[] = [];
      for (const tid of body.taskIds) {
        const num = parseInt(String(tid));
        if (!isNaN(num) && num > 0) {
          orClauses.push(`metadata->>taskId.eq.${num}`);
          orClauses.push(`ref_url.ilike.%taskId=${num}%`);
        }
      }
      if (Array.isArray(body.taskTitles)) {
        for (const title of body.taskTitles) {
          const clean = String(title).replace(/["'%,\\]/g, "").trim();
          if (clean.length > 2) {
            orClauses.push(`description.ilike.%${clean}%`);
          }
        }
      }
      if (orClauses.length > 0) {
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", targetUserId)
          .eq("is_read", false)
          .or(orClauses.join(","));
        if (error) {
          console.error("Batch update notification error:", error);
        }
      }
    } else if (body.taskId && targetUserId) {
      const taskIdNum = parseInt(body.taskId);
      const orClauses = [
        `metadata->>taskId.eq.${taskIdNum}`,
        `ref_url.ilike.%taskId=${taskIdNum}%`,
      ];
      if (body.taskTitle) {
        const clean = String(body.taskTitle).replace(/["'%,\\]/g, "").trim();
        if (clean.length > 2) {
          orClauses.push(`description.ilike.%${clean}%`);
        }
      }
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", targetUserId)
        .eq("is_read", false)
        .or(orClauses.join(","));
      if (error) {
        console.error("Single task notification update error:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update notification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
