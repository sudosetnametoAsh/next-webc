"use client";
import { Search, ClipboardList, MoreVertical, Lock } from "lucide-react";
import { useDepartmentContext } from "@/context/deparment";
import { useFetchPreset } from "@/hooks/department/fetch-presets";
import { createClient } from "@/lib/db/supabase-client";
import { Students } from "@/types/students";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import FilterButton from "../button/filter-button";
import SignToggleButton from "../sign-button";
import AddTask from "../button/add-task";
import AddPreset from "../button/add-preset";
import ManagePresetButton from "../button/manage-preset-button";
import SelectAll from "../button/select-all";
import { Checkbox } from "@/components/ui/checkbox";
import TaskView from "./task-view";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type CheckedState = boolean | "indeterminate";

// 1. Define the deepest nested level (departments)
export interface Department {
  dept_name?: string | null;
  signing_order?: number | null;
}

// 2. Define the middle level (clearance_templates)
export interface ClearanceTemplate {
  dept_id?: string | number | null;
  // Supabase returns nested joins as either a single object or an array of objects
  departments?: Department | Department[] | null;
}

// 3. Define the main row (clearance_records)
export interface ClearanceRecord {
  clearance_id?: string;
  student_id?: string;
  status: string; // "Signed", "Pending", etc.
  clearance_templates?: ClearanceTemplate | ClearanceTemplate[] | null;
}

// 4. Dynamic prerequisites check based on signing_order sequence
export const checkPrerequisites = (
  clearances: ClearanceRecord[],
  currentDeptName: string | undefined,
  isStaff: boolean = false,
): boolean => {
  if (isStaff) return true;
  if (!clearances || clearances.length === 0 || !currentDeptName) return false;

  const currentDeptLower = currentDeptName.trim().toLowerCase();

  const getDeptInfo = (c: ClearanceRecord): { name?: string; order: number } => {
    const template = Array.isArray(c.clearance_templates)
      ? c.clearance_templates[0]
      : c.clearance_templates;

    const department = Array.isArray(template?.departments)
      ? template.departments[0]
      : template?.departments;

    const name = department?.dept_name?.trim().toLowerCase();
    
    // Default fallback order if signing_order is omitted
    const defaultOrder = name?.includes("cashier") ? 1 : name?.includes("registrar") ? 99 : 2;
    const order = department?.signing_order ?? defaultOrder;

    return { name, order };
  };

  // Find current department's sequence order
  const currentRecord = clearances.find((c) => getDeptInfo(c).name === currentDeptLower);
  const currentOrder = currentRecord ? getDeptInfo(currentRecord).order : (currentDeptLower.includes("cashier") ? 1 : currentDeptLower.includes("registrar") ? 99 : 2);

  // Dynamic Rule: All departments with an order strictly LESS than current department must be "Signed"
  for (const c of clearances) {
    const info = getDeptInfo(c);
    if (info.order < currentOrder) {
      if (c.status !== "Signed") {
        return false;
      }
    }
  }

  return true;
};

