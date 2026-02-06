export type AdminStats = {
  totalStudents: number;
  signed: number;
  incomplete: number;
  pending: number;
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