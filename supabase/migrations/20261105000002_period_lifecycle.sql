BEGIN;
ALTER TABLE public.academic_periods ADD COLUMN state text NOT NULL DEFAULT 'preparing' CHECK(state IN('preparing','open','ended'));
ALTER TABLE public.academic_periods ADD COLUMN opens_at timestamptz;
ALTER TABLE public.academic_periods ADD COLUMN start_requested_at timestamptz;
ALTER TABLE public.academic_periods ADD COLUMN ended_at timestamptz;
ALTER TABLE public.academic_periods ADD COLUMN source_period_id integer REFERENCES public.academic_periods(period_id) ON DELETE RESTRICT;
UPDATE public.academic_periods SET state=CASE WHEN is_active THEN 'open' WHEN activated_at IS NOT NULL THEN 'ended' ELSE 'preparing' END;
ALTER TABLE public.academic_periods ADD CONSTRAINT period_ended_inactive CHECK(state<>'ended' OR NOT is_active);
CREATE TABLE public.period_staff_enrollments (
 period_id integer NOT NULL REFERENCES public.academic_periods(period_id) ON DELETE RESTRICT,
 staff_id varchar(11) NOT NULL REFERENCES public.staffs(staff_id) ON UPDATE CASCADE ON DELETE RESTRICT,
 PRIMARY KEY(period_id,staff_id)
);
CREATE TABLE public.period_department_staff (
 period_id integer NOT NULL REFERENCES public.academic_periods(period_id) ON DELETE RESTRICT,
 staff_id varchar(11) NOT NULL REFERENCES public.staffs(staff_id) ON UPDATE CASCADE ON DELETE RESTRICT,
 PRIMARY KEY(period_id,staff_id)
);
-- Preserve today's roster, including staff clients with no requirements yet.
INSERT INTO public.period_staff_enrollments SELECT p.period_id,s.staff_id FROM public.academic_periods p CROSS JOIN public.staffs s WHERE p.is_active;
INSERT INTO public.period_staff_enrollments SELECT DISTINCT r.period_id,r.user_id FROM public.clearance_records r JOIN public.staffs s ON s.staff_id=r.user_id JOIN public.clearance_templates t ON t.template_id=r.template_id WHERE t.course_id IS NULL ON CONFLICT DO NOTHING;
INSERT INTO public.period_department_staff SELECT DISTINCT p.period_id,t.staff_id FROM public.academic_periods p CROSS JOIN public.clearance_templates t WHERE p.is_active AND t.is_active ON CONFLICT DO NOTHING;

DO $$ BEGIN
 IF to_regclass('auth.users') IS NOT NULL THEN
  INSERT INTO public.period_department_staff(period_id,staff_id)
  SELECT p.period_id,s.staff_id FROM public.academic_periods p CROSS JOIN public.staffs s
  JOIN public.users u ON u.user_id=s.staff_id JOIN auth.users a ON a.id=u.auth_id
  WHERE p.is_active AND coalesce((a.raw_user_meta_data->'custom_claims'->'roles') ? 'Department',false)
  ON CONFLICT DO NOTHING;
 END IF;
END $$;

