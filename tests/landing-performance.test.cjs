const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const roleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/modules/auth/domain/role-router.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: roleExports });

function gate({ authenticated = false, inProgress = 'startup', data, enrollmentRequired = false } = {}) {
  const redirects = [], validations = [];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/auth/auth-gate.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react') return { useEffect: (fn) => fn() };
    if (name === 'react/jsx-runtime') return require(name);
    if (name.includes('role-router')) return roleExports;
    if (name === '@azure/msal-react') return { useMsal: () => ({ inProgress }), useIsAuthenticated: () => authenticated };
    if (name === 'next/navigation') return { useRouter: () => ({ replace: (path) => redirects.push(path) }) };
    if (name.includes('vaildate-token')) return { useValidateToken: (options) => { validations.push(options); return { data, isLoading: true }; } };
    throw new Error(name);
  } });
  const result = exports.default({ children: 'public login', enrollmentRequired });
  return { result, redirects, validations };
}

test('the public login renders during startup, authentication and validation', () => {
  for (const options of [{}, { inProgress: 'none' }, { authenticated: true }, { authenticated: true, inProgress: 'none' }]) {
    const { result, redirects } = gate(options);
    assert.equal(result.props.children, 'public login');
    assert.deepEqual(redirects, []);
  }
});

test('verified sessions retain role redirects and enrollment notices suppress validation', () => {
  for (const [role, target] of [['Department', '/department/dashboard'], ['Client', '/clearance'], ['Admin', '/admin']]) {
    const result = gate({ authenticated: true, inProgress: 'none', data: { role: [role] } });
    assert.deepEqual(result.redirects, [target]);
    assert.equal(result.validations[0].enabled, true);
  }
  const enrollment = gate({ authenticated: true, inProgress: 'none', enrollmentRequired: true, data: { role: ['Client'] } });
  assert.deepEqual(enrollment.redirects, []);
  assert.equal(enrollment.validations[0].enabled, false);
  assert.equal(enrollment.result.props.children, 'public login');
});

test('login backgrounds have bounded transfer sizes and preserve the original aspect ratio', async () => {
  const original = await sharp('public/sti-login-enhanced.png').metadata();
  for (const [filename, width, maxBytes] of [['sti-login-desktop.webp', 2560, 200000], ['sti-login-mobile.webp', 1280, 100000]]) {
    const pathname = 'public/' + filename;
    assert.ok(fs.statSync(pathname).size < maxBytes, filename + ' exceeds its transfer budget');
    const image = await sharp(pathname).metadata();
    assert.equal(image.format, 'webp');
    assert.equal(image.width, width);
    assert.equal(image.width / image.height, original.width / original.height);
  }
  assert.doesNotMatch(fs.readFileSync('src/styles/sti-login.module.css', 'utf8'), /sti-login-enhanced\.png/);
});
