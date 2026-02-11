import { AdminStats } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

export function useFetchAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    staleTime: 1000 * 60 * 5,
  })
}

async function fetchAdminStats(): Promise<AdminStats> {
  const response = await fetch('/api/admin/stats')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch admin stats')
  }

  return json.data
}