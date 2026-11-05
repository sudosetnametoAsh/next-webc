const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

async function save(kind, existing, assignments, courses = [1], failRead = false) {
  const notices = [];
  const userClient = { from() {
    let write = false, columns;
    const q = {
      select(value) { columns = value; return q; }, in() { return q; }, is() { return q; },
      not() { columns = 'unassigned'; return q; }, eq() { return q; },
      update() { write = true; return q; }, insert() { write = true; return q; }, upsert() { write = true; return q; },
      single() { return Promise.resolve({ data: { template_id: 1 }, error: null }); },
      then(resolve, reject) { return Promise.resolve({
        data: write ? courses.map(course_id => ({ template_id: 1, course_id })) : columns === 'unassigned' ? [] : existing,
        error: !write && failRead ? { message: 'Read failed' } : null,
      }).then(resolve, reject); },
    };
    return q;
  } };
  const adminClient = { from(table) {
    if (table === 'courses') return { select: () => ({ in: async () => ({ data: courses.map(course_id => ({ course_id, course_name: `Course ${course_id}` })) }) }) };
    return { insert: async rows => { notices.push(...rows); return { error: null }; } };
  } };
  const exports = {};
  const noop = async () => {};
  new Function('exports', 'require', 'console', ts.transpileModule(
    fs.readFileSync(`src/app/api/admin/${kind}-templates/route.ts`, 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText)(exports, name => {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name.includes('supabase-server')) return { createClient: async () => userClient };
    if (name.includes('supabase-admin')) return { getSupabaseAdmin: () => adminClient };
    return new Proxy({}, { get: () => noop });
  }, { error() {} });
  const response = await exports.POST({ json: async () => ({ courses, assignments }) });
  return { response, notices };
}

for (const kind of ['course', 'staff']) {
  const previous = { template_id: 1, course_id: 1, dept_id: 1, staff_id: 'existing', tier: 1, is_active: true };
  test(`${kind} template edit only notifies the newly added department officer`, async () => {
    const h = await save(kind, [previous], [
      { dept_id: 1, staff_id: 'existing', tier: 2 }, { dept_id: 2, staff_id: 'new', tier: 1 },
    ]);
    assert.equal(h.response.status, 201);
    assert.deepEqual(h.notices.map(row => row.user_id), ['new']);
  });
  test(`${kind} phase-only edits do not resend assignments`, async () => {
    const h = await save(kind, [previous], [{ dept_id: 1, staff_id: 'existing', tier: 3 }]);
    assert.equal(h.response.status, 201);
    assert.deepEqual(h.notices, []);
  });
  for (const is_active of [true, false]) {
    test(`${kind} ${is_active ? 'reassignment' : 'reactivation'} notifies the assigned officer`, async () => {
      const h = await save(kind, [{ ...previous, is_active }], [{ dept_id: 1, staff_id: is_active ? 'replacement' : 'existing', tier: 1 }]);
      assert.equal(h.response.status, 201);
      assert.equal(h.notices.length, 1);
      assert.equal(h.notices[0].user_id, is_active ? 'replacement' : 'existing');
    });
  }
  test(`${kind} read failures cannot generate assignment notices`, async () => {
    const h = await save(kind, [], [{ dept_id: 1, staff_id: 'existing' }], [1], true);
    assert.equal(h.response.status, 500);
    assert.deepEqual(h.notices, []);
  });
}
test('multi-course edits only include newly assigned courses in officer notices', async () => {
  const h = await save('course', [{ template_id: 1, course_id: 1, dept_id: 1, staff_id: 'existing', is_active: true }],
    [{ dept_id: 1, staff_id: 'existing' }], [1, 2]);
  assert.equal(h.response.status, 201);
  assert.deepEqual(h.notices[0].metadata.courseIds, [2]);
  assert.match(h.notices[0].description, /Course 2/);
  assert.doesNotMatch(h.notices[0].description, /Course 1/);
});
