// Real production React removal guard/notice; HTTP and auth/realtime boundaries simulated.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const esbuild = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'webc-department-removal-'));
  let server, browser;
  try {
    await esbuild.build({ entryPoints: [path.join(__dirname, 'fixtures/department-removal.tsx')],
      outfile: path.join(temp, 'guard.js'), bundle: true, minify: true, platform: 'browser', jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'auth-boundary', setup(build) {
        build.onResolve({ filter: /^@\/lib\/db\/supabase-client$/ }, () => ({ path: 'auth', namespace: 'boundary' }));
        build.onLoad({ filter: /.*/, namespace: 'boundary' }, () => ({ loader: 'js', contents: `
          const callbacks=new Set();
          window.emitEnrollmentDeletion=()=>{for(const callback of callbacks)callback()};
          const client={auth:{async signOut(){sessionStorage.setItem('removal-signed-out','true')},onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}}},
            channel(){const channel={on(event,filter,callback){callbacks.add(callback);return channel},subscribe(callback){setTimeout(()=>callback('SUBSCRIBED'),0);return channel}};return channel},
            removeChannel(){callbacks.clear()}};
          export const createClient=()=>client;` }));
      } }] });
    let status = 200, reads = 0;
    server = http.createServer(async (req, res) => {
      if (req.url === '/guard.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(await fs.readFile(path.join(temp, 'guard.js'))); }
      if (req.url === '/api/auth/enrollment') {
        reads++; res.statusCode = status; res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(status === 200 ? { enrolled: true } : { code: status === 403 ? 'NOT_ENROLLED' : 'ENROLLMENT_CHECK_FAILED' }));
      }
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><div id="root"></div><script src="/guard.js"></script></html>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/department/dashboard`);
    await page.getByTestId('private-department').waitFor();
    await page.waitForResponse((res) => res.url().endsWith('/api/auth/enrollment'));
    assert.equal(reads > 0, true);
    status = 503;
    const outage = page.waitForResponse((res) => res.url().endsWith('/api/auth/enrollment') && res.status() === 503);
    await page.evaluate(() => window.emitEnrollmentDeletion()); await outage;
    assert.equal(await page.getByTestId('private-department').isVisible(), true);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('removal-signed-out')), null);
    status = 403;
    await page.evaluate(() => window.emitEnrollmentDeletion());
    await page.waitForURL('**/?notice=not-enrolled');
    await page.getByRole('alert').getByText('Account not enrolled', { exact: true }).waitFor();
    await page.getByText('You are not enrolled in the system. Please contact the administrator to enroll your account.', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('private-department').count(), 0);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('removal-signed-out')), 'true');
    await page.reload();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByTestId('private-department').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: production Department session survives an outage, signs out after confirmed removal, removes private content, redirects to the root enrollment notice, and retains the notice on reload. HTTP/auth boundaries simulated.');
  } finally {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
