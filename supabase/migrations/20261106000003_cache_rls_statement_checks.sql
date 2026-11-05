BEGIN;
-- Non-unique: preserve existing identity data while accelerating auth-to-user lookups.
CREATE INDEX IF NOT EXISTS users_auth_id_idx ON public.users(auth_id) WHERE auth_id IS NOT NULL;
-- Scalar subqueries become InitPlans: evaluate request-constant checks once, not per row.
DO $$
DECLARE tbl text; own_clause text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['users','students','staffs','courses','course_sections','clearance_departments'] LOOP
  own_clause:=CASE tbl WHEN 'users' THEN 'auth_id=(SELECT auth.uid())' WHEN 'students' THEN 'student_id=(SELECT public.period_user_id())' WHEN 'staffs' THEN 'staff_id=(SELECT public.period_user_id())' ELSE 'false' END;
  EXECUTE format('ALTER POLICY period_directory_read ON public.%I USING((SELECT public.period_directory_access()) OR %s)',tbl,own_clause);
 END LOOP;
END $$;
ALTER POLICY clearance_current_period ON public.clearance_records
 USING(period_id=(SELECT public.active_academic_period_id()) AND ((SELECT public.period_can_manage(public.active_academic_period_id())) OR (user_id=(SELECT public.period_user_id()) AND (SELECT public.period_can_read(public.active_academic_period_id(),public.period_user_id())))))
 WITH CHECK(period_id=(SELECT public.active_academic_period_id()) AND (SELECT public.period_can_manage(public.active_academic_period_id())));
ALTER POLICY clearance_manager_update ON public.clearance_records USING((SELECT public.period_can_manage(public.active_academic_period_id()))) WITH CHECK((SELECT public.period_can_manage(public.active_academic_period_id())));
ALTER POLICY enrollment_current_period ON public.enrollments
 USING(period_id=(SELECT public.active_academic_period_id()) AND ((SELECT public.period_can_manage(public.active_academic_period_id())) OR (student_id=(SELECT public.period_user_id()) AND (SELECT public.period_can_read(public.active_academic_period_id(),public.period_user_id())))))
 WITH CHECK(period_id=(SELECT public.active_academic_period_id()) AND (SELECT public.period_can_manage(public.active_academic_period_id())));
ALTER POLICY templates_period_access ON public.clearance_templates USING((SELECT public.period_can_read(public.active_academic_period_id(),public.period_user_id())));
ALTER POLICY staff_period_read ON public.staff_enrollments
 USING((period_id=(SELECT public.active_academic_period_id()) AND (SELECT public.period_can_manage(public.active_academic_period_id()))) OR staff_id=(SELECT public.period_user_id()));
ALTER POLICY notifications_period_access ON public.notifications USING((SELECT public.period_can_read(public.active_academic_period_id(),public.period_user_id()))) WITH CHECK((SELECT public.period_can_read(public.active_academic_period_id(),public.period_user_id())));
ALTER POLICY tasks_current_period ON public.clearance_tasks
 USING(EXISTS(SELECT 1 FROM public.clearance_records r WHERE r.clearance_id=clearance_tasks.clearance_id AND r.period_id=(SELECT public.active_academic_period_id()) AND ((SELECT public.period_can_manage(public.active_academic_period_id())) OR (r.user_id=(SELECT public.period_user_id()) AND (SELECT public.period_can_read(public.active_academic_period_id(),public.period_user_id()))))))
 WITH CHECK(EXISTS(SELECT 1 FROM public.clearance_records r WHERE r.clearance_id=clearance_tasks.clearance_id AND r.period_id=(SELECT public.active_academic_period_id()) AND ((SELECT public.period_can_manage(public.active_academic_period_id())) OR (r.user_id=(SELECT public.period_user_id()) AND (SELECT public.period_can_read(public.active_academic_period_id(),public.period_user_id())) AND clearance_tasks.status IN('Submitted','Rejected')))));
NOTIFY pgrst,'reload schema';
COMMIT;
