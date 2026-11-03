const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadRoute(path, tables, options = {}) {
  const updates = [];
  const ranges = [];
  const client = { from(table) {
    let rows = tables[table] || [];
    let offset = 0, end = 999, update, selection;
    const query = {
      select(value) { selection = value; return query; },
      in(key, values) { rows = rows.filter(r => values.includes(r[key])); return query; },
      eq(key, value) { rows = rows.filter(r => r[key] === value); return query; },
      ilike() { return query; },
      order() { rows = [...rows].sort((a,b) => a.clearance_id - b.clearance_id); return query; },
      range(start, last) { offset = start; end = last; ranges.push([start,last]); return query; },
      update(value) { update = value; return query; },
      delete() { return query; }, insert() { return query; },
      contains() { return query; },
      maybeSingle() { return Promise.resolve({data: rows[0] || null, error: null}); },
      then(resolve, reject) {
        if (update) updates.push({table, rows, update});
        const error = (options.failPrerequisites || (options.failLaterPage && offset >= 500) || (options.failSigningPrerequisites && selection?.includes('is_active'))) && table === 'clearance_records' && !update && selection?.includes('clearance_templates')
          ? {message:'Prerequisite read failed'} : null;
        return Promise.resolve({ data: error ? null : rows.slice(offset,end+1), error }).then(resolve,reject);
      },
    };
    return query;
  }};
  const noop = async () => {};
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(source, {exports, console:{error(){}}, require(name) {
    if (name === 'next/server') return {NextResponse:{json:(body,init) => Response.json(body,init)}};
    if (name.includes('get-session')) return {getSession:async()=>({user_id:'officer',department:''})};
    if (name.includes('supabase-server')) return {createClient:async()=>client};
    if (name.includes('supabase-admin')) return {getSupabaseAdmin:()=>client};
    return new Proxy({}, {get:()=>noop});
  }});
  return {route:exports,updates,ranges};
}
const getPath = 'src/app/api/department/clients/route.ts';
const signPath = 'src/app/api/department/clients/sign/route.ts';
const template = (tier, active = true, staff = false) => ({tier,is_active:active,course_id:staff?null:1,clearance_departments:{dept_name:`Phase ${tier}`,dept_id:tier}});
const record = (id, tier, status='Pending', active=true, staff=false) => ({clearance_id:id,user_id:'student',status,clearance_templates:template(tier,active,staff),users:null});
const request = (ids=[20],status='Signed') => ({json:async()=>({ids,status,signed_at:status==='Signed'?'2026-11-03T00:00:00Z':null})});

for (const [name, records, expected] of [
  ['blocks phase 2 until phase 1 is signed',[record(10,1),record(20,2)],400],
  ['allows phase 1 independently',[record(20,1),record(30,2)],200],
  ['allows same-phase departments in parallel',[record(10,1,'Signed'),record(20,2),record(30,2)],200],
  ['blocks final phase when any earlier department remains unsigned',[record(10,1,'Signed'),record(20,3),record(30,2)],400],
  ['allows final phase after all earlier phases sign',[record(10,1,'Signed'),record(20,3),record(30,2,'Signed')],200],
  ['ignores inactive prerequisite templates',[record(10,1,'Pending',false),record(20,2)],200],
  ['exempts staff clearances from phase locks',[record(10,1),record(20,2,'Pending',true,true)],200],
]) test(name,async()=>{
  const h=loadRoute(signPath,{clearance_records:records});
  const res=await h.route.PATCH(request());
  assert.equal(res.status,expected);
  assert.equal(h.updates.length,expected===400?0:1);
  if(expected===400) assert.match((await res.json()).error,/locked/);
  else assert.equal(h.updates[0].update.status,'Signed');
});

test('undo remains available when prerequisites are unsigned',async()=>{
  const h=loadRoute(signPath,{clearance_records:[record(10,1),record(20,2,'Signed')]});
  assert.equal((await h.route.PATCH(request([20],'Pending'))).status,200);
  assert.equal(h.updates[0].update.signed_at,null);
});
test('empty selection is rejected without updates',async()=>{
  const h=loadRoute(signPath,{});
  assert.equal((await h.route.PATCH(request([]))).status,400);
  assert.equal(h.updates.length,0);
});
test('bulk signing rejects the whole batch if one client is locked',async()=>{
  const h=loadRoute(signPath,{clearance_records:[record(10,1),record(20,2),{...record(21,2),user_id:'eligible'}]});
  assert.equal((await h.route.PATCH(request([20,21]))).status,400);
  assert.equal(h.updates.length,0);
});

function listingTables(count) {
  // Put every prerequisite AFTER the first 1,000 rows to reproduce the bug.
  const records=Array.from({length:count},(_,i)=>({...record(i+1,2),user_id:`s${i}`,template_id:2,clearance_tasks:[]}));
  const prerequisites=records.map((r,i)=>({...record(count+i+1,1),user_id:r.user_id,template_id:1}));
  return {clearance_templates:[{template_id:2,staff_id:'officer',course_id:1,tier:2,is_active:true}],clearance_records:[...records,...prerequisites]};
}
for (const count of [0,1,250,500,600]) test(`listing evaluates every prerequisite for ${count} clients`,async()=>{
  const h=loadRoute(getPath,listingTables(count));
  const res=await h.route.GET({});
  assert.equal(res.status,200);
  const {data}=await res.json();
  assert.equal(data.length,count);
  assert.ok(data.every(c=>c.isLocked===true));
  if(count===600) assert.ok(h.ranges.some(([start])=>start>=1000));
});
test('listing fails instead of showing unlocked clients when prerequisite query fails',async()=>{
  const h=loadRoute(getPath,listingTables(2),{failPrerequisites:true});
  assert.equal((await h.route.GET({})).status,500);
});

test('listing fails safely if a later prerequisite page fails',async()=>{
  const h=loadRoute(getPath,listingTables(600),{failLaterPage:true});
  assert.equal((await h.route.GET({})).status,500);
});
for (const scenario of ['signed','inactive','staff']) test(`listing unlocks clients with ${scenario} prerequisites`,async()=>{
  const tables=listingTables(1);
  if(scenario==='signed') tables.clearance_records[1].status='Signed';
  if(scenario==='inactive') tables.clearance_records[1].clearance_templates.is_active=false;
  if(scenario==='staff') tables.clearance_templates[0].course_id=null;
  const h=loadRoute(getPath,tables);
  const res=await h.route.GET({});
  assert.equal(res.status,200);
  assert.equal((await res.json()).data[0].isLocked,false);
});

test('signing fails without updates when clearance lookup fails',async()=>{
  const h=loadRoute(signPath,{clearance_records:[record(10,1),record(20,2)]},{failPrerequisites:true});
  assert.equal((await h.route.PATCH(request())).status,500);
  assert.equal(h.updates.length,0);
});

test('signing fails without updates when prerequisite lookup fails',async()=>{
  const h=loadRoute(signPath,{clearance_records:[record(10,1,'Signed'),record(20,2)]},{failSigningPrerequisites:true});
  assert.equal((await h.route.PATCH(request())).status,500);
  assert.equal(h.updates.length,0);
});
