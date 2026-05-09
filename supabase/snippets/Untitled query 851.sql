ALTER TABLE student_clearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own clearances" ON public.student_clearances
FOR SELECT USING (
  student_id IN (
    SELECT user_id FROM public.users WHERE auth_id = auth.uid()
  )
);