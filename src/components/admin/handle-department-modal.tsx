'use client'

import { useState } from 'react'
import { Building2, Pencil, Plus, Trash2, X, Check, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useFetchDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/admin/departments'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ManageDepartmentsModal({ open, onOpenChange }: Props) {
  // Hooks
  const { data: departments = [], isLoading } = useFetchDepartments()
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()
  const deleteDepartment = useDeleteDepartment()

  // State
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  // --- Handlers ---

  const handleCreate = async () => {
    if (!newDepartmentName.trim()) return

    try {
      await createDepartment.mutateAsync(newDepartmentName)
      setNewDepartmentName('')
    } catch (error) {
      console.error('Failed to create:', error)
    }
  }

  const handleUpdate = async (id: number) => {
    if (!editingName.trim()) return

    try {
      await updateDepartment.mutateAsync({ dept_id: id, dept_name: editingName })
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      console.error('Failed to update:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department? Linked staff accounts will also be removed.')) return

    try {
      await deleteDepartment.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const startEditing = (id: number, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Departments</DialogTitle>
          <p className="text-sm text-gray-500">Add or manage departments and staff.</p>
        </DialogHeader>

        {/* 1. Add Department Input */}
        <div className="flex gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <input 
            type="text"
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            placeholder="New department name..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!newDepartmentName.trim() || createDepartment.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {createDepartment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>

        {/* 2. Department List */}
        <div className="flex-1 overflow-y-auto min-h-75 pr-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-10 text-gray-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : departments.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No departments found.</p>
          ) : (
            <div className="space-y-2">
              {departments.map((dept: any) => (
                <div 
                  key={dept.dept_id} 
                  className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-all group shadow-sm"
                >
                  {editingId === dept.dept_id ? (
                    // --- EDIT MODE ---
                    <div className="flex items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                      <input 
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-blue-400 rounded text-sm focus:outline-none bg-blue-50/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(dept.dept_id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <button 
                        onClick={() => handleUpdate(dept.dept_id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    // --- VIEW MODE ---
                    <>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-slate-100 p-2 rounded-full text-slate-600 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{dept.dept_name}</p>
                          {/* Optional: Show email if your hook returns it */}
                          {dept.email && (
                            <p className="text-xs text-gray-400 truncate font-mono">{dept.email}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(dept.dept_id, dept.dept_name)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.dept_id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
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