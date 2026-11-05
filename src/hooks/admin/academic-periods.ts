'use client';
import { useQuery } from '@tanstack/react-query';
import type { AcademicPeriod } from '@/lib/academic-periods/types';

export function useAcademicPeriods() {
  return useQuery<AcademicPeriod[]>({
    queryKey: ['admin', 'academic-periods'],
    queryFn: async () => {
      const response = await fetch('/api/admin/academic-periods', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load academic periods');
      return json.data;
    },
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
  });
}
