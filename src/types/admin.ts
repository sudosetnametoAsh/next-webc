export type AdminStats = {
  totalStudents: number;
  totalStaff?: number;
  totalClients?: number;
  signed: number;
  incomplete: number;
  pending: number;
  totalNonCleared: number;
  averageCompletion: number;
}

export type Courses = {
  course_id: number;
  course_name: string;
  course_sections?: {
    section_id: number;
    section_number: number;
    year: number;
    semester: number;
  }[];
}

export type Departments = {
  dept_id: number;
  dept_name: string;
  icon_name?: string;
  floor?: string | null;
  room?: string | null;
}

export type DepartmentClearanceDetail = {
  clearance_id?: number;
  dept_id?: number;
  dept_name: string;
  icon_name?: string | null;
  floor?: string | null;
  room?: string | null;
  status: 'Incomplete' | 'Pending' | 'Signed';
  signed_at?: string | null;
  created_at?: string | null;
  staff_name?: string | null;
  tier?: number;
}

export type Staff = {
  staff_id: string;
  staff_name: string;
  email?: string | null;
  overallStatus?: 'Incomplete' | 'Pending' | 'Signed';
  total_departments?: number;
  signed_departments?: number;
  pending_departments?: Departments[];
  departments?: DepartmentClearanceDetail[];
  isOverdue?: boolean;
  overduePhase?: number | null;
  overduePhaseLabel?: string | null;
  dwellHours?: number;
}

export type StaffAssignment = {
  dept_id: number;
  dept_name: string;
  staff_id: string | null;
  staff_name: string | null;
  tier?: number;
  icon_name?: string;
}

export type DepartmentTag = {
  dept_id: number;
  dept_name: string;
  staff_name: string | null;
  tier?: number;
  icon_name?: string;
}

export type CourseTemplateStats = {
  course_id: number | null;
  course_name: string;
  completion_rate: number;
  students_enrolled: number;
  departments: DepartmentTag[];
  updated_at: string | null;
}

export type StudentTemplates = {
  student_id: number | string;
  student_name: string;
  course_id?: number;
  course_name: string;
  course_year: number;
  section_number?: number | string;
  semester?: number;
  section_id?: number | string;
  overallStatus: 'Incomplete' | 'Pending' | 'Signed';
  pending_departments: Departments[];
  progress?: number;
  total_departments?: number;
  signed_departments?: number;
  departments?: DepartmentClearanceDetail[];
  isOverdue?: boolean;
  overduePhase?: number | null;
  overduePhaseLabel?: string | null;
  dwellHours?: number;
}

// export type AdminStudentListItem = {
//   student_id: string;
//   student_name: string;
//   course_name: string;
//   section: string;
//   clearance_status: 'Cleared' | 'Incomplete' | 'Pending';
// }

// export type AdminStudentListResponse = {
//   students: AdminStudentListItem[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }
