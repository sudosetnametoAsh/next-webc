import { Students } from '@/types/students';
import { useQuery } from '@tanstack/react-query';

export function useFethStudents(sectionId: string) {
   return useQuery({
      queryKey: ['students', sectionId],
      queryFn: () => fetchStudents(sectionId),
      enabled: !!sectionId,
      staleTime: 1000 * 60 * 5,
   });
}

export async function fetchStudents(sectionId: string): Promise<Students[]> {
   const response = await fetch(`/api/department/students/${sectionId}`, {
      credentials: 'include',
   });
   const json = await response.json();
   if (!response.ok) throw new Error('Failed to fetch');
   return json.data;
}
