BEGIN;

CREATE TABLE public.staff_configurations (
  staff_id varchar PRIMARY KEY REFERENCES public.staffs(staff_id) ON UPDATE CASCADE ON DELETE CASCADE,
  ai_verification_mode varchar(20) NOT NULL DEFAULT 'two_factor'
    CHECK (ai_verification_mode IN ('two_factor', 'autonomous', 'manual')),
  ai_confidence_threshold integer NOT NULL DEFAULT 85
    CHECK (ai_confidence_threshold BETWEEN 50 AND 100)
);

ALTER TABLE public.staff_configurations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_configurations TO authenticated;
GRANT ALL ON public.staff_configurations TO service_role;

CREATE POLICY "staff manage own configuration" ON public.staff_configurations
  FOR ALL TO authenticated
  USING (staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (staff_id IN (SELECT user_id FROM public.users WHERE auth_id = auth.uid()));

-- Preserve each assigned staff member's current policy. For staff with multiple
-- departments, prefer an active template, then the lowest template ID.
INSERT INTO public.staff_configurations (staff_id, ai_verification_mode, ai_confidence_threshold)
SELECT DISTINCT ON (t.staff_id)
  t.staff_id, d.ai_verification_mode, d.ai_confidence_threshold
FROM public.clearance_templates t
JOIN public.clearance_departments d ON d.dept_id = t.dept_id
JOIN public.staffs s ON s.staff_id = t.staff_id
ORDER BY t.staff_id, t.is_active DESC NULLS LAST, t.template_id;

ALTER TABLE public.clearance_departments
  DROP COLUMN ai_verification_mode,
  DROP COLUMN ai_confidence_threshold;
ALTER TABLE public.students DROP COLUMN IF EXISTS contacts;

COMMIT;
