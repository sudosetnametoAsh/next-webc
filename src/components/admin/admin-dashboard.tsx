"use client"

import StatsCards from '@/components/admin/stats-cards'
import QuickActions from '@/components/admin/quick-actions'
import CourseTemplatesList from '@/components/admin/course-templates-list'
import { mockCourseTemplates } from '@/data/mock'
import { useState } from 'react'
import { CourseTemplate } from '@/types/mock'

const AdminDashboard = () => {
  const [searchValue, setSearchValue] = useState("")

  // Filter templates based on search value
  const filteredTemplates = mockCourseTemplates.filter(template =>
    template.code.toLowerCase().includes(searchValue.toLowerCase()) ||
    template.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  const handleCreateTemplate = () => {
    // Logic to create a new template
    console.log("Create Template clicked")
  }

  const handleDepartments = () => {
    // Logic to manage departments
    console.log("Manage Departments clicked")
  }

  const handleFilter = () => {
    // Logic to filter templates/reports
    console.log("Filter button clicked")
  }

  const handleManageTemplate = (template: CourseTemplate) => {
    // Logic to manage a specific template
    console.log("Manage Template clicked with code:", template.code)
  }

  return (
    <div className='space-y-6'>
      <StatsCards />

      <QuickActions 
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onCreateTemplate={handleCreateTemplate}
        onManageDepartments={handleDepartments}
        onFilter={handleFilter}
      />

      <CourseTemplatesList templates={filteredTemplates} onManageTemplate={handleManageTemplate} />
    </div>
  )
}

export default AdminDashboard