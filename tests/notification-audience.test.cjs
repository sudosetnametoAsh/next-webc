const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, console, require: (name) => {
    if (name in mocks) return mocks[name];
    throw Error('Unexpected dependency: ' + name);
  } });
  return exports;
}
const visibility = load('src/lib/notification-visibility.ts', {});
const scope = { courseIds: [1], sectionIds: [11] };
for (const role of ['student', 'department']) {
  test(`${role} cannot see modern or misdirected legacy bottleneck notifications`, () => {
    for (const row of [{ category: 'bottleneck' }, { title: 'BOTTLENECK: Clinic' }, { metadata: { type: 'Bottleneck' } }, { target_role: 'admin', department_id: 1 }]) {
      assert.equal(visibility.isNotificationVisible({ ...row, user_id: 'client' }, role, scope), false);
      assert.equal(visibility.isNotificationVisible(row, 'admin', scope), true);
    }
  });
}
test('legacy template broadcasts match enrollment and section scope', () => {
  assert.equal(visibility.isNotificationVisible({ course_id: 1 }, 'student', scope), true);
  assert.equal(visibility.isNotificationVisible({ course_id: 2 }, 'student', scope), false);
  assert.equal(visibility.isNotificationVisible({ metadata: { courseId: 2 } }, 'student', scope), false);
  assert.equal(visibility.isNotificationVisible({ metadata: { courseIds: [2, 3] } }, 'student', scope), false);
  assert.equal(visibility.isNotificationVisible({ metadata: { courseIds: [1, 2] } }, 'student', scope), true);
  assert.equal(visibility.isNotificationVisible({ course_id: 1, section_id: 12 }, 'student', scope), false);
  assert.equal(visibility.isNotificationVisible({ user_id: 'client', course_id: 2 }, 'student', scope), true, 'direct delivery was already scoped at creation');
});
function routeHarness({ admin = false, authenticated = true } = {}) {
  const rows = [
    { notif_id: 1, title: 'Course A', course_id: 1, target_role: 'student', category: 'template' },
    { notif_id: 2, title: 'Course B', course_id: 2, target_role: 'student', category: 'template' },
    { notif_id: 3, title: 'Bottleneck Alert: Clinic', target_role: 'student', category: 'bottleneck' },
    { notif_id: 4, title: 'Private bottleneck', user_id: 'client', target_role: 'student' },
    { notif_id: 5, title: 'Admin status', target_role: 'admin', category: 'bottleneck' },
  ].map((row) => ({ description: 'Notice', type: 'Info', created_at: '2026-11-05T00:00:00Z', ...row }));
  let sessions = 0;
  const client = { from(table) {
    let result = rows;
    const q = { select() { return q; }, eq(field, value) { if (table === 'notifications') result = result.filter((r) => r[field] === value); return q; },
      limit() { return q; }, maybeSingle: async () => ({ data: null }),
      or(expression) { if (expression.includes('target_role.eq.student')) result = result.filter((r) => r.user_id === 'client' || (!r.user_id && r.target_role === 'student')); return q; },
      order: async () => ({ data: result, error: null }) };
    return q;
  } };
  const route = load('src/app/api/student/notifications/route.ts', {
    '@/lib/notification-visibility': visibility,
    '@/lib/services/notification-course-scope': { getNotificationCourseScope: async (_client, user) => { assert.equal(user, 'client'); return scope; } },
    '@/lib/auth/get-session': { getSession: async () => { sessions++; if (!authenticated) throw Error('No session'); return { user_id: 'client' }; } },
    '@/lib/db/supabase-admin': { getSupabaseAdmin: () => client },
    '@/lib/db/supabase-server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { user_metadata: { custom_claims: { roles: admin ? ['Admin'] : ['Client'] } } } } }) } }) },
    '@/lib/services/admin-notifications': { syncAdminNotifications: async () => {} },
    '@/lib/services/due-notifications': { syncStudentDueNotifications: async () => {} },
    '@/lib/services/student-completion': { syncStudentCompletionNotification: async () => {} },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  return { route, sessions: () => sessions };
}
test('student notification API filters other courses and all legacy bottlenecks', async () => {
  const h = routeHarness();
  const response = await h.route.GET({ nextUrl: { searchParams: new URLSearchParams({ role: 'student', userId: 'forged-user' }) } });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).notifications.map((row) => row.title), ['Course A']);
  assert.equal(h.sessions(), 1);
});
test('requesting the admin view does not grant a client bottleneck access', async () => {
  const request = { nextUrl: { searchParams: new URLSearchParams({ role: 'admin' }) } };
  assert.equal((await routeHarness().route.GET(request)).status, 403);
  const response = await routeHarness({ admin: true }).route.GET(request);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).notifications.map((row) => row.title), ['Admin status']);
  assert.equal((await routeHarness().route.PATCH({ json: async () => ({ all: true, role: 'admin' }) })).status, 403);
});
test('notifications reject unauthenticated requests instead of using a fallback student', async () => {
  const h = routeHarness({ authenticated: false });
  assert.equal((await h.route.GET({ nextUrl: { searchParams: new URLSearchParams() } })).status, 401);
  assert.equal((await h.route.PATCH({ json: async () => ({ all: true }) })).status, 401);
});

test('template POST delegates only saved course IDs and retains direct officer notices', async () => {
  const published = [], staffNotices = [];
  const saved = [{ template_id: 1, course_id: 1 }, { template_id: 2, course_id: 1 }];
  const userClient = { from(table) {
    assert.equal(table, 'clearance_templates');
    return {
      select() { const query = { in() { return query; }, not() { return query; }, then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); } }; return query; },
      upsert: () => ({ select: async () => ({ data: saved, error: null }) }),
    };
  } };
  const adminClient = { from(table) {
    if (table === 'courses') return { select: () => ({ in: async () => ({ data: [{ course_id: 1, course_name: 'Course A' }] }) }) };
    assert.equal(table, 'notifications');
    return { insert: async (rows) => { staffNotices.push(...rows); return { error: null }; } };
  } };
  const route = load('src/app/api/admin/course-templates/route.ts', {
    '@/lib/services/admin-read-client': {},
    '@/lib/services/template-notifications': { notifyTemplatePublication: async (ids) => published.push(Array.from(ids)) },
    '@/lib/db/supabase-server': { createClient: async () => userClient },
    '@/lib/db/supabase-admin': { getSupabaseAdmin: () => adminClient },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/services/admin-cache': { invalidateServerAdminCache() {} },
    '@/lib/services/department-cache': { invalidateServerDepartmentCache() {} },
    '@/lib/services/clearance-cache': { invalidateServerClearanceCache() {} },
    '@/lib/services/student-completion': {}, '@/lib/services/template-deletion': {},
  });
  const response = await route.POST({ json: async () => ({ courses: [1, 2], assignments: [{ dept_id: 1, staff_id: 'officer', tier: 1 }] }) });
  assert.equal(response.status, 201);
  assert.deepEqual(published, [[1]]);
  assert.equal(staffNotices.length, 1);
  assert.equal(staffNotices[0].user_id, 'officer');
  assert.equal(staffNotices[0].target_role, 'department');
});
