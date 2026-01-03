import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient();

export async function PATCH(req: NextRequest) {
  try {
    const {ids, status} = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Request body must be a non-empty array of IDs." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("student_clearances")
      .update({ status: status })
      .in("clearance_id", ids) 
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update student clearances" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, message: "Students signed successfully" }, { status: 200 });

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}