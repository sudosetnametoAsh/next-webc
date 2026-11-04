const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
function load(filename, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}

test('role switching fully prefetches once, then refreshes on intent after invalidation', () => {
  const requests = [];
  const router = { prefetch: (href, options) => requests.push({ href, options }) };
  const { usePortalPrefetch } = load('src/hooks/navigation/use-portal-prefetch.ts', {
    react: { useCallback: (fn) => fn, useRef: (current) => ({ current }), useEffect: (fn) => fn() },
    'next/navigation': { useRouter: () => router },
    'next/dist/client/components/router-reducer/router-reducer-types': { PrefetchKind: { FULL: 'full' } },
  });
  const warm = usePortalPrefetch('/clearance');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].href, '/clearance');
  assert.equal(requests[0].options.kind, 'full');
  warm(); warm();
  assert.equal(requests.length, 1);
  requests[0].options.onInvalidate();
  warm();
  assert.equal(requests.length, 2);
  usePortalPrefetch('/department/dashboard', false)();
  assert.equal(requests.length, 2, 'students must not prefetch department pages');
});

function sidebar(portal, props) {
  let closed = 0;
  const warming = [];
  const loaded = load(`src/components/${portal}/sidebar.tsx`, {
    react: { ...React, useEffect() {}, useState: (value) => [value, () => {}] },
    'next/navigation': { useRouter: () => ({}), usePathname: () => `/${portal}` },
    'next/link': { default: 'Link' },
    '@/components/ui/drawer': { Drawer: 'Drawer' },
    '@/hooks/navigation/use-portal-prefetch': { usePortalPrefetch: (...args) => { warming.push(args); return () => {}; } },
    'lucide-react': new Proxy({}, { get: (_, name) => String(name) }),
    '../auth/azure-sign-out-button': { default: 'SignOut' },
    '@/components/auth/azure-sign-out-button': { default: 'SignOut' },
    './department-nav-context': { useDepartmentNav: () => ({ mobileOpen: true, closeMobile: () => closed++ }) },
    './clearance-nav-context': { useClearanceNav: () => ({ mobileOpen: true, closeMobile: () => closed++ }) },
    '@tanstack/react-query': { useQueryClient: () => ({}) },
    '@/hooks/department/fetch-department-clients': {},
    '@/hooks/clearance/use-clearance-data': {},
    '@/components/ui/dropdown-menu': Object.fromEntries(['DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem'].map((name) => [name, name])),
  });
  const links = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'DropdownMenuItem') links.push(node.props.children);
    React.Children.forEach(node.props?.children, walk);
  }
  walk(loaded.default(props));
  return { links, warming, closed: () => closed };
}

test('assigned and unassigned department staff have prefetched clearance links on desktop and mobile', () => {
  for (const department of ['Library', '']) {
    const result = sidebar('department', { department, user_name: 'Officer', user_id: 'staff-1' });
    assert.equal(result.links.length, 2);
    for (const link of result.links) {
      assert.equal(link.type, 'Link');
      assert.equal(link.props.href, '/clearance');
      assert.equal(link.props.prefetch, true);
      link.props.onClick();
    }
    assert.equal(result.closed(), 1);
  }
});

test('staff without a department can switch back, while clients cannot gain staff navigation', () => {
  const staff = sidebar('clearance', { user: { userId: 'staff-1', role: 'Student', canAccessDepartment: true } });
  assert.equal(staff.links.length, 2);
  for (const link of staff.links) {
    assert.equal(link.props.href, '/department/dashboard');
    assert.equal(link.props.prefetch, true);
    link.props.onClick();
  }
  assert.equal(staff.closed(), 1);
  const client = sidebar('clearance', { user: { role: 'Student', canAccessDepartment: false } });
  assert.equal(client.links.length, 0);
  assert.equal(client.warming[0][1], false);
});

test('department page course loading uses the verified identity directly without an internal HTTP request', async () => {
  const requests = [];
  const { fetchCourseServer } = load('src/lib/api/courses.ts', {
    react: { cache: (fn) => fn },
    '@/lib/auth/get-session': { getSession: async () => ({ user_id: 'officer', department: 'Library' }) },
    '@/lib/services/department-courses': { getDepartmentCourses: async (...args) => { requests.push(args); return ['course']; } },
  });
  assert.deepEqual(await fetchCourseServer(), ['course']);
  assert.deepEqual(requests, [['officer', 'Library']]);
});

test('shared course queries retain staff, active-template and department filters', async () => {
  const filters = [];
  const client = { from(table) {
    const query = {
      select() { return query; },
      ilike(column, value) { filters.push([table, column, value]); return query; },
      eq(column, value) { filters.push([table, column, value]); return query; },
      maybeSingle: async () => ({ data: { dept_id: 12 } }),
      then(resolve, reject) { return Promise.resolve({ data: [{ course_id: 1 }] }).then(resolve, reject); },
    };
    return query;
  } };
  const { getDepartmentCourses } = load('src/lib/services/department-courses.ts', {
    '@/lib/db/supabase-server': { createClient: async () => client },
  });
  assert.equal((await getDepartmentCourses('staff-1', ' Library '))[0].course_id, 1);
  assert.deepEqual(filters, [
    ['clearance_departments', 'dept_name', 'Library'],
    ['courses', 'clearance_templates.staff_id', 'staff-1'],
    ['courses', 'clearance_templates.is_active', true],
    ['courses', 'clearance_templates.dept_id', 12],
  ]);
});
