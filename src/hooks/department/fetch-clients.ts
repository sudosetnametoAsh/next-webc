import { Students } from '@/types/students';
import { useQuery } from '@tanstack/react-query';

export function useFetchClients(sectionId: string) {
   return useQuery({
      queryKey: ['clients', sectionId],
      queryFn: () => fetchClients(sectionId),
      enabled: !!sectionId,
      staleTime: 1000 * 60 * 5,
   });
}

export async function fetchClients(sectionId: string): Promise<Students[]> {
   const response = await fetch(`/api/department/clients/${sectionId}`, {
      credentials: 'include',
   });
   const json = await response.json();
   if (!response.ok) throw new Error('Failed to fetch');
   return json.data;
}
