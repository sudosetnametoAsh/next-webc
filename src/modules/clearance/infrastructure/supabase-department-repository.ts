import { SupabaseClient } from "@supabase/supabase-js";
import {
  DepartmentRepository,
  getDepartmentDetailsPromise,
} from "../application/repository/department-repository";

export class SupabaseDepartmentRepository implements DepartmentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getDepartmentDetails(staff_id: string): Promise<getDepartmentDetailsPromise> {
    const { data, error } = await this.supabase
      .from("clearance_tasks")
      .select("assigned_task_id, title, description, status, assigned_at, dropbox, uploaded_at, comments")
      .eq("staff_id",staff_id );

    if (error) {
      console.error("Error fetching tasks:", error);
      throw new Error("An error occured fething tasks");
    }

    return data;
  }
}
