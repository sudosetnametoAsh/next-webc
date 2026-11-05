const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
for(const roles of [null,[],['Department'],['Client'], 'NotAdmin',['Admin']]) test('privileged admin reads require verified Admin array: '+JSON.stringify(roles),async()=>{
 let privileged=0;const exports={};const admin={marker:true};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/services/admin-read-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Array,require(name){
 if(name.includes('supabase-server'))return{createClient:async()=>({auth:{getUser:async()=>({data:{user:roles===null?null:{user_metadata:{custom_claims:{roles}}}}})}})};
 if(name.includes('supabase-admin'))return{getSupabaseAdmin:()=>{privileged++;return admin;}};
 throw Error(name);
 }});
 const result=await exports.adminReadClient();const allowed=Array.isArray(roles)&&roles.includes('Admin');
 assert.equal(result,allowed?admin:null);assert.equal(privileged,allowed?1:0);
});
