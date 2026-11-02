export type getDepartmentDetailsPromise = {
  assigned_task_id: number;
  clearance_id?: number | null;
  department?: string;
  title: string;
  description: string;
  status: string | null;
  assigned_at: string | null;
  uploaded_at: string | null;
  due_date?: string | null;
  comments: string | null;
  dropbox: string | null;
  ai_audit_report?: any;
}[];

export interface DepartmentRepository {
  getDepartmentDetails(staff_id: string, clearance_id?: number): Promise<getDepartmentDetailsPromise>;
}
