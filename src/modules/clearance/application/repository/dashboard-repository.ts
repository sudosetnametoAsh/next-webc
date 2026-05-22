
export type getClearanceRecordsPromise = {
    clearance_id: number;
    department: string;
    status: string;
    staff: string;
    staff_id: string;
    task_count: number;
    cleared_task: number;
    time_in: string | null;
    time_out: string | null;
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
  title: string;
  description: string;
  status: string | null;
  assigned_at: string | null;
  uploaded_at: string | null;
  comments: string | null;
  dropbox: string | null;
  department: string;
}[];

export type getOfficeHoursPromise = {
    dept_id: number;
    dept_name: string;
    staff_name: string | null;
    time_in: string | null;
    time_out: string | null;
}[]

export interface DashBoardRepository {
    getSummary(userId?: string): Promise<getSummaryPromise>;
    getClearanceRecords(userId?: string): Promise<getClearanceRecordsPromise>;
    getDepartmentDetails(userId?: string): Promise<getDepartmentDetailsPromise>;
    getOfficeHours(userId?: string) : Promise<getOfficeHoursPromise>
}
