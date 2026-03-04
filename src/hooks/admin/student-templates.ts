import { StudentTemplates } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

export function useFetchStudentTemplates() {
  return useQuery({
    queryKey: ['admin', 'student-templates'],
    queryFn: fetchStudentTemplates,
    staleTime: 1000 * 60 * 5,
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