import { makeGetRecentActivity } from "@/composition/staff/make-get-recent-activity";
import { makeGetRecentSubmissions } from "@/composition/staff/make-get-recent-submissions";
import { makeGetStatCardValue } from "@/composition/staff/make-get-stat-card-value";
import { getSession } from "@/lib/auth/get-session";
import { NextResponse } from "next/server";

export async function GET() {
  const getStatCardValue = makeGetStatCardValue();
  const getRecentSubmissions = makeGetRecentSubmissions();
  const getRecentActivity = makeGetRecentActivity();

  try {
    const { user_id, user_name } = await getSession();
    const [stats, recentSubmissions, recentActivity] = await Promise.all([
      getStatCardValue.execute(user_id),
      getRecentSubmissions.execute(user_id),
      getRecentActivity.execute(user_id),
    ]);

    return NextResponse.json({
      data: {
        stats,
        recentSubmissions,
        recentActivity,
        user_name,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
