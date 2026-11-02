-- 1. Enable ON UPDATE CASCADE on all foreign keys referencing public.users(user_id)
ALTER TABLE "public"."students" 
  DROP CONSTRAINT IF EXISTS "students_student_id_fkey",
  ADD CONSTRAINT "students_student_id_fkey" 
  FOREIGN KEY ("student_id") REFERENCES "public"."users"("user_id") 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."clearance_records" 
  DROP CONSTRAINT IF EXISTS "clearance_records_user_id_fkey",
  ADD CONSTRAINT "clearance_records_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."notifications" 
  DROP CONSTRAINT IF EXISTS "notif_user_id_fkey",
  ADD CONSTRAINT "notif_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."staffs" 
  DROP CONSTRAINT IF EXISTS "staffs_staff_id_fkey",
  ADD CONSTRAINT "staffs_staff_id_fkey" 
  FOREIGN KEY ("staff_id") REFERENCES "public"."users"("user_id") 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."clearance_logs" 
  DROP CONSTRAINT IF EXISTS "activity_log_staff_id_fkey",
  ADD CONSTRAINT "activity_log_staff_id_fkey" 
  FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("staff_id") 
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 2. Update user_id from 02000609703 to 02000248919 in users table (cascades to students, enrollments, clearance_records, etc.)
UPDATE "public"."users" 
SET "user_id" = '02000248919' 
WHERE "user_id" = '02000609703';

-- 3. Update storage objects and clearance task dropbox links matching previous student id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    BEGIN
      UPDATE "storage"."objects" 
      SET "name" = REPLACE("name", '02000609703', '02000248919') 
      WHERE "name" LIKE '%02000609703%';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

UPDATE "public"."clearance_tasks" 
SET "dropbox" = REPLACE("dropbox", '02000609703', '02000248919') 
WHERE "dropbox" LIKE '%02000609703%';

UPDATE "public"."clearance_tasks" 
SET "ai_audit_report" = REPLACE("ai_audit_report"::text, '02000609703', '02000248919')::jsonb 
WHERE "ai_audit_report"::text LIKE '%02000609703%';
