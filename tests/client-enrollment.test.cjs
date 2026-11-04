const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console: { error() {} }, URL, TextEncoder, process: { env: { AZURE_AD_TENANT_ID: 'tenant', AZURE_AD_CLIENT_ID: 'client', SESSION_SECRET: 'test' } },
    require(name) { if (name in deps) return deps[name]; throw new Error(name); }, ...globals });
  return exports;
}
const enrollment = load('src/lib/auth/client-enrollment.ts');
const roleRouter = load('src/modules/auth/domain/role-router.ts');
function client(options = {}) {
  const signedOut = [], reads = [];
  const identity = options.identity === undefined ? { user_id: 'client', students: [{ student_id: 'client' }], staffs: [] } : options.identity;
  const query = { select() { return query; }, eq(key, value) { reads.push([key, value]); return query; }, ilike(key, value) { reads.push([key, value]); return query; },
    maybeSingle: async () => ({ data: identity, error: options.error || null }) };
  const supabase = { from: () => query, auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'auth-id', user_metadata: { custom_claims: { roles: options.roles || ['Client'] } } } }, error: null }),
    signOut: async (arg) => signedOut.push(arg), exchangeCodeForSession: async () => ({ error: null }) } };
  return { supabase, reads, signedOut };
}
for (const [identity, expected] of [[null, false], [{ students: [], staffs: [] }, false], [{ students: [{ student_id: 'a' }] }, true], [{ staffs: { staff_id: 'a' } }, true]]) {
  test('profile detection ' + JSON.stringify(identity), () => assert.equal(enrollment.hasClientProfile(identity), expected));
}
for (const [options, status] of [[{}, 200], [{ identity: null }, 403], [{ identity: { students: [], staffs: [] } }, 403], [{ identity: { staffs: [{ staff_id: 'staff' }] } }, 200], [{ anonymous: true }, 401], [{ roles: ['Admin'], identity: null }, 200], [{ roles: ['Department'], identity: null }, 200], [{ error: { message: 'Down' } }, 503]]) {
  test('enrollment endpoint ' + JSON.stringify(options), async () => {
    const h = client(options);
    const route = load('src/app/api/auth/enrollment/route.ts', {
      '@/lib/auth/client-enrollment': enrollment, '@/modules/auth/domain/role-router': roleRouter,
      '@/lib/db/supabase-server': { createClient: async () => h.supabase },
      'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    });
    const result = await route.GET();
    assert.equal(result.status, status); assert.match(result.headers.get('cache-control'), /no-store/);
    if (status === 403) assert.equal((await result.json()).code, 'NOT_ENROLLED');
    assert.equal(h.signedOut.length, 0, 'verification does not mutate the session');
  });
}
test('OAuth login signs out unenrolled clients and allows re-enrolled staff', async () => {
  for (const identity of [null, { staffs: [{ staff_id: 'new-id' }] }]) {
    const h = client({ identity });
    const { SupabaseAuthRepository } = load('src/modules/auth/infrastructure/supabase-auth-repository.ts', {
      '@/lib/auth/client-enrollment': enrollment, '@/lib/db/supabase-server': { createClient: async () => h.supabase },
      '../application/error': { InvalidAuthTokenError: Error }, '../domain/role-router': roleRouter,
    });
    if (!identity) {
      await assert.rejects(new SupabaseAuthRepository().getUserRole(), enrollment.ClientNotEnrolledError);
      assert.equal(h.signedOut.length, 1);
    } else assert.equal(await new SupabaseAuthRepository().getUserRole(), 'Client');
  }
});
test('OAuth enrollment lookup failure does not claim the client is unenrolled or sign out', async () => {
  const h = client({ error: { message: 'Down' } });
  const { SupabaseAuthRepository } = load('src/modules/auth/infrastructure/supabase-auth-repository.ts', {
    '@/lib/auth/client-enrollment': enrollment, '@/lib/db/supabase-server': { createClient: async () => h.supabase },
    '../application/error': { InvalidAuthTokenError: Error }, '../domain/role-router': roleRouter,
  });
  await assert.rejects(new SupabaseAuthRepository().getUserRole(), /Unable to verify/);
  assert.equal(h.signedOut.length, 0);
});
test('OAuth callback redirects unenrolled clients to the notice', async () => {
  const { GET } = load('src/app/api/auth/callback/route.ts', {
    '@/lib/auth/client-enrollment': enrollment,
    '@/composition/auth/make-auth-callback': { makeAuthCallback: () => ({ execute: async () => { throw new enrollment.ClientNotEnrolledError(); } }) },
    'next/server': { NextResponse: { redirect: (url) => Response.redirect(String(url), 307) } },
  });
  assert.equal((await GET(new Request('https://webc.test/api/auth/callback?code=test'))).headers.get('location'), 'https://webc.test/?notice=not-enrolled');
});
test('legacy token login cannot create a user when enrollment is missing', async () => {
  const h = client({ identity: null }); let signed = false;
  const route = load('src/app/api/session/route.ts', {
    '@/lib/auth/client-enrollment': enrollment, '@/modules/auth/domain/role-router': roleRouter,
    '@/lib/db/supabase-admin': { getSupabaseAdmin: () => h.supabase },
    jose: { createRemoteJWKSet: () => ({}), jwtVerify: async () => ({ payload: { preferred_username: 'client@example.edu', roles: ['Client'], name: 'Client' } }), SignJWT: class { constructor() { signed = true; } } },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  const response = await route.POST({ json: async () => ({ accessToken: 'verified-by-test' }) });
  assert.equal(response.status, 403); assert.equal((await response.json()).code, 'NOT_ENROLLED'); assert.equal(signed, false);
});

function guardHarness() {
  const effects = [], timers = new Map(), intervals = new Map(), events = {}, handlers = {}, redirects = [];
  let response = { status: 200 }, reads = 0, signedOut = 0, cleared = 0, removed = 0, next = 1;
  const channel = { on(_type, filter, callback) { handlers[filter.table] = callback; return channel; }, subscribe(callback) { handlers.status = callback; return channel; } };
  const guard = load('src/components/auth/client-enrollment-guard.tsx', {
    '@/lib/auth/client-enrollment': enrollment,
    react: { useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn(), useState: () => [false, () => {}] },
    'react/jsx-runtime': { jsx: () => null },
    '@tanstack/react-query': { useQueryClient: () => ({ cancelQueries: async () => {}, clear: () => cleared++ }) },
    '@/lib/db/supabase-client': { createClient: () => ({ channel: () => channel, removeChannel: () => removed++, auth: {
      signOut: async () => { signedOut++; }, onAuthStateChange: (fn) => { handlers.auth = fn; return { data: { subscription: { unsubscribe() {} } } }; },
    } }) },
  }, {
    AbortController,
    fetch: async () => { reads++; if (response instanceof Error) throw response; return { ...response, json: async () => ({ code: 'NOT_ENROLLED' }) }; },
    document: { visibilityState: 'visible', addEventListener: (event, fn) => events[event] = fn, removeEventListener: (event) => delete events[event] },
    window: { location: { replace: (url) => redirects.push(url) }, addEventListener: (event, fn) => events[event] = fn, removeEventListener: (event) => delete events[event] },
    setTimeout: (fn, ms) => { const id = next++; timers.set(id, { fn, ms }); return id; }, clearTimeout: (id) => timers.delete(id),
    setInterval: (fn) => { const id = next++; intervals.set(id, fn); return id; }, clearInterval: (id) => intervals.delete(id),
  });
  guard.default({ children: null, userId: 'client' }); const cleanup = effects[0]();
  return { handlers, redirects, events, intervals, timers, cleanup,
    setResponse: (value) => response = value,
    flush: async () => { for (const [id, timer] of [...timers]) if (timer.ms === 150) { timers.delete(id); timer.fn(); } await new Promise(setImmediate); },
    get reads() { return reads; }, get signedOut() { return signedOut; }, get cleared() { return cleared; }, get removed() { return removed; },
  };
}
test('active enrollment removal signs out once, clears private cache, and redirects to notice', async () => {
  const h = guardHarness(); await h.flush(); assert.equal(h.signedOut, 0);
  h.setResponse({ status: 403 }); h.handlers.clearance_records(); h.handlers.notifications(); await h.flush();
  assert.equal(h.signedOut, 1); assert.equal(h.cleared, 1); assert.deepEqual(h.redirects, ['/?notice=not-enrolled']);
  h.cleanup(); assert.equal(h.removed, 1); assert.equal(h.intervals.size, 0);
});
test('missed realtime deletion is detected by recovery polling', async () => {
  const h = guardHarness(); await h.flush(); h.setResponse({ status: 403 });
  for (const tick of h.intervals.values()) tick(); await h.flush(); assert.equal(h.signedOut, 1); h.cleanup();
});
test('temporary errors and unrelated deletions do not sign out an enrolled client', async () => {
  const h = guardHarness();
  for (const response of [new Error('Offline'), { status: 503 }, { status: 200 }]) {
    h.setResponse(response); h.handlers.notifications(); await h.flush();
  }
  assert.equal(h.signedOut, 0); assert.equal(h.redirects.length, 0); h.cleanup();
});
test('guard cleanup removes subscriptions, polling, and pending checks', async () => {
  const h = guardHarness(); h.cleanup(); await h.flush(); assert.equal(h.reads, 0); assert.equal(h.removed, 1); assert.equal(h.intervals.size, 0);
});

test('enrollment notice remains visible without a cached MSAL redirect loop', () => {
  const effects = [], redirects = [];
  let enabled;
  const { default: AuthGate } = load('src/components/auth/auth-gate.tsx', {
    react: { useEffect: (fn) => effects.push(fn) },
    'react/jsx-runtime': { jsx: (_type, props) => props },
    '@/modules/auth/domain/role-router': roleRouter,
    '@azure/msal-react': { useMsal: () => ({ inProgress: 'none' }), useIsAuthenticated: () => true },
    'next/navigation': { useRouter: () => ({ replace: (url) => redirects.push(url) }) },
    '@/hooks/auth/vaildate-token': { useValidateToken: (options) => { enabled = options.enabled; return { data: { role: ['Client'] }, isLoading: false }; } },
  });
  assert.equal(AuthGate({ children: 'notice', enrollmentRequired: true }).children, 'notice');
  for (const effect of effects) effect();
  assert.equal(enabled, false); assert.deepEqual(redirects, []);
});
