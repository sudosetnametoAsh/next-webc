'use client'

import { useState } from 'react'
import Header from '@/components/admin/header'
import AdminStats from '@/components/admin/admin-stats'
import QuickActions from '@/components/admin/quick-actions'
import CourseTemplatesList from '@/components/admin/course-templates-list'

export default function AdminDashboard({ email }: { email: string }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div>
      <Header email={email} />

      <main className='min-h-screen bg-blue-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
          <AdminStats />

          <QuickActions searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

          {/* Course Templates Section */}
          <section>
            <div className='mb-4'>
              <h2 className='text-2xl font-bold text-gray-900 mb-1'>Course Templates</h2>
              <p className='text-sm text-gray-500'>Manage clearance templates for each course</p>
            </div>
            <CourseTemplatesList searchQuery={searchQuery} />
          </section>
        </div>
      </main>
    </div>
  )
}