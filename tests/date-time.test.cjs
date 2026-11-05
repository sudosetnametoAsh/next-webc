const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForDates = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/date-time.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsForDates });
const { APP_TIME_ZONE, campusDateInput, campusEndOfDay } = exportsForDates;

test('campus timestamps display the signing example in Manila time', () => {
  const formatted = new Date('2026-11-04T06:45:00Z').toLocaleString('en-US', {
    timeZone: APP_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true,
  });
  assert.equal(formatted, '2:45 PM');
});

test('deadlines and editing preserve the Manila calendar date across host timezones', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Asia/Manila', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(campusEndOfDay('2026-11-04'), '2026-11-04T15:59:59.000Z');
      assert.equal(campusDateInput('2026-11-04T16:30:00Z'), '2026-11-05');
      assert.equal(campusDateInput(campusEndOfDay('2026-11-04')), '2026-11-04');
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('every schema timestamp explicitly preserves its timezone', () => {
  const source = fs.readFileSync('src/lib/db/schema.ts', 'utf8');
  const definitions = [...source.matchAll(/timestamp\([^)]*\)/g)];
  assert.ok(definitions.length >= 7);
  for (const [definition] of definitions) assert.match(definition, /withTimezone:\s*true/);
});
