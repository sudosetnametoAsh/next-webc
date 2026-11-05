import type { CourseSectionInput } from '@/lib/course-configuration'
import { Courses } from '@/types/admin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useFetchCourses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'courses'],
    enabled: options?.enabled ?? true,
    queryFn: fetchCourses,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      // Invalidate to refetch the list immediately
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-templates'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['department-clients'] })
    },
    onError: (error) => {
      console.error("Mutation failed:", error)
      // alert(error.message) // Optional: show alert to user
    }
  })
}

export function useUpdateCourse() {

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-templates'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['department-clients'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'course-templates'] })
    },
    onError: (error) => {
      console.error("Update failed:", error)
      // alert(error.message)
    }
  })
}

export function useDeleteCourse() {

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-templates'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['department-clients'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'course-templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (error) => {
      console.error("Delete failed:", error)
      // alert(error.message)
    }
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

async function createCourse(input: string | { course_name: string; sections: CourseSectionInput[] }): Promise<void> {
  const payload = typeof input === 'string' ? { course_name: input } : input

  const response = await fetch('/api/admin/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Failed to create course')
  }

  const json = await response.json()
  return json.data
}

async function updateCourse({ course_id, course_name }: { course_id: number, course_name: string }): Promise<void> {

  const response = await fetch('/api/admin/courses', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id, course_name })
  })

  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Failed to update course')
  }

  const json = await response.json()
  return json.data
}

async function deleteCourse(course_id: number): Promise<void> {

  const response = await fetch('/api/admin/courses', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id })
  })

  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Failed to delete course')
  }

  const json = await response.json()
  return json.data
}