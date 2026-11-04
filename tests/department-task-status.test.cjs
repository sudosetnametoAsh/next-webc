const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(options = {}) {
  const task = { assigned_task_id: 12, staff_id: 'officer', clearance_id: 20,
    title: 'Receipt', status: options.initial || 'Flagged', clearance_records: { user_id: 'client' } };
  const clearance = { clearance_id: 20, status: options.signed ? 'Signed' : 'Incomplete' };
  const notices = [], cleanups = [], invalidations = [];
  const admin = { from(table) {
    const filters = [];
    let update, deleting = false;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push([key, value, true]); return query; },
      neq(key, value) { filters.push([key, value, false]); return query; },
      in(key, value) { cleanups.push({ key, value }); return query; },
      contains(key, value) { cleanups.push({ key, value }); return query; },
      update(value) { update = value; return query; },
      insert(value) { notices.push(value); return query; },
      delete() { deleting = true; return query; },
      maybeSingle: async () => ({ data: filters.every(([key, value]) => task[key] === value) ? { ...task } : null, error: null }),
      single: async () => {
        if (options.failWrite) return { data: null, error: { message: 'Database unavailable' } };
        if (options.zeroRows) return { data: null, error: null };
        assert.ok(filters.some(([key, value]) => key === 'staff_id' && value === 'officer'));
        Object.assign(task, update);
        return { data: { assigned_task_id: task.assigned_task_id, status: task.status, comments: task.comments }, error: null };
      },
      then(resolve, reject) {
        if (table === 'clearance_tasks') return Promise.resolve({
          data: [task, ...(options.siblings || []).map((status) => ({ status }))],
          error: options.failSiblings ? { message: 'Failed sibling query' } : null,
        }).then(resolve, reject);
        if (table === 'clearance_records' && update) {
          if (filters.every(([key, value, equal]) => (clearance[key] === value) === equal)) Object.assign(clearance, update);
        }
        if (deleting) assert.equal(table, 'notifications');
        return Promise.resolve({ error: null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/app/api/department/clients/tasks/status/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, console: { error() {} }, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
    if (name.includes('get-session')) return { getSession: async () => ({ user_id: options.officer || 'officer' }) };
    if (name.includes('supabase-admin')) return { getSupabaseAdmin: () => admin };
    if (name.includes('clearance-cache')) return { invalidateServerClearanceCache: (id) => invalidations.push(['client', id]) };
    if (name.includes('department-cache')) return { invalidateServerDepartmentCache: (id) => invalidations.push(['department', id]) };
    throw new Error(name);
  } });
  return { task, clearance, notices, cleanups, invalidations,
    patch: (status = 'Cleared', body = {}) => exports.PATCH({ json: async () => ({ taskId: 12, status, comment: 'Reviewed', ...body }) }),
  };
}
for (const initial of ['Pending', 'Submitted', 'Verified', 'Flagged']) test(`officer can clear ${initial} tasks and synchronize the clearance summary`, async () => {
  const h = harness({ initial });
  const response = await h.patch();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.status, 'Cleared');
  assert.equal(h.task.status, 'Cleared');
  assert.equal(h.clearance.status, 'Pending');
  assert.equal(h.notices[0].user_id, 'client');
  assert.equal(h.notices[0].metadata.taskId, 12);
  assert.ok(h.invalidations.some(([type, id]) => type === 'client' && id === 'client'));
});
test('uses persisted sibling tasks to keep an unfinished clearance Incomplete', async () => {
  const h = harness({ siblings: ['Cleared', 'Flagged'] });
  assert.equal((await h.patch()).status, 200);
  assert.equal(h.clearance.status, 'Incomplete');
});
test('task clearing preserves a signed clearance', async () => {
  const h = harness({ signed: true });
  assert.equal((await h.patch()).status, 200);
  assert.equal(h.clearance.status, 'Signed');
});
test('reopening a cleared task resets the summary and removes its cleared notification', async () => {
  const h = harness({ initial: 'Cleared' });
  assert.equal((await h.patch('Pending')).status, 200);
  assert.equal(h.task.status, 'Pending');
  assert.equal(h.clearance.status, 'Incomplete');
  assert.equal(h.notices.length, 0);
  assert.equal(h.cleanups.find((item) => item.key === 'metadata').value.taskId, 12);
});
test('another officer cannot clear the task', async () => {
  const h = harness({ officer: 'someone-else' });
  assert.equal((await h.patch()).status, 404);
  assert.equal(h.task.status, 'Flagged');
  assert.equal(h.notices.length, 0);
});
for (const options of [{ failWrite: true }, { zeroRows: true }]) test('failed or empty writes do not report clearance success ' + JSON.stringify(options), async () => {
  const h = harness(options);
  assert.equal((await h.patch()).status, 500);
  assert.equal(h.task.status, 'Flagged');
  assert.equal(h.notices.length, 0);
});
test('a failed sibling read does not silently reset the clearance summary', async () => {
  const h = harness({ failSiblings: true });
  assert.equal((await h.patch()).status, 500);
  assert.equal(h.clearance.status, 'Incomplete');
  assert.equal(h.notices.length, 0);
  assert.ok(h.invalidations.length > 0, 'the saved task must be invalidated even if summary sync fails');
});
test('retrying a completed clear does not duplicate its notification', async () => {
  const h = harness();
  assert.equal((await h.patch()).status, 200);
  assert.equal((await h.patch()).status, 200);
  assert.equal(h.notices.length, 1);
});
test('invalid statuses and invalid task IDs cannot mutate tasks', async () => {
  const h = harness();
  for (const status of ['Rejected', 'Flagged', '', null]) assert.equal((await h.patch(status)).status, 400);
  assert.equal((await h.patch('Cleared', { taskId: '12' })).status, 400);
  assert.equal(h.task.status, 'Flagged');
});
test('reopening is limited to cleared requirements', async () => {
  const h = harness();
  assert.equal((await h.patch('Pending')).status, 409);
  assert.equal(h.task.status, 'Flagged');
});
