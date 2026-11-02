import OfficeHours from "@/components/clearance/office-hours/office-hours";
import { getCachedClearanceBundle } from "@/lib/services/clearance-cache";
import { getSession } from "@/lib/auth/get-session";

export const unstable_dynamicStaleTime = 180;

export default async function ClearanceSchedules() {
  const { user_id } = await getSession();
  const { officeHours, tasks } = await getCachedClearanceBundle(user_id);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <OfficeHours
        departments={officeHours}
        tasks={tasks}
        studentId={user_id}
      />
    </div>
  );
}
