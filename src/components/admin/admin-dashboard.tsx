'use client'

import { useState } from 'react'
import Header from '@/components/admin/header'
import AdminStats from '@/components/admin/admin-stats'
import StudentListView from '@/components/admin/student-list-view'
import QuickActions from '@/components/admin/quick-actions'
import CourseTemplatesList from '@/components/admin/course-templates-list'
import { ToastContainer } from './toast'
import { useToast } from './use-toast'

export default function AdminDashboard({ email }: { email: string }) {
  const [adminPage, setAdminPage] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')

  // Toast notification
  const { toasts, dismiss, success, error } = useToast({
    maxToasts: 3,
    duration: 4000,
  })

  const renderPage = () => {
    switch (adminPage) {
      case 'student-list-view':
        return <StudentListView setAdminPage={setAdminPage} />
      default:
        return (
          <>
            <ToastContainer toasts={toasts} onDismiss={dismiss} duration={4000} />
            <AdminStats setAdminPage={setAdminPage} />

            <QuickActions searchQuery={searchQuery} setSearchQuery={setSearchQuery} toastSuccess={success} toastError={error} />

            {/* Course Templates Section */}
            <section>
              <div className='mb-4'>
                <h2 className='text-2xl font-bold text-gray-900 mb-2'>Course Templates</h2>
                <p className='text-sm text-gray-600'>Manage clearance templates for each course</p>
              </div>
              <CourseTemplatesList searchQuery={searchQuery} toastSuccess={success} toastError={error} />
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