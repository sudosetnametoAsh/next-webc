const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Exercise real components with query results supplied at the network boundary.
function load(file, dependencies = {}, cache = new Map()) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  const { outputText } = ts.transpileModule(readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports, console: { ...console, error() {} }, process, setTimeout, clearTimeout,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
      const resolved = ['', '.tsx', '.ts', '/index.tsx', '/index.ts'].map(ext => base + ext).find(existsSync);
      if (!resolved) throw new Error(`Cannot resolve ${name} from ${file}`);
      return load(resolved, dependencies, cache);
    },
  }, { filename: absolute });
  return exports;
}

function render(file, dependencies = {}, props = {}) {
  return renderToStaticMarkup(React.createElement(load(file, dependencies).default, props));
}
const empty = { data: [], isLoading: false, error: null };
const pending = { data: undefined, isLoading: true, error: null };
const queryDependencies = (result) => ({
  '@/hooks/admin/course-templates': { useFetchCourseTemplates: () => result, useDeleteTemplates: () => ({}) },
  '@/hooks/admin/staff-templates': { useFetchStaffTemplates: () => result, useDeleteStaffTemplates: () => ({}) },
  '@/hooks/admin/student-templates': { useFetchStudentTemplates: () => result },
  '@/hooks/admin/fetch-stats': { useFetchAdminStats: () => ({ ...empty, data: undefined }) },
});
const templateProps = { searchQuery: '', toastSuccess() {}, toastError() {} };

for (const [name, file] of [
  ['course templates', 'src/components/admin/course-templates-list.tsx'],
  ['staff templates', 'src/components/admin/staff-templates-list.tsx'],
  ['student registry', 'src/app/(pages)/admin/students/page.tsx'],
]) {
  test(`${name} announces pending data without presenting an empty result`, () => {
    const html = render(file, queryDependencies(pending), templateProps);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /animate-pulse/);
    assert.doesNotMatch(html, /No clearance templates found|No students match/);
  });
  test(`${name} distinguishes failed requests from empty data`, () => {
    const html = render(file, queryDependencies({ ...empty, error: new Error('offline') }), templateProps);
    assert.match(html, /role="alert"/);
    assert.doesNotMatch(html, /No clearance templates found|No students match/);
  });
}

test('student registry shows its empty state after a successful empty response', () => {
  const html = render('src/app/(pages)/admin/students/page.tsx', queryDependencies(empty));
  assert.match(html, /No students match/);
  assert.doesNotMatch(html, /aria-busy="true"/);
});

test('reports expose an accessible skeleton while waiting and preserve their error state', () => {
  for (const [result, role] of [[pending, 'status'], [{ ...empty, error: new Error('offline') }, 'alert']]) {
    const html = render('src/app/(pages)/admin/reports/page.tsx', {
      '@/hooks/admin/reports': { useFetchReportSource: () => result },
      '@/components/admin/reports/reports-view': { ReportsView: () => null },
    });
    assert.match(html, new RegExp(`role="${role}"`));
    if (role === 'status') assert.match(html, /animate-pulse/);
  }
});

for (const failed of [true, false]) {
  test(`course deletion gives ${failed ? 'only failure' : 'only success'} feedback`, async () => {
    let modal;
    const messages = [];
    const deps = queryDependencies({ ...empty, data: [{ course_id: 1, course_name: 'BSCS', completion_rate: 0, students_enrolled: 0, departments: [] }] });
    deps['@/hooks/admin/course-templates'].useDeleteTemplates = () => ({ mutateAsync: async () => { if (failed) throw new Error('offline'); } });
    deps['./confirmation-modal'] = props => { modal = props; return null; };
    render('src/components/admin/course-templates-list.tsx', deps, {
      ...templateProps,
      toastSuccess: () => messages.push('success'),
      toastError: () => messages.push('error'),
    });
    await modal.onConfirm();
    assert.deepEqual(messages, [failed ? 'error' : 'success']);
  });
}

for (const file of ['src/app/(pages)/student/loading.tsx', 'src/app/(pages)/department/dashboard/loading.tsx']) {
  test(`${file} provides a labelled route skeleton`, () => {
    assert.ok(existsSync(file), 'Route loading UI is missing');
    const html = render(file);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /animate-pulse/);
  });
}
