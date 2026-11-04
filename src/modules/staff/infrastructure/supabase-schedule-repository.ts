// import { createClient } from "@/lib/db/supabase-config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { DatabaseError } from "../application/error";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  getSchedulePromise,
  ScheduleRepository,
  WeeklySchedule,
} from "../application/repository/schedule-repository";
import { staffs } from "@/lib/db/schema";

// const supabase = createClient();
export class SupabaseStaffRepository implements ScheduleRepository {
  constructor(private supabase: SupabaseClient) {}

  async getSchedule(id: string): Promise<getSchedulePromise> {
    try {
      const result = await db
        .select({
          weekly_schedule: staffs.weeklySchedule,
          early_out_date: staffs.earlyOutDate,
        })
        .from(staffs)
        .where(eq(staffs.staffId, id))
        .limit(1);

      const data = result[0];

      if (!data) {
        return { weekly_schedule: null, early_out_date: null };
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
    name?: string,
    weekly_schedule?: WeeklySchedule | null,
    early_out_date?: string | null,
  ): Promise<void> {
    try {
      await db
        .insert(staffs)
        .values({
          staffId: id,
          staffName: name || "Unknown Staff",
          weeklySchedule: weekly_schedule || null,
          earlyOutDate: early_out_date !== undefined ? early_out_date : null,
        })
        .onConflictDoUpdate({
          target: staffs.staffId,
          set: {
            ...(name ? { staffName: name } : {}),
            ...(weekly_schedule !== undefined ? { weeklySchedule: weekly_schedule } : {}),
            ...(early_out_date !== undefined ? { earlyOutDate: early_out_date } : {}),
          },
        });
    } catch (error) {
      console.error("Drizzle Error:", error);
      throw new DatabaseError("Failed to update schedule");
    }
  }
}
