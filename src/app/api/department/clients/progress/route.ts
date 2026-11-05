import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import type { DepartmentProgress } from "@/types/department-progress";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user_id } = await getSession();
    const studentId = request.nextUrl.searchParams.get("studentId")?.trim();
    if (!studentId) {
      return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    // An officer may inspect progress only for clients assigned to one of
    // their active templates. Do not rely on a browser-provided officer ID.
    const { data: assignment, error: assignmentError } = await admin
      .from("current_clearance_records")
      .select("clearance_id, clearance_templates!inner(staff_id, is_active)")
      .eq("user_id", studentId)
      .eq("clearance_templates.staff_id", user_id)
      .eq("clearance_templates.is_active", true)
      .limit(1)
      .maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment) {
      return NextResponse.json({ error: "Client is not assigned to you." }, { status: 403 });
    }

    const { data: records, error } = await admin.from("current_clearance_records")
      .select(`clearance_id, status, signed_at,
        clearance_templates(tier, is_active,
          departments:clearance_departments(dept_name, icon_name))`)
      .eq("user_id", studentId);
    if (error) throw error;

    const data: DepartmentProgress[] = (records || []).flatMap((record) => {
      const template = Array.isArray(record.clearance_templates)
        ? record.clearance_templates[0] : record.clearance_templates;
      if (!template || template.is_active === false) return [];
      const department = Array.isArray(template.departments)
        ? template.departments[0] : template.departments;
      return [{
        clearance_id: record.clearance_id,
        dept_name: department?.dept_name || "Unknown Department",
        status: record.status,
        signed_at: record.signed_at,
        tier: template.tier ?? 1,
        icon_name: department?.icon_name,
      }];
    });
    data.sort((a, b) => a.tier - b.tier || a.dept_name.localeCompare(b.dept_name));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Client department progress failed:", error);
    return NextResponse.json({ error: "Could not load department status. Please try again." }, { status: 500 });
  }
}
