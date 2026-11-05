const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const now = Date.parse('2026-11-03T12:00:00Z');
const ago = hours => new Date(now - hours * 3600000).toISOString();
const templates = [1,2,3].map(tier=>({template_id:tier,course_id:1,dept_id:tier,tier,staff_id:'officer',is_active:true,clearance_departments:{dept_id:tier,dept_name:`Office ${tier}`},staffs:{staff_name:'Officer'}}));
const record = (id,tier,status='Pending',signedHours=null,user='student',createdHours=100) => ({clearance_id:id,template_id:tier,user_id:user,status,signed_at:signedHours===null?null:ago(signedHours),created_at:ago(createdHours)});
async function radar(records,options={}) {
  const tables={courses:[{course_id:1,course_name:'Computer Science'}],clearance_departments:templates.map(t=>({dept_id:t.dept_id,dept_name:`Office ${t.tier}`})),clearance_templates:options.templates||templates,clearance_records:records};
  const client={from(table){let rows=tables[table.replace(/^current_/, '')],start=0,end=999;const q={select(){return q},eq(k,v){rows=rows.filter(r=>r[k]===v);return q},order(k){rows=[...rows].sort((a,b)=>a[k]>b[k]?1:-1);return q},range(a,b){start=a;end=b;return q},then(resolve,reject){return Promise.resolve({data:options.failPage&&table==='current_clearance_records'&&start>=500?null:rows.slice(start,end+1),error:options.failPage&&table==='current_clearance_records'&&start>=500?new Error('page failed'):null}).then(resolve,reject)}};return q}};
  const exports={};
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
  const source=ts.transpileModule(fs.readFileSync('src/app/api/admin/pipeline-radar/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(source,{exports,Date:FixedDate,URL,console:{error(){}},require(name){
    if(name.includes('clearance-overdue')) { const mod={exports:{}}; const js=ts.transpileModule(fs.readFileSync('src/lib/clearance-overdue.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText; vm.runInNewContext(js,{exports:mod.exports}); return mod.exports; }
    if(name==='next/server')return {NextResponse:{json:(body,init)=>Response.json(body,init)}};
    if(name.includes('admin-read-client'))return {adminReadClient:async()=>client};
    if(name.includes('supabase-server'))return {createClient:async()=>client};
    if(name.includes('admin-cache'))return {getCachedAdminRadar:async(_,fn)=>fn()};
    if(name.includes('formatters'))return {shrinkCourseName:x=>x,expandCourseAbbreviation:x=>x};
    throw new Error(name);
  }});
  const response=await exports.GET({url:'http://localhost/api/admin/pipeline-radar?filter=1'});
  return {status:response.status,data:(await response.json()).data};
}
const dept=(data,tier)=>data.departmentProgress.find(d=>d.deptId===tier);

test('locked later phases never accrue overdue time',async()=>{
  const {status,data}=await radar([record(1,1),record(2,2),record(3,3)]);
  assert.equal(status,200);assert.equal(dept(data,1).stalledCount,1);
  assert.equal(dept(data,2).stalledCount,0);assert.equal(dept(data,3).stalledCount,0);
});
test('recently unlocked phase starts at prerequisite signature, not enrollment',async()=>{
  const {data}=await radar([record(1,1,'Signed',1),record(2,2),record(3,3)]);
  assert.equal(dept(data,2).stalledCount,0);assert.equal(dept(data,2).avgWaitHours,1);
  assert.equal(dept(data,3).stalledCount,0);
});
for(const hours of [23.99,24,25])test(`24-hour SLA boundary: ${hours} hours`,async()=>{
  const {data}=await radar([record(1,1,'Signed',hours),record(2,2),record(3,3)]);
  assert.equal(dept(data,2).stalledCount,hours>=24?1:0);
});
test('last parallel prerequisite signature determines final phase arrival',async()=>{
  const extra={...templates[1],template_id:4,dept_id:4,clearance_departments:{dept_id:4,dept_name:'Parallel'}};
  const {data}=await radar([record(1,1,'Signed',80),record(2,2,'Signed',50),record(3,4,'Signed',2),record(4,3)],{templates:[...templates,extra]});
  assert.equal(dept(data,3).stalledCount,0);assert.equal(dept(data,3).avgWaitHours,2);
});
test('record created after prerequisites starts waiting at its own creation',async()=>{
  const {data}=await radar([record(1,1,'Signed',70),record(2,2,'Pending',null,'student',3)]);
  assert.equal(dept(data,2).avgWaitHours,3);assert.equal(dept(data,2).stalledCount,0);
});
test('blocked clients do not dilute average eligible waiting time',async()=>{
  const {data}=await radar([record(1,1,'Signed',30,'eligible'),record(2,2,'Pending',null,'eligible'),record(3,1,'Pending',null,'blocked'),record(4,2,'Pending',null,'blocked')]);
  assert.equal(dept(data,2).pendingCount,2);assert.equal(dept(data,2).avgWaitHours,30);assert.equal(dept(data,2).stalledCount,1);
});
test('fully signed clients never count as stalled',async()=>{
  const {data}=await radar([record(1,1,'Signed',90),record(2,2,'Signed',80),record(3,3,'Signed',70)]);
  assert.ok(data.departmentProgress.every(d=>d.stalledCount===0&&d.rate===100));
});
test('staff departments run in parallel regardless of template tier',async()=>{
  const {data}=await radar([record(1,1),record(2,2)],{templates:templates.map(t=>({...t,course_id:null}))});
  assert.equal(dept(data,1).stalledCount,1);assert.equal(dept(data,2).stalledCount,1);
});
test('all records beyond 1000 contribute to bottleneck counts',async()=>{
  const records=Array.from({length:1201},(_,i)=>record(i+1,1,'Pending',null,`s${i}`));
  const {data}=await radar(records);
  assert.equal(dept(data,1).totalAssigned,1201);assert.equal(dept(data,1).stalledCount,1201);
});
test('later-page failures return an error rather than incomplete report',async()=>{
  const records=Array.from({length:501},(_,i)=>record(i+1,1,'Pending',null,`s${i}`));
  assert.equal((await radar(records,{failPage:true})).status,500);
});
test('empty campus has no stalled departments',async()=>{
  const {data}=await radar([]);assert.ok(data.departmentProgress.every(d=>!d.isBottleneck&&d.stalledCount===0));
});

function primary(departments) {
  const source=fs.readFileSync('src/components/admin/reports/reports-page-client.tsx','utf8');
  const body=source.split('const primaryBottleneck = useMemo(() => {')[1].split('}, [pipelineData])')[0];
  return vm.runInNewContext(`(() => {${body}})()`,{pipelineData:{departmentProgress:departments}});
}
test('report does not label ordinary pending work a bottleneck',()=>{
  assert.equal(primary([{totalAssigned:10,pendingCount:10,stalledCount:0,isBottleneck:false}]),null);
});
test('report selects overdue department rather than merely pending work',()=>{
  const overdue={deptName:'Overdue',totalAssigned:10,pendingCount:2,stalledCount:2,isBottleneck:false};
  assert.equal(primary([{totalAssigned:100,pendingCount:100,stalledCount:0,isBottleneck:false},overdue]).deptName,'Overdue');
});
