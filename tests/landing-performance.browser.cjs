// Run against a production build: WEB_C_BASE_URL=http://127.0.0.1:3000 node tests/landing-performance.browser.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.WEB_C_BASE_URL || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    for (const [width, height, expected] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Login Now' }).waitFor();
      await page.getByRole('button', { name: 'SIGN IN WITH YOUR STI O365 ACCOUNT' }).waitFor();
      const metrics = await page.evaluate(() => ({
        backgrounds: performance.getEntriesByType('resource')
          .filter((resource) => /sti-login-(enhanced|desktop|mobile)\./.test(resource.name))
          .map((resource) => ({ path: new URL(resource.name).pathname, bytes: resource.encodedBodySize })),
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      assert.equal(metrics.backgrounds.length, 1, 'Only the matching background should download');
      assert.equal(metrics.backgrounds[0].path, `/sti-login-${expected}.webp`);
      assert.ok(metrics.backgrounds[0].bytes < 200000);
      assert.equal(metrics.overflow, false);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ viewport: `${width}x${height}`, ...metrics }));
      await context.close();
    }

    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const page = await noJS.newPage();
    await page.goto(origin);
    await page.getByRole('heading', { name: 'Login Now' }).waitFor();
    await page.goto(new URL('/?notice=not-enrolled', origin).href);
    await page.getByRole('heading', { name: 'Login Now' }).waitFor();
    assert.match(await page.locator('body').innerText(), /not enrolled/i);
    await noJS.close();
    console.log('Passed: responsive transfer budgets, login controls, no horizontal overflow, no browser errors, and server-rendered login/enrollment notice.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
