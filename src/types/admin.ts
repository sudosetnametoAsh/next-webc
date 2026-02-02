export type AdminStats = {
  totalStudents: number;
  signed: number;
  incomplete: number;
  pending: number;
}

export type Courses = {
  course_id: string;
  course_name: string;
}

export type Departments = {
  dept_id: string;
  dept_name: string;
}

export type Staff = {
  staff_id: string;
  staff_name: string;
}