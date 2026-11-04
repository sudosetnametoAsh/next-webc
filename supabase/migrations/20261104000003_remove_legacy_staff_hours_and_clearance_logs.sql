-- Apply AFTER the weekly-only application is deployed and old instances have stopped.
-- Existing clearance activity history is permanently deleted.
ALTER TABLE public.staffs DROP COLUMN IF EXISTS time_in, DROP COLUMN IF EXISTS time_out;
DROP TABLE IF EXISTS public.clearance_logs;
