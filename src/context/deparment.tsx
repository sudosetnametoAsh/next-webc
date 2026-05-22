'use client';
import { useFetchCourses } from "@/hooks/department/fetch-courses";
import { useFetchClients } from "@/hooks/department/fetch-clients";
import { useFetchStaff } from "@/hooks/department/fetch-staff";
import { DepartmentContextType } from "@/types/department-context";
import { createContext, ReactNode, useContext, useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/db/supabase-client";

const DepartmentContext = createContext<DepartmentContextType | null>(null);

export function DepartmentProvider({ children, departmentName, userId }: { children: ReactNode; departmentName?: string; userId?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { data: courses = [] } = useFetchCourses();

  const [viewType, setViewType] = useState<'students' | 'staff'>('students');
  const [courseId, setCourseId] = useState<string | null>(null); // Keeyps track of selected course
  const [sectionId, setSectionId] = useState<string | null>(null); // Keeps trck of selected section
  const [clearanceId, setClearanceId] = useState<string[]>([]); // Manages the selected student (stored via clearance id)

  // filter-button states
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [orderFilter, setOrderFilter] = useState<string>("A-Z");

  const [prereqStatus, setPrereqStatus] = useState<Map<string, boolean>>(new Map());

  const activeCourseId = courseId ?? (courses?.[0]?.course_id ? String(courses[0].course_id) : null);

  const selectedCourse = useMemo(
    () =>
      courses?.find((course) => String(course.course_id) === activeCourseId) ??
      courses?.[0],
    [courses, activeCourseId],
  );

  const activeSectionId =
    sectionId ?? (selectedCourse?.course_sections?.[0]?.section_id ? String(selectedCourse.course_sections[0].section_id) : "");

  const { data: studentsData = [], isFetching: fetchingStudentsList } =
    useFetchClients(activeSectionId); // Hook to fetch students

  const { data: staffData = [], isFetching: fetchingStaffList } =
    useFetchStaff(); // Hook to fetch staff

  const students = useMemo(() => {
    return viewType === 'students' ? studentsData : staffData;
  }, [viewType, studentsData, staffData]);

  const fetchingStudents = viewType === 'students' ? fetchingStudentsList : fetchingStaffList;

  const hasStaffTemplates = useMemo(() => staffData.length > 0, [staffData]);

  // --- Prerequisite Status Logic ---
  useEffect(() => {
    async function fetchPrereqStatus() {
      if (students.length === 0) return;

      if (viewType === "staff") {
        const newStatus = new Map<string, boolean>();
        for (const s of students) {
          const cId = s.clearance_records?.[0]?.clearance_id;
          if (cId) newStatus.set(cId, true);
        }
        setPrereqStatus(newStatus);
        return;
      }

      const studentIds = students.map((s) => s.student_id);

      const { data: allClearances } = await supabase
        .from("clearance_records")
        .select(
          "clearance_id, student_id:user_id, status, clearance_templates(dept_id, departments:clearance_departments(dept_name))",
        )
        .in("user_id", studentIds);

      if (!allClearances) return;

      const studentClearancesMap = new Map<string, any[]>();
      const cIdToDeptMap = new Map<string, string>();

      for (const c of allClearances) {
        if (!studentClearancesMap.has(c.student_id)) {
          studentClearancesMap.set(c.student_id, []);
        }
        studentClearancesMap.get(c.student_id)!.push(c);

        const template = Array.isArray(c.clearance_templates) ? c.clearance_templates[0] : c.clearance_templates;
        const department = Array.isArray(template?.departments) ? template.departments[0] : template?.departments;
        const name = department?.dept_name;
        if (name) cIdToDeptMap.set(c.clearance_id, name);
      }

      const newStatus = new Map<string, boolean>();
      for (const s of students) {
        const cId = s.clearance_records?.[0]?.clearance_id;
        if (!cId) continue;

        const currentDept = cIdToDeptMap.get(cId)?.toLowerCase();
        const allStudentClearances = studentClearancesMap.get(s.student_id) || [];

        const isSigned = (deptName: string) => 
          allStudentClearances.some(c => {
            const t = Array.isArray(c.clearance_templates) ? c.clearance_templates[0] : c.clearance_templates;
            const d = Array.isArray(t?.departments) ? t.departments[0] : t?.departments;
            return d?.dept_name?.toLowerCase() === deptName.toLowerCase() && c.status === "Signed";
          });

        let eligible = true;
        if (currentDept === "cashier") {
          eligible = true;
        } else if (currentDept === "registrar") {
          eligible = allStudentClearances.every(c => {
            const t = Array.isArray(c.clearance_templates) ? c.clearance_templates[0] : c.clearance_templates;
            const d = Array.isArray(t?.departments) ? t.departments[0] : t?.departments;
            return d?.dept_name?.toLowerCase() === "registrar" || c.status === "Signed";
          });
        } else {
          eligible = isSigned("cashier");
        }

        newStatus.set(cId, eligible);
      }
      setPrereqStatus(newStatus);
    }
    fetchPrereqStatus();
  }, [students, supabase, viewType]);

  // --- Sync Notifications to DB ---
  useEffect(() => {
    if (!userId || students.length === 0 || viewType !== 'students') return;

    async function syncNotifications() {
      const eligibleStudents = students.filter((s) => {
        const cId = s.clearance_records?.[0]?.clearance_id;
        const status = s.clearance_records?.[0]?.status;
        return cId && status === "Pending" && prereqStatus.get(cId) === true;
      });

      for (const s of eligibleStudents) {
        const cId = s.clearance_records[0].clearance_id;
        const refUrl = `/department/students?clearanceId=${cId}`;
        
        // Check if notification already exists
        const { data: existing } = await supabase
          .from("notifications")
          .select("notif_id")
          .eq("user_id", userId)
          .eq("ref_url", refUrl)
          .maybeSingle();

        if (!existing) {
          const sId = activeSectionId ? Number(activeSectionId) : null;
          const cIdNum = activeCourseId ? Number(activeCourseId) : null;

          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Ready for Signing",
            description: `${s.student_name} (${s.student_id}) has met all prerequisites.`,
            type: "Info",
            ref_url: refUrl,
            section_id: (sId !== null && !isNaN(sId)) ? sId : null,
            course_id: (cIdNum !== null && !isNaN(cIdNum)) ? cIdNum : null,
          });
        }
      }
    }

    syncNotifications();
  }, [students, prereqStatus, userId, viewType, supabase, activeSectionId, activeCourseId]);

  const selectedIds = useMemo(() => new Set(clearanceId), [clearanceId]);

  const selectedStudents = useMemo(
    () =>
      students.filter((student) =>
        selectedIds.has(student.clearance_records?.[0].clearance_id),
      ),
    [students, selectedIds],
  );

  const effectiveStatus = useMemo(() => {
    if (selectedStudents.length === 0) return "";

    return selectedStudents.every(
      (s) => s.clearance_records?.[0].status === "Signed",
    )
      ? "Signed"
      : "Pending";
  }, [selectedStudents]);

  const filteredStudents = useMemo(() => {
    const sortViaStatus = students.filter((student) => {
      const studentStatus = student.clearance_records?.[0]?.status;
      const matchesStatus =
        statusFilter === "All" || studentStatus === statusFilter;

      return matchesStatus;
    });

    const sortViaOrder = [...sortViaStatus].sort((a, b) => {
      const nameA = a.student_name;
      const nameB = b.student_name;
      if (orderFilter === "A-Z") {
        return nameA.localeCompare(nameB, undefined, {
          sensitivity: "base",
          numeric: true,
        });
      }
      return nameB.localeCompare(nameA, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    });

    return sortViaOrder;
  }, [students, statusFilter, orderFilter]);

  const eligibleCount = useMemo(() => {
    return students.filter((s) => {
      const cId = s.clearance_records?.[0]?.clearance_id;
      const status = s.clearance_records?.[0]?.status;
      return cId && status === "Pending" && prereqStatus.get(cId) === true;
    }).length;
  }, [students, prereqStatus]);

  const sectionEligibleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (activeSectionId) {
      counts[activeSectionId] = eligibleCount;
    }
    return counts;
  }, [activeSectionId, eligibleCount]);

  const value = {
    courses,
    students,
    filteredStudents,
    fetchingStudents,
    courseId,
    setCourseId,
    sectionId,
    setSectionId,
    activeCourseId,
    selectedCourse,
    activeSectionId,
    clearanceId,
    setClearanceId,
    selectedStudents,
    effectiveStatus,
    statusFilter,
    setStatusFilter,
    orderFilter,
    setOrderFilter,
    departmentName,
    userId,
    viewType,
    setViewType,
    prereqStatus,
    eligibleCount,
    sectionEligibleCounts,
    hasStaffTemplates,
  };
  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartmentContext() {
  const context = useContext(DepartmentContext);

  if (!context) {
    throw new Error('Context is only usable within the "Department"');
  }

  return context;
}
