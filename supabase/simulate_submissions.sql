-- ==============================================================================
-- Simulation Seed: Pending Document Submissions for Department Staff Dashboard
-- ==============================================================================

-- 1. CLINIC (Staff ID: 02000351089 - Sean Michael Dela Roca)
INSERT INTO "public"."clearance_tasks" (
  "clearance_id", "staff_id", "title", "description", "status", "dropbox", "uploaded_at"
) VALUES
(
  3427,
  '02000351089',
  'Annual Physical Medical Examination Form',
  'Please upload your signed annual physical examination certificate from a licensed physician.',
  'Submitted',
  '[{"id":"med-01","name":"Medical_Examination_Form_2026.pdf","size":"1.8 MB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '14 minutes'
),
(
  3428,
  '02000351089',
  'Chest X-Ray & Blood Test Clearance',
  'Upload your official chest X-ray result and complete blood count (CBC) clearance.',
  'Submitted',
  '[{"id":"med-02a","name":"Chest_XRay_Clearance_Result.jpg","size":"2.4 MB","type":"image","url":"https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=1000"},{"id":"med-02b","name":"Complete_Blood_Count_Lab.pdf","size":"950 KB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '42 minutes'
),
(
  3429,
  '02000351089',
  'Dental Examination Clearance',
  'Dental examination clearance signed by campus or accredited dentist.',
  'Submitted',
  '[{"id":"dent-01","name":"Dental_Checkup_Clearance.pdf","size":"1.1 MB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '1 hour 20 minutes'
),
(
  3430,
  '02000351089',
  'Vaccination Record & Health Declaration',
  'Proof of updated booster / tetanus immunization records.',
  'Submitted',
  '[{"id":"vax-01","name":"Vaccination_Card_Front_Back.jpg","size":"3.1 MB","type":"image","url":"https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=1000"}]',
  NOW() - INTERVAL '3 hours 15 minutes'
),
(
  3431,
  '02000351089',
  'Medical Activity Waiver Form',
  'Parent-signed waiver for off-campus clinical / laboratory activities.',
  'Submitted',
  '[{"id":"waiver-01","name":"Medical_Activity_Waiver_Signed.pdf","size":"1.6 MB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '5 hours'
),
(
  3453,
  '02000351089',
  'Follow-Up Medical Certificate',
  'Resubmission of updated doctor clearance notes.',
  'Submitted',
  '[{"id":"cert-02","name":"Updated_Doctor_Notes_Resubmitted.pdf","size":"1.3 MB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '18 minutes'
);

-- 2. LIBRARY (Staff ID: 02000485347 - Noemi Martillano)
INSERT INTO "public"."clearance_tasks" (
  "clearance_id", "staff_id", "title", "description", "status", "dropbox", "uploaded_at"
) VALUES
(
  3589,
  '02000485347',
  'Book Replacement Receipt & Return Slip',
  'Proof of lost library book settlement and returned borrowed volumes.',
  'Submitted',
  '[{"id":"lib-01","name":"Book_Replacement_Receipt.pdf","size":"920 KB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '25 minutes'
),
(
  3590,
  '02000485347',
  'Library Overdue Clearance Voucher',
  'Official voucher for overdue library fine clearance.',
  'Submitted',
  '[{"id":"lib-02","name":"Library_Fine_Voucher.pdf","size":"1.0 MB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '1 hour 5 minutes'
);

-- 3. COMPUTER LABORATORY (Staff ID: 02000607789 - Vic Diaz)
INSERT INTO "public"."clearance_tasks" (
  "clearance_id", "staff_id", "title", "description", "status", "dropbox", "uploaded_at"
) VALUES
(
  3493,
  '02000607789',
  'Network Lab Safety Agreement',
  'Signed computer lab equipment accountability and usage guideline.',
  'Submitted',
  '[{"id":"lab-01","name":"Computer_Lab_Safety_Form.pdf","size":"1.2 MB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '30 minutes'
),
(
  3494,
  '02000607789',
  'Hardware Equipment Accountability Slip',
  'Inspection verification slip for laboratory equipment return.',
  'Submitted',
  '[{"id":"lab-02","name":"Hardware_Inspection_Slip.jpg","size":"2.1 MB","type":"image","url":"https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1000"}]',
  NOW() - INTERVAL '1 hour 10 minutes'
);

-- 4. CASHIER (Staff ID: 02000788068 - Mrs. Camille)
INSERT INTO "public"."clearance_tasks" (
  "clearance_id", "staff_id", "title", "description", "status", "dropbox", "uploaded_at"
) VALUES
(
  2951,
  '02000788068',
  'Tuition Official Receipt (Midterm Assessment)',
  'Scanned official receipt verifying payment of remaining assessment balance.',
  'Submitted',
  '[{"id":"cash-01","name":"Official_Receipt_OR98231.pdf","size":"1.5 MB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '8 minutes'
),
(
  2952,
  '02000788068',
  'Graduation Fee Settlement Slip',
  'Validation slip for graduation & yearbook processing fees.',
  'Submitted',
  '[{"id":"cash-02","name":"Graduation_Fee_Settlement.pdf","size":"880 KB","type":"pdf","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}]',
  NOW() - INTERVAL '45 minutes'
);
