import { Staff } from '@/types/admin'
import { QueryClient, useQuery } from '@tanstack/react-query'

export function useFetchStaff() {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: ({ signal }) => fetchStaff(signal),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  })
}

export async function prefetchStaff(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: ['admin', 'staff'],
    queryFn: ({ signal }) => fetchStaff(signal),
    staleTime: 1000 * 60 * 3,
  })
}

export function invalidateStaff(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ['admin', 'staff'],
  })
}

async function fetchStaff(signal?: AbortSignal): Promise<Staff[]> {
  const response = await fetch('/api/admin/staff', { signal, cache: 'no-store' })
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch staff')
  }

  return json.data
}