const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, console: { error() {}, warn() {} }, require: (name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected import ${name}`);
  }, ...globals });
  return exports;
}

function rejectionHarness(options = {}) {
  const task = { assigned_task_id: 12, staff_id: 'officer', clearance_id: 20, title: 'Receipt',
    status: options.status || 'Flagged', ai_audit_report: options.report ?? { isAuthentic: false, appeal: { reason: 'Check again' } },
    clearance_records: { user_id: 'client' } };
  const writes = [];
  const notices = [];
  const invalidations = [];
  const admin = { from(table) {
    const filters = [];
    let update;
    const matches = () => filters.every(([key, value]) => task[key] === value);
    const query = {
      select() { return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      neq() { return query; },
      update(value) { update = value; return query; },
      insert(value) { notices.push(value); return query; },
      maybeSingle: async () => ({ data: matches() ? { ...task } : null, error: null }),
      single: async () => {
        if (options.failWrite) return { data: null, error: { message: 'Database unavailable' } };
        if (options.zeroRows || !matches()) return { data: null, error: null };
        writes.push({ table, filters, update });
        Object.assign(task, update);
        return { data: { ...task }, error: null };
      },
      then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); },
    };
    return query;
  } };
  const route = load('src/app/api/department/clients/tasks/reject/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    '@/lib/auth/get-session': { getSession: async () => ({ user_id: options.officer || 'officer' }) },
    '@/lib/db/supabase-admin': { getSupabaseAdmin: () => admin },
    '@/lib/services/clearance-cache': { invalidateServerClearanceCache: (id) => invalidations.push(['client', id]) },
    '@/lib/services/department-cache': { invalidateServerDepartmentCache: (id) => invalidations.push(['department', id]) },
  });
  return { task, writes, notices, invalidations, post: (body = { taskId: 12, reason: ' Wrong receipt ' }) => route.POST({ json: async () => body }) };
}

for (const status of ['Flagged', 'Verified', 'Submitted']) test(`reject persists ${status} as Rejected and notifies the client`, async () => {
  const h = rejectionHarness({ status });
  const response = await h.post();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.status, 'Rejected');
  assert.equal(h.task.status, 'Rejected');
  assert.equal(h.task.comments, 'Wrong receipt');
  assert.equal(h.task.ai_audit_report.appeal, undefined);
  assert.equal(h.task.ai_audit_report.isAuthentic, false);
  assert.ok(h.writes[0].filters.some(([key, value]) => key === 'staff_id' && value === 'officer'));
  assert.deepEqual(h.invalidations, [['department', 'officer'], ['client', 'client']]);
  assert.equal(h.notices[0].user_id, 'client');
  assert.equal(h.notices[0].metadata.taskId, 12);
});

test('rejection cannot change another officer\'s task', async () => {
  const h = rejectionHarness({ officer: 'other-officer' });
  assert.equal((await h.post()).status, 404);
  assert.equal(h.task.status, 'Flagged');
  assert.equal(h.writes.length, 0);
  assert.equal(h.notices.length, 0);
});
for (const options of [{ failWrite: true }, { zeroRows: true }]) test('failed or empty rejection writes never report success ' + JSON.stringify(options), async () => {
  const h = rejectionHarness(options);
  assert.equal((await h.post()).status, 500);
  assert.equal(h.task.status, 'Flagged');
  assert.equal(h.notices.length, 0);
  assert.equal(h.invalidations.length, 0);
});
for (const status of ['Cleared', 'Pending', 'Rejected']) test(`does not reject a ${status} task`, async () => {
  const h = rejectionHarness({ status });
  assert.equal((await h.post()).status, 409);
  assert.equal(h.writes.length, 0);
});
test('empty rejection reason is rejected before any mutation', async () => {
  const h = rejectionHarness();
  assert.equal((await h.post({ taskId: 12, reason: ' ' })).status, 400);
  assert.equal(h.writes.length, 0);
});
test('string audit reports retain AI findings and remove the resolved appeal', async () => {
  const h = rejectionHarness({ report: JSON.stringify({ flags: ['Wrong date'], appeal: { status: 'pending' } }) });
  assert.equal((await h.post()).status, 200);
  assert.equal(h.task.ai_audit_report.appeal, undefined);
  assert.equal(h.task.ai_audit_report.flags[0], 'Wrong date');
});

test('department refresh endpoint fetches current data for the authenticated officer', async () => {
  let calls = 0;
  const route = load('src/app/api/department/dashboard/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    '@/lib/auth/get-session': { getSession: async () => ({ user_id: 'officer' }) },
    '@/lib/services/department-cache': { fetchDepartmentDashboard: async (id) => {
      assert.equal(id, 'officer'); calls++;
      return { recentSubmissions: [{ status: calls === 1 ? 'Submitted' : 'Flagged' }] };
    } },
  });
  assert.equal((await (await route.GET()).json()).recentSubmissions[0].status, 'Submitted');
  const response = await route.GET();
  assert.equal((await response.json()).recentSubmissions[0].status, 'Flagged');
  assert.match(response.headers.get('cache-control'), /no-store/);
});

test('browser rejection helper only signals refresh after verified persistence', async () => {
  const events = [];
  let ok = false;
  const { rejectSubmission } = load('src/lib/api/reject-submission.ts', {}, {
    fetch: async () => Response.json(ok ? { data: { status: 'Rejected' } } : { error: 'Write failed' }, { status: ok ? 200 : 500 }),
    Event, window: { dispatchEvent: (event) => events.push(event.type) },
  });
  await assert.rejects(() => rejectSubmission(12, 'Wrong receipt'), /Write failed/);
  assert.equal(events.length, 0);
  ok = true;
  assert.equal((await rejectSubmission(12, 'Wrong receipt')).status, 'Rejected');
  assert.deepEqual(events, ['department_data_invalidated', 'notifications_updated']);
});

function notificationHarness() {
  const { QueryClient } = require('@tanstack/react-query');
  const client = new QueryClient();
  const effects = [], timers = new Map(), intervals = new Map();
  let callback, status, nextId = 1;
  const channel = {
    on(_event, filter, fn) { assert.equal(filter.table, 'notifications'); callback = fn; return channel; },
    subscribe(fn) { status = fn; return channel; },
  };
  const visibility = load('src/lib/notification-visibility.ts', {});
  const rows = load('src/lib/notification-row.ts', {});
  const hook = load('src/hooks/clearance/use-notifications.ts', {
    react: { useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn() },
    '@tanstack/react-query': { useQueryClient: () => client, useQuery: () => ({ data: [], isLoading: false }), useMutation: () => ({}) },
    '@/lib/db/supabase-client': { createClient: () => ({ channel: () => channel, removeChannel() {} }) },
    '@/lib/notification-visibility': visibility,
    '@/lib/notification-row': rows,
  }, {
    window: { addEventListener() {}, removeEventListener() {} },
    document: { visibilityState: 'visible' },
    setTimeout: (fn) => { const id = nextId++; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn) => { const id = nextId++; intervals.set(id, fn); return id; },
    clearInterval: (id) => intervals.delete(id),
  });
  hook.useNotifications('officer', { role: 'department' });
  const cleanup = effects[0]();
  const queryKey = ['notifications', 'officer', 'department', undefined];
  const emit = (user = 'officer', title = 'Submission Flagged for Review') => callback({
    eventType: 'INSERT', new: { notif_id: 41, user_id: user, title, description: 'Client submitted Receipt',
      created_at: '2026-11-04T00:00:00Z', type: 'Warning', is_read: false, category: 'submission',
      metadata: { taskId: 12, studentName: 'Client' } },
  });
  return { client, queryKey, emit, timers, intervals, status: (value) => status(value), cleanup };
}

test('incoming officer alert is available to popups before the notification API finishes', async () => {
  const h = notificationHarness();
  await h.emit();
  const notifications = h.client.getQueryData(h.queryKey);
  assert.equal(notifications[0].id, '41');
  assert.equal(notifications[0].read, false);
  assert.equal(notifications[0].metadata.studentName, 'Client');
  await h.emit();
  assert.equal(h.client.getQueryData(h.queryKey).length, 1, 'replayed events must not duplicate popups');
  assert.equal(h.timers.size, 1, 'bursts must not keep postponing reconciliation');
  h.cleanup();
  h.client.clear();
});
test('realtime does not insert another officer\'s alert into the current notification list', async () => {
  const h = notificationHarness();
  await h.emit('other-officer');
  assert.equal(h.client.getQueryData(h.queryKey), undefined);
  await h.emit('officer', 'Bottleneck Alert');
  assert.equal(h.client.getQueryData(h.queryKey), undefined);
  h.cleanup();
  h.client.clear();
});
test('an older notification request cannot erase a newly received alert', async () => {
  const h = notificationHarness();
  let finish;
  const olderRequest = h.client.fetchQuery({ queryKey: h.queryKey, queryFn: () => new Promise((resolve) => { finish = resolve; }) });
  const cancelled = olderRequest.catch(() => undefined);
  await h.emit();
  finish([]);
  await cancelled;
  await new Promise(setImmediate);
  assert.equal(h.client.getQueryData(h.queryKey)[0].id, '41');
  h.cleanup();
  h.client.clear();
});
test('notification reconnect stops recovery polling and schedules reconciliation', () => {
  const h = notificationHarness();
  h.status('CHANNEL_ERROR');
  h.status('TIMED_OUT');
  assert.equal(h.intervals.size, 1);
  h.status('SUBSCRIBED');
  assert.equal(h.intervals.size, 0);
  assert.equal(h.timers.size, 1);
  h.cleanup();
  assert.equal(h.timers.size, 0);
  h.client.clear();
});

test('department events refresh dashboard, section clients, and staff without losing a trailing event', async () => {
  const effects = [], timers = new Map(), invalidated = [];
  let eventCallback, subscribeCallback, cleanupChannel = false, refreshed = 0;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  let first = true;
  const queryClient = { invalidateQueries: ({ queryKey }) => {
    invalidated.push(queryKey[0]);
    if (first) { first = false; return pending; }
    return Promise.resolve();
  } };
  const channel = { on(_event, _filter, fn) { eventCallback = fn; return channel; }, subscribe(fn) { subscribeCallback = fn; return channel; } };
  const listener = load('src/components/department/dashboard-listener.tsx', {
    react: { useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn() },
    'next/navigation': { useRouter: () => ({ refresh: () => refreshed++ }) },
    '@tanstack/react-query': { useQueryClient: () => queryClient },
    '@/lib/db/supabase-client': { createClient: () => ({ channel: () => channel, removeChannel: () => { cleanupChannel = true; } }) },
  }, {
    window: { addEventListener() {}, removeEventListener() {} },
    document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    setTimeout: (fn) => { timers.set(1, fn); return 1; }, clearTimeout: (id) => timers.delete(id),
    setInterval() { return 1; }, clearInterval() {},
  });
  listener.default();
  const cleanup = effects[0]();
  subscribeCallback('SUBSCRIBED');
  timers.get(1)(); timers.clear();
  eventCallback();
  release();
  await new Promise(setImmediate);
  for (const key of ['department-dashboard', 'department-clients', 'clients', 'staff-clearance', 'client-tasks', 'department-client-progress']) {
    assert.equal(invalidated.filter((value) => value === key).length, 2, key);
  }
  assert.equal(refreshed, 1);
  cleanup();
  assert.equal(cleanupChannel, true);
});
