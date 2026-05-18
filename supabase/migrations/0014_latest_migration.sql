


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "drizzle";


ALTER SCHEMA "drizzle" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."assign_clearance_on_enrollment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    INSERT INTO public.clearane_records (user_id, template_id, status)
    SELECT
        NEW.student_id,
        ct.template_id,
        'Pending'::character varying
    FROM
        public.course_sections cs
    INNER JOIN
        public.clearance_templates ct ON cs.course_id = ct.course_id
    WHERE
        cs.section_id = NEW.section_id;

    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."assign_clearance_on_enrollment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."backfill_clearance_to_students"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    INSERT INTO public.clearance_records (user_id, template_id, status)
    SELECT
        e.student_id,
        NEW.template_id,
        'Pending'::character varying
    FROM
        public.enrollments e
    INNER JOIN
        public.course_sections cs ON e.section_id = cs.section_id
    WHERE
        cs.course_id = NEW.course_id;

    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."backfill_clearance_to_students"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_clearance_on_drop"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    v_course_id integer;
BEGIN
    SELECT course_id INTO v_course_id
    FROM public.course_sections
    WHERE section_id = OLD.section_id;

    DELETE FROM public.clearance_records
    WHERE user_id = OLD.user_id
      AND template_id IN (
          SELECT template_id
          FROM public.clearance_templates
          WHERE course_id = v_course_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.enrollments e
          JOIN public.course_sections cs ON e.section_id = cs.section_id
          WHERE e.student_id = OLD.student_id
            AND cs.course_id = v_course_id
      );

    RETURN OLD;
END;$$;


ALTER FUNCTION "public"."cleanup_clearance_on_drop"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    v_claims jsonb;
    v_custom_user_id character varying;
    v_azure_role character varying;
    v_department character varying;
  BEGIN

    -- INSERT INTO public.debug_logs (payload) VALUES (event);

    v_azure_role := event->'claims'->'user_metadata'->'custom_claims'->'roles'->>0;

    -- Extract the claims
    v_claims := event->'claims';

    -- Safely look up the custom user_id
    -- Cast the auth_id from the event to a uuid
    SELECT user_id INTO v_custom_user_id
    FROM public.users
    WHERE auth_id = (event->>'user_id')::uuid;

    -- Inject the claim if the user exists
    IF v_custom_user_id IS NOT NULL THEN
      v_claims := jsonb_set(v_claims, '{user_id}', to_jsonb(v_custom_user_id));
      
      -- 1. Fix the syntax: Remove 'IS'
      IF v_azure_role = 'Department' THEN

        -- 2. Use the correct table name: clearance_departments
        SELECT DISTINCT d.dept_name INTO v_department
        FROM public.clearance_departments d
        JOIN public.clearance_templates ct ON d.dept_id = ct.dept_id
        WHERE ct.staff_id = v_custom_user_id
        LIMIT 1;

        IF v_department IS NOT NULL THEN
          -- 3. Fix the JSON path: It needs curly braces '{department}'
          v_claims := jsonb_set(v_claims, '{department}', to_jsonb(v_department));
        END IF;

      END IF;
    END IF;

    -- Update the 'claims' object in the ORIGINAL event
    event := jsonb_set(event, '{claims}', v_claims);

    -- MUST return the entire event object
    RETURN event;
  END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_user_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  result text;
BEGIN
  result :=
    '02000' ||
    to_char(
      floor(random() * 1000000)::int,
      'FM000000'
    );

  RETURN result;
END;$$;


ALTER FUNCTION "public"."generate_user_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    "id" integer NOT NULL,
    "hash" "text" NOT NULL,
    "created_at" bigint
);


ALTER TABLE "drizzle"."__drizzle_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "drizzle"."__drizzle_migrations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "drizzle"."__drizzle_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "drizzle"."__drizzle_migrations_id_seq" OWNED BY "drizzle"."__drizzle_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."clearance_logs" (
    "log_id" integer NOT NULL,
    "staff_id" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actions" "text" NOT NULL
);


ALTER TABLE "public"."clearance_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."activity_logs_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."activity_logs_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."activity_logs_log_id_seq" OWNED BY "public"."clearance_logs"."log_id";



CREATE TABLE IF NOT EXISTS "public"."clearance_tasks" (
    "assigned_task_id" integer NOT NULL,
    "clearance_id" integer NOT NULL,
    "task_id" integer,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "staff_id" "text" NOT NULL,
    "dropbox" "text",
    "uploaded_at" timestamp with time zone,
    "comments" "text",
    "title" "text" NOT NULL,
    CONSTRAINT "status_check" CHECK (("status" = ANY (ARRAY['Cleared'::"text", 'Pending'::"text", 'Submitted'::"text", 'Rejected'::"text", 'Flagged'::"text", 'Verified'::"text"])))
);


