const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { z } = require('zod');

function harness() {
  const rows = new Map([['B', {staff_id:'B',ai_verification_mode:'manual',ai_confidence_threshold:95}]]);
  let current = 'A';
  let fail = false;
  const client = {from(table) {
    assert.ok(['staff_configurations','clearance_tasks'].includes(table));
    let id, pending;
    const result = () => {
      if (fail) return {data:null,error:{message:'unavailable'}};
      if (pending) rows.set(pending.staff_id,pending);
      return {data:table === 'clearance_tasks' ? [] : rows.get(id || pending?.staff_id) || null,error:null};
    };
    const query = {
      select(){return query;},
      eq(key,value){assert.equal(key,'staff_id'); id=value; return query;},
      upsert(value){pending=value;return query;},
      maybeSingle:async()=>result(),
      single:async()=>result(),
      then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);},
    };
    return query;
  }};
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/app/api/department/settings/ai-verification/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,console:{error(){}},require(name){
    if(name==='zod')return {z};
    if(name==='next/server')return {NextResponse:{json:(body,init)=>Response.json(body,init)}};
    if(name.includes('get-session'))return {getSession:async()=>({user_id:current})};
    if(name.includes('supabase-server'))return {createClient:async()=>client};
    throw Error(name);
  }});
  return {route:exports,rows,setStaff:id=>current=id,setFail:()=>fail=true};
}
const request=(mode='autonomous',threshold=85)=>({json:async()=>({aiVerificationMode:mode,aiConfidenceThreshold:threshold,staffId:'B'})});

test('missing configuration returns defaults without creating a row',async()=>{
  const h=harness(); const res=await h.route.GET();
  assert.equal(res.status,200);
  assert.deepEqual((await res.json()).configuration,{staffId:'A',aiVerificationMode:'two_factor',aiConfidenceThreshold:85});
  assert.equal(h.rows.has('A'),false);
});
test('saving and updating staff A never changes staff B',async()=>{
  const h=harness();
  assert.equal((await h.route.PATCH(request())).status,200);
  assert.equal((await h.route.PATCH(request('two_factor',90))).status,200);
  assert.equal(h.rows.get('A').ai_confidence_threshold,90);
  assert.equal(h.rows.get('B').ai_confidence_threshold,95);
  h.setStaff('B');
  assert.equal((await (await h.route.GET()).json()).configuration.aiVerificationMode,'manual');
});
for(const [mode,threshold] of [['invalid',85],['manual',49],['manual',101],['manual',85.5],['manual',null],['manual','85']]) {
  test('rejects invalid configuration '+JSON.stringify([mode,threshold]),async()=>{
    const h=harness();assert.equal((await h.route.PATCH(request(mode,threshold))).status,400);
    assert.equal(h.rows.has('A'),false);
  });
}
test('read failure does not silently return defaults',async()=>{
  const h=harness();h.setFail();assert.equal((await h.route.GET()).status,500);
});
test('failed save reports failure',async()=>{
  const h=harness();h.setFail();assert.equal((await h.route.PATCH(request())).status,500);
});

async function submit(configuration, options = {}) {
  let saved, aiCalls = 0;
  const client = {
    storage:{from:()=>({
      upload:async()=>({error:null}),
      getPublicUrl:()=>({data:{publicUrl:'https://example.test/file.pdf'}}),
    })},
    from(table) {
      let update;
      const query={
        select(){return query;},
        eq(key,value){
          if(table==='staff_configurations') {
            assert.equal(key,'staff_id');
            assert.equal(value,'assigned-staff');
          }
          return query;
        },
        ilike(){return query;},
        update(value){update=value;return query;},
        insert(){return query;},
        single:async()=>({data:{assigned_task_id:1,staff_id:'assigned-staff',title:'Receipt'},error:null}),
        maybeSingle:async()=>({
          data:table==='staff_configurations'?configuration:table==='students'?{student_name:'Student'}:null,
          error:table==='staff_configurations' && options.fail ? {message:'failed'}:null,
        }),
        then(resolve,reject){if(update)saved=update;return Promise.resolve({error:null}).then(resolve,reject);},
      };return query;
    },
  };
  const exports={};
  const source=ts.transpileModule(fs.readFileSync('src/app/api/student/submissions/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,File,Buffer,console:{error(){},warn(){}},require(name){
    if(name==='zod')return {z};
    if(name==='next/server')return {NextResponse:{json:(body,init)=>Response.json(body,init)}};
    if(name.includes('document-upload'))return {validateDocumentUpload:()=>null,getDocumentMimeType:()=>'application/pdf'};
    if(name.includes('supabase-server'))return {createClient:async()=>client};
    if(name.includes('supabase-admin'))return {getSupabaseAdmin:()=>client};
    if(name.includes('ai-vision-verification'))return {verifyDocumentAuthenticity:async()=>{
      aiCalls++;return {isAuthentic:true,studentIdMatches:true,authenticityScore:90};
    }};
    return new Proxy({}, {get:()=>()=>{}});
  }});
  const form=new FormData();
  form.set('file',new File(['receipt'],'receipt.pdf',{type:'application/pdf'}));
  form.set('task','Receipt');form.set('taskId','1');form.set('studentId','student');
  form.set('department','Client supplied department');
  const response=await exports.POST({formData:async()=>form});
  return {response,saved,aiCalls};
}

for(const [mode,threshold,status,calls] of [
  ['manual',85,'Submitted',0],
  ['autonomous',85,'Cleared',1],
  ['autonomous',95,'Flagged',1],
  ['two_factor',85,'Verified',1],
])test('submission applies assigned staff policy '+mode+' '+threshold,async()=>{
  const result=await submit({ai_verification_mode:mode,ai_confidence_threshold:threshold});
  assert.equal(result.response.status,200);
  assert.equal(result.saved.status,status);
  assert.equal(result.aiCalls,calls);
  if(calls)assert.equal(result.saved.ai_audit_report.confidenceThreshold,threshold);
});
test('submission without staff configuration applies defaults',async()=>{
  const result=await submit(null);assert.equal(result.saved.status,'Verified');
});
test('submission stops when staff configuration cannot be read',async()=>{
  const result=await submit(null,{fail:true});
  assert.equal(result.response.status,500);assert.equal(result.saved,undefined);assert.equal(result.aiCalls,0);
});
