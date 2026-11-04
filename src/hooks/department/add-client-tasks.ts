import { toast } from "sonner";
import {
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

type NewTaskPayload = {
  clearance_id: string;
  task_id: string | null;
  title: string;
  description: string;
  staff_id: string;
  dropbox: string;
  due_date?: string | null;
};

type Data = {
  assigned_task_id: number;
  description: string;
  status: string;
};

export function useAddClientTasks(
  clearanceId: string | null,
  sectionId?: string | null,
): UseMutationResult<{ data: Data }, Error, NewTaskPayload[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasks: NewTaskPayload[]) => {
      const response = await fetch(
        `/api/department/clients/tasks/${clearanceId || 'bulk'}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(tasks),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add tasks");
      }

      return response.json();
    },
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Tasks assigned");
      queryClient.invalidateQueries({
        queryKey: ["department-clients"],
      });
      if (sectionId) {
        queryClient.invalidateQueries({
          queryKey: ["clients", sectionId],
        });
      }
      if (clearanceId) {
        queryClient.invalidateQueries({
          queryKey: ["client-tasks", clearanceId],
        });
      }
    },
  });
}
