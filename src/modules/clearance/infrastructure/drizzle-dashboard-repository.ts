import { DrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client";
import {
  DashBoardRepository,
  getClearanceRecordsPromise,
  getDepartmentDetailsPromise,
  getOfficeHoursPromise,
  getStudentProfilePromise,
  getSummaryPromise,
} from "../application/repository/dashboard-repository";
import {
  clearanceDepartments,
  clearanceRecords,
  clearanceTasks,
  clearanceTemplates,
  courseSections,
  courses,
  enrollments,
  staffs,
  students,
  users,
} from "@/lib/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export class DrizzleDashBoardRepository implements DashBoardRepository {
  constructor(private readonly drizzle: DrizzleSupabaseClient) {}

  async getStudentProfile(userId?: string): Promise<getStudentProfilePromise | null> {
    if (!userId) return null;

    const response = await this.drizzle.rls((tx) => {
      return tx
        .select({
          student_id: students.studentId,
          student_name: students.studentName,
          course_name: courses.courseName,
          section_number: courseSections.sectionNumber,
          year: courseSections.year,
          semester: courseSections.semester,
        })
        .from(students)
        .leftJoin(enrollments, eq(students.studentId, enrollments.studentId))
        .leftJoin(courseSections, eq(enrollments.sectionId, courseSections.sectionId))
        .leftJoin(courses, eq(courseSections.courseId, courses.courseId))
        .where(eq(students.studentId, userId))
        .limit(1);
    });

    if (response[0]) return response[0];

    const staffResp = await this.drizzle.rls((tx) => {
      return tx
        .select({
          student_id: staffs.staffId,
          student_name: staffs.staffName,
        })
        .from(staffs)
        .where(eq(staffs.staffId, userId))
        .limit(1);
    });

    if (staffResp[0]) {
      return {
        student_id: staffResp[0].student_id,
        student_name: staffResp[0].student_name,
        course_name: "Staff Clearance",
        section_number: null,
        year: null,
        semester: null,
      };
    }

    return null;
  }

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
          cleared_task: sql<number>`COUNT(*) FILTER (WHERE ${clearanceTasks.status} IN ('Cleared', 'Flagged', 'Verified'))::int`,

          tier: clearanceTemplates.tier,
          icon_name: clearanceDepartments.iconName,
          floor: clearanceDepartments.floor,
          room: clearanceDepartments.room,
          signed_at: clearanceRecords.signedAt,
          weekly_schedule: staffs.weeklySchedule,
          early_out_date: staffs.earlyOutDate,
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
        query.where(and(eq(clearanceRecords.userId, userId), eq(clearanceTemplates.isActive, true)));
      } else {
        query.where(eq(clearanceTemplates.isActive, true));
      }

      return query.groupBy(
        staffs.staffName,
        staffs.weeklySchedule,
        staffs.earlyOutDate,

        clearanceDepartments.deptName,
        clearanceRecords.clearanceId,
        clearanceRecords.signedAt,
        clearanceTemplates.staffId,
        clearanceTemplates.tier,
        clearanceDepartments.iconName,
        clearanceDepartments.floor,
        clearanceDepartments.room,
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
        .from(clearanceRecords)
        .innerJoin(
          clearanceTemplates,
          eq(clearanceRecords.templateId, clearanceTemplates.templateId),
        );

      if (userId) {
        query.where(and(eq(clearanceRecords.userId, userId), eq(clearanceTemplates.isActive, true)));
      } else {
        query.where(eq(clearanceTemplates.isActive, true));
      }

      return query;
    });

    const result = response[0] || { signed: 0, incomplete: 0, pending: 0, total: 0 };

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
          clearance_id: clearanceTasks.clearanceId,
          title: clearanceTasks.title,
          description: clearanceTasks.description,
          status: clearanceTasks.status,
          assigned_at: clearanceTasks.assignedAt,
          uploaded_at: clearanceTasks.uploadedAt,
          comments: clearanceTasks.comments,
          dropbox: clearanceTasks.dropbox,
          department: clearanceDepartments.deptName,
          staff: staffs.staffName,
          tier: clearanceTemplates.tier,
          icon_name: clearanceDepartments.iconName,
          floor: clearanceDepartments.floor,
          room: clearanceDepartments.room,
          ai_audit_report: clearanceTasks.aiAuditReport,
          due_date: clearanceTasks.dueDate,
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
        )
        .leftJoin(
          staffs,
          eq(clearanceTasks.staffId, staffs.staffId),
        );

      if (userId) {
        query.where(and(eq(clearanceRecords.userId, userId), eq(clearanceTemplates.isActive, true)));
      } else {
        query.where(eq(clearanceTemplates.isActive, true));
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

          weekly_schedule: staffs.weeklySchedule,
          early_out_date: staffs.earlyOutDate,
          floor: clearanceDepartments.floor,
          room: clearanceDepartments.room,
          icon_name: clearanceDepartments.iconName,
          tier: clearanceTemplates.tier,
          email: users.email,
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
        .leftJoin(users, eq(staffs.staffId, users.userId));

      if (userId) {
        query.where(and(eq(clearanceRecords.userId, userId), eq(clearanceTemplates.isActive, true)));
      } else {
        query.where(eq(clearanceTemplates.isActive, true));
      }

      return query
        .groupBy(
          clearanceDepartments.deptId,
          clearanceDepartments.deptName,
          staffs.staffName,

          staffs.weeklySchedule,
          staffs.earlyOutDate,
          clearanceDepartments.floor,
          clearanceDepartments.room,
          clearanceDepartments.iconName,
          clearanceTemplates.tier,
          users.email,
        )
        .orderBy(asc(clearanceTemplates.tier));
    });

    return response;
  }
}

