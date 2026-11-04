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
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'webc-toasts-'));
  let server, browser;
  try {
    await esbuild.build({ entryPoints: [path.join(root, 'tests/fixtures/toasts.tsx')], outfile: path.join(temp, 'fixture.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
    const css = await postcss([tailwind({ base: root })]).process(await fs.readFile(path.join(root, 'src/app/globals.css'), 'utf8'), { from: path.join(root, 'src/app/globals.css') });
    await fs.writeFile(path.join(temp, 'fixture.css'), css.css);
    server = http.createServer(async (req, res) => {
      const filename = new URL(req.url, 'http://localhost').pathname;
      if (filename === '/fixture.js' || filename === '/fixture.css') {
        res.setHeader('Content-Type', filename.endsWith('.css') ? 'text/css' : 'text/javascript');
        res.end(await fs.readFile(path.join(temp, filename.slice(1))));
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let failure = false;
    await page.route('**/api/**', route => route.fulfill({ status: failure ? 400 : 200, contentType: 'application/json', body: JSON.stringify(failure ? { error: 'Prerequisite phase is locked' } : { data: [] }) }));
    const toast = page.locator('[data-sonner-toast]');
    const dismiss = async () => {
      await page.getByRole('button', { name: 'Dismiss all', exact: true }).click();
      await toast.waitFor({ state: 'detached' });
    };
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const area of ['admin', 'department', 'clearance']) {
        await page.goto(`http://127.0.0.1:${server.address().port}/${area}`);
        for (const theme of ['Light', 'Dark']) {
          await page.getByRole('button', { name: theme, exact: true }).click();
          await page.waitForFunction(value => document.documentElement.classList.contains(value), theme.toLowerCase());
          await page.getByRole('button', { name: 'Export report', exact: true }).click();
          await page.getByText('Report exported', { exact: true }).waitFor();
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-sonner-toast]');
            return el?.dataset.mounted === 'true' && getComputedStyle(el).opacity === '1';
          });
          assert.equal(await page.locator('[data-sonner-toaster]').count(), 1);
          assert.equal(await toast.getAttribute('data-type'), 'success');
          assert.equal(await toast.locator('[data-description]').textContent(), 'The report is ready to download.');
          const style = await toast.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, icon: getComputedStyle(el.querySelector('[data-icon]')).color, right: el.getBoundingClientRect().right, left: el.getBoundingClientRect().left }));
          assert.equal(style.background, theme === 'Light' ? 'rgb(255, 255, 255)' : 'rgb(10, 16, 31)');
          assert.equal(style.icon, theme === 'Light' ? 'rgb(22, 101, 52)' : 'rgb(134, 239, 172)');
          assert.ok(style.left >= 0 && style.right <= width, JSON.stringify(style));
          assert.ok(Math.abs((style.left + style.right) / 2 - width / 2) <= 1, 'Toast is horizontally centered');
          assert.equal(await page.locator('[data-sonner-toaster]').getAttribute('data-y-position'), 'bottom');
          assert.equal(await toast.evaluate(el => getComputedStyle(el, '::after').animationDuration), '2.5s');
          assert.equal(await toast.evaluate(el => getComputedStyle(el, '::after').backgroundColor), style.icon);
          if (area === 'clearance' && theme === 'Dark') await page.screenshot({ path: `/tmp/webc-toast-${width}.png` });
          const close = toast.getByRole('button', { name: 'Close toast', exact: true });
          await close.focus();
          await page.keyboard.press('Enter');
          await toast.waitFor({ state: 'detached' });
          await page.getByRole('button', { name: 'Long message', exact: true }).click();
          await toast.waitFor();
          assert.ok(await toast.evaluate(el => el.scrollWidth <= el.clientWidth), 'Long content must wrap');
          await dismiss();
        }
      }
    }
    for (const [button, expected] of [['Sign', 'Clearance signed'], ['Reopen', 'Clearance reopened'], ['Assign tasks', 'Tasks assigned']]) {
      await page.getByRole('button', { name: button, exact: true }).click();
      await page.getByText(expected, { exact: true }).waitFor();
      assert.equal(await toast.count(), 1);
      await dismiss();
      failure = true;
      await page.getByRole('button', { name: button, exact: true }).click();
      await page.getByText('Prerequisite phase is locked', { exact: true }).waitFor();
      assert.equal(await toast.getAttribute('data-type'), 'error');
      assert.equal(await toast.count(), 1, 'Failed actions must not also emit success');
      await dismiss();
      failure = false;
    }
    failure = true;
    await page.getByRole('button', { name: 'Review submission', exact: true }).click();
    await page.getByRole('button', { name: 'Approve & Clear', exact: true }).click();
    await page.getByText('Save failed', { exact: true }).waitFor();
    assert.equal(await toast.getAttribute('data-type'), 'error');
    assert.equal(await page.getByRole('button', { name: 'Approve & Clear', exact: true }).count(), 1, 'Failed review remains open');
    await toast.getByRole('button', { name: 'Close toast', exact: true }).click();
    await toast.waitFor({ state: 'detached' });
    failure = false;
    await page.getByRole('button', { name: 'Approve & Clear', exact: true }).click();
    await page.getByText('Requirement cleared', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Approve & Clear', exact: true }).count(), 0, 'Successful review closes');
    await dismiss();
    await page.getByRole('button', { name: 'Export report', exact: true }).click();
    await toast.waitFor();
    const progress = () => toast.evaluate(el => new DOMMatrix(getComputedStyle(el, '::after').transform).a);
    const initialProgress = await progress();
    await page.waitForTimeout(600);
    assert.ok(await progress() < initialProgress - 0.15, 'Countdown bar depletes');
    await toast.hover();
    await page.waitForFunction(() => document.querySelector('[data-sonner-toast]')?.dataset.expanded === 'true');
    const pausedProgress = await progress();
    await page.waitForTimeout(600);
    assert.ok(Math.abs(await progress() - pausedProgress) < 0.04, 'Hover pauses countdown');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(600);
    assert.ok(Math.abs(await progress() - pausedProgress) < 0.04, 'Hidden tab pauses countdown');
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await toast.waitFor({ state: 'detached', timeout: 3500 });
    await page.getByRole('button', { name: 'Upload document', exact: true }).click();
    await page.getByText('Uploading document', { exact: true }).waitFor();
    assert.equal(await toast.evaluate(el => getComputedStyle(el, '::after').content), 'none', 'Loading has no expiration bar');
    await page.getByText('Upload complete', { exact: true }).waitFor({ timeout: 4000 });
    assert.ok(await progress() > 0.8, 'Countdown starts fresh when loading completes');
    await dismiss();
    const started = Date.now();
    await page.getByRole('button', { name: 'Export report', exact: true }).click();
    await page.getByText('Report exported', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Leave page', exact: true }).click();
    assert.equal(await toast.count(), 1, 'Toast survives page component unmount');
    await toast.waitFor({ state: 'detached', timeout: 7000 });
    assert.ok(Date.now() - started >= 2400 && Date.now() - started < 3500, 'Toast dismisses after 2.5 seconds plus its exit transition');
    assert.deepEqual(errors, []);
    console.log('PASS: unified toast themes, mobile layout, keyboard dismissal, mutation and review success/failure, page unmount, and automatic dismissal');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