ALTER TABLE "public"."clearance_tasks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."assigned_tasks_assigned_task_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."assigned_tasks_assigned_task_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."assigned_tasks_assigned_task_id_seq" OWNED BY "public"."clearance_tasks"."assigned_task_id";



CREATE TABLE IF NOT EXISTS "public"."clearance_departments" (
    "dept_id" integer NOT NULL,
    "dept_name" character varying(100) NOT NULL
);


ALTER TABLE "public"."clearance_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clearance_records" (
    "clearance_id" integer NOT NULL,
    "user_id" character varying(11) NOT NULL,
    "status" character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    "signed_at" timestamp without time zone,
    "template_id" integer NOT NULL,
    CONSTRAINT "studentclearances_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('Pending'::character varying)::"text", ('Signed'::character varying)::"text", ('Incomplete'::character varying)::"text"])))
);


ALTER TABLE "public"."clearance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_predefined_tasks" (
    "task_id" integer NOT NULL,
    "description" "text" NOT NULL,
    "staff_id" "text" NOT NULL,
    "title" "text"
);


ALTER TABLE "public"."staff_predefined_tasks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clearance_tasks_preset_task_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clearance_tasks_preset_task_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clearance_tasks_preset_task_id_seq" OWNED BY "public"."staff_predefined_tasks"."task_id";



CREATE TABLE IF NOT EXISTS "public"."clearance_templates" (
    "template_id" integer NOT NULL,
    "course_id" integer,
    "dept_id" integer NOT NULL,
    "staff_id" "text" NOT NULL
);


ALTER TABLE "public"."clearance_templates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clearance_templates_template_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clearance_templates_template_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clearance_templates_template_id_seq" OWNED BY "public"."clearance_templates"."template_id";



CREATE TABLE IF NOT EXISTS "public"."course_sections" (
    "section_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "year" integer NOT NULL,
    "semester" integer NOT NULL,
    "section_number" integer NOT NULL
);


ALTER TABLE "public"."course_sections" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."course_sections_section_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."course_sections_section_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."course_sections_section_id_seq" OWNED BY "public"."course_sections"."section_id";



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "course_id" integer NOT NULL,
    "course_name" character varying(100) NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."courses_course_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."courses_course_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."courses_course_id_seq" OWNED BY "public"."courses"."course_id";



CREATE TABLE IF NOT EXISTS "public"."debug_logs" (
    "debug_id" integer NOT NULL,
    "payload" "jsonb"
);


ALTER TABLE "public"."debug_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."debug_logs_debug_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."debug_logs_debug_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."debug_logs_debug_id_seq" OWNED BY "public"."debug_logs"."debug_id";



CREATE SEQUENCE IF NOT EXISTS "public"."departments_dept_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."departments_dept_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."departments_dept_id_seq" OWNED BY "public"."clearance_departments"."dept_id";



CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "student_id" character varying(11) NOT NULL,
    "section_id" integer NOT NULL
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "notif_id" integer NOT NULL,
    "user_id" character varying NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "ref_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "type_check" CHECK (("type" = ANY (ARRAY['System'::"text", 'Warning'::"text", 'Info'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notifications_notif_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notifications_notif_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notifications_notif_id_seq" OWNED BY "public"."notifications"."notif_id";



CREATE TABLE IF NOT EXISTS "public"."staffs" (
    "staff_id" character varying NOT NULL,
    "staff_name" character varying NOT NULL,
    "time_in" time without time zone,
    "time_out" time without time zone
);


ALTER TABLE "public"."staffs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."student_clearances_clearance_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."student_clearances_clearance_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."student_clearances_clearance_id_seq" OWNED BY "public"."clearance_records"."clearance_id";



