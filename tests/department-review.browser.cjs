// Real React components in an optimized production bundle; external API and
// websocket boundaries are simulated. Does not access a real Supabase project.
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
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'webc-review-'));
  let browser, server;
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'fixtures/department-review.tsx')],
      bundle: true, minify: true, outdir: temp, platform: 'browser', jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [{ name: 'simulated-external-services', setup(build) {
        build.onResolve({ filter: /^(next\/navigation|@\/context\/deparment|@\/lib\/db\/supabase-client|\.\/department-nav-context)$/ }, args => ({ path: args.path, namespace: 'boundary' }));
        build.onLoad({ filter: /.*/, namespace: 'boundary' }, ({ path: name }) => ({ loader: 'js', contents:
          name === 'next/navigation' ? `const router={push(){},refresh(){},prefetch(){}}; export const useRouter=()=>router; export const usePathname=()=>'/department/dashboard';` :
          name.includes('deparment') ? `export const useDepartmentContext=()=>({userId:'test-officer',departmentName:'Clinic'});` :
          name.includes('department-nav-context') ? `export const useDepartmentNav=()=>({toggleMobile(){}});` :
          `const channels=new Set();
           const emit=(table,row)=>{for(const channel of channels)for(const binding of channel.callbacks)if(binding.table===table)binding.callback({eventType:'INSERT',new:row})};
           window.emitTestNotification=(row)=>emit('notifications',row);
           window.emitTestRecord=(row)=>emit('clearance_records',row);
           const client={from(){const query={select(){return query},eq(){return query},async single(){return {data:{dropbox:'[]',uploaded_at:'2026-11-04T00:00:00Z',ai_audit_report:{isAuthentic:false,flags:['Wrong receipt']}},error:null}}};return query},channel(){const channel={callbacks:[],on(event,filter,callback){this.callbacks.push({table:filter.table,callback});return this},subscribe(callback){channels.add(this);setTimeout(()=>callback?.('SUBSCRIBED'),0);return this}};return channel},removeChannel(channel){channels.delete(channel)}};
           export const createClient=()=>client;`,
        }));
      } }],
    });
    const css = await postcss([tailwind({ base: root })]).process(await fs.readFile(path.join(root, 'src/app/globals.css'), 'utf8'), { from: path.join(root, 'src/app/globals.css') });
    await fs.writeFile(path.join(temp, 'globals.css'), css.css);
    server = http.createServer(async (req, res) => {
      if (new URL(req.url, 'http://localhost').pathname === '/') {
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><html class="dark"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><div id="root"></div><script src="/department-review.js"></script></html>');
      } else if (req.url === '/department-review.js' || req.url === '/globals.css') {
        res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : 'text/css');
        res.end(await fs.readFile(path.join(temp, path.basename(req.url))));
      } else { res.statusCode = 404; res.end(); }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let failRejection = true, requestBody, notificationDelay = 0;
    let failProgress = true, progressDelay = 500, clinicStatus = 'Pending';
    let failTaskStatus = true;
    const statusRequests = [];
    let notifications = [];
    await page.route('**/api/student/notifications?*', async (route) => {
      const snapshot = notifications;
      if (notificationDelay) await new Promise((resolve) => setTimeout(resolve, notificationDelay));
      await route.fulfill({ json: { notifications: snapshot } }).catch(() => {});
    });
    await page.route('**/api/department/clients/tasks/reject', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill(failRejection
        ? { status: 500, json: { error: 'Could not save rejection. Please try again.' } }
        : { json: { data: { status: 'Rejected', comments: requestBody.reason } } });
    });
    await page.route('**/api/department/clients/tasks/status', async (route) => {
      assert.equal(route.request().method(), 'PATCH');
      const body = route.request().postDataJSON();
      statusRequests.push(body);
      await route.fulfill(failTaskStatus
        ? { status: 500, json: { error: 'Task update failed for test.' } }
        : { json: { data: { assigned_task_id: body.taskId, status: body.status, comments: body.comment } } });
    });
    await page.route('**/api/department/presets', (route) => route.fulfill({ json: { data: [], id: 'test-officer' } }));
    await page.route('**/api/department/clients/sign', (route) => {
      clinicStatus = route.request().postDataJSON().status;
      return route.fulfill({ json: { data: [], message: 'Clearances signed successfully' } });
    });
    await page.route('**/api/department/clients/progress?*', async (route) => {
      assert.equal(new URL(route.request().url()).searchParams.get('studentId'), 'test-client');
      if (progressDelay) await new Promise((resolve) => setTimeout(resolve, progressDelay));
      await route.fulfill(failProgress ? { status: 500, json: { error: 'Could not load department status. Please try again.' } } : {
        json: { data: [
          { clearance_id: 1, dept_name: 'Cashier', tier: 1, status: 'Signed' },
          { clearance_id: 2, dept_name: 'Clinic', tier: 2, status: clinicStatus },
        ] },
      }).catch(() => {});
    });
    const firstResponse = page.waitForResponse((response) => response.url().includes('/api/student/notifications?'));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await firstResponse;
    await page.getByRole('button', { name: 'Review flagged submission' }).click();
    await page.getByRole('button', { name: 'Request Resubmission', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByText('Could not save rejection. Please try again.').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Confirm', exact: true }).isVisible(), true, 'failed write keeps modal open');
    assert.equal(await page.getByTestId('saved-status').textContent(), 'Flagged', 'failed write must preserve status');
    failRejection = false;
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="saved-status"]').textContent === 'Rejected');
    assert.equal(await page.getByRole('button', { name: 'Confirm', exact: true }).count(), 0, 'successful write closes modal');
    assert.deepEqual(requestBody, { taskId: 12, reason: 'Wrong receipt' });

    // An incoming alert must appear before slow notification reconciliation.
    notificationDelay = 2000;
    const started = Date.now();
    await page.evaluate(() => window.emitTestNotification({ notif_id: 411, user_id: 'test-officer',
      target_role: 'department', title: 'Submission Flagged for Review', description: 'Test Client submitted Test Receipt.',
      type: 'Warning', category: 'submission', created_at: new Date().toISOString(), is_read: false,
      metadata: { taskId: 12, studentName: 'Test Client' } }));
    await page.getByRole('heading', { name: 'Submission Flagged for Review' }).waitFor({ timeout: 1500 });
    const elapsed = Date.now() - started;
    assert(elapsed < notificationDelay, 'popup must not wait for the slow API');
    await page.evaluate(() => window.emitTestNotification({ notif_id: 412, user_id: 'another-officer',
      title: 'Other officer private alert', created_at: new Date().toISOString(), is_read: false }));
    assert.equal(await page.getByText('Other officer private alert').count(), 0);

    // Exercise the real TaskView rather than only its data transformation.
    await page.goto(`http://127.0.0.1:${server.address().port}/?progress`);
    const progressSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Department Status', exact: true }) });
    await progressSection.getByRole('status').waitFor();
    assert.equal(await progressSection.getByText('No clearance records found.').count(), 0, 'loading must not look like an empty result');
    await progressSection.getByRole('alert').waitFor();
    assert.equal(await progressSection.getByText('No clearance records found.').count(), 0, 'a failed query must not look like an empty result');
    failProgress = false;
    progressDelay = 0;
    await progressSection.getByRole('button', { name: 'Retry', exact: true }).click();
    await progressSection.getByText('1 / 2 Cleared', { exact: true }).waitFor();
    assert.equal(await progressSection.getByText('Clinic', { exact: true }).isVisible(), true);
    progressDelay = 2000;
    const signStarted = Date.now();
    await page.getByRole('button', { name: 'Sign Clearance (1)', exact: true }).click();
    await page.getByRole('button', { name: 'Undo Sign (1)', exact: true }).waitFor({ timeout: 1500 });
    const signButtonMs = Date.now() - signStarted;
    assert(signButtonMs < progressDelay, 'sign button must reflect confirmation before slow list refresh completes');
    await progressSection.getByText('2 / 2 Cleared', { exact: true }).waitFor();
    const undoStarted = Date.now();
    await page.getByRole('button', { name: 'Undo Sign (1)', exact: true }).click();
    await page.getByRole('button', { name: 'Sign Clearance (1)', exact: true }).waitFor({ timeout: 1500 });
    const undoButtonMs = Date.now() - undoStarted;
    assert(undoButtonMs < progressDelay, 'undo button must not wait for list refresh');
    await progressSection.getByText('1 / 2 Cleared', { exact: true }).waitFor();
    progressDelay = 0;
    clinicStatus = 'Signed';
    await page.evaluate(() => window.emitTestRecord({ user_id: 'test-client', status: 'Signed' }));
    await progressSection.getByText('2 / 2 Cleared', { exact: true }).waitFor();
    clinicStatus = 'Pending';
    await page.evaluate(() => window.emitTestRecord({ user_id: 'test-client', status: 'Pending' }));
    await progressSection.getByText('1 / 2 Cleared', { exact: true }).waitFor();
    for (const mode of ['digital', 'person']) {
      failTaskStatus = true;
      await page.goto(`http://127.0.0.1:${server.address().port}/?progress&task=${mode}`);
      const title = mode === 'digital' ? 'Digital Receipt' : 'Office Visit';
      await page.getByText(title, { exact: true }).first().click();
      const approve = async () => {
        await page.getByRole('button', { name: 'Approve & Clear', exact: true }).click();
        if (mode === 'digital') await page.getByRole('button', { name: 'Override & Approve', exact: true }).click();
      };
      await approve();
      await page.getByText('Task update failed for test.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Approve & Clear', exact: true }).isVisible(), true, 'failed clear keeps the modal open');
      failTaskStatus = false;
      await approve();
      const taskSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Required Tasks', exact: true }) });
      await taskSection.getByText('Cleared', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Requirement Cleared', exact: true }).waitFor({ state: 'hidden' });
      assert.equal(await page.getByRole('button', { name: 'Approve & Clear', exact: true }).count(), 0);
      assert.equal(statusRequests.at(-1).status, 'Cleared');
      assert.equal(statusRequests.at(-1).taskId, 12);
      await page.getByText(title, { exact: true }).first().click();
      await page.getByRole('button', { name: 'Reopen (Mark Pending)', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm Reopen', exact: true }).click();
      await page.waitForFunction(() => ![...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Confirm Reopen'));
      assert.equal(statusRequests.at(-1).status, 'Pending');
    }
    assert.deepEqual(errors, [], 'no React runtime errors');
    console.log(`PASS: rejection failure stays open, success persists and closes; incoming popup rendered in ${elapsed}ms despite a ${notificationDelay}ms API delay; another officer's alert excluded.`);
    console.log('PASS: TaskView shows loading and query errors, retries successfully, and updates progress after signing and realtime changes without reloading.');
    console.log('PASS: actual digital and in-person TaskView flows show clear failures, persist successful clears through the API, and reopen cleared tasks.');
    console.log(`PASS: sign button updated in ${signButtonMs}ms and undo in ${undoButtonMs}ms despite a 2000ms progress-refetch delay (simulated API).`);
    await page.close();
  } finally {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
