import { Departments } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

export function useFetchDepartments() {
  return useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: fetchDepartments,
    staleTime: 1000 * 60 * 5,
  })
}

export async function fetchDepartments(): Promise<Departments[]> {
  const response = await fetch('/api/admin/departments')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch departments')
  }

  return json.data
}