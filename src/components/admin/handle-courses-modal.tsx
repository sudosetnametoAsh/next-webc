import { useState, useCallback } from "react"
import { BookOpenText, Pencil, Plus, Trash2, X, Check, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ConfirmationModal from './confirmation-modal'
import { useFetchCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from "@/hooks/admin/courses"

// ─── Types ────────────────────────────────────────────────────────────────────

type Course = {
  course_id: number;
  course_name: string;
  email?: string;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setSelectedCourses: React.Dispatch<React.SetStateAction<number[]>>;
  courseIds: number[];
  toastSuccess: (message: string, title?: string) => number;
  toastError: (message: string, title?: string) => number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CourseRow({
  course,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isSaving,
}: {
  course: Course
  isEditing: boolean
  editingName: string
  onEditingNameChange: (v: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  isSaving: boolean
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
        <input
          type="text"
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          className="flex-1 px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
        />
        <button
          onClick={onSaveEdit}
          disabled={isSaving || !editingName.trim()}
          className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 transition-colors cursor-pointer"
          title="Save"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onCancelEdit}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center justify-between px-3 py-2.5 bg-white border border-slate-100 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 shrink-0 group-hover:bg-slate-200 transition-colors">
          <BookOpenText className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{course.course_name}</p>
          {course.email && (
            <p className="text-xs text-slate-400 font-mono truncate">{course.email}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onStartEdit}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManageCoursesModal({ 
  open,
  onOpenChange,
  setSelectedCourses,
  courseIds,
  toastSuccess,
  toastError }: Props) {

  // ————————————————————————————————————————
  // State for delete confirmation modal
  // ————————————————————————————————————————

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)

  // ————————————————————————————————————————
  // Core State
  // ————————————————————————————————————————

  const [selectedCourseId, setSelectedCourseId] = useState(0)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  // ————————————————————————————————————————
  // Hooks
  // ————————————————————————————————————————

  const { data: courses = [], isLoading } = useFetchCourses()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()

  // ————————————————————————————————————————
  // Handlers
  // ————————————————————————————————————————

  const handleClose = () => {

    onOpenChange(false)
    setIsConfirmOpen(false)

    setNewName('')
    setEditingId(null)
    setEditingName('')
    setSelectedCourses(courseIds)
  }

  const handleCreate = useCallback(async () => {

    if (!newName.trim()) return

    if (courses.map(c => c.course_name.trim().toLowerCase()).includes(newName.trim().toLowerCase())) {
      toastError("Please try again.", "Course already exists.")
      return
    }

    try {
      await createCourse.mutateAsync(newName.trim())
      setNewName('')
    } catch (err) {
      console.error('Create failed:', err)
      toastError("Please try again.", "Failed to create course.")
    }

    toastSuccess("New course created successfully!")

  }, [newName, createCourse])

  const handleUpdate = useCallback(async (id: number) => {

    if (!editingName.trim()) return

    if (courses.map(c => c.course_name.trim().toLowerCase()).includes(editingName.trim().toLowerCase())) {
      toastError("Please try again.", "Course name already exists.")
      return
    }

    try {
      await updateCourse.mutateAsync({ course_id: id, course_name: editingName.trim() })
      setEditingId(null)
      setEditingName('')
    } catch (err) {
      console.error('Update failed:', err)
      toastError("Please try again.", "Failed to rename course")
    }

    toastSuccess("Course renamed successfully!")

  }, [editingName, updateCourse])

  const handleConfirmDelete = useCallback(async (id: number) => {

    setIsConfirmLoading(true)

    try {
      await deleteCourse.mutateAsync(id)
    } catch (err) {
      console.error('Delete failed:', err)
      toastError("Please try again.", "Failed to delete course.")
    }

    setIsConfirmOpen(false)
    setIsConfirmLoading(false)
    toastSuccess("Course removed successfully!")

  }, [deleteCourse])

  const startEditing = useCallback((id: number, name: string) => {
    setEditingId(id)
    setEditingName(name)
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">

          {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                <BookOpenText className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                  Manage Programs
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">Add, edit, or remove courses</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Add input */}

        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Course name..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createCourse.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 disabled:opacity-40 transition-all cursor-pointer shrink-0"
            >
              {createCourse.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </div>

        {/* Course list */}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12 text-slate-400 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <BookOpenText className="w-5 h-5" />
              </div>
              <p className="text-sm">No courses yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {courses.map((course: Course) => (
                <CourseRow
                  key={course.course_id}
                  course={course}
                  isEditing={editingId === course.course_id}
                  editingName={editingName}
                  onEditingNameChange={setEditingName}
                  onStartEdit={() => startEditing(course.course_id, course.course_name)}
                  onSaveEdit={() => handleUpdate(course.course_id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => { setIsConfirmOpen(true); setSelectedCourseId(course.course_id); }}
                  isSaving={updateCourse.isPending}
                />
              ))}
            </div>
          )}

          <ConfirmationModal 
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={() => handleConfirmDelete(selectedCourseId)}
            variant="destructive"
            title="Are you sure you want to delete this course?"
            description="Linked staff accounts will also be removed. This action is irreversible"
            confirmLabel="Yes, delete it"
            isLoading={isConfirmLoading}
          />
        </div>

        {/* Footer count */}

        {!isLoading && courses.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-400">
              {courses.length} course{courses.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        </DialogContent>
      </Dialog>
    </>
  )
}