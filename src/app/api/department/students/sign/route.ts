import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { logActivity } from "@/lib/log-activity";
import smsGateWay from "@/lib/services/sms-gateway";
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

    const {
      data,
      error,
    }: { data: Data[] | null; error: PostgrestError | null } = await supabase
      .from("clearance_records")
      .update({ status: status, signed_at: signed_at })
      .in("clearance_id", ids)
      .select(`students(phone_number)`);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update student clearances" },
        { status: 500 },
      );
    }

    if (status === "Signed" && data) {
      const sms_promise = data.map((signed_students) => {
        const phone_number = signed_students.students?.phone_number;

        return smsGateWay({ phone_number: "+639453853772", department: "Academic Head" });
      });

      await Promise.allSettled(sms_promise);
    }

    await logActivity(
      user_id,
      "Sign Clearance",
      `Signed off on clearances for ${ids.length} student(s).`,
    );

    return NextResponse.json(
      { data, message: "Students signed successfully" },
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
