import { Students } from '@/types/students';
import { useQuery } from '@tanstack/react-query';

export function useFetchStaff() {
   return useQuery({
      queryKey: ['staff-clearance'],
      queryFn: () => fetchStaff(),
      staleTime: 1000 * 60 * 5,
   });
}

export async function fetchStaff(): Promise<Students[]> {
   const response = await fetch(`/api/department/staff`, {
      credentials: 'include',
   });
   const json = await response.json();
   if (!response.ok) throw new Error('Failed to fetch staff');
   return json.data;
}
