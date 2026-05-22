import { relations } from "drizzle-orm/relations";
import { staffs, clearanceLogs, clearanceTasks, clearanceRecords, staffPredefinedTasks, courses, clearanceTemplates, clearanceDepartments, courseSections, enrollments, students, users } from "./schema";

export const clearanceLogsRelations = relations(clearanceLogs, ({one}) => ({
	staff: one(staffs, {
		fields: [clearanceLogs.staffId],
		references: [staffs.staffId]
	}),
}));

export const staffsRelations = relations(staffs, ({one, many}) => ({
	clearanceLogs: many(clearanceLogs),
	clearanceTasks: many(clearanceTasks),
	staffPredefinedTasks: many(staffPredefinedTasks),
	clearanceTemplates: many(clearanceTemplates),
	user: one(users, {
		fields: [staffs.staffId],
		references: [users.userId]
	}),
}));

export const clearanceTasksRelations = relations(clearanceTasks, ({one}) => ({
	staff: one(staffs, {
		fields: [clearanceTasks.staffId],
		references: [staffs.staffId]
	}),
	clearanceRecord: one(clearanceRecords, {
		fields: [clearanceTasks.clearanceId],
		references: [clearanceRecords.clearanceId]
	}),
	staffPredefinedTask: one(staffPredefinedTasks, {
		fields: [clearanceTasks.taskId],
		references: [staffPredefinedTasks.taskId]
	}),
}));

export const clearanceRecordsRelations = relations(clearanceRecords, ({one, many}) => ({
	clearanceTasks: many(clearanceTasks),
	user: one(users, {
		fields: [clearanceRecords.userId],
		references: [users.userId]
	}),
	clearanceTemplate: one(clearanceTemplates, {
		fields: [clearanceRecords.templateId],
		references: [clearanceTemplates.templateId]
	}),
}));

export const staffPredefinedTasksRelations = relations(staffPredefinedTasks, ({one, many}) => ({
	clearanceTasks: many(clearanceTasks),
	staff: one(staffs, {
		fields: [staffPredefinedTasks.staffId],
		references: [staffs.staffId]
	}),
}));

export const clearanceTemplatesRelations = relations(clearanceTemplates, ({one, many}) => ({
	course: one(courses, {
		fields: [clearanceTemplates.courseId],
		references: [courses.courseId]
	}),
	department: one(clearanceDepartments, {
		fields: [clearanceTemplates.deptId],
		references: [clearanceDepartments.deptId]
	}),
	staff: one(staffs, {
		fields: [clearanceTemplates.staffId],
		references: [staffs.staffId]
	}),
	clearanceRecords: many(clearanceRecords),
}));

export const coursesRelations = relations(courses, ({many}) => ({
	clearanceTemplates: many(clearanceTemplates),
	courseSections: many(courseSections),
}));

export const clearanceDepartmentsRelations = relations(clearanceDepartments, ({many}) => ({
	clearanceTemplates: many(clearanceTemplates),
}));

export const courseSectionsRelations = relations(courseSections, ({one, many}) => ({
	course: one(courses, {
		fields: [courseSections.courseId],
		references: [courses.courseId]
	}),
	enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({one}) => ({
	courseSection: one(courseSections, {
		fields: [enrollments.sectionId],
		references: [courseSections.sectionId]
	}),
	student: one(students, {
		fields: [enrollments.studentId],
		references: [students.studentId]
	}),
}));

export const studentsRelations = relations(students, ({one, many}) => ({
	enrollments: many(enrollments),
	user: one(users, {
		fields: [students.studentId],
		references: [users.userId]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	staffs: many(staffs),
	students: many(students),
	clearanceRecords: many(clearanceRecords),
}));
