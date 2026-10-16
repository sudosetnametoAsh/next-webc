// Run with WEB_C_PLAYWRIGHT_MODULE pointing to an installed Playwright package.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('esbuild');

(async () => {
  const build = await esbuild.build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
        import ExportClearanceButton from './src/components/clearance/export-clearance-button';
        const pending = new URLSearchParams(location.search).has('pending');
        createRoot(document.getElementById('root')).render(<ExportClearanceButton
          user={{name:'Test Student',email:'student@example.invalid'}}
          profile={{student_id:'2026-0001',student_name:'Test Student',course_name:'BSCS',section_number:1,year:2026,semester:1}}
          records={[{department:'Library',status:'Signed',staff:'Test Librarian'}]}
          summary={{remaining_department:pending ? 1 : 0,department_count:1}}
        />);`,
      resolveDir: process.cwd(), loader:'tsx', sourcefile:'student-pdf-fixture.tsx',
    },
    bundle:true, splitting:true, format:'esm', platform:'browser', jsx:'automatic',
    outdir:'/tmp/webc-student-pdf-build', write:false, metafile:true,
    define:{'process.env.NODE_ENV':'"test"'},
  });
  const outputs = new Map(Object.entries(build.metafile.outputs).map(([file, info]) => [path.basename(file), info]));
  const entry = [...outputs].find(([, info]) => info.entryPoint === 'student-pdf-fixture.tsx')[0];
  const initial = new Set();
  function visit(file) {
    if (initial.has(file)) return;
    initial.add(file);
    for (const imp of outputs.get(file).imports) if (imp.kind !== 'dynamic-import') visit(path.basename(imp.path));
  }
  visit(entry);
  const eagerLibraries = [...initial].flatMap(file => Object.keys(outputs.get(file).inputs))
    .filter(input => /node_modules\/(jspdf|jspdf-autotable)\//.test(input));
  assert.deepEqual(eagerLibraries, [], 'PDF libraries must be absent from the initial module graph');
  console.log('PASS PDF libraries are excluded from the initial bundle');
  const deferred = new Set([...outputs.keys()].filter(file => !initial.has(file)));
  assert.ok(deferred.size > 0, 'Expected deferred export chunks');
  const assets = new Map(build.outputFiles.map(file => ['/'+path.basename(file.path), file.contents]));
  const server = http.createServer((req,res) => {
    const asset = assets.get(req.url);
    res.setHeader('Content-Type', asset ? 'application/javascript' : 'text/html');
    res.end(asset || `<html><body><div id="root"></div><script type="module" src="/${entry}"></script></body></html>`);
  });
  await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  let browser;
  try {
    const {chromium} = require(process.env.WEB_C_PLAYWRIGHT_MODULE || 'playwright');
    browser = await chromium.launch({headless:true,...(process.env.WEB_C_CHROMIUM ? {executablePath:process.env.WEB_C_CHROMIUM} : {})});
    const page = await browser.newPage({acceptDownloads:true});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    let requests = 0;
    let mode = 'hold';
    let release;
    const gate = new Promise(resolve => {release=resolve});
    await page.route('**/*.js', async route => {
      if (!deferred.has(path.basename(new URL(route.request().url()).pathname))) return route.continue();
      requests++;
      if (mode === 'hold') await gate;
      if (mode === 'fail') return route.abort('failed');
      return route.continue();
    });
    await page.goto(base);
    const exportButton = () => page.getByRole('button',{name:/Export PDF|Generating PDF/});
    await exportButton().waitFor();
    assert.equal(await page.getByRole('button',{name:'Student account'}).count(),0);
    assert.equal(await page.getByText('Log out',{exact:true}).count(),0);
    assert.equal(requests,0,'Showing the export button must not load PDF code');
    const downloaded = page.waitForEvent('download');
    await exportButton().click();
    await page.getByRole('status').filter({hasText:'Generating PDF'}).waitFor();
    assert.equal(await exportButton().isDisabled(),true);
    release();
    const download = await downloaded;
    assert.equal(download.suggestedFilename(),'STI_Clearance_2026-0001.pdf');
    const pdf = readFileSync(await download.path(),'latin1');
    assert.ok(pdf.startsWith('%PDF-'));
    for (const text of ['STI COLLEGE LUCENA','CLEARANCE FORM','2026-0001','Test Student','Library','Test Librarian','REGISTRAR']) assert.ok(pdf.includes(text),`Missing PDF content: ${text}`);
    await page.getByRole('status').waitFor({state:'hidden'});
    assert.ok(requests>0);
    console.log('PASS delayed export shows loading, prevents duplicate selection, and downloads the existing clearance PDF');

    mode='fail';
    await page.goto(base);
    await exportButton().click();
    await page.getByRole('alert').filter({hasText:'Please try again'}).waitFor();
    assert.equal(await exportButton().isEnabled(),true);
    console.log('PASS chunk failure shows an error and releases the export action');

    await page.goto(base+'/?pending');
    assert.equal(await exportButton().isDisabled(),true);
    for (const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:900});
      const bounds = await exportButton().boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x+bounds.width <= width, `Export button overflows at ${width}px`);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS pending clearance stays disabled; no unhandled browser errors');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1});
