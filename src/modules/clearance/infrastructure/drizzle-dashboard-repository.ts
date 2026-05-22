import { DrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client";
import {
  DashBoardRepository,
  getClearanceRecordsPromise,
  getDepartmentDetailsPromise,
  getOfficeHoursPromise,
  getSummaryPromise,
} from "../application/repository/dashboard-repository";
import {
  clearanceDepartments,
  clearanceRecords,
  clearanceTasks,
  clearanceTemplates,
  staffs,
} from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export class DrizzleDashBoardRepository implements DashBoardRepository {
  constructor(private readonly drizzle: DrizzleSupabaseClient) {}

  async getClearanceRecords(userId?: string): Promise<getClearanceRecordsPromise> {
    const response = await this.drizzle.rls((tx) => {
      const query = tx
        .select({
          clearance_id: clearanceRecords.clearanceId,
          staff_id: clearanceTemplates.staffId,
          staff: staffs.staffName,
          status: clearanceRecords.status,
          department: clearanceDepartments.deptName,
          task_count: sql<number>`count(${clearanceTasks.assignedTaskId})::int`,
          cleared_task: sql<number>`COUNT(*) FILTER (WHERE ${clearanceTasks.status} IN ('Cleared', 'Flagged'))::int`,
          time_in: staffs.timeIn,
          time_out: staffs.timeOut,
        })
        .from(clearanceRecords)
        .innerJoin(
          clearanceTemplates,
          eq(clearanceRecords.templateId, clearanceTemplates.templateId),
        )
        .innerJoin(
          clearanceDepartments,
          eq(clearanceTemplates.deptId, clearanceDepartments.deptId),
        )
        .innerJoin(staffs, eq(clearanceTemplates.staffId, staffs.staffId))
        .leftJoin(
          clearanceTasks,
          eq(clearanceRecords.clearanceId, clearanceTasks.clearanceId),
        );

      if (userId) {
        query.where(eq(clearanceRecords.userId, userId));
      }

      return query.groupBy(
        staffs.staffName,
        staffs.timeIn,
        staffs.timeOut,
        clearanceDepartments.deptName,
        clearanceRecords.clearanceId,
        clearanceTemplates.staffId,
      );
    });

    return response;
  }

  async getSummary(userId?: string): Promise<getSummaryPromise> {
    const response = await this.drizzle.rls((tx) => {
      const query = tx
        .select({
          signed: sql<number>`count(*) filter (where ${clearanceRecords.status} = 'Signed')::int`,
          incomplete: sql<number>`count(*) filter (where ${clearanceRecords.status} = 'Incomplete')::int`,
          pending: sql<number>`count(*) filter (where ${clearanceRecords.status} = 'Pending')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(clearanceRecords);

      if (userId) {
        query.where(eq(clearanceRecords.userId, userId));
      }

      return query;
    });

    const result = response[0];

    return {
      signed: result.signed,
      incomplete: result.incomplete,
      pending: result.pending,
      department_count: result.total,
      cleared_department: result.signed,
      remaining_department: result.incomplete + result.pending,
    };
  }

  async getDepartmentDetails(userId?: string): Promise<getDepartmentDetailsPromise> {
    const response = await this.drizzle.rls((tx) => {
      const query = tx
        .select({
          assigned_task_id: clearanceTasks.assignedTaskId,
          title: clearanceTasks.title,
          description: clearanceTasks.description,
          status: clearanceTasks.status,
          assigned_at: clearanceTasks.assignedAt,
          uploaded_at: clearanceTasks.uploadedAt,
          comments: clearanceTasks.comments,
          dropbox: clearanceTasks.dropbox,
          department: clearanceDepartments.deptName,
        })
        .from(clearanceTasks)
        .innerJoin(
          clearanceRecords,
          eq(clearanceTasks.clearanceId, clearanceRecords.clearanceId),
        )
        .innerJoin(
          clearanceTemplates,
          eq(clearanceRecords.templateId, clearanceTemplates.templateId),
        )
        .innerJoin(
          clearanceDepartments,
          eq(clearanceTemplates.deptId, clearanceDepartments.deptId),
        );

      if (userId) {
        query.where(eq(clearanceRecords.userId, userId));
      }

      return query;
    });

    return response;
  }

  async getOfficeHours(userId?: string): Promise<getOfficeHoursPromise> {
    const response = await this.drizzle.rls((tx) => {
      const query = tx
        .select({
          dept_id: clearanceDepartments.deptId,
          dept_name: clearanceDepartments.deptName,
          staff_name: staffs.staffName,
          time_in: staffs.timeIn,
          time_out: staffs.timeOut,
        })
        .from(clearanceRecords)
        .innerJoin(
          clearanceTemplates,
          eq(clearanceRecords.templateId, clearanceTemplates.templateId),
        )
        .innerJoin(
          clearanceDepartments,
          eq(clearanceTemplates.deptId, clearanceDepartments.deptId),
        )
        .innerJoin(staffs, eq(clearanceTemplates.staffId, staffs.staffId));

      if (userId) {
        query.where(eq(clearanceRecords.userId, userId));
      }

      return query.groupBy(
        clearanceDepartments.deptId,
        clearanceDepartments.deptName,
        staffs.staffName,
        staffs.timeIn,
        staffs.timeOut,
      );
    });

    return response;
  }
}
