import { Staff } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

export function useFetchStaff() {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: fetchStaff,
    staleTime: 1000 * 60 * 5,
  })
}

async function fetchStaff(): Promise<Staff[]> {
  const response = await fetch('/api/admin/staff')
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch staff')
  }

  return json.data
}