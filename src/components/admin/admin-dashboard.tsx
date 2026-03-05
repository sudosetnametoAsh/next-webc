'use client'

import { useState } from 'react'
import Header from '@/components/admin/header'
import AdminStats from '@/components/admin/admin-stats'
import StudentClearanceStatus from '@/components/admin/student-clearance-status'
import TotalStudentsView from '@/components/admin/total-students-view'
import QuickActions from '@/components/admin/quick-actions'
import CourseTemplatesList from '@/components/admin/course-templates-list'

export default function AdminDashboard({ email }: { email: string }) {
  const [adminPage, setAdminPage] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')

  const renderPage = () => {
    switch (adminPage) {
      case 'total-students-list':
        return <TotalStudentsView page={adminPage} setPage={setAdminPage} />
      case 'student-clearance-status':
        return <StudentClearanceStatus setAdminPage={setAdminPage} />
      default:
        return (
          <>
            <AdminStats setAdminPage={setAdminPage} />

            <QuickActions searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

            {/* Course Templates Section */}
            <section>
              <div className='mb-4'>
                <h2 className='text-2xl font-bold text-gray-900 mb-2'>Course Templates</h2>
                <p className='text-sm text-gray-600'>Manage clearance templates for each course</p>
              </div>
              <CourseTemplatesList searchQuery={searchQuery} />
            </section>
          </>
        )
    }
  }

  return (
    <div>
      <Header email={email} />

      <main className='min-h-screen bg-gray-100'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
          {renderPage()}
        </div>
      </main>
    </div>
  )
}