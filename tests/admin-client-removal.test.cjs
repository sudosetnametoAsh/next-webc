const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(options = {}) {
  const schema = Object.fromEntries(['users', 'students', 'staffs', 'notifications', 'clearanceRecords', 'clearanceTemplates', 'clearanceTasks', 'courses', 'clearanceDepartments'].map((name) => [name, new Proxy({ name }, { get: (t, key) => key === 'name' ? name : { table: name, key } })]));
  const target = options.type || 'student';
  const rows = {
    users: [{ userId: 'client', authId: options.self ? 'admin-auth' : 'client-auth', email: 'client@example.edu' }, { userId: 'other' }],
    students: target === 'student' || options.shared ? [{ studentId: 'client', studentName: 'Client' }] : [],
    staffs: target === 'staff' || options.shared ? [{ staffId: 'client', staffName: 'Client' }] : [],
    clearanceRecords: [{ userId: 'client' }, { userId: 'other' }],
    notifications: [{ userId: 'client' }, { userId: 'other' }, { userId: null }],
    clearanceTemplates: options.assignments || (options.assigned ? [{ staffId: 'client', templateId: 1, courseId: 1, courseName: 'Computer Science', departmentId: 1, departmentName: 'Clinic', tier: 1, isActive: true }] : []),
    clearanceTasks: options.tasks ? [{ staffId: 'client', assignedTaskId: 1 }] : [],
  };
  const initial = structuredClone(rows), removed = [], invalidated = [];
  const tx = {
    select() { let table, filter; const query = {
      from(t) { table = t.name; return query; }, where(f) { filter = f; return query; },
      for() { return query; }, limit() { return query; }, leftJoin() { return query; }, orderBy() { return query; },
      then(resolve) { resolve(rows[table].filter((r) => r[filter.column.key] === filter.value)); },
    }; return query; },
    delete(table) { return { where: async (filter) => {
      if (options.failDelete === table.name) throw new Error('Database failed');
      removed.push(table.name);
      rows[table.name] = rows[table.name].filter((r) => r[filter.column.key] !== filter.value);
    } }; },
    update(table) { return { set: (values) => ({ where: async (filter) => rows[table.name].filter((r) => r[filter.column.key] === filter.value).forEach((r) => Object.assign(r, values)) }) }; },
  };
  const deps = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    'drizzle-orm': { eq: (column, value) => ({ column, value }) }, 'zod': require('zod'),
    '@/lib/db/schema': schema,
    '@/lib/db': { db: { transaction: async (work) => { try { return await work(tx); } catch (error) { Object.assign(rows, structuredClone(initial)); throw error; } } } },
    '@/lib/db/supabase-server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'admin-auth', user_metadata: { custom_claims: { roles: options.requestRoles || ['Admin'] } } } } }) } }) },
    '@/lib/db/supabase-admin': { getSupabaseAdmin: () => ({ auth: { admin: { getUserById: async () => ({ data: { user: { user_metadata: { custom_claims: { roles: options.targetRoles || ['Client'] } } } }, error: options.authError || null }) } } }) },
    '@/lib/services/admin-cache': { invalidateServerAdminCache: () => invalidated.push('admin') },
    '@/lib/services/department-cache': { invalidateServerDepartmentCache: () => invalidated.push('department') },
    '@/lib/services/clearance-cache': { invalidateServerClearanceCache: () => invalidated.push('clearance') },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/admin/clients/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, console: { error() {} }, require: (name) => { if (!(name in deps)) throw new Error(name); return deps[name]; } });
  return { rows, initial, removed, invalidated,
    remove: (body = { id: 'client', type: target }) => exports.DELETE({ json: async () => body }),
    edit: () => exports.PATCH({ json: async () => ({ id: 'client', type: target, name: 'Renamed' }) }),
  };
}
for (const type of ['student', 'staff']) test('deleting ' + type + ' removes its user and personal notifications only', async () => {
  const h = harness({ type });
  assert.equal((await h.remove()).status, 200);
  assert.deepEqual(h.rows.users, [{ userId: 'other' }]);
  assert.deepEqual(h.rows.notifications, [{ userId: 'other' }, { userId: null }]);
  assert.deepEqual(h.rows.clearanceRecords, [{ userId: 'other' }]);
  assert.deepEqual(h.invalidated, ['admin', 'department', 'clearance']);
});
for (const options of [{ shared: true }, { assigned: true }, { tasks: true }, { self: true }, { targetRoles: ['Admin'] }, { targetRoles: ['Admin', 'Department', 'Client'] }, { targetRoles: ['Department'], assigned: true }, { targetRoles: ['Department'], tasks: true }]) test('protects shared identity/responsibilities ' + JSON.stringify(options), async () => {
  const h = harness(options); assert.equal((await h.remove()).status, 409);
  assert.deepEqual(h.rows, h.initial); assert.equal(h.removed.length, 0);
});
for (const failDelete of ['notifications', 'clearanceRecords', 'students', 'users']) test('deletion rollback restores all rows on ' + failDelete + ' failure', async () => {
  const h = harness({ failDelete }); assert.equal((await h.remove()).status, 500);
  assert.deepEqual(h.rows, h.initial); assert.equal(h.invalidated.length, 0);
});
test('failed role lookup does not delete anything', async () => {
  const h = harness({ authError: { code: 'unexpected_failure' } });
  assert.equal((await h.remove()).status, 500); assert.deepEqual(h.rows, h.initial);
});
test('missing auth account does not prevent removing its enrolled profile', async () => {
  assert.equal((await harness({ authError: { code: 'user_not_found' } }).remove()).status, 200);
});
test('missing client returns 404', async () => assert.equal((await harness().remove({ id: 'missing', type: 'student' })).status, 404));
test('anonymous and non-admin callers cannot delete clients', async () => {
  for (const [options, status] of [[{ anonymous: true }, 401], [{ requestRoles: ['Client'] }, 403]]) {
    const h = harness(options); assert.equal((await h.remove()).status, status); assert.equal(h.removed.length, 0);
  }
});
test('editing preserves identity and notifications', async () => {
  const h = harness(); assert.equal((await h.edit()).status, 200);
  assert.equal(h.rows.students[0].studentName, 'Renamed');
  assert.deepEqual(h.rows.users, h.initial.users); assert.deepEqual(h.rows.notifications, h.initial.notifications);
});

