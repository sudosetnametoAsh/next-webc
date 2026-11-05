-- Supabase safeupdate rejects unqualified DELETE, including inside RPCs.
-- notif_id is a primary key, so this condition intentionally includes all notices.
BEGIN;
CREATE OR REPLACE FUNCTION public.end_clearance_period(p_period_id integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
 DELETE FROM public.notifications WHERE notif_id IS NOT NULL;
 RETURN to_jsonb(p);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
