import { AdminStudentListResponse } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

type Params = {
  page: number
  limit?: number
  course?: string
}

export function useFetchStudentsList({ page, limit = 25, course = '' }: Params) {
  return useQuery({
    queryKey: ['admin', 'students-list', page, limit, course],
    queryFn: () => fetchStudentsList(page, limit, course),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  })
}

async function fetchStudentsList(
  page: number,
  limit: number,
  course: string
): Promise<AdminStudentListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (course) {
    params.set('course', course)
  }

  const response = await fetch(`/api/admin/students-list?${params}`)
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch students list')
  }

  return json.data
}
