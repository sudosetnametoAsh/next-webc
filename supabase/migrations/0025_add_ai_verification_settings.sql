-- Migration: 0025_add_ai_verification_settings
-- Adds ai_verification_mode and ai_confidence_threshold to clearance_departments
-- Adds ai_audit_report to clearance_tasks

ALTER TABLE "public"."clearance_departments"
ADD COLUMN IF NOT EXISTS "ai_verification_mode" varchar(20) DEFAULT 'two_factor' NOT NULL,
ADD COLUMN IF NOT EXISTS "ai_confidence_threshold" integer DEFAULT 85 NOT NULL;

ALTER TABLE "public"."clearance_tasks"
ADD COLUMN IF NOT EXISTS "ai_audit_report" jsonb;
