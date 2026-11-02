import { getSession } from "@/lib/auth/get-session";
import { getCachedDepartmentDashboard } from "@/lib/services/department-cache";
import SubmissionsDeskClient from "@/components/department/submissions/submissions-desk-client";

export const unstable_dynamicStaleTime = 180;

export default async function SubmissionsPage() {
  const { user_id, user_name, department } = await getSession();
  const { recentSubmissions } = await getCachedDepartmentDashboard(user_id);

  return (
    <SubmissionsDeskClient
      initialSubmissions={recentSubmissions}
      department={department}
      userName={user_name}
    />
  );
}
