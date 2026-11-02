-- ============================================================================
-- SEED MOCK RECENT SUBMISSIONS
-- Target Officers:
--   1. JanJan Rodelas (Registrar - '02000099262')
--   2. Sean Dela Roca (Clinic - '02000351089')
-- ============================================================================

-- 1. Clean previous mock tasks for test clearances
DELETE FROM clearance_tasks
WHERE clearance_id IN (3480, 3479, 3478, 3477, 3476, 3696, 3695, 3694, 3693, 3692);

-- ============================================================================
-- A. SEED FOR REGISTRAR: JanJan Rodelas ('02000099262')
-- ============================================================================

-- 1. Jyrum Jaro (clearance_id 3696): Multi-Doc Mixed
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3696, '02000099262', 'Official Transcript of Records (Form 137)', 'Certified true copy of high school Form 137-A with official school dry seal.',
   'Verified', NOW() - INTERVAL '40 minutes',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   'Automated pre-verification passed.',
   '{"authenticityScore": 97, "detectedElements": ["Principal Signature", "DepEd Seal", "Valid Academic Year"], "auditPassed": true}'::jsonb),

  (3696, '02000099262', 'Certificate of Good Moral Character', 'Endorsed certificate from previous academic institution.',
   'Flagged', NOW() - INTERVAL '90 minutes',
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
   'Certificate of Good Moral is dated older than 6 months and signature line is partially obscured.',
   '{"authenticityScore": 61, "detectedElements": ["Unclear Signature"], "flaggedReasons": ["Document expired", "Obscured signature"], "auditPassed": false}'::jsonb),

  (3696, '02000099262', 'PSA Birth Certificate Verification Copy', 'Original PSA birth certificate on security paper.',
   'Submitted', NOW() - INTERVAL '3 hours',
   'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
   NULL, NULL);

-- 2. Dino (clearance_id 3695): Single-Doc AI Verified
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3695, '02000099262', 'College Admission Clearance Form', 'Signed admission waiver and document release authorization.',
   'Verified', NOW() - INTERVAL '15 minutes',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   'Authentic document verified.',
   '{"authenticityScore": 99, "detectedElements": ["Student Signature", "Guidance Endorsement"], "auditPassed": true}'::jsonb);

-- 3. Jobart (clearance_id 3694): Single-Doc Flagged
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3694, '02000099262', 'Honorable Dismissal / Transfer Credential', 'Original copy issued by the previous college registrar.',
   'Flagged', NOW() - INTERVAL '2 hours',
   'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800',
   'Photocopy submitted instead of original document with embossed dry seal. Please submit certified original.',
   '{"authenticityScore": 54, "flaggedReasons": ["Photocopy detected", "Missing embossed dry seal"], "auditPassed": false}'::jsonb);

-- 4. Brian Alonzo (clearance_id 3693): Single-Doc Needs Review (Submitted)
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3693, '02000099262', 'DepEd Form 138 (Senior High Report Card)', 'Complete Grade 12 final report card with strand completion remarks.',
   'Submitted', NOW() - INTERVAL '4 hours',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   NULL, NULL);

-- 5. Yanna Dimaculangan (clearance_id 3692): Multi-Doc All AI Verified
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3692, '02000099262', 'Graduation Application Clearance Form', 'Endorsed academic credential evaluation checklist.',
   'Verified', NOW() - INTERVAL '25 minutes',
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
   'Degree audit checklist fully matched.',
   '{"authenticityScore": 98, "detectedElements": ["Dean Signature", "Checklist Verified"], "auditPassed": true}'::jsonb),

  (3692, '02000099262', 'Alumni Registry & Institutional Exit Survey', 'Completed online exit interview response confirmation slip.',
   'Verified', NOW() - INTERVAL '50 minutes',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   'Registry submission QR code verified.',
   '{"authenticityScore": 96, "detectedElements": ["QR Verified", "Exit Survey Timestamp"], "auditPassed": true}'::jsonb);

-- ============================================================================
-- B. SEED FOR CLINIC: Sean Dela Roca ('02000351089')
-- ============================================================================

-- 1. Jyrum Jaro (clearance_id 3480): Multi-Doc Mixed
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3480, '02000351089', 'Annual Physical Medical Examination Form', 'Submit complete physical exam endorsed by licensed MD.',
   'Verified', NOW() - INTERVAL '45 minutes',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   'Automated pre-verification passed.',
   '{"authenticityScore": 96, "detectedElements": ["MD Signature", "Clinic Stamp", "Valid Date"], "auditPassed": true}'::jsonb),

  (3480, '02000351089', 'Chest X-Ray & Blood Test Clearance', 'Laboratory diagnostic results with radiologist findings.',
   'Flagged', NOW() - INTERVAL '2 hours',
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
   'Official clinic seal is blurry and physician signature date is cut off at the bottom margin.',
   '{"authenticityScore": 62, "detectedElements": ["Unclear Signature"], "flaggedReasons": ["Blurry seal"], "auditPassed": false}'::jsonb),

  (3480, '02000351089', 'Vaccination Record & Health Declaration', 'Updated booster shots and health history questionnaire.',
   'Submitted', NOW() - INTERVAL '3 hours',
   'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
   NULL, NULL);

-- 2. Dino (clearance_id 3479): Single-Doc AI Verified
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3479, '02000351089', 'Medical Activity Waiver Form', 'Waiver for off-campus laboratory and sports exemptions.',
   'Verified', NOW() - INTERVAL '15 minutes',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   'Authentic document verified.',
   '{"authenticityScore": 98, "detectedElements": ["Parent Signature", "Notary Stamp"], "auditPassed": true}'::jsonb);

-- 3. Jobart (clearance_id 3478): Single-Doc Flagged
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3478, '02000351089', 'Dental Examination Clearance', 'Annual dental certificate from accredited dental clinic.',
   'Flagged', NOW() - INTERVAL '4 hours',
   'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800',
   'Uploaded dental record expired last academic year (validity expired Sept 2025). Please submit current examination.',
   '{"authenticityScore": 58, "flaggedReasons": ["Document expired"], "auditPassed": false}'::jsonb);

-- 4. Brian Alonzo (clearance_id 3477): Single-Doc Needs Review (Submitted)
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3477, '02000351089', 'Health Assessment & Emergency Contact Sheet', 'Signed emergency sheet and contact information form.',
   'Submitted', NOW() - INTERVAL '5 hours',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   NULL, NULL);

-- 5. Yanna Dimaculangan (clearance_id 3476): Multi-Doc All AI Verified
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3476, '02000351089', 'Laboratory Drug Screen Clearance', 'Accredited DOH drug testing certificate.',
   'Verified', NOW() - INTERVAL '30 minutes',
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
   'Barcoded certificate verified against DOH registry.',
   '{"authenticityScore": 99, "detectedElements": ["Barcode Verified", "DOH Stamp"], "auditPassed": true}'::jsonb),

  (3476, '02000351089', 'Audiometry & Visual Acuity Report', 'Standard sensory screening evaluation record.',
   'Verified', NOW() - INTERVAL '1 hour',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   'Audiometry results match template requirements.',
   '{"authenticityScore": 95, "detectedElements": ["Optometrist Signature"], "auditPassed": true}'::jsonb);
