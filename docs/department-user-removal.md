# Removing Department users from the client list

The existing client removal flow now also supports accounts with a Department
role, including Department + Client accounts. The role alone no longer blocks
deletion. Accounts containing the Admin role, self-deletion, and ambiguous identities
with both student and staff profiles remain protected.

The existing assignment checks remain: reassign the user's clearance templates
(including inactive templates) and any tasks they own before deleting them. This
prevents deleting templates or tasks needed by other clients through foreign-key
cascades. Deletion continues to remove the application identity, profile, clearance
records, and personal notifications atomically. It retains the separate Supabase
Auth account and its roles for later re-enrollment.

Retaining Auth no longer permits a removed Department user to enter the app:

- OAuth and legacy token login require a current enrolled profile for Client and
  Department roles. Admin remains exempt from enrollment checks.
- The proxy checks Department pages/APIs, personal clearance pages/APIs, and the
  department dashboard API against current enrollment, regardless of stale claims.
- The Department layout mounts the same removal guard as the Client layout. Confirmed
  removal clears private query caches, signs out locally, and redirects to
  `/?notice=not-enrolled` with the existing contact-the-administrator message.
- Missed realtime events are recovered by checks every 15 seconds while visible,
  and on focus/reconnection. Network/database failures do not trigger removal.

No schema migration or Auth-role mutation is required. No actual application users
are deleted by the tests.

## Verification

```sh
node --test tests/*.test.cjs
npx tsc --noEmit
CLIENT_REMOVAL_TEST_CONTAINER=supabase_db_next-webc node tests/admin-client-removal.postgres.cjs
PLAYWRIGHT_MODULE=/tmp/webc-prod-test-tools/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=/tmp/webc-browser-cache node tests/department-removal.browser.cjs
NODE_OPTIONS='--max-old-space-size=4096 --dns-result-order=ipv4first' npx next build --turbopack
```

Container mode for the database regression requires DATABASE_URL to refer to the
local Supabase instance at 127.0.0.1:54322/postgres. It creates/drops a temporary
database and never changes application rows. The browser regression uses real
production React components with simulated HTTP/Auth boundaries; database tests
separately exercise the actual deletion handler and OAuth enrollment check.
