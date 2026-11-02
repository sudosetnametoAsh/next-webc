-- Migration: 0024_add_clearance_records_created_at
-- Adds created_at timestamp to clearance_records for temporal phase dwell and bottleneck tracking

ALTER TABLE "public"."clearance_records" 
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Backfill existing clearance records with baseline timestamp if any are null or defaults
UPDATE "public"."clearance_records"
SET "created_at" = '2026-04-20 08:00:00+00'::timestamptz
WHERE "created_at" >= '2026-10-01'::timestamptz;