for (const targetRoles of [['Department'], ['Department', 'Client'], ['Staff'], ['Staff', 'Client']]) test('allows unassigned non-admin role deletion ' + JSON.stringify(targetRoles), async () => {
  const h = harness({ type: 'staff', targetRoles });
  assert.equal((await h.remove()).status, 200);
  assert.equal(h.rows.users.some((row) => row.userId === 'client'), false);
  assert.equal(h.rows.staffs.length, 0);
});

test('staff deletion warning lists every course/staff template, phase and inactive assignment', async () => {
  const h = harness({ type: 'staff', targetRoles: ['Department'], assignments: [
    { staffId: 'client', templateId: 1, courseId: 1, courseName: 'Computer Science', departmentName: 'Clinic', tier: 2, isActive: true },
    { staffId: 'client', templateId: 2, courseId: 2, courseName: 'Information Technology', departmentName: 'Clinic', tier: 1, isActive: false },
    { staffId: 'client', templateId: 3, courseId: null, departmentName: 'Library', tier: 1, isActive: true },
    { staffId: 'other', templateId: 4, courseId: 3, courseName: 'Other course', departmentName: 'Registrar', tier: 1, isActive: true },
  ] });
  const response = await h.remove();
  assert.equal(response.status, 409);
  const { error } = await response.json();
  assert.match(error, /Computer Science — Clinic \(Phase 2\)/);
  assert.match(error, /Information Technology — Clinic \(Phase 1, inactive\)/);
  assert.match(error, /Staff clearance — Library/);
  assert.doesNotMatch(error, /Other course/);
  assert.equal(h.removed.length, 0);
  assert.deepEqual(h.rows, h.initial);
});
