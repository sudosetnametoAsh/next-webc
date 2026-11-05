# Academic periods

Academic year and term belong to a saved clearance period, not the student's year level or the export date.

## Deployment

Apply `supabase/migrations/20261105000000_academic_periods.sql`, `supabase/migrations/20261105000002_period_lifecycle.sql`, `supabase/migrations/20261105000003_safe_term_notification_cleanup.sql`, then `supabase/migrations/20261106000000_unified_staff_enrollments.sql`, then `supabase/migrations/20261106000001_carryover_directory_details.sql`, then `supabase/migrations/20261106000002_remove_current_participation.sql` through the project's database migration workflow before deploying the application changes. The migration is transactional and initializes **2026–2027, Term 1**, as confirmed by the administrator. The lifecycle migration keeps the existing active period open and preserves its current roster. New periods have an optional client opening date and time.

The migration refuses to discard duplicate legacy enrollments. Check these before rollout:

```sql
SELECT student_id, array_agg(section_id ORDER BY section_id) AS sections
FROM public.enrollments
GROUP BY student_id
HAVING count(*) > 1;
```

If this returns rows, confirm the correct section for each student before retrying. Do not delete approvals, submissions, or clearance records to resolve these conflicts.

After applying, verify:

```sql
SELECT * FROM public.academic_periods ORDER BY period_id;
SELECT period_id, count(*) FROM public.enrollments GROUP BY period_id;
SELECT period_id, status, count(*) FROM public.clearance_records GROUP BY period_id, status;
```

No production database migration is run by the application or test suite.

## Admin workflow

Open **Admin → Clients → Manage A.Y. - Term**. The former Academic Periods URL redirects here.

- **Save** prepares the year and term. Admins and enrolled Department-role officers can configure requirements and sign clearances while client access remains closed.
- **Start** opens client access immediately for newly configured terms. The modal no longer exposes an opening-date field; previously saved schedules remain supported by the API and database. The database enforces scheduled access using its clock; no cron job is required. The saved state can remain `preparing` after the scheduled opening, so use `period_is_open()` to determine effective access.
- **End Term** closes access and clears all notifications in one transaction, preserves accounts and clearance history, then opens the next-term configuration. Cancelling that configuration leaves the previous term ended.

For the next term, use separate **Carry over students** and **Carry over staff** checkboxes. **Select students / staff to carry over** remains visible regardless of either checkbox. The selection workflow reuses the Clients table, search, type/status/course/section filters, and pagination, with department officers included in the staff list, then reviews excluded participants before returning to the configuration. Carryover keeps students' sections; it does not advance year levels. Templates can be carried only when every assigned officer is included. Without template carryover, old templates are archived and new requirements can be configured.

Staff enrollment controls participation for both staff clients and department officers. The OAuth Department role determines who may manage and sign; enrollment in the working term is also required. Fresh staff clearances are generated for selected staff. Accounts omitted from carryover remain stored but cannot access either portal for that term. Assigning a template does not silently enroll an excluded staff member or grant the Department role. The unified migration merges existing officer participation into staff enrollment before removing the old officer table and its view; historical memberships and clearance data remain stored.

Only one working period can exist. Configuration changes to an existing preparing period preserve its roster and work. Open/ended period configurations cannot be rewritten, and ended terms cannot be reactivated. Lifecycle operations are serialized and transactional. Enrollment/import uses the working period automatically; staff enrollment also checks the expected period atomically. Template removal archives the workflow rather than deleting historical references.

## Data and access

- `academic_periods`: year range, term, preparing/open/ended state, optional opening time, start request, end time, and source period. `is_active` identifies the working period and does not itself mean client access is open.
- `staff_enrollments`: one row per staff member and period, including department officers. Renamed from `period_staff_enrollments`.
- `current_staffs`: current roster view over retained staff identities.
- `period_department_staff` and `current_department_staff` are removed by the unified migration.
- `enrollments.period_id`: one section per student per period.
- `clearance_records.period_id`: one record per user/template/period.
- `clearance_records.document_snapshot`: names, department, signatory, phase, program, and period values saved for document history.
- `current_clearance_records`, `current_clearance_tasks`, `current_enrollments`: updatable security-invoker views used for operational reads/writes, including service-role requests. Enrollment upserts target the physical table using `(student_id, period_id)`.
- Restrictive RLS and write guards protect archived approvals, tasks, enrollments, and participation rosters. Current client reads require both an open period and enrollment; Department access requires the Department role and staff enrollment. Identity owners can still read their own profile to sign in, but excluded/pre-opening clients cannot read other directory data. Server route guards enforce the same rules on service-backed APIs.
- `clearance_document_history`: owner/admin-only saved-document access. Current operational APIs do not accept arbitrary period overrides.

Students can select a previous period on the clearance page and download its completed clearance. PDFs use that document's period and saved signatories even after the active year, student profile, or template changes. Academic year and term are included in the filename.

## Verification

```sh
node --test tests/academic-periods.test.cjs tests/period-lifecycle.test.cjs tests/academic-periods-api.test.cjs tests/term-management-ui.test.cjs
node --test tests/clearance-pdf.test.cjs
node --test tests/*.test.cjs
npm run build
```

Database tests apply the actual migration to isolated in-memory PostgreSQL (PGlite); they never use `.env` credentials or the production database.

## Removing current participation

The Clients action is **Remove from current term**, individually or in bulk. It sets only the current enrollment's `is_active` to false; account/profile rows, enrollment history, tasks, signatures and notifications are retained, including clients with existing work. Active template assignments and current-term task responsibilities must be reassigned before an officer can be removed. Previous-term assignments do not prevent removal.

Operational views, access RPCs and carryover candidates exclude inactive enrollment rows. Database work guards reject new requirements or changed task/signature statuses for inactive clients, including requests already in flight. Auth sessions remain valid, but route/RLS participation checks deny access; the client guard reconciles via realtime and a 15-second visible-page fallback. Re-enrollment sets the current membership active again and preserves existing work rather than resetting approvals.
