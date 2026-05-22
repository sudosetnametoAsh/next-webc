import { Dispatch, SetStateAction } from 'react';
import { Courses } from './courses';
import { Students } from './students';

export type DepartmentContextType = {
   courses: Courses[];
   students: Students[];
   filteredStudents: Students[];
   fetchingStudents: boolean;
   courseId: string | null;
   setCourseId: Dispatch<SetStateAction<string | null>>;
   sectionId: string | null;
   setSectionId: Dispatch<SetStateAction<string | null>>;
   activeCourseId: string;
   selectedCourse: Courses;
   activeSectionId: string;
   clearanceId: string[];
   setClearanceId: Dispatch<SetStateAction<string[]>>;
   selectedStudents: Students[];
   effectiveStatus: string;
   statusFilter: string;
   setStatusFilter: Dispatch<SetStateAction<string>>;
   orderFilter: string;
   setOrderFilter: Dispatch<SetStateAction<string>>;
   departmentName?: string;
};
