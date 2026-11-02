-- Migration: 0037_drop_legacy_students_balance.sql
-- Description: Drop obsolete balance column from students table as client_balances is the unified single source of truth.

ALTER TABLE "public"."students"
  DROP COLUMN IF EXISTS "balance";

-- Drop obsolete standalone auto_clear_cashier trigger function (replaced by auto_clear_cashier_unified on client_balances)
DROP FUNCTION IF EXISTS "public"."auto_clear_cashier"();
