/**
 * NEED TO REFACTOR THIS COMPONENT IN ORDER TO WORK PROPERLY :)
 * 
 * Warning: 
 *  - DO NOT MODIFY quick-actions.tsx unless neccessary (it might break the open/close state modal)
 *  - DO NOT MODIFY ALL THE ADMIN API ROUTES unless neccessary (it might break the system)
 *      - If desired to add a new API route, please create a new file and do not modify the existing ones
 */

'use client'

import { useState } from 'react'
import { Building2, MoreVertical, Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useFetchDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/admin/departments'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ManageDepartmentsModal({ open, onOpenChange }: Props ) {
  const { data: departments = [], isLoading } = useFetchDepartments() 
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()
  const deleteDepartment = useDeleteDepartment()

  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null)
  const [editingDepartmentName, setEditingDepartmentName] = useState('')

  const handleCreateDepartment = () => {
    if (!newDepartmentName.trim()) { return }

    try {
      createDepartment.mutateAsync(newDepartmentName)
      setNewDepartmentName('')
    } catch (error) {
      console.error('Failed to create department:', error)
    }
  }

  const handleUpdateDepartment = (id: number) => {
    if (!editingDepartmentName.trim()) { return }

    try {
      updateDepartment.mutateAsync({ dept_id: id, dept_name: editingDepartmentName })
      setEditingDepartmentId(null)
      setEditingDepartmentName('')
    } catch (error) {
      console.error('Failed to update department:', error)
    }
  }

  const handleDeleteDepartment = (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) { return }

    try {
      deleteDepartment.mutateAsync(id)

    } catch (error) {
      console.error('Failed to delete department:', error)
    }
  }

  const startEditing = (id: number, currentName: string) => {
    setEditingDepartmentId(id)
    setEditingDepartmentName(currentName)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Departments</DialogTitle>
          <p className='text-sm text-gray-500'>Manage and add department</p>
        </DialogHeader>

        {/* Add Department Input */}
        <div className='flex items-center gap-2 mb-4'>
          <input 
            type='text'
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            placeholder='New department name'
            className='flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            onKeyDown={(e) => e.key === 'Enter' && handleCreateDepartment}
          />
          <button
            onClick={handleCreateDepartment}
            className='flex items-center gap-1 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            <Plus className='w-4 h-4' /> Add Department
          </button>
        </div>

        {/* Departments list */}
        <div className='space-y-2 max-h-80 overflow-y-auto'>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className='grid grid-cols-2'>
              {departments.map((department) => (
                <div
                  key={department.dept_id}
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-lg group'
                >
                  {editingDepartmentId === department.dept_id ? (
                    <div className=''>
                      <input 
                        type='text'
                        value={editingDepartmentName}
                        onChange={(e) => setEditingDepartmentName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { handleUpdateDepartment(department.dept_id) }
                          if (e.key === 'Escape') { setEditingDepartmentId(null) }
                        }}
                      />
                      
                      <button
                        onClick={() => handleUpdateDepartment(department.dept_id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        √
                      </button>
                      <button
                        onClick={() => setEditingDepartmentId(null)}
                        className='text-gray-400 hover:text-gray-500'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                  ): (
                    <div className=''>
                      <div className='flex items-center gap-2'>
                        <Building2 className='w-4 h-4 text-gray-400' />
                        <p className='text-sm font-medium text-gray-700'>{department.dept_name}</p>
                      </div>
                      <div className='relative'>
                        <button
                          onClick={() => startEditing(department.dept_id, department.dept_name)}
                          className='p-1 hover:bg-gray-200 rounded group-hover:opacity-100 transition-opacity'
                        >
                          <MoreVertical className='w-4 h-4 text-gray-500' />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}