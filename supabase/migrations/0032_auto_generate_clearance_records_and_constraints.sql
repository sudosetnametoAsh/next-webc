-- Migration: 0032_auto_generate_clearance_records_and_constraints.sql
-- Description: Adds unique constraints on clearance_records and enrollments,
--              updates triggers to automatically generate clearance records
--              with ON CONFLICT DO NOTHING for students, staff, and course template backfills.

-- 1. Deduplicate any existing duplicate clearance_records (retaining latest record)
DELETE FROM "public"."clearance_records" cr1
WHERE cr1."clearance_id" < (
  SELECT MAX(cr2."clearance_id")
  FROM "public"."clearance_records" cr2
  WHERE cr2."user_id" = cr1."user_id" 
    AND cr2."template_id" = cr1."template_id"
);

-- 2. Add UNIQUE constraint on clearance_records(user_id, template_id)
ALTER TABLE "public"."clearance_records"
  DROP CONSTRAINT IF EXISTS "clearance_records_user_template_unique",
  ADD CONSTRAINT "clearance_records_user_template_unique" UNIQUE ("user_id", "template_id");

-- 3. Add UNIQUE constraint on enrollments(student_id, section_id)
ALTER TABLE "public"."enrollments"
  DROP CONSTRAINT IF EXISTS "enrollments_student_section_unique",
  ADD CONSTRAINT "enrollments_student_section_unique" UNIQUE ("student_id", "section_id");

-- 4. Student Enrollment Trigger Function
CREATE OR REPLACE FUNCTION "public"."assign_clearance_on_enrollment"() 
RETURNS "trigger" AS $$
BEGIN
  INSERT INTO "public"."clearance_records" ("user_id", "template_id", "status")
  SELECT
    NEW.student_id,
    ct.template_id,
    'Pending'::character varying
  FROM "public"."course_sections" cs
  INNER JOIN "public"."clearance_templates" ct ON cs.course_id = ct.course_id
  WHERE cs.section_id = NEW.section_id
  ON CONFLICT ("user_id", "template_id") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger to enrollments
DROP TRIGGER IF EXISTS "tr_enrollment_create_clearance" ON "public"."enrollments";

CREATE TRIGGER "tr_enrollment_create_clearance"
AFTER INSERT ON "public"."enrollments"
FOR EACH ROW EXECUTE FUNCTION "public"."assign_clearance_on_enrollment"();

-- 5. Staff Creation Trigger Function
CREATE OR REPLACE FUNCTION "public"."assign_clearance_on_staff_creation"() 
RETURNS "trigger" AS $$
BEGIN
  INSERT INTO "public"."clearance_records" ("user_id", "template_id", "status")
  SELECT
    NEW.staff_id,
    ct.template_id,
    'Pending'::character varying
  FROM "public"."clearance_templates" ct
  WHERE ct.course_id IS NULL
  ON CONFLICT ("user_id", "template_id") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger to staffs
DROP TRIGGER IF EXISTS "tr_staff_create_clearance" ON "public"."staffs";

CREATE TRIGGER "tr_staff_create_clearance"
AFTER INSERT ON "public"."staffs"
FOR EACH ROW EXECUTE FUNCTION "public"."assign_clearance_on_staff_creation"();

-- 6. Template Backfill Trigger Function (when new department requirement added to course/staff)
CREATE OR REPLACE FUNCTION "public"."backfill_clearance_to_students"() 
RETURNS "trigger" AS $$
BEGIN
  IF NEW.course_id IS NOT NULL THEN
    -- Backfill to students currently enrolled in sections of this course
    INSERT INTO "public"."clearance_records" ("user_id", "template_id", "status")
    SELECT
      e.student_id,
      NEW.template_id,
      'Pending'::character varying
    FROM "public"."enrollments" e
    INNER JOIN "public"."course_sections" cs ON e.section_id = cs.section_id
    WHERE cs.course_id = NEW.course_id
    ON CONFLICT ("user_id", "template_id") DO NOTHING;
  ELSE
    -- Backfill to all existing staff members
    INSERT INTO "public"."clearance_records" ("user_id", "template_id", "status")
    SELECT
      s.staff_id,
      NEW.template_id,
      'Pending'::character varying
    FROM "public"."staffs" s
    ON CONFLICT ("user_id", "template_id") DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger to clearance_templates
DROP TRIGGER IF EXISTS "tr_template_backfill_clearances" ON "public"."clearance_templates";

CREATE TRIGGER "tr_template_backfill_clearances"
AFTER INSERT ON "public"."clearance_templates"
FOR EACH ROW EXECUTE FUNCTION "public"."backfill_clearance_to_students"();

-- 7. Grant Permissions
GRANT ALL ON FUNCTION "public"."assign_clearance_on_enrollment"() TO "postgres", "service_role", "authenticated";
GRANT ALL ON FUNCTION "public"."assign_clearance_on_staff_creation"() TO "postgres", "service_role", "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_clearance_to_students"() TO "postgres", "service_role", "authenticated";
