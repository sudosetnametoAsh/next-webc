-- All other public timestamp columns already use timestamptz.
-- Signing writers use toISOString(), so legacy signed_at values are UTC.
-- Explicit AT TIME ZONE avoids shifting history based on the migration session timezone.
-- Existing timestamptz columns must not be shifted or converted to local wall time.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clearance_records'
      AND column_name = 'signed_at' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE public.clearance_records
      ALTER COLUMN signed_at TYPE timestamp with time zone
      USING signed_at AT TIME ZONE 'UTC';
  END IF;
END;
$$;
