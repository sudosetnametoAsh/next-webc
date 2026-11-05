const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function route(user = { user_metadata: { custom_claims: { roles: ['Admin'] } } }) {
  const writes = [], invalidations = [];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/admin/academic-periods/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, Date, require(name) {
    if (name === 'zod') return require(name);
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name.includes('supabase-server')) return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) };
    if (name.includes('supabase-admin')) return { getSupabaseAdmin: () => ({
      from: table => ({ insert(value) { writes.push({ table, value }); return { select: () => ({ single: async () => ({ data: value, error: null }) }) }; } }),
      rpc: async (name, value) => { writes.push({ name, value }); return { error: null }; },
    }) };
    if (name.includes('admin-cache')) return { invalidateServerAdminCache: () => invalidations.push('admin') };
    if (name.includes('department-cache')) return { invalidateServerDepartmentCache: () => invalidations.push('department') };
    if (name.includes('clearance-cache')) return { invalidateServerClearanceCache: () => invalidations.push('clearance') };
    throw new Error(name);
  } });
  return { ...exports, writes, invalidations };
}
const request = body => ({ json: async () => body });

for (const user of [null, { user_metadata: { custom_claims: { roles: ['Student'] } } }, { user_metadata: { custom_claims: { roles: 'NotAdmin' } } }]) {
  test('academic-period mutations require a verified admin role ' + JSON.stringify(user), async () => {
    const h = route(user);
    const response = await h.POST(request({ start_year: 2027, end_year: 2028, term: 1 }));
    assert.equal(response.status, user ? 403 : 401);
    assert.equal(h.writes.length, 0);
  });
}
for (const body of [
  { start_year: 2027, end_year: 2029, term: 1 },
  { start_year: 2027, end_year: 2028, term: 0 },
  { start_year: 2027, end_year: 2028, term: 1, opens_at: 'not-a-date' },
  { start_year: 2027, end_year: 2028, term: 1, student_ids: [123] },
]) test('invalid academic-period data cannot reach the database ' + JSON.stringify(body), async () => {
  const h = route();
  assert.equal((await h.POST(request(body))).status, 400);
  assert.equal(h.writes.length, 0);
});

test('creating a period cannot activate it through extra payload fields', async () => {
  const h = route();
  assert.equal((await h.POST(request({ start_year: 2027, end_year: 2028, term: 1, is_active: true }))).status, 200);
  assert.equal(h.writes[0].value.p_config.is_active, undefined);
});
test('starting calls the transactional database function and invalidates all portal caches', async () => {
  const h = route();
  assert.equal((await h.PATCH(request({ period_id: 2, action: 'start' }))).status, 200);
  assert.equal(h.writes[0].name, 'start_clearance_period');
  assert.equal(h.writes[0].value.p_period_id, 2);
  assert.deepEqual(h.invalidations, ['admin', 'department', 'clearance']);
});


test('save and start validates carryover arrays and delegates the combined transaction', async () => {
 const h=route();
 assert.equal((await h.POST(request({start_year:2026,end_year:2027,term:2,start:true,source_period_id:1,student_ids:['student'],staff_ids:[],officer_ids:['officer'],carry_templates:true}))).status,200);
 assert.equal(h.writes[0].name,'save_clearance_period');assert.equal(h.writes[0].value.p_config.start,true);
});
test('ending delegates notification clearing to the same database transaction',async()=>{
 const h=route();assert.equal((await h.PATCH(request({period_id:1,action:'end'}))).status,200);assert.equal(h.writes[0].name,'end_clearance_period');
});
test('the retired activation payload cannot bypass the new workflow',async()=>{
 const h=route();assert.equal((await h.PATCH(request({period_id:2,carry_enrollments:true}))).status,400);assert.equal(h.writes.length,0);
});
