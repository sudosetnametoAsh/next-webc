-- Add due_date column to clearance_tasks table
ALTER TABLE "public"."clearance_tasks" ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;
