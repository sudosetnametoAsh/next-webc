import { CourseTemplateStats, StaffAssignment } from '@/types/admin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useFetchCourseTemplates() {
  return useQuery({
    queryKey: ['admin', 'course-templates'],
    queryFn: fetchCourseTemplates,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'course-templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-templates'] })
    }
  })
}

export function useDeleteTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'course-templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-templates'] })
    }
  })
}

async function fetchCourseTemplates(): Promise<CourseTemplateStats[]> {
  const response = await fetch('/api/admin/course-templates')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch course templates')
  }

  return json.data
}

type ClearanceTemplates = {
  courses: number[]
  assignments: StaffAssignment[]
}

async function createTemplates(clearanceTemplates: ClearanceTemplates): Promise<void> {
  const response = await fetch('/api/admin/course-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clearanceTemplates),
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to create templates')
  }

  return json
}

async function deleteTemplates(course_id?: number): Promise<void> {
  const response = await fetch('/api/admin/course-templates', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id })
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to delete a template')
  }

  return json
}