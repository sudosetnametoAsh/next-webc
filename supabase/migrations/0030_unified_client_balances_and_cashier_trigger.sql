-- Migration: 0030_unified_client_balances_and_cashier_trigger.sql
-- Description: Creates unified client_balances and cashier_webhook_events tables,
--              migrates student balances, drops obsolete student trigger,
--              and introduces the unified Cashier auto-clear trigger for both students and staff.

-- 1. Create client_balances table
CREATE TABLE IF NOT EXISTS "public"."client_balances" (
  "user_id" VARCHAR(50) PRIMARY KEY,
  "balance" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "last_settled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "client_balances_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") 
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- 2. Create cashier_webhook_events audit & idempotency table
CREATE TABLE IF NOT EXISTS "public"."cashier_webhook_events" (
  "event_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(50),
  "transaction_ref" VARCHAR(100) UNIQUE,
  "amount_paid" NUMERIC(12, 2),
  "remaining_balance" NUMERIC(12, 2),
  "payload" JSONB,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cashier_webhook_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id")
    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_cashier_webhook_events_user_id" 
  ON "public"."cashier_webhook_events"("user_id");

CREATE INDEX IF NOT EXISTS "idx_cashier_webhook_events_transaction_ref" 
  ON "public"."cashier_webhook_events"("transaction_ref");

-- 3. Backfill initial balances from existing students table into client_balances
INSERT INTO "public"."client_balances" ("user_id", "balance", "last_settled_at", "updated_at")
SELECT 
  s."student_id", 
  COALESCE(s."balance", 0)::numeric(12, 2),
  CASE WHEN COALESCE(s."balance", 0) <= 0 THEN NOW() ELSE NULL END,
  NOW()
FROM "public"."students" s
WHERE s."student_id" IN (SELECT "user_id" FROM "public"."users")
ON CONFLICT ("user_id") DO UPDATE 
SET "balance" = EXCLUDED."balance",
    "last_settled_at" = EXCLUDED."last_settled_at",
    "updated_at" = NOW();

-- 4. Drop the obsolete student-only Cashier trigger
DROP TRIGGER IF EXISTS trigger_auto_clear_cashier ON "public"."students";

-- 5. Create the unified Cashier auto-clear trigger function (handles both students and staff)
CREATE OR REPLACE FUNCTION "public"."auto_clear_cashier_unified"()
RETURNS TRIGGER AS $$
BEGIN
  -- When balance is fully settled (zero or negative)
  IF NEW.balance <= 0 THEN

     -- Mark the Cashier clearance record as Signed for this user (student or staff)
     UPDATE "public"."clearance_records" cr
     SET status = 'Signed', 
         signed_at = NOW()
     WHERE cr.user_id = NEW.user_id
       AND cr.status != 'Signed'
       AND cr.template_id IN (
         SELECT ct.template_id 
         FROM "public"."clearance_templates" ct
         JOIN "public"."clearance_departments" cd ON cd.dept_id = ct.dept_id
         WHERE cd.dept_name = 'Cashier'
       );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach the trigger to client_balances
DROP TRIGGER IF EXISTS trigger_auto_clear_cashier_unified ON "public"."client_balances";

CREATE TRIGGER trigger_auto_clear_cashier_unified
AFTER INSERT OR UPDATE OF balance ON "public"."client_balances"
FOR EACH ROW
EXECUTE FUNCTION "public"."auto_clear_cashier_unified"();

-- 7. Configure Row Level Security (RLS)
ALTER TABLE "public"."client_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cashier_webhook_events" ENABLE ROW LEVEL SECURITY;

-- client_balances Policies
DROP POLICY IF EXISTS "users can view own balance" ON "public"."client_balances";
CREATE POLICY "users can view own balance" 
  ON "public"."client_balances" 
  FOR SELECT 
  TO authenticated 
  USING (user_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "staff and admin can view client balances" ON "public"."client_balances";
CREATE POLICY "staff and admin can view client balances" 
  ON "public"."client_balances" 
  FOR SELECT 
  TO authenticated 
  USING (
    (auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff', 'Admin']
  );

DROP POLICY IF EXISTS "cashier staff and admin can manage client balances" ON "public"."client_balances";
CREATE POLICY "cashier staff and admin can manage client balances" 
  ON "public"."client_balances" 
  FOR ALL 
  TO authenticated 
  USING (
    (auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']
    OR (
      (auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff']
      AND EXISTS (
        SELECT 1 FROM public.clearance_templates ct
        JOIN public.clearance_departments cd ON cd.dept_id = ct.dept_id
        WHERE cd.dept_name = 'Cashier'
          AND ct.staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']
    OR (
      (auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff']
      AND EXISTS (
        SELECT 1 FROM public.clearance_templates ct
        JOIN public.clearance_departments cd ON cd.dept_id = ct.dept_id
        WHERE cd.dept_name = 'Cashier'
          AND ct.staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())
      )
    )
  );

-- cashier_webhook_events Policies
DROP POLICY IF EXISTS "admin and cashier staff can view webhook logs" ON "public"."cashier_webhook_events";
CREATE POLICY "admin and cashier staff can view webhook logs" 
  ON "public"."cashier_webhook_events" 
  FOR SELECT 
  TO authenticated 
  USING (
    (auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Admin']
    OR (
      (auth.jwt() -> 'user_metadata' -> 'custom_claims' -> 'roles') ?| ARRAY['Department', 'Staff']
      AND EXISTS (
        SELECT 1 FROM public.clearance_templates ct
        JOIN public.clearance_departments cd ON cd.dept_id = ct.dept_id
        WHERE cd.dept_name = 'Cashier'
          AND ct.staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid())
      )
    )
  );

-- 8. Enable REPLICA IDENTITY FULL for Supabase Realtime listeners
ALTER TABLE "public"."client_balances" REPLICA IDENTITY FULL;
