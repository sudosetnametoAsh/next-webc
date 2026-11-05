const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,deps,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Date,Map,AbortController,require:n=>{if(!(n in deps))throw Error(n);return deps[n];},...globals});return exports;}
function overlay(){
 const states=[];let index=0;const jsx=(type,props)=>({type,props:props||{}});
 const react={useState(initial){const i=index++;if(!(i in states))states[i]=initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useMemo:fn=>fn(),useEffect(){},useRef:value=>react.useState({current:value})[0]};
 const {useLiveTaskState}=load('src/hooks/clearance/use-live-task-state.ts',{react});const mode=load('src/lib/task-submission-mode.ts',{});
 const component=load('src/components/clearance/deparment-overlay.tsx',{
 react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},'lucide-react':new Proxy({},{get:(_,n)=>n}),
 '@/hooks/clearance/use-live-task-state':{useLiveTaskState},'@/lib/task-submission-mode':mode,
 '@/lib/date-time':{APP_TIME_ZONE:'Asia/Manila'},'@/lib/weekly-schedule':{officeStatus:()=>({schedule:null,isOpen:false,hasSchedule:false}),campusClock:()=>({dayKey:'fri'}),hasWeeklySchedule:()=>false,formatOfficeTime:s=>s},
 './requirement-modal':{default:'RequirementModal'},'@/lib/department-icons':{getDepartmentIcon:()=> 'Building'},'@/lib/clearance-logic':{isTaskViewed:()=>true,getTaskViewKey:()=>''},
 });
 const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
 const text=n=>typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):n?.props?text(n.props.children):'';
 let result;return{render(tasks){index=0;result=component.default({selectedRecord:{clearance_id:10,department:'Clinic',status:'Pending'},departmentTasks:tasks,studentId:'student',setSelectedRecord(){}});return text(result);},open(){const row=nodes(result).find(n=>n.type==='button'&&text(n).includes('Task'));assert.ok(row);row.props.onClick();},get modal(){return nodes(result).find(n=>n.type==='RequirementModal').props.task;}};
}
test('mode/date-only realtime cache updates render in the overlay and open modal without polling',()=>{
 const {applyTaskEdit}=load('src/lib/clearance-task-sync.ts',{});
 let bundle={tasks:[{assigned_task_id:7,clearance_id:10,title:'Task',description:'Instructions',department:'Clinic',status:'Pending',dropbox:'pending',due_date:null}]};
 const ui=overlay();ui.render(bundle.tasks);ui.open();ui.render(bundle.tasks);assert.equal(ui.modal.isInPerson,false);assert.equal(ui.modal.due_date,null);
 bundle=applyTaskEdit(bundle,{assigned_task_id:7,dropbox:'NULL',due_date:'2030-01-10T12:00:00Z'});
 const rendered=ui.render(bundle.tasks);assert.equal(ui.modal.isInPerson,true);assert.equal(ui.modal.due_date,'2030-01-10T12:00:00Z');assert.match(rendered,/Jan 10, 2030/);
 bundle=applyTaskEdit(bundle,{assigned_task_id:7,dropbox:'pending',due_date:null});ui.render(bundle.tasks);assert.equal(ui.modal.isInPerson,false);assert.equal(ui.modal.due_date,null);assert.equal(ui.modal.title,'Task');
});
