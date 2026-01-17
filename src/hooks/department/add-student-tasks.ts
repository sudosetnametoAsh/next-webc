import {
   useMutation,
   UseMutationResult,
   useQueryClient,
} from '@tanstack/react-query';

type NewTaskPayload = {
   clearance_id: string;
   task_id: string | null;
   description: string;
   staff_id: string;
};

type Data = {
   assigned_task_id: number;
   description: string;
   status: string;
};

export function useAddStudentTasks(
   clearanceId: string | null,
): UseMutationResult<{ data: Data }, Error, NewTaskPayload[]> {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (tasks: NewTaskPayload[]) => {
         const response = await fetch(
            `/api/department/students/tasks/${clearanceId}`,
            {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/json',
               },
               credentials: 'include',
               body: JSON.stringify(tasks),
            },
         );

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add tasks');
         }

         return response.json();
      },
      onSuccess: () => {
         queryClient.invalidateQueries({
            queryKey: ['student-tasks', clearanceId],
         });
      },
   });
}
