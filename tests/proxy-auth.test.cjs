const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const {NextRequest,NextResponse} = require('next/server');

function load({user=null,error=null,refresh=false,enrolled=true,identityError=null,access={is_open:true,client_enrolled:true,officer_enrolled:true},periodError=null}={}) {
  let signedOut=false,calls=0;
  const exports={};
  const source=ts.transpileModule(fs.readFileSync('src/proxy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,Headers,URL,process,require(name){
    if (name.includes('academic-periods/access')) { const module={}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/academic-periods/access.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:module}); return module; }
    if (name.includes('client-enrollment')) {
      const module = {};
      vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/auth/client-enrollment.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: module });
      return module;
    }
    if(name.includes('role-router')) {
      const policy={};
      vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/modules/auth/domain/role-router.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:policy});
      return policy;
    }
    if(name==='next/server')return {NextResponse};
    if(name==='@supabase/ssr')return {createServerClient:(url,key,{cookies})=>({rpc:async()=>({data:access,error:periodError}),from:()=>{const query={select(){return query;},eq(){return query;},maybeSingle:async()=>({data:enrolled?{user_id:'client',students:[{student_id:'client'}],staffs:[]}:null,error:identityError})};return query;},auth:{
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
  ['Department','/department/clients','/admin/clients','/department/dashboard'],
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
test('Department can access personal clearance pages and APIs without the Client role',async()=>{
  const h=load({user:roleUser('Department')});
  for(const path of ['/clearance','/clearance/tasks','/clearance/schedules','/api/student/clearance-data','/api/student/submissions','/api/student/appeal']) {
    assert.equal((await h.proxy(new NextRequest('http://localhost'+path))).status,200,path);
  }
});
test('Department cannot access admin APIs through personal clearance permissions',async()=>{
  const h=load({user:roleUser('Department')});
  for(const path of ['/api/admin/clients','/api/admin/enrollments/import','/api/admin/simulation']) {
    assert.equal((await h.proxy(new NextRequest('http://localhost'+path))).status,403,path);
  }
});
for(const path of ['/api/admin/enrollments/import','/api/admin/simulation','/api/department/clients','/api/department/clients/progress','/api/department/clients/tasks/status','/api/dashboard']) {
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

test('removed client cannot reuse a valid Auth session or stale role claim', async () => {
  const h = load({ user: roleUser('Client'), enrolled: false });
  const response = await h.proxy(new NextRequest('http://localhost/clearance/tasks'));
  assert.equal(response.status, 307); assert.equal(h.signedOut, true);
});
test('removed client API is denied while the Auth account still exists', async () => {
  const h = load({ user: roleUser('Client'), enrolled: false });
  assert.equal((await h.proxy(new NextRequest('http://localhost/api/student/submissions'))).status, 403);
});
test('enrollment lookup failures deny access without signing out', async () => {
  const h = load({ user: roleUser('Client'), identityError: { message: 'Unavailable' } });
  assert.equal((await h.proxy(new NextRequest('http://localhost/clearance'))).status, 503);
  assert.equal(h.signedOut, false);
});

for (const roles of [['Department'], ['Department','Client']]) {
  for (const path of ['/department','/department/calendar','/department/clients','/clearance/tasks']) test('removed ' + roles.join('+') + ' redirects from ' + path, async () => {
    const h = load({ user: roleUser(...roles), enrolled: false });
    const response = await h.proxy(new NextRequest('http://localhost' + path));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'http://localhost/?notice=not-enrolled');
    assert.equal(h.signedOut, true);
  });
  for (const path of ['/api/department/availability','/api/department/clients','/api/dashboard','/api/student/notifications']) test('removed ' + roles.join('+') + ' loses API access ' + path, async () => {
    const h = load({ user: roleUser(...roles), enrolled: false });
    const response = await h.proxy(new NextRequest('http://localhost' + path));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'NOT_ENROLLED');
    assert.equal(h.signedOut, true);
  });
}
test('department enrollment outages do not revoke a valid session', async () => {
  const h = load({ user: roleUser('Department'), identityError: { message: 'Unavailable' } });
  assert.equal((await h.proxy(new NextRequest('http://localhost/department/dashboard'))).status, 503);
  assert.equal(h.signedOut, false);
});
test('Admin+Department retains enrollment exemption', async () => {
  const h = load({ user: roleUser('Admin','Department'), enrolled: false });
  assert.equal((await h.proxy(new NextRequest('http://localhost/department/dashboard'))).status, 200);
  assert.equal(h.signedOut, false);
});


test('preparing term blocks clients but permits selected department officers', async () => {
  const access={is_open:false,client_enrolled:true,officer_enrolled:true};
  const client=load({user:roleUser('Client'),access});
  const page=await client.proxy(new NextRequest('http://localhost/clearance'));
  assert.equal(page.headers.get('location'),'http://localhost/clearance-unavailable');
  const api=await client.proxy(new NextRequest('http://localhost/api/student/submissions'));
  assert.equal(api.status,403); assert.equal((await api.json()).code,'PERIOD_NOT_OPEN');
  assert.equal(client.signedOut,false);
  const officer=load({user:roleUser('Department'),access});
  assert.equal((await officer.proxy(new NextRequest('http://localhost/api/department/clients/sign'))).status,200);
  assert.equal((await officer.proxy(new NextRequest('http://localhost/api/student/submissions'))).status,403);
});
test('retained accounts without period participation cannot use either portal', async () => {
  const h=load({user:roleUser('Department','Client'),access:{is_open:true,client_enrolled:false,officer_enrolled:false}});
  for(const path of ['/api/department/clients/sign','/api/student/clearance-data']) {
    const response=await h.proxy(new NextRequest('http://localhost'+path)); assert.equal(response.status,403); assert.equal((await response.json()).code,'NOT_PARTICIPATING');
  }
  assert.equal(h.signedOut,false);
});
test('period-access outages fail closed without revoking the session', async()=>{
 const h=load({user:roleUser('Client'),periodError:{message:'Database unavailable'}});
 assert.equal((await h.proxy(new NextRequest('http://localhost/api/student/submissions'))).status,503);assert.equal(h.signedOut,false);
});
