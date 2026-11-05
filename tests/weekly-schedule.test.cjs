const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, console, Intl, Date, require(name) {
    if (name in deps) return deps[name];
    throw new Error('Unexpected dependency: ' + name);
  } });
  return exports;
}
const helpers = load('src/lib/weekly-schedule.ts');
const monday = { mon: { active: true, time_in: '08:00', time_out: '17:00' } };
const at = (time) => new Date('2026-11-02T' + time + '+08:00');
test('weekly schedule accepts active and closed days and normalizes seconds', () => {
  const schedule = helpers.validateWeeklySchedule({ mon: { active: true, time_in: '08:00:00', time_out: '17:00:00' }, tue: { active: false } });
  assert.equal(schedule.mon.time_in, '08:00');
  assert.equal(schedule.tue.active, false);
  assert.equal(schedule.sat.active, false);
  assert.equal(Object.keys(schedule).length, 7);
});
for (const value of [null, {}, [], { invalid: {} }, { mon: { active: 'true' } },
  { mon: { active: true, time_in: '25:00', time_out: '26:00' } },
  { mon: { active: true, time_in: '09:00', time_out: '08:00' } },
  { mon: { active: true, time_in: '08:00', time_out: '08:00' } }]) {
  test('rejects invalid weekly schedule ' + JSON.stringify(value), () => assert.throws(() => helpers.validateWeeklySchedule(value)));
}
test('campus clock uses Manila date at the UTC day boundary', () => {
  const clock = helpers.campusClock(new Date('2026-11-01T16:30:00Z'));
  assert.equal(clock.date, '2026-11-02'); assert.equal(clock.dayKey, 'mon'); assert.equal(clock.minutes, 30);
});
test('weekly office status observes opening, lunch, resuming and closing boundaries', () => {
  assert.equal(helpers.officeStatus(monday, null, at('07:59:00')).isOpen, false);
  assert.equal(helpers.officeStatus(monday, null, at('08:00:00')).isOpen, true);
  assert.match(helpers.officeStatus(monday, null, at('12:00:00')).schedule, /Lunch break/);
  assert.equal(helpers.officeStatus(monday, null, at('13:00:00')).isOpen, true);
  assert.equal(helpers.officeStatus(monday, null, at('17:00:00')).isOpen, false);
});
test('missing and closed days never inherit opening hours', () => {
  assert.equal(helpers.officeStatus(null, null, at('09:00:00')).schedule, 'Pending schedule');
  assert.equal(helpers.officeStatus({}, null, at('09:00:00')).hasSchedule, false);
  assert.equal(helpers.officeStatus({ tue: monday.mon }, null, at('09:00:00')).isOpen, false);
  assert.equal(helpers.officeStatus({ mon: { ...monday.mon, active: false } }, null, at('09:00:00')).isOpen, false);
});
test('early out applies only on the matching Manila date', () => {
  assert.equal(helpers.officeStatus(monday, '2026-11-02', at('09:00:00')).isOpen, false);
  assert.equal(helpers.officeStatus(monday, '2026-11-01', at('09:00:00')).isOpen, true);
});
test('schedule loading accepts an all-closed week without requiring legacy hours', async () => {
  class NotFoundError extends Error {}
  const { GetSchedule } = load('src/modules/staff/application/use-case/get-schedule.ts', { '../error': { NotFoundError } });
  const schedule = { weekly_schedule: { mon: { ...monday.mon, active: false } } };
  assert.equal(await new GetSchedule({ getSchedule: async () => schedule }).execute('officer'), schedule);
  await assert.rejects(new GetSchedule({ getSchedule: async () => ({ weekly_schedule: null }) }).execute('officer'), /Schedule not found/);
});
test('invalid weekly schedules never reach persistence', async () => {
  let writes = 0;
  const { SetSchedule } = load('src/modules/staff/application/use-case/set-schedule.ts', { '@/lib/weekly-schedule': helpers });
  const useCase = new SetSchedule({ setSchedule: async (id, name, schedule) => { writes++; assert.equal(id, 'officer'); assert.equal(name, 'Officer'); assert.equal(schedule.mon.time_in, '08:00'); } });
  await assert.rejects(useCase.execute('officer', 'Officer', { mon: { active: true } }));
  assert.equal(writes, 0);
  await useCase.execute('officer', 'Officer', monday);
  assert.equal(writes, 1);
});
test('availability API saves weekly-only payloads and keeps quick early-out actions', async () => {
  const writes = [], updates = [], notices = [], invalidations = [];
  const query = { update(value) { updates.push(value); return query; }, eq() { return query; }, select() { return query; }, limit() { return query; }, maybeSingle: async () => ({ data: { clearance_departments: { dept_id: 1, dept_name: 'Clinic' } } }), then(resolve) { resolve({ error: null }); } };
  const client = { from: (table) => { assert.notEqual(table, 'clearance_logs'); return table === 'notifications' ? { insert: async (value) => { notices.push(value); } } : query; } };
  const route = load('src/app/api/department/availability/route.ts', {
    '@/lib/weekly-schedule': helpers,
    '@/composition/staff/make-get-schedule': {},
    '@/composition/staff/make-set-schedule': { makeSetSchedule: () => ({ execute: async (...args) => writes.push(args) }) },
    '@/lib/auth/get-session': { getSession: async () => ({ user_id: 'officer', user_name: 'Officer' }) },
    '@/lib/db/supabase-server': { createClient: async () => client },
    '@/lib/services/schedule-notifications': { notifyScheduleUpdate: async (staffId) => notices.push(staffId) },
    '@/modules/staff/application/error': { NotFoundError: Error },
    '@/lib/services/department-cache': { invalidateServerDepartmentCache: () => invalidations.push('dept') },
    '@/lib/services/clearance-cache': { invalidateServerClearanceCache: () => invalidations.push('client') },
    'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) } },
  });
  const patch = (body) => route.PATCH({ json: async () => body });
  assert.equal((await patch({ weekly_schedule: { mon: { active: true } } })).status, 400);
  assert.equal(writes.length, 0);
  const response = await patch({ weekly_schedule: monday });
  assert.equal(response.status, 200);
  assert.equal(writes[0][2].mon.time_in, '08:00');
  assert.equal((await response.json()).data.time_in, undefined);
  assert.deepEqual(notices, ["officer"], "schedule delivery uses the authenticated officer");
  assert.deepEqual(invalidations, ['dept', 'client']);
  assert.equal((await patch({ action: 'early_out', early_out_date: '2026-11-02' })).status, 200);
  assert.equal(updates[0].early_out_date, helpers.campusClock().date, 'quick early out always targets the current Manila date');
  assert.equal((await patch({ action: 'resume_schedule' })).status, 200);
  assert.equal(updates[1].early_out_date, null);
});
