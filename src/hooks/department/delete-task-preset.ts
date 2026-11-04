import { toast } from "sonner";
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeleteTaskPreset() {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (taskPresetId: { task_id: string }) => {
         const request = await fetch('/api/department/presets', {
            method: 'DELETE',
            body: JSON.stringify(taskPresetId),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
         });

         if (!request.ok) {
            throw new Error('An error occured, Failed to delete task');
         }

         return request.json();
      },
      onError: (error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Preset deleted");
         queryClient.invalidateQueries({
            queryKey: ['preset'],
         });
      },
   });
}
