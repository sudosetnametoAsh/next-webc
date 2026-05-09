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

type CheckedState = boolean | "indeterminate";

// const checkPrerequisites = (
//   clearances: any[],
//   currentDeptName: string | undefined,
// ): boolean => {
//   if (!clearances || !currentDeptName) return false;
//   const dept = currentDeptName.toLowerCase();

//   const isSigned = (targetDept: string) => {
//     return clearances.some(
//       (c) =>
//         c.clearance_templates?.departments?.dept_name?.toLowerCase() ===
//           targetDept && c.status === "Signed",
//     );
//   };

//   if (dept === "cashier") return true;
//   if (!isSigned("cashier")) return false;

//   if (dept === "registrar") {
//     return clearances.every(
//       (c) =>
//         c.clearance_templates?.departments?.dept_name?.toLowerCase() ===
//           "registrar" || c.status === "Signed",
//     );
//   }

//   return true;
// };

// 1. Define the deepest nested level (departments)
export interface Department {
  dept_name?: string | null;
}

// 2. Define the middle level (clearance_templates)
export interface ClearanceTemplate {
  dept_id?: string | number | null;
  // Supabase returns nested joins as either a single object or an array of objects
  departments?: Department | Department[] | null;
}

// 3. Define the main row (student_clearances)
export interface ClearanceRecord {
  clearance_id?: string;
  student_id?: string;
  status: string; // "Signed", "Pending", etc.
  clearance_templates?: ClearanceTemplate | ClearanceTemplate[] | null;
}

