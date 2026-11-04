// Only creates a temporary table and rolls back; does not change application data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('dotenv').config({ quiet: true });
const sql = require('postgres')(process.env.DATABASE_URL, { max: 1, connect_timeout: 8, prepare: false });
(async () => {
  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL TIME ZONE 'America/Los_Angeles'`;
      await tx`CREATE TEMP TABLE timestamp_regression (id int, signed_at timestamp without time zone)`;
      await tx`INSERT INTO timestamp_regression VALUES (1, '2026-11-04 06:45:00'), (2, NULL)`;
      const migration = fs.readFileSync('supabase/migrations/20261104000004_preserve_timestamp_timezones.sql', 'utf8')
        .replaceAll('public.clearance_records', 'pg_temp.timestamp_regression')
        .replace("table_schema = 'public'", 'table_schema = (SELECT nspname FROM pg_namespace WHERE oid = pg_my_temp_schema())')
        .replace("table_name = 'clearance_records'", "table_name = 'timestamp_regression'");
      await tx.unsafe(migration);
      await tx.unsafe(migration); // Safe to reapply.
      const [row] = await tx`SELECT signed_at AT TIME ZONE 'UTC' AS utc,
        to_char(signed_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH24:MI') AS manila
        FROM timestamp_regression WHERE id = 1`;
      assert.equal(row.manila, '2026-11-04 14:45');
      assert.equal((await tx`SELECT count(*)::int AS n FROM timestamp_regression WHERE signed_at IS NULL`)[0].n, 1);
      assert.equal((await tx`SELECT data_type FROM information_schema.columns
        WHERE table_name = 'timestamp_regression' AND column_name = 'signed_at'`)[0].data_type, 'timestamp with time zone');
      throw Object.assign(new Error('rollback regression fixture'), { passed: true });
    });
  } catch (error) {
    if (!error.passed) throw error;
    console.log('Passed: UTC history, Manila display, null preservation, idempotence under a non-UTC session.');
  } finally { await sql.end(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
