import {  and, desc, eq, isNotNull, sql } from "drizzle-orm";

import {
  DashboardRepository,
  getRecentActivityPromise,
  getRecentSubmissionsPromise,
} from "../application/repository/dashboard-repository";

import {
  activityLogs,
  assignedTasks,
  clearanceTemplates,
  courses,
  staffs,
  studentClearances,
  students,
} from "@/lib/db/schema";

import { db } from "@/lib/db";

export class DrizzleDashBoardRepository implements DashboardRepository {
  async getStatCardValue(staffId: string) {
    const result = await db
      .select({
        total: sql<number>`count(*)::int`,
        signed: sql<number>`sum(case when ${studentClearances.status} = 'Signed' then 1 else 0 end)::int`,
        incomplete: sql<number>`sum(case when ${studentClearances.status} = 'Incomplete' then 1 else 0 end)::int`,
        pending: sql<number>`sum(case when ${studentClearances.status} = 'Pending' then 1 else 0 end)::int`,
      })
      .from(studentClearances)
      .innerJoin(
        clearanceTemplates,
        eq(studentClearances.templateId, clearanceTemplates.templateId),
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
        assignedTaskId: assignedTasks.assignedTaskId,
        studentId: students.studentId,
        // firstName: students.firstName,
        // lastName: students.lastName,
        studentName: students.studentName,
        course: courses.courseName,
        taskTitle: assignedTasks.title,
        uploadedAt: assignedTasks.uploadedAt,
      })
      .from(assignedTasks)
      .innerJoin(
        studentClearances,
        eq(assignedTasks.clearanceId, studentClearances.clearanceId),
      )
      .innerJoin(students, eq(studentClearances.studentId, students.studentId))
      .innerJoin(
        clearanceTemplates,
        eq(studentClearances.templateId, clearanceTemplates.templateId),
      )
      .innerJoin(courses, eq(clearanceTemplates.courseId, courses.courseId))
      .where(
        and(
          eq(assignedTasks.staffId, staffId),
          isNotNull(assignedTasks.uploadedAt), // Crucial: Only get actual submissions
        ),
      )
      .orderBy(desc(assignedTasks.uploadedAt))
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
        message: activityLogs.message,
        actions: activityLogs.actions,
        created_at: activityLogs.createdAt,
      })
      .from(activityLogs)
      .innerJoin(staffs, eq(staffs.staffId, activityLogs.staffId))
      .where(eq(activityLogs.staffId, staffId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(10)


    return response;
  }
}
