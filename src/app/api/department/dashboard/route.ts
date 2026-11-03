import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { fetchDepartmentDashboard } from "@/lib/services/department-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user_id } = await getSession();
    const data = await fetchDepartmentDashboard(user_id);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Department dashboard refresh failed:", error);
    return NextResponse.json({ error: "Could not refresh department dashboard." }, { status: 500 });
  }
}
