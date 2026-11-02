import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { logActivity } from "@/lib/log-activity";
import smsGateWay from "@/lib/services/sms-gateway";
import { shrinkCourseName } from "@/utils/formatters";
import { dispatchReadyForSigningNotifications } from "@/lib/services/ready-for-signing-notifications";
import { checkAndDispatchAdminCompletion, revokeAdminCompletion } from "@/lib/services/admin-notifications";
import { checkAndDispatchStudentCompletion, revokeStudentCompletionNotification } from "@/lib/services/student-completion";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";
import { PostgrestError } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type Data = {
  students: { phone_number: string } | null;
};

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user_id } = await getSession();
    const { ids, status, signed_at } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Request body must be a non-empty array of IDs." },
        { status: 400 },
      );
    }

    const adminClient = getSupabaseAdmin();

    // Fetch target records and department info using admin client to ensure full visibility
    const { data: fetchedRecords, error: fetchErr } = await adminClient
      .from("clearance_records")
      .select(`
        clearance_id,
        user_id,
        clearance_templates (
          tier,
          course_id,
          clearance_departments (
            dept_id,
            dept_name
          )
        )
      `)
      .in("clearance_id", ids);

    const targetRecords = fetchedRecords;

    if (status === "Signed") {
      // Check each clearance's tier eligibility
      if (!fetchErr && targetRecords) {
        // Collect user_ids of student records (where course_id is not null)
        const studentUserIds = targetRecords
          .filter((r: any) => {
            const template = Array.isArray(r.clearance_templates) ? r.clearance_templates[0] : r.clearance_templates;
            return template?.course_id != null;
          })
          .map((r: any) => r.user_id);

        if (studentUserIds.length > 0) {
          const { data: allUserClearances } = await adminClient
            .from("clearance_records")
            .select(`
              clearance_id,
              user_id,
              status,
              clearance_templates (
                tier,
                is_active,
                clearance_departments (
                  dept_name
                )
              )
            `)
            .in("user_id", studentUserIds);

          if (allUserClearances) {
            for (const target of targetRecords) {
              const template = Array.isArray(target.clearance_templates) ? target.clearance_templates[0] : target.clearance_templates;
              if (!template?.course_id) continue; // Staff clearances are exempt

              const currentTier = template.tier ?? 1;
              const userClearances = allUserClearances.filter((c: any) => c.user_id === target.user_id);
              const blocking = userClearances.filter((c: any) => {
                const t = Array.isArray(c.clearance_templates) ? c.clearance_templates[0] : c.clearance_templates;
                const itemIsActive = t?.is_active !== false;
                const itemTier = t?.tier ?? 1;
                return itemIsActive && itemTier < currentTier && c.status !== "Signed";
              });

              if (blocking.length > 0) {
                const lowestBlockingTier = Math.min(...blocking.map((c: any) => {
                  const t = Array.isArray(c.clearance_templates) ? c.clearance_templates[0] : c.clearance_templates;
                  return t?.tier ?? 1;
                }));
                const blockingNames = blocking
                  .filter((c: any) => {
                    const t = Array.isArray(c.clearance_templates) ? c.clearance_templates[0] : c.clearance_templates;
                    return (t?.tier ?? 1) === lowestBlockingTier;
                  })
                  .map((c: any) => {
                    const t = Array.isArray(c.clearance_templates) ? c.clearance_templates[0] : c.clearance_templates;
                    const d = Array.isArray(t?.clearance_departments) ? t?.clearance_departments[0] : t?.clearance_departments;
                    return d?.dept_name || "Department";
                  });

                return NextResponse.json(
                  {
                    error: `Cannot sign off: Phase ${currentTier} is locked. Prerequisite Phase ${lowestBlockingTier} requirement (${blockingNames.join(", ")}) must be completed and signed off first.`,
                  },
                  { status: 400 }
                );
              }
            }
          }
        }
      }
    }

    const {
      data,
      error,
    }: { data: any[] | null; error: PostgrestError | null } = await supabase
      .from("clearance_records")
      .update({ status: status, signed_at: signed_at })
      .in("clearance_id", ids)
      .select(`users(students(phone_number))`);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update clearances" },
        { status: 500 },
      );
    }

    // Invalidate server-side clearance cache for signed clients
    targetRecords?.forEach((r) => {
      if (r.user_id) invalidateServerClearanceCache(r.user_id);
    });
    // Invalidate server department dashboard & report cache
    invalidateServerDepartmentCache();
    // Invalidate server admin stats & pipeline radar cache
    invalidateServerAdminCache();

    if (status === "Signed" && data) {
      const sms_promise = data
        .filter((record) => {
           const userData = Array.isArray(record.users) ? record.users[0] : record.users;
           return userData?.students?.phone_number;
        })
        .map((record) => {
          const userData = Array.isArray(record.users) ? record.users[0] : record.users;
          const phone_number = userData?.students?.phone_number;

          return smsGateWay({ phone_number: phone_number || "+639453853772", department: "Academic Head" });
        });

      await Promise.allSettled(sms_promise);

      // Create notifications for the students whose clearances were signed
      if (targetRecords && targetRecords.length > 0) {
        try {
          const notifsToInsert: any[] = [];

          for (const r of targetRecords) {
            const tpl = Array.isArray(r.clearance_templates)
              ? r.clearance_templates[0]
              : r.clearance_templates;
            const dept = Array.isArray(tpl?.clearance_departments)
              ? tpl.clearance_departments[0]
              : tpl?.clearance_departments;
            const deptName = dept?.dept_name || "department staff";
            const signDesc = `Your clearance for ${deptName} has been approved and signed.`;

            // Clean up any previous sign-off notification for this department to avoid duplicates and ensure a fresh unread alert
            await adminClient
              .from("notifications")
              .delete()
              .eq("user_id", r.user_id)
              .eq("title", "Clearance Signed Off")
              .ilike("description", `%${deptName}%`);

            notifsToInsert.push({
              user_id: r.user_id,
              target_role: "student",
              category: "clearance",
              title: "Clearance Signed Off",
              description: signDesc,
              type: "Success",
              ref_url: "/clearance",
              is_read: false,
              metadata: {
                studentId: r.user_id,
                clearanceId: r.clearance_id,
                departmentName: deptName,
              },
            });
          }

          if (notifsToInsert.length > 0) {
            await adminClient.from("notifications").insert(notifsToInsert);
          }
        } catch (notifErr) {
          console.error("Failed to insert student notifications for signed clearance:", notifErr);
        }

        // Clean up any pending "Ready for Signing" notifications for the signing department
        for (const r of targetRecords) {
          const tpl = Array.isArray(r.clearance_templates) ? r.clearance_templates[0] : r.clearance_templates;
          const dept = Array.isArray(tpl?.clearance_departments) ? tpl.clearance_departments[0] : tpl?.clearance_departments;
          const deptId = dept?.dept_id;
          if (deptId) {
            await adminClient
              .from("notifications")
              .delete()
              .eq("department_id", deptId)
              .eq("title", "Ready for Signing")
              .contains("metadata", { studentId: r.user_id });
          }
        }

        // Generate "Ready for Signing" notifications strictly for subsequent prerequisite departments
        const signedTiersByUser = new Map<string, Set<number>>();
        for (const tr of targetRecords) {
          const tpl = Array.isArray(tr.clearance_templates) ? tr.clearance_templates[0] : tr.clearance_templates;
          const tier = tpl?.tier ?? 1;
          if (!signedTiersByUser.has(tr.user_id)) {
            signedTiersByUser.set(tr.user_id, new Set());
          }
          signedTiersByUser.get(tr.user_id)!.add(tier);
        }

        await dispatchReadyForSigningNotifications({
          signedUserIds: Array.from(new Set(targetRecords.map((r: any) => r.user_id))),
          signedTiersByUser,
          adminClient,
          isSingleRecordSign: ids.length === 1,
        });

        // Check if any client has completed all template clearances and alert admin & student
        const uniqueUserIds = Array.from(new Set(targetRecords.map((r: any) => r.user_id)));
        for (const uid of uniqueUserIds) {
          await checkAndDispatchAdminCompletion(uid, adminClient);
          await checkAndDispatchStudentCompletion(uid, adminClient);
        }
      }
    } else if (status === "Pending" && targetRecords && targetRecords.length > 0) {
      // Reopening clearance / Undo Sign: remove obsolete notifications
      try {
        for (const r of targetRecords) {
          const tpl = Array.isArray(r.clearance_templates)
            ? r.clearance_templates[0]
            : r.clearance_templates;
          const dept = Array.isArray(tpl?.clearance_departments)
            ? tpl.clearance_departments[0]
            : tpl?.clearance_departments;
          const deptName = dept?.dept_name;

          if (deptName) {
            await adminClient
              .from("notifications")
              .delete()
              .eq("user_id", r.user_id)
              .eq("title", "Clearance Signed Off")
              .ilike("description", `%${deptName}%`);
          }

          // Also clean up any pending "Ready for Signing" notifications mentioning this user
          await adminClient
            .from("notifications")
            .delete()
            .eq("target_role", "department")
            .eq("title", "Ready for Signing")
            .ilike("description", `%${r.user_id}%`);

          // Revoke admin and student completion notifications if user is reopened
          await revokeAdminCompletion(r.user_id, adminClient);
          await revokeStudentCompletionNotification(r.user_id, adminClient);
        }
      } catch (undoNotifErr) {
        console.error("Failed to remove sign notifications on undo:", undoNotifErr);
      }
    }

    await logActivity(
      user_id,
      "Sign Clearance",
      `Signed off on clearances for ${ids.length} user(s).`,
    );

    return NextResponse.json(
      { data, message: "Clearances signed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
