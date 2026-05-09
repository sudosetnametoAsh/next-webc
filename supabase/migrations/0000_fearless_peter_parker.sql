-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "activity_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actions" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assigned_tasks" (
	"assigned_task_id" serial NOT NULL,
	"clearance_id" integer NOT NULL,
	"task_id" integer,
	"description" text NOT NULL,
	"status" text DEFAULT 'Pending',
	"assigned_at" timestamp with time zone DEFAULT now(),
	"staff_id" text NOT NULL,
	"dropbox" text,
	"uploaded_at" timestamp with time zone,
	"comments" text,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "clearance_tasks_preset" (
	"task_id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"staff_id" text NOT NULL,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "clearance_templates" (
	"template_id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"dept_id" integer NOT NULL,
	"staff_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_sections" (
	"section_id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"year" integer NOT NULL,
	"semester" integer NOT NULL,
	"section_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"course_id" serial PRIMARY KEY NOT NULL,
	"course_name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debug_logs" (
	"debug_id" serial PRIMARY KEY NOT NULL,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"dept_id" serial PRIMARY KEY NOT NULL,
	"dept_name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"student_id" varchar(11) NOT NULL,
	"section_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staffs" (
	"staff_id" varchar PRIMARY KEY NOT NULL,
	"staff_name" varchar NOT NULL,
	"time_in" time,
	"time_out" time
);
--> statement-breakpoint
CREATE TABLE "student_clearances" (
	"clearance_id" serial PRIMARY KEY NOT NULL,
	"student_id" varchar(11) NOT NULL,
	"status" varchar(20) DEFAULT 'Pending' NOT NULL,
	"signed_at" timestamp,
	"template_id" integer NOT NULL,
	CONSTRAINT "studentclearances_status_check" CHECK ((status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Signed'::character varying)::text, ('Incomplete'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "student_clearances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "students" (
	"student_id" varchar(11) PRIMARY KEY NOT NULL,
	"student_name" text,
	"phone_number" varchar(15),
	"balance" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" varchar PRIMARY KEY DEFAULT generate_user_id() NOT NULL,
	"email" varchar NOT NULL,
	"auth_id" uuid
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_log_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_tasks" ADD CONSTRAINT "assigned_tasks_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assigned_tasks" ADD CONSTRAINT "clearance_id_fk" FOREIGN KEY ("clearance_id") REFERENCES "public"."student_clearances"("clearance_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assigned_tasks" ADD CONSTRAINT "task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."clearance_tasks_preset"("task_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clearance_tasks_preset" ADD CONSTRAINT "clearancerequirements_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clearance_templates" ADD CONSTRAINT "clearancetemplates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clearance_templates" ADD CONSTRAINT "clearancetemplates_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("dept_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clearance_templates" ADD CONSTRAINT "clearancetemplates_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "course_sections" ADD CONSTRAINT "coure_section_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("section_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staffs" ADD CONSTRAINT "staffs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_clearances" ADD CONSTRAINT "studentclearances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_clearances" ADD CONSTRAINT "studentclearances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."clearance_templates"("template_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Students view own clearances" ON "student_clearances" AS PERMISSIVE FOR SELECT TO public USING (((student_id)::text IN ( SELECT users.user_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
*/