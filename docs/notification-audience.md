# Course template and admin notification audiences

Template publication now inserts one personal notification per enrolled client in
the courses returned by the successful template save. Multiple sections, department
templates, and selected courses cannot duplicate a recipient within that publication.
Clients in other courses, courses without active templates, and clients without
matching enrollment receive no publication notice. Officer assignment notifications
remain direct notifications to their assigned officers.

Existing course-scoped broadcasts are filtered against the current user's enrollment
by both the notification API and its direct-query fallback. Read flags on historical
shared broadcasts remain shared; new publication notices have independent read flags.

Bottlenecks are hidden from all non-admin feeds, including legacy alerts identified
by category, title, or metadata. Requesting `role=admin` is checked against the
signed-in account's role. The notification API uses the signed-in user ID instead
of caller-supplied IDs or a hardcoded student fallback.

## Database enforcement

Apply `supabase/migrations/20261105000001_admin_only_bottleneck_notifications.sql`
before deploying. It adds a restrictive SELECT policy to the existing notifications
table so clients, department staff, and anonymous connections cannot retrieve
bottleneck content even through direct Supabase access. It adds no tables or columns
and does not rewrite or delete notification history. Admins retain access.

For the default local Supabase container:

```sh
docker exec -i supabase_db_next-webc psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261105000001_admin_only_bottleneck_notifications.sql
```

The timestamp migration is not in the older Drizzle migration journal; apply it
explicitly through your SQL migration workflow. Schema generation alone does not
apply it. Tests apply it only to an isolated schema copy, never the application DB.

## Validation

```sh
node --test tests/*.test.cjs
npx tsc --noEmit
NOTIFICATION_TEST_CONTAINER=supabase_db_next-webc node tests/template-notifications.postgres.cjs
NODE_OPTIONS='--max-old-space-size=4096 --dns-result-order=ipv4first' npx next build --turbopack
```

The database regression verifies prepared SQL parameters, recipients in the selected
courses, deduplication across sections/courses/templates, independent reads, delivery
to 1,001 clients, and restrictive bottleneck policies for client/department/admin/
anonymous roles. It also verifies policy reapplication and that a non-admin cannot
mark hidden bottlenecks read. The temporary validation database is removed afterward.