export default function StudentsClient() {
  const {
    filteredStudents,
    students,
    clearanceId,
    setClearanceId,
    effectiveStatus,
    selectedStudents,
    departmentName,
    activeSectionId,
    viewType,
    prereqStatus,
  } = useDepartmentContext();

  const supabase = useMemo(() => createClient(), []);
  const { data: preset } = useFetchPreset();
  const queryClient = useQueryClient();

  const [student, setStudent] = useState<Students | null>(null);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [taskId, setTaskId] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // --- REALTIME CHECKBOX SYNC FIX ---
  useEffect(() => {
    const channel = supabase
      .channel("clearance-management-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_records" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["staff-clearance"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_tasks" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["staff-clearance"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  const handleStudentChange = (cId: string, checked: CheckedState) => {
    setClearanceId((prev) =>
      checked === true ? [...prev, cId] : prev.filter((id) => id !== cId),
    );
  };

  const displayedStudents = filteredStudents.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.student_name.toLowerCase().includes(query) ||
      student.student_id.toLowerCase().includes(query)
    );
  });

  const progress = useMemo(() => {
    return students.reduce(
      (acc, s) => {
        const status = s.clearance_records?.[0]?.status;
        const taskCount =
          s.clearance_records?.[0]?.clearance_tasks?.length || 0;
        if (status === "Signed") acc.cleared++;
        else if (taskCount > 0) acc.incomplete++;
        else acc.pending++;
        return acc;
      },
      { cleared: 0, pending: 0, incomplete: 0 },
    );
  }, [students]);

  const signableClearanceIds = clearanceId.filter(
    (id) => prereqStatus.get(id) !== false,
  );

  if (!preset) return null;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      {/* TOP SECTION */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90">
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Clearance Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review and sign off on {viewType === 'students' ? 'student' : 'staff'} requirements
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 pb-6">
          <div className="flex w-full max-md:max-w-none max-w-md items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search by name or ${viewType === 'students' ? 'ID' : 'Staff ID'}...`}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-10 text-sm text-slate-800 shadow-2xs transition-colors focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C]/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400"
              />
            </div>
            <FilterButton />
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <SignToggleButton
              clearanceId={signableClearanceIds}
              currentStatus={effectiveStatus}
            />
            <div className="flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
              <AddTask
                preset={preset}
                clearanceId={clearanceId}
                taskId={taskId}
                description={description}
                setDescription={setDescription}
                title={title}
                setTitle={setTitle}
                sectionId={activeSectionId}
              />
              <AddPreset
                preset={preset}
                taskId={taskId}
                setTaskId={setTaskId}
                clearanceId={clearanceId}
                description={description}
                sectionId={activeSectionId}
              />
              <ManagePresetButton preset={preset} />
            </div>
          </div>
        </div>
      </div>

      {/* --- DATA LIST --- */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 dark:bg-slate-950/40">
        <div className="mb-2.5 flex items-center px-4 text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          <div className="w-8">
            <SelectAll
              students={students}
              clearanceId={clearanceId}
              setClearanceId={setClearanceId}
              effectiveStatus={effectiveStatus}
            />
          </div>
          <div className="flex-1">{viewType === 'students' ? 'Student' : 'Staff'}</div>
          <div className="hidden md:block w-36 lg:w-48">Clearance Status</div>
          <div className="hidden md:block w-28 lg:w-48">Tasks</div>
          <div className="hidden md:block w-10"></div>
        </div>

        <div className="flex flex-col gap-2">
          {displayedStudents.length > 0 ? (
            displayedStudents.map((student) => {
              const cId = student.clearance_records?.[0]?.clearance_id;
              const dbStatus = student.clearance_records?.[0]?.status;
              const taskCount =
                student.clearance_records?.[0]?.clearance_tasks?.length || 0;
              const isLocked = prereqStatus.get(cId) === false;

              let displayStatus = dbStatus;
              let statusStyles = "";

              if (isLocked && dbStatus !== "Signed") {
                displayStatus = "Awaiting Prerequisite";
                statusStyles =
                  "border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
              } else if (
                dbStatus !== "Signed" &&
                dbStatus !== "Flagged" &&
                taskCount > 0
              ) {
                displayStatus = "Incomplete";
                statusStyles =
                  "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";
              } else if (dbStatus === "Pending") {
                statusStyles =
                  "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300";
              } else if (dbStatus === "Signed") {
                statusStyles =
                  "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300";
              }

              const isSelectedGroupSigned = effectiveStatus === "Signed";
              const isThisStudentSigned = dbStatus === "Signed";
              const isDisabled =
                selectedStudents.length > 0 &&
                isSelectedGroupSigned !== isThisStudentSigned;

              return (
                <div
                  key={student.student_id}
                  onClick={() => { setStudent(student); setTaskPanelOpen(true); }}
                  className="group grid grid-cols-[2rem_minmax(0,1fr)] gap-y-3 md:flex cursor-pointer items-center rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                >
                  <div className="w-8" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      className={`${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} mr-2`}
                      disabled={isDisabled}
                      aria-label={`Select ${student.student_name}`}
                      checked={clearanceId.includes(cId)}
                      onCheckedChange={(checked) =>
                        handleStudentChange(cId, checked)
                      }
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isLocked ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" : "bg-[#0B192C] text-amber-400 dark:bg-amber-950/40 dark:text-amber-300 dark:border dark:border-amber-800/50"}`}
                    >
                      {student.student_name[0]}
                    </div>
                    <div className="min-w-0 break-words">
                      <h3
                        className={`text-sm font-bold ${isLocked ? "text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}
                      >
                        {student.student_name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {student.student_id}
                      </p>
                    </div>
                  </div>

                  <div className="col-start-2 min-w-0 md:w-36 lg:w-48 md:shrink-0">
                    <span
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles}`}
                    >
                      {isLocked && <Lock size={12} />}
                      {displayStatus}
                    </span>
                  </div>

                  <div className="col-start-2 min-w-0 md:w-28 lg:w-48 md:shrink-0">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      {taskCount !== 0 ? (
                        <>
                          <ClipboardList className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <span className="truncate">{taskCount}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">
                          No active tasks
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-start-2 flex justify-end md:w-10 md:shrink-0">
                    <button
                      aria-label={`View tasks for ${student.student_name}`}
                      className="rounded-lg p-2 text-slate-400 md:opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      onClick={(e) => { e.stopPropagation(); setStudent(student); setTaskPanelOpen(true); }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <Search className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p>{`No students found matching ${searchQuery}`}</p>
            </div>
          )}
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Section Progress
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm font-medium">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold dark:bg-emerald-950/60 dark:text-emerald-300">
              {progress.cleared}
            </div>
            Cleared
          </div>
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold dark:bg-amber-950/60 dark:text-amber-300">
              {progress.pending}
            </div>
            Pending
          </div>
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold dark:bg-blue-950/60 dark:text-blue-300">
              {progress.incomplete}
            </div>
            Incomplete
          </div>
        </div>
      </footer>

      {/* Keep the selected content available while Dialog plays its exit. */}
      <Dialog open={taskPanelOpen} onOpenChange={setTaskPanelOpen}>
        <DialogContent showCloseButton={false} aria-describedby={undefined} className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-dvh w-[480px] max-w-full sm:max-w-[480px] rounded-none p-0 gap-0 flex flex-col overflow-hidden data-[state=open]:slide-in-from-bottom-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <DialogTitle className="sr-only">Tasks for {student?.student_name}</DialogTitle>
          {student && <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <TaskView
              studentTasks={student.clearance_records[0].clearance_tasks}
              studentId={student.student_id}
              studentName={student.student_name}
              currentDepartment={departmentName}
              viewType={viewType}
              onBack={() => setTaskPanelOpen(false)}
            />
          </div>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
