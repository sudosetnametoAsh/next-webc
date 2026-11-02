import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getCachedClearanceBundle, invalidateServerClearanceCache } from "@/lib/services/clearance-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const searchParams = request.nextUrl.searchParams;
    const requestedStudentId = searchParams.get("studentId");
    const isFresh = searchParams.get("fresh") === "true";

    // Allow staff/admin to view requested student, or default to current user
    const targetUserId = requestedStudentId || session?.user_id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isFresh) {
      invalidateServerClearanceCache(targetUserId);
    }

    const data = await getCachedClearanceBundle(targetUserId);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Error fetching clearance data:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch clearance data" },
      { status: 500 }
    );
  }
}
