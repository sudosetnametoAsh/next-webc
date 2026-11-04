import { AdminStats } from '@/types/admin'
import { QueryClient, useQuery } from '@tanstack/react-query'

export const adminStatsQueryKey = ['admin', 'stats'] as const

export function useFetchAdminStats() {
  return useQuery({
    queryKey: adminStatsQueryKey,
    queryFn: ({ signal }) => fetchAdminStats(signal),
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  })
}

export async function prefetchAdminStats(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: adminStatsQueryKey,
    queryFn: ({ signal }) => fetchAdminStats(signal),
    staleTime: 1000 * 60 * 3,
  })
}

export function invalidateAdminStats(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: adminStatsQueryKey })
}

export async function fetchAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  const response = await fetch('/api/admin/stats?fresh=true', { signal, cache: 'no-store' })
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch admin stats')
  }

  return json.data
}
