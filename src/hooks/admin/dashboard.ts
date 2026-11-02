import { QueryClient, useQuery } from '@tanstack/react-query'
import type { ActivityItem } from '@/app/api/admin/activity/route'
import type { PipelineRadarData } from '@/app/api/admin/pipeline-radar/route'

export const adminActivityQueryKey = ['admin', 'activity'] as const
export const adminPipelineRadarQueryKey = (filter: string = 'all') =>
  ['admin', 'pipeline-radar', filter] as const

export function useFetchAdminActivity() {
  return useQuery({
    queryKey: adminActivityQueryKey,
    queryFn: fetchAdminActivity,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
}

export function useFetchPipelineRadar(filter: string = 'all') {
  return useQuery({
    queryKey: adminPipelineRadarQueryKey(filter),
    queryFn: () => fetchPipelineRadar(filter),
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
}

export async function prefetchPipelineRadar(
  queryClient: QueryClient,
  filter: string = 'all'
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: adminPipelineRadarQueryKey(filter),
    queryFn: () => fetchPipelineRadar(filter),
    staleTime: 1000 * 60 * 3,
  })
}

export function invalidatePipelineRadar(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['admin', 'pipeline-radar'] })
}

export async function fetchAdminActivity(): Promise<ActivityItem[]> {
  const response = await fetch('/api/admin/activity')
  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error || 'Failed to fetch activity feed')
  }

  return json.data || []
}

export async function fetchPipelineRadar(filter: string = 'all'): Promise<PipelineRadarData> {
  const response = await fetch(`/api/admin/pipeline-radar?filter=${encodeURIComponent(filter)}`)
  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error || 'Failed to fetch pipeline radar data')
  }

  return json.data
}
