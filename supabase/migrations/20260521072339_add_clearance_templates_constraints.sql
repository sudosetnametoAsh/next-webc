ALTER TABLE clearance_templates
DROP CONSTRAINT IF EXISTS clearance_templates_course_dept_unique;

ALTER TABLE clearance_templates
ADD CONSTRAINT clearance_templates_course_dept_unique 
UNIQUE (course_id, dept_id);

DROP INDEX IF EXISTS clearance_templates_dept_staff_unique;

CREATE UNIQUE INDEX clearance_templates_dept_staff_unique
  ON clearance_templates (dept_id, staff_id)
  WHERE course_id IS NULL;