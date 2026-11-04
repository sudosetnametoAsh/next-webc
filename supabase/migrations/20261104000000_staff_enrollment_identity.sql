-- Atomic, service-only enrollment. Keep internal staff IDs stable across imports.
CREATE OR REPLACE FUNCTION public.enroll_staff_identity(
  p_email text, p_name text, p_staff_id text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_name text := btrim(p_name);
  v_requested text := nullif(btrim(p_staff_id), '');
  v_id text;
  v_ids text[];
  v_auth uuid;
  v_auth_matches uuid[];
  v_link_ids text[];
  v_linked uuid;
  v_attempt integer;
BEGIN
  IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR coalesce(v_name, '') = '' THEN
    RAISE EXCEPTION 'Staff name and a valid email are required';
  END IF;
  IF v_requested IS NOT NULL AND length(v_requested) > 11 THEN
    RAISE EXCEPTION 'Staff ID exceeds 11 characters';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('staff-enroll:' || v_email, 0));
  SELECT array_agg(user_id) INTO v_ids FROM public.users WHERE lower(btrim(email)) = v_email;
  IF coalesce(cardinality(v_ids), 0) > 1 THEN
    RAISE EXCEPTION 'Multiple accounts use this email. Resolve the duplicate accounts before enrollment';
  END IF;
  v_id := v_ids[1];
  SELECT array_agg(id) INTO v_auth_matches FROM auth.users WHERE lower(btrim(email)) = v_email;
  IF coalesce(cardinality(v_auth_matches), 0) > 1 THEN
    RAISE EXCEPTION 'Multiple login identities use this email';
  END IF;
  v_auth := v_auth_matches[1];
  IF v_auth IS NOT NULL THEN
    SELECT array_agg(user_id) INTO v_link_ids FROM public.users WHERE auth_id = v_auth;
    IF coalesce(cardinality(v_link_ids), 0) > 1 THEN
      RAISE EXCEPTION 'Multiple accounts are linked to this login identity';
    END IF;
    IF v_id IS NOT NULL AND v_link_ids[1] IS NOT NULL AND v_id <> v_link_ids[1] THEN
      RAISE EXCEPTION 'Email and login identity belong to different accounts';
    END IF;
    v_id := coalesce(v_id, v_link_ids[1]);
  END IF;
  IF v_id IS NOT NULL THEN
    IF v_requested IS NOT NULL AND v_requested <> v_id THEN
      RAISE EXCEPTION 'This email already belongs to a different internal ID';
    END IF;
    IF EXISTS (SELECT 1 FROM public.students WHERE student_id = v_id)
       AND NOT EXISTS (SELECT 1 FROM public.staffs WHERE staff_id = v_id) THEN
      RAISE EXCEPTION 'This email belongs to a student account';
    END IF;
    IF length(v_id) > 11 THEN RAISE EXCEPTION 'Existing internal ID exceeds the clearance ID limit'; END IF;
  END IF;
  IF v_id IS NULL THEN
    IF v_requested IS NOT NULL THEN
      -- A conflicting ID must fail; never overwrite another person's email/login.
      INSERT INTO public.users(user_id, email, auth_id) VALUES (v_requested, v_email, v_auth);
      v_id := v_requested;
    ELSE
      FOR v_attempt IN 1..5 LOOP
        v_id := 'S' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
        BEGIN
          INSERT INTO public.users(user_id, email, auth_id) VALUES (v_id, v_email, v_auth);
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          IF v_attempt = 5 THEN RAISE; END IF;
        END;
      END LOOP;
    END IF;
  ELSE
    SELECT auth_id INTO v_linked FROM public.users WHERE user_id = v_id FOR UPDATE;
    IF v_linked IS NOT NULL AND v_auth IS NOT NULL AND v_linked <> v_auth THEN
      RAISE EXCEPTION 'This account is linked to a different login identity';
    END IF;
    UPDATE public.users SET email = v_email, auth_id = coalesce(auth_id, v_auth) WHERE user_id = v_id;
  END IF;
  -- Any failure, including automatic clearance creation, rolls back the identity too.
  INSERT INTO public.staffs(staff_id, staff_name) VALUES (v_id, v_name)
    ON CONFLICT (staff_id) DO UPDATE SET staff_name = EXCLUDED.staff_name;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enroll_staff_identity(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_staff_identity(text, text, text) TO service_role;
