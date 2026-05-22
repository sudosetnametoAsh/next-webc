'use client'

import { useState } from 'react'
import { useDeleteAllTemplates } from '@/hooks/admin/clearance-templates';
import { useFetchStaffTemplates } from '@/hooks/admin/staff-templates';
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates';
import { useDeleteStaffTemplates } from '@/hooks/admin/staff-templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TriangleAlert } from 'lucide-react';

const SpinnerIcon = () => (
  <svg
    className="animate-spin"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toastSuccess: (message: string, title?: string) => number;
  toastError: (message: string, title?: string) => number;
}

export default function DeleteAllTemplateModal({ open, onOpenChange, toastSuccess, toastError }: Props) {
  const [userInput, setUserInput] = useState<string>('')
  const [disabledButton, setIsDisabledButton] = useState<boolean>(true)
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false)

  const { data: courseTemplates = [] } = useFetchCourseTemplates()
  const { data: staffTemplates = [] } = useFetchStaffTemplates()

  const courseIds = courseTemplates.map(cT => cT.course_id) ?? []
  const deptIds = staffTemplates.map(sT => sT.dept_id) ?? []

  const deleteAllTemplates = useDeleteAllTemplates()
  const deleteAllStaffTemplates = useDeleteStaffTemplates()

  const handleClose = () => {
    onOpenChange(false)

    setTimeout(() => {
      setUserInput('')
    }, 200)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value

    setUserInput(newInput)
    
    if (!newInput || newInput !== 'DELETE ALL' || courseTemplates.length === 0) { 
      setIsDisabledButton(true)
      return
    }

    setIsDisabledButton(false)
  }

  const handleDeleteAll = async () => {
    if (!userInput || userInput !== 'DELETE ALL' || courseTemplates.length === 0) { return }

    setIsDeleteLoading(true)

    try {
      await deleteAllTemplates.mutateAsync(courseIds)
      
      if (staffTemplates.length !== 0) { await deleteAllStaffTemplates.mutateAsync(deptIds) }
      handleClose()
    } catch (err) {
      console.error('Failed to delete all templates', err)
      toastError("Please try again.", "Failed to delete all templates.")
    }

    setIsDeleteLoading(false)
    toastSuccess('Deleted all templates successfully!')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max:w-lg'>
        <DialogHeader>
          <DialogTitle>
            <TriangleAlert className='w-8 h-8 text-red-700' />
          </DialogTitle>
          <h2 className='text-lg font-medium mt-2'>Delete all course templates</h2>
          <p className='text-gray-500 text-sm'>
            This will delete all clearance templates and their department assignments.
          </p>
        </DialogHeader>
        
        <div className='bg-red-50 border border-red-200 px-4 py-4 rounded-lg mb-4'>
          <p className='text-sm text-red-700'>
            Students current enrolled in these courses will no longer have an assigned clearance template until new ones are created.
          </p>
        </div>

        <div className='flex flex-col gap-2 mb-2'>
          <p className='text-sm text-gray-500'>Type <span className='font-bold'>DELETE ALL</span> to confirm</p>
          <input 
            type='text'
            onChange={handleInputChange}
            className='w-full border px-3 py-2.5 text-sm rounded-lg'
            value={userInput}
            placeholder='DELETE ALL'
            maxLength={255}
          />
        </div>

        <div className='flex justify-end gap-2'>
          <button
            onClick={handleClose}
            className='px-4 py-2 bg-white hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-300 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg cursor-pointer'
          >
            Cancel
          </button>
          <button
            disabled={disabledButton || isDeleteLoading}
            onClick={handleDeleteAll}
            className='disabled:cursor-not-allowed disabled:opacity-50 flex gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 border border-red-700 text-white text-sm font-medium rounded-lg hover:bg-gray-50 cursor-pointer'
          >
            {isDeleteLoading && <SpinnerIcon />}
            {isDeleteLoading ? 'Deleting all templates...' : 'Delete all templates'}
          </button>
        </div>
        
      </DialogContent>
    </Dialog>
  )
}
