import { QueryClient, useQuery } from '@tanstack/react-query'
import type { PipelineRadarData } from '@/app/api/admin/pipeline-radar/route'

export const adminPipelineRadarQueryKey = (filter: string = 'all') =>
  ['admin', 'pipeline-radar', filter] as const

export function useFetchPipelineRadar(filter: string = 'all') {
  return useQuery({
    queryKey: adminPipelineRadarQueryKey(filter),
    queryFn: ({ signal }) => fetchPipelineRadar(filter, signal),
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  })
}

export async function prefetchPipelineRadar(
  queryClient: QueryClient,
  filter: string = 'all'
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: adminPipelineRadarQueryKey(filter),
    queryFn: ({ signal }) => fetchPipelineRadar(filter, signal),
    staleTime: 1000 * 60 * 3,
  })
}

export function invalidatePipelineRadar(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['admin', 'pipeline-radar'] })
}

export async function fetchPipelineRadar(filter: string = 'all', signal?: AbortSignal): Promise<PipelineRadarData> {
  const response = await fetch(`/api/admin/pipeline-radar?filter=${encodeURIComponent(filter)}&fresh=true`, { signal, cache: 'no-store' })
  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error || 'Failed to fetch pipeline radar data')
  }

  return json.data
}
