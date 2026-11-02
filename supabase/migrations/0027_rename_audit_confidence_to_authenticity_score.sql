-- Migration: 0027_rename_audit_confidence_to_authenticity_score
-- Replaces confidenceScore and confidence in clearance_tasks.ai_audit_report with authenticityScore

-- 1. Transform existing records to authenticityScore
UPDATE clearance_tasks
SET ai_audit_report = 
  (ai_audit_report - 'confidenceScore' - 'confidence') || 
  jsonb_build_object(
    'authenticityScore', 
    COALESCE(
      ai_audit_report->'authenticityScore', 
      ai_audit_report->'confidenceScore', 
      ai_audit_report->'confidence'
    )::numeric
  )
WHERE ai_audit_report IS NOT NULL 
  AND (ai_audit_report ? 'confidenceScore' OR ai_audit_report ? 'confidence');

-- 2. Correct Task 115 (the invalid photograph of books) down to 0% authenticity
UPDATE clearance_tasks
SET ai_audit_report = jsonb_set(ai_audit_report, '{authenticityScore}', '0'::jsonb)
WHERE assigned_task_id = 115;
