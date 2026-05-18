export type getDepartmentDetailsPromise = {
  assigned_task_id: number;
  title: string;
  description: string;
  status: string | null;
  assigned_at: string | null;
  uploaded_at: string | null;
  comments: string | null;
  dropbox: string | null;
}[];

export interface DepartmentRepository {
  getDepartmentDetails(staff_id: string): Promise<getDepartmentDetailsPromise>;
}
