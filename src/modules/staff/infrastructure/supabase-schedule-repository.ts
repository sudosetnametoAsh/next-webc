// import { createClient } from "@/lib/db/supabase-config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { DatabaseError } from "../application/error";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  getSchedulePromise,
  ScheduleRepository,
} from "../application/repository/schedule-repository";
import { staffs } from "@/lib/db/schema";

// const supabase = createClient();
export class SupabaseStaffRepository implements ScheduleRepository {
  constructor(private supabase: SupabaseClient) {}

  async getSchedule(id: string): Promise<getSchedulePromise> {
    try {
      const result = await db
        .select({
          time_in: staffs.timeIn,
          time_out: staffs.timeOut,
        })
        .from(staffs)
        .where(eq(staffs.staffId, id))
        .limit(1);

      const data = result[0];

      if (!data) {
        throw new DatabaseError("Failed to fetch schedule");
      }

      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;

      console.error("Unexpected error:", error);
      throw new DatabaseError("An unexpected error occured");
    }
  }

  async setSchedule(
    id: string,
    time_in: string,
    time_out: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("staffs")
        .update({ time_in: time_in, time_out: time_out })
        .eq("staff_id", id);

      if (error) {
        console.error("Supabase Error:", error);
        throw new DatabaseError("Failed to update schedule");
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error;

      console.error("Unexpected error:", error);
      throw new DatabaseError("An unexpected error occured");
    }
  }
}
