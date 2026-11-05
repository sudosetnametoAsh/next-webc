-- Apply before deploying the notification visibility changes.
-- Restrictive policy composes with existing permissive SELECT policies.
BEGIN;
DROP POLICY IF EXISTS "bottleneck notifications are admin only" ON public.notifications;
CREATE POLICY "bottleneck notifications are admin only" ON public.notifications
AS RESTRICTIVE FOR SELECT TO anon, authenticated
USING (
  NOT (
    lower(coalesce(category, '')) = 'bottleneck'
    OR lower(coalesce(title, '')) LIKE '%bottleneck%'
    OR lower(coalesce(metadata->>'type', '')) = 'bottleneck'
  )
  OR coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin', false)
);
COMMIT;
