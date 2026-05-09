export type Students = {
  student_id: string;
  student_name: string;
  student_clearances: Clearance[];
};

type Clearance = {
  clearance_id: string;
  status: string;
  assigned_tasks: Tasks[]
};

type Tasks = {
    description: string;
    assigned_task_id: number;
    dropbox: string;
    status: "Pending" | "Flagged" | "Cleared" | "Submitted";
    assigned_at: string;
    title:string;
}
