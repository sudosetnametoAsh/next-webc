
export type getClearanceRecordsPromise = {
    clearance_id: number;
    period_id?: number;
    academic_year?: string;
    term?: number;
    department: string;
    status: string;
    staff: string;
    staff_id: string;
    task_count: number;
    cleared_task: number;

    tier?: number;
    icon_name?: string;
    floor?: string | null;
    room?: string | null;
    signed_at?: string | null;
    weekly_schedule?: Record<string, { active: boolean; time_in: string; time_out: string }> | null;
    early_out_date?: string | null;
}[]

export type getSummaryPromise = {
    signed: number;
    incomplete: number;
    pending: number;
    department_count: number;
    cleared_department: number;
    remaining_department: number;
}

export type getDepartmentDetailsPromise = {
  assigned_task_id: number;
  clearance_id?: number | null;
  title: string;
  description: string;
  status: string | null;
  assigned_at: string | null;
  uploaded_at: string | null;
  comments: string | null;
  dropbox: string | null;
  department: string;
  staff?: string | null;
  tier?: number | null;
  icon_name?: string | null;
  floor?: string | null;
  room?: string | null;
  ai_audit_report?: any;
  due_date?: string | null;
}[];

export type getOfficeHoursPromise = {
    dept_id: number;
    dept_name: string;
    staff_name: string | null;

    weekly_schedule?: Record<string, { active: boolean; time_in: string; time_out: string }> | null;
    early_out_date?: string | null;
    floor?: string | null;
    room?: string | null;
    icon_name?: string | null;
    tier?: number | null;
    email?: string | null;
}[]

export type getStudentProfilePromise = {
    student_id: string;
    period_id?: number;
    academic_year?: string;
    student_name: string | null;
    course_name: string | null;
    section_number: number | null;
    year: number | null;
    semester: number | null;
}

export interface DashBoardRepository {
    getSummary(userId?: string): Promise<getSummaryPromise>;
    getClearanceRecords(userId?: string): Promise<getClearanceRecordsPromise>;
    getDepartmentDetails(userId?: string): Promise<getDepartmentDetailsPromise>;
    getOfficeHours(userId?: string) : Promise<getOfficeHoursPromise>;
    getStudentProfile(userId?: string): Promise<getStudentProfilePromise | null>;
}
