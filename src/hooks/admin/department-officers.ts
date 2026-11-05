import { useQuery } from '@tanstack/react-query';
export function useFetchDepartmentOfficers() {
  return useQuery<Array<{ staff_id: string; staff_name: string; email: string | null }>>({
    queryKey: ['admin', 'department-officers'], queryFn: async () => {
      const response = await fetch('/api/admin/department-officers', { cache: 'no-store' });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to load department officers'); return body.data;
    }, refetchOnWindowFocus: 'always',
  });
}
