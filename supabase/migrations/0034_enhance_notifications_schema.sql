-- Migration: 0034_enhance_notifications_schema.sql
-- Description: Adds missing columns (target_role, category, department_id, metadata, section_id, course_id)
--              to notifications table, loosens user_id NOT NULL constraint for role-based notifications,
--              updates type_check constraint, adds foreign keys, indexes, RLS policies, and full replica identity.

-- 1. Add missing columns to notifications table if not already present
ALTER TABLE "public"."notifications"
  ADD COLUMN IF NOT EXISTS "department_id" integer,
  ADD COLUMN IF NOT EXISTS "target_role" character varying(20),
  ADD COLUMN IF NOT EXISTS "category" character varying(50),
  ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "section_id" integer,
  ADD COLUMN IF NOT EXISTS "course_id" integer;

-- 2. Make user_id nullable for role/department-wide broadcast notifications
ALTER TABLE "public"."notifications" 
  ALTER COLUMN "user_id" DROP NOT NULL;

-- 3. Update type_check constraint to support Success, Alert, etc.
ALTER TABLE "public"."notifications" 
  DROP CONSTRAINT IF EXISTS "type_check";

ALTER TABLE "public"."notifications" 
  ADD CONSTRAINT "type_check" 
  CHECK ("type" = ANY (ARRAY['System'::text, 'Warning'::text, 'Info'::text, 'Success'::text, 'Alert'::text, 'system'::text, 'warning'::text, 'info'::text, 'success'::text, 'alert'::text]));

-- 4. Foreign key constraints
ALTER TABLE "public"."notifications"
  DROP CONSTRAINT IF EXISTS "notif_user_id_fkey",
  ADD CONSTRAINT "notif_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") 
    ON UPDATE CASCADE ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notif_dept_id_fkey'
  ) THEN
    ALTER TABLE "public"."notifications"
      ADD CONSTRAINT "notif_dept_id_fkey" 
        FOREIGN KEY ("department_id") REFERENCES "public"."clearance_departments"("dept_id") 
        ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notif_section_id_fkey'
  ) THEN
    ALTER TABLE "public"."notifications"
      ADD CONSTRAINT "notif_section_id_fkey" 
        FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("section_id") 
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notif_course_id_fkey'
  ) THEN
    ALTER TABLE "public"."notifications"
      ADD CONSTRAINT "notif_course_id_fkey" 
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") 
        ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Performance indexes for notification queries
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" 
  ON "public"."notifications"("user_id");

CREATE INDEX IF NOT EXISTS "idx_notifications_target_role" 
  ON "public"."notifications"("target_role");

CREATE INDEX IF NOT EXISTS "idx_notifications_department_id" 
  ON "public"."notifications"("department_id");

-- 6. Enable RLS and setup policies for Realtime delivery
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view own notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "allow read notifications" ON "public"."notifications";
CREATE POLICY "allow read notifications" 
  ON "public"."notifications" 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "allow insert notifications" ON "public"."notifications";
CREATE POLICY "allow insert notifications" 
  ON "public"."notifications" 
  FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "users can update own notifications" ON "public"."notifications";
CREATE POLICY "users can update own notifications" 
  ON "public"."notifications" 
  FOR UPDATE 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow delete notifications" ON "public"."notifications";
CREATE POLICY "allow delete notifications" 
  ON "public"."notifications" 
  FOR DELETE 
  TO anon, authenticated 
  USING (true);

-- 7. Replica identity for Realtime updates
ALTER TABLE "public"."notifications" REPLICA IDENTITY FULL;
ALTER TABLE "public"."clearance_records" REPLICA IDENTITY FULL;
ALTER TABLE "public"."clearance_tasks" REPLICA IDENTITY FULL;
