export type AdminStats = {
  totalStudents: number;
  signed: number;
  incomplete: number;
  pending: number;
  totalNonCleared: number;
  averageCompletion: number;
}

export type Courses = {
  course_id: number;
  course_name: string;
}

export type Departments = {
  dept_id: number;
  dept_name: string;
}

export type Staff = {
  staff_id: string;
  staff_name: string;
}

export type StaffAssignment = {
  dept_id: number;
  dept_name: string;
  staff_id: string | null;
  staff_name: string | null;
}

export type DepartmentTag = {
  dept_id: number;
  dept_name: string;
  staff_name: string | null;
}

export type CourseTemplateStats = {
  course_id: number;
  course_name: string;
  completion_rate: number;
  students_enrolled: number;
  departments: DepartmentTag[];
  updated_at: string | null;
}

export type StudentTemplates = {
  student_id: number;
  student_name: string;
  course_name: string;
  course_year: number;
  overallStatus: 'Incomplete' | 'Pending';
  pending_departments: Departments[];
  progress: number;
}

export type AdminStudentListItem = {
  student_id: string;
  student_name: string;
  course_name: string;
  section: string;
  clearance_status: 'Cleared' | 'Incomplete' | 'Pending';
}

export type AdminStudentListResponse = {
  students: AdminStudentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}