-- Migration: 0036_fix_cleanup_clearance_on_drop_trigger.sql
-- Description: Fix column reference in cleanup_clearance_on_drop trigger on enrollments
--              enrollments table uses student_id, not user_id.

CREATE OR REPLACE FUNCTION public.cleanup_clearance_on_drop()
RETURNS trigger AS $$
DECLARE
    v_course_id integer;
BEGIN
    SELECT course_id INTO v_course_id
    FROM public.course_sections
    WHERE section_id = OLD.section_id;

    DELETE FROM public.clearance_records
    WHERE user_id = OLD.student_id
      AND template_id IN (
          SELECT template_id
          FROM public.clearance_templates
          WHERE course_id = v_course_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.enrollments e
          JOIN public.course_sections cs ON e.section_id = cs.section_id
          WHERE e.student_id = OLD.student_id
            AND cs.course_id = v_course_id
      );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
