import TasksPage from "@/components/clearance/tasks/tasks-page";
import { getCachedClearanceBundle } from "@/lib/services/clearance-cache";
import { getSession } from "@/lib/auth/get-session";

export const unstable_dynamicStaleTime = 180;

export default async function ClearanceTasks() {
  const { user_id } = await getSession();
  const { tasks, records, studentProfile } = await getCachedClearanceBundle(user_id);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <TasksPage
        task={tasks}
        records={records}
        studentProfile={studentProfile}
        studentId={user_id}
      />
    </div>
  );
}
