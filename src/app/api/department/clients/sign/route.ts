import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";
import { PostgrestError } from "@supabase/supabase-js";
import { after, NextRequest, NextResponse } from "next/server";
import { runClearanceSigningEffects } from "@/lib/services/clearance-signing-effects";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user_id } = await getSession();
    const { ids: requestedIds, status } = await req.json();
    if (!Array.isArray(requestedIds) || requestedIds.length === 0 || !["Signed", "Pending"].includes(status) ||
      requestedIds.some((id) => !["string", "number"].includes(typeof id) || !/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) {
      return NextResponse.json(
        { error: "A non-empty list of clearance IDs and a valid status are required." },
        { status: 400 },
      );
    }

    const ids: number[] = [...new Set<number>(requestedIds.map(Number))];
    const signed_at = status === "Signed" ? new Date().toISOString() : null;
    const adminClient = getSupabaseAdmin();

    // Fetch target records and department info using admin client to ensure full visibility
    const { data: fetchedRecords, error: fetchErr } = await adminClient
      .from("current_clearance_records")
      .select(`
        clearance_id,
        user_id,
        clearance_templates (
          staff_id,
          is_active,
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

    if (fetchErr) {
      return NextResponse.json(
        { error: "Unable to load clearance records. Please try again." },
        { status: 500 },
      );
    }

    if (!targetRecords || targetRecords.length !== ids.length || targetRecords.some((record) => {
      const template = Array.isArray(record.clearance_templates) ? record.clearance_templates[0] : record.clearance_templates;
      return template?.staff_id !== user_id || template?.is_active === false;
    })) {
      return NextResponse.json({ error: "One or more clearances are not assigned to you." }, { status: 403 });
    }

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
          const allUserClearances: any[] = [];
          const uniqueStudentIds = [...new Set(studentUserIds)];
          // Supabase caps ordinary reads; inspect every prerequisite in a bulk action.
          for (let offset = 0; ; offset += 500) {
            const { data: page, error: prerequisitesError } = await adminClient
              .from("current_clearance_records")
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
              .in("user_id", uniqueStudentIds)
              .order("clearance_id", { ascending: true })
              .range(offset, offset + 499);
            if (prerequisitesError) {
              return NextResponse.json({ error: "Unable to check clearance prerequisites. Please try again." }, { status: 500 });
            }
            allUserClearances.push(...(page || []));
            if (!page || page.length < 500) break;
          }
          const byUser = new Map<string, typeof allUserClearances>();
          for (const record of allUserClearances) {
            if (!byUser.has(record.user_id)) byUser.set(record.user_id, []);
            byUser.get(record.user_id)!.push(record);
          }

          if (allUserClearances) {
            for (const target of targetRecords) {
              const template = Array.isArray(target.clearance_templates) ? target.clearance_templates[0] : target.clearance_templates;
              if (!template?.course_id) continue; // Staff clearances are exempt

              const currentTier = template.tier ?? 1;
              const userClearances = byUser.get(target.user_id) || [];
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
      .from("current_clearance_records")
      .update({ status: status, signed_at: signed_at })
      .in("clearance_id", ids)
      .select("clearance_id, status, signed_at");

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update clearances" },
        { status: 500 },
      );
    }

    const savedIds = new Set((data || []).map((record) => Number(record.clearance_id)));
    if (savedIds.size !== ids.length || ids.some((id) => !savedIds.has(id)) || data?.some((record) => record.status !== status)) {
      return NextResponse.json({ error: "Not all clearances were saved. Refresh and try again." }, { status: 500 });
    }

    for (const record of targetRecords || []) {
      if (record.user_id) invalidateServerClearanceCache(record.user_id);
    }
    invalidateServerDepartmentCache();
    invalidateServerAdminCache();

    // Next.js keeps this work alive after the response on self-hosted Node.
    // Pass captured clients; do not read request cookies in background helpers.
    after(() => runClearanceSigningEffects({
      records: targetRecords || [], status, signedAt: signed_at, actorId: user_id,
      adminClient, userClient: supabase, isSingleRecordSign: ids.length === 1,
    }));
    return NextResponse.json({ data, message: status === "Signed" ? "Clearances signed successfully" : "Clearances reopened successfully" });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
