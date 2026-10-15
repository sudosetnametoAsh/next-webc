import { useQuery } from '@tanstack/react-query'
import type { ClearanceReportSource } from '@/lib/reports/types'

export function useFetchReportSource() {
  return useQuery({
    queryKey: ['admin', 'reports', 'clearance-source'],
    queryFn: async () => {
      const response = await fetch('/api/admin/reports/clearance-source')
      if (!response.ok) {
        throw new Error('Failed to fetch clearance report data')
      }
      const { data } = await response.json()
      return data as ClearanceReportSource
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
