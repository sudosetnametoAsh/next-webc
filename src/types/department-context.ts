import { Dispatch, SetStateAction } from 'react';
import { Courses } from './courses';
import { Students } from './students';

export type DepartmentContextType = {
   courses: Courses[];
   students: Students[];
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
};
