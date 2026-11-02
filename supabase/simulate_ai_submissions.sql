-- Simulate realistic AI-verified submissions for Two-Factor Verification demonstration

-- 1. AI Verified (Factor 1 Passed: 96% confidence)
UPDATE clearance_tasks
SET 
  status = 'Verified',
  comments = '[AI Verified: 96%] Official Medical Clearance Certificate verified with hospital stamp and matching student identity.',
  ai_audit_report = '{
    "isAuthentic": true,
    "confidenceScore": 96,
    "detectedStudentId": "2024-00123",
    "detectedStudentName": "Juan Dela Cruz",
    "detectedDocType": "Medical Examination & Laboratory Clearance",
    "issueDate": "October 18, 2026",
    "studentIdMatches": true,
    "authenticityMarkers": [
      "Official University Health Services Seal",
      "Physician License Stamp & Signature",
      "Laboratory Serial Number #LAB-88412"
    ],
    "flags": [],
    "summary": "Genuine university medical clearance certificate. All physical examination requirements passed for 1st Semester 2026-2027."
  }'::jsonb
WHERE assigned_task_id = 82;

-- 2. AI Verified (Factor 1 Passed: 94% confidence)
UPDATE clearance_tasks
SET 
  status = 'Verified',
  comments = '[AI Verified: 94%] Official Dental Clinic examination slip verified.',
  ai_audit_report = '{
    "isAuthentic": true,
    "confidenceScore": 94,
    "detectedStudentId": "2024-00124",
    "detectedStudentName": "Maria Clara",
    "detectedDocType": "Dental Health Examination Certificate",
    "issueDate": "October 16, 2026",
    "studentIdMatches": true,
    "authenticityMarkers": [
      "Dental Clinic Dry Seal",
      "Dentist Signature Present",
      "Oral Prophylaxis Acknowledgment"
    ],
    "flags": [],
    "summary": "Dental certificate verified. Clear dental status confirmed without active accountabilities."
  }'::jsonb
WHERE assigned_task_id = 83;

-- 3. AI Flagged (Factor 1 Anomaly: Mismatched Student ID & Low Confidence)
UPDATE clearance_tasks
SET 
  status = 'Flagged',
  comments = '[AI Flagged: 58%] Detected Student ID (2022-09141) does not match student account (2024-00125).',
  ai_audit_report = '{
    "isAuthentic": false,
    "confidenceScore": 58,
    "detectedStudentId": "2022-09141",
    "detectedStudentName": "Carlos Mendoza",
    "detectedDocType": "Vaccination Card Photo",
    "issueDate": "June 14, 2022",
    "studentIdMatches": false,
    "authenticityMarkers": ["LGU Health Center Stamp"],
    "flags": [
      "Student ID on document (2022-09141) does not match student account (2024-00125)",
      "Document issue date is outside current academic clearance term"
    ],
    "summary": "Mismatched student credentials detected. Document appears to belong to another student or an expired clearance period."
  }'::jsonb
WHERE assigned_task_id = 84;
