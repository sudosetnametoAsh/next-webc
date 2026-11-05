const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,deps,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,queueMicrotask,require:n=>{if(!(n in deps))throw Error(n);return deps[n];},...globals});return exports;}
const claims=(extra={})=>({sub:'user',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,...extra});
const token=data=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify(data)).toString('base64url')+'.test';
function clientHarness(options={}){
 let session=options.session??null,listener;const requests=[],auth=[],configured=[];let disconnected=0;
 const valid=token(claims());const c={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{configured.push(fn);listener=fn;}},realtime:{setAuth:async t=>auth.push(t),disconnect:()=>disconnected++},getChannels:()=>options.channels?[{}]:[]};
 const h=load('src/lib/db/authenticated-realtime.ts',{'jwt-decode':require('jwt-decode')},{fetch:async(url,init)=>{requests.push({url,init});return options.fetch?options.fetch():{ok:true,json:async()=>({accessToken:valid})};}});
 h.configureAuthenticatedRealtime(c);return{c,valid,requests,auth,configured,get disconnected(){return disconnected;},configure:()=>h.configureAuthenticatedRealtime(c),event:(name,s)=>{session=s;listener(name,s);}};
}
test('joins/reconnects use the authenticated browser session without an extra request',async()=>{
 const access=token(claims());const h=clientHarness({session:{access_token:access}});assert.equal(await h.c.realtime.accessToken(),access);assert.equal(h.requests.length,0);h.configure();assert.equal(h.configured.length,1);
});
test('missing browser session bootstraps from same-origin verified cookies and coalesces joins',async()=>{
 const h=clientHarness();const [a,b]=await Promise.all([h.c.realtime.accessToken(),h.c.realtime.accessToken()]);assert.equal(a,h.valid);assert.equal(b,h.valid);assert.equal(h.requests.length,1);assert.equal(h.requests[0].init.credentials,'same-origin');assert.equal(h.requests[0].init.cache,'no-store');
});
for(const accessToken of [token(claims({role:'anon',sub:undefined})),token(claims({exp:1})),'invalid'])test('does not silently use an anonymous/expired token: '+accessToken.slice(-8),async()=>{
 const h=clientHarness({fetch:async()=>({ok:true,json:async()=>({accessToken})})});await assert.rejects(h.c.realtime.accessToken(),/Invalid realtime session/);
});
test('refresh updates channel authentication and signout discards pending bootstrap results',async()=>{
 let finish;const gate=new Promise(r=>finish=r);const h=clientHarness({channels:true,fetch:()=>gate});const pending=h.c.realtime.accessToken();await new Promise(setImmediate);
 h.event('SIGNED_OUT',null);finish({ok:true,json:async()=>({accessToken:h.valid})});assert.equal(await pending,null);assert.equal(h.disconnected,1);
 const fresh=token(claims({sub:'new-user'}));h.event('SIGNED_IN',{access_token:fresh});await new Promise(setImmediate);assert.equal(h.auth.at(-1),fresh);assert.equal(await h.c.realtime.accessToken(),fresh);
});
for(const options of [{anonymous:true},{session:null},{claims:claims({sub:'different-user'})},{claims:claims({role:'anon'})},{claims:claims({exp:1})},{}])test('realtime bootstrap verifies token ownership and disables caching: '+JSON.stringify(options),async()=>{
 const access=token(options.claims??claims());const session='session'in options?options.session:{access_token:access};let reads=0;
 const route=load('src/app/api/auth/realtime-session/route.ts',{
 'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},'jose':{decodeJwt:t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString())},
 '@/lib/db/supabase-server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:options.anonymous?null:{id:'user'}},error:null}),getSession:async()=>{reads++;return{data:{session},error:null};}}})},
 });
 const response=await route.GET();const ok=!options.anonymous&&session&&(!options.claims||options.claims.sub==='user'&&options.claims.role==='authenticated'&&options.claims.exp>Date.now()/1000);
 assert.equal(response.status,ok?200:401);assert.match(response.headers.get('cache-control'),/no-store/);const body=await response.json();if(ok)assert.equal(body.accessToken,access);else assert.equal(body.accessToken,undefined);if(options.anonymous)assert.equal(reads,0);
});
