"use client"

import { useState } from 'react'
import Header from '@/components/admin/header' 
import StatsCards from '@/components/admin/stats-cards'
import QuickActions from '@/components/admin/quick-actions'
import CourseTemplatesList from '@/components/admin/course-templates-list'
import { mockCourseTemplates } from '@/data/mock'
import { CourseTemplate } from '@/types/mock'

const AdminDashboard = () => {
  const [searchValue, setSearchValue] = useState("")

  const filteredTemplates = mockCourseTemplates.filter(template =>
    template.code.toLowerCase().includes(searchValue.toLowerCase()) ||
    template.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  const handleCreateTemplate = () => console.log("Create")
  const handleDepartments = () => console.log("Departments")
  const handleFilter = () => console.log("Filter")
  const handleManageTemplate = (t: CourseTemplate) => console.log("Manage", t.code)

  return (
    <div className="min-h-screen w-full bg-gray-50 font-sans text-slate-900 flex flex-col">
      
      {/* 1. Header (Sticky) */}
      <div className="sticky top-0 z-50">
        <Header />
      </div>

      {/* 2. Main Content Wrapper */}
      {/* FIX: Added 'pt-10' (40px) here. 
          This pushes the content down, away from the Header. */}
      <main className="flex-1 w-full flex flex-col items-center pt-10 px-6 md:px-10 pb-10">
        
        {/* 3. Widgets Container */}
        {/* Added 'gap-8' to ensure space between Stats, Quick Actions, and Templates */}
        <div className="w-full max-w-7xl flex flex-col gap-8">
          
          <section>
            <StatsCards />
          </section>
          
          <section>
            <QuickActions 
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onCreateTemplate={handleCreateTemplate}
              onManageDepartments={handleDepartments}
              onFilter={handleFilter}
            />
          </section>

          <section>
            <CourseTemplatesList 
              templates={filteredTemplates} 
              onManageTemplate={handleManageTemplate} 
            />
          </section>

        </div>
      </main>
    </div>
  )
}

export default AdminDashboard