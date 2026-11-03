const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const template = (staff, tier, name, active = true) => ({ staff_id: staff, tier, is_active: active, departments: { dept_name: name, icon_name: null } });
const record = (id, owner, tpl, status = 'Pending') => ({ clearance_id: id, user_id: owner, clearance_templates: tpl, status, signed_at: null });
function harness(records, options = {}) {
  const queries = [];
  const admin = { from(table) {
    assert.equal(table, 'clearance_records');
    const filters = [];
    let assignment = false;
    const query = {
      select(selection) { assignment = selection.includes('!inner'); queries.push({ assignment, filters }); return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      limit() { return query; },
      maybeSingle: async () => {
        const data = records.find((r) => filters.every(([key, value]) => {
          const tpl = Array.isArray(r.clearance_templates) ? r.clearance_templates[0] : r.clearance_templates;
          return key.startsWith('clearance_templates.') ? tpl?.[key.split('.')[1]] === value : r[key] === value;
        }));
        return { data: data || null, error: options.failAssignment ? { message: 'Database unavailable' } : null };
      },
      then(resolve, reject) {
        const data = records.filter((r) => filters.every(([key, value]) => r[key] === value));
        return Promise.resolve({ data, error: options.failRecords ? { message: 'Relation unavailable' } : null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/app/api/department/clients/progress/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, console: { error() {} }, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
    if (name.includes('get-session')) return { getSession: async () => ({ user_id: 'officer' }) };
    if (name.includes('supabase-admin')) return { getSupabaseAdmin: () => admin };
    throw new Error(name);
  } });
  return { queries, get: (id = 'client') => exports.GET({ nextUrl: new URL('http://localhost/api/department/clients/progress' + (id ? '?studentId=' + encodeURIComponent(id) : '')) }) };
}

test('assigned officer can see all active departments while unrelated client data stays excluded', async () => {
  const h = harness([
    record(1, 'client', template('officer', 2, 'Clinic'), 'Incomplete'),
    record(2, 'client', template('other-officer', 1, 'Cashier'), 'Signed'),
    record(3, 'client', template('other-officer', 3, 'Registrar')),
    record(4, 'client', template('other-officer', 1, 'Old office', false)),
    record(5, 'another-client', template('officer', 1, 'Cashier')),
  ]);
  const response = await h.get();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const { data } = await response.json();
  assert.deepEqual(data.map((r) => r.dept_name), ['Cashier', 'Clinic', 'Registrar']);
  assert.deepEqual(data.map((r) => r.status), ['Signed', 'Incomplete', 'Pending']);
  assert.ok(h.queries[0].filters.some(([key, value]) => key === 'clearance_templates.staff_id' && value === 'officer'));
});
test('supports array-shaped PostgREST relations and missing department metadata', async () => {
  const tpl = template('officer', 2, 'Clinic');
  tpl.departments = [tpl.departments];
  const h = harness([record(1, 'client', [tpl]), record(2, 'client', { staff_id: 'other', is_active: true, departments: null })]);
  const data = (await (await h.get()).json()).data;
  assert.equal(data[0].dept_name, 'Unknown Department');
  assert.equal(data[0].tier, 1);
  assert.equal(data[1].dept_name, 'Clinic');
});
test('officer without an active assignment cannot read a client\'s other departments', async () => {
  for (const rows of [[record(1, 'client', template('other-officer', 1, 'Clinic'))], [record(1, 'client', template('officer', 1, 'Clinic', false))]]) {
    const h = harness(rows);
    assert.equal((await h.get()).status, 403);
    assert.equal(h.queries.length, 1, 'must stop before the privileged full-progress read');
  }
});
for (const options of [{ failAssignment: true }, { failRecords: true }]) test('query failures are errors rather than empty progress ' + JSON.stringify(options), async () => {
  const h = harness([record(1, 'client', template('officer', 1, 'Clinic'))], options);
  const response = await h.get();
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /Could not load department status/);
});
test('missing client ID does not query the database', async () => {
  const h = harness([]);
  assert.equal((await h.get('')).status, 400);
  assert.equal(h.queries.length, 0);
});
test('subsequent requests return changed statuses without a page cache', async () => {
  const row = record(1, 'client', template('officer', 1, 'Clinic'));
  const h = harness([row]);
  assert.equal((await (await h.get()).json()).data[0].status, 'Pending');
  row.status = 'Signed';
  assert.equal((await (await h.get()).json()).data[0].status, 'Signed');
});
