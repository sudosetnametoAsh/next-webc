-- Migration: 0033_add_staff_weekly_schedule_and_early_out_date.sql
-- Description: Adds weekly_schedule and early_out_date columns to staffs table if not already present

ALTER TABLE "public"."staffs" 
  ADD COLUMN IF NOT EXISTS "weekly_schedule" jsonb,
  ADD COLUMN IF NOT EXISTS "early_out_date" character varying(10);
