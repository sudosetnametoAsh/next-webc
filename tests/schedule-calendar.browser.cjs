// Production-mode real React UI + hook. HTTP persistence/auth boundary is simulated.
// Real PostgreSQL persistence is covered by schedule-notifications.postgres.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const esbuild = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'webc-schedule-browser-'));
  let browser, server;
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'fixtures/schedule-calendar.tsx')], bundle: true, minify: true,
      outfile: path.join(temp, 'calendar.js'), platform: 'browser', jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [{ name: 'next-router-boundary', setup(build) {
        build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'boundary' }));
        build.onLoad({ filter: /.*/, namespace: 'boundary' }, () => ({ contents: 'const router={refresh(){window.scheduleRefreshes=(window.scheduleRefreshes||0)+1}};export const useRouter=()=>router;', loader: 'js' }));
      } }],
    });
    let persisted = Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map((key) => [key, {
      active: ['mon','tue','wed'].includes(key), time_in: '08:00', time_out: '17:00',
    }]));
    let failWrite = false;
    const writes = [];
    server = http.createServer(async (req, res) => {
      if (req.url === '/calendar.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(await fs.readFile(path.join(temp, 'calendar.js'))); }
      if (req.url === '/fixture/schedule') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(persisted)); }
      if (req.url === '/api/department/availability' && req.method === 'PATCH') {
        let text = ''; for await (const part of req) text += part;
        const body = JSON.parse(text); writes.push(body);
        res.setHeader('Content-Type', 'application/json');
        if (failWrite) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'Save failed for test' })); }
        if (body.weekly_schedule) persisted = structuredClone(body.weekly_schedule);
        return res.end(JSON.stringify({ success: true, data: { weekly_schedule: persisted } }));
      }
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/calendar.js"></script></html>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-09T01:00:00Z'));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('button', { name: /^Mon\s*Active$/ }).waitFor();
    const save = page.getByRole('button', { name: 'Save Weekly Schedule', exact: true });
    const early = () => page.getByRole('button', { name: /^(Early Out|Early Out Active)$/ });
    assert.equal(await save.isDisabled(), true, 'unchanged schedule cannot be saved');
    await page.getByRole('button', { name: /^Tue\s*Active$/ }).click();
    await page.getByRole('button', { name: /^Mon\s*Active$/ }).click();
    assert.equal(await save.isDisabled(), true, 'selection-only changes do not enable Save');
    assert.equal(await early().isEnabled(), true, 'today need not be selected');
    await early().click();
    await page.getByRole('button', { name: 'Confirm Early Out', exact: true }).click();
    await page.getByRole('button', { name: 'Early Out Active', exact: true }).waitFor();
    assert.equal(writes[0].action, 'early_out');
    assert.equal(writes[0].early_out_date, '2026-11-09', 'early out targets today, not selected Tuesday');
    assert.equal(await save.isDisabled(), true, 'early out does not dirty the weekly schedule');
    await early().click();
    await page.getByRole('button', { name: 'Resume Schedule', exact: true }).click();
    await page.getByRole('button', { name: 'Early Out', exact: true }).waitFor();
    for (const [time, allowed] of [['07:59', false], ['08:00', true], ['12:30', true], ['16:59', true], ['17:00', false]]) {
      await page.clock.setFixedTime(new Date(`2026-11-09T${time}:00+08:00`));
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      assert.equal(await early().isEnabled(), allowed, `early out boundary at ${time}`);
    }
    await page.clock.setFixedTime(new Date('2026-11-09T09:00:00+08:00'));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('button', { name: /^Mon\s*Active$/ }).click();
    await page.getByRole('button', { name: /^Tue\s*Active$/ }).click();
    writes.length = 0;
    await page.evaluate(() => { window.scheduleRefreshes = 0; });

    for (const day of ['Tue','Wed','Thu','Fri']) await page.getByRole('button', { name: new RegExp('^' + day + '\\s*(Active|Inactive)$') }).click();
    await page.getByText('Mixed · Activate all', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Activate selected days', exact: true }).click();
    const times = page.locator('input[type="time"]');
    await times.nth(0).fill('18:00'); await times.nth(1).fill('08:00');
    await page.getByRole('button', { name: 'Save Weekly Schedule', exact: true }).click();
    await page.getByText(/Closing time must be later than opening time/).waitFor();
    assert.equal(writes.length, 0, 'invalid hours never reach the API');
    await times.nth(0).fill('09:00'); await times.nth(1).fill('18:00');
    await page.getByRole('button', { name: 'Save Weekly Schedule', exact: true }).click();
    await page.getByText('Office hours saved', { exact: true }).waitFor();
    assert.equal(writes.length, 1);
    assert.equal(await save.isDisabled(), true, 'successful save becomes the new baseline');
    for (const day of ['mon','tue','wed','thu','fri']) {
      assert.deepEqual(writes[0].weekly_schedule[day], { active: true, time_in: '09:00', time_out: '18:00' });
    }
    assert.equal(writes[0].weekly_schedule.sat.active, false);
    assert.equal(writes[0].weekly_schedule.sun.active, false);
    assert.equal(await page.evaluate(() => window.scheduleRefreshes), 1);
    await page.reload();
    for (const day of ['Mon','Tue','Wed','Thu','Fri']) await page.getByRole('button', { name: new RegExp('^' + day + '\\s*Active$') }).waitFor();
    assert.equal(await times.nth(0).inputValue(), '09:00');
    assert.equal(await times.nth(1).inputValue(), '18:00');
    failWrite = true;
    await page.getByRole('button', { name: 'Deactivate selected days', exact: true }).click();
    await page.getByRole('button', { name: 'Save Weekly Schedule', exact: true }).click();
    await page.getByText('Save failed for test').first().waitFor();
    assert.equal(await page.evaluate(() => window.scheduleRefreshes || 0), 0);
    assert.equal(persisted.mon.active, true, 'failed save must not change stored hours');
    assert.equal(await save.isEnabled(), true, 'failed save remains dirty for retry');
    await page.reload();
    await page.getByRole('button', { name: /^Mon\s*Active$/ }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: production React browser flow: mixed weekday activation, invalid-hour rejection, changed hours, save, full reload, router refresh, and failed-write recovery. API boundary simulated; no application data changed.');
  } finally {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
