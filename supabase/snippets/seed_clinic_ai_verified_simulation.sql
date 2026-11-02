-- ============================================================================
-- SEED CLINIC AI VERIFIED SIMULATION
-- Target Officer: Sean Michael Dela Roca (Clinic - '02000351089')
-- ============================================================================

-- Clean any previous test tasks for Dino (3479) and Yanna (3476)
DELETE FROM clearance_tasks
WHERE staff_id = '02000351089'
  AND clearance_id IN (3479, 3476);

-- 1. Dino (clearance_id 3479): Single-Doc AI Verified (Slot 1 - Brand New)
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES (
  3479, 
  '02000351089', 
  'Annual Medical Examination Certificate & Physical Clearance', 
  'Submit complete physical examination endorsed by licensed clinic MD.',
  'Verified', 
  NOW(),
  'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
  '[AI Verified: 98% Authenticity] Authenticity verified firsthand. Awaiting final staff authorization.',
  jsonb_build_object(
    'isAuthentic', true,
    'authenticityScore', 98,
    'detectedStudentId', '02000724184',
    'detectedStudentName', 'Dino',
    'detectedDocType', 'Medical Examination Certificate',
    'issueDate', 'October 24, 2026',
    'studentIdMatches', true,
    'authenticityMarkers', jsonb_build_array(
      'Official University Clinic Dry Seal',
      'Licensed MD Signature & Stamp',
      'Valid Academic Year 2026-2027'
    ),
    'flags', jsonb_build_array(),
    'summary', 'Authentic medical clearance certificate verified firsthand. All physician signatures and clinical seals validated.'
  )
);

-- 2. Yanna Dimaculangan (clearance_id 3476): Multi-Doc AI Verified
INSERT INTO clearance_tasks (
  clearance_id, staff_id, title, description, status, uploaded_at, dropbox, comments, ai_audit_report
) VALUES
  (3476, '02000351089', 'Laboratory Diagnostic Screening Report', 'Complete diagnostic blood chemistry and urinalysis.',
   'Verified', NOW() - INTERVAL '20 minutes',
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
   '[AI Verified: 97% Authenticity] Authenticity verified firsthand.',
   jsonb_build_object(
     'isAuthentic', true,
     'authenticityScore', 97,
     'detectedStudentId', '02000000050',
     'detectedStudentName', 'Yanna Dimaculangan',
     'detectedDocType', 'Laboratory Diagnostic Report',
     'issueDate', 'October 22, 2026',
     'studentIdMatches', true,
     'authenticityMarkers', jsonb_build_array('DOH Accredited Stamp', 'Pathologist Signature'),
     'flags', jsonb_build_array(),
     'summary', 'Authentic diagnostic report with DOH accredited laboratory serial number.'
   )),

  (3476, '02000351089', 'Audiometry & Visual Acuity Screening Record', 'Standard sensory screening evaluation form.',
   'Verified', NOW() - INTERVAL '40 minutes',
   'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
   '[AI Verified: 96% Authenticity] Authenticity verified firsthand.',
   jsonb_build_object(
     'isAuthentic', true,
     'authenticityScore', 96,
     'detectedStudentId', '02000000050',
     'detectedStudentName', 'Yanna Dimaculangan',
     'detectedDocType', 'Sensory Evaluation Form',
     'issueDate', 'October 21, 2026',
     'studentIdMatches', true,
     'authenticityMarkers', jsonb_build_array('Optometrist Signature & License'),
     'flags', jsonb_build_array(),
     'summary', 'Vision and audiometry evaluation verified authentic.'
   ));
