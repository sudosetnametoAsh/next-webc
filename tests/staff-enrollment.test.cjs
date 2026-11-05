const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const enrollment = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/enrollment.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: enrollment });
function harness(options = {}) {
  const rpcCalls = [], writes = [];
  const client = {
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return { data: options.empty ? null : 'S1234567890', error: options.fail ? { message: 'Identity conflict' } : null };
    },
    from(table) { return { upsert: async (value) => { writes.push({ table, value }); return { error: null }; } }; },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/app/api/admin/enrollments/import/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, console: { error() {}, warn() {} }, require(name) {
    if (name === '@/lib/enrollment') return enrollment;
    if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
    if (name.includes('academic-periods')) return { requireActiveAcademicPeriod: async () => ({ period_id: 1 }) };
    if (name.includes('supabase-admin')) return { getSupabaseAdmin: () => client };
    return new Proxy({}, { get: () => () => {} });
  } });
  return { rpcCalls, writes, post: async (clients, type = 'staff') => (await exports.POST({ json: async () => ({ type, clients }) })).json() };
}
test('staff enrollment without an ID calls the atomic identity function with normalized email', async () => {
  const h = harness();
  const result = await h.post([{ name: ' Staff, Test ', email: ' STAFF@Example.edu ' }]);
  assert.equal(result.summary.successCount, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.rpcCalls)), [{ name: 'enroll_staff_for_period', params: { p_email: 'staff@example.edu', p_name: 'Staff, Test', p_staff_id: null, p_period_id: 1 } }]);
  assert.equal(h.writes.length, 0, 'identity and period participation are persisted together by the database function');
});
test('legacy staff IDs remain supported for repeat imports', async () => {
  const h = harness();
  assert.equal((await h.post([{ staff_id: 'EMP001', name: 'Staff, Test', email: 'staff@example.edu' }])).success, true);
  assert.equal(h.rpcCalls[0].params.p_staff_id, 'EMP001');
});
for (const options of [{ fail: true }, { empty: true }]) test('failed identity creation does not report success ' + JSON.stringify(options), async () => {
  const h = harness(options);
  const result = await h.post([{ name: 'Staff, Test', email: 'staff@example.edu' }]);
  assert.equal(result.success, false); assert.equal(result.summary.failedCount, 1); assert.equal(h.writes.length, 0);
});
test('students still need their supplied ID', async () => {
  const h = harness();
  assert.equal((await h.post([{ name: 'Student, Test', email: 'student@example.edu' }], 'student')).summary.failedCount, 1);
  assert.equal(h.rpcCalls.length, 0); assert.equal(h.writes.length, 0);
  assert.equal((await h.post([{ student_id: '02000123456', name: 'Student, Test', email: 'student@example.edu' }], 'student')).summary.successCount, 1);
  assert.equal(h.writes[0].value.user_id, '02000123456');
  assert.equal(h.writes[1].value.student_id, '02000123456');
});
test('invalid emails and oversized legacy IDs fail before database writes', async () => {
  const h = harness();
  const result = await h.post([{ name: 'Staff, Test', email: 'invalid@@example.edu' }, { staff_id: '123456789012', name: 'Staff, Test', email: 'staff@example.edu' }]);
  assert.equal(result.summary.failedCount, 2); assert.equal(h.rpcCalls.length, 0); assert.equal(h.writes.length, 0);
});

test('invalid name formats fail before any identity or profile write', async () => {
  for (const type of ['student', 'staff']) {
    const h = harness();
    const result = await h.post([{ student_id: type === 'student' ? '02000123456' : undefined, name: 'Juan Dela Cruz', email: 'juan@lucena.sti.edu.ph' }], type);
    assert.equal(result.summary.failedCount, 1);
    assert.match(result.summary.errors[0].error, /Last Name, First Name/);
    assert.equal(h.rpcCalls.length, 0); assert.equal(h.writes.length, 0);
  }
});
test('roster usernames receive the campus domain and formatted names are normalized', async () => {
  const h = harness();
  assert.equal((await h.post([{ name: ' Dela Cruz ,   Juan ', email: 'juan.delacruz' }])).summary.successCount, 1);
  assert.equal(h.rpcCalls[0].params.p_email, 'juan.delacruz@lucena.sti.edu.ph');
  assert.equal(h.rpcCalls[0].params.p_name, 'Dela Cruz, Juan');
});
