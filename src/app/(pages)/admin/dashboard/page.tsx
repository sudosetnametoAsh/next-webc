import { getSession } from "@/lib/auth/get-session";
import AdminDashboardClient from "@/components/admin/admin-dashboard-client";

export const unstable_dynamicStaleTime = 180;

export default async function AdminDashboardPage() {
  let userName = "Administrator";

  try {
    const session = await getSession();
    if (session.user_name) {
      userName = session.user_name;
    }
  } catch {
    userName = "Administrator";
  }

  return <AdminDashboardClient userName={userName} />;
}