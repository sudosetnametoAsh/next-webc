import { Courses } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

export function useFetchCourses() {
  return useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: fetchCourses,
    staleTime: 1000 * 60 * 5,
  })
}

async function fetchCourses(): Promise<Courses[]> {
  const response = await fetch('/api/admin/courses')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch courses')
  }

  return json.data
}