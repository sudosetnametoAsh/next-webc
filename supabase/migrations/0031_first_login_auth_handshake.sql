-- Migration: 0031_first_login_auth_handshake.sql
-- Description: Automates linking predefined university IDs to Supabase Auth UUID (auth_id)
--              upon first login via SSO / Azure AD / Email, and updates the token hook
--              with self-healing fallback.

-- 1. Create the first-login handshake trigger function
CREATE OR REPLACE FUNCTION "public"."handle_auth_user_first_login"()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Extract email from auth record or raw metadata
  v_user_email := COALESCE(
    NEW.email,
    NEW.raw_user_meta_data->>'email',
    NEW.raw_user_meta_data->'custom_claims'->>'email',
    NEW.raw_user_meta_data->>'preferred_username'
  );

  IF v_user_email IS NOT NULL THEN
    -- Match the pre-enrolled user by email and bind their auth_id
    UPDATE "public"."users"
    SET "auth_id" = NEW.id
    WHERE LOWER("email") = LOWER(v_user_email)
      AND ("auth_id" IS NULL OR "auth_id" != NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set ownership
ALTER FUNCTION "public"."handle_auth_user_first_login"() OWNER TO postgres;

-- 2. Attach trigger to auth.users
DROP TRIGGER IF EXISTS trigger_handle_auth_user_first_login ON auth.users;

CREATE TRIGGER trigger_handle_auth_user_first_login
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW
EXECUTE FUNCTION "public"."handle_auth_user_first_login"();

-- 3. One-time backfill: Link any existing auth.users to public.users where auth_id is NULL
UPDATE "public"."users" u
SET "auth_id" = a.id
FROM auth.users a
WHERE (
  LOWER(u.email) = LOWER(a.email) 
  OR LOWER(u.email) = LOWER(a.raw_user_meta_data->>'email')
  OR LOWER(u.email) = LOWER(a.raw_user_meta_data->>'preferred_username')
)
AND u.auth_id IS NULL;

-- 4. Update custom_access_token_hook with self-healing email fallback
CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" jsonb)
RETURNS jsonb AS $$
DECLARE
  v_claims jsonb;
  v_custom_user_id character varying;
  v_azure_role character varying;
  v_department character varying;
  v_email text;
BEGIN
  -- Extract roles and claims
  v_azure_role := event->'claims'->'user_metadata'->'custom_claims'->'roles'->>0;
  v_claims := event->'claims';

  -- 1. Try finding predefined university user_id by auth_id
  SELECT user_id INTO v_custom_user_id
  FROM public.users
  WHERE auth_id = (event->>'user_id')::uuid;

  -- 2. Self-healing fallback: If not found by auth_id, check email and link immediately
  IF v_custom_user_id IS NULL THEN
    v_email := COALESCE(
      event->'claims'->>'email',
      event->'claims'->'user_metadata'->>'email',
      event->'claims'->'user_metadata'->>'preferred_username'
    );

    IF v_email IS NOT NULL THEN
      SELECT user_id INTO v_custom_user_id
      FROM public.users
      WHERE LOWER(email) = LOWER(v_email)
      LIMIT 1;

      IF v_custom_user_id IS NOT NULL THEN
        UPDATE public.users
        SET auth_id = (event->>'user_id')::uuid
        WHERE user_id = v_custom_user_id;
      END IF;
    END IF;
  END IF;

  -- 3. Inject custom user_id into JWT claims
  IF v_custom_user_id IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{user_id}', to_jsonb(v_custom_user_id));

    -- If Department role, inject assigned department name
    IF v_azure_role = 'Department' THEN
      SELECT DISTINCT d.dept_name INTO v_department
      FROM public.clearance_departments d
      JOIN public.clearance_templates ct ON d.dept_id = ct.dept_id
      WHERE ct.staff_id = v_custom_user_id
      LIMIT 1;

      IF v_department IS NOT NULL THEN
        v_claims := jsonb_set(v_claims, '{department}', to_jsonb(v_department));
      END IF;
    END IF;
  END IF;

  event := jsonb_set(event, '{claims}', v_claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Permissions
GRANT ALL ON FUNCTION "public"."handle_auth_user_first_login"() TO "postgres";
GRANT ALL ON FUNCTION "public"."handle_auth_user_first_login"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_auth_user_first_login"() TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."custom_access_token_hook"(jsonb) TO "postgres";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"(jsonb) TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"(jsonb) TO "supabase_auth_admin";
