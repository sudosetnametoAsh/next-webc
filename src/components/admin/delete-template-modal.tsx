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

  const courseIds = (courseTemplates.map(cT => cT.course_id).filter(id => id !== null) as number[]) ?? []
  const deptIds = staffTemplates.flatMap(sT => sT.departments.map(d => d.dept_id)) ?? []

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
      <DialogContent className='sm:max-w-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100'>
        <DialogHeader>
          <DialogTitle>
            <TriangleAlert className='w-8 h-8 text-red-600 dark:text-rose-400' />
          </DialogTitle>
          <h2 className='text-lg font-bold mt-2 text-slate-900 dark:text-slate-100'>Delete all course templates</h2>
          <p className='text-gray-500 dark:text-slate-400 text-sm'>
            This will delete all clearance templates and their department assignments.
          </p>
        </DialogHeader>
        
        <div className='bg-red-50 border border-red-200 px-4 py-4 rounded-xl mb-4 dark:bg-rose-950/40 dark:border-rose-900/60'>
          <p className='text-sm text-red-700 dark:text-rose-300 leading-relaxed'>
            Students currently enrolled in these courses will no longer have an assigned clearance template until new ones are created.
          </p>
        </div>

        <div className='flex flex-col gap-2 mb-2'>
          <p className='text-sm text-gray-500 dark:text-slate-400'>Type <span className='font-bold text-slate-900 dark:text-slate-100'>DELETE ALL</span> to confirm</p>
          <input 
            type='text'
            onChange={handleInputChange}
            className='w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
            value={userInput}
            placeholder='DELETE ALL'
            maxLength={255}
          />
        </div>

        <div className='flex justify-end gap-2 mt-4'>
          <button
            onClick={handleClose}
            className='px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg cursor-pointer transition-colors'
          >
            Cancel
          </button>
          <button
            disabled={disabledButton || isDeleteLoading}
            onClick={handleDeleteAll}
            className='disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-rose-600 dark:hover:bg-rose-500 border border-red-700 dark:border-rose-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors'
          >
            {isDeleteLoading && <SpinnerIcon />}
            {isDeleteLoading ? 'Deleting all templates...' : 'Delete all templates'}
          </button>
        </div>
        
      </DialogContent>
    </Dialog>
  )
}
