import { getCachedAdminStats } from "@/lib/services/admin-cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const data = await getCachedAdminStats({ fresh: request.nextUrl.searchParams.get("fresh") === "true" });
    return NextResponse.json({ data }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
