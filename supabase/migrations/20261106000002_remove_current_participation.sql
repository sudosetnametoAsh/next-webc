BEGIN;
ALTER TABLE public.enrollments ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.staff_enrollments ADD COLUMN is_active boolean NOT NULL DEFAULT true;
CREATE OR REPLACE VIEW public.current_enrollments WITH(security_invoker=true) AS
 SELECT * FROM public.enrollments WHERE period_id=public.active_academic_period_id() AND is_active;
CREATE OR REPLACE VIEW public.current_staffs WITH(security_invoker=true) AS
 SELECT s.* FROM public.staffs s WHERE EXISTS(SELECT 1 FROM public.staff_enrollments e WHERE e.staff_id=s.staff_id AND e.period_id=public.active_academic_period_id() AND e.is_active);

CREATE OR REPLACE FUNCTION public.period_can_manage(p_id integer) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.academic_periods WHERE period_id=p_id AND is_active AND state<>'ended') AND
 (coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Admin',false) OR
 (coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Department',false) AND EXISTS(SELECT 1 FROM public.staff_enrollments WHERE is_active AND period_id=p_id AND staff_id=public.period_user_id())));
$$;

CREATE OR REPLACE FUNCTION public.period_client_enrolled(p_id integer,p_user text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.enrollments WHERE is_active AND period_id=p_id AND student_id=p_user) OR EXISTS(SELECT 1 FROM public.staff_enrollments WHERE is_active AND period_id=p_id AND staff_id=p_user);
$$;

CREATE OR REPLACE FUNCTION public.period_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.academic_periods; uid text; enrolled boolean; officer boolean;
BEGIN
 uid:=public.period_user_id();
 SELECT * INTO p FROM public.academic_periods WHERE is_active LIMIT 1;
 IF NOT FOUND THEN SELECT * INTO p FROM public.academic_periods WHERE state='ended' ORDER BY ended_at DESC NULLS LAST,period_id DESC LIMIT 1; END IF;
 enrolled:=coalesce(p.is_active,false) AND public.period_client_enrolled(p.period_id,uid);
 officer:=coalesce(p.is_active,false) AND coalesce((auth.jwt()->'user_metadata'->'custom_claims'->'roles') ? 'Department',false) AND EXISTS(SELECT 1 FROM public.staff_enrollments WHERE is_active AND period_id=p.period_id AND staff_id=uid);
 RETURN jsonb_build_object('period_id',p.period_id,'state',p.state,'opens_at',p.opens_at,'is_open',public.period_is_open(p.period_id),'client_enrolled',coalesce(enrolled,false),'officer_enrolled',coalesce(officer,false));
END $$;

CREATE OR REPLACE VIEW public.current_clearance_records WITH(security_invoker=true) AS
 SELECT * FROM public.clearance_records r WHERE period_id=public.active_academic_period_id()
 AND EXISTS(SELECT 1 FROM public.clearance_templates t WHERE t.template_id=r.template_id AND t.is_active
 AND ((t.course_id IS NULL AND EXISTS(SELECT 1 FROM public.staff_enrollments e WHERE e.is_active AND e.staff_id=r.user_id AND e.period_id=r.period_id))
 OR(t.course_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.enrollments e JOIN public.course_sections cs ON cs.section_id=e.section_id WHERE e.is_active AND e.student_id=r.user_id AND e.period_id=r.period_id AND cs.course_id=t.course_id))));


CREATE OR REPLACE FUNCTION public.assign_clearance_on_enrollment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF NOT NEW.is_active THEN RETURN NEW; END IF;
  INSERT INTO public.clearance_records(user_id,template_id,period_id,status)
  SELECT NEW.student_id,t.template_id,NEW.period_id,'Pending' FROM public.course_sections cs
  JOIN public.clearance_templates t ON t.course_id=cs.course_id
  WHERE cs.section_id=NEW.section_id AND t.is_active
  ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.assign_staff_period_clearances() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF NOT NEW.is_active THEN RETURN NEW; END IF;
 INSERT INTO public.clearance_records(user_id,template_id,period_id,status)
 SELECT NEW.staff_id,t.template_id,NEW.period_id,'Pending' FROM public.clearance_templates t WHERE t.is_active AND t.course_id IS NULL ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.backfill_clearance_to_students() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pid integer:=public.active_academic_period_id();
BEGIN
 IF NOT NEW.is_active OR pid IS NULL THEN RETURN NEW; END IF;
 IF NEW.course_id IS NOT NULL THEN
  INSERT INTO public.clearance_records(user_id,template_id,period_id,status) SELECT e.student_id,NEW.template_id,pid,'Pending' FROM public.enrollments e JOIN public.course_sections cs ON cs.section_id=e.section_id WHERE e.is_active AND e.period_id=pid AND cs.course_id=NEW.course_id ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
 ELSE
  INSERT INTO public.clearance_records(user_id,template_id,period_id,status) SELECT e.staff_id,NEW.template_id,pid,'Pending' FROM public.staff_enrollments e WHERE e.is_active AND e.period_id=pid ON CONFLICT(user_id,template_id,period_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

DROP TRIGGER tr_enrollment_create_clearance ON public.enrollments;
CREATE TRIGGER tr_enrollment_create_clearance AFTER INSERT OR UPDATE OF section_id,is_active ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.assign_clearance_on_enrollment();
DROP TRIGGER assign_staff_period_clearances ON public.staff_enrollments;
CREATE TRIGGER assign_staff_period_clearances AFTER INSERT OR UPDATE OF is_active ON public.staff_enrollments FOR EACH ROW EXECUTE FUNCTION public.assign_staff_period_clearances();

CREATE OR REPLACE FUNCTION public.enroll_staff_for_period(p_email text,p_name text,p_staff_id text,p_period_id integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid text;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Administrator service required'; END IF;
 PERFORM pg_advisory_xact_lock_shared(77112026);
 IF p_period_id IS DISTINCT FROM public.active_academic_period_id() THEN RAISE EXCEPTION 'The working term changed. Retry enrollment'; END IF;
 uid:=public.enroll_staff_identity(p_email,p_name,p_staff_id);
 INSERT INTO public.staff_enrollments(period_id,staff_id) VALUES(p_period_id,uid) ON CONFLICT(period_id,staff_id) DO UPDATE SET is_active=true;
 RETURN uid;
END $$;

CREATE OR REPLACE FUNCTION public.save_clearance_period(p_config jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target public.academic_periods; current_p public.academic_periods; source public.academic_periods;
 ids_student text[]; ids_staff text[]; copy_templates boolean; make_start boolean; pid integer;
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
  copy_templates:=coalesce((p_config->>'carry_templates')::boolean,false);
  IF EXISTS(SELECT 1 FROM unnest(ids_student) id WHERE NOT EXISTS(SELECT 1 FROM public.enrollments WHERE is_active AND period_id=source.period_id AND student_id=id)) THEN RAISE EXCEPTION 'Selected student is not in the source roster'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(ids_staff) id WHERE NOT EXISTS(SELECT 1 FROM public.staff_enrollments WHERE is_active AND period_id=source.period_id AND staff_id=id)) THEN RAISE EXCEPTION 'Selected staff client is not in the source roster'; END IF;
  IF copy_templates AND EXISTS(SELECT 1 FROM public.clearance_templates WHERE is_active AND NOT(staff_id=ANY(ids_staff))) THEN RAISE EXCEPTION 'Every assigned template officer must be carried over before copying templates'; END IF;
  IF target.period_id IS NULL THEN
   INSERT INTO public.academic_periods(start_year,end_year,term,state,is_active,activated_at,opens_at,source_period_id)
   VALUES((p_config->>'start_year')::integer,(p_config->>'end_year')::integer,(p_config->>'term')::integer,'preparing',true,now(),nullif(p_config->>'opens_at','')::timestamptz,source.period_id) RETURNING * INTO target;
  ELSE UPDATE public.academic_periods SET is_active=true,activated_at=now(),source_period_id=source.period_id WHERE period_id=target.period_id RETURNING * INTO target; END IF;
  IF NOT copy_templates THEN UPDATE public.clearance_templates SET is_active=false WHERE is_active; END IF;
  INSERT INTO public.enrollments(student_id,section_id,period_id) SELECT e.student_id,e.section_id,target.period_id FROM public.enrollments e WHERE e.is_active AND e.period_id=source.period_id AND e.student_id=ANY(ids_student) ON CONFLICT(student_id,period_id) DO NOTHING;
  INSERT INTO public.staff_enrollments SELECT target.period_id,unnest(ids_staff) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.academic_periods SET start_year=(p_config->>'start_year')::integer,end_year=(p_config->>'end_year')::integer,term=(p_config->>'term')::integer,opens_at=nullif(p_config->>'opens_at','')::timestamptz WHERE period_id=target.period_id RETURNING * INTO target;
 make_start:=coalesce((p_config->>'start')::boolean,false);
 IF make_start THEN UPDATE public.academic_periods SET start_requested_at=coalesce(start_requested_at,now()),state=CASE WHEN opens_at IS NULL OR opens_at<=now() THEN 'open' ELSE 'preparing' END WHERE period_id=target.period_id RETURNING * INTO target; END IF;
 RETURN to_jsonb(target);
END $$;

CREATE OR REPLACE FUNCTION public.period_carry_candidates(p_source_period_id integer DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pid integer; result jsonb;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Administrator service required'; END IF;
 pid:=p_source_period_id;
 IF pid IS NULL THEN SELECT period_id INTO pid FROM public.academic_periods WHERE state='ended' ORDER BY ended_at DESC NULLS LAST,period_id DESC LIMIT 1; END IF;
 IF pid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.academic_periods WHERE period_id=pid AND state='ended') THEN RAISE EXCEPTION 'Carryover requires an ended source term'; END IF;
 WITH progress AS (
  SELECT r.user_id,jsonb_agg(jsonb_build_object('clearance_id',r.clearance_id,'dept_id',t.dept_id,'dept_name',coalesce(r.document_snapshot->>'department',d.dept_name),'tier',coalesce((r.document_snapshot->>'tier')::integer,t.tier),'status',r.status,'created_at',r.created_at,'signed_at',r.signed_at) ORDER BY r.clearance_id) departments
  FROM public.clearance_records r JOIN public.clearance_templates t ON t.template_id=r.template_id
  JOIN public.clearance_departments d ON d.dept_id=t.dept_id
  WHERE r.period_id=pid AND coalesce((r.document_snapshot->>'is_active')::boolean,true)
  GROUP BY r.user_id
 )
 SELECT jsonb_build_object('source_period_id',pid,
 'students',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.student_id,'name',s.student_name,'email',u.email,'detail',c.course_name,'course_id',c.course_id,'course_name',c.course_name,'section_id',cs.section_id,'section_number',cs.section_number,'course_year',cs.year,'semester',cs.semester,'departments',coalesce(pr.departments,'[]'::jsonb)) ORDER BY s.student_name,e.student_id) FROM public.enrollments e JOIN public.students s ON s.student_id=e.student_id JOIN public.users u ON u.user_id=e.student_id JOIN public.course_sections cs ON cs.section_id=e.section_id JOIN public.courses c ON c.course_id=cs.course_id LEFT JOIN progress pr ON pr.user_id=e.student_id WHERE e.is_active AND e.period_id=pid),'[]'::jsonb),
 'staff',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.staff_id,'name',s.staff_name,'email',u.email,'detail','Staff','departments',coalesce(pr.departments,'[]'::jsonb)) ORDER BY s.staff_name,e.staff_id) FROM public.staff_enrollments e JOIN public.staffs s ON s.staff_id=e.staff_id JOIN public.users u ON u.user_id=e.staff_id LEFT JOIN progress pr ON pr.user_id=e.staff_id WHERE e.is_active AND e.period_id=pid),'[]'::jsonb),
 'templates',coalesce((SELECT jsonb_agg(jsonb_build_object('template_id',t.template_id,'staff_id',t.staff_id,'department',d.dept_name)) FROM public.clearance_templates t JOIN public.clearance_departments d ON d.dept_id=t.dept_id WHERE t.is_active),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;

-- In-flight staff writes must not change a removed participant's requirements.
CREATE FUNCTION public.guard_participant_work() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pid integer; uid text;
BEGIN
 IF TG_TABLE_NAME='clearance_records' THEN pid:=NEW.period_id; uid:=NEW.user_id;
 ELSE SELECT period_id,user_id INTO pid,uid FROM public.clearance_records WHERE clearance_id=NEW.clearance_id FOR SHARE; END IF;
 IF pid=public.active_academic_period_id() AND NOT public.period_client_enrolled(pid,uid) THEN
  RAISE EXCEPTION 'This client is no longer participating in the current term';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_participant_work() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_record_participant BEFORE INSERT OR UPDATE OF status ON public.clearance_records FOR EACH ROW EXECUTE FUNCTION public.guard_participant_work();
CREATE TRIGGER guard_task_participant BEFORE INSERT OR UPDATE ON public.clearance_tasks FOR EACH ROW EXECUTE FUNCTION public.guard_participant_work();
NOTIFY pgrst,'reload schema';
COMMIT;
