import { Departments } from '@/types/admin'
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const adminDepartmentsQueryKey = ['admin', 'departments'] as const

// --- Hooks ---

export function useFetchDepartments() {
  return useQuery({
    queryKey: adminDepartmentsQueryKey,
    queryFn: fetchDepartments,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
}

export async function prefetchDepartments(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: adminDepartmentsQueryKey,
    queryFn: fetchDepartments,
    staleTime: 1000 * 60 * 5,
  })
}

export function invalidateDepartments(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: adminDepartmentsQueryKey })
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
      // alert(error.message) // Optional: show alert to user
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
      // alert(error.message)
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
      // alert(error.message)
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

export type CreateDepartmentInput =
  | string
  | {
      dept_name: string;
      icon_name?: string;
      floor?: string | null;
      room?: string | null;
    };

export type UpdateDepartmentInput = {
  dept_id: number;
  dept_name?: string;
  icon_name?: string;
  floor?: string | null;
  room?: string | null;
};

async function createDepartment(input: CreateDepartmentInput): Promise<void> {
  const payload = typeof input === "string" ? { dept_name: input } : input;
  const response = await fetch('/api/admin/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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

async function updateDepartment(payload: UpdateDepartmentInput): Promise<void> {
  const response = await fetch('/api/admin/departments', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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