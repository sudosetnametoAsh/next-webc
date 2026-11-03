import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ConfigurationSchema = z.object({
  aiVerificationMode: z.enum(["two_factor", "autonomous", "manual"]),
  aiConfidenceThreshold: z.number().int().min(50).max(100),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { user_id } = await getSession();
    const { data: configuration, error } = await supabase
      .from("staff_configurations")
      .select("ai_verification_mode, ai_confidence_threshold")
      .eq("staff_id", user_id)
      .maybeSingle();
    if (error) throw error;

    const { data: tasks, error: tasksError } = await supabase
      .from("clearance_tasks")
      .select("status, ai_audit_report")
      .eq("staff_id", user_id);
    if (tasksError) throw tasksError;

    return NextResponse.json({
      configuration: {
        staffId: user_id,
        aiVerificationMode: configuration?.ai_verification_mode ?? "two_factor",
        aiConfidenceThreshold: configuration?.ai_confidence_threshold ?? 85,
      },
      stats: {
        verifiedAwaitingFactor2: (tasks || []).filter(t => t.status === "Verified").length,
        flaggedCount: (tasks || []).filter(t => t.status === "Flagged").length,
        autoApprovedCount: (tasks || []).filter(
          t => t.status === "Cleared" && t.ai_audit_report?.verificationMode === "autonomous",
        ).length,
      },
    });
  } catch (error) {
    console.error("GET AI settings error:", error);
    return NextResponse.json({ error: "Failed to load AI verification settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user_id } = await getSession();
    const parsed = ConfigurationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid verification mode or confidence threshold (integer 50–100 required)." }, { status: 400 });
    }
    const { aiVerificationMode, aiConfidenceThreshold } = parsed.data;
    // Use the authenticated client: RLS limits writes to the staff member's own row.
    const { data: updated, error } = await supabase
      .from("staff_configurations")
      .upsert({
        staff_id: user_id,
        ai_verification_mode: aiVerificationMode,
        ai_confidence_threshold: aiConfidenceThreshold,
      }, { onConflict: "staff_id" })
      .select("staff_id, ai_verification_mode, ai_confidence_threshold")
      .single();
    if (error) throw error;
    return NextResponse.json({
      success: true,
      configuration: {
        staffId: updated.staff_id,
        aiVerificationMode: updated.ai_verification_mode,
        aiConfidenceThreshold: updated.ai_confidence_threshold,
      },
    });
  } catch (error) {
    console.error("PATCH AI settings error:", error);
    return NextResponse.json({ error: "Failed to update AI verification settings" }, { status: 500 });
  }
}
