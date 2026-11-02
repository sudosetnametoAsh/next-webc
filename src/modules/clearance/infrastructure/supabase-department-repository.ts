import { SupabaseClient } from "@supabase/supabase-js";
import {
  DepartmentRepository,
  getDepartmentDetailsPromise,
} from "../application/repository/department-repository";

export class SupabaseDepartmentRepository implements DepartmentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getDepartmentDetails(
    staff_id: string,
    clearance_id?: number,
  ): Promise<getDepartmentDetailsPromise> {
    let query = this.supabase
      .from("clearance_tasks")
      .select(
        "assigned_task_id, clearance_id, title, description, status, assigned_at, dropbox, uploaded_at, comments, due_date, ai_audit_report",
      );

    if (clearance_id) {
      query = query.eq("clearance_id", clearance_id);
    } else {
      query = query.eq("staff_id", staff_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      throw new Error("An error occurred fetching tasks");
    }

    return data;
  }
}
