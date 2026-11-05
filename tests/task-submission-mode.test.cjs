const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>{if(!(n in deps))throw Error(n);return deps[n];}});return exports;}
const {isOnlineSubmission}=load('src/lib/task-submission-mode.ts');
test('the saved mode is independent of earlier review/audit state',()=>{
 const {applyTaskEdit}=load('src/lib/clearance-task-sync.ts');
 const bundle={tasks:[{assigned_task_id:1,dropbox:'pending',title:'Task',status:'Rejected',ai_audit_report:{flags:['Old report']},department:'Clinic'}]};
 const offline=applyTaskEdit(bundle,{assigned_task_id:1,dropbox:'NULL'});
 assert.equal(isOnlineSubmission(offline.tasks[0].dropbox),false);assert.equal(offline.tasks[0].status,'Rejected');assert.equal(offline.tasks[0].department,'Clinic');
 const online=applyTaskEdit(offline,{assigned_task_id:1,dropbox:'pending'});assert.equal(isOnlineSubmission(online.tasks[0].dropbox),true);
 assert.equal(online.tasks[0].ai_audit_report,bundle.tasks[0].ai_audit_report);
});
test('mode markers handle whitespace, nulls, online markers and existing file data consistently',()=>{
 for(const value of [null,undefined,'',' ','NULL',' null ','undefined'])assert.equal(isOnlineSubmission(value),false,String(value));
 for(const value of ['pending',' pending ','https://school.test/file.pdf','[{"url":"file.pdf"}]'])assert.equal(isOnlineSubmission(value),true,value);
});
test('live task state shows incoming mode in the first render and preserves local submission feedback',()=>{
 const states=[];let index=0;const {useLiveTaskState}=load('src/hooks/clearance/use-live-task-state.ts',{react:{useState(initial){const i=index++;if(!(i in states))states[i]=initial;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next];}}});
 const render=source=>{index=0;return useLiveTaskState(source);};
 const old=[{id:1,dropbox:'pending'}];let [value,setValue]=render(old);
 setValue(previous=>previous.map(task=>({...task,status:'Submitted'})));[value]=render(old);assert.equal(value[0].status,'Submitted');
 const edited=[{id:1,dropbox:'NULL',status:'Submitted'}];[value]=render(edited);assert.equal(value,edited);assert.equal(isOnlineSubmission(value[0].dropbox),false);
 [value]=render(edited);assert.equal(value,edited);
});
