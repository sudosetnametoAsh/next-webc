import { getSession } from "@/lib/auth/get-session";
import { getCachedDepartmentDashboard } from "@/lib/services/department-cache";
import DashboardClient from "@/components/department/dashboard/dashboard-client";

export const unstable_dynamicStaleTime = 180;

export default async function Dashboard() {
  const { user_id, user_name, department } = await getSession();
  const { stats, recentSubmissions, readyToSignClients, courseVelocity } =
    await getCachedDepartmentDashboard(user_id);

  return (
    <DashboardClient
      user_name={user_name}
      department={department}
      stats={stats}
      recentSubmissions={recentSubmissions}
      readyToSignClients={readyToSignClients}
      courseVelocity={courseVelocity}
    />
  );
}
