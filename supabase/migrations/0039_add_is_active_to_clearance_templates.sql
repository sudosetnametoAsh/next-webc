-- Migration: 0039_add_is_active_to_clearance_templates.sql
-- Description: Adds is_active column to clearance_templates for soft-delete / archival,
--              updates triggers to only generate clearance records for active templates.

-- 1. Add is_active column to clearance_templates (defaults to true)
ALTER TABLE "public"."clearance_templates"
ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

-- 2. Update assign_clearance_on_enrollment to respect is_active
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
    AND ct.is_active = true
  ON CONFLICT ("user_id", "template_id") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update assign_clearance_on_staff_creation to respect is_active
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
    AND ct.is_active = true
  ON CONFLICT ("user_id", "template_id") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update backfill_clearance_to_students to only backfill if is_active is true
CREATE OR REPLACE FUNCTION "public"."backfill_clearance_to_students"() 
RETURNS "trigger" AS $$
BEGIN
  IF NEW.is_active = true THEN
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
