// Runs only against the designated disposable container's local socket.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const socket = process.env.CLIENT_REMOVAL_TEST_SOCKET;
if (!socket || !/^\/tmp\/webc-client-removal-test-socket(?:-[0-9]+)?$/.test(socket)) throw new Error('Set CLIENT_REMOVAL_TEST_SOCKET to a designated disposable database socket directory.');
const options = { host: socket, user: 'postgres', password: 'test-only', max: 1, prepare: false };
const control = postgres({ ...options, database: 'postgres' });
const database = 'client_removal_' + process.pid;
let sql, authSql;
function load(file, deps) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, console, require: (name) => name in deps ? deps[name] : require(name) });
  return exports;
}
(async () => {
  await control.unsafe('CREATE DATABASE ' + database);
  sql = postgres({ ...options, database });
  authSql = postgres({ ...options, database });
  await sql.unsafe(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, roles jsonb);
    CREATE TABLE public.users(user_id varchar PRIMARY KEY, email varchar NOT NULL, auth_id uuid);
    CREATE TABLE public.students(student_id varchar PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE, student_name text);
    CREATE TABLE public.staffs(staff_id varchar PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE, staff_name varchar NOT NULL, weekly_schedule jsonb, early_out_date varchar);
    CREATE TABLE public.clearance_records(clearance_id serial PRIMARY KEY, user_id varchar REFERENCES public.users(user_id) ON DELETE CASCADE);
    CREATE TABLE public.clearance_templates(template_id serial PRIMARY KEY, staff_id varchar REFERENCES public.staffs(staff_id) ON DELETE CASCADE);
    CREATE TABLE public.clearance_tasks(assigned_task_id serial PRIMARY KEY, clearance_id int REFERENCES public.clearance_records(clearance_id) ON DELETE CASCADE, staff_id varchar REFERENCES public.staffs(staff_id) ON DELETE CASCADE, assigned_at timestamptz DEFAULT now());
    CREATE TABLE public.notifications(notif_id serial PRIMARY KEY, user_id varchar REFERENCES public.users(user_id) ON DELETE CASCADE);
    CREATE TABLE public.enrollments(student_id varchar REFERENCES public.students(student_id) ON DELETE CASCADE, section_id int);
    INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001','["Client"]');
    INSERT INTO public.users VALUES ('officer','officer@example.edu',NULL),('other','other@example.edu',NULL);
    INSERT INTO public.staffs(staff_id,staff_name) VALUES('officer','Officer');
    INSERT INTO public.notifications(user_id) VALUES('other'),(NULL);`);
  const schema = load('src/lib/db/schema.ts', {});
  const db = drizzle(sql, { schema });
  const route = load('src/app/api/admin/clients/route.ts', {
    '@/lib/db': { db }, '@/lib/db/schema': schema,
    '@/lib/db/supabase-server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000099', email: 'admin@example.edu', user_metadata: { custom_claims: { roles: ['Admin'] } } } } }) } }) },
    '@/lib/db/supabase-admin': { getSupabaseAdmin: () => ({ auth: { admin: { getUserById: async (id) => {
      const [user] = await authSql`SELECT roles FROM auth.users WHERE id=${id}`;
      return { data: { user: { user_metadata: { custom_claims: { roles: user?.roles || [] } } } }, error: null };
    } } } }) },
    '@/lib/services/admin-cache': { invalidateServerAdminCache() {} },
    '@/lib/services/department-cache': { invalidateServerDepartmentCache() {} },
    '@/lib/services/clearance-cache': { invalidateServerClearanceCache() {} },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  const remove = (id, type) => route.DELETE({ json: async () => ({ id, type }) });
  async function enroll(id, type) {
    await sql`INSERT INTO public.users VALUES (${id},${id + '@example.edu'},'00000000-0000-0000-0000-000000000001')`;
    await sql.unsafe(`INSERT INTO public.${type === 'student' ? 'students(student_id,student_name)' : 'staffs(staff_id,staff_name)'} VALUES ($1,$2)`, [id, id]);
    const [record] = await sql`INSERT INTO public.clearance_records(user_id) VALUES(${id}) RETURNING clearance_id`;
    await sql`INSERT INTO public.clearance_tasks(clearance_id,staff_id) VALUES(${record.clearance_id},'officer')`;
    await sql`INSERT INTO public.notifications(user_id) VALUES(${id})`;
    if (type === 'student') await sql`INSERT INTO public.enrollments VALUES(${id},1)`;
  }
  for (const type of ['student', 'staff']) {
    const id = 'test-' + type;
    await enroll(id, type);
    assert.equal((await remove(id, type)).status, 200);
    for (const table of ['users', 'clearance_records', 'notifications']) assert.equal(Number((await sql.unsafe(`SELECT count(*) FROM public.${table} WHERE user_id=$1`, [id]))[0].count), 0);
    assert.equal(Number((await sql`SELECT count(*) FROM public.clearance_tasks`)[0].count), 0);
    assert.equal(Number((await sql`SELECT count(*) FROM auth.users`)[0].count), 1);
    assert.equal(Number((await sql`SELECT count(*) FROM public.notifications`)[0].count), 2, 'other-user and broadcast alerts survive');
    await enroll(id, type);
    assert.equal(Number((await sql`SELECT count(*) FROM public.notifications WHERE user_id=${id}`)[0].count), 1, 're-enrollment has only its newly inserted alert');
    await remove(id, type);
  }
  await enroll('rollback', 'student');
  await sql.unsafe(`CREATE FUNCTION fail_user_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected final deletion failure'; END $$;
    CREATE TRIGGER prevent_delete BEFORE DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION fail_user_delete();`);
  assert.equal((await remove('rollback', 'student')).status, 500);
  assert.equal(Number((await sql`SELECT count(*) FROM public.students WHERE student_id='rollback'`)[0].count), 1);
  assert.equal(Number((await sql`SELECT count(*) FROM public.notifications WHERE user_id='rollback'`)[0].count), 1);
  assert.equal(Number((await sql`SELECT count(*) FROM public.clearance_tasks`)[0].count), 1);
  const [time] = await sql`SELECT '2026-11-04T14:45:00+08:00'::timestamptz AS instant, to_char('2026-11-04T14:45:00+08:00'::timestamptz AT TIME ZONE 'UTC','HH24:MI') AS utc, to_char('2026-11-04T06:45:00Z'::timestamptz AT TIME ZONE 'Asia/Manila','HH24:MI') AS manila`;
  assert.equal(time.utc, '06:45'); assert.equal(time.manila, '14:45');
  console.log('PASS: actual admin deletion handler on PostgreSQL removes users/profiles/notifications, cascades tasks/enrollment, preserves Auth and shared alerts, supports re-enrollment, and rolls back every deletion on failure; timestamp example confirms UTC/Manila equivalence.');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await sql?.end();
  await authSql?.end();
  await control.unsafe('DROP DATABASE IF EXISTS ' + database);
  await control.end();
});
