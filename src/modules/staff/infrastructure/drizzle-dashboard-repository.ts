import {  and, desc, eq, isNotNull, sql } from "drizzle-orm";

import {
  DashboardRepository,
  getRecentActivityPromise,
  getRecentSubmissionsPromise,
} from "../application/repository/dashboard-repository";

import {
  clearanceLogs,
  clearanceTasks,
  clearanceTemplates,
  courses,
  staffs,
  clearanceRecords,
  students,
} from "@/lib/db/schema";

import { db } from "@/lib/db";

export class DrizzleDashBoardRepository implements DashboardRepository {
  async getStatCardValue(staffId: string) {
    const result = await db
      .select({
        total: sql<number>`count(*)::int`,
        signed: sql<number>`sum(case when ${clearanceRecords.status} = 'Signed' then 1 else 0 end)::int`,
        incomplete: sql<number>`sum(case when ${clearanceRecords.status} = 'Incomplete' then 1 else 0 end)::int`,
        pending: sql<number>`sum(case when ${clearanceRecords.status} = 'Pending' then 1 else 0 end)::int`,
      })
      .from(clearanceRecords)
      .innerJoin(
        clearanceTemplates,
        eq(clearanceRecords.templateId, clearanceTemplates.templateId),
      )
      .where(eq(clearanceTemplates.staffId, staffId));
    const row = result[0];
    return {
      total: row.total,
      signed: row.signed,
      incomplete: row.incomplete,
      pending: row.pending,
    };
  }

  async getRecentSubmissions(
    staffId: string,
  ): Promise<getRecentSubmissionsPromise[]> {
    const rows = await db
      .select({
        assignedTaskId: clearanceTasks.assignedTaskId,
        studentId: students.studentId,
        // firstName: students.firstName,
        // lastName: students.lastName,
        studentName: students.studentName,
        course: courses.courseName,
        taskTitle: clearanceTasks.title,
        uploadedAt: clearanceTasks.uploadedAt,
      })
      .from(clearanceTasks)
      .innerJoin(
        clearanceRecords,
        eq(clearanceTasks.clearanceId, clearanceRecords.clearanceId),
      )
      .innerJoin(students, eq(clearanceRecords.userId, students.studentId))
      .innerJoin(
        clearanceTemplates,
        eq(clearanceRecords.templateId, clearanceTemplates.templateId),
      )
      .innerJoin(courses, eq(clearanceTemplates.courseId, courses.courseId))
      .where(
        and(
          eq(clearanceTasks.staffId, staffId),
          isNotNull(clearanceTasks.uploadedAt), // Crucial: Only get actual submissions
        ),
      )
      .orderBy(desc(clearanceTasks.uploadedAt))
      .limit(5); // Show only the 5 most recent
    // Format the data for the frontend

    return rows.map((row) => ({
      assignedTaskId: row.assignedTaskId,
      studentId: row.studentId,
      //   studentName: `${row.lastName}, ${row.firstName}`,
      studentName: row.studentName,
      course: row.course,
      taskTitle: row.taskTitle,
      uploadedAt: row.uploadedAt,
    }));
  }

  async getRecentActivity(
    staffId: string,
  ): Promise<getRecentActivityPromise[]> {
    const response = await db
      .select({
        message: clearanceLogs.message,
        actions: clearanceLogs.actions,
        created_at: clearanceLogs.createdAt,
      })
      .from(clearanceLogs)
      .innerJoin(staffs, eq(staffs.staffId, clearanceLogs.staffId))
      .where(eq(clearanceLogs.staffId, staffId))
      .orderBy(desc(clearanceLogs.createdAt))
      .limit(10)


    return response;
  }
}
