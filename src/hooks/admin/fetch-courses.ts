import { Courses } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

export function useFetchCourses() {
  return useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: fetchCourses,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export async function fetchCourses(): Promise<Courses[]> {
  const response = await fetch('/api/admin/courses')
  
  if (!response.ok) {
    throw new Error('Failed to fetch courses')
  }

  const json = await response.json()
  
  // FIX: The API returns { data: [{ id, name, ... }] } 
  // But your UI expects { course_id, course_name }
  // We map it here so the rest of your app doesn't break.
  
  const mappedData = json.data.map((course: any) => ({
    ...course,
    // Ensure both formats exist so both Cards and Modals work
    course_id: course.course_id ?? course.id,     
    course_name: course.course_name ?? course.name,
  }))

  return mappedData
}