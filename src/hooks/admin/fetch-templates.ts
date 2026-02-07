import { CourseTemplateStats } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

export function useFetchCourseTemplates() {
  return useQuery({
    queryKey: ['admin', 'course-templates'],
    queryFn: fetchCourseTemplates,
    staleTime: 1000 * 60 * 5,
  })
}

export async function fetchCourseTemplates(): Promise<CourseTemplateStats[]> {
  const response = await fetch('/api/admin/templates')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch course templates')
  }

  return json.data
}