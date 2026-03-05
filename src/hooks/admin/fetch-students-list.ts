import { AdminStudentListResponse } from '@/types/admin'
import { useQuery } from '@tanstack/react-query'

type Params = {
  page: number
  limit?: number
  course?: string
  search?: string
}

export function useFetchStudentsList({ page, limit = 25, course = '', search = '' }: Params) {
  return useQuery({
    queryKey: ['admin', 'students-list', page, limit, course, search],
    queryFn: () => fetchStudentsList(page, limit, course, search),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  })
}

async function fetchStudentsList(
  page: number,
  limit: number,
  course: string,
  search: string
): Promise<AdminStudentListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (course) {
    params.set('course', course)
  }

  if (search) {
    params.set('search', search)
  }

  const response = await fetch(`/api/admin/students-list?${params}`)
  const json = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch students list')
  }

  return json.data
}
