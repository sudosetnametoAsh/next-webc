'use client'

import { useState } from 'react'
import AdminStats from '@/components/admin/admin-stats'
import QuickActions from '@/components/admin/quick-actions'
import CourseTemplatesList from '@/components/admin/course-templates-list'
import { ToastContainer } from '@/components/admin/toast'
import { useToast } from '@/components/admin/use-toast'

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('')

  // Toast notification
  const { toasts, dismiss, success, error } = useToast({
    maxToasts: 3,
    duration: 4000,
  })

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} duration={4000} />
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">
        Dashboard
      </h1>
      <AdminStats />

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