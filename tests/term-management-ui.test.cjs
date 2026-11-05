const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const types={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/academic-periods/types.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:types,Date});

function harness() {
 const states=[],writes=[],messages=[];let cursor=0,result;
 const periods=[{period_id:1,start_year:2026,end_year:2027,term:1,state:'ended',is_active:false,activated_at:'2026-11-01',ended_at:'2026-11-05'}];
 const candidate=(id,name)=>({id,name,email:`${id}@school.test`,detail:'Test'});
 const candidates={source_period_id:1,students:[candidate('s1','Student One'),candidate('s2','Student Two')],staff:[candidate('staff1','Staff Client'),candidate('o1','Officer One'),candidate('o2','Officer Two')],templates:[{template_id:1,staff_id:'o1',department:'Library'},{template_id:2,staff_id:'o2',department:'Registrar'}]};
 const jsx=(type,props)=>({type,props:props||{}});
 const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},useRef(value){return react.useState({current:value})[0];},useEffect(){}};
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/admin/use-term-management.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports,Date,console,fetch:async(url,options)=>{
   if(!options?.body)return{ok:true,json:async()=>({data:candidates})};
   const body=JSON.parse(options.body);writes.push(body);return{ok:true,json:async()=>({data:{...periods[0],period_id:2,state:'preparing',is_active:true,...body}})};
  },require(name){
   if(name==='react')return react;
   if(name==='react/jsx-runtime')return{jsx,jsxs:jsx,Fragment:'Fragment'};
   if(name==='next/navigation')return{useRouter:()=>({refresh(){}}),useSearchParams:()=>({get:()=>null})};
   if(name==='@tanstack/react-query')return{useQueryClient:()=>({invalidateQueries:async()=>{},cancelQueries:async()=>{},setQueriesData(){}})};
   if(name==='lucide-react')return new Proxy({},{get:(_,key)=>key});
   if(name==='sonner')return{toast:{success:value=>messages.push(value),error:value=>messages.push(value)}};
   if(name.includes('hooks/admin/academic-periods'))return{useAcademicPeriods:()=>({data:periods,isLoading:false})};
   if(name.includes('academic-periods/types'))return types;
   if(name.includes('ui/dialog'))return{Dialog:'Dialog',DialogContent:'DialogContent',DialogHeader:'DialogHeader',DialogTitle:'DialogTitle',DialogDescription:'DialogDescription'};
   if(name.includes('ui/dropdown-menu'))return{DropdownMenu:'DropdownMenu',DropdownMenuContent:'DropdownMenuContent',DropdownMenuItem:'DropdownMenuItem',DropdownMenuTrigger:'DropdownMenuTrigger'};
   if(name.includes('carryover-selection'))return{default:'CarryoverSelection'};
   if(name.includes('ui/checkbox'))return{Checkbox:'Checkbox'};
   if(name.includes('confirmation-modal'))return{default:'ConfirmationModal'};
   throw new Error(name);
  },
 });
 function render(){cursor=0;result=exports.useTermManagement();}
 function nodes(value){if(!value||typeof value!=='object')return[];if(Array.isArray(value))return value.flatMap(nodes);if(value.type==='Dialog'&&value.props.open===false)return[];return[value,...nodes(value.props?.children)];}
 function text(value){if(typeof value==='string'||typeof value==='number')return String(value);if(Array.isArray(value))return value.map(text).join('');return value?.props?text(value.props.children):'';}
 function all(){return [...nodes(result.toolbar),...nodes(result.modal),...nodes(result.selectionPage)];}
 function click(label){const node=all().find(n=>n.type==='button'&&text(n).includes(label));assert.ok(node,label);node.props.onClick();render();}
 function check(label,value){const parent=all().find(n=>n.type==='label'&&text(n).includes(label));assert.ok(parent,label);const input=nodes(parent).find(n=>n.type==='input'||n.type==='Checkbox');assert.ok(!input.props.disabled,label+' enabled');if(input.type==='Checkbox')input.props.onCheckedChange(value);else input.props.onChange({target:{checked:value}});render();}
 render();
 return{click,check,all,text,render,writes,messages,get result(){return result;},flush:async()=>{await new Promise(setImmediate);render();}};
}

test('carryover controls stay visible, split students/staff and preserve selections through review',async()=>{
 const h=harness();h.click('Manage A.Y.');await h.flush();
 assert.ok(h.all().find(n=>n.type==='button'&&h.text(n).includes('Select students / staff')));
 assert.equal(h.all().some(n=>n.type==='input'&&n.props.type==='datetime-local'),false);
 assert.equal(h.all().some(n=>n.type==='label'&&h.text(n).includes('Carry over templates')),false);
 h.check('Carry over students',true);
 h.click('Select students / staff');
 let selection=h.all().find(n=>n.type==='CarryoverSelection');
 assert.deepEqual(Array.from(selection.props.studentIds),['s1','s2']);assert.deepEqual(Array.from(selection.props.staffIds),[]);
 selection.props.onSelectionChange(['s1'],['staff1','o1']);h.render();
 h.click('Next');selection=h.all().find(n=>n.type==='CarryoverSelection');assert.equal(selection.props.excluded,true);
 h.click('Save');assert.equal(h.result.selectionPage,null);
 const label=h.all().find(n=>n.type==='label'&&h.text(n).includes('Carry over templates'));
 const checkbox=label.props.children.find(n=>n?.type==='Checkbox');assert.equal(checkbox.props.disabled,true);
 assert.ok(h.text(h.result.modal).includes('Missing: Officer Two'));
 assert.equal(h.all().find(n=>n.type==='label'&&h.text(n).includes('Carry over staff')).props.children[0].props.checked,true);
 const form=h.all().find(n=>n.type==='form');form.props.onSubmit({preventDefault(){}});await h.flush();
 assert.equal(h.writes.length,1);assert.deepEqual(h.writes[0].student_ids,['s1']);assert.deepEqual(h.writes[0].staff_ids,['staff1','o1']);assert.equal(h.writes[0].carry_templates,false);
 assert.equal(h.writes[0].opens_at,null);assert.equal(h.writes[0].term,2);assert.equal(h.writes[0].start,false);
});