CREATE TABLE IF NOT EXISTS "public"."students" (
    "student_id" character varying(11) NOT NULL,
    "student_name" "text",
    "phone_number" character varying(15),
    "balance" integer DEFAULT 0
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "user_id" character varying DEFAULT "public"."generate_user_id"() NOT NULL,
    "email" character varying NOT NULL,
    "auth_id" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "drizzle"."__drizzle_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"drizzle"."__drizzle_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clearance_departments" ALTER COLUMN "dept_id" SET DEFAULT "nextval"('"public"."departments_dept_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clearance_logs" ALTER COLUMN "log_id" SET DEFAULT "nextval"('"public"."activity_logs_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clearance_records" ALTER COLUMN "clearance_id" SET DEFAULT "nextval"('"public"."student_clearances_clearance_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clearance_tasks" ALTER COLUMN "assigned_task_id" SET DEFAULT "nextval"('"public"."assigned_tasks_assigned_task_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clearance_templates" ALTER COLUMN "template_id" SET DEFAULT "nextval"('"public"."clearance_templates_template_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."course_sections" ALTER COLUMN "section_id" SET DEFAULT "nextval"('"public"."course_sections_section_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."courses" ALTER COLUMN "course_id" SET DEFAULT "nextval"('"public"."courses_course_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."debug_logs" ALTER COLUMN "debug_id" SET DEFAULT "nextval"('"public"."debug_logs_debug_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "notif_id" SET DEFAULT "nextval"('"public"."notifications_notif_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."staff_predefined_tasks" ALTER COLUMN "task_id" SET DEFAULT "nextval"('"public"."clearance_tasks_preset_task_id_seq"'::"regclass");



ALTER TABLE ONLY "drizzle"."__drizzle_migrations"
    ADD CONSTRAINT "__drizzle_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clearance_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."clearance_departments"
    ADD CONSTRAINT "clearance_departments_dept_name_unique" UNIQUE ("dept_name");



ALTER TABLE ONLY "public"."clearance_tasks"
    ADD CONSTRAINT "clearance_tasks_pkey" PRIMARY KEY ("assigned_task_id");



ALTER TABLE ONLY "public"."staff_predefined_tasks"
    ADD CONSTRAINT "clearancerequirements_pkey" PRIMARY KEY ("task_id");



ALTER TABLE ONLY "public"."clearance_templates"
    ADD CONSTRAINT "clearancetemplates_pkey" PRIMARY KEY ("template_id");



ALTER TABLE ONLY "public"."course_sections"
    ADD CONSTRAINT "course_section_pkey" PRIMARY KEY ("section_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id");



ALTER TABLE ONLY "public"."debug_logs"
    ADD CONSTRAINT "debug_logs_pkey" PRIMARY KEY ("debug_id");



ALTER TABLE ONLY "public"."clearance_departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("dept_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("notif_id");



ALTER TABLE ONLY "public"."staffs"
    ADD CONSTRAINT "staffs_pkey" PRIMARY KEY ("staff_id");



ALTER TABLE ONLY "public"."clearance_records"
    ADD CONSTRAINT "studentclearances_pkey" PRIMARY KEY ("clearance_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("student_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



CREATE OR REPLACE TRIGGER "tr_enrollment_create_clearance" AFTER INSERT ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."assign_clearance_on_enrollment"();



CREATE OR REPLACE TRIGGER "tr_enrollment_delete_clearance" AFTER DELETE ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_clearance_on_drop"();



CREATE OR REPLACE TRIGGER "tr_template_backfill_clearances" AFTER INSERT ON "public"."clearance_templates" FOR EACH ROW EXECUTE FUNCTION "public"."backfill_clearance_to_students"();



ALTER TABLE ONLY "public"."clearance_logs"
    ADD CONSTRAINT "activity_log_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id");



ALTER TABLE ONLY "public"."clearance_tasks"
    ADD CONSTRAINT "assigned_tasks_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clearance_tasks"
    ADD CONSTRAINT "clearance_id_fk" FOREIGN KEY ("clearance_id") REFERENCES "public"."clearance_records"("clearance_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_predefined_tasks"
    ADD CONSTRAINT "clearancerequirements_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clearance_templates"
    ADD CONSTRAINT "clearancetemplates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clearance_templates"
    ADD CONSTRAINT "clearancetemplates_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "public"."clearance_departments"("dept_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clearance_templates"
    ADD CONSTRAINT "clearancetemplates_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_sections"
    ADD CONSTRAINT "coure_section_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("section_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notif_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."staffs"
    ADD CONSTRAINT "staffs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."clearance_records"
    ADD CONSTRAINT "studentclearances_student_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."students"("student_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clearance_records"
    ADD CONSTRAINT "studentclearances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."clearance_templates"("template_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clearance_tasks"
    ADD CONSTRAINT "task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."staff_predefined_tasks"("task_id") ON UPDATE CASCADE ON DELETE SET NULL;



CREATE POLICY "admin can make changes" ON "public"."clearance_departments" TO "authenticated" USING (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Admin'::"text")) WITH CHECK (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Admin'::"text"));



CREATE POLICY "admin can make changes" ON "public"."clearance_templates" TO "authenticated" USING (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Admin'::"text")) WITH CHECK (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Admin'::"text"));



CREATE POLICY "clearance client can submit work" ON "public"."clearance_tasks" FOR UPDATE TO "authenticated" USING ((("clearance_id" IN ( SELECT "clearance_records"."clearance_id"
   FROM "public"."clearance_records"
  WHERE (("clearance_records"."user_id")::"text" IN ( SELECT "users"."user_id"
           FROM "public"."users"
          WHERE ("users"."auth_id" = "auth"."uid"()))))) AND (("status" = 'Pending'::"text") OR ("status" = 'Rejected'::"text")))) WITH CHECK (("status" = ANY (ARRAY['Submitted'::"text", 'Rejected'::"text"])));



ALTER TABLE "public"."clearance_departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clearance_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clearance_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clearance_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clearance_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "department staff can make changes" ON "public"."clearance_logs" TO "authenticated" USING (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Department'::"text")) WITH CHECK (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Department'::"text"));



CREATE POLICY "department staff can make changes" ON "public"."staff_predefined_tasks" TO "authenticated" USING (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Department'::"text")) WITH CHECK (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Department'::"text"));



CREATE POLICY "department staff can manage assigned tasks" ON "public"."clearance_tasks" TO "authenticated" USING ((((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Department'::"text") AND ("staff_id" IN ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))))) WITH CHECK ((((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Department'::"text") AND ("staff_id" IN ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"())))));



CREATE POLICY "department staff can only view their own task" ON "public"."staff_predefined_tasks";



ALTER TABLE "public"."staff_predefined_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staffs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can view departments" ON "public"."clearance_departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users can view logs" ON "public"."clearance_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users can view own student record" ON "public"."students" FOR SELECT TO "authenticated" USING ((("student_id")::"text" IN ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))));



CREATE POLICY "users can view own tasks" ON "public"."clearance_tasks" FOR SELECT TO "authenticated" USING ((("clearance_id" IN ( SELECT "clearance_records"."clearance_id"
   FROM "public"."clearance_records"
  WHERE (("clearance_records"."user_id")::"text" IN ( SELECT "users"."user_id"
           FROM "public"."users"
          WHERE ("users"."auth_id" = "auth"."uid"()))))) OR (((((("auth"."jwt"() -> 'user_metadata'::"text") -> 'custom_claims'::"text") -> 'roles'::"text") ->> 0) = 'Department'::"text") AND ("staff_id" IN ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))))));



CREATE POLICY "users can view own user record" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth_id" = "auth"."uid"()));



CREATE POLICY "users can view staffs" ON "public"."staffs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users can view template" ON "public"."clearance_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users view their own clearance" ON "public"."clearance_records" FOR SELECT TO "authenticated" USING ((("user_id")::"text" IN ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";































































































































































GRANT ALL ON FUNCTION "public"."assign_clearance_on_enrollment"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_clearance_on_enrollment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_clearance_on_enrollment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_clearance_to_students"() TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_clearance_to_students"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_clearance_to_students"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_clearance_on_drop"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_clearance_on_drop"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_clearance_on_drop"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."generate_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_user_id"() TO "service_role";


















GRANT ALL ON TABLE "public"."clearance_logs" TO "anon";
GRANT ALL ON TABLE "public"."clearance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."clearance_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_logs_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_logs_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_logs_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clearance_tasks" TO "anon";
GRANT ALL ON TABLE "public"."clearance_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."clearance_tasks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assigned_tasks_assigned_task_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assigned_tasks_assigned_task_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assigned_tasks_assigned_task_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clearance_departments" TO "anon";
GRANT ALL ON TABLE "public"."clearance_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."clearance_departments" TO "service_role";
GRANT SELECT ON TABLE "public"."clearance_departments" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."clearance_records" TO "anon";
GRANT ALL ON TABLE "public"."clearance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."clearance_records" TO "service_role";



GRANT ALL ON TABLE "public"."staff_predefined_tasks" TO "anon";
GRANT ALL ON TABLE "public"."staff_predefined_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_predefined_tasks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clearance_tasks_preset_task_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clearance_tasks_preset_task_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clearance_tasks_preset_task_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clearance_templates" TO "anon";
GRANT ALL ON TABLE "public"."clearance_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."clearance_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."clearance_templates" TO "supabase_auth_admin";



GRANT ALL ON SEQUENCE "public"."clearance_templates_template_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clearance_templates_template_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clearance_templates_template_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."course_sections" TO "anon";
GRANT ALL ON TABLE "public"."course_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."course_sections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."course_sections_section_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."course_sections_section_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."course_sections_section_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_course_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_course_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_course_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."debug_logs" TO "anon";
GRANT ALL ON TABLE "public"."debug_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."debug_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."debug_logs_debug_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."debug_logs_debug_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."debug_logs_debug_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."departments_dept_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."departments_dept_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."departments_dept_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_notif_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_notif_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_notif_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."staffs" TO "anon";
GRANT ALL ON TABLE "public"."staffs" TO "authenticated";
GRANT ALL ON TABLE "public"."staffs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."student_clearances_clearance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."student_clearances_clearance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."student_clearances_clearance_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT ON TABLE "public"."users" TO "supabase_auth_admin";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE POLICY "Allow authenticated reads" ON "storage"."objects" FOR SELECT TO "authenticated" USING (("bucket_id" = 'images'::"text"));



CREATE POLICY "Allow authenticated updates" ON "storage"."objects" FOR UPDATE TO "authenticated" USING (("bucket_id" = 'images'::"text"));



CREATE POLICY "Allow authenticated uploads" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'images'::"text"));



