// Run with WEB_C_PLAYWRIGHT_MODULE pointing to an installed Playwright package.
// Uses real UI components and query hooks; all API requests use local fixtures.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('esbuild');
const postcss = require('postcss');

const student = {
  student_id: '2026-0001', student_name: 'Morgan Alexandra Longname',
  clearance_records: [{ clearance_id: 'clearance-1', status: 'Pending', clearance_tasks: [] }],
};
const stubs = {
  'next/navigation': `const params = new URLSearchParams(); export const usePathname = () => '/department/clients'; export const useSearchParams = () => params;`,
  'next/link': `import React from 'react'; export default function Link({href, children, ...props}) {return <a href={href} {...props}>{children}</a>}`,
  'next/image': `import React from 'react'; export default function Image({priority, ...props}) {return <img {...props}/>}`,
  '@/context/deparment': `export const useDepartmentContext = () => ({
    students: [${JSON.stringify(student)}], filteredStudents: [${JSON.stringify(student)}],
    clearanceId: [], selectedStudents: [], effectiveStatus: 'Pending', viewType: 'students',
    prereqStatus: new Map(), activeSectionId: 'section-1', fetchingStudents: false,
    setClearanceId() {}, setStatusFilter() {}, setOrderFilter() {}, statusFilter: 'All', orderFilter: 'A-Z'
  });`,
  '@/lib/db/supabase-client': `export function createClient() { const channel = {on() {return channel}, subscribe() {return channel}}; return {channel() {return channel}, removeChannel() {}} }`,
  '@/hooks/clearance/use-notifications': `export const useNotifications = () => ({notifications: [], unreadCount: 0});`,
};

(async () => {
  const { chromium } = require(process.env.WEB_C_PLAYWRIGHT_MODULE || 'playwright');
  const bundle = await esbuild.build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
      import {ThemeProvider} from 'next-themes';
      import {PersistentAppShell} from './src/components/shell/persistent-app-shell';
      import Clients from './src/components/department/clients/clients-client';
      import Courses from './src/components/admin/course-templates-list';
      const screen = new URLSearchParams(location.search).get('screen');
      const client = new QueryClient({defaultOptions: {queries: {retry:false}}});
      const session = {user_id:'fixture', user_name:'Test User', user_email:'test@example.invalid', role:'Department'};
      createRoot(document.getElementById('root')).render(
        <QueryClientProvider client={client}><ThemeProvider attribute="class">
          <PersistentAppShell session={session}>
            {screen === 'empty' ? <Courses searchQuery="" toastSuccess={() => 0} toastError={() => 0}/> : screen === 'clients' ? <Clients/> : <button>Dashboard action</button>}
          </PersistentAppShell>
        </ThemeProvider></QueryClientProvider>);
    `, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' },
    plugins: [{ name: 'fixture-boundaries', setup(build) {
      build.onResolve({filter: /.*/}, args => args.path in stubs ? {path: args.path, namespace:'fixture'} : undefined);
      build.onLoad({filter: /.*/, namespace:'fixture'}, args => ({contents:stubs[args.path], loader:'tsx', resolveDir:process.cwd()}));
    }}],
  });
  const css = await postcss([require('@tailwindcss/postcss')()]).process(readFileSync('src/app/globals.css','utf8'), {from:path.resolve('src/app/globals.css')});
  const server = http.createServer((req, res) => {
    const assets = {
      '/ui.js': ['application/javascript', bundle.outputFiles[0].text],
      '/ui.css': ['text/css', css.css],
      '/stilogo.png': ['image/png', readFileSync('public/stilogo.png')],
    };
    const asset = assets[req.url];
    res.setHeader('Content-Type', asset?.[0] || 'text/html');
    res.end(asset?.[1] || '<html><head><link rel="stylesheet" href="/ui.css"></head><body><div id="root"></div><script src="/ui.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless:true, ...(process.env.WEB_C_CHROMIUM ? {executablePath:process.env.WEB_C_CHROMIUM} : {}) });
    const page = await browser.newPage({viewport:{width:375,height:812}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => route.fulfill({json: {data: [], id:'fixture'}}));
    const base = `http://127.0.0.1:${server.address().port}`;
    const failures = [];
    async function check(name, run) {
      try { await run(); console.log('PASS', name); }
      catch (error) { failures.push(name); console.error('FAIL', name, error.message); }
    }
    await check('mobile navigation traps focus, closes on Escape and restores its trigger', async () => {
      await page.goto(base);
      const trigger = page.getByRole('button',{name:'Open navigation menu'});
      await trigger.click();
      const dialog = page.getByRole('dialog', {name:'Navigation menu'});
      await dialog.waitFor({timeout:2500});
      for (const key of ['Tab', 'Shift+Tab']) {
        for (let i=0;i<20;i++) {
          await page.keyboard.press(key);
          assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
        }
      }
      await page.keyboard.press('Escape');
      await dialog.waitFor({state:'hidden'});
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    });
    await check('mobile modal closes when switching to desktop', async () => {
      await page.setViewportSize({width:375,height:812});
      await page.goto(base);
      await page.getByRole('button',{name:'Open navigation menu'}).click();
      await page.setViewportSize({width:1440,height:900});
      await page.waitForTimeout(300);
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(await page.locator('main').getAttribute('aria-hidden'), null);
    });
    for (const width of [320,375,768,1440]) {
      await check(`client rows and empty templates fit ${width}px`, async () => {
        await page.setViewportSize({width,height:900});
        await page.goto(base+'/?screen=clients');
        const name = page.getByRole('heading',{name:student.student_name});
        await name.waitFor();
        const row = name.locator('xpath=../../..');
        const layout = await row.evaluate(el => {
          const bounds = el.getBoundingClientRect();
          return {width:bounds.width, scroll:el.scrollWidth, client:el.clientWidth,
            fits:[...el.querySelectorAll('*')].every(child => {
              const r=child.getBoundingClientRect();
              return !r.width || (r.left >= bounds.left-1 && r.right <= bounds.right+1);
            })};
        });
        assert.ok(layout.fits && layout.scroll <= layout.client+1, JSON.stringify(layout));
        const overflow = await page.evaluate(() => [...document.querySelectorAll('main, main *')].filter(el => el.clientWidth && el.scrollWidth > el.clientWidth+1).map(el => ({tag:el.tagName, cls:el.className, width:el.clientWidth, scroll:el.scrollWidth, text:el.textContent.slice(0,80)})));
        assert.equal(overflow.length, 0, 'Client workspace should not clip or scroll horizontally: '+JSON.stringify(overflow));
        if (width === 375) await page.screenshot({path:'/tmp/webc-clients-mobile.png', fullPage:true});
        if (width < 768) {
          const nameBox = await name.boundingBox();
          const statusBox = await row.getByText('Pending',{exact:true}).boundingBox();
          assert.ok(statusBox.y >= nameBox.y+nameBox.height, 'Status should stack below the student name');
        }
        await page.goto(base+'/?screen=empty');
        await page.getByText('No clearance templates found. Create a new one.').waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('main *')].every(el => el.scrollWidth <= el.clientWidth+1)), true, 'Empty state should not overflow');
      });
    }
    await check('no browser runtime errors', async () => assert.deepEqual(errors, []));
    assert.deepEqual(failures, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode=1});
