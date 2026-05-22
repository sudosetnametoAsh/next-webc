ALTER TABLE "clearance_records" DROP CONSTRAINT "studentclearances_student_id_fkey";
--> statement-breakpoint
ALTER TABLE "clearance_records" ADD CONSTRAINT "clearance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
-- Fix typo in assign_clearance_on_enrollment and ensure it only affects students
CREATE OR REPLACE FUNCTION "public"."assign_clearance_on_enrollment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    INSERT INTO public.clearance_records (user_id, template_id, status)
    SELECT
        NEW.student_id,
        ct.template_id,
        'Pending'::character varying
    FROM
        public.course_sections cs
    INNER JOIN
        public.clearance_templates ct ON cs.course_id = ct.course_id
    WHERE
        cs.section_id = NEW.section_id;

    RETURN NEW;
END;$$;

-- Update backfill function to allocate clearances to both students and staffs
CREATE OR REPLACE FUNCTION "public"."backfill_clearance_to_students"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    IF NEW.course_id IS NOT NULL THEN
        INSERT INTO public.clearance_records (user_id, template_id, status)
        SELECT
            e.student_id,
            NEW.template_id,
            'Pending'::character varying
        FROM
            public.enrollments e
        INNER JOIN
            public.course_sections cs ON e.section_id = cs.section_id
        WHERE
            cs.course_id = NEW.course_id;
    ELSE
        INSERT INTO public.clearance_records (user_id, template_id, status)
        SELECT
            s.staff_id,
            NEW.template_id,
            'Pending'::character varying
        FROM
            public.staffs s;
    END IF;

    RETURN NEW;
END;$$;

-- Add function to assign staff clearance when a new staff is added
CREATE OR REPLACE FUNCTION "public"."assign_clearance_on_staff_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    INSERT INTO public.clearance_records (user_id, template_id, status)
    SELECT
        NEW.staff_id,
        ct.template_id,
        'Pending'::character varying
    FROM
        public.clearance_templates ct
    WHERE
        ct.course_id IS NULL;

    RETURN NEW;
END;$$;

-- Create trigger for new staffs
DROP TRIGGER IF EXISTS "tr_staff_create_clearance" ON "public"."staffs";
CREATE TRIGGER "tr_staff_create_clearance"
AFTER INSERT ON "public"."staffs"
FOR EACH ROW EXECUTE FUNCTION "public"."assign_clearance_on_staff_creation"();

-- Scale auto_clear_registrar to accommodate both student and staff
CREATE OR REPLACE FUNCTION auto_clear_registrar()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INT;
  is_staff_clearance BOOLEAN;
BEGIN
  -- Only run this check if a record was just marked as 'Signed'
  IF NEW.status = 'Signed' THEN

     -- Determine if the signed template is a staff or student template
     SELECT (course_id IS NULL) INTO is_staff_clearance
     FROM clearance_templates
     WHERE template_id = NEW.template_id;

     -- Count how many incomplete records this specific user still has FOR THE SAME TYPE (staff or student)
     SELECT COUNT(*) INTO pending_count
     FROM clearance_records cr
     JOIN clearance_templates ct ON cr.template_id = ct.template_id
     JOIN clearance_departments cd ON ct.dept_id = cd.dept_id
     WHERE cr.user_id = NEW.user_id
       AND cd.dept_name != 'Registrar' -- Exclude the Registrar from the count
       AND cr.status != 'Signed'
       AND (ct.course_id IS NULL) = is_staff_clearance; -- Match the type

     -- If no pending records are left, clear the Registrar!
     IF pending_count = 0 THEN
        UPDATE clearance_records
        SET status = 'Signed', signed_at = NOW()
        WHERE user_id = NEW.user_id
          AND template_id IN (
            SELECT template_id FROM clearance_templates ct
            JOIN clearance_departments cd ON cd.dept_id = ct.dept_id
            WHERE cd.dept_name = 'Registrar'
              AND (ct.course_id IS NULL) = is_staff_clearance
          );
     END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safely constraint auto_clear_cashier to students
CREATE OR REPLACE FUNCTION auto_clear_cashier()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the balance was just updated to 0
  IF NEW.balance <= 0 AND OLD.balance > 0 THEN

     -- Update the clearance record for this student where the department is 'Cashier'
     UPDATE clearance_records
     SET status = 'Signed', signed_at = NOW()
     WHERE user_id = NEW.student_id
       AND template_id IN (
         SELECT template_id FROM clearance_templates ct
         JOIN clearance_departments cd ON cd.dept_id = ct.dept_id
         WHERE cd.dept_name = 'Cashier'
           AND ct.course_id IS NOT NULL -- Ensures only student template is cleared
       );

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
