const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, console: { error() {}, warn() {} }, require(name) {
    if (name in dependencies) return dependencies[name];
    return new Proxy({}, { get: () => async () => {} });
  }, ...globals });
  return exports;
}
const json = { NextResponse: { json: (data, init) => Response.json(data, init) } };
function database(tables, options = {}) {
  const reads = [];
  const client = { async rpc() { if(options.failTable) return {error:{message:'Database unavailable'}};return {data:(tables.courses||[]).map(c=>{const sections=(tables.course_sections||[]).filter(s=>s.course_id===c.course_id).map(s=>s.section_id);const templates=(c.clearance_templates||[]).filter(t=>t.is_active).map(t=>t.template_id);return {course_id:c.course_id,students_enrolled:(tables.enrollments||[]).filter(e=>sections.includes(e.section_id)).length,signed_count:(tables.clearance_records||[]).filter(r=>templates.includes(r.template_id)&&r.status==='Signed').length};})};}, from(table) {
    let rows = tables[table.replace(/^current_/, '')] || [], counting = false, offset = 0, end = 999;
    const query = {
      select(selection, config) { counting = config?.count === 'exact'; reads.push({ table, selection, config }); return query; },
      eq(key, value) { rows = rows.filter((row) => key.includes('.') ? row[key.split('.')[0]]?.[key.split('.')[1]] === value : row[key] === value); return query; },
      neq(key, value) { rows = rows.filter((row) => row[key] !== value); return query; },
      is(key, value) { rows = rows.filter((row) => row[key] === value); return query; },
      in(key, values) { rows = rows.filter((row) => values.includes(row[key])); return query; },
      order() { return query; },
      range(start, last) { offset = start; end = last; return query; },
      then(resolve, reject) {
        const error = options.failTable === table ? { message: 'Database unavailable' } : null;
        return Promise.resolve({ data: rows.slice(offset, end + 1), count: counting ? rows.length : null, error }).then(resolve, reject);
      },
    }; return query;
  } };
  return { client, reads };
}
function rateHarness(staff = false, options = {}) {
  const templates = [1, 2].map((id) => ({ template_id: id, dept_id: id, course_id: staff ? null : 1, tier: id, is_active: true, clearance_departments: { dept_name: 'Department ' + id }, staffs: { staff_name: 'Officer' } }));
  const tables = {
    courses: [{ course_id: 1, course_name: 'Computer Science', clearance_templates: templates }],
    clearance_templates: templates,
    course_sections: [{ section_id: 1, course_id: 1 }],
    enrollments: Array.from({ length: 1201 }, (_, i) => ({ student_id: 's' + i, section_id: 1 })),
    staffs: Array.from({ length: 1201 }, (_, i) => ({ staff_id: 's' + i })),
    clearance_records: Array.from({ length: 2402 }, (_, i) => ({ clearance_id: i + 1, user_id: 's' + Math.floor(i / 2), template_id: i % 2 + 1, status: 'Pending' })),
  };
  const db = database(tables, options);
  const route = load(`src/app/api/admin/${staff ? 'staff' : 'course'}-templates/route.ts`, {
    'next/server': json, '@/lib/db/supabase-server': { createClient: async () => db.client }, '@/lib/services/admin-read-client': { adminReadClient: async () => db.client },
  });
  return { ...db, tables, route };
}
for (const staff of [false, true]) test(`${staff ? 'staff' : 'program'} completion counts signatures beyond row 1000 and reflects undo`, async () => {
  const h = rateHarness(staff);
  let response = await h.route.GET();
  assert.equal((await response.json()).data[0].completion_rate, 0);
  h.tables.clearance_records[2401].status = 'Signed';
  response = await h.route.GET();
  assert.equal((await response.json()).data[0].completion_rate, 1);
  h.tables.clearance_records.forEach((row) => { row.status = 'Signed'; });
  response = await h.route.GET();
  assert.equal((await response.json()).data[0].completion_rate, 100);
  h.tables.clearance_records[2401].status = 'Pending';
  response = await h.route.GET();
  assert.equal((await response.json()).data[0].completion_rate, 99);
  assert.match(response.headers.get('cache-control'), /no-store/);
  if(staff) assert.ok(h.reads.some((read) => read.table === 'current_clearance_records' && read.config?.head && read.config.count === 'exact'));
});
for (const staff of [false, true]) test('completion query errors do not masquerade as zero progress ' + staff, async () => {
  const h = rateHarness(staff, { failTable: 'current_clearance_records' });
  assert.equal((await h.route.GET()).status, 500);
});
test('program roster failures do not masquerade as an empty course', async () => {
  const h = rateHarness(false, { failTable: 'current_enrollments' });
  assert.equal((await h.route.GET()).status, 500);
});
test('admin fresh stats bypass a still-valid server cache after signing and undo', async () => {
  const tables = { students: [{ student_id: 's' }], staffs: [], clearance_records: [{ user_id: 's', status: 'Pending', clearance_templates: { is_active: true } }] };
  const db = database(tables);
  const cache = load('src/lib/services/admin-cache.ts', { '@/lib/db/supabase-admin': { getSupabaseAdmin: () => db.client } });
  assert.equal((await cache.getCachedAdminStats()).signed, 0);
  tables.clearance_records[0].status = 'Signed';
  assert.equal((await cache.getCachedAdminStats({ fresh: true })).signed, 1);
  tables.clearance_records[0].status = 'Pending';
  assert.equal((await cache.getCachedAdminStats({ fresh: true })).signed, 0);
});
test('fresh radar ignores both cached and in-flight snapshots', async () => {
  const cache = load('src/lib/services/admin-cache.ts', {});
  let finish;
  const old = cache.getCachedAdminRadar('all', () => new Promise((resolve) => { finish = resolve; }));
  assert.equal(await cache.getCachedAdminRadar('all', async () => 'new', { fresh: true }), 'new');
  finish('old'); await old;
  assert.equal(await cache.getCachedAdminRadar('all', async () => 'latest', { fresh: true }), 'latest');
});
test('stats endpoint forwards the explicit freshness request and disables HTTP caching', async () => {
  let fresh;
  const route = load('src/app/api/admin/stats/route.ts', {
    'next/server': json, '@/lib/services/admin-cache': { getCachedAdminStats: async (options) => { fresh = options.fresh; return {}; } },
  });
  const response = await route.GET({ nextUrl: new URL('http://localhost/api/admin/stats?fresh=true') });
  assert.equal(fresh, true); assert.match(response.headers.get('cache-control'), /no-store/);
});

