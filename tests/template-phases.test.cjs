const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, console, require(name) {
    if (name in mocks) return mocks[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}

function organizer(initial = [0, 0]) {
  const states = [];
  let cursor = 0, tree, empty;
  let assignments = initial.map((tier, index) => ({ dept_id: index + 1, dept_name: `Office ${index + 1}`, tier, staff_id: `staff${index}`, staff_name: `Officer ${index}` }));
  const jsx = (type, props) => ({ type, props: props || {} });
  const Component = load('src/components/admin/tier-bucket-organizer.tsx', {
    react: { useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    }, useEffect(effect) { effect(); } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': new Proxy({}, { get: (_, key) => key }),
    '@/lib/department-icons': { getDepartmentIcon: () => 'DepartmentIcon' },
  }).default;
  function render() {
    cursor = 0;
    tree = Component({ assignments, onAssignmentsChange: value => { assignments = value; }, onSelectDepartmentForStaff() {}, onEmptyPhasesChange: value => { empty = value; } });
  }
  function nodes(value) {
    if (arguments.length === 0) value = tree;
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap(nodes);
    return [value, ...nodes(value.props?.children)];
  }
  function text(node) {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(text).join('');
    return node?.props ? text(node.props.children) : '';
  }
  function click(predicate) {
    const node = nodes().find(n => n.type === 'button' && predicate(n));
    assert.ok(node, 'button exists');
    assert.ok(!node.props.disabled, 'button is enabled');
    node.props.onClick();
    render();
  }
  render();
  return { click, render, nodes, text, get empty() { return empty; }, get assignments() { return assignments; } };
}

test('new template starts with one empty phase; placing all departments makes it valid', () => {
  const h = organizer();
  assert.equal(h.empty, true);
  assert.equal(h.nodes().filter(n => n.type === 'button' && n.props['aria-pressed'] !== undefined).length, 1);
  for (let id = 1; id <= 2; id++) h.click(n => n.props.draggable && h.text(n).includes(`Office ${id}`));
  assert.equal(h.empty, false);
  assert.ok(h.assignments.every(a => a.tier === 1));
  assert.ok(h.nodes().some(n => h.text(n) === 'All departments assigned'));
  assert.ok(!h.nodes().some(n => n.type === 'p' && h.text(n).includes('Choose a department')));
});

test('adding an empty trailing phase invalidates the template; moving a department fills it', () => {
  const h = organizer([1, 1]);
  assert.equal(h.empty, false);
  h.click(n => h.text(n).includes('Add phase'));
  assert.equal(h.empty, true);
  h.click(n => n.props['aria-label'] === 'Move Office 1 to next phase');
  assert.equal(h.empty, false);
  assert.equal(h.assignments[0].tier, 2);
  h.click(n => n.props['aria-label'] === 'Move Office 1 to previous phase');
  assert.equal(h.empty, true);
});

test('deleting an occupied phase returns its departments and renumbers later phases', () => {
  const h = organizer([1, 2, 3]);
  h.click(n => n.props['aria-label'] === 'Delete phase 2');
  assert.deepEqual(Array.from(h.assignments, a => a.tier), [1, 0, 2]);
  assert.equal(h.empty, false);
  assert.ok(h.assignments.every((a, i) => a.staff_id === `staff${i}`));
});

test('deleting the only phase keeps an empty Phase 1 and blocks saving', () => {
  const h = organizer([1]);
  h.click(n => n.props['aria-label'] === 'Delete phase 1');
  assert.equal(h.empty, true);
  assert.equal(h.assignments[0].tier, 0);
});

test('dragging a department into an empty phase updates validation', () => {
  const h = organizer([1, 1]);
  h.click(n => h.text(n).includes('Add phase'));
  const phase = h.nodes().find(n => n.type === 'div' && n.props.onDrop && h.text(n).startsWith('Phase 2'));
  assert.ok(phase);
  phase.props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => '1' } });
  h.render();
  assert.equal(h.assignments[0].tier, 2);
  assert.equal(h.empty, false);
});

for (const kind of ['course', 'staff']) test(`${kind} template API rejects duplicate staff before any database mutation`, async () => {
  const exports = load(`src/app/api/admin/${kind}-templates/route.ts`, {
    '@/lib/db/supabase-server': { createClient: async () => ({ from() { throw new Error('Database must not be accessed'); } }) },
    '@/lib/db/supabase-admin': {},
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/services/admin-cache': {}, '@/lib/services/department-cache': {}, '@/lib/services/clearance-cache': {},
    '@/lib/services/student-completion': {}, '@/lib/services/template-deletion': {},
  });
  const response = await exports.POST({ json: async () => ({ courses: [1], assignments: [
    { dept_id: 1, staff_id: 'same', tier: 1 }, { dept_id: 2, staff_id: 'same', tier: 2 },
  ] }) });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /one department/);
});

function modal() {
  const states = [], dependencies = [], effects = [], saves = [], errors = [];
  let cursor = 0, tree;
  const jsx = (type, props) => ({ type, props: props || {} });
  const assignments = [1, 2].map(id => ({ dept_id: id, dept_name: `Office ${id}`, staff_id: `staff${id}`, staff_name: `Officer ${id}`, tier: 1 }));
  const props = { open: true, mode: 'student', courses: [{ course_id: 1, course_name: 'Course' }],
    departments: assignments, editData: { courseId: 1, name: 'Course', departments: assignments },
    onOpenChange() {}, toastError: message => errors.push(message), toastSuccess() {}, existingCourseIds: [1] };
  const Component = load('src/components/admin/create-template-modal.tsx', {
    react: { useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    }, useEffect(effect, deps) {
      const index = cursor++;
      if (!dependencies[index] || deps.some((v, i) => v !== dependencies[index][i])) effects.push(effect);
      dependencies[index] = deps;
    }, useMemo: fn => fn() },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': new Proxy({}, { get: (_, key) => key }),
    '@/components/ui/dialog': { Dialog: 'Dialog', DialogContent: 'DialogContent', DialogHeader: 'DialogHeader', DialogTitle: 'DialogTitle', DialogDescription: 'DialogDescription' },
    '@/components/admin/confirmation-modal': { default: 'ConfirmationModal' },
    '@/hooks/admin/fetch-staff': { useFetchStaff: () => ({ data: [] }) },
    '@/hooks/admin/course-templates': { useCreateTemplates: () => ({ isPending: false, mutateAsync: async body => { saves.push(body); } }) },
    '@/hooks/admin/staff-templates': { useCreateStaffTemplates: () => ({ isPending: false }) },
    '@/utils/formatters': {}, '@/lib/department-icons': {}, './tier-bucket-organizer': { default: 'Organizer' },
  }).default;
  function render() {
    cursor = 0;
    tree = Component(props);
    while (effects.length) effects.shift()();
  }
  function nodes(value) {
    if (arguments.length === 0) value = tree;
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap(v => nodes(v));
    return [value, ...nodes(value.props?.children)];
  }
  render(); render();
  const next = nodes().find(n => n.type === 'button' && n.props.children?.some?.(child => child?.props?.children === 'Next: Configure Phases'));
  assert.ok(next && !next.props.disabled);
  next.props.onClick(); render();
  return { render, nodes, saves, errors, organizer: () => nodes().find(n => n.type === 'Organizer') };
}

test('phase-only edits preserve staff assignments and enable saving after all phases are populated', () => {
  const h = modal();
  const organizer = h.organizer();
  assert.ok(organizer);
  assert.deepEqual(Array.from(organizer.props.assignments, a => a.staff_id), ['staff1', 'staff2']);
  organizer.props.onAssignmentsChange(organizer.props.assignments.map((a, i) => ({ ...a, tier: i + 1 })));
  organizer.props.onEmptyPhasesChange(false);
  h.render();
  const save = h.nodes().find(n => n.type === 'button' && n.props.children?.some?.(c => c?.props?.children === 'Save Changes'));
  assert.ok(save);
  assert.equal(save.props.disabled, false);
  h.organizer().props.onEmptyPhasesChange(true);
  h.render();
  const blockedSave = h.nodes().find(n => n.type === 'button' && n.props.children?.some?.(c => c?.props?.children === 'Save Changes'));
  assert.equal(blockedSave.props.disabled, true);
});

test('confirmation handler blocks saving an empty phase even if invoked directly', async () => {
  const h = modal();
  const confirmation = h.nodes().find(n => n.type === 'ConfirmationModal');
  await confirmation.props.onConfirm();
  assert.equal(h.saves.length, 0);
  assert.match(h.errors[0], /every phase/);
});

test('attempting to reuse another department staff keeps the previous assignment', () => {
  const h = modal();
  h.organizer().props.onSelectDepartmentForStaff(2); h.render();
  const picker = h.nodes().find(n => typeof n.type === 'function' && n.type.name === 'StaffSelectionStep');
  assert.ok(picker);
  assert.deepEqual(Array.from(picker.props.assignedStaffIds), ['staff1']);
  picker.props.onSelect('staff1', 'Officer 1'); h.render();
  assert.match(h.errors[0], /already assigned/);
  assert.equal(h.organizer().props.assignments[1].staff_id, 'staff2');
});