// 4. Update your function to use the new type
export const checkPrerequisites = (
  clearances: ClearanceRecord[],
  currentDeptName: string | undefined,
): boolean => {
  if (!clearances || clearances.length === 0 || !currentDeptName) return false;

  const dept = currentDeptName.toLowerCase();

  // The helper function now has perfect Type Autocomplete!
  const getDeptName = (c: ClearanceRecord): string | undefined => {
    const template = Array.isArray(c.clearance_templates)
      ? c.clearance_templates[0]
      : c.clearance_templates;

    const department = Array.isArray(template?.departments)
      ? template.departments[0]
      : template?.departments;

    return department?.dept_name?.toLowerCase();
  };

  const isSigned = (targetDept: string) => {
    return clearances.some(
      (c) => getDeptName(c) === targetDept && c.status === "Signed",
    );
  };

  if (dept === "cashier") return true;
  if (!isSigned("cashier")) return false;

  if (dept === "registrar") {
    return clearances.every(
      (c) => getDeptName(c) === "registrar" || c.status === "Signed",
    );
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
  } = useDepartmentContext();

  const supabase = createClient();
  const { data: preset } = useFetchPreset();
  const queryClient = useQueryClient();

  const [student, setStudent] = useState<Students | null>(null);
  const [taskId, setTaskId] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prereqStatus, setPrereqStatus] = useState<Map<string, boolean>>(
    new Map(),
  );

  // --- REALTIME CHECKBOX SYNC FIX ---
  // Whenever the students list updates (via Realtime refetch), remove any checked IDs
  // that no longer match the active filter (e.g., a student went from Pending to Signed).
  // --- REALTIME CHECKBOX SYNC FIX ---
  useEffect(() => {
    setClearanceId((prev) => {
      if (prev.length === 0) return prev;

      // Group logically by Signed vs Not Signed
      const isSelectedGroupSigned = effectiveStatus === "Signed";

      const currentValidIds = new Set(
        students
          .filter((s) => {
            const isStudentSigned =
              s.student_clearances?.[0]?.status === "Signed";
            return isStudentSigned === isSelectedGroupSigned;
          })
          .map((s) => s.student_clearances?.[0]?.clearance_id)
          .filter(Boolean),
      );

      const filtered = prev.filter((id) => currentValidIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [students, effectiveStatus, setClearanceId]);

  //   useEffect(() => {
  //     async function fetchPrereqStatus() {
  //       if (students.length === 0) return;
  //       const studentIds = students.map((s) => s.student_id);

  //       const { data: allClearances } = await supabase
  //         .from("student_clearances")
  //         .select(
  //           "clearance_id, student_id, status, clearance_templates(dept_id, departments(dept_name))",
  //         )
  //         .in("student_id", studentIds);

  //       if (!allClearances) return;

  //       const deptMap = new Map<string, string>();
  //       for (const c of allClearances) {
  //         const name =
  //           c.clearance_templates?.departments?.dept_name?.toLowerCase();
  //         if (name) deptMap.set(c.clearance_id, name);
  //       }

  //       const studentClearancesMap = new Map<string, any[]>();
  //       for (const c of allClearances) {
  //         if (!studentClearancesMap.has(c.student_id))
  //           studentClearancesMap.set(c.student_id, []);
  //         studentClearancesMap.get(c.student_id)!.push(c);
  //       }

  //       const newStatus = new Map<string, boolean>();
  //       for (const s of students) {
  //         const cId = s.student_clearances?.[0]?.clearance_id;
  //         if (!cId) continue;
  //         const currentDept = deptMap.get(cId);
  //         const allStudentClearances =
  //           studentClearancesMap.get(s.student_id) || [];
  //         newStatus.set(
  //           cId,
  //           checkPrerequisites(allStudentClearances, currentDept),
  //         );
  //       }
  //       setPrereqStatus(newStatus);
  //     }
  //     fetchPrereqStatus();
  //   }, [students, supabase]);

  useEffect(() => {
    async function fetchPrereqStatus() {
      if (students.length === 0) return;
      const studentIds = students.map((s) => s.student_id);

      const { data: allClearances } = await supabase
        .from("student_clearances")
        .select(
          "clearance_id, student_id, status, clearance_templates(dept_id, departments(dept_name))",
        )
        .in("student_id", studentIds);

      if (!allClearances) return;

      // FIX 1: Extract the exact type that Supabase returned so we don't have to use 'any'
      type ClearanceRecord = NonNullable<typeof allClearances>[number];

      const deptMap = new Map<string, string>();

      for (const c of allClearances) {
        // FIX 2: Safely extract the first item from the nested arrays
        const template = Array.isArray(c.clearance_templates)
          ? c.clearance_templates[0]
          : c.clearance_templates;

        const department = Array.isArray(template?.departments)
          ? template.departments[0]
          : template?.departments;

        const name = department?.dept_name?.toLowerCase();

        if (name) deptMap.set(c.clearance_id, name);
      }

      // FIX 3: Apply the extracted type to our Map
      const studentClearancesMap = new Map<string, ClearanceRecord[]>();

      for (const c of allClearances) {
        if (!studentClearancesMap.has(c.student_id)) {
          studentClearancesMap.set(c.student_id, []);
        }
        studentClearancesMap.get(c.student_id)!.push(c);
      }

      const newStatus = new Map<string, boolean>();
      for (const s of students) {
        const cId = s.student_clearances?.[0]?.clearance_id;
        if (!cId) continue;
        const currentDept = deptMap.get(cId);
        const allStudentClearances =
          studentClearancesMap.get(s.student_id) || [];
        newStatus.set(
          cId,
          checkPrerequisites(allStudentClearances, currentDept),
        );
      }
      setPrereqStatus(newStatus);
    }
    fetchPrereqStatus();
  }, [students, supabase]);
  // Note: if `checkPrerequisites` is defined outside this effect, it might need to be in the dependency array or wrapped in a useCallback.

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    const channel = supabase
      .channel("clearance-management-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_clearances" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["students"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assigned_tasks" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["students"] });
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
        const status = s.student_clearances?.[0]?.status;
        const taskCount =
          s.student_clearances?.[0]?.assigned_tasks?.length || 0;
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
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* TOP SECTION */}
      <div className="border-b border-slate-200 bg-white">
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Clearance Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and sign off on student requirements
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-6">
          <div className="flex w-full max-w-md items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-4 pl-10 text-sm text-slate-700 shadow-sm transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <FilterButton />
          </div>

          <div className="flex items-center gap-3">
            {/*
              NOTE ON LOGGING:
              Pass `logActivity` to SignToggleButton if you can edit it,
              otherwise use a wrapper. Example inside SignToggleButton:
              await logActivity("Sign", `Signed off ${clearanceId.length} students`)
            */}
            <SignToggleButton
              clearanceId={signableClearanceIds}
              currentStatus={effectiveStatus}
            />
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              {/*
                NOTE ON LOGGING:
                Inside AddTask, after a successful task creation, you can call:
                await logActivity("Assign Task", `Assigned "${description}" to ${clearanceId.length} students`)
              */}
              <AddTask
                preset={preset}
                clearanceId={clearanceId}
                taskId={taskId}
                description={description}
                setDescription={setDescription}
                title={title}
                setTitle={setTitle}
              />
              <div className="mx-1 h-4 w-px bg-slate-200"></div>
              <AddPreset
                preset={preset}
                taskId={taskId}
                setTaskId={setTaskId}
                clearanceId={clearanceId}
                description={description}
              />
              <div className="mx-1 h-4 w-px bg-slate-200"></div>
              <ManagePresetButton preset={preset} />
            </div>
          </div>
        </div>
      </div>

      {/* --- DATA LIST --- */}
      <div className="flex-1 overflow-y-auto bg-white p-6">
        <div className="mb-3 flex items-center px-4 text-xs font-bold tracking-wider text-slate-400 uppercase">
          <div className="w-8">
            <SelectAll
              students={students}
              clearanceId={clearanceId}
              setClearanceId={setClearanceId}
              effectiveStatus={effectiveStatus}
            />
          </div>
          <div className="flex-1">Student Info</div>
          <div className="w-48">Clearance Status</div>
          <div className="w-48">Active Tasks</div>
          <div className="w-10"></div>
        </div>

        <div className="flex flex-col gap-2">
          {displayedStudents.length > 0 ? (
            displayedStudents.map((student) => {
              const cId = student.student_clearances?.[0]?.clearance_id;
              const dbStatus = student.student_clearances?.[0]?.status;
              const taskCount =
                student.student_clearances?.[0]?.assigned_tasks?.length || 0;
              const isLocked = prereqStatus.get(cId) === false;

              let displayStatus = dbStatus;
              let statusStyles = "";

              if (isLocked && dbStatus !== "Signed") {
                displayStatus = "Awaiting Prerequisite";
                statusStyles =
                  "border border-slate-200/50 bg-slate-50 text-slate-500";
              } else if (
                dbStatus !== "Signed" &&
                dbStatus !== "Flagged" &&
                taskCount > 0
              ) {
                displayStatus = "Incomplete";
                statusStyles =
                  "border border-blue-200/50 bg-blue-50 text-blue-700";
              } else if (dbStatus === "Pending") {
                statusStyles =
                  "border border-amber-200/50 bg-amber-50 text-amber-700";
              } else if (dbStatus === "Signed") {
                statusStyles =
                  "border border-emerald-200/50 bg-emerald-50 text-emerald-700";
              }

              // const isDisabled =
              //   dbStatus !== effectiveStatus && selectedStudents.length !== 0;
              const isSelectedGroupSigned = effectiveStatus === "Signed";
              const isThisStudentSigned = dbStatus === "Signed";
              const isDisabled =
                selectedStudents.length > 0 &&
                isSelectedGroupSigned !== isThisStudentSigned;

              return (
                <div
                  key={student.student_id}
                  onClick={() => setStudent(student)}
                  className="group flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="w-8" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      className={`${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} mr-2`}
                      disabled={isDisabled}
                      checked={clearanceId.includes(cId)}
                      onCheckedChange={(checked) =>
                        handleStudentChange(cId, checked)
                      }
                    />
                  </div>

                  <div className="flex flex-1 items-center gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-slate-200 text-sm font-bold shadow-inner ${isLocked ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-[#0b5793]"}`}
                    >
                      {student.student_name[0]}
                    </div>
                    <div>
                      <h3
                        className={`font-semibold ${isLocked ? "text-slate-500" : "text-slate-900"}`}
                      >
                        {student.student_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {student.student_id}
                      </p>
                    </div>
                  </div>

                  <div className="w-48">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles}`}
                    >
                      {isLocked && <Lock size={12} />}
                      {displayStatus}
                    </span>
                  </div>

                  <div className="w-48">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      {taskCount !== 0 ? (
                        <>
                          <ClipboardList className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{taskCount}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">
                          No active tasks
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex w-10 justify-end">
                    <button
                      className="rounded-lg p-2 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Search className="mb-3 h-8 w-8 text-slate-300" />
              <p>{`No students found matching ${searchQuery}`}</p>
            </div>
          )}
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-8 py-4">
        <div className="text-sm font-semibold text-slate-600">
          Section Progress
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="flex items-center gap-2 text-emerald-700">
            <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold">
              {progress.cleared}
            </div>
            Cleared
          </div>
          <div className="flex items-center gap-2 text-amber-700">
            <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold">
              {progress.pending}
            </div>
            Pending
          </div>
          <div className="flex items-center gap-2 text-blue-700">
            <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold">
              {progress.incomplete}
            </div>
            Incomplete
          </div>
        </div>
      </footer>

      {/* Slide-out Sidebar for Tasks */}
      {student !== null && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setStudent(null)}
          />
          <div className="fixed top-0 right-0 z-50 flex h-full flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex-1 overflow-y-auto">
              <TaskView
                studentTasks={student.student_clearances[0].assigned_tasks}
                studentId={student.student_id}
                studentName={student.student_name}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
