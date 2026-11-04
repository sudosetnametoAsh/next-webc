// Integration checks for a designated disposable PostgreSQL container only.
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const container = process.env.STAFF_ENROLLMENT_TEST_CONTAINER;
if (!container || !/^webc-staff-enrollment-test(?:-[0-9]+)?$/.test(container)) throw new Error('Set STAFF_ENROLLMENT_TEST_CONTAINER to a disposable webc-staff-enrollment-test container.');
const db = 'staff_enrollment_' + process.pid;
execFileSync('docker', ['exec', container, 'createdb', '-U', 'postgres', db]);
function sql(query) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', db, '-At', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
const q = (value) => "'" + value.replace(/'/g, "''") + "'";
(async () => {
  sql(['anon', 'authenticated', 'service_role', 'supabase_auth_admin'].map((role) =>
    `DO $roles$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $roles$;`
  ).join('\n'));
  sql(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE TABLE public.users(user_id text PRIMARY KEY, email text NOT NULL, auth_id uuid REFERENCES auth.users(id));
    CREATE TABLE public.students(student_id text PRIMARY KEY REFERENCES public.users(user_id));
    CREATE TABLE public.staffs(staff_id text PRIMARY KEY REFERENCES public.users(user_id), staff_name text NOT NULL CHECK(staff_name <> 'FAIL_STAFF_WRITE'));
    CREATE TABLE public.clearance_departments(dept_id int PRIMARY KEY, dept_name text);
    CREATE TABLE public.clearance_templates(template_id int PRIMARY KEY, course_id int, staff_id text, dept_id int);
    CREATE TABLE public.clearance_records(user_id varchar(11) REFERENCES public.users(user_id), template_id int REFERENCES public.clearance_templates(template_id), status text, UNIQUE(user_id, template_id));
    INSERT INTO public.clearance_templates VALUES(1,NULL,NULL,NULL);`);
  const triggers = fs.readFileSync('supabase/migrations/0032_auto_generate_clearance_records_and_constraints.sql', 'utf8');
  sql(triggers.slice(triggers.indexOf('-- 5. Staff Creation Trigger Function'), triggers.indexOf('-- 6. Template Backfill')));
  sql(fs.readFileSync('supabase/migrations/0031_first_login_auth_handshake.sql', 'utf8'));
  sql(fs.readFileSync('supabase/migrations/20261104000000_staff_enrollment_identity.sql', 'utf8'));
  const id = sql("SELECT public.enroll_staff_identity(' Staff@Example.edu ', 'New Staff');");
  assert.match(id, /^S[0-9A-F]{10}$/);
  assert.equal(sql(`SELECT count(*) FROM public.clearance_records WHERE user_id=${q(id)};`), '1');
  assert.equal(sql("SELECT public.enroll_staff_identity('staff@example.edu', 'Updated Staff');"), id);
  assert.equal(sql('SELECT count(*) FROM public.users;'), '1');
  sql("INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-000000000001','staff@example.edu');");
  assert.equal(sql(`SELECT auth_id FROM public.users WHERE user_id=${q(id)};`), '00000000-0000-0000-0000-000000000001');
  assert.equal(sql(`SELECT public.custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-000000000001","claims":{"email":"staff@example.edu","user_metadata":{"custom_claims":{"roles":["Client"]}}}}'::jsonb)->'claims'->>'user_id';`), id);
  sql("INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-000000000002','existing@example.edu');");
  const afterLogin = sql("SELECT public.enroll_staff_identity('existing@example.edu','Existing Login');");
  assert.equal(sql(`SELECT auth_id FROM public.users WHERE user_id=${q(afterLogin)};`), '00000000-0000-0000-0000-000000000002');
  sql("UPDATE auth.users SET email='renamed@example.edu' WHERE id='00000000-0000-0000-0000-000000000002';");
  assert.equal(sql("SELECT public.enroll_staff_identity('renamed@example.edu','Renamed Login');"), afterLogin);
  assert.equal(sql("SELECT public.enroll_staff_identity('legacy@example.edu','Legacy Staff','EMP001');"), 'EMP001');
  assert.equal(sql("SELECT public.enroll_staff_identity('LEGACY@example.edu','Legacy Updated');"), 'EMP001');
  assert.throws(() => sql("SELECT public.enroll_staff_identity('other@example.edu','Other','EMP001');"));
  assert.equal(sql("SELECT email FROM public.users WHERE user_id='EMP001';"), 'legacy@example.edu');
  assert.throws(() => sql("SELECT public.enroll_staff_identity('legacy@example.edu','Other','DIFFERENT');"));
  assert.throws(() => sql("SELECT public.enroll_staff_identity('rollback@example.edu','FAIL_STAFF_WRITE');"));
  assert.equal(sql("SELECT count(*) FROM public.users WHERE email='rollback@example.edu';"), '0');
  assert.equal(sql("SELECT has_function_privilege('authenticated','public.enroll_staff_identity(text,text,text)','EXECUTE');"), 'f');
  assert.equal(sql("SELECT has_function_privilege('anon','public.enroll_staff_identity(text,text,text)','EXECUTE');"), 'f');
  assert.equal(sql("SELECT has_function_privilege('service_role','public.enroll_staff_identity(text,text,text)','EXECUTE');"), 't');
  assert.throws(() => sql("SET ROLE authenticated; SELECT public.enroll_staff_identity('blocked@example.edu','Blocked');"));
  const concurrent = () => new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', db, '-At', '-v', 'ON_ERROR_STOP=1']);
    let output = '', errors = '';
    child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { errors += chunk; });
    child.on('error', reject); child.on('close', (code) => code ? reject(new Error(errors)) : resolve(output.trim()));
    child.stdin.end("SELECT public.enroll_staff_identity('concurrent@example.edu','Concurrent Staff');");
  });
  const identities = await Promise.all(Array.from({ length: 8 }, concurrent));
  assert.equal(new Set(identities).size, 1);
  assert.equal(sql("SELECT count(*) FROM public.users WHERE email='concurrent@example.edu';"), '1');
  assert.equal(sql(`SELECT count(*) FROM public.clearance_records WHERE user_id=${q(identities[0])};`), '1');
  sql("INSERT INTO public.users VALUES('STUDENT01','student@example.edu',NULL); INSERT INTO public.students VALUES('STUDENT01');");
  assert.throws(() => sql("SELECT public.enroll_staff_identity('student@example.edu','Student Collision');"));
  sql("INSERT INTO public.users VALUES('DUP1','duplicate@example.edu',NULL),('DUP2','DUPLICATE@example.edu',NULL);");
  assert.throws(() => sql("SELECT public.enroll_staff_identity('duplicate@example.edu','Ambiguous');"));
  // Exercise the actual own-record policies with the generated ID and linked UUID.
  sql(`CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT SELECT ON public.users, public.clearance_records TO authenticated;
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.clearance_records ENABLE ROW LEVEL SECURITY;`);
  const baseline = fs.readFileSync('supabase/migrations/0014_latest_migration.sql', 'utf8');
  for (const policy of ['users can view own user record', 'users view their own clearance']) {
    const start = baseline.indexOf('CREATE POLICY "' + policy + '"');
    sql(baseline.slice(start, baseline.indexOf(';', start) + 1));
  }
  const visible = sql("SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; SET ROLE authenticated; SELECT user_id FROM public.clearance_records;").split('\n').filter((line) => line !== 'SET');
  assert.deepEqual(visible, [id], 'generated-ID staff can read their own clearance but no other staff clearance');
  // Apply the actual retirement migrations against existing staff and clearance data.
  sql(`ALTER TABLE public.staffs ADD COLUMN time_in time, ADD COLUMN time_out time,
    ADD COLUMN weekly_schedule jsonb, ADD COLUMN early_out_date date;
    CREATE TABLE public.clearance_logs(log_id serial PRIMARY KEY, staff_id text REFERENCES public.staffs(staff_id));
    CREATE PUBLICATION retirement_test FOR TABLE public.clearance_logs;
    INSERT INTO public.clearance_logs(staff_id) VALUES (${q(id)});
    UPDATE public.staffs SET time_in='08:00', time_out='17:00' WHERE staff_id=${q(id)};
    UPDATE public.staffs SET time_in='08:00', time_out='17:00', weekly_schedule='{"mon":{"active":false,"time_in":"10:00","time_out":"15:00"}}' WHERE staff_id=${q(afterLogin)};`);
  const staffCount = sql('SELECT count(*) FROM public.staffs;');
  const recordCount = sql('SELECT count(*) FROM public.clearance_records;');
  const backfill = fs.readFileSync('supabase/migrations/20261104000002_backfill_staff_weekly_schedule.sql', 'utf8');
  sql(backfill); sql(backfill);
  assert.equal(sql(`SELECT weekly_schedule->'mon'->>'time_in' FROM public.staffs WHERE staff_id=${q(id)};`), '08:00');
  assert.equal(sql(`SELECT weekly_schedule->'sat'->>'active' FROM public.staffs WHERE staff_id=${q(id)};`), 'false');
  assert.equal(sql(`SELECT weekly_schedule->'mon'->>'time_in' FROM public.staffs WHERE staff_id=${q(afterLogin)};`), '10:00');
  assert.equal(sql("SELECT weekly_schedule IS NULL FROM public.staffs WHERE staff_id='EMP001';"), 't');
  const removal = fs.readFileSync('supabase/migrations/20261104000003_remove_legacy_staff_hours_and_clearance_logs.sql', 'utf8');
  sql(removal); sql(removal);
  assert.equal(sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='staffs' AND column_name IN ('time_in','time_out');"), '0');
  assert.equal(sql("SELECT to_regclass('public.clearance_logs') IS NULL;"), 't');
  assert.equal(sql("SELECT count(*) FROM pg_publication_tables WHERE pubname='retirement_test';"), '0');
  assert.equal(sql('SELECT count(*) FROM public.staffs;'), staffCount);
  assert.equal(sql('SELECT count(*) FROM public.clearance_records;'), recordCount);
  const newStaff = sql("SELECT public.enroll_staff_identity('afterdrop@example.edu','After Removal');");
  assert.equal(sql(`SELECT count(*) FROM public.clearance_records WHERE user_id=${q(newStaff)};`), '1');
  console.log('PASS: schedule backfill preserves saved weeks, leaves missing hours unset, and is repeatable; retirement drops only legacy hours and logs, removes its publication entry, preserves clearance records, and staff enrollment still creates clearances.');
  console.log('PASS: generated IDs, repeat enrollment, preserved legacy IDs, login/JWT linking, own-record RLS queries, clearance creation, rollback, service-only access, conflicting identities, and eight concurrent enrollments.');
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
