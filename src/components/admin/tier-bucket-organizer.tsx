'use client'

import { useEffect, useState, type DragEvent } from 'react'
import { GripVertical, Plus, Trash2, User, ArrowUp, ArrowDown, Undo2 } from 'lucide-react'
import { StaffAssignment } from '@/types/admin'
import { getDepartmentIcon } from '@/lib/department-icons'

type Props = {
  assignments: StaffAssignment[]
  onEmptyPhasesChange: (hasEmptyPhases: boolean) => void
  onAssignmentsChange: (assignments: StaffAssignment[]) => void
  onSelectDepartmentForStaff: (deptId: number) => void
}

export default function TierBucketOrganizer({ assignments, onAssignmentsChange, onSelectDepartmentForStaff, onEmptyPhasesChange }: Props) {
  const [phaseCount, setPhaseCount] = useState(() => Math.max(1, ...assignments.map(a => a.tier ?? 0)))
  const [activePhase, setActivePhase] = useState(1)
  const [draggedDeptId, setDraggedDeptId] = useState<number | null>(null)
  const unassigned = assignments.filter(a => !a.tier)
  const hasEmptyPhases = Array.from({ length: phaseCount }, (_, i) => i + 1)
    .some(phase => !assignments.some(assignment => assignment.tier === phase))

  useEffect(() => {
    onEmptyPhasesChange(hasEmptyPhases)
  }, [hasEmptyPhases, onEmptyPhasesChange])

  const move = (deptId: number, tier: number) => {
    onAssignmentsChange(assignments.map(a => a.dept_id === deptId ? { ...a, tier } : a))
  }
  const drop = (event: DragEvent, tier: number) => {
    event.preventDefault()
    const value = event.dataTransfer.getData('text/plain')
    const deptId = value ? Number(value) : draggedDeptId
    if (deptId !== null && assignments.some(a => a.dept_id === deptId)) move(deptId, tier)
    setDraggedDeptId(null)
  }
  const removePhase = (phase: number) => {
    onAssignmentsChange(assignments.map(a => a.tier === phase ? { ...a, tier: 0 } : (a.tier ?? 0) > phase ? { ...a, tier: a.tier! - 1 } : a))
    setPhaseCount(Math.max(1, phaseCount - 1))
    setActivePhase(current => current === phase ? Math.max(1, phase - 1) : current > phase ? current - 1 : current)
  }
  const dragProps = (deptId: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.setData('text/plain', String(deptId))
      event.dataTransfer.effectAllowed = 'move'
      setDraggedDeptId(deptId)
    },
    onDragEnd: () => setDraggedDeptId(null),
  })

  return (
    <div className="space-y-4">
      {hasEmptyPhases && <p role="status" className="text-xs text-amber-300">Each phase needs at least one department. Add a department or delete the empty phase before saving.</p>}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <section aria-label="Unassigned departments" onDragOver={e => e.preventDefault()} onDrop={e => drop(e, 0)} className="min-w-0 space-y-3 md:sticky md:top-0">
          <div className="flex min-h-8 items-center"><h4 className="text-sm font-semibold text-white">Departments <span className="text-slate-500">({unassigned.length})</span></h4></div>
          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#070c18] p-3">
          {unassigned.length > 0 && <p className="text-[11px] text-slate-400">Choose a department to add to Phase {activePhase}.</p>}
          {unassigned.length === 0 && <p className="py-4 text-center text-xs text-slate-500">All departments assigned</p>}
          {unassigned.map(assignment => {
            const Icon = getDepartmentIcon(assignment.icon_name, assignment.dept_name)
            return <button key={assignment.dept_id} type="button" {...dragProps(assignment.dept_id)} onClick={() => move(assignment.dept_id, activePhase)} className="flex w-full items-center gap-2 rounded-lg border border-slate-800 p-3 text-left hover:border-amber-400/40 hover:bg-amber-400/5"><GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-500" /><Icon className="h-4 w-4 shrink-0 text-amber-400" /><span className="flex-1 break-words text-xs font-medium text-slate-200">{assignment.dept_name}</span><Plus className="h-3.5 w-3.5 shrink-0 text-amber-300" /></button>
          })}
          </div>
        </section>
        <section className="min-w-0 space-y-3" aria-label="Clearance phases">
          <div className="flex min-h-8 items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">Phases</h4>
            <button type="button" onClick={() => { setPhaseCount(phaseCount + 1); setActivePhase(phaseCount + 1) }} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-amber-300 hover:bg-slate-800">
              <Plus className="h-3.5 w-3.5" /> Add phase
            </button>
          </div>
          {Array.from({ length: phaseCount }, (_, i) => i + 1).map(phase => {
            const departments = assignments.filter(a => a.tier === phase)
            return (
              <div key={phase} onClick={event => { if (!(event.target as HTMLElement).closest('button')) setActivePhase(phase) }} onDragOver={e => e.preventDefault()} onDrop={e => drop(e, phase)} className={`cursor-pointer rounded-xl border p-3 space-y-3 ${activePhase === phase ? 'border-amber-400/50 bg-amber-400/5' : 'border-slate-800 bg-[#070c18]'} ${draggedDeptId !== null ? 'border-dashed' : ''}`}>
                <div className="flex items-center gap-2">
                  <button type="button" aria-pressed={activePhase === phase} onClick={() => setActivePhase(phase)} className="flex flex-1 items-center justify-between gap-2 text-left">
                    <span className="text-sm font-semibold text-white">Phase {phase}</span>
                  </button>
                  {<button type="button" aria-label={`Delete phase ${phase}`} title="Delete phase and return its departments" onClick={() => removePhase(phase)} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
                {departments.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">{activePhase === phase ? 'Select departments from the left or drag them here.' : 'Drop departments here.'}</p>}
                {departments.map(assignment => {
                  const Icon = getDepartmentIcon(assignment.icon_name, assignment.dept_name)
                  return (
                    <div key={assignment.dept_id} {...dragProps(assignment.dept_id)} className="rounded-lg border border-slate-800 bg-[#0a101f] p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-500" />
                        <Icon className="h-4 w-4 shrink-0 text-amber-400" />
                        <span className="min-w-0 flex-1 break-words text-xs font-semibold text-white">{assignment.dept_name}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <button type="button" onClick={() => onSelectDepartmentForStaff(assignment.dept_id)} className="flex min-w-0 items-center gap-1 text-left text-[11px] text-amber-300 hover:text-amber-200"><User className="h-3 w-3 shrink-0" /><span className="truncate">{assignment.staff_name || 'Assign staff officer'}</span></button>
                        <div className="flex shrink-0 items-center">
                          <button type="button" aria-label={`Move ${assignment.dept_name} to previous phase`} disabled={phase === 1} onClick={() => move(assignment.dept_id, phase - 1)} className="rounded p-1 text-slate-400 hover:bg-slate-800 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label={`Move ${assignment.dept_name} to next phase`} disabled={phase === phaseCount} onClick={() => move(assignment.dept_id, phase + 1)} className="rounded p-1 text-slate-400 hover:bg-slate-800 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label={`Return ${assignment.dept_name} to unassigned departments`} onClick={() => move(assignment.dept_id, 0)} className="rounded p-1 text-slate-400 hover:bg-slate-800"><Undo2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </section>

      </div>
    </div>
  )
}
