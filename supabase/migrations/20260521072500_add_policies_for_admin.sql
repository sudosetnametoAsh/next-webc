DROP POLICY IF EXISTS "admin can manage courses" ON "public"."courses";
CREATE POLICY "admin can manage courses"
ON "public"."courses"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (((((auth.jwt() -> 'user_metadata'::text) -> 'custom_claims'::text) -> 'roles'::text) ->> 0) = 'Admin'::text)
) WITH CHECK (
  (((((auth.jwt() -> 'user_metadata'::text) -> 'custom_claims'::text) -> 'roles'::text) ->> 0) = 'Admin'::text)
);

DROP POLICY IF EXISTS "admin can view students" ON "public"."students";
CREATE POLICY "admin can view students"
ON "public"."students"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (((((auth.jwt() -> 'user_metadata'::text) -> 'custom_claims'::text) -> 'roles'::text) ->> 0) = 'Admin'::text)
);