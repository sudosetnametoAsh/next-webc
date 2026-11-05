const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const { pgTable, text, integer, boolean, jsonb } = require('drizzle-orm/pg-core');

test('hard removal preserves prior terms and accounts, deletes children before history guards, and rolls back failures', async () => {
 const pg = new PGlite();
 try {
  await pg.exec(`
   CREATE TABLE users(user_id text PRIMARY KEY, email text, auth_id text);
   CREATE TABLE students(student_id text PRIMARY KEY REFERENCES users(user_id), student_name text);
   CREATE TABLE staffs(staff_id text PRIMARY KEY REFERENCES users(user_id), staff_name text);
   CREATE TABLE academic_periods(period_id integer PRIMARY KEY, is_active boolean);
   CREATE TABLE courses(course_id integer PRIMARY KEY, course_name text);
   CREATE TABLE clearance_departments(dept_id integer PRIMARY KEY, dept_name text);
   CREATE TABLE clearance_templates(template_id integer PRIMARY KEY, staff_id text, course_id integer, dept_id integer, tier integer, is_active boolean);
   CREATE TABLE clearance_records(clearance_id integer PRIMARY KEY, user_id text REFERENCES users(user_id), period_id integer, status text, signed_at text);
   CREATE TABLE clearance_tasks(assigned_task_id integer PRIMARY KEY, clearance_id integer REFERENCES clearance_records(clearance_id) ON DELETE CASCADE, staff_id text, dropbox text);
   CREATE TABLE enrollments(student_id text REFERENCES students(student_id), period_id integer, is_active boolean);
   CREATE TABLE staff_enrollments(staff_id text REFERENCES staffs(staff_id), period_id integer, is_active boolean);
   CREATE TABLE notifications(notif_id integer PRIMARY KEY, user_id text, metadata jsonb);
   INSERT INTO academic_periods VALUES(1,false),(2,true);
   CREATE FUNCTION public.active_academic_period_id() RETURNS integer LANGUAGE sql AS $$ SELECT period_id FROM academic_periods WHERE is_active $$;
  `);
  const migration = fs.readFileSync('supabase/migrations/20261105000000_academic_periods.sql', 'utf8');
  const guard = migration.slice(migration.indexOf('CREATE FUNCTION public.guard_period_history()'), migration.indexOf('CREATE TRIGGER guard_clearance_period'));
  await pg.exec(guard);
  // Seed archived and current records before enabling the real history guards.
  await pg.exec(`
   INSERT INTO users VALUES('student','s@example.edu',NULL),('staff','f@example.edu',NULL),('other','o@example.edu',NULL);
   INSERT INTO students VALUES('student','Student'),('other','Other'); INSERT INTO staffs VALUES('staff','Staff');
   INSERT INTO enrollments VALUES('student',1,true),('student',2,true),('other',2,true);
   INSERT INTO staff_enrollments VALUES('staff',1,true),('staff',2,true);
   INSERT INTO clearance_records VALUES(10,'student',1,'Signed','old'),(11,'student',2,'Signed','now'),(20,'staff',1,'Signed','old'),(21,'staff',2,'Signed','now'),(30,'other',2,'Signed','now');
   INSERT INTO clearance_tasks VALUES(100,10,'officer','old submission'),(110,11,'officer','new submission'),(200,20,'officer','old staff submission'),(210,21,'officer','new staff submission'),(300,30,'officer','other submission');
   INSERT INTO notifications VALUES
    (1,'student','{"taskId":100}'),(2,'student','{"taskId":110}'),(3,'student','{"periodId":1}'),(4,'student','{"periodId":2}'),
    (5,'student','{}'),(6,'officer','{"taskId":110}'),(7,'other','{"periodId":2}'),(8,'staff','{"clearanceId":21}'),(9,'staff','{"clearanceId":20}');
   CREATE TRIGGER guard_records BEFORE INSERT OR UPDATE OR DELETE ON clearance_records FOR EACH ROW EXECUTE FUNCTION guard_period_history();
   CREATE TRIGGER guard_tasks BEFORE INSERT OR UPDATE OR DELETE ON clearance_tasks FOR EACH ROW EXECUTE FUNCTION guard_period_history();
   CREATE TRIGGER guard_enrollments BEFORE INSERT OR UPDATE OR DELETE ON enrollments FOR EACH ROW EXECUTE FUNCTION guard_period_history();
   CREATE TRIGGER guard_staff BEFORE INSERT OR UPDATE OR DELETE ON staff_enrollments FOR EACH ROW EXECUTE FUNCTION guard_period_history();
  `);
  const users = pgTable('users', { userId: text('user_id'), email: text('email'), authId: text('auth_id') });
  const students = pgTable('students', { studentId: text('student_id'), studentName: text('student_name') });
  const staffs = pgTable('staffs', { staffId: text('staff_id'), staffName: text('staff_name') });
  const clearanceRecords = pgTable('clearance_records', { clearanceId: integer('clearance_id'), userId: text('user_id'), periodId: integer('period_id') });
  const clearanceTasks = pgTable('clearance_tasks', { assignedTaskId: integer('assigned_task_id'), clearanceId: integer('clearance_id'), staffId: text('staff_id') });
  const clearanceTemplates = pgTable('clearance_templates', { templateId: integer('template_id'), courseId: integer('course_id'), deptId: integer('dept_id'), staffId: text('staff_id'), tier: integer('tier'), isActive: boolean('is_active') });
  const courses = pgTable('courses', { courseId: integer('course_id'), courseName: text('course_name') });
  const clearanceDepartments = pgTable('clearance_departments', { deptId: integer('dept_id'), deptName: text('dept_name') });
  const academicPeriods = pgTable('academic_periods', { periodId: integer('period_id'), isActive: boolean('is_active') });
  const enrollments = pgTable('enrollments', { studentId: text('student_id'), periodId: integer('period_id') });
  const staffEnrollments = pgTable('staff_enrollments', { staffId: text('staff_id'), periodId: integer('period_id') });
  const notifications = pgTable('notifications', { userId: text('user_id'), metadata: jsonb('metadata') });
  const db = drizzle(pg);
  const deps = {
   'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
   'drizzle-orm': require('drizzle-orm'), zod: require('zod'),
   '@/lib/db/schema': { users, students, staffs, clearanceRecords, clearanceTasks, clearanceTemplates, courses, clearanceDepartments, academicPeriods, enrollments, staffEnrollments, notifications },
   // PGlite has no concurrent sessions: skip only the PostgreSQL advisory lock.
   '@/lib/db': { db: { transaction: fn => db.transaction(tx => fn(new Proxy(tx, { get(target, key) { return key === 'execute' ? async () => [] : typeof target[key] === 'function' ? target[key].bind(target) : target[key]; } }))) } },
   '@/lib/db/supabase-server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'admin', email: 'admin@example.edu', user_metadata: { custom_claims: { roles: ['Admin'] } } } } }) } }) },
   '@/lib/db/supabase-admin': {},
   '@/lib/services/admin-cache': { invalidateServerAdminCache() {} }, '@/lib/services/department-cache': { invalidateServerDepartmentCache() {} }, '@/lib/services/clearance-cache': { invalidateServerClearanceCache() {} },
  };
  const exports = {};
  new Function('exports', 'require', 'console', ts.transpileModule(fs.readFileSync('src/app/api/admin/clients/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports, name => { if (!(name in deps)) throw Error(name); return deps[name]; }, { error() {} });
  const remove = (id, type) => exports.DELETE({ json: async () => ({ id, type }) });
  assert.equal((await remove('student', 'student')).status, 200);
  assert.equal((await remove('staff', 'staff')).status, 200);
  assert.deepEqual((await pg.query('SELECT clearance_id FROM clearance_records ORDER BY clearance_id')).rows.map(r => r.clearance_id), [10,20,30]);
  assert.deepEqual((await pg.query('SELECT assigned_task_id FROM clearance_tasks ORDER BY assigned_task_id')).rows.map(r => r.assigned_task_id), [100,200,300]);
  assert.equal((await pg.query('SELECT * FROM users')).rows.length, 3);
  assert.deepEqual((await pg.query('SELECT period_id FROM enrollments WHERE student_id=\'student\'')).rows.map(r => r.period_id), [1]);
  assert.deepEqual((await pg.query('SELECT period_id FROM staff_enrollments')).rows.map(r => r.period_id), [1]);
  assert.deepEqual((await pg.query('SELECT notif_id FROM notifications ORDER BY notif_id')).rows.map(r => r.notif_id), [1,3,5,7,9]);
  // The retained identity can enroll again with a fresh, unsigned current record.
  await pg.exec("INSERT INTO enrollments VALUES('student',2,true); INSERT INTO clearance_records VALUES(12,'student',2,'Pending',NULL)");
  assert.deepEqual((await pg.query("SELECT status,signed_at FROM clearance_records WHERE user_id='student' AND period_id=2")).rows, [{ status: 'Pending', signed_at: null }]);
  assert.deepEqual((await pg.query("SELECT status,signed_at FROM clearance_records WHERE user_id='student' AND period_id=1")).rows, [{ status: 'Signed', signed_at: 'old' }]);
  // A later failure must restore the already-deleted tasks, signatures, and alerts.
  await pg.exec(`CREATE FUNCTION reject_roster_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced failure'; END $$;
    CREATE TRIGGER reject_roster BEFORE DELETE ON enrollments FOR EACH ROW EXECUTE FUNCTION reject_roster_delete();
    INSERT INTO notifications VALUES(10,'other','{"taskId":300}');`);
  assert.equal((await remove('other', 'student')).status, 500);
  assert.equal((await pg.query('SELECT * FROM clearance_records WHERE clearance_id=30')).rows.length, 1);
  assert.equal((await pg.query('SELECT * FROM clearance_tasks WHERE assigned_task_id=300')).rows.length, 1);
  assert.equal((await pg.query('SELECT * FROM notifications WHERE notif_id=10')).rows.length, 1);
 } finally { await pg.close(); }
});
