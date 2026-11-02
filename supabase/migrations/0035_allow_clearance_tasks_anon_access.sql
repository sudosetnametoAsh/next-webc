-- Migration: 0035_allow_clearance_tasks_anon_access.sql
-- Enables seamless browser and realtime reads and updates for clearance_tasks under anon/authenticated roles

ALTER TABLE "public"."clearance_tasks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow read clearance_tasks" ON "public"."clearance_tasks";
CREATE POLICY "allow read clearance_tasks"
  ON "public"."clearance_tasks"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "allow update clearance_tasks" ON "public"."clearance_tasks";
CREATE POLICY "allow update clearance_tasks"
  ON "public"."clearance_tasks"
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
