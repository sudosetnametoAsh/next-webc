BEGIN;
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
 'students',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.student_id,'name',s.student_name,'email',u.email,'detail',c.course_name,'course_id',c.course_id,'course_name',c.course_name,'section_id',cs.section_id,'section_number',cs.section_number,'course_year',cs.year,'semester',cs.semester,'departments',coalesce(pr.departments,'[]'::jsonb)) ORDER BY s.student_name,e.student_id) FROM public.enrollments e JOIN public.students s ON s.student_id=e.student_id JOIN public.users u ON u.user_id=e.student_id JOIN public.course_sections cs ON cs.section_id=e.section_id JOIN public.courses c ON c.course_id=cs.course_id LEFT JOIN progress pr ON pr.user_id=e.student_id WHERE e.period_id=pid),'[]'::jsonb),
 'staff',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.staff_id,'name',s.staff_name,'email',u.email,'detail','Staff','departments',coalesce(pr.departments,'[]'::jsonb)) ORDER BY s.staff_name,e.staff_id) FROM public.staff_enrollments e JOIN public.staffs s ON s.staff_id=e.staff_id JOIN public.users u ON u.user_id=e.staff_id LEFT JOIN progress pr ON pr.user_id=e.staff_id WHERE e.period_id=pid),'[]'::jsonb),
 'templates',coalesce((SELECT jsonb_agg(jsonb_build_object('template_id',t.template_id,'staff_id',t.staff_id,'department',d.dept_name)) FROM public.clearance_templates t JOIN public.clearance_departments d ON d.dept_id=t.dept_id WHERE t.is_active),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
