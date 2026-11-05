BEGIN;

CREATE TABLE public.academic_periods (
  period_id serial PRIMARY KEY,
  start_year integer NOT NULL CHECK (start_year BETWEEN 2000 AND 9998),
  end_year integer NOT NULL,
  term integer NOT NULL CHECK (term > 0 AND term <= 4),
  starts_on date,
  ends_on date,
  is_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_period_years CHECK (end_year = start_year + 1),
  CONSTRAINT academic_period_dates CHECK ((starts_on IS NULL AND ends_on IS NULL) OR (starts_on IS NOT NULL AND ends_on IS NOT NULL AND ends_on >= starts_on)),
  CONSTRAINT academic_period_unique UNIQUE(start_year, end_year, term)
);
CREATE UNIQUE INDEX academic_period_one_active ON public.academic_periods(is_active) WHERE is_active;
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_period_read ON public.academic_periods FOR SELECT TO authenticated USING(true);
CREATE POLICY academic_period_admin ON public.academic_periods FOR ALL TO authenticated
  USING ((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin')
  WITH CHECK ((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin');
GRANT SELECT ON public.academic_periods TO authenticated;
GRANT ALL ON public.academic_periods TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.academic_periods_period_id_seq TO service_role;

-- Confirmed by the administrator: existing records belong to 2026–2027, Term 1.
INSERT INTO public.academic_periods(start_year,end_year,term,is_active,activated_at)
VALUES(2026,2027,1,true,now());
CREATE FUNCTION public.active_academic_period_id() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT period_id FROM public.academic_periods WHERE is_active;
$$;
REVOKE ALL ON FUNCTION public.active_academic_period_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_academic_period_id() TO authenticated, service_role;

ALTER TABLE public.enrollments ADD COLUMN period_id integer REFERENCES public.academic_periods(period_id) ON DELETE RESTRICT;
ALTER TABLE public.clearance_records ADD COLUMN period_id integer REFERENCES public.academic_periods(period_id) ON DELETE RESTRICT;
ALTER TABLE public.clearance_records ADD COLUMN document_snapshot jsonb;
UPDATE public.enrollments SET period_id = public.active_academic_period_id();
UPDATE public.clearance_records SET period_id = public.active_academic_period_id();
-- Refuse to discard conflicting enrollments. Resolve any duplicates before retrying.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.enrollments GROUP BY student_id, period_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Multiple sections exist for a student in the legacy period. Resolve these before applying academic periods.';
  END IF;
END $$;
ALTER TABLE public.enrollments ALTER COLUMN period_id SET DEFAULT public.active_academic_period_id(), ALTER COLUMN period_id SET NOT NULL;
ALTER TABLE public.clearance_records ALTER COLUMN period_id SET DEFAULT public.active_academic_period_id(), ALTER COLUMN period_id SET NOT NULL;
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_student_section_unique;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_student_period_unique UNIQUE(student_id,period_id);
ALTER TABLE public.clearance_records DROP CONSTRAINT IF EXISTS clearance_records_user_template_unique;
ALTER TABLE public.clearance_records ADD CONSTRAINT clearance_records_user_template_period_unique UNIQUE(user_id,template_id,period_id);
CREATE INDEX enrollments_period_section ON public.enrollments(period_id,section_id);
CREATE INDEX clearance_records_period_user ON public.clearance_records(period_id,user_id);
CREATE INDEX clearance_records_period_template ON public.clearance_records(period_id,template_id);

-- Historical records must not disappear through a cascading account/template deletion.
ALTER TABLE public.clearance_records DROP CONSTRAINT IF EXISTS studentclearances_template_id_fkey;
ALTER TABLE public.clearance_records ADD CONSTRAINT studentclearances_template_id_fkey FOREIGN KEY(template_id) REFERENCES public.clearance_templates(template_id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.clearance_records DROP CONSTRAINT IF EXISTS clearance_records_user_id_fkey;
ALTER TABLE public.clearance_records ADD CONSTRAINT clearance_records_user_id_fkey FOREIGN KEY(user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE FUNCTION public.clearance_document_snapshot(p_user text,p_template integer,p_period integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('department',d.dept_name,'staff',s.staff_name,'staff_id',t.staff_id,
    'tier',t.tier,'is_active',t.is_active,'student_id',p_user,'student_name',COALESCE(st.student_name,person.staff_name),
    'course_name',c.course_name,'section_number',cs.section_number,'year',cs.year,
    'semester',p.term,'period_id',p.period_id,'academic_year',p.start_year||'-'||p.end_year)
  FROM public.clearance_templates t
  JOIN public.clearance_departments d ON d.dept_id=t.dept_id
  LEFT JOIN public.staffs s ON s.staff_id=t.staff_id
  LEFT JOIN public.students st ON st.student_id=p_user
  LEFT JOIN public.staffs person ON person.staff_id=p_user
  LEFT JOIN public.enrollments e ON e.student_id=p_user AND e.period_id=p_period
  LEFT JOIN public.course_sections cs ON cs.section_id=e.section_id
  LEFT JOIN public.courses c ON c.course_id=cs.course_id
  JOIN public.academic_periods p ON p.period_id=p_period
  WHERE t.template_id=p_template;
$$;
REVOKE ALL ON FUNCTION public.clearance_document_snapshot(text,integer,integer) FROM PUBLIC;
UPDATE public.clearance_records SET document_snapshot=public.clearance_document_snapshot(user_id,template_id,period_id);
CREATE FUNCTION public.capture_clearance_document() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  IF TG_OP='INSERT' OR NEW.status='Signed' THEN
    NEW.document_snapshot := public.clearance_document_snapshot(NEW.user_id,NEW.template_id,NEW.period_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER capture_clearance_document BEFORE INSERT OR UPDATE OF status ON public.clearance_records
FOR EACH ROW EXECUTE FUNCTION public.capture_clearance_document();

CREATE OR REPLACE FUNCTION public.assign_clearance_on_enrollment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  INSERT INTO public.clearance_records(user_id,template_id,period_id,status)
  SELECT NEW.student_id,t.template_id,NEW.period_id,'Pending' FROM public.course_sections cs
  JOIN public.clearance_templates t ON t.course_id=cs.course_id
  WHERE cs.section_id=NEW.section_id AND t.is_active
  ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tr_enrollment_create_clearance ON public.enrollments;
CREATE TRIGGER tr_enrollment_create_clearance AFTER INSERT OR UPDATE OF section_id ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.assign_clearance_on_enrollment();
CREATE OR REPLACE FUNCTION public.assign_clearance_on_staff_creation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  INSERT INTO public.clearance_records(user_id,template_id,period_id,status)
  SELECT NEW.staff_id,t.template_id,public.active_academic_period_id(),'Pending'
  FROM public.clearance_templates t WHERE t.course_id IS NULL AND t.is_active
  ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.backfill_clearance_to_students() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  IF NEW.is_active THEN
    IF NEW.course_id IS NOT NULL THEN
      INSERT INTO public.clearance_records(user_id,template_id,period_id,status)
      SELECT e.student_id,NEW.template_id,e.period_id,'Pending' FROM public.enrollments e
      JOIN public.course_sections cs ON cs.section_id=e.section_id
      WHERE cs.course_id=NEW.course_id AND e.period_id=public.active_academic_period_id()
      ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
    ELSE
      INSERT INTO public.clearance_records(user_id,template_id,period_id,status)
      SELECT s.staff_id,NEW.template_id,public.active_academic_period_id(),'Pending' FROM public.staffs s
      ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tr_staff_create_clearance ON public.staffs;
CREATE TRIGGER tr_staff_create_clearance AFTER INSERT ON public.staffs
FOR EACH ROW EXECUTE FUNCTION public.assign_clearance_on_staff_creation();
DROP TRIGGER IF EXISTS tr_template_backfill_clearances ON public.clearance_templates;
CREATE TRIGGER tr_template_backfill_clearances AFTER INSERT ON public.clearance_templates
FOR EACH ROW EXECUTE FUNCTION public.backfill_clearance_to_students();
CREATE OR REPLACE FUNCTION public.cleanup_clearance_on_drop() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  -- Preserve submissions/approvals; dropping an enrollment is not a history deletion.
  RETURN OLD;
END $$;

CREATE FUNCTION public.activate_academic_period(p_period_id integer,p_carry_enrollments boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE previous_id integer; target public.academic_periods;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Administrator service required'; END IF;
  PERFORM pg_advisory_xact_lock(77112026);
  SELECT * INTO target FROM public.academic_periods WHERE period_id=p_period_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Academic period not found'; END IF;
  IF target.is_active THEN RETURN; END IF;
  IF target.activated_at IS NOT NULL THEN RAISE EXCEPTION 'Archived academic periods cannot be reactivated'; END IF;
  SELECT period_id INTO previous_id FROM public.academic_periods WHERE is_active;
  IF EXISTS(SELECT 1 FROM public.academic_periods p WHERE p.is_active AND (p.start_year,p.term)>=(target.start_year,target.term)) THEN
    RAISE EXCEPTION 'The new academic period must follow the current period';
  END IF;
  -- Freeze old document data before template/staff/profile edits in the next period.
  UPDATE public.clearance_records r SET document_snapshot=public.clearance_document_snapshot(r.user_id,r.template_id,r.period_id)
    WHERE r.period_id=previous_id AND r.status<>'Signed';
  UPDATE public.academic_periods SET is_active=false WHERE is_active;
  UPDATE public.academic_periods SET is_active=true,activated_at=now() WHERE period_id=p_period_id;
  IF p_carry_enrollments THEN
    INSERT INTO public.enrollments(student_id,section_id,period_id)
    SELECT student_id,section_id,p_period_id FROM public.enrollments WHERE period_id=previous_id
    ON CONFLICT(student_id,period_id) DO NOTHING;
  END IF;
  INSERT INTO public.clearance_records(user_id,template_id,period_id,status)
  SELECT s.staff_id,t.template_id,p_period_id,'Pending' FROM public.staffs s
  CROSS JOIN public.clearance_templates t WHERE t.course_id IS NULL AND t.is_active
  ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.activate_academic_period(integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_academic_period(integer,boolean) TO service_role;

-- Current operational reads are explicitly scoped, including service-role queries.
CREATE VIEW public.current_clearance_records WITH(security_invoker=true) AS
 SELECT * FROM public.clearance_records r WHERE period_id=public.active_academic_period_id()
 AND EXISTS(SELECT 1 FROM public.clearance_templates t WHERE t.template_id=r.template_id AND t.is_active
   AND (t.course_id IS NULL OR EXISTS(SELECT 1 FROM public.enrollments e
     JOIN public.course_sections cs ON cs.section_id=e.section_id
     WHERE e.student_id=r.user_id AND e.period_id=r.period_id AND cs.course_id=t.course_id)));
CREATE VIEW public.current_enrollments WITH(security_invoker=true) AS
 SELECT * FROM public.enrollments WHERE period_id=public.active_academic_period_id();
CREATE VIEW public.current_clearance_tasks WITH(security_invoker=true) AS
 SELECT * FROM public.clearance_tasks t WHERE EXISTS(SELECT 1 FROM public.current_clearance_records r WHERE r.clearance_id=t.clearance_id);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.current_clearance_records,public.current_enrollments,public.current_clearance_tasks TO authenticated,service_role;

-- Authenticated clients cannot bypass the current-period views to mutate historical data.
CREATE POLICY clearance_current_period ON public.clearance_records AS RESTRICTIVE TO authenticated
 USING(period_id=public.active_academic_period_id()) WITH CHECK(period_id=public.active_academic_period_id());
CREATE POLICY enrollment_current_period ON public.enrollments AS RESTRICTIVE TO authenticated
 USING(period_id=public.active_academic_period_id()) WITH CHECK(period_id=public.active_academic_period_id());
CREATE POLICY tasks_current_period ON public.clearance_tasks AS RESTRICTIVE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.current_clearance_records r WHERE r.clearance_id=clearance_tasks.clearance_id))
 WITH CHECK(EXISTS(SELECT 1 FROM public.current_clearance_records r WHERE r.clearance_id=clearance_tasks.clearance_id));

-- Security-definer read is deliberately limited to the owner's saved documents or an admin.
CREATE FUNCTION public.clearance_document_history(p_user_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.users WHERE user_id=p_user_id AND auth_id=auth.uid())
    AND NOT coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin',false) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(row_to_json(result) ORDER BY result.period_id DESC),'[]'::jsonb) FROM (
    SELECT p.period_id,p.start_year,p.end_year,p.term,p.is_active,
      jsonb_agg(jsonb_build_object('clearance_id',r.clearance_id,'status',r.status,'signed_at',r.signed_at,'snapshot',r.document_snapshot) ORDER BY r.clearance_id) AS records
    FROM public.academic_periods p JOIN public.clearance_records r ON r.period_id=p.period_id
    WHERE r.user_id=p_user_id AND coalesce((r.document_snapshot->>'is_active')::boolean,true) GROUP BY p.period_id
  ) result);
END $$;
REVOKE ALL ON FUNCTION public.clearance_document_history(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clearance_document_history(text) TO authenticated;
-- Keep archived periods read-only even for background/service-role writers.
CREATE FUNCTION public.guard_period_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE record_period integer;
BEGIN
  IF TG_TABLE_NAME='clearance_tasks' THEN
    IF TG_OP='DELETE' THEN
      SELECT period_id INTO record_period FROM public.clearance_records WHERE clearance_id=OLD.clearance_id;
    ELSE
      SELECT period_id INTO record_period FROM public.clearance_records WHERE clearance_id=NEW.clearance_id;
      IF TG_OP='UPDATE' AND OLD.clearance_id<>NEW.clearance_id THEN RAISE EXCEPTION 'Tasks cannot move between clearance records'; END IF;
    END IF;
  ELSE
    IF TG_OP='INSERT' THEN record_period:=NEW.period_id; ELSE record_period:=OLD.period_id; END IF;
    IF TG_OP='UPDATE' AND OLD.period_id<>NEW.period_id THEN RAISE EXCEPTION 'Records cannot move between academic periods'; END IF;
  END IF;
  IF record_period IS DISTINCT FROM public.active_academic_period_id() THEN
    RAISE EXCEPTION 'Archived academic-period records are read-only';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_clearance_period BEFORE INSERT OR UPDATE OR DELETE ON public.clearance_records
 FOR EACH ROW EXECUTE FUNCTION public.guard_period_history();
CREATE TRIGGER guard_enrollment_period BEFORE INSERT OR UPDATE OR DELETE ON public.enrollments
 FOR EACH ROW EXECUTE FUNCTION public.guard_period_history();
CREATE TRIGGER guard_task_period BEFORE INSERT OR UPDATE OR DELETE ON public.clearance_tasks
 FOR EACH ROW EXECUTE FUNCTION public.guard_period_history();

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
     AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='academic_periods') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_periods;
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
