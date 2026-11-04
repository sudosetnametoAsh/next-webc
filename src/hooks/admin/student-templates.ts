import { StudentTemplates } from '@/types/admin'
import { QueryClient, useQuery } from '@tanstack/react-query'

export function useFetchStudentTemplates() {
  return useQuery({
    queryKey: ['admin', 'student-templates'],
    queryFn: ({ signal }) => fetchStudentTemplates(signal),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  })
}

export async function prefetchStudentTemplates(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: ['admin', 'student-templates'],
    queryFn: ({ signal }) => fetchStudentTemplates(signal),
    staleTime: 1000 * 60 * 3,
  })
}

export function invalidateStudentTemplates(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ['admin', 'student-templates'],
  })
}

async function fetchStudentTemplates(signal?: AbortSignal): Promise<StudentTemplates[]> {
  const response = await fetch('/api/admin/student-templates', { signal, cache: 'no-store' })
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch student templates')
  }

  return json.data
}