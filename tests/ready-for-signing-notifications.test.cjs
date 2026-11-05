const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

async function dispatch({ staff = false, blocked = false } = {}) {
  const inserted = [];
  const ids = ['a', 'b', 'c'];
  const records = ids.flatMap((user_id, index) => [
    { user_id, clearance_id: index * 2, status: blocked ? 'Pending' : 'Signed', clearance_templates: { tier: 2, is_active: true } },
    { user_id, clearance_id: index * 2 + 1, status: 'Pending', clearance_templates: {
      tier: 3, is_active: true, staff_id: index < 2 ? 'officer-1' : 'officer-2',
      clearance_departments: { dept_id: 7, dept_name: 'Library' },
    } },
  ]);
  const tables = {
    current_clearance_records: records,
    students: staff ? [] : ids.map(student_id => ({ student_id, student_name: student_id })),
    staffs: staff ? ids.map(staff_id => ({ staff_id, staff_name: staff_id })) : [],
    current_enrollments: staff ? [] : ids.map(student_id => ({ student_id, course_sections: {
      section_id: 10, year: 1, semester: 1, section_number: 1, courses: { course_name: 'BSIT' },
    } })),
  };
  const client = { from(table) {
    const q = { select() { return q; }, in() { return q; },
      insert(rows) { inserted.push(...rows); return q; },
      then(resolve, reject) { return Promise.resolve({ data: tables[table] || [], error: null }).then(resolve, reject); },
    };
    return q;
  } };
  const exports = {};
  new Function('exports', 'require', ts.transpileModule(
    fs.readFileSync('src/lib/services/ready-for-signing-notifications.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText)(exports, () => ({ shrinkCourseName: value => value }));
  await exports.dispatchReadyForSigningNotifications({ signedUserIds: ids,
    signedTiersByUser: new Map(ids.map(id => [id, new Set([2])])), adminClient: client });
  return inserted;
}

for (const staff of [false, true]) {
  test(`batch readiness delivers exact ${staff ? 'staff' : 'student'} counts to each assigned officer`, async () => {
    const rows = await dispatch({ staff });
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(row => [row.user_id, row.metadata.count]), [['officer-1', 2], ['officer-2', 1]]);
    assert.ok(rows.every(row => row.department_id === 7 && row.metadata.isBatch));
    assert.match(rows[0].description, /2 .* are now eligible for signing/);
    assert.match(rows[1].description, /1 .* is now eligible for signing/);
  });
}
test('batch readiness does not notify officers while lower phases remain unsigned', async () => {
  assert.deepEqual(await dispatch({ blocked: true }), []);
});
