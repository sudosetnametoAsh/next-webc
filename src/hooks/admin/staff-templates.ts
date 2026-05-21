import { StaffAssignment } from '@/types/admin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useFetchStaffTemplates() {
  return useQuery({
    queryKey: ['admin', 'staff-templates'],
    queryFn: fetchStaffTemplates,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateStaffTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createStaffTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff-templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useDeleteStaffTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteStaffTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff-templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

type StaffClearanceTemplates = {
  assignments: StaffAssignment[]
}

async function createStaffTemplates(payload: StaffClearanceTemplates): Promise<void> {
  const response = await fetch('/api/admin/staff-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error ?? 'Failed to create staff templates')
  }

  return json
}

// async function deleteStaffTemplates(dept_id?: number): Promise<void> {
//   const response = await fetch('/api/admin/staff-templates', {
//     method: 'DELETE',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ dept_id }),
//   })

//   const json = await response.json()

//   if (!response.ok) {
//     throw new Error(json.error ?? 'Failed to delete staff templates')
//   }

//   return json
// }

async function deleteStaffTemplates(deptIds: number[]): Promise<void> {
  const response = await fetch('/api/admin/staff-templates', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deptIds }),
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error ?? 'Failed to delete staff templates')
  }

  return json
}

type StaffTemplates = {
  dept_id: number;
}

async function fetchStaffTemplates(): Promise<StaffTemplates[]> {
  const response = await fetch('/api/admin/staff-templates')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch course templates')
  }

  return json.data
}