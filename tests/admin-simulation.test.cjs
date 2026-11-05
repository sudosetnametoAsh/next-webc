const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

function harness(failedTable) {
  const calls = [];
  const rows = {
    students: [{ student_id: 'student-1', student_name: 'Student', enrollments: [] }],
    staffs: [{ staff_id: 'staff-1', staff_name: 'Staff Client' }],
    courses: [], clearance_departments: [], notifications: [],
    current_clearance_records: [{
      clearance_id: 42, status: 'Pending', template_id: 7,
      clearance_templates: { tier: 2, clearance_departments: { dept_id: 3, dept_name: 'Library' } },
    }],
  };
  const client = { from(table) {
    const query = {
      select(columns) {
        // Match the real staff schema so a nonexistent column fails the read.
        if (table === 'staffs') assert.equal(columns, 'staff_id, staff_name');
        return query;
      },
      eq(column, value) { calls.push({ table, column, value }); return query; },
      order() { return query; }, or() { return query; }, limit() { return query; },
      then(resolve, reject) {
        return Promise.resolve({ data: failedTable === table ? null : rows[table],
          error: failedTable === table ? { message: 'Database read failed' } : null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const exports = {};
  new Function('exports', 'require', 'console', ts.transpileModule(
    fs.readFileSync('src/app/api/admin/simulation/route.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText)(exports, name => {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name.includes('supabase-admin')) return { getSupabaseAdmin: () => client };
    if (name.startsWith('@/lib/services/')) return {};
    throw new Error(name);
  }, { error() {} });
  return { GET: exports.GET, calls };
}

test('simulation lists staff clients and returns their current clearances', async () => {
  const h = harness();
  const response = await h.GET({ nextUrl: new URL('http://localhost/api/admin/simulation?studentId=staff-1') });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.students.find(client => client.type === 'staff').student_id, 'staff-1');
  assert.equal(body.currentStudent.type, 'staff');
  assert.equal(body.currentStudent.student_name, 'Staff Client');
  assert.equal(body.currentStudent.clearances[0].dept_name, 'Library');
  assert.deepEqual(h.calls, [{ table: 'current_clearance_records', column: 'user_id', value: 'staff-1' }]);
});

for (const table of ['students', 'staffs', 'courses', 'clearance_departments', 'current_clearance_records', 'notifications']) {
  test(`simulation reports ${table} read failures instead of returning empty data`, async () => {
    const response = await harness(table).GET({ nextUrl: new URL('http://localhost/api/admin/simulation?studentId=staff-1') });
    assert.equal(response.status, 500);
    assert.equal((await response.json()).error, 'Database read failed');
  });
}
