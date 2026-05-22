import { getSession } from "@/lib/auth/get-session";
import { makeGetStatCardValue } from "@/composition/staff/make-get-stat-card-value";
import { makeGetRecentSubmissions } from "@/composition/staff/make-get-recent-submissions";
import { makeGetRecentActivity } from "@/composition/staff/make-get-recent-activity";
import DashboardClient from "@/components/department/dashboard/dashboard-client";

export default async function Dashboard() {
  const { user_id, user_name } = await getSession();
  const getStatCardValue = makeGetStatCardValue();
  const getRecentSubmissions = makeGetRecentSubmissions();
  const getRecentActivity = makeGetRecentActivity();

  const [stats, recentSubmissions, recentActivity] = await Promise.all([
    getStatCardValue.execute(user_id),
    getRecentSubmissions.execute(user_id),
    getRecentActivity.execute(user_id),
  ]);

  return (
    <DashboardClient
      user_name={user_name}
      recentActivity={recentActivity}
      recentSubmissions={recentSubmissions}
      stats={stats}
    />
  );
}
