import {
  pgTable,
  foreignKey,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  jsonb,
  time,
  pgPolicy,
  check,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { sql } from "drizzle-orm";

export const activityLogs = pgTable(
  "activity_logs",
  {
    logId: serial("log_id").primaryKey().notNull(),
    staffId: text("staff_id").notNull(),
    message: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    actions: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staffs.staffId],
      name: "activity_log_staff_id_fkey",
    }),
  ],
);

export const assignedTasks = pgTable(
  "assigned_tasks",
  {
    assignedTaskId: serial("assigned_task_id").notNull(),
    clearanceId: integer("clearance_id").notNull(),
    taskId: integer("task_id"),
    description: text().notNull(),
    status: text().default("Pending"),
    assignedAt: timestamp("assigned_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    staffId: text("staff_id").notNull(),
    dropbox: text(),
    uploadedAt: timestamp("uploaded_at", {
      withTimezone: true,
      mode: "string",
    }),
    comments: text(),
    title: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staffs.staffId],
      name: "assigned_tasks_staff_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.clearanceId],
      foreignColumns: [studentClearances.clearanceId],
      name: "clearance_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [clearanceTasksPreset.taskId],
      name: "task_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const clearanceTasksPreset = pgTable(
  "clearance_tasks_preset",
  {
    taskId: serial("task_id").primaryKey().notNull(),
    description: text().notNull(),
    staffId: text("staff_id").notNull(),
    title: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staffs.staffId],
      name: "clearancerequirements_staff_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const clearanceTemplates = pgTable(
  "clearance_templates",
  {
    templateId: serial("template_id").primaryKey().notNull(),
    courseId: integer("course_id").notNull(),
    deptId: integer("dept_id").notNull(),
    staffId: text("staff_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.courseId],
      name: "clearancetemplates_course_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.deptId],
      foreignColumns: [departments.deptId],
      name: "clearancetemplates_dept_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staffs.staffId],
      name: "clearancetemplates_staff_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const courseSections = pgTable(
  "course_sections",
  {
    sectionId: serial("section_id").primaryKey().notNull(),
    courseId: integer("course_id").notNull(),
    year: integer().notNull(),
    semester: integer().notNull(),
    sectionNumber: integer("section_number").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.courseId],
      name: "coure_section_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const courses = pgTable("courses", {
  courseId: serial("course_id").primaryKey().notNull(),
  courseName: varchar("course_name", { length: 100 }).notNull(),
});

export const debugLogs = pgTable("debug_logs", {
  debugId: serial("debug_id").primaryKey().notNull(),
  payload: jsonb(),
});

export const departments = pgTable("departments", {
  deptId: serial("dept_id").primaryKey().notNull(),
  deptName: varchar("dept_name", { length: 100 }).notNull(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    studentId: varchar("student_id", { length: 11 }).notNull(),
    sectionId: integer("section_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sectionId],
      foreignColumns: [courseSections.sectionId],
      name: "enrollments_section_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [students.studentId],
      name: "enrollments_student_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const staffs = pgTable(
  "staffs",
  {
    staffId: varchar("staff_id").primaryKey().notNull(),
    staffName: varchar("staff_name").notNull(),
    timeIn: time("time_in"),
    timeOut: time("time_out"),
  },
  (table) => [
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [users.userId],
      name: "staffs_staff_id_fkey",
    }),
  ],
);

export const studentClearances = pgTable(
  "student_clearances",
  {
    clearanceId: serial("clearance_id").primaryKey().notNull(),
    studentId: varchar("student_id", { length: 11 }).notNull(),
    status: varchar({ length: 20 }).default("Pending").notNull(),
    signedAt: timestamp("signed_at", { mode: "string" }),
    templateId: integer("template_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [students.studentId],
      name: "studentclearances_student_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [clearanceTemplates.templateId],
      name: "studentclearances_template_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    check(
      "studentclearances_status_check",
      sql`(status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Signed'::character varying)::text, ('Incomplete'::character varying)::text])`,
    ),
    pgPolicy("user view their own clearance", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`student_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
    }),
  ],
);

export const students = pgTable(
  "students",
  {
    studentId: varchar("student_id", { length: 11 }).primaryKey().notNull(),
    studentName: text("student_name"),
    phoneNumber: varchar("phone_number", { length: 15 }),
    balance: integer().default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [users.userId],
      name: "students_student_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const notifications = pgTable("notifications", {
  notifId: serial("notif_id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // system, warning, info
  isRead: boolean("is_read").default(false).notNull(),
  refUrl: text("ref_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.userId],
    name: "notif_user_id_fkey"
  }),
  check("type_check", sql`${table.type}::text IN ('System', 'Warning', 'Info')`)
]);

export const users = pgTable("users", {
  userId: varchar("user_id")
    .default(sql`generate_user_id()`)
    .primaryKey()
    .notNull(),
  email: varchar().notNull(),
  authId: uuid("auth_id"),
});
