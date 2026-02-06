import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddTaskPreset() {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (taskPreset: { description: string }) => {
         const request = await fetch('/api/department/presets', {
            method: 'POST',
            body: JSON.stringify(taskPreset),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
         });

         if (!request.ok) {
            throw new Error('An Error occured, Failed to add task');
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
