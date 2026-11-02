-- Migration: 0038_drop_obsolete_auto_clear_registrar_trigger.sql
-- Description: Drop obsolete auto_clear_registrar trigger on clearance_records
--              Registrar is a tier 3 department signed off by staff once all prerequisites are met.
--              The obsolete trigger caused infinite recursion (stack depth limit exceeded) on update.

DROP TRIGGER IF EXISTS trigger_auto_clear_registrar ON "public"."clearance_records";
DROP FUNCTION IF EXISTS "public"."auto_clear_registrar"();
