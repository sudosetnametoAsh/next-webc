// Impletement fetching data that will be used in the modal later
// 3) Fetch list of staff to choose from
// 'use client'

import { useFetchCourses } from '@/hooks/admin/fetch-courses'
import { useFetchDepartments } from '@/hooks/admin/fetch-departments'
import { useFetchStaff } from '@/hooks/admin/fetch-staff'

export default function CreateTemplateModal() {
  const { data: courses = [] } = useFetchCourses()
  const { data: departments = [] } = useFetchDepartments()
  const { data: staff = [] } = useFetchStaff()

  // console.log('Courses:', courses)
  // console.log('Departments:', departments)
  // console.log('Staff:', staff)

  return (
    <div></div>
  )
}