CREATE FUNCTION public.period_is_open(p_id integer) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce((SELECT is_active AND (state='open' OR(state='preparing' AND start_requested_at IS NOT NULL AND opens_at<=now())) FROM public.academic_periods WHERE period_id=p_id),false);
$$;
CREATE FUNCTION public.period_user_id() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT user_id::text FROM public.users WHERE auth_id=auth.uid() $$;
CREATE FUNCTION public.period_can_manage(p_id integer) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.academic_periods WHERE period_id=p_id AND is_active AND state<>'ended') AND
 (coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin',false) OR
 (coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Department',false) AND EXISTS(SELECT 1 FROM public.period_department_staff WHERE period_id=p_id AND staff_id=public.period_user_id())));
$$;
CREATE FUNCTION public.period_client_enrolled(p_id integer,p_user text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.enrollments WHERE period_id=p_id AND student_id=p_user) OR EXISTS(SELECT 1 FROM public.period_staff_enrollments WHERE period_id=p_id AND staff_id=p_user);
$$;
CREATE FUNCTION public.period_can_read(p_id integer,p_owner text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.period_can_manage(p_id) OR(public.period_is_open(p_id) AND p_owner=public.period_user_id() AND public.period_client_enrolled(p_id,p_owner));
$$;
CREATE FUNCTION public.period_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.academic_periods; uid text; enrolled boolean; officer boolean;
BEGIN
 uid:=public.period_user_id();
 SELECT * INTO p FROM public.academic_periods WHERE is_active LIMIT 1;
 IF NOT FOUND THEN SELECT * INTO p FROM public.academic_periods WHERE state='ended' ORDER BY ended_at DESC NULLS LAST,period_id DESC LIMIT 1; END IF;
 enrolled:=coalesce(p.is_active,false) AND public.period_client_enrolled(p.period_id,uid);
 officer:=coalesce(p.is_active,false) AND coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Department',false) AND EXISTS(SELECT 1 FROM public.period_department_staff WHERE period_id=p.period_id AND staff_id=uid);
 RETURN jsonb_build_object('period_id',p.period_id,'state',p.state,'opens_at',p.opens_at,'is_open',public.period_is_open(p.period_id),'client_enrolled',coalesce(enrolled,false),'officer_enrolled',coalesce(officer,false));
END $$;
REVOKE ALL ON FUNCTION public.period_is_open(integer),public.period_user_id(),public.period_can_manage(integer),public.period_client_enrolled(integer,text),public.period_can_read(integer,text),public.period_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.period_is_open(integer),public.period_user_id(),public.period_can_manage(integer),public.period_can_read(integer,text),public.period_access() TO authenticated,service_role;

-- Identity rows remain available to their owner for login, but an excluded account
-- cannot bypass the app by querying other clients or clearance directories directly.
CREATE FUNCTION public.period_directory_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin',false)
 OR public.period_can_read(public.active_academic_period_id(),public.period_user_id());
$$;
REVOKE ALL ON FUNCTION public.period_directory_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.period_directory_access() TO authenticated,service_role;
DO $$
DECLARE tbl text; own_clause text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['users','students','staffs','courses','course_sections','clearance_departments'] LOOP
  own_clause:=CASE tbl WHEN 'users' THEN 'auth_id=auth.uid()' WHEN 'students' THEN 'student_id=public.period_user_id()' WHEN 'staffs' THEN 'staff_id=public.period_user_id()' ELSE 'false' END;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('CREATE POLICY period_directory_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING(public.period_directory_access() OR %s)',tbl,own_clause);
  EXECUTE format('CREATE POLICY directory_requires_identity ON public.%I AS RESTRICTIVE FOR SELECT TO anon USING(false)',tbl);
 END LOOP;
END $$;

ALTER TABLE public.period_staff_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_department_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_period_read ON public.period_staff_enrollments FOR SELECT TO authenticated USING(public.period_can_manage(period_id) OR staff_id=public.period_user_id());
CREATE POLICY officer_period_read ON public.period_department_staff FOR SELECT TO authenticated USING(public.period_can_manage(period_id) OR staff_id=public.period_user_id());
GRANT SELECT ON public.period_staff_enrollments,public.period_department_staff TO authenticated;
GRANT ALL ON public.period_staff_enrollments,public.period_department_staff TO service_role;
CREATE VIEW public.current_staffs WITH(security_invoker=true) AS SELECT s.* FROM public.staffs s WHERE EXISTS(SELECT 1 FROM public.period_staff_enrollments e WHERE e.staff_id=s.staff_id AND e.period_id=public.active_academic_period_id());
CREATE VIEW public.current_department_staff WITH(security_invoker=true) AS SELECT s.* FROM public.staffs s WHERE EXISTS(SELECT 1 FROM public.period_department_staff e WHERE e.staff_id=s.staff_id AND e.period_id=public.active_academic_period_id());
GRANT SELECT ON public.current_staffs,public.current_department_staff TO authenticated,service_role;
-- Preserve the view's columns so PostgREST can continue inferring its FK relationships.
CREATE OR REPLACE VIEW public.current_clearance_records WITH(security_invoker=true) AS
 SELECT * FROM public.clearance_records r WHERE period_id=public.active_academic_period_id()
 AND EXISTS(SELECT 1 FROM public.clearance_templates t WHERE t.template_id=r.template_id AND t.is_active
 AND ((t.course_id IS NULL AND EXISTS(SELECT 1 FROM public.period_staff_enrollments e WHERE e.staff_id=r.user_id AND e.period_id=r.period_id))
 OR(t.course_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.enrollments e JOIN public.course_sections cs ON cs.section_id=e.section_id WHERE e.student_id=r.user_id AND e.period_id=r.period_id AND cs.course_id=t.course_id))));

CREATE OR REPLACE FUNCTION public.assign_clearance_on_staff_creation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF public.active_academic_period_id() IS NOT NULL THEN INSERT INTO public.period_staff_enrollments(period_id,staff_id) VALUES(public.active_academic_period_id(),NEW.staff_id) ON CONFLICT DO NOTHING; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.assign_staff_period_clearances() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 INSERT INTO public.clearance_records(user_id,template_id,period_id,status)
 SELECT NEW.staff_id,t.template_id,NEW.period_id,'Pending' FROM public.clearance_templates t WHERE t.is_active AND t.course_id IS NULL ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER assign_staff_period_clearances AFTER INSERT ON public.period_staff_enrollments FOR EACH ROW EXECUTE FUNCTION public.assign_staff_period_clearances();
CREATE OR REPLACE FUNCTION public.backfill_clearance_to_students() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pid integer:=public.active_academic_period_id();
BEGIN
 IF NOT NEW.is_active OR pid IS NULL THEN RETURN NEW; END IF;
 -- An explicit new/updated assignment registers its officer for this working period.
 INSERT INTO public.period_department_staff(period_id,staff_id) VALUES(pid,NEW.staff_id) ON CONFLICT DO NOTHING;
 IF NEW.course_id IS NOT NULL THEN
  INSERT INTO public.clearance_records(user_id,template_id,period_id,status) SELECT e.student_id,NEW.template_id,pid,'Pending' FROM public.enrollments e JOIN public.course_sections cs ON cs.section_id=e.section_id WHERE e.period_id=pid AND cs.course_id=NEW.course_id ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
 ELSE
  INSERT INTO public.clearance_records(user_id,template_id,period_id,status) SELECT e.staff_id,NEW.template_id,pid,'Pending' FROM public.period_staff_enrollments e WHERE e.period_id=pid ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tr_template_backfill_clearances ON public.clearance_templates;
CREATE TRIGGER tr_template_backfill_clearances AFTER INSERT OR UPDATE OF is_active,staff_id ON public.clearance_templates FOR EACH ROW EXECUTE FUNCTION public.backfill_clearance_to_students();
CREATE TRIGGER guard_staff_period BEFORE INSERT OR UPDATE OR DELETE ON public.period_staff_enrollments FOR EACH ROW EXECUTE FUNCTION public.guard_period_history();
CREATE TRIGGER guard_officer_period BEFORE INSERT OR UPDATE OR DELETE ON public.period_department_staff FOR EACH ROW EXECUTE FUNCTION public.guard_period_history();

DROP POLICY IF EXISTS clearance_current_period ON public.clearance_records;
CREATE POLICY clearance_current_period ON public.clearance_records AS RESTRICTIVE TO authenticated USING(period_id=public.active_academic_period_id() AND public.period_can_read(period_id,user_id)) WITH CHECK(period_id=public.active_academic_period_id() AND public.period_can_manage(period_id));
CREATE POLICY clearance_manager_update ON public.clearance_records AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.period_can_manage(period_id)) WITH CHECK(public.period_can_manage(period_id));
DROP POLICY IF EXISTS enrollment_current_period ON public.enrollments;
CREATE POLICY enrollment_current_period ON public.enrollments AS RESTRICTIVE TO authenticated
 USING(period_id=public.active_academic_period_id() AND public.period_can_read(period_id,student_id))
 WITH CHECK(period_id=public.active_academic_period_id() AND public.period_can_manage(period_id));
CREATE POLICY templates_period_access ON public.clearance_templates AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.period_can_read(public.active_academic_period_id(),public.period_user_id()));
DROP POLICY IF EXISTS tasks_current_period ON public.clearance_tasks;
CREATE POLICY tasks_current_period ON public.clearance_tasks AS RESTRICTIVE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.clearance_records r WHERE r.clearance_id=clearance_tasks.clearance_id AND public.period_can_read(r.period_id,r.user_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.clearance_records r WHERE r.clearance_id=clearance_tasks.clearance_id AND (public.period_can_manage(r.period_id) OR(public.period_can_read(r.period_id,r.user_id) AND clearance_tasks.status IN('Submitted','Rejected')))));
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_period_access ON public.notifications AS RESTRICTIVE TO authenticated
 USING(public.period_can_read(public.active_academic_period_id(),public.period_user_id()))
 WITH CHECK(public.period_can_read(public.active_academic_period_id(),public.period_user_id()));
-- Block anonymous access to tasks; client access requires an authenticated period participant.
CREATE POLICY tasks_require_identity ON public.clearance_tasks AS RESTRICTIVE TO anon USING(false) WITH CHECK(false);

CREATE FUNCTION public.save_clearance_period(p_config jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target public.academic_periods; current_p public.academic_periods; source public.academic_periods;
 ids_student text[]; ids_staff text[]; ids_officer text[]; copy_templates boolean; make_start boolean; pid integer;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Administrator service required'; END IF;
 PERFORM pg_advisory_xact_lock(77112026);
 SELECT * INTO current_p FROM public.academic_periods WHERE is_active FOR UPDATE;
 pid:=nullif(p_config->>'period_id','')::integer;
 IF pid IS NOT NULL THEN SELECT * INTO target FROM public.academic_periods WHERE period_id=pid FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Period not found'; END IF; END IF;
 IF target.state='ended' OR (target.period_id IS NOT NULL AND public.period_is_open(target.period_id)) THEN RAISE EXCEPTION 'Only a preparing period can be configured'; END IF;
 IF current_p.period_id IS NOT NULL AND current_p.period_id IS DISTINCT FROM pid THEN RAISE EXCEPTION 'End the current term before preparing the next'; END IF;
 SELECT * INTO source FROM public.academic_periods WHERE state='ended' ORDER BY ended_at DESC NULLS LAST,period_id DESC LIMIT 1;
 IF source.period_id IS NOT NULL AND ((p_config->>'start_year')::integer,(p_config->>'term')::integer)<=(source.start_year,source.term) THEN RAISE EXCEPTION 'The new period must follow the ended term'; END IF;
 IF target.period_id IS NULL OR NOT target.is_active THEN
  IF p_config->>'source_period_id' IS DISTINCT FROM source.period_id::text THEN RAISE EXCEPTION 'The source period changed. Review carryover again'; END IF;
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO ids_student FROM jsonb_array_elements_text(coalesce(p_config->'student_ids','[]')) value;
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO ids_staff FROM jsonb_array_elements_text(coalesce(p_config->'staff_ids','[]')) value;
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO ids_officer FROM jsonb_array_elements_text(coalesce(p_config->'officer_ids','[]')) value;
  copy_templates:=coalesce((p_config->>'carry_templates')::boolean,false);
  IF EXISTS(SELECT 1 FROM unnest(ids_student) id WHERE NOT EXISTS(SELECT 1 FROM public.enrollments WHERE period_id=source.period_id AND student_id=id)) THEN RAISE EXCEPTION 'Selected student is not in the source roster'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(ids_staff) id WHERE NOT EXISTS(SELECT 1 FROM public.period_staff_enrollments WHERE period_id=source.period_id AND staff_id=id)) THEN RAISE EXCEPTION 'Selected staff client is not in the source roster'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(ids_officer) id WHERE NOT EXISTS(SELECT 1 FROM public.period_department_staff WHERE period_id=source.period_id AND staff_id=id) AND NOT EXISTS(SELECT 1 FROM public.clearance_templates WHERE is_active AND staff_id=id)) THEN RAISE EXCEPTION 'Selected officer is not in the source roster'; END IF;
  IF copy_templates AND EXISTS(SELECT 1 FROM public.clearance_templates WHERE is_active AND NOT(staff_id=ANY(ids_officer))) THEN RAISE EXCEPTION 'Every assigned template officer must be carried over before copying templates'; END IF;
  IF target.period_id IS NULL THEN
   INSERT INTO public.academic_periods(start_year,end_year,term,state,is_active,activated_at,opens_at,source_period_id)
   VALUES((p_config->>'start_year')::integer,(p_config->>'end_year')::integer,(p_config->>'term')::integer,'preparing',true,now(),nullif(p_config->>'opens_at','')::timestamptz,source.period_id) RETURNING * INTO target;
  ELSE UPDATE public.academic_periods SET is_active=true,activated_at=now(),source_period_id=source.period_id WHERE period_id=target.period_id RETURNING * INTO target; END IF;
  IF NOT copy_templates THEN UPDATE public.clearance_templates SET is_active=false WHERE is_active; END IF;
  INSERT INTO public.period_department_staff SELECT target.period_id,unnest(ids_officer) ON CONFLICT DO NOTHING;
  INSERT INTO public.enrollments(student_id,section_id,period_id) SELECT e.student_id,e.section_id,target.period_id FROM public.enrollments e WHERE e.period_id=source.period_id AND e.student_id=ANY(ids_student) ON CONFLICT(student_id,period_id) DO NOTHING;
  INSERT INTO public.period_staff_enrollments SELECT target.period_id,unnest(ids_staff) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.academic_periods SET start_year=(p_config->>'start_year')::integer,end_year=(p_config->>'end_year')::integer,term=(p_config->>'term')::integer,opens_at=nullif(p_config->>'opens_at','')::timestamptz WHERE period_id=target.period_id RETURNING * INTO target;
 make_start:=coalesce((p_config->>'start')::boolean,false);
 IF make_start THEN UPDATE public.academic_periods SET start_requested_at=coalesce(start_requested_at,now()),state=CASE WHEN opens_at IS NULL OR opens_at<=now() THEN 'open' ELSE 'preparing' END WHERE period_id=target.period_id RETURNING * INTO target; END IF;
 RETURN to_jsonb(target);
END $$;
CREATE FUNCTION public.start_clearance_period(p_period_id integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.academic_periods;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Administrator service required'; END IF;
 PERFORM pg_advisory_xact_lock(77112026);
 SELECT * INTO p FROM public.academic_periods WHERE period_id=p_period_id FOR UPDATE;
 IF NOT FOUND OR NOT p.is_active OR p.state='ended' THEN RAISE EXCEPTION 'No preparing term to start'; END IF;
 IF p.state='open' THEN RETURN to_jsonb(p); END IF;
 UPDATE public.academic_periods SET start_requested_at=coalesce(start_requested_at,now()),state=CASE WHEN opens_at IS NULL OR opens_at<=now() THEN 'open' ELSE 'preparing' END WHERE period_id=p_period_id RETURNING * INTO p;
 RETURN to_jsonb(p);
END $$;
CREATE FUNCTION public.end_clearance_period(p_period_id integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.academic_periods;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Administrator service required'; END IF;
 PERFORM pg_advisory_xact_lock(77112026);
 SELECT * INTO p FROM public.academic_periods WHERE period_id=p_period_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Period not found'; END IF;
 IF p.state='ended' THEN RETURN to_jsonb(p); END IF;
 IF NOT public.period_is_open(p.period_id) THEN RAISE EXCEPTION 'Only an open term can be ended'; END IF;
 UPDATE public.clearance_records r SET document_snapshot=public.clearance_document_snapshot(r.user_id,r.template_id,r.period_id) WHERE r.period_id=p.period_id AND r.status<>'Signed';
 UPDATE public.academic_periods SET state='ended',is_active=false,ended_at=now() WHERE period_id=p.period_id RETURNING * INTO p;
 DELETE FROM public.notifications;
 RETURN to_jsonb(p);
END $$;
-- Retire the previous activation path so it cannot bypass roster review or End Term.
CREATE OR REPLACE FUNCTION public.activate_academic_period(p_period_id integer,p_carry_enrollments boolean DEFAULT false) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Use Manage A.Y. - Term to prepare, start and end terms'; END $$;
REVOKE ALL ON FUNCTION public.save_clearance_period(jsonb),public.start_clearance_period(integer),public.end_clearance_period(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_clearance_period(jsonb),public.start_clearance_period(integer),public.end_clearance_period(integer) TO service_role;
CREATE FUNCTION public.period_carry_candidates(p_source_period_id integer DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pid integer; result jsonb;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Administrator service required'; END IF;
 pid:=p_source_period_id;
 IF pid IS NULL THEN SELECT period_id INTO pid FROM public.academic_periods WHERE state='ended' ORDER BY ended_at DESC NULLS LAST,period_id DESC LIMIT 1; END IF;
 IF pid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.academic_periods WHERE period_id=pid AND state='ended') THEN RAISE EXCEPTION 'Carryover requires an ended source term'; END IF;
 SELECT jsonb_build_object('source_period_id',pid,
 'students',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.student_id,'name',s.student_name,'email',u.email,'detail',c.course_name) ORDER BY s.student_name,e.student_id) FROM public.enrollments e JOIN public.students s ON s.student_id=e.student_id JOIN public.users u ON u.user_id=e.student_id JOIN public.course_sections cs ON cs.section_id=e.section_id JOIN public.courses c ON c.course_id=cs.course_id WHERE e.period_id=pid),'[]'::jsonb),
 'staff',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.staff_id,'name',s.staff_name,'email',u.email,'detail','Staff client') ORDER BY s.staff_name,e.staff_id) FROM public.period_staff_enrollments e JOIN public.staffs s ON s.staff_id=e.staff_id JOIN public.users u ON u.user_id=e.staff_id WHERE e.period_id=pid),'[]'::jsonb),
 'officers',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.staff_id,'name',s.staff_name,'email',u.email,'detail','Department officer') ORDER BY s.staff_name,s.staff_id) FROM public.staffs s JOIN public.users u ON u.user_id=s.staff_id WHERE s.staff_id IN(SELECT staff_id FROM public.period_department_staff WHERE period_id=pid UNION SELECT staff_id FROM public.clearance_templates WHERE is_active)),'[]'::jsonb),
 'templates',coalesce((SELECT jsonb_agg(jsonb_build_object('template_id',t.template_id,'staff_id',t.staff_id,'department',d.dept_name)) FROM public.clearance_templates t JOIN public.clearance_departments d ON d.dept_id=t.dept_id WHERE t.is_active),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.period_carry_candidates(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.period_carry_candidates(integer) TO service_role;
CREATE FUNCTION public.enroll_staff_for_period(p_email text,p_name text,p_staff_id text,p_period_id integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid text;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Administrator service required'; END IF;
 PERFORM pg_advisory_xact_lock_shared(77112026);
 IF p_period_id IS DISTINCT FROM public.active_academic_period_id() THEN RAISE EXCEPTION 'The working term changed. Retry enrollment'; END IF;
 uid:=public.enroll_staff_identity(p_email,p_name,p_staff_id);
 INSERT INTO public.period_staff_enrollments(period_id,staff_id) VALUES(p_period_id,uid) ON CONFLICT DO NOTHING;
 RETURN uid;
END $$;
REVOKE ALL ON FUNCTION public.enroll_staff_for_period(text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enroll_staff_for_period(text,text,text,integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
