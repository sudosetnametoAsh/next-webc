const assert=require('node:assert/strict');const {test}=require('node:test');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function harness(){
 const states=[];let cursor=0,result;let studentIds=[],staffIds=[];
 const department=status=>({clearance_id:1,dept_id:1,dept_name:'Registrar',tier:1,status,created_at:null,signed_at:null});
 const students=Array.from({length:24},(_,i)=>({id:`s${i}`,name:`Student ${i}`,email:`s${i}@school.test`,detail:i<12?'BSIT':'BSBA',course_name:i<12?'BSIT':'BSBA',course_id:i<12?1:2,section_id:i<6?1:i<12?2:3,section_number:i<6?1:2,course_year:2,semester:1,departments:[department(i===0?'Signed':'Pending')]}));
 const candidates={source_period_id:1,students,staff:[{id:'o1',name:'Officer One',email:'officer@school.test',detail:'Staff',departments:[department('Pending')]}],templates:[]};
 const exports={};const jsx=(type,props)=>({type,props});
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/admin/carryover-selection.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require(name){
 if(name==='react')return{useState(initial){const n=cursor++;if(!(n in states))states[n]=initial;return[states[n],v=>states[n]=v];}};
 if(name==='react/jsx-runtime')return{jsx,jsxs:jsx,Fragment:'Fragment'};
 if(name.includes('client-filter-toolbar'))return{default:'Toolbar',formatSectionCode:s=>`${s.year}/${s.semester}-${s.section_number}`};
 if(name.includes('client-directory-table'))return{default:'Table'};
 if(name.includes('ui/checkbox'))return{Checkbox:'Checkbox'};
 if(name.includes('clearance-logic'))return{computeClientOverdueStatus:()=>({isOverdue:false})};
 if(name.includes('formatters'))return{shrinkCourseName:s=>s};
 throw Error(name);
 }});
 function render(excluded=false){cursor=0;result=exports.default({candidates,studentIds,staffIds,excluded,onSelectionChange:(s,t)=>{studentIds=s;staffIds=t;}});}
 const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
 const get=type=>nodes(result).find(n=>n.type===type).props;
 render();return{render,get,get studentIds(){return Array.from(studentIds);},get staffIds(){return Array.from(staffIds);}};
}
test('carryover reuses client filters and keeps selections across filters and pages',()=>{
 const h=harness();assert.equal(h.get('Table').clients.length,10);assert.equal(h.get('Table').totalItems,25);
 h.get('Table').selectAllCheckbox().props.onCheckedChange(true);h.render();assert.equal(h.studentIds.length,24);assert.deepEqual(h.staffIds,['o1']);
 h.get('Toolbar').onClientTypeChange('students');h.render();h.get('Toolbar').onCourseChange('BSIT');h.render();assert.equal(h.get('Table').totalItems,12);
 h.get('Table').onPageChange(2);h.render();assert.equal(h.get('Table').currentPage,2);assert.equal(h.get('Table').clients.length,2);
 const last=h.get('Table').clients[1];h.get('Table').clientCheckbox(last).props.children.props.onCheckedChange(false);h.render();assert.ok(!h.studentIds.includes(last.id));assert.ok(h.studentIds.includes('s20'));
 h.get('Toolbar').onSectionChange('1');h.render();assert.equal(h.get('Table').totalItems,6);assert.equal(h.get('Table').currentPage,1);
 h.get('Toolbar').onStatusChange('cleared');h.render();assert.deepEqual(Array.from(h.get('Table').clients,c=>c.id),['s0']);
 h.get('Toolbar').onClientTypeChange('staff');h.render();h.get('Toolbar').onStatusChange('all');h.render();h.get('Toolbar').onSearchChange('officer@');h.render();assert.equal(h.get('Table').totalItems,1);
 h.get('Table').clientCheckbox(h.get('Table').clients[0]).props.children.props.onCheckedChange(false);h.render();assert.deepEqual(h.staffIds,[]);
 h.get('Toolbar').onSearchChange('');h.get('Toolbar').onClientTypeChange('all');h.render(true);assert.equal(h.get('Table').totalItems,2);assert.equal(h.get('Table').selectAllCheckbox(),null);
});
