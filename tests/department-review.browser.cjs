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
          `const channels=new Set(); window.emitTestNotification=(row)=>{for(const channel of channels)for(const callback of channel.callbacks)callback({eventType:'INSERT',new:row})};
           const client={channel(){const channel={callbacks:[],on(event,filter,callback){if(filter.table==='notifications')this.callbacks.push(callback);return this},subscribe(callback){channels.add(this);setTimeout(()=>callback?.('SUBSCRIBED'),0);return this}};return channel},removeChannel(channel){channels.delete(channel)}};
           export const createClient=()=>client;`,
        }));
      } }],
    });
    const css = await postcss([tailwind({ base: root })]).process(await fs.readFile(path.join(root, 'src/app/globals.css'), 'utf8'), { from: path.join(root, 'src/app/globals.css') });
    await fs.writeFile(path.join(temp, 'globals.css'), css.css);
    server = http.createServer(async (req, res) => {
      if (req.url === '/') {
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
    assert.deepEqual(errors, [], 'no React runtime errors');
    console.log(`PASS: rejection failure stays open, success persists and closes; incoming popup rendered in ${elapsed}ms despite a ${notificationDelay}ms API delay; another officer's alert excluded.`);
    await page.close();
  } finally {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
