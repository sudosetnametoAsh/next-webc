export interface DepartmentProgress {
  clearance_id: number;
  dept_name: string;
  status: "Signed" | "Pending" | "Incomplete";
  signed_at?: string | null;
  tier: number;
  icon_name?: string | null;
}
