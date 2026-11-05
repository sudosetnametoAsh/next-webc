import {
  pgTable,
  foreignKey,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  jsonb,
  pgPolicy,
  check,
  uuid,
  boolean,
  numeric,
  unique,
  uniqueIndex,
  primaryKey,
  index,
  date,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole } from "drizzle-orm/supabase";
import { sql } from "drizzle-orm";

export const academicPeriods = pgTable("academic_periods", {
  periodId: serial("period_id").primaryKey(),
  state: text("state").notNull().default("preparing"),
  opensAt: timestamp("opens_at", { withTimezone: true, mode: "string" }),
  startRequestedAt: timestamp("start_requested_at", { withTimezone: true, mode: "string" }),
  endedAt: timestamp("ended_at", { withTimezone: true, mode: "string" }),
  sourcePeriodId: integer("source_period_id"),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year").notNull(),
  term: integer("term").notNull(),
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  isActive: boolean("is_active").notNull().default(false),
  activatedAt: timestamp("activated_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [
  foreignKey({ columns: [table.sourcePeriodId], foreignColumns: [table.periodId], name: "academic_periods_source_period_id_fkey" }).onDelete("restrict"),
  check("academic_period_state", sql`${table.state} IN ('preparing','open','ended')`),
  check("period_ended_inactive", sql`${table.state}<>'ended' OR NOT ${table.isActive}`),
  check("academic_period_start_year", sql`${table.startYear} BETWEEN 2000 AND 9998`),
  pgPolicy("academic_period_read", { for: "select", to: authenticatedRole, using: sql`true` }),
  pgPolicy("academic_period_admin", { for: "all", to: authenticatedRole,
    using: sql`(auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin'`,
    withCheck: sql`(auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin'` }),
  unique("academic_period_unique").on(table.startYear, table.endYear, table.term),
  uniqueIndex("academic_period_one_active").on(table.isActive).where(sql`${table.isActive}`),
  check("academic_period_years", sql`${table.endYear} = ${table.startYear} + 1`),
  check("academic_period_term", sql`${table.term} > 0 AND ${table.term} <= 4`),
  check("academic_period_dates", sql`(${table.startsOn} IS NULL AND ${table.endsOn} IS NULL) OR (${table.startsOn} IS NOT NULL AND ${table.endsOn} IS NOT NULL AND ${table.endsOn} >= ${table.startsOn})`),
]).enableRLS();

export const staffEnrollments = pgTable("staff_enrollments", {
  isActive: boolean("is_active").notNull().default(true),
  periodId: integer("period_id").notNull().references(() => academicPeriods.periodId, { onDelete: "restrict" }),
  staffId: varchar("staff_id", { length: 11 }).notNull().references(() => staffs.staffId, { onDelete: "restrict", onUpdate: "cascade" }),
}, table => [primaryKey({ columns: [table.periodId, table.staffId] }),
  index("staff_enrollments_staff_period_idx").on(table.staffId, table.periodId),
  pgPolicy("staff_period_read", { for: "select", to: authenticatedRole, using: sql`public.period_can_manage(period_id) OR staff_id=public.period_user_id()` })]).enableRLS();

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
    aiAuditReport: jsonb("ai_audit_report"),
    dueDate: timestamp("due_date", {
      withTimezone: true,
      mode: "string",
    }),
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
    pgPolicy("tasks_current_period", { as: "restrictive", for: "all", to: authenticatedRole,
      using: sql`EXISTS(SELECT 1 FROM public.clearance_records r WHERE r.clearance_id=clearance_tasks.clearance_id AND public.period_can_read(r.period_id,r.user_id))`,
      withCheck: sql`EXISTS(SELECT 1 FROM public.clearance_records r WHERE r.clearance_id=clearance_tasks.clearance_id AND (public.period_can_manage(r.period_id) OR (public.period_can_read(r.period_id,r.user_id) AND clearance_tasks.status IN ('Submitted','Rejected'))))` }),
    pgPolicy("tasks_require_identity", { as: "restrictive", for: "all", to: anonRole, using: sql`false`, withCheck: sql`false` }),
    pgPolicy("allow read clearance_tasks", {
      as: "permissive",
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
    pgPolicy("allow update clearance_tasks", {
      as: "permissive",
      for: "update",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
      withCheck: sql`true`,
    }),
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
    tier: integer("tier").notNull().default(1),
    isActive: boolean("is_active").default(true).notNull(),
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
    pgPolicy("templates_period_access", { as: "restrictive", for: "select", to: authenticatedRole, using: sql`public.period_can_read(public.active_academic_period_id(),public.period_user_id())` }),
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
    iconName: varchar("icon_name", { length: 50 }).default("Building2").notNull(),
    floor: varchar("floor", { length: 50 }),
    room: varchar("room", { length: 50 }),

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
    isActive: boolean("is_active").notNull().default(true),
    studentId: varchar("student_id", { length: 11 }).notNull(),
    sectionId: integer("section_id").notNull(),
    periodId: integer("period_id").notNull().default(sql`public.active_academic_period_id()`).references(() => academicPeriods.periodId, { onDelete: "restrict" }),
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
    pgPolicy("enrollment_current_period", { as: "restrictive", for: "all", to: authenticatedRole,
      using: sql`period_id=public.active_academic_period_id() AND public.period_can_read(period_id,student_id)`, withCheck: sql`period_id=public.active_academic_period_id() AND public.period_can_manage(period_id)` }),
    unique("enrollments_student_period_unique").on(table.studentId, table.periodId),
    index("enrollments_period_section").on(table.periodId, table.sectionId),
  ],
);

export const staffs = pgTable(
  "staffs",
  {
    staffId: varchar("staff_id").primaryKey().notNull(),
    staffName: varchar("staff_name").notNull(),
    weeklySchedule: jsonb("weekly_schedule").$type<Record<string, { active: boolean; time_in: string; time_out: string }>>(),
    earlyOutDate: varchar("early_out_date", { length: 10 }),
  },
  (table) => [
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [users.userId],
      name: "staffs_staff_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
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

export const staffConfigurations = pgTable(
  "staff_configurations",
  {
    staffId: varchar("staff_id").primaryKey().references(() => staffs.staffId, { onDelete: "cascade", onUpdate: "cascade" }),
    aiVerificationMode: varchar("ai_verification_mode", { length: 20 }).default("two_factor").notNull(),
    aiConfidenceThreshold: integer("ai_confidence_threshold").default(85).notNull(),
  },
  (table) => [
    check("staff_configurations_mode_check", sql`${table.aiVerificationMode} IN ('two_factor', 'autonomous', 'manual')`),
    check("staff_configurations_threshold_check", sql`${table.aiConfidenceThreshold} BETWEEN 50 AND 100`),
    pgPolicy("staff manage own configuration", {
      for: "all", to: authenticatedRole,
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
    signedAt: timestamp("signed_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    templateId: integer("template_id").notNull(),
    periodId: integer("period_id").notNull().default(sql`public.active_academic_period_id()`).references(() => academicPeriods.periodId, { onDelete: "restrict" }),
    documentSnapshot: jsonb("document_snapshot"),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "clearance_records_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [clearanceTemplates.templateId],
      name: "studentclearances_template_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    check(
      "studentclearances_status_check",
      sql`(status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Signed'::character varying)::text, ('Incomplete'::character varying)::text])`,
    ),
    pgPolicy("clearance_current_period", { as: "restrictive", for: "all", to: authenticatedRole,
      using: sql`period_id=public.active_academic_period_id() AND public.period_can_read(period_id,user_id)`, withCheck: sql`period_id=public.active_academic_period_id() AND public.period_can_manage(period_id)` }),
    pgPolicy("clearance_manager_update", { as: "restrictive", for: "update", to: authenticatedRole, using: sql`public.period_can_manage(period_id)`, withCheck: sql`public.period_can_manage(period_id)` }),
    unique("clearance_records_user_template_period_unique").on(table.userId, table.templateId, table.periodId),
    index("clearance_records_period_user").on(table.periodId, table.userId),
    index("clearance_records_period_template").on(table.periodId, table.templateId),
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
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [users.userId],
      name: "students_student_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
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
    userId: varchar("user_id"),
    departmentId: integer("department_id"),
    targetRole: varchar("target_role", { length: 20 }), // 'student' | 'department' | 'admin'
    category: varchar("category", { length: 50 }),       // 'task', 'submission', 'clearance', 'schedule', 'template', 'bottleneck', 'system'
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: text("type").notNull(), // System, Warning, Info, Success, Alert
    isRead: boolean("is_read").default(false).notNull(),
    refUrl: text("ref_url").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    sectionId: integer("section_id"),
    courseId: integer("course_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("notifications_period_access", { as: "restrictive", for: "all", to: authenticatedRole,
      using: sql`public.period_can_read(public.active_academic_period_id(),public.period_user_id())`,
      withCheck: sql`public.period_can_read(public.active_academic_period_id(),public.period_user_id())` }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "notif_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [clearanceDepartments.deptId],
      name: "notif_dept_id_fkey",
    })
      .onDelete("cascade"),
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
      sql`${table.type}::text IN ('System', 'Warning', 'Info', 'Success', 'Alert', 'system', 'warning', 'info', 'success', 'alert')`,
    ),
    pgPolicy("bottleneck notifications are admin only", {
      as: "restrictive", for: "select", to: [anonRole, authenticatedRole],
      using: sql`NOT (lower(coalesce(category, '')) = 'bottleneck'
        OR lower(coalesce(title, '')) LIKE '%bottleneck%'
        OR lower(coalesce(metadata->>'type', '')) = 'bottleneck')
        OR coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin', false)`,
    }),
    pgPolicy("allow read notifications", {
      as: "permissive",
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
    pgPolicy("allow insert notifications", {
      as: "permissive",
      for: "insert",
      to: [anonRole, authenticatedRole],
      withCheck: sql`true`,
    }),
    pgPolicy("users can update own notifications", {
      as: "permissive",
      for: "update",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy("allow delete notifications", {
      as: "permissive",
      for: "delete",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
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
  (table) => [
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

export const cashierWebhookEvents = pgTable(
  "cashier_webhook_events",
  {
    eventId: uuid("event_id").defaultRandom().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }),
    transactionRef: varchar("transaction_ref", { length: 100 }).unique(),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }),
    remainingBalance: numeric("remaining_balance", { precision: 12, scale: 2 }),
    payload: jsonb("payload").$type<Record<string, any>>(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "cashier_webhook_events_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);
