// Runs the actual delivery query against an isolated schema copy, never application rows.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PgDialect } = require('drizzle-orm/pg-core');
const container = process.env.NOTIFICATION_TEST_CONTAINER;
if (!container || !/^supabase_db_[a-zA-Z0-9_-]+$/.test(container)) throw new Error('Set NOTIFICATION_TEST_CONTAINER to the local Supabase DB container.');
const database = 'codex_schedule_notifications_' + process.pid;
function docker(args, input) {
  const command = args.includes('supabase_admin') ? ['sh', '-c', 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec "$@"', '--', ...args] : args;
  return execFileSync('docker', ['exec', '-i', container, ...command], { input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}
const psql = ['psql', '-X', '-U', 'supabase_admin', '-d', database, '-v', 'ON_ERROR_STOP=1'];
const execute = (sql) => docker(psql, sql);
const scalar = (sql) => docker([...psql, '-At', '-c', sql]).trim();
const exportsForService = {};
let statement;
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/services/schedule-notifications.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsForService, require(name) {
  if (name === 'drizzle-orm') return require(name);
  if (name === '@/lib/db') return { db: { execute: async (query) => { statement = query; } } };
  throw Error('Unexpected dependency: ' + name);
} });
async function deliver(staffId) {
  await exportsForService.notifyScheduleUpdate(staffId);
  const dialect = new PgDialect();
  const bound = dialect.sqlToQuery(statement);
  assert.ok(bound.params.every((value) => value === staffId), 'staff identity must be bound as SQL parameters');
  // Exercise PostgreSQL parameter inference as production does, rather than inlining values.
  const literals = bound.params.map((value) => "'" + value.replaceAll("'", "''") + "'").join(',');
  execute(`PREPARE schedule_delivery AS ${bound.sql}; EXECUTE schedule_delivery(${literals});`);
}
function loadModule(file, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, console, require(name) { return name in dependencies ? dependencies[name] : require(name); } });
  return exports;
}
function preparedQuery(bound, read = false) {
  const literal = (value) => value === null ? 'NULL' : typeof value === 'number' ? String(value)
    : "'" + String(value).replaceAll("'", "''") + "'";
  const query = read ? `SELECT row_to_json(persisted) FROM (${bound.sql}) persisted` : bound.sql;
  return `PREPARE persisted_schedule AS ${query}; EXECUTE persisted_schedule(${bound.params.map(literal).join(',')});`;
}
async function verifySchedulePersistence() {
  const schema = loadModule('src/lib/db/schema.ts', {});
  const builder = require('drizzle-orm/postgres-js').drizzle.mock();
  const databaseAdapter = {
    insert(table) { return { values(value) { return { onConflictDoUpdate(config) {
      execute(preparedQuery(builder.insert(table).values(value).onConflictDoUpdate(config).toSQL()));
    } }; } }; },
    select(fields) { return { from(table) { return { where(condition) { return { limit(limit) {
      const query = builder.select(fields).from(table).where(condition).limit(limit).toSQL();
      const result = scalar(preparedQuery(query, true)).split('\n').at(-1);
      return result ? [JSON.parse(result)] : [];
    } }; } }; } }; },
  };
  const { SupabaseStaffRepository } = loadModule('src/modules/staff/infrastructure/supabase-schedule-repository.ts', {
    '@/lib/db': { db: databaseAdapter }, '@/lib/db/schema': schema,
    '../application/error': { DatabaseError: class DatabaseError extends Error {} },
  });
  const helpers = loadModule('src/lib/weekly-schedule.ts', {});
  const { SetSchedule } = loadModule('src/modules/staff/application/use-case/set-schedule.ts', { '@/lib/weekly-schedule': helpers });
  const repository = new SupabaseStaffRepository({});
  const set = new SetSchedule(repository);
  const week = (openDays) => Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map((day) => [day, {
    active: openDays.includes(day), time_in: '08:00', time_out: '17:00',
  }]));
  await set.execute('nt-staff-a', 'Staff A', week(['mon','tue','wed']), null);
  const before = await repository.getSchedule('nt-staff-a');
  assert.equal(before.weekly_schedule.thu.active, false);
  await set.execute('nt-staff-a', 'Staff A', week(['mon','tue','wed','thu','fri']), null);
  const reloaded = await new SupabaseStaffRepository({}).getSchedule('nt-staff-a');
  for (const day of ['mon','tue','wed','thu','fri']) assert.equal(reloaded.weekly_schedule[day].active, true, day);
  assert.equal(reloaded.weekly_schedule.sat.active, false);
  assert.equal(reloaded.weekly_schedule.sun.active, false);
}
let created = false;
(async () => {
  try {
    const schema = docker(['pg_dump', '-U', 'postgres', '-d', 'postgres', '--schema-only', '--no-owner', '--no-privileges']);
    docker(['createdb', '-U', 'postgres', database]); created = true;
    execute(schema);
    execute(`
      INSERT INTO public.users(user_id,email) VALUES
        ('nt-staff-a','nta@example.test'),('nt-staff-b','ntb@example.test'),
        ('nt-client-a','ntca@example.test'),('nt-client-b','ntcb@example.test'),
        ('nt-client-c','ntcc@example.test'),('nt-client-d','ntcd@example.test');
      INSERT INTO public.staffs(staff_id,staff_name) VALUES ('nt-staff-a','Staff A'),('nt-staff-b','Staff B');
      INSERT INTO public.students(student_id,student_name) VALUES
        ('nt-client-a','Client A'),('nt-client-b','Client B'),('nt-client-c','Inactive client'),('nt-client-d','Unassigned client');
      INSERT INTO public.courses(course_id,course_name) VALUES
        (910001,'Test A'),(910002,'Test B'),(910003,'Test C'),(910004,'Inactive Test');
      INSERT INTO public.clearance_departments(dept_id,dept_name) VALUES(910001,'Test Clinic'),(910002,'Test Library');
      INSERT INTO public.clearance_templates(template_id,course_id,dept_id,staff_id,is_active) VALUES
        (910001,910001,910001,'nt-staff-a',true),
        (910002,910002,910001,'nt-staff-b',true),
        (910003,910003,910001,'nt-staff-a',true),
        (910004,910004,910001,'nt-staff-a',false),
        (910005,NULL,910002,'nt-staff-a',true);
      -- Staff templates automatically provision records; replace them with the exact test assignments.
      DELETE FROM public.clearance_records;
      INSERT INTO public.clearance_records(user_id,template_id) VALUES
        ('nt-client-a',910001),('nt-client-a',910003),
        ('nt-client-b',910002),('nt-client-c',910004),('nt-staff-b',910005);
    `);
    await verifySchedulePersistence();
    await deliver('nt-staff-a');
    assert.equal(scalar(`SELECT string_agg(user_id,',' ORDER BY user_id) FROM public.notifications`), 'nt-client-a,nt-staff-b');
    assert.equal(scalar(`SELECT count(*) FROM public.notifications WHERE user_id IS NULL OR is_read OR metadata ? 'weeklySchedule'`), '0');
    assert.equal(scalar(`SELECT metadata->>'staffId' FROM public.notifications WHERE user_id='nt-client-a'`), 'nt-staff-a');
    assert.equal(scalar(`SELECT count(*) FROM public.notifications WHERE user_id='nt-client-a'`), '1', 'multiple templates must not duplicate a client');
    assert.equal(scalar(`SELECT description FROM public.notifications WHERE user_id='nt-staff-b'`), 'Test Library updated their weekly office hours.');
    execute(`DELETE FROM public.notifications;`);
    await deliver('nt-staff-b');
    assert.equal(scalar(`SELECT string_agg(user_id,',') FROM public.notifications`), 'nt-client-b', 'same department must not merge staff audiences');
    execute(`DELETE FROM public.notifications;`);
    await deliver('no-assignments');
    assert.equal(scalar(`SELECT count(*) FROM public.notifications`), '0');
    await deliver("nt-staff-a' OR true --");
    assert.equal(scalar(`SELECT count(*) FROM public.notifications`), '0', 'staff identity is safely parameterized');
    execute(`INSERT INTO public.clearance_records(user_id,template_id) VALUES('nt-client-b',910001);
      INSERT INTO public.users(user_id,email) SELECT 'nt-'||g,'nt-'||g||'@example.test' FROM generate_series(1,1000) g;
      INSERT INTO public.students(student_id,student_name) SELECT 'nt-'||g,'Student '||g FROM generate_series(1,1000) g;
      INSERT INTO public.clearance_records(user_id,template_id) SELECT 'nt-'||g,910001 FROM generate_series(1,1000) g;`);
    const started = performance.now();
    await deliver('nt-staff-a');
    const elapsed = Math.round(performance.now() - started);
    assert.equal(scalar(`SELECT count(*) FROM public.notifications`), '1003', 'all clients must be delivered beyond the 1000-row API limit');
    execute(`UPDATE public.notifications SET is_read=true WHERE user_id='nt-client-a';`);
    assert.equal(scalar(`SELECT is_read FROM public.notifications WHERE user_id='nt-client-a'`), 't');
    assert.equal(scalar(`SELECT is_read FROM public.notifications WHERE user_id='nt-client-b'`), 'f', 'one client reading does not affect another');
    assert.equal(scalar(`SELECT count(*) FROM public.notifications WHERE is_read=false`), '1002');
    console.log(`PASS: actual repository save/reload from 3 to 5 weekdays, staff isolation, all active templates, deduplication, inactive/unassigned exclusion, staff clearance clients, parameter binding, independent reads, and 1003 personal rows (${elapsed}ms including docker/psql overhead).`);
  } catch (error) {
    console.error(error.stderr?.toString() || error.stack); process.exitCode = 1;
  } finally {
    if (created) docker(['dropdb', '-U', 'postgres', database]);
  }
})();