test('admin listener catches up on subscribe/reconnect and refreshes completion queries without losing trailing events', async () => {
  const effects = [], timers = new Map(), intervals = new Map(), invalidated = [];
  let status, event, release, first = true;
  const gate = new Promise((resolve) => { release = resolve; });
  const queryClient = { invalidateQueries: ({ queryKey }) => {
    invalidated.push(queryKey.join('/'));
    if (first) { first = false; return gate; }
    return Promise.resolve();
  } };
  const channel = { on(_event, filter, fn) { if (filter.table === 'clearance_records') event = fn; return channel; }, subscribe(fn) { status = fn; return channel; } };
  const component = load('src/components/admin/admin-realtime-listener.tsx', {
    react: { useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn() },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    '@tanstack/react-query': { useQueryClient: () => queryClient },
    '@/lib/db/supabase-client': { createClient: () => ({ channel: () => channel, removeChannel() {} }) },
  }, {
    window: { addEventListener() {}, removeEventListener() {} },
    document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    setTimeout: (fn) => { timers.set(1, fn); return 1; }, clearTimeout: (id) => timers.delete(id),
    setInterval: (fn) => { intervals.set(1, fn); return 1; }, clearInterval: (id) => intervals.delete(id),
  });
  component.default(); const cleanup = effects[0]();
  status('SUBSCRIBED'); assert.equal(timers.size, 0);
  event(); assert.equal(timers.size, 1);
  timers.get(1)(); timers.clear(); event(); release(); await new Promise(setImmediate);
  for (const key of ['stats', 'pipeline-radar', 'student-templates', 'course-templates', 'staff-templates', 'staff']) {
    assert.equal(invalidated.filter((value) => value === 'admin/' + key).length, 2, key);
  }
  status('CHANNEL_ERROR'); assert.equal(intervals.size, 1);
  status('SUBSCRIBED'); assert.equal(intervals.size, 0);
  cleanup(); assert.equal(timers.size, 0);
});
