import { getCachedAdminStats } from "@/lib/services/admin-cache";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getCachedAdminStats();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
