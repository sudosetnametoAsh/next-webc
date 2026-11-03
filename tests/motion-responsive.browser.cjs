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
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'webc-motion-'));
  let browser, server;
  try {
    await esbuild.build({ entryPoints:[path.join(__dirname,'fixtures/motion-responsive.tsx')], bundle:true, outdir:temp, platform:'browser', external:['/*.png'], jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'}, plugins:[{
      name:'read-only-fixture-boundaries', setup(build) {
        build.onResolve({filter:/^(next\/(navigation|link|image)|@\/hooks\/)|azure-sign-(in|out)-button$/}, args=>({path:args.path,namespace:'fixture'}));
        build.onLoad({filter:/.*/,namespace:'fixture'}, ({path:p})=>({loader:'jsx',contents:
          p==='next/navigation' ? `const router={prefetch(){},push(){}}; export const useRouter=()=>router; export const usePathname=()=>'/'+(new URLSearchParams(location.search).get('area')||'admin')+(location.search.includes('admin')?'/dashboard':'');` :
          p==='next/link' ? `import React from 'react'; export default function Link({prefetch,children,...props}){return <a {...props}>{children}</a>}` :
          p==='next/image' ? `import React from 'react'; export default function Image({unoptimized,priority,...props}){return <img {...props}/ >}` :
          p.includes('azure-sign') ? `import React from 'react'; export default function Auth({children}){return <button>{children||'SIGN IN WITH YOUR STI O365 ACCOUNT'}</button>}` :
          `export const prefetchAdminStats=()=>{},prefetchPipelineRadar=()=>{},prefetchDepartments=()=>{},prefetchStudentTemplates=()=>{},prefetchStaff=()=>{},prefetchClearanceData=()=>{},prefetchDepartmentClients=()=>{};`,resolveDir:root}));
      }
    }] });
    const css = await postcss([tailwind({base:root})]).process(await fs.readFile(path.join(root,'src/app/globals.css'),'utf8'),{from:path.join(root,'src/app/globals.css')});
    await fs.writeFile(path.join(temp,'globals.css'),css.css);
    server=http.createServer(async(req,res)=>{
      try {
        const url=new URL(req.url,'http://localhost');
        if(url.pathname==='/') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/motion-responsive.css"><div id="root"></div><script src="/motion-responsive.js"></script>');}
        else {const name=path.basename(url.pathname);const file=name.endsWith('.png')?path.join(root,'public',name):path.join(temp,name);res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'image/png');res.end(await fs.readFile(file));}
      } catch {res.statusCode=404;res.end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
    const origin=`http://127.0.0.1:${server.address().port}`;
    let checks=0;
    for(const reducedMotion of ['no-preference','reduce'].filter(x=>!process.env.WEB_C_MOTION || x===process.env.WEB_C_MOTION)) {
      const context=await browser.newContext({reducedMotion,hasTouch:true,isMobile:true});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.message)});
      for(const area of ['login','admin','clearance','department'].filter(x=>!process.env.WEB_C_AREA || x===process.env.WEB_C_AREA)) for(const [width,height] of [[320,568],[390,844],[844,390],[1280,800]]) {
        await page.setViewportSize({width,height});
        await page.goto(`${origin}/?area=${area}`);
        await page.waitForTimeout(280);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${area} overflow ${width}`);
        if(area==='login') {
          const button=page.getByRole('button',{name:'SIGN IN WITH YOUR STI O365 ACCOUNT'});
          await button.scrollIntoViewIfNeeded();assert(await button.isVisible());
          if(reducedMotion==='reduce') assert.equal(await page.locator('[class*="loginCard"]').evaluate(e=>getComputedStyle(e).transform),'none');
        } else {
          await page.getByRole('button',{name:'Bottom action'}).scrollIntoViewIfNeeded();
          const bottom=await page.getByRole('button',{name:'Bottom action'}).boundingBox();assert(bottom.y>=0 && bottom.y+bottom.height<=height);
          await page.evaluate(() => {
            window.drawerFrames=[];
            const until=performance.now()+500;
            const sample=()=>{
              const dialog=[...document.querySelectorAll('dialog.app-drawer')].at(-1);
              const panel=dialog?.querySelector('.app-drawer-panel');
              if(dialog?.open && panel) {
                const b=panel.getBoundingClientRect();
                window.drawerFrames.push({x:b.x,y:b.y,w:b.width,h:b.height});
              }
              if(performance.now()<until)requestAnimationFrame(sample);
            };requestAnimationFrame(sample);
          });
          await page.getByRole('button',{name:'Notifications',exact:true}).click();
          let drawer=page.locator('dialog[open]');await drawer.waitFor();
          await page.waitForTimeout(260);
          assert(await drawer.evaluate(e=>e.contains(document.activeElement)),'focus enters drawer');
          const panel=page.locator('dialog.app-drawer').last().locator('.app-drawer-panel');
          const bounds=await panel.boundingBox();assert(bounds.x>=-1 && bounds.x+bounds.width<=width+1);
          const frames=await page.evaluate(()=>window.drawerFrames);
          assert(frames.length>1,'sample the notification entrance across multiple frames');
          for(const frame of frames) {
            assert(Math.abs(frame.x-bounds.x)<=1 && Math.abs(frame.y-bounds.y)<=1,
              `notification center fades in place: ${JSON.stringify(frames)}`);
          }
          assert.equal(await panel.evaluate(e=>getComputedStyle(e).transform),'none','notification center has no sliding or scaling');
          if(reducedMotion==='reduce') assert.equal(await panel.evaluate(e=>getComputedStyle(e).transform),'none');
          await page.keyboard.press('Escape');await page.waitForTimeout(40);
          if(reducedMotion==='no-preference') {
            assert.equal(await page.locator('dialog.app-drawer').last().evaluate(e=>getComputedStyle(e).display),'flex','exit remains visible while transitioning');
            const exiting=await panel.boundingBox();
            assert(exiting && exiting.x>=bounds.x-1,`notification exit stays anchored right: ${exiting?.x} >= ${bounds.x-1}`);
          }
          await page.waitForTimeout(240);
          assert.equal(await page.locator('dialog[open]').count(),0);
          assert.equal(await page.getByRole('button',{name:'Notifications',exact:true}).evaluate(e=>e===document.activeElement),true,'focus returns');
          await page.getByRole('button',{name:'Long dialog'}).click();
          const modal=page.locator('[data-slot="dialog-content"]');await modal.waitFor();
          const box=await modal.boundingBox();assert(box.y>=-1 && box.y+box.height<=height+1,'dialog fits viewport');
          await modal.getByRole('button',{name:'Final action'}).scrollIntoViewIfNeeded();
          const action=await modal.getByRole('button',{name:'Final action'}).boundingBox();assert(action.y>=0 && action.y+action.height<=height);
          await page.keyboard.press('Escape');
          if(width<1024) {
            await page.getByRole('button',{name:'Navigation',exact:true}).click();
            await page.waitForTimeout(260);
            drawer=page.locator('dialog[open]');await drawer.waitFor();
            if(width===390 && area==='department' && reducedMotion==='no-preference') await page.screenshot({path:'/tmp/webc-department-drawer.png'});
            if(area==='department') {
              await drawer.getByRole('button',{name:'Switch portal view'}).click();
              const menu=page.getByRole('menu');await menu.waitFor();
              assert(await menu.evaluate(e=>!!e.closest('dialog[open]')),'switcher menu stays in modal top layer');
              await menu.getByRole('menuitem').click();
              await page.waitForTimeout(280);
              assert.equal(await page.locator('dialog[open]').count(),0,'switching portals closes mobile navigation');
              await page.getByRole('button',{name:'Navigation',exact:true}).click();await page.waitForTimeout(260);
            }
            await page.keyboard.press('Tab');assert(await drawer.evaluate(e=>e.contains(document.activeElement)),'focus remains trapped');
            await page.keyboard.press('Escape');await page.waitForTimeout(280);
            await page.getByRole('button',{name:'Navigation',exact:true}).click();await page.waitForTimeout(260);
            await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(280);
            assert.equal(await page.locator('dialog[open]').count(),0,'mobile drawer closes on desktop');
            await page.setViewportSize({width,height});
          }
        }
        if(area!=='login') {
          await page.getByRole('button',{name:'Requirement details',exact:true}).click();
          for(const title of ['Previous requirement','Next requirement','Previous department: Cashier','Next department: Registrar']) {
            const control=page.locator(`button[title="${title}"]`);
            const box=await control.boundingBox();assert(box && box.x>=0 && box.y>=0 && box.x+box.width<=width && box.y+box.height<=height,`${title} stays on screen at ${width}`);
          }
          await page.getByRole('button',{name:'Close modal',exact:true}).click();
          await page.getByRole('button',{name:'Confirm changes',exact:true}).click();
          const confirm=page.getByRole('button',{name:'Proceed with changes'});await confirm.scrollIntoViewIfNeeded();
          const box=await confirm.boundingBox();assert(box.y>=0 && box.y+box.height<=height,'confirmation action stays reachable');
          await confirm.click();
        }
        checks++;
        console.log(`  ${reducedMotion}: ${area} ${width}x${height}`);
      }
      assert.deepEqual(errors,[]);await context.close();
    }
    if(process.env.WEB_C_BASE_URL) {
      const page=await browser.newPage();
      for(const [width,height] of [[320,568],[390,844],[844,390],[1280,800]]) {
        await page.setViewportSize({width,height});await page.goto(process.env.WEB_C_BASE_URL);
        const signin=page.getByRole('button',{name:'SIGN IN WITH YOUR STI O365 ACCOUNT'});await signin.waitFor();
        await signin.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const box=await signin.boundingBox();assert(box.x>=0 && box.y>=0 && box.x+box.width<=width && box.y+box.height<=height);
        await page.screenshot({path:path.join('/tmp',`webc-login-${width}.png`)});
      }
      await page.close();console.log('PASS: actual app landing page at four widths (OAuth not submitted).');
    }
    console.log(`PASS: ${checks} fixture layout/motion cases; focus, Escape, reachable actions, staff menu and resize checks.`);
  } finally {
    if(browser) await browser.close();
    if(server) await new Promise(resolve=>server.close(resolve));
    await fs.rm(temp,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1});
