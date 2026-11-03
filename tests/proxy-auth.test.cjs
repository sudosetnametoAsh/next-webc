const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const {NextRequest,NextResponse} = require('next/server');

function load({user=null,error=null,refresh=false}={}) {
  let signedOut=false,calls=0;
  const exports={};
  const source=ts.transpileModule(fs.readFileSync('src/proxy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,Headers,URL,process,require(name){
    if(name.includes('role-router')) {
      const policy={};
      vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/modules/auth/domain/role-router.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:policy});
      return policy;
    }
    if(name==='next/server')return {NextResponse};
    if(name==='@supabase/ssr')return {createServerClient:(url,key,{cookies})=>({auth:{
      getUser:async()=>{
        calls++;
        if(refresh)cookies.setAll([{name:'sb-test-auth-token',value:'refreshed',options:{path:'/'}}]);
        return {data:{user},error};
      },
      signOut:async()=>{
        signedOut=true;
        cookies.setAll([{name:'sb-test-auth-token',value:'',options:{path:'/',maxAge:0}}]);
      },
    }})};
    throw Error(name);
  }});
  return {proxy:exports.proxy,config:exports.config,get signedOut(){return signedOut;},get calls(){return calls;}};
}
test('clearance and nested clearance pages are matched',()=>{
  assert.ok(load().config.matcher.includes('/clearance/:path*'));
});
test('deleted user redirects clearance and removes stale auth cookie',async()=>{
  const h=load({error:{code:'user_not_found'}});
  const res=await h.proxy(new NextRequest('http://localhost/clearance'));
  assert.equal(res.status,307);
  assert.equal(res.headers.get('location'),'http://localhost/');
  assert.equal(h.signedOut,true);
  assert.equal(res.cookies.get('sb-test-auth-token').maxAge,0);
});
test('unauthenticated API returns 401 with cookie cleanup',async()=>{
  const h=load({error:{code:'refresh_token_not_found'}});
  const res=await h.proxy(new NextRequest('http://localhost/api/student/submissions'));
  assert.equal(res.status,401);
  assert.equal(res.cookies.get('sb-test-auth-token').maxAge,0);
});
test('refreshed cookies reach browser and downstream server components',async()=>{
  const h=load({user:{id:'valid',user_metadata:{custom_claims:{roles:['Client']}}},refresh:true});
  const req=new NextRequest('http://localhost/clearance/tasks');
  const res=await h.proxy(req);
  assert.equal(res.status,200);
  assert.equal(res.cookies.get('sb-test-auth-token').value,'refreshed');
  assert.match(res.headers.get('x-middleware-request-cookie'),/refreshed/);
  assert.equal(res.headers.get('x-middleware-request-x-path'),'/clearance/tasks');
});
test('auth callback remains available without a session check',async()=>{
  const h=load();
  const res=await h.proxy(new NextRequest('http://localhost/api/auth/callback'));
  assert.equal(res.status,200);assert.equal(h.calls,0);
});
test('temporary auth failures do not sign out the user',async()=>{
  const h=load({error:{code:'unexpected_failure'}});
  await h.proxy(new NextRequest('http://localhost/clearance'));
  assert.equal(h.signedOut,false);
});

const roleUser = (...roles) => ({id:'valid',user_metadata:{custom_claims:{roles}}});
for (const [role, own, other, home] of [
  ['Admin','/admin/dashboard','/department/dashboard','/admin'],
  ['Department','/department/clients','/clearance/tasks','/department/dashboard'],
  ['Client','/clearance/tasks','/admin/simulation','/clearance'],
]) {
  test(role+' can access its own page area',async()=>{
    assert.equal((await load({user:roleUser(role)}).proxy(new NextRequest('http://localhost'+own))).status,200);
  });
  test(role+' is redirected away from unauthorized pages',async()=>{
    const res=await load({user:roleUser(role)}).proxy(new NextRequest('http://localhost'+other));
    assert.equal(res.status,307);assert.equal(res.headers.get('location'),'http://localhost'+home);
  });
}
for(const path of ['/api/admin/enrollments/import','/api/admin/simulation','/api/department/clients','/api/dashboard']) {
  test('Client cannot access '+path,async()=>{
    assert.equal((await load({user:roleUser('Client')}).proxy(new NextRequest('http://localhost'+path))).status,403);
  });
  test('anonymous cannot access '+path,async()=>{
    assert.equal((await load().proxy(new NextRequest('http://localhost'+path))).status,401);
  });
}
test('unrecognized and missing roles fail closed',async()=>{
  for(const roles of [[],['Staff'],['Student'],['toString']]) {
    const h=load({user:roleUser(...roles)});
    assert.equal((await h.proxy(new NextRequest('http://localhost/api/admin/stats'))).status,403);
    assert.equal((await h.proxy(new NextRequest('http://localhost/clearance'))).headers.get('location'),'http://localhost/');
  }
});
test('multiple current roles allow their respective areas',async()=>{
  const h=load({user:roleUser('Department','Client')});
  for(const path of ['/department','/clearance'])assert.equal((await h.proxy(new NextRequest('http://localhost'+path))).status,200);
});
test('notifications remain available to all recognized roles',async()=>{
  for(const role of ['Admin','Department','Client']) {
    assert.equal((await load({user:roleUser(role)}).proxy(new NextRequest('http://localhost/api/student/notifications'))).status,200);
  }
});
test('denied page redirects preserve refreshed cookies',async()=>{
  const res=await load({user:roleUser('Client'),refresh:true}).proxy(new NextRequest('http://localhost/admin'));
  assert.equal(res.status,307);assert.equal(res.cookies.get('sb-test-auth-token').value,'refreshed');
});
