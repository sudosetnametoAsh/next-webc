import { StudentTemplates } from '@/types/admin'
import { QueryClient, useQuery } from '@tanstack/react-query'

export function useFetchStudentTemplates() {
  return useQuery({
    queryKey: ['admin', 'student-templates'],
    queryFn: fetchStudentTemplates,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
}

export async function prefetchStudentTemplates(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: ['admin', 'student-templates'],
    queryFn: fetchStudentTemplates,
    staleTime: 1000 * 60 * 3,
  })
}

export function invalidateStudentTemplates(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ['admin', 'student-templates'],
  })
}

async function fetchStudentTemplates(): Promise<StudentTemplates[]> {
  const response = await fetch('/api/admin/student-templates')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch student templates')
  }

  return json.data
}