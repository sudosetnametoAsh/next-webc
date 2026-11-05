const assert=require('node:assert/strict');const {test}=require('node:test');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,deps){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console:{error(){}},require:n=>{if(!(n in deps))throw Error(n);return deps[n];}});return exports;}
test('partial task events preserve joined metadata and do not add unrelated tasks',()=>{
 const {applyTaskEdit}=load('src/lib/clearance-task-sync.ts',{});
 const bundle={tasks:[{assigned_task_id:1,title:'Old',description:'Instructions',due_date:'2030-01-01',dropbox:'enabled',department:'Clinic',staff:'Officer',status:'Submitted'}]};
 const edited=applyTaskEdit(bundle,{assigned_task_id:1,title:'New',due_date:null,dropbox:null,department:'Untrusted raw field'});
 assert.equal(edited.tasks[0].title,'New');assert.equal(edited.tasks[0].description,'Instructions');assert.equal(edited.tasks[0].status,'Submitted');assert.equal(edited.tasks[0].department,'Clinic');assert.equal(edited.tasks[0].due_date,null);
 assert.equal(bundle.tasks[0].title,'Old');assert.equal(applyTaskEdit(bundle,{assigned_task_id:2,title:'Other'}),bundle);assert.equal(applyTaskEdit(undefined,{assigned_task_id:1}),undefined);
});
for(const fail of [false,true])test('task edit cache invalidation precedes deferred notification work; failure='+fail,async()=>{
 const callbacks=[],invalidations=[];let notifications=0;
 const query={select(){return query;},eq(){return query;},update(){return query;},maybeSingle:async()=>({data:{title:'Old'},error:null}),single:async()=>({data:fail?null:{assigned_task_id:1,title:'New'},error:fail?{message:'Denied'}:null})};
 const dates=load('src/lib/date-time.ts',{});
 const route=load('src/app/api/department/clients/tasks/[clearanceId]/route.ts',{
 '@/lib/date-time':dates,
 'next/server':{after:fn=>callbacks.push(fn),NextResponse:{json:(body,init)=>Response.json(body,init)}},
 '@/lib/auth/get-session':{getSession:async()=>({user_id:'officer'})},
 '@/lib/db/supabase-server':{createClient:async()=>({from:()=>query})},
 '@/lib/db/supabase-admin':{getSupabaseAdmin:()=>({from(){notifications++;return{select(){return this;},ilike:async()=>({data:[],error:null})};}})},
 '@/lib/services/department-cache':{invalidateServerDepartmentCache:()=>invalidations.push('department')},
 '@/lib/services/clearance-cache':{invalidateServerClearanceCache:()=>invalidations.push('client')},
 });
 const response=await route.PATCH({json:async()=>({assigned_task_id:1,title:'New'})});
 assert.equal(response.status,fail?500:200);assert.equal(notifications,0);assert.equal(callbacks.length,fail?0:1);
 assert.deepEqual(invalidations,fail?[]:['department','client']);if(!fail){await callbacks[0]();assert.equal(notifications,1);}
});
