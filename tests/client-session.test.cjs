const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(options = {}) {
  const user = { id: 'auth-id', email: 'client@example.edu', user_metadata: { custom_claims: { roles: options.roles || ['Client'] } } };
  const query = { select() { return query; }, eq() { return query; }, ilike() { return query; }, limit() { return query; },
    maybeSingle: async () => ({ data: options.currentId ? { user_id: options.currentId } : null, error: options.error || null }) };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/auth/get-session.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, console: { error() {} }, require(name) {
    if (name.includes('client-enrollment')) {
      const module = {};
      vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/auth/client-enrollment.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: module });
      return module;
    }
      if (name === 'react') return { cache: (fn) => fn };
      if (name === 'jwt-decode') return { jwtDecode: () => ({ user_id: 'old-deleted-id', department: 'Clinic' }) };
      if (name.includes('supabase-server')) return { createClient: async () => ({ from: () => query, auth: {
        getUser: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { access_token: 'stale-token' } } }),
      } }) };
      throw new Error(name);
    },
  });
  return exports.getSession;
}
test('removed client cannot resolve a session from an old JWT user ID', async () => {
  await assert.rejects(load()(), /not enrolled/);
});
test('re-enrolled client uses the new identity instead of a stale JWT ID', async () => {
  assert.equal((await load({ currentId: 'new-staff-id' })()).user_id, 'new-staff-id');
});
test('database verification failures never fall back to stale JWT IDs', async () => {
  await assert.rejects(load({ error: { message: 'Unavailable' } })(), /Unable to verify enrollment/);
});
test('administrators without client enrollment retain their existing session behavior', async () => {
  assert.equal((await load({ roles: ['Admin'] })()).user_id, 'auth-id');
});

test('department portal access comes from verified roles rather than a department label', async () => {
  assert.equal((await load({ currentId: 'officer', roles: ['Department'] })()).isDepartmentStaff, true);
  assert.equal((await load({ currentId: 'client', roles: ['Client'] })()).isDepartmentStaff, false);
});
