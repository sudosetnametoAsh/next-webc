import { validateWeeklySchedule, campusClock } from "@/lib/weekly-schedule";
import { makeGetSchedule } from "@/composition/staff/make-get-schedule";
import { makeSetSchedule } from "@/composition/staff/make-set-schedule";
import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { notifyScheduleUpdate } from "@/lib/services/schedule-notifications";
import { NotFoundError } from "@/modules/staff/application/error";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { user_id, user_name, department } = await getSession();
    const supabase = await createClient();
    const use_case = makeGetSchedule();

    let schedule: {

      weekly_schedule?: any;
      early_out_date?: string | null;
    } = {

      weekly_schedule: null,
      early_out_date: null,
    };

    try {
      const response = await use_case.execute(user_id);
      schedule = {

        weekly_schedule: response.weekly_schedule || null,
        early_out_date: response.early_out_date || null,
      };
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        console.error("Error fetching schedule:", error);
      }
    }

    // Resolve department details
    let deptName = department || "";
    let iconName = "Building2";
    let floor: string | null = null;
    let room: string | null = null;

    const { data: templateData } = await supabase
      .from("clearance_templates")
      .select(`
        dept_id,
        clearance_departments (
          dept_id,
          dept_name,
          icon_name,
          floor,
          room
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
      deptName = matchedDept.dept_name;
      iconName = matchedDept.icon_name || "Building2";
      floor = matchedDept.floor || null;
      room = matchedDept.room || null;
    } else if (department) {
      const { data: fallbackDept } = await supabase
        .from("clearance_departments")
        .select("dept_id, dept_name, icon_name, floor, room")
        .ilike("dept_name", department.trim())
        .limit(1)
        .maybeSingle();
      if (fallbackDept) {
        deptName = fallbackDept.dept_name;
        iconName = fallbackDept.icon_name || "Building2";
        floor = fallbackDept.floor || null;
        room = fallbackDept.room || null;
      }
    }

    return NextResponse.json(
      {
        data: {

          weekly_schedule: schedule.weekly_schedule,
          early_out_date: schedule.early_out_date,
          staff_name: user_name,
          dept_name: deptName,
          icon_name: iconName,
          floor: floor,
          room: room,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("GET Availability Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user_id, user_name } = await getSession();
    const body = await req.json();
    const { action, weekly_schedule, early_out_date } = body;

    const supabase = await createClient();

    // 1. Handle quick Early Out or Resume Schedule actions
    if (action === "early_out" || action === "resume_schedule") {
      const targetDate = action === "early_out"
        ? campusClock().date
        : null;

      const { error: updateError } = await supabase
        .from("staffs")
        .update({ early_out_date: targetDate })
        .eq("staff_id", user_id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      invalidateServerDepartmentCache(user_id);
      invalidateServerClearanceCache();

      return NextResponse.json(
        {
          success: true,
          message: action === "early_out" ? "Early out active for today" : "Normal schedule resumed",
          data: { early_out_date: targetDate },
        },
        { status: 200 },
      );
    }

    let validatedSchedule;
    try { validatedSchedule = validateWeeklySchedule(weekly_schedule); }
    catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    const use_case = makeSetSchedule();
    await use_case.execute(
      user_id,
      user_name,
      validatedSchedule,
      early_out_date !== undefined ? early_out_date : null,
    );

    // Notify each assigned client independently, including assignments across templates.
    try {
      await notifyScheduleUpdate(user_id);
    } catch (schedNotifErr) {
      console.error("Failed to notify schedule update:", schedNotifErr);
    }

    invalidateServerDepartmentCache(user_id);
    invalidateServerClearanceCache();

    return NextResponse.json(
      {
        success: true,
        message: "Office hours updated successfully",
        data: {
          weekly_schedule: validatedSchedule,
          early_out_date: early_out_date || null,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("PATCH Availability Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
