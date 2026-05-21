ALTER TABLE clearance_templates
DROP CONSTRAINT IF EXISTS clearance_templates_course_dept_unique;

ALTER TABLE clearance_templates
ADD CONSTRAINT clearance_templates_course_dept_unique 
UNIQUE (course_id, dept_id);