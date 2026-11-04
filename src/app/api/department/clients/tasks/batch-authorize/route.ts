import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user_id, user_name } = await getSession();

    const supabaseAdmin = getSupabaseAdmin();

    // Optional taskIds passed in body, or authorize ALL 'Verified' tasks for this staff
    let taskIds: number[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.taskIds)) {
        taskIds = body.taskIds;
      }
    } catch {
      // Body empty or not JSON, authorize all verified
    }

    let query = supabaseAdmin
      .from("clearance_tasks")
      .select("assigned_task_id, title, comments, clearance_id")
      .eq("staff_id", user_id)
      .eq("status", "Verified");

    if (taskIds.length > 0) {
      query = query.in("assigned_task_id", taskIds);
    }

    const { data: verifiedTasks, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!verifiedTasks || verifiedTasks.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No AI-verified submissions awaiting Factor-2 authorization.",
      });
    }

    const targetIds = verifiedTasks.map((t) => t.assigned_task_id);

    // Update all target tasks to 'Cleared'
    const { error: updateError } = await supabaseAdmin
      .from("clearance_tasks")
      .update({
        status: "Cleared",
      })
      .in("assigned_task_id", targetIds);

    if (updateError) {
      throw updateError;
    }

    invalidateServerDepartmentCache(user_id);
    invalidateServerClearanceCache();

    return NextResponse.json({
      success: true,
      count: targetIds.length,
      authorizedTaskIds: targetIds,
    });
  } catch (error: any) {
    console.error("Batch authorize error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to batch authorize submissions" },
      { status: 500 },
    );
  }
}
