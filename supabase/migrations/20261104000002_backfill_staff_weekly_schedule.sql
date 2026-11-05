-- Apply BEFORE deploying the weekly-only application. Preserve saved weekly schedules.
-- Some cloud databases already removed legacy hour columns outside migration history.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staffs' AND column_name='time_in')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staffs' AND column_name='time_out') THEN
    UPDATE public.staffs
    SET weekly_schedule = (
      SELECT jsonb_object_agg(day, jsonb_build_object(
        'active', day NOT IN ('sat', 'sun'),
        'time_in', to_char(time_in, 'HH24:MI'),
        'time_out', to_char(time_out, 'HH24:MI')
      ))
      FROM unnest(ARRAY['mon','tue','wed','thu','fri','sat','sun']) AS day
    )
    WHERE (weekly_schedule IS NULL OR weekly_schedule = '{}'::jsonb)
      AND time_in IS NOT NULL AND time_out IS NOT NULL AND time_out > time_in;
  ELSE
    RAISE NOTICE 'Legacy staff hour columns already removed; keeping current weekly schedules.';
  END IF;
END $$;
