-- Step 1: Create the function
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
       );
       
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Attach the trigger to the students table
CREATE TRIGGER trigger_auto_clear_cashier
AFTER UPDATE OF balance ON students
FOR EACH ROW 
EXECUTE FUNCTION auto_clear_cashier();

-- Step 1: Create the function
CREATE OR REPLACE FUNCTION auto_clear_registrar()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INT;
BEGIN
  -- Only run this check if a record was just marked as 'Signed'
  IF NEW.status = 'Signed' THEN
     
     -- Count how many incomplete records this specific student still has
     SELECT COUNT(*) INTO pending_count
     FROM clearance_records cr
     JOIN clearance_templates ct ON cr.template_id = ct.template_id
     JOIN clearance_departments cd ON ct.dept_id = cd.dept_id
     WHERE cr.user_id = NEW.user_id
       AND cd.dept_name != 'Registrar' -- Exclude the Registrar from the count
       AND cr.status != 'Signed';

     -- If no pending records are left, clear the Registrar!
     IF pending_count = 0 THEN
        UPDATE clearance_records
        SET status = 'Signed', signed_at = NOW()
        WHERE user_id = NEW.user_id
          AND template_id IN (
            SELECT template_id FROM clearance_templates ct
            JOIN clearance_departments cd ON cd.dept_id = ct.dept_id
            WHERE cd.dept_name = 'Registrar'
          );
     END IF;
     
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Attach the trigger to the clearance_records table
CREATE TRIGGER trigger_auto_clear_registrar
AFTER UPDATE OF status ON clearance_records
FOR EACH ROW 
EXECUTE FUNCTION auto_clear_registrar();