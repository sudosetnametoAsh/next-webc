import { CourseTemplateStats, StaffAssignment } from '@/types/admin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useDeleteAllTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAllTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'course-templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-templates'] })
    }
  })
}

async function deleteAllTemplates(courseIds: number[]): Promise<void> {
  const response = await fetch('/api/admin/clearance-templates', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseIds })
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to delete all templates')
  }

  return json
}