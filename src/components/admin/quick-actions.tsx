'use client'

import { useState } from 'react'
import { Plus, Building2, Search, Filter } from 'lucide-react'

export default function QuickActions() {
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false)
  const [isDepartmentsModalOpen, setDepartmentsModalOpen] = useState(false)

  return (
    <>
      <div className="bg-xl rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-500">Manage templates, reports, and departments</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Template button */}
            <button
              onClick={() => console.log('Create template button clicked!')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>

            {/* Manage Departments button */}
            <button
              onClick={() => console.log('Manage departments button clicked!')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Manage Departments
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className='flex items-center gap-4'>
          <div className='flex-1 relative'>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type='text'
              placeholder='Search'
              className='w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent'
            />
          </div>
          <div className='p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'>
            <Filter className='w-4 h-4 text-gray-500' />
          </div>
        </div>
      </div>
    </>
  )
}