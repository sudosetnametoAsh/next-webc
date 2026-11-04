// Validate the complete seed against a schema-only copy of the local Supabase DB.
// The source database is read only; writes target a temporary validation database.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const container = process.env.SEED_TEST_CONTAINER;
if (!container || !/^supabase_db_[a-zA-Z0-9_-]+$/.test(container)) throw new Error('Set SEED_TEST_CONTAINER to the local Supabase database container.');
const database = 'codex_seed_validation_' + process.pid;
function docker(args, input) {
  const command = args.includes('supabase_admin') ? ['sh', '-c', 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec "$@"', '--', ...args] : args;
  return execFileSync('docker', ['exec', '-i', container, ...command], { input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}
let created = false;
try {
  const schema = docker(['pg_dump', '-U', 'postgres', '-d', 'postgres', '--schema-only', '--no-owner', '--no-privileges']);
  docker(['createdb', '-U', 'postgres', database]); created = true;
  const psql = ['psql', '-X', '-U', 'supabase_admin', '-d', database, '-v', 'ON_ERROR_STOP=1', '--single-transaction'];
  docker(psql, schema);
  docker(psql, fs.readFileSync('supabase/seed.sql', 'utf8'));
  const result = docker(['psql', '-X', '-U', 'postgres', '-d', database, '-At', '-c', `SELECT
    (SELECT count(*) FROM public.students)>0,
    (SELECT count(*) FROM public.staffs)>0,
    (SELECT count(*) FROM public.clearance_records)>0,
    to_regclass('public.clearance_logs') IS NULL,
    NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staffs' AND column_name IN ('time_in','time_out')),
    NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='phone_number');`]).trim();
  assert.equal(result, 't|t|t|t|t|t');
  console.log('PASS: the entire seed imports into a fresh copy of the current local schema; students, staff, and clearances exist; removed tables and columns are absent.');
} catch (error) {
  console.error(error.stderr?.toString() || error.message); process.exitCode = 1;
} finally {
  if (created) docker(['dropdb', '-U', 'postgres', database]);
}
