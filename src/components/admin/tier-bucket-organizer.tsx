"use client";

import React, { useState } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  User,
  AlertCircle,
  Building2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
} from "lucide-react";
import { StaffAssignment } from "@/types/admin";
import { getDepartmentIcon } from "@/lib/department-icons";

interface TierBucketOrganizerProps {
  assignments: StaffAssignment[];
  onAssignmentsChange: (assignments: StaffAssignment[]) => void;
  onSelectDepartmentForStaff: (deptId: number) => void;
}

export default function TierBucketOrganizer({
  assignments,
  onAssignmentsChange,
  onSelectDepartmentForStaff,
}: TierBucketOrganizerProps) {
  // Determine highest tier currently in assignments, with a minimum of 2 phases
  const currentMaxTier = Math.max(
    ...assignments.map((a) => a.tier || 1),
    2
  );
  const [phaseCount, setPhaseCount] = useState<number>(Math.max(currentMaxTier, 3));
  const [draggedDeptId, setDraggedDeptId] = useState<number | null>(null);

  // Group assignments by tier
  const phases = Array.from({ length: phaseCount }, (_, i) => i + 1);

  const getPhaseAssignments = (phaseNum: number) => {
    return assignments.filter((a) => (a.tier || 1) === phaseNum);
  };

  const handleMoveTier = (deptId: number, targetTier: number) => {
    onAssignmentsChange(
      assignments.map((a) =>
        a.dept_id === deptId ? { ...a, tier: targetTier } : a
      )
    );
  };

  const handleAddPhase = () => {
    setPhaseCount((prev) => prev + 1);
  };

  const handleRemovePhase = (phaseNum: number) => {
    if (phaseCount <= 1) return;
    // Move any departments in this phase down to phase - 1 (or 1)
    const targetPhase = Math.max(1, phaseNum - 1);
    const updated = assignments.map((a) => {
      const currentTier = a.tier || 1;
      if (currentTier === phaseNum) {
        return { ...a, tier: targetPhase };
      }
      if (currentTier > phaseNum) {
        return { ...a, tier: currentTier - 1 };
      }
      return a;
    });
    onAssignmentsChange(updated);
    setPhaseCount((prev) => prev - 1);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, deptId: number) => {
    e.dataTransfer.setData("text/plain", deptId.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedDeptId(deptId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetTier: number) => {
    e.preventDefault();
    const deptIdStr = e.dataTransfer.getData("text/plain");
    const deptId = Number(deptIdStr) || draggedDeptId;
    if (deptId !== null) {
      handleMoveTier(deptId, targetTier);
    }
    setDraggedDeptId(null);
  };

  const getPhaseSubtitle = (phaseNum: number, total: number) => {
    if (phaseNum === 1) return "Initial Prerequisite · Signs First";
    if (phaseNum === total) return "Final Endorsement · Signs Last";
    return "Parallel Clearance · Signs in Any Order";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">
            Phase / Tier Priority Organizer
          </h4>
          <p className="text-xs text-slate-400">
            Departments in Phase 1 must sign first. Departments in the same phase can sign in any order.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddPhase}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-xs hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-amber-400" />
          <span>Add Phase</span>
        </button>
      </div>

      {/* Phase Buckets Container */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {phases.map((phaseNum) => {
          const deptsInPhase = getPhaseAssignments(phaseNum);
          const isFirst = phaseNum === 1;
          const isLast = phaseNum === phaseCount;

          return (
            <div
              key={phaseNum}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, phaseNum)}
              className={`rounded-2xl border transition-all ${
                draggedDeptId !== null
                  ? "border-dashed border-amber-500/60 bg-amber-500/10"
                  : "border-slate-800 bg-[#070c18]"
              } p-3.5 space-y-2.5`}
            >
              {/* Phase Bucket Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-extrabold shadow-xs ${
                      isFirst
                        ? "bg-amber-500 text-slate-950"
                        : isLast
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {phaseNum}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white mr-2">
                      Phase {phaseNum}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      ({getPhaseSubtitle(phaseNum, phaseCount)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-500">
                    {deptsInPhase.length} {deptsInPhase.length === 1 ? "dept" : "depts"}
                  </span>

                  {phaseCount > 1 && deptsInPhase.length === 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhase(phaseNum)}
                      className="rounded-lg p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove empty phase"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Department Cards inside this Phase */}
              <div className="space-y-2 min-h-[50px] rounded-xl p-1.5 bg-[#0a101f]/70 border border-slate-800/80">
                {deptsInPhase.length === 0 ? (
                  <div className="flex items-center justify-center py-4 text-xs italic text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    Drag departments here or use quick move buttons
                  </div>
                ) : (
                  deptsInPhase.map((assignment) => {
                    const hasStaff = assignment.staff_id !== null;

                    return (
                      <div
                        key={assignment.dept_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, assignment.dept_id)}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0a101f] p-2.5 shadow-xs hover:border-slate-700 transition-all"
                      >
                        {/* Drag Handle & Info */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="cursor-grab text-slate-500 hover:text-slate-300 active:cursor-grabbing">
                            <GripVertical className="h-4 w-4" />
                          </div>

                          {(() => {
                            const DeptIcon = getDepartmentIcon(assignment.icon_name, assignment.dept_name);
                            return (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                                <DeptIcon className="h-3.5 w-3.5" />
                              </div>
                            );
                          })()}

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              {assignment.dept_name}
                            </span>

                            {/* Staff Assign Trigger */}
                            <button
                              type="button"
                              onClick={() => onSelectDepartmentForStaff(assignment.dept_id)}
                              className={`flex items-center gap-1 text-[11px] font-medium transition-colors text-left truncate cursor-pointer ${
                                hasStaff
                                  ? "text-slate-400 hover:text-white"
                                  : "text-amber-400 font-semibold hover:text-amber-300"
                              }`}
                            >
                              {hasStaff ? (
                                <User className="h-3 w-3 shrink-0 text-slate-400" />
                              ) : (
                                <AlertCircle className="h-3 w-3 shrink-0 text-amber-400" />
                              )}
                              <span className="truncate">
                                {hasStaff
                                  ? assignment.staff_name
                                  : "Assign Staff Officer"}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Quick Tier Move Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move up a phase */}
                          <button
                            type="button"
                            disabled={phaseNum <= 1}
                            onClick={() => handleMoveTier(assignment.dept_id, phaseNum - 1)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move to previous phase"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>

                          {/* Move down a phase */}
                          <button
                            type="button"
                            disabled={phaseNum >= phaseCount}
                            onClick={() => handleMoveTier(assignment.dept_id, phaseNum + 1)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move to next phase"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
