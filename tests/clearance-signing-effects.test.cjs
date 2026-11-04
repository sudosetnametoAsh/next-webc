const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const signedAt = '2026-11-04T00:00:00.000Z';
const recordsFor = (count = 1) => Array.from({ length: count }, (_, i) => ({
  clearance_id: i + 1, user_id: `client-${i}`, clearance_templates: {
    tier: 1, course_id: 1, clearance_departments: { dept_id: 1, dept_name: 'Clinic' },
  },
}));
function load(path, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, require(name) {
    if (name in dependencies) return dependencies[name];
    throw new Error(name);
  }, console: { error() {} }, ...globals });
  return exports;
}
function harness(options = {}) {
  const records = recordsFor(options.count || 1);
  const current = records.map((r) => ({ clearance_id: r.clearance_id, status: options.currentStatus || 'Signed', signed_at: options.signedAt || signedAt }));
  const notices = [], calls = [], errors = [];
  let activeInserts = 0, maxInserts = 0;
  const client = { from(table) {
    const filters = [];
    let deleting = false, insert;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
      contains(key, value) { filters.push((row) => Object.entries(value).every(([field, expected]) => row[key]?.[field] === expected)); return query; },
      delete() { deleting = true; return query; },
      insert(value) { insert = value; return query; },
      async then(resolve, reject) {
        try {
          if (table === 'clearance_records') return resolve({ data: current.filter((row) => filters.every((match) => match(row))), error: null });
          assert.equal(table, 'notifications');
          if (deleting) {
            for (let i = notices.length - 1; i >= 0; i--) if (filters.every((match) => match(notices[i]))) notices.splice(i, 1);
          }
          if (insert) {
            activeInserts++; maxInserts = Math.max(maxInserts, activeInserts);
            if (options.insertDelay) await new Promise(setImmediate);
            notices.push(insert); activeInserts--;
          }
          return resolve({ error: null });
        } catch (error) { return reject(error); }
      },
    }; return query;
  } };
  const service = load('src/lib/services/clearance-signing-effects.ts', {
    '@/lib/log-activity': { logActivity: async (...args) => { assert.equal(args[3], client); calls.push('log'); } },
    '@/lib/services/sms-gateway': { default: async (message) => { calls.push('sms'); if (options.sms) await options.sms(message, notices); } },
    '@/lib/services/ready-for-signing-notifications': { dispatchReadyForSigningNotifications: async () => { calls.push('ready'); } },
    '@/lib/services/admin-notifications': {
      checkAndDispatchAdminCompletion: async () => { calls.push('admin-complete'); },
      revokeAdminCompletion: async () => { calls.push('admin-revoke'); },
    },
    '@/lib/services/student-completion': {
      checkAndDispatchStudentCompletion: async () => { calls.push('student-complete'); },
      revokeStudentCompletionNotification: async () => { calls.push('student-revoke'); },
    },
  }, { process: { env: options.sms ? { LOCAL_IP: 'http://sms.test', SMS_USERNAME: 'test', SMS_PASSWORD: 'test' } : {} }, console: { error: (...args) => errors.push(args) } });
  return { records, current, notices, calls, errors, get maxInserts() { return maxInserts; },
    run: (status = 'Signed') => service.runClearanceSigningEffects({ records, status, signedAt: status === 'Signed' ? signedAt : null, actorId: 'officer', adminClient: client, userClient: client, isSingleRecordSign: records.length === 1 }),
  };
}

test('sign follow-up emits alerts and completion checks without student contact data', async () => {
  const h = harness({ sms: async (message, notices) => {
    assert.equal(notices.length, 1); assert.equal(message.department, 'Clinic');
  } });
  await h.run();
  assert.equal(h.notices[0].title, 'Clearance Signed Off');
  assert.ok(h.calls.includes('ready'));
  assert.equal(h.calls.includes('sms'), false);
  assert.equal(h.errors.length, 0);
  assert.ok(h.calls.includes('student-complete'));
});
test('an obsolete sign callback does not notify after undo', async () => {
  const h = harness({ currentStatus: 'Pending' });
  await h.run();
  assert.equal(h.notices.length, 0); assert.equal(h.calls.includes('ready'), false);
  assert.ok(h.calls.includes('log'), 'still audit the committed action');
});
test('an older sign callback cannot supersede a newer signature', async () => {
  const h = harness({ signedAt: '2026-11-04T00:00:01.000Z' });
  await h.run();
  assert.equal(h.notices.length, 0); assert.equal(h.calls.includes('ready'), false);
});
test('undo reconciles notifications without requiring student contact data', async () => {
  const h = harness();
  await h.run();
  h.current[0].status = 'Pending'; h.current[0].signed_at = null;
  await h.run('Pending');
  assert.equal(h.notices.length, 0);
  assert.ok(h.calls.includes('admin-revoke'));
  assert.ok(h.calls.includes('student-revoke'));
  assert.equal(h.errors.length, 0);
});
test('bulk notification work has bounded concurrency instead of one connection per record', async () => {
  const h = harness({ count: 20, insertDelay: true });
  await h.run();
  assert.equal(h.notices.length, 20);
  assert.ok(h.maxInserts > 1);
  assert.ok(h.maxInserts <= 4, `observed ${h.maxInserts} concurrent inserts`);
});
test('an obsolete undo callback does not revoke a new signature', async () => {
  const h = harness();
  await h.run('Pending');
  assert.equal(h.calls.includes('admin-revoke'), false);
  assert.equal(h.calls.includes('student-revoke'), false);
});

test('SMS is skipped when unconfigured, and configured requests have a five-second timeout', async () => {
  const env = {};
  let requests = 0, timeout;
  const sms = load('src/lib/services/sms-gateway.ts', {}, {
    Buffer, process: { env },
    AbortSignal: { timeout: (ms) => { timeout = ms; return AbortSignal.abort(); } },
    fetch: async (_url, options) => {
      requests++; assert.equal(options.signal.aborted, true);
      assert.match(JSON.parse(options.body).textMessage.text, /Registrar/);
      throw new Error('Timed out');
    },
  }).default;
  await sms({ phone_number: '555', department: 'Registrar' });
  assert.equal(requests, 0);
  Object.assign(env, { LOCAL_IP: 'http://sms.test', SMS_USERNAME: 'test', SMS_PASSWORD: 'test' });
  await sms({ phone_number: '555', department: 'Registrar' });
  assert.equal(requests, 1); assert.equal(timeout, 5000);
});
