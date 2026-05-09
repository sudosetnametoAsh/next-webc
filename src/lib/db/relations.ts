import { relations } from "drizzle-orm/relations";
import { staffs, activityLogs, assignedTasks, studentClearances, clearanceTasksPreset, courses, clearanceTemplates, departments, courseSections, enrollments, students, users } from "./schema";

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	staff: one(staffs, {
		fields: [activityLogs.staffId],
		references: [staffs.staffId]
	}),
}));

export const staffsRelations = relations(staffs, ({one, many}) => ({
	activityLogs: many(activityLogs),
	assignedTasks: many(assignedTasks),
	clearanceTasksPresets: many(clearanceTasksPreset),
	clearanceTemplates: many(clearanceTemplates),
	user: one(users, {
		fields: [staffs.staffId],
		references: [users.userId]
	}),
}));

export const assignedTasksRelations = relations(assignedTasks, ({one}) => ({
	staff: one(staffs, {
		fields: [assignedTasks.staffId],
		references: [staffs.staffId]
	}),
	studentClearance: one(studentClearances, {
		fields: [assignedTasks.clearanceId],
		references: [studentClearances.clearanceId]
	}),
	clearanceTasksPreset: one(clearanceTasksPreset, {
		fields: [assignedTasks.taskId],
		references: [clearanceTasksPreset.taskId]
	}),
}));

export const studentClearancesRelations = relations(studentClearances, ({one, many}) => ({
	assignedTasks: many(assignedTasks),
	student: one(students, {
		fields: [studentClearances.studentId],
		references: [students.studentId]
	}),
	clearanceTemplate: one(clearanceTemplates, {
		fields: [studentClearances.templateId],
		references: [clearanceTemplates.templateId]
	}),
}));

export const clearanceTasksPresetRelations = relations(clearanceTasksPreset, ({one, many}) => ({
	assignedTasks: many(assignedTasks),
	staff: one(staffs, {
		fields: [clearanceTasksPreset.staffId],
		references: [staffs.staffId]
	}),
}));

export const clearanceTemplatesRelations = relations(clearanceTemplates, ({one, many}) => ({
	course: one(courses, {
		fields: [clearanceTemplates.courseId],
		references: [courses.courseId]
	}),
	department: one(departments, {
		fields: [clearanceTemplates.deptId],
		references: [departments.deptId]
	}),
	staff: one(staffs, {
		fields: [clearanceTemplates.staffId],
		references: [staffs.staffId]
	}),
	studentClearances: many(studentClearances),
}));

export const coursesRelations = relations(courses, ({many}) => ({
	clearanceTemplates: many(clearanceTemplates),
	courseSections: many(courseSections),
}));

export const departmentsRelations = relations(departments, ({many}) => ({
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
	studentClearances: many(studentClearances),
	user: one(users, {
		fields: [students.studentId],
		references: [users.userId]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	staffs: many(staffs),
	students: many(students),
}));