import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { user_id, department } = await getSession();

    // 1. Resolve Department for the current staff member
    let deptId: number | null = null;
    let deptName: string = department || "";
    let aiMode: string = "two_factor";
    let aiThreshold: number = 85;

    // Check clearance_templates first
    const { data: templateData } = await supabase
      .from("clearance_templates")
      .select(`
        dept_id,
        clearance_departments (
          dept_id,
          dept_name,
          ai_verification_mode,
          ai_confidence_threshold
        )
      `)
      .eq("staff_id", user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const matchedDept = Array.isArray(templateData?.clearance_departments)
      ? templateData.clearance_departments[0]
      : templateData?.clearance_departments;

    if (matchedDept) {
      deptId = matchedDept.dept_id;
      deptName = matchedDept.dept_name;
      aiMode = matchedDept.ai_verification_mode || "two_factor";
      aiThreshold = matchedDept.ai_confidence_threshold ?? 85;
    } else if (department) {
      const { data: fallbackDept } = await supabase
        .from("clearance_departments")
        .select("dept_id, dept_name, ai_verification_mode, ai_confidence_threshold")
        .ilike("dept_name", department.trim())
        .limit(1)
        .maybeSingle();

      if (fallbackDept) {
        deptId = fallbackDept.dept_id;
        deptName = fallbackDept.dept_name;
        aiMode = fallbackDept.ai_verification_mode || "two_factor";
        aiThreshold = fallbackDept.ai_confidence_threshold ?? 85;
      }
    }

    if (!deptId) {
      // Final fallback to first department if needed
      const { data: firstDept } = await supabase
        .from("clearance_departments")
        .select("dept_id, dept_name, ai_verification_mode, ai_confidence_threshold")
        .limit(1)
        .single();
      if (firstDept) {
        deptId = firstDept.dept_id;
        deptName = firstDept.dept_name;
        aiMode = firstDept.ai_verification_mode || "two_factor";
        aiThreshold = firstDept.ai_confidence_threshold ?? 85;
      }
    }

    // 2. Compute live AI verification metrics for this staff member
    const { data: tasks } = await supabase
      .from("clearance_tasks")
      .select("status, ai_audit_report")
      .eq("staff_id", user_id);

    const verifiedCount = (tasks || []).filter((t) => t.status === "Verified").length;
    const flaggedCount = (tasks || []).filter((t) => t.status === "Flagged").length;
    const autoApprovedCount = (tasks || []).filter(
      (t) => t.status === "Cleared" && t.ai_audit_report !== null,
    ).length;

    return NextResponse.json({
      department: {
        deptId,
        deptName,
        aiVerificationMode: aiMode,
        aiConfidenceThreshold: aiThreshold,
      },
      stats: {
        verifiedAwaitingFactor2: verifiedCount,
        flaggedCount,
        autoApprovedCount,
      },
    });
  } catch (error: any) {
    console.error("GET AI settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load AI verification settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user_id, department } = await getSession();
    const body = await req.json();

    const { aiVerificationMode, aiConfidenceThreshold } = body;

    if (!["two_factor", "autonomous", "manual"].includes(aiVerificationMode)) {
      return NextResponse.json(
        { error: "Invalid verification mode. Must be two_factor, autonomous, or manual." },
        { status: 400 },
      );
    }

    const threshold = Number(aiConfidenceThreshold);
    if (isNaN(threshold) || threshold < 50 || threshold > 100) {
      return NextResponse.json(
        { error: "Confidence threshold must be between 50 and 100." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Resolve dept_id
    let targetDeptId: number | null = null;
    const { data: templateData } = await supabaseAdmin
      .from("clearance_templates")
      .select("dept_id")
      .eq("staff_id", user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (templateData?.dept_id) {
      targetDeptId = templateData.dept_id;
    } else if (department) {
      const { data: d } = await supabaseAdmin
        .from("clearance_departments")
        .select("dept_id")
        .ilike("dept_name", department.trim())
        .limit(1)
        .maybeSingle();
      targetDeptId = d?.dept_id || null;
    }

    if (!targetDeptId) {
      return NextResponse.json(
        { error: "Could not identify department for current staff." },
        { status: 404 },
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("clearance_departments")
      .update({
        ai_verification_mode: aiVerificationMode,
        ai_confidence_threshold: threshold,
      })
      .eq("dept_id", targetDeptId)
      .select("dept_id, dept_name, ai_verification_mode, ai_confidence_threshold")
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      department: {
        deptId: updated.dept_id,
        deptName: updated.dept_name,
        aiVerificationMode: updated.ai_verification_mode,
        aiConfidenceThreshold: updated.ai_confidence_threshold,
      },
    });
  } catch (error: any) {
    console.error("PATCH AI settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update AI verification settings" },
      { status: 500 },
    );
  }
}
