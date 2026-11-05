import InstitutionalClearanceVerification from "@/components/clearance/institutional-clearance-verification";
import { getCachedClearanceBundle } from "@/lib/services/clearance-cache";
import { getSession } from "@/lib/auth/get-session";

export const unstable_dynamicStaleTime = 180;

export default async function Clearance() {
  const { user_id } = await getSession();
  const { summary, records, officeHours, studentProfile, tasks } =
    await getCachedClearanceBundle(user_id);

  return (
    <InstitutionalClearanceVerification
      summary={summary}
      records={records}
      officeHours={officeHours}
      studentProfile={studentProfile}
      initialTasks={tasks}
      studentId={user_id}
    />
  );
}
