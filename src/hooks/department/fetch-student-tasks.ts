import { useQuery } from "@tanstack/react-query";

type FetchedData = {
  description: string;
  student_tasks_status: { status_id: number };
};
export function useFetchStudentTasks(
  studentId: string | null,
  staffId: string | null
) {
  return useQuery({
    queryKey: ["student-tasks", studentId, staffId],
    queryFn: async (): Promise<FetchedData[]> => {
      const response = await fetch(
        `/api/department/student-tasks/${studentId}/${staffId}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch clearance status");
      }

      const data = await response.json();
      return data.data;
    },
    enabled: !!studentId && !!staffId,
  });
}
