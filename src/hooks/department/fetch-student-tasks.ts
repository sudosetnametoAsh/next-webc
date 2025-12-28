import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

type NewTaskPayload = {
  clearance_id: string;
  task_id: string | null;
  description: string;
};

type Data = {
  assigned_task_id: number;
  description: string;
  status: string;
};

export function useAddStudentTasks(
  studentId: string | null,
  staffId: string | null
): UseMutationResult<
  { data: Data }, // Response type (adjust based on your actual API return)
  Error,
  NewTaskPayload[] // Variables type (the array of tasks)
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasks: NewTaskPayload[]) => {
      const response = await fetch(
        `/api/department/student-tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(tasks),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add tasks");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student-tasks", studentId, staffId],
      });
    },
  });
}
