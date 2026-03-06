// 'use client';
import { useFetchCourses } from "@/hooks/department/fetch-courses";
import { useFethStudents } from "@/hooks/department/fetch-students";
import { DepartmentContextType } from "@/types/department-context";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

const DepartmentContext = createContext<DepartmentContextType | null>(null);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const { data: courses = [] } = useFetchCourses();

  const [courseId, setCourseId] = useState<string | null>(null); // Keeyps track of selected course
  const [sectionId, setSectionId] = useState<string | null>(null); // Keeps trck of selected section
  const [clearanceId, setClearanceId] = useState<string[]>([]); // Manages the selected student (stored via clearance id)

  // filter-button states
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [orderFilter, setOrderFilter] = useState<string>("A-Z");

  const activeCourseId = courseId ?? String(courses[0]?.course_id);
  console.log("course id is: ", activeCourseId);

  const selectedCourse = useMemo(
    () =>
      courses.find((course) => String(course.course_id) === activeCourseId) ??
      courses[0],
    [courses, activeCourseId],
  );

  const activeSectionId =
    sectionId ?? String(selectedCourse.course_sections[0].section_id);

  const { data: students = [], isFetching: fetchingStudents } =
    useFethStudents(activeSectionId); // Hook to fetch students

  const selectedIds = useMemo(() => new Set(clearanceId), [clearanceId]);

  const selectedStudents = useMemo(
    () =>
      students.filter((student) =>
        selectedIds.has(student.student_clearances?.[0].clearance_id),
      ),
    [students, selectedIds],
  );

  const effectiveStatus = useMemo(() => {
    if (selectedStudents.length === 0) return "";

    return selectedStudents.every(
      (s) => s.student_clearances?.[0].status === "Signed",
    )
      ? "Signed"
      : "Pending";
  }, [selectedStudents]);

  const filteredStudents = useMemo(() => {
    const sortViaStatus = students.filter((student) => {
      const studentStatus = student.student_clearances[0].status;
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
