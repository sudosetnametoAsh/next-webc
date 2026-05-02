'use client'

import { useState } from "react"
import CourseTemplatesList from '@/components/admin/course-templates-list'
import { Plus, Building2, Search, Trash } from 'lucide-react'
import { ToastContainer } from '@/components/admin/toast'
import { useToast } from '@/components/admin/use-toast'
import CreateTemplateModal from '@/components/admin/create-template-modal'
import ManageDepartmentsModal from '@/components/admin/handle-department-modal'
import DeleteAllTemplateModal from '@/components/admin/delete-template-modal'

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false)
  const [isDepartmentsModalOpen, setDepartmentsModalOpen] = useState(false)
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false)

  // Toast notification
  const { toasts, dismiss, success, error } = useToast({
    maxToasts: 3,
    duration: 4000,
  })

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} duration={4000} />

      <section>
        <div className='flex flex-col xl:flex-row gap-4 justify-between mb-8'>
          <div>
            <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-2'>Course Templates</h2>
            <p className='text-sm text-gray-600'>Manage clearance templates for each course</p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Create Template button */}
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>

            {/* Manage Departments button */}
            <button
              onClick={() => setDepartmentsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Building2 className="h-4 w-4" />
              Manage Departments
            </button>

            {/* Delete All button */}
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 text-sm font-medium rounded-lg cursor-pointer"
            >
              <Trash className="w-4 h-4" />
              Delete all
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className='flex items-center gap-4 mb-8'>
          <div className='flex-1 relative'>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type='text'
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              maxLength={255}
              placeholder='Search by course name...'
              className='w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent'
            />
          </div>
          {/* TODO: EDIT (optional) */}
          {/* <button onClick={() => console.log('Filter button clicked!')} className='p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'>
            <Filter className='w-4 h-4 text-gray-500' />
          </button> */}
        </div>

        <CourseTemplatesList searchQuery={searchQuery} toastSuccess={success} toastError={error} />
      </section>

      <CreateTemplateModal open={isTemplateModalOpen} onOpenChange={setTemplateModalOpen} toastSuccess={success} toastError={error} />
      <ManageDepartmentsModal open={isDepartmentsModalOpen} onOpenChange={setDepartmentsModalOpen} toastSuccess={success} toastError={error} />
      <DeleteAllTemplateModal open={isDeleteAllModalOpen} onOpenChange={setIsDeleteAllModalOpen} toastSuccess={success} toastError={error} />
    </>
  )
}