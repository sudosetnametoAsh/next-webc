import { Departments } from '@/types/admin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useFetchDepartments() {
  return useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: fetchDepartments,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      // Invalidate the departments query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
    }
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDepartment,
    onSuccess: () => {
      // Invalidate the departments query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
    }
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      // Invalidate the departments query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
    }
  })
}

async function fetchDepartments(): Promise<Departments[]> {
  const response = await fetch('/api/admin/departments')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch departments')
  }

  return json.data
}

async function createDepartment(dept_name: string): Promise<void> {
  const response = await fetch('/api/admin/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dept_name })
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to create department')
  }

  return json.data
}

async function updateDepartment({ dept_id, dept_name }: { dept_id: number, dept_name: string }): Promise<void> {
  const response = await fetch('/api/admin/departments', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dept_id, dept_name })
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to update department')
  }

  return json.data
}

async function deleteDepartment(dept_id: number): Promise<void> {
  const response = await fetch('/api/admin/departments', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dept_id })
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to delete department')
  }

  return json.data
}