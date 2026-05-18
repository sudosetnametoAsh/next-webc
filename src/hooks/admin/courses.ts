import { Courses } from '@/types/admin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useFetchCourses() {
  return useQuery({
    queryKey: ['admin', 'courses'],
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

async function createCourse(course_name: string): Promise<void> {

  const response = await fetch('/api/admin/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_name })
  })

  // 1. Check status first
  if (!response.ok) {

    const errorText = await response.text()
    console.error("API Error:", errorText) // Log the real error (e.g. Supabase key missing)
    
    // Try to parse it as JSON error if possible, otherwise use text
    try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.error || 'Failed to create course')
    } catch {
        throw new Error(errorText || 'Failed to create course')
    }
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
    const errorText = await response.text()
    console.error("API Error:", errorText)
    throw new Error('Failed to update course')
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
    const errorText = await response.text()
    console.error("API Error:", errorText)
    throw new Error('Failed to delete course')
  }

  const json = await response.json()
  return json.data
}