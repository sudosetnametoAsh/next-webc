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
    }
  })
}

async function fetchCourseTemplates(): Promise<CourseTemplateStats[]> {
  const response = await fetch('/api/admin/templates')
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
  const response = await fetch('/api/admin/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clearanceTemplates),
  })

  const json = response.json()

  if (!response.ok) {
    throw new Error('Failed to create templates')
  }

  return json
}