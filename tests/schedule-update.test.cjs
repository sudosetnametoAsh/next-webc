const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(ok = true) {
  let options;
  const refreshes = [], invalidations = [], messages = [], requests = [];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/department/update-schedule.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports,
    fetch: async (url, init) => {
      requests.push({ url, init });
      return Response.json(ok ? { success: true } : { error: 'Save failed' }, { status: ok ? 200 : 500 });
    },
    require(name) {
      if (name === 'sonner') return { toast: { success: (m) => messages.push(m), error: (m) => messages.push(m) } };
      if (name === 'next/navigation') return { useRouter: () => ({ refresh: () => refreshes.push(true) }) };
      if (name === '@tanstack/react-query') return {
        useQueryClient: () => ({ invalidateQueries: (value) => invalidations.push(value.queryKey) }),
        useMutation: (value) => { options = value; return value; },
      };
      throw Error('Unexpected dependency: ' + name);
    },
  });
  exports.useUpdateSchedule();
  return { options, refreshes, invalidations, messages, requests };
}
for (const [payload, message] of [
  [{ weekly_schedule: { mon: { active: true, time_in: '09:00', time_out: '18:00' } } }, 'Office hours saved'],
  [{ action: 'early_out', early_out_date: '2026-11-05' }, 'Early out activated'],
  [{ action: 'resume_schedule' }, 'Office schedule resumed'],
]) {
  test(`successful ${payload.action || 'weekly save'} refreshes server-rendered calendar data`, async () => {
    const h = harness();
    const result = await h.options.mutationFn(payload);
    h.options.onSuccess(result, payload);
    assert.equal(h.refreshes.length, 1, 'router cache must refresh alongside the unused legacy query');
    assert.equal(h.invalidations[0][0], 'staff-schedule');
    assert.equal(h.messages[0], message);
    assert.equal(h.requests[0].url, '/api/department/availability');
    assert.deepEqual(JSON.parse(h.requests[0].init.body), payload);
  });
}
test('failed schedule saves expose the error and never refresh as if saved', async () => {
  const h = harness(false);
  await assert.rejects(h.options.mutationFn({ action: 'resume_schedule' }), /Save failed/);
  assert.equal(h.refreshes.length, 0);
  assert.equal(h.messages.length, 0);
  h.options.onError(new Error('Save failed'));
  assert.equal(h.messages[0], 'Save failed');
});

function calendarCacheHarness(read) {
  const exports = {};
  class NotFoundError extends Error {}
  const query = { select() { return this; }, eq() { return this; }, ilike() { return this; }, limit() { return this; }, maybeSingle: async () => ({ data: null }) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/services/department-cache.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, console, require(name) {
    if (name === '@/composition/staff/make-get-schedule') return { makeGetSchedule: () => ({ execute: read }) };
    if (name === '@/lib/db/supabase-server') return { createClient: async () => ({ from: () => query }) };
    if (name === '@/modules/staff/application/error') return { NotFoundError };
    if (name.startsWith('@/composition/')) return new Proxy({}, { get: () => () => ({ execute: async () => [] }) });
    throw Error('Unexpected dependency: ' + name);
  } });
  return exports;
}
test('calendar reload reads saved weekdays even when the API runs in another server bundle', async () => {
  let persisted = { mon: { active: true }, tue: { active: true }, wed: { active: true } };
  const read = async () => ({ weekly_schedule: persisted, early_out_date: null });
  const pageBundle = calendarCacheHarness(read);
  const apiBundle = calendarCacheHarness(read);
  assert.equal((await pageBundle.fetchDepartmentSchedule('officer')).weeklySchedule.thu, undefined);
  persisted = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri'].map((key) => [key, { active: true }]));
  apiBundle.invalidateServerDepartmentCache('officer');
  const reloaded = await pageBundle.fetchDepartmentSchedule('officer');
  assert.equal(reloaded.weeklySchedule.thu.active, true);
  assert.equal(reloaded.weeklySchedule.fri.active, true);
});
test('calendar reload surfaces database failures instead of presenting a fabricated schedule', async () => {
  const page = calendarCacheHarness(async () => { throw new Error('Database unavailable'); });
  await assert.rejects(page.fetchDepartmentSchedule('officer'), /Database unavailable/);
});

test('activating a mixed selection saves all five weekdays instead of deactivating them', () => {
  const React = require('react');
  const state = [];
  let cursor = 0, payload;
  const exports = {};
  const schedule = Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map((key) => [key, {
    active: ['mon','tue','wed'].includes(key), time_in: '08:00', time_out: '17:00',
  }]));
  const clock = { dayIndex: 1, dayKey: 'mon', date: '2026-11-09', minutes: 540 };
  const Icon = () => null;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/department/calendar/department-calendar-client.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Date, require(name) {
    if (name === 'react') return { ...React,
      useMemo: (fn) => fn(),
      useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
    };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'lucide-react' || name === '@/components/ui/dialog') return new Proxy({}, { get: () => Icon });
    if (name === '@/lib/department-icons') return { getDepartmentIcon: () => Icon };
    if (name === '@/hooks/department/update-schedule') return { useUpdateSchedule: () => ({ mutate: (value) => { payload = value; }, isPending: false }) };
    if (name === '@/lib/weekly-schedule') return { campusClock: () => clock, officeStatus: () => ({ schedule: 'Open now', isOpen: true }) };
    throw Error('Unexpected dependency: ' + name);
  } });
  const render = () => { cursor = 0; return exports.default({ initialWeeklySchedule: schedule, userId: 'officer', userName: 'Officer', departmentName: 'Clinic', iconName: 'Building2', floor: '', room: '' }); };
  const nodes = (tree) => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
  const text = (tree) => Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(tree.props?.children) : tree == null ? '' : String(tree);
  let tree = render();
  for (const day of ['Tue','Wed','Thu','Fri']) {
    nodes(tree).find((node) => node.type === 'button' && nodes(node).some((child) => child.type === 'span' && child.props.children === day)).props.onClick();
    tree = render();
  }
  const activate = nodes(tree).find((node) => node.props?.['aria-label'] === 'Activate selected days');
  assert.match(text(activate), /Mixed/);
  activate.props.onClick();
  tree = render();
  nodes(tree).find((node) => node.type === 'button' && text(node).includes('Save Weekly Schedule')).props.onClick();
  for (const day of ['mon','tue','wed','thu','fri']) assert.equal(payload.weekly_schedule[day].active, true, day);
  assert.equal(payload.weekly_schedule.sat.active, false);
  assert.equal(payload.weekly_schedule.sun.active, false);
});
