const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const now=Date.parse('2026-11-03T12:00:00Z');
class FixedDate extends Date {constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
const ago=h=>new Date(now-h*3600000).toISOString();
const helpers={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/clearance-overdue.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:helpers,Date:FixedDate});
function filter(clients,overrides={}) {
  const source=fs.readFileSync('src/components/admin/clients-page-client.tsx','utf8');
  const body=source.split('const filteredClients = useMemo(() => {')[1].split('}, [')[0];
  const js=ts.transpileModule(`const result=(()=>{${body}})()`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  return vm.runInNewContext(js+'\nresult',{unifiedClients:clients,clientType:'all',selectedStatus:'overdue',phaseFilter:'all',departmentFilter:'Clinic',search:'',courseFilter:'all',sectionFilter:'all',...helpers,...overrides});
}
const department=(name,tier,hours,status='Pending')=>({dept_id:name==='Clinic'?2:3,dept_name:name,tier,status,created_at:ago(hours),signed_at:status==='Signed'?ago(hours):null});
function client(id,departments,type='student') {
  return {id:String(id),name:`Client ${id}`,type,courseName:'BSCS',overallStatus:'Pending',departments,isOverdue:departments.some(d=>helpers.isClearanceOverdue(d,departments,type==='staff',now)),overduePhase:2};
}
test('34 clinic overdue clients redirect to 34, excluding 22 overdue at another office',()=>{
  const clients=Array.from({length:56},(_,i)=>client(i,[department('Clinic',2,i<34?30:1),department('Library',2,30)]));
  assert.equal(clients.filter(c=>c.isOverdue).length,56);
  assert.equal(filter(clients).length,34);
});
test('recent phase unlock is not overdue despite old enrollment date',()=>{
  const records=[department('Cashier',1,1,'Signed'),department('Clinic',2,100)];
  const c=client(1,records);assert.equal(c.isOverdue,false);assert.equal(filter([c]).length,0);
});
test('unsigned prerequisite prevents office overdue status',()=>{
  assert.equal(filter([client(1,[department('Cashier',1,100),department('Clinic',2,100)])]).length,0);
});
test('staff overdue at another office is excluded from clinic redirect',()=>{
  assert.equal(filter([client(1,[department('Clinic',2,1),department('Library',1,100)],'staff')]).length,0);
});
test('phase and department must match the same overdue record',()=>{
  const c=client(1,[department('Clinic',3,50),department('Library',2,100)]);
  assert.equal(filter([c],{phaseFilter:'2'}).length,0);
});
test('department names match exactly rather than by substring',()=>{
  assert.equal(filter([client(1,[department('Dental Clinic',2,100)])]).length,0);
});
test('course filter preserves redirected program scope',()=>{
  const a=client(1,[department('Clinic',2,30)]),b={...client(2,[department('Clinic',2,30)]),courseName:'BSIT'};
  assert.equal(filter([a,b],{clientType:'students',courseFilter:'BSCS',shrinkCourseName:x=>x}).length,1);
});
test('24-hour threshold is inclusive and signed offices are excluded',()=>{
  assert.equal(filter([client(1,[department('Clinic',1,24)]),client(2,[department('Clinic',1,23.99)]),client(3,[department('Clinic',1,100,'Signed')])]).length,1);
});

test('clients without templates have their own filter and are excluded from in progress', () => {
  const without = { ...client('none', []), totalDepartments: 0, overallStatus: 'Incomplete' };
  const active = { ...client('active', [department('Clinic', 1, 1)]), totalDepartments: 1, overallStatus: 'Incomplete' };
  const rows = [without, active];
  assert.deepEqual(Array.from(filter(rows, { selectedStatus: 'no-template', departmentFilter: 'all' }), row => row.id), ['none']);
  assert.deepEqual(Array.from(filter(rows, { selectedStatus: 'in-progress', departmentFilter: 'all' }), row => row.id), ['active']);
  assert.equal(filter(rows, { selectedStatus: 'all', departmentFilter: 'all' }).length, 2);
});
