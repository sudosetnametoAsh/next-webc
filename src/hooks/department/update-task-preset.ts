import { useMutation, useQueryClient } from '@tanstack/react-query';

type Payload = {
   updatedDescription: string;
   updatedTitle: string;
   task_id: string;
};
export function useUpdateTaskPreset() {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (newDescription: Payload) => {
         const request = await fetch('/api/department/presets', {
            method: 'PATCH',
            body: JSON.stringify(newDescription),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
         });

         if (!request.ok) {
            throw new Error('An error occured, Failed to update task');
         }

         return request.json();
      },
      onSuccess: () => {
         queryClient.invalidateQueries({
            queryKey: ['preset'],
         });
      },
   });
}
