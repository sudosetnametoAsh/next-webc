'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, User } from 'lucide-react'

// Simple types for props and data
type Student = { id: string; name: string; section: string }
type Props = {
  isOpen: boolean
  onClose: () => void
  template: { id: string; code: string; name: string } | null
}

export default function ManageStudentsModal({ isOpen, onClose, template }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // 1. Fetch data whenever the modal opens or the course changes
  useEffect(() => {
    if (!isOpen || !template?.id) {
      setStudents([]) // Clear data when closed to prevent flashing old data
      setSearch('')
      return
    }

    const fetchStudents = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/course-students?courseId=${template.id}`)
        const json = await res.json()
        if (json.data) setStudents(json.data)
      } catch (error) {
        console.error("Failed to load students", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [isOpen, template])

  // 2. Memoize filtering so it doesn't slow down typing in the search bar
  const filteredStudents = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return students.filter(s => 
      s.name.toLowerCase().includes(lowerSearch) || 
      s.id.toLowerCase().includes(lowerSearch)
    )
  }, [students, search])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Students</DialogTitle>
          <p className="text-sm text-gray-500">{template?.code} • {template?.name}</p>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative mt-2 mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by name or ID..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Scrollable Student List */}
        <div className="flex-1 overflow-y-auto min-h-75 border rounded-lg border-gray-100 bg-gray-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading students...</div>
          ) : filteredStudents.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-3 bg-white flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{student.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{student.id}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                    Section {student.section}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No students found.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}