import { Departments } from '@/types/admin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// --- Hooks ---

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
      // Invalidate to refetch the list immediately
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
    },
    onError: (error) => {
      console.error("Mutation failed:", error)
      alert(error.message) // Optional: show alert to user
    }
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
    },
    onError: (error) => {
      console.error("Update failed:", error)
      alert(error.message)
    }
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
    },
    onError: (error) => {
      console.error("Delete failed:", error)
      alert(error.message)
    }
  })
}

// --- Fetch Functions (Refactored for Safety) ---

async function fetchDepartments(): Promise<Departments[]> {
  const response = await fetch('/api/admin/departments')
  
  // 1. Check status BEFORE parsing
  if (!response.ok) {
    const text = await response.text() // Get raw error text
    throw new Error(text || 'Failed to fetch departments')
  }

  const json = await response.json()
  return json.data || []
}

async function createDepartment(dept_name: string): Promise<void> {
  const response = await fetch('/api/admin/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dept_name })
  })

  // 1. Check status first
  if (!response.ok) {
    const errorText = await response.text()
    console.error("API Error:", errorText) // Log the real error (e.g. Supabase key missing)
    
    // Try to parse it as JSON error if possible, otherwise use text
    try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.error || 'Failed to create department')
    } catch {
        throw new Error(errorText || 'Failed to create department')
    }
  }

  const json = await response.json()
  return json.data
}

async function updateDepartment({ dept_id, dept_name }: { dept_id: number, dept_name: string }): Promise<void> {
  const response = await fetch('/api/admin/departments', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dept_id, dept_name })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("API Error:", errorText)
    throw new Error('Failed to update department')
  }

  const json = await response.json()
  return json.data
}

async function deleteDepartment(dept_id: number): Promise<void> {
  const response = await fetch('/api/admin/departments', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dept_id })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("API Error:", errorText)
    throw new Error('Failed to delete department')
  }

  const json = await response.json()
  return json.data
}