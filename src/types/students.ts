export type Students = {
  student_id: string;
  student_name: string;
  clearance_records: ClearanceRecord[];
};

type ClearanceRecord = {
  clearance_id: string;
  status: string;
  clearance_tasks: ClearanceTask[]
};

type ClearanceTask = {
    description: string;
    assigned_task_id: number;
    dropbox: string;
    status: "Pending" | "Flagged" | "Cleared" | "Submitted";
    assigned_at: string;
    title:string;
}
