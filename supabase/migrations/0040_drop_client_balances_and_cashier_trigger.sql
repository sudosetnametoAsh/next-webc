-- Migration: 0040_drop_client_balances_and_cashier_trigger.sql
-- Description: Drops client_balances table and obsolete trigger_auto_clear_cashier_unified trigger.
--              Cashier settlement is now handled event-driven directly by the webhook API.

-- 1. Drop the trigger from client_balances
DROP TRIGGER IF EXISTS trigger_auto_clear_cashier_unified ON "public"."client_balances";

-- 2. Drop the trigger function
DROP FUNCTION IF EXISTS "public"."auto_clear_cashier_unified"();

-- 3. Drop the client_balances table (CASCADE removes foreign keys and RLS policies)
DROP TABLE IF EXISTS "public"."client_balances" CASCADE;
