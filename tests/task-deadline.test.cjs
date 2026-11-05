const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,deps={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Date,require:n=>{if(!(n in deps))throw Error(n);return deps[n];},...globals});return exports;}
const dates=load('src/lib/date-time.ts');
test('Manila midnight rejects yesterday despite UTC still being the preceding day',()=>{
 const now=new Date('2026-11-05T16:30:00Z');
 assert.equal(dates.campusDateInput(now),'2026-11-06');
 assert.match(dates.taskDeadlineError(dates.campusEndOfDay('2026-11-05'),null,now),/before today/);
 assert.equal(dates.taskDeadlineError(dates.campusEndOfDay('2026-11-06'),null,now),null);
 assert.equal(dates.taskDeadlineError(null,null,now),null);assert.match(dates.taskDeadlineError('invalid',null,now),/valid due date/);
 const old=dates.campusEndOfDay('2026-11-01');assert.equal(dates.taskDeadlineError(old,old,now),null);
 assert.match(dates.taskDeadlineError(dates.campusEndOfDay('2026-11-02'),old,now),/before today/);
});
function route(existing=null){let writes=0;const query={select(){return query;},eq(){return query;},maybeSingle:async()=>({data:{title:'Task',due_date:existing},error:null}),update(){writes++;return query;},single:async()=>({data:{assigned_task_id:1},error:null})};const api=load('src/app/api/department/clients/tasks/[clearanceId]/route.ts',{
 '@/lib/date-time':dates,'next/server':{after(){},NextResponse:{json:(b,i)=>Response.json(b,i)}},'@/lib/auth/get-session':{getSession:async()=>({user_id:'officer'})},'@/lib/db/supabase-server':{createClient:async()=>({from:()=>query})},'@/lib/db/supabase-admin':{},'@/lib/services/department-cache':{invalidateServerDepartmentCache(){}},'@/lib/services/clearance-cache':{invalidateServerClearanceCache(){}},
 });return{api,get writes(){return writes;}};}
test('task API rejects new past/invalid deadlines and accepts clearing or preserving an overdue deadline',async()=>{
 const old='2000-01-01T15:59:59.000Z';
 for(const value of ['2000-01-02T15:59:59.000Z','invalid']){const h=route(old);assert.equal((await h.api.PATCH({json:async()=>({assigned_task_id:1,due_date:value})})).status,400);assert.equal(h.writes,0);}
 for(const value of [old,null,'2090-01-01T15:59:59.000Z']){const h=route(old);assert.equal((await h.api.PATCH({json:async()=>({assigned_task_id:1,due_date:value})})).status,200);assert.equal(h.writes,1);}
 for(const body of [{clearance_id:1,due_date:old},[{clearance_id:1,due_date:'2090-01-01T15:59:59.000Z'},{clearance_id:2,due_date:old}]]){const h=route();assert.equal((await h.api.POST({json:async()=>body})).status,400);assert.equal(h.writes,0);}
});
test('edit date picker uses today in Manila before UTC midnight',()=>{
 const instant=Date.parse('2026-11-05T16:30:00Z');class FrozenDate extends Date{constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant;}}
 const jsx=(type,props)=>({type,props:props||{}});const react={useState:v=>[v,()=>{}],useEffect(){}};
 const {default:Modal}=load('src/components/department/clients/edit-task-modal.tsx',{
 react,'react/jsx-runtime':{jsx,jsxs:jsx},'sonner':{toast:{error(){},success(){}}},'lucide-react':new Proxy({},{get:(_,k)=>k}),'@/components/ui/switch':{Switch:'Switch'},'@/lib/date-time':dates,'@/lib/task-submission-mode':load('src/lib/task-submission-mode.ts'),
 },{Date:FrozenDate});
 const result=Modal({isOpen:true,onClose(){},task:{assigned_task_id:1,title:'Task',description:'Description',dropbox:'pending'},onSave:async()=>{}});
 const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
 const input=nodes(result).find(n=>n.type==='input'&&n.props.type==='date');assert.equal(input.props.min,'2026-11-06');
});
