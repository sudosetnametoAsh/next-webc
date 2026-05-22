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

export const clearanceLogs = pgTable(
  "clearance_logs",
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
    pgPolicy("users can view logs", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("department staff can make changes", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff']`,
      withCheck: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff']`,
    }),
  ],
);

export const clearanceTasks = pgTable(
  "clearance_tasks",
  {
    assignedTaskId: serial("assigned_task_id").primaryKey().notNull(),
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
    title: text().notNull(),
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
      foreignColumns: [clearanceRecords.clearanceId],
      name: "clearance_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [staffPredefinedTasks.taskId],
      name: "task_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("set null"),

    check(
      "status_check",
      sql`${table.status}::text IN ('Cleared', 'Pending', 'Submitted', 'Rejected', 'Flagged', 'Verified')`,
    ),
    pgPolicy("users can view own tasks", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`(clearance_id IN (SELECT clearance_id FROM public.clearance_records WHERE user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()))) OR ((auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff'] AND staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()))`,
    }),
    pgPolicy("clearance client can submit work", {
      as: "permissive",
      for: "update",
      to: authenticatedRole,
      using: sql`clearance_id IN (SELECT clearance_id FROM public.clearance_records WHERE user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())) AND (status = 'Pending' OR status = 'Rejected')`,
      withCheck: sql`status IN ('Submitted', 'Rejected')`,
    }),
    pgPolicy("department staff can manage assigned tasks", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff'] AND staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
      withCheck: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff'] AND staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
    }),
  ],
);

export const staffPredefinedTasks = pgTable(
  "staff_predefined_tasks",
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
    pgPolicy("department staff can manage their own predefined tasks", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff'] AND staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
      withCheck: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff'] AND staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
    }),
  ],
);

export const clearanceTemplates = pgTable(
  "clearance_templates",
  {
    templateId: serial("template_id").primaryKey().notNull(),
    courseId: integer("course_id"),
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
      foreignColumns: [clearanceDepartments.deptId],
      name: "clearancetemplates_dept_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staffs.staffId],
      name: "clearancetemplates_staff_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    pgPolicy("users can view template", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("admin can make changes", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']`,
      withCheck: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']`,
    }),
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
    pgPolicy("users can view course sections", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
);

export const courses = pgTable("courses", {
  courseId: serial("course_id").primaryKey().notNull(),
  courseName: varchar("course_name", { length: 100 }).notNull(),
}, (table) => [
  pgPolicy("users can view courses", {
    as: "permissive",
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  }),
]);

export const debugLogs = pgTable("debug_logs", {
  debugId: serial("debug_id").primaryKey().notNull(),
  payload: jsonb(),
});

export const clearanceDepartments = pgTable(
  "clearance_departments",
  {
    deptId: serial("dept_id").primaryKey().notNull(),
    deptName: varchar("dept_name", { length: 100 }).notNull().unique(),
  },
  () => [
    pgPolicy("users can view departments", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("admin can make changes", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']`,
      withCheck: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']`,
    }),
  ],
);

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
    pgPolicy("users can view enrollments", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
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
    pgPolicy("users can view staffs", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("staff can manage own record", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
      withCheck: sql`staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
    }),
  ],
);

export const clearanceRecords = pgTable(
  "clearance_records",
  {
    clearanceId: serial("clearance_id").primaryKey().notNull(),
    userId: varchar("user_id", { length: 11 }).notNull(),
    status: varchar({ length: 20 }).default("Pending").notNull(),
    signedAt: timestamp("signed_at", { mode: "string" }),
    templateId: integer("template_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "clearance_records_user_id_fkey",
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
    pgPolicy("users view their own clearance", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
    }),
    pgPolicy("department staff can view clearance records", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff']`,
    }),
    pgPolicy("department staff can update clearance records", {
      as: "permissive",
      for: "update",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff'] AND template_id IN (SELECT template_id FROM public.clearance_templates WHERE staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()))`,
      withCheck: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff'] AND template_id IN (SELECT template_id FROM public.clearance_templates WHERE staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()))`,
    }),
    pgPolicy("admin can manage clearance records", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']`,
      withCheck: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']`,
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
    pgPolicy("users can view own student record", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`student_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
    }),
    pgPolicy("department staff can view students", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff']`,
    }),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    notifId: serial("notif_id").primaryKey(),
    userId: varchar("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: text("type").notNull(), // System, Warning, Info
    isRead: boolean("is_read").default(false).notNull(),
    refUrl: text("ref_url").notNull(),
    sectionId: integer("section_id"),
    courseId: integer("course_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "notif_user_id_fkey",
    }),
    foreignKey({
      columns: [table.sectionId],
      foreignColumns: [courseSections.sectionId],
      name: "notif_section_id_fkey",
    }),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.courseId],
      name: "notif_course_id_fkey",
    }),
    check(
      "type_check",
      sql`${table.type}::text IN ('System', 'Warning', 'Info')`,
    ),
    pgPolicy("users can view own notifications", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
    }),
    pgPolicy("users can update own notifications", {
      as: "permissive",
      for: "update",
      to: authenticatedRole,
      using: sql`user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
      withCheck: sql`user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())`,
    }),
  ],
);

export const users = pgTable(
  "users",
  {
    userId: varchar("user_id")
      .default(sql`generate_user_id()`)
      .primaryKey()
      .notNull(),
    email: varchar().notNull(),
    authId: uuid("auth_id"),
  },
  () => [
    pgPolicy("users can view own user record", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`auth_id = auth.uid()`,
    }),
    pgPolicy("department staff can view users", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff']`,
    }),
    pgPolicy("admin can manage users", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']`,
      withCheck: sql`(auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']`,
    }),
  ],
);
