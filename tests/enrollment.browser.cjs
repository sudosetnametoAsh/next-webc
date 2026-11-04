// Uses the real enrollment UI with isolated HTTP fixtures; never writes to the application database.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const esbuild = require('esbuild');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'webc-enrollment-'));
  const payloads = [], queries = [];
  let server, browser;
  try {
    await esbuild.build({ entryPoints: [path.join(root, 'tests/fixtures/enrollment.tsx')], outfile: path.join(temp, 'fixture.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
    const css = await postcss([tailwind({ base: root })]).process(await fs.readFile(path.join(root, 'src/app/globals.css'), 'utf8'), { from: path.join(root, 'src/app/globals.css') });
    await fs.writeFile(path.join(temp, 'fixture.css'), css.css);
    const courses = [{ course_id: 1, course_name: 'Bachelor of Science in Information Technology' }, { course_id: 2, course_name: 'Bachelor of Science in Computer Science' }];
    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        const json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        if (url.pathname === '/api/admin/courses') { queries.push(url.pathname); return json({ data: courses }); }
        if (url.pathname === '/api/admin/sections') {
          queries.push(url.pathname + url.search);
          const id = Number(url.searchParams.get('course_id'));
          assert.ok(id === 1 || id === 2, 'Do not fetch every section before a program is available');
          return json({ data: [{ section_id: id * 100 + 1, course_id: id, course_name: courses[id - 1].course_name, year: id, semester: 1, section_number: id, section_code: `${id}/1-${id}`, enrolled_count: 3 }] });
        }
        if (url.pathname === '/api/admin/enrollments/import') {
          let body = ''; for await (const chunk of req) body += chunk;
          const payload = JSON.parse(body); payloads.push(payload);
          return json({ success: true, summary: { total: payload.clients.length, successCount: payload.clients.length, failedCount: 0, errors: [] } });
        }
        if (url.pathname === '/fixture.js' || url.pathname === '/fixture.css') {
          res.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
          return res.end(await fs.readFile(path.join(temp, url.pathname.slice(1))));
        }
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
      } catch (error) { res.statusCode = 500; res.end(error.message); }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    assert.equal(queries.length, 0, 'Closed modal must not fetch enrollment options');
    const open = async () => { await page.getByRole('button', { name: 'Open enrollment', exact: true }).click(); await page.getByRole('dialog').waitFor(); };
    const id = page.getByRole('textbox', { name: 'Client ID', exact: true });
    const name = page.getByRole('textbox', { name: 'Full name', exact: true });
    const email = page.getByRole('textbox', { name: 'Email address', exact: true });
    await open();
    assert.equal(await id.getAttribute('placeholder'), 'e.g. 02000301199');
    assert.equal(await name.getAttribute('placeholder'), 'Dela Cruz, Juan');
    await id.focus();
    assert.equal(await id.locator('..').getByText('(Press Tab to accept)', { exact: true }).count(), 1);
    await id.press('Tab');
    assert.equal(await id.inputValue(), '02000');
    assert.equal(await page.getByRole('button', { name: /^Use / }).count(), 0);
    assert.equal(await id.evaluate((element) => element === document.activeElement), true);
    await id.pressSequentially('123456');
    await name.fill('Juan Dela Cruz'); await email.fill('manual.name');
    assert.equal(await page.getByRole('button', { name: 'Enroll Student', exact: true }).isDisabled(), true);
    await name.fill('Dela Cruz, Juan');
    assert.equal(await email.inputValue(), 'manual.name', 'Suggestions must not overwrite manual edits');
    await email.fill(''); await email.focus(); await email.press('Tab');
    assert.equal(await email.inputValue(), 'delacruz.123456');
    await page.getByRole('button', { name: /Student Undergraduate/ }).click();
    assert.equal(await id.inputValue(), '02000123456');
    assert.equal(await email.inputValue(), 'delacruz.123456');
    await page.getByRole('combobox', { name: 'Degree program', exact: true }).selectOption('2');
    await page.getByRole('combobox', { name: 'Section', exact: true }).selectOption('201');
    assert.equal(await page.getByText('Keep compound names together, for example Dela Cruz, Juan Miguel.', { exact: true }).count(), 0);
    await page.getByRole('button', { name: /Staff Member Faculty/ }).click();
    assert.equal(await name.inputValue(), '');
    assert.equal(await email.inputValue(), '');
    await name.fill('Santos, Maria'); await email.fill('maria.santos');
    await page.getByRole('button', { name: /Student Undergraduate/ }).click();
    assert.equal(await id.inputValue(), '02000123456');
    assert.equal(await name.inputValue(), 'Dela Cruz, Juan');
    assert.equal(await email.inputValue(), 'delacruz.123456');
    assert.equal(await page.getByRole('combobox', { name: 'Degree program', exact: true }).inputValue(), '2');
    assert.equal(await page.getByRole('combobox', { name: 'Section', exact: true }).inputValue(), '201');
    await page.getByRole('button', { name: /Staff Member Faculty/ }).click();
    assert.equal(await name.inputValue(), 'Santos, Maria');
    assert.equal(await email.inputValue(), 'maria.santos');
    await page.getByRole('button', { name: /Student Undergraduate/ }).click();
    await page.getByRole('button', { name: 'Enroll Student', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(payloads[0].clients[0].student_id, '02000123456');
    assert.equal(payloads[0].clients[0].name, 'Dela Cruz, Juan');
    assert.equal(payloads[0].clients[0].email, 'delacruz.123456@lucena.sti.edu.ph');
    assert.equal(payloads[0].clients[0].section_id, 201);
    assert.equal(payloads[0].clients[0].course_name, courses[1].course_name);

    await open();
    await page.getByRole('button', { name: /Staff Member Faculty/ }).click();
    assert.equal(await id.count(), 0);
    assert.equal(await name.inputValue(), '');
    assert.equal(await email.inputValue(), '');
    await name.fill('Dela Cruz, Juan'); await email.focus();
    await page.getByRole('button', { name: 'Accept suggestion juan.delacruz', exact: true }).click();
    assert.equal(await email.inputValue(), 'juan.delacruz');
    await email.fill('juan.delacruz@lucena.sti.edu.ph');
    assert.equal(await email.inputValue(), 'juan.delacruz');
    await page.getByRole('button', { name: 'Enroll Staff Member', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(payloads[1].type, 'staff');
    assert.equal(payloads[1].clients[0].email, 'juan.delacruz@lucena.sti.edu.ph');
    assert.equal(payloads[1].clients[0].staff_id, undefined);

    await open();
    await page.getByRole('button', { name: 'Bulk import', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Student CSV Template', exact: true }).click();
    const download = await downloadPromise;
    const template = await fs.readFile(await download.path(), 'utf8');
    assert.match(template, /"Dela Cruz, Juan"/); assert.match(template, /@lucena\.sti\.edu\.ph/);
    await page.getByRole('button', { name: 'Direct Text Paste', exact: true }).click();
    const roster = page.getByRole('textbox', { name: 'Roster content', exact: true });
    await roster.fill('student_id,name,email\n02000123456,"Dela Cruz, Juan",delacruz.123456\n02000654321,Juan Dela Cruz,bad@example.edu');
    await page.getByText('1 Valid', { exact: true }).waitFor();
    await page.getByText('1 Invalid', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Import 1 Students', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(payloads[2].clients.length, 1);
    assert.equal(payloads[2].clients[0].email, 'delacruz.123456@lucena.sti.edu.ph');

    await open();
    await page.getByRole('button', { name: 'File Upload (.csv, .tsv, .json)', exact: true }).click();
    const file = { name: 'roster.csv', mimeType: 'text/csv', buffer: Buffer.from(template) };
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.locator('#bulk-file-input').setInputFiles(file);
      await page.getByText('2 Valid', { exact: true }).waitFor();
    }
    await page.getByRole('button', { name: 'Staff', exact: true }).click();
    await page.locator('#bulk-file-input').setInputFiles({ name: 'staff.csv', mimeType: 'text/csv', buffer: Buffer.from('name,email\n"O\'Neil, Sean",sean.oneil') });
    await page.getByText('1 Valid', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Students', exact: true }).click();
    await page.getByText('2 Valid', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Import 2 Students', exact: true }).isEnabled(), true);
    assert.equal(await page.getByText('roster.csv', { exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Staff', exact: true }).click();
    await page.getByText('1 Valid', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Staff', exact: true }).click();
    await page.getByRole('button', { name: 'Bulk import', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Import 1 Staff', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: 'Import 1 Staff', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(payloads[3].clients[0].name, "O'Neil, Sean");

    await open();
    await page.getByRole('button', { name: 'Direct Text Paste', exact: true }).click();
    await roster.fill('name,email\n' + Array.from({ length: 250 }, (_, i) => `"Dela Cruz, Juan",juan.${i}`).join('\n'));
    await page.getByText('250 Valid', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 100);
    await page.getByRole('button', { name: 'Single client', exact: true }).click();
    await page.getByRole('button', { name: /Student Undergraduate/ }).click();
    await page.setViewportSize({ width: 320, height: 700 });
    await id.focus(); await page.getByRole('button', { name: 'Accept suggestion 02000', exact: true }).click();
    await id.pressSequentially('123456');
    await name.fill('Dela Cruz, Juan'); await email.focus();
    await page.getByRole('button', { name: 'Accept suggestion delacruz.123456', exact: true }).click();
    await page.getByRole('combobox', { name: 'Degree program', exact: true }).selectOption('1');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.getByRole('dialog').evaluate((element) => element.scrollWidth > element.clientWidth), false);
    assert.deepEqual(errors, []);
    console.log('Passed: inline Tab/tap completion, independent student/staff drafts, close-to-reset, native program/section dropdowns, submitted payloads, separate bulk drafts, CSV/paste/file imports, bounded previews and mobile layout.');
  } finally {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
