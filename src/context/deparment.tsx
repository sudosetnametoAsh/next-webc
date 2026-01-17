// 'use client';
import { useFetchCourses } from '@/hooks/department/fetch-courses';
import { useFethStudents } from '@/hooks/department/fetch-students';
import { DepartmentContextType } from '@/types/department-context';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

const DepartmentContext = createContext<DepartmentContextType | null>(null);

export function DepartmentProvider({ children }: { children: ReactNode }) {
   const { data: courses = [] } = useFetchCourses();

   const [courseId, setCourseId] = useState<string | null>(null); // Keeyps track of selected course
   const [sectionId, setSectionId] = useState<string | null>(null); // Keeps trck of selected section
   const [clearanceId, setClearanceId] = useState<string[]>([]); // Manages the selected student (stored via clearance id)

   const activeCourseId = courseId ?? String(courses[0]?.course_id);
   const selectedCourse = useMemo(
      () =>
         courses.find(
            (course) => String(course.course_id) === activeCourseId,
         ) ?? courses[0],
      [courses, activeCourseId],
   );

   const activeSectionId =
      sectionId ?? String(selectedCourse.course_sections[0].section_id);

   const { data: students = [], isFetching: fetchingStudents } =
      useFethStudents(activeSectionId); // Hook to fetch

   const selectedIds = useMemo(() => new Set(clearanceId), [clearanceId]);

   const selectedStudents = useMemo(
      () =>
         students.filter((student) =>
            selectedIds.has(student.student_clearances?.[0].clearance_id),
         ),
      [students, selectedIds],
   );

   const effectiveStatus = useMemo(() => {
      if (selectedStudents.length === 0) return '';

      return selectedStudents.every(
         (s) => s.student_clearances?.[0].status === 'Signed',
      )
         ? 'Signed'
         : 'Pending';
   }, [selectedStudents]);

   const value = {
      courses,
      students,
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
