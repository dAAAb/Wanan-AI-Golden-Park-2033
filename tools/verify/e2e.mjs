// End-to-end check of the public 3D page: load it in headless Chromium, wait for the city to build, screenshot.
import { chromium } from 'playwright';
const base = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const t0 = Date.now();
await p.goto(base + '/3d/index.html');
await p.waitForFunction(() => window.__S && window.__S.ready, null, { timeout: 300000 });
console.log('3D ready in', (Date.now() - t0) / 1000, 's');
await p.click('#btnStart'); await p.waitForTimeout(8000);
await p.screenshot({ path: 'research/verify/e2e-3d.png' });
await p.goto(base + '/index.html'); await p.waitForTimeout(4000);
await p.screenshot({ path: 'research/verify/e2e-site.png' });
await p.goto(base + '/transcript/index.html'); await p.waitForTimeout(3000);
await p.screenshot({ path: 'research/verify/e2e-transcript.png' });
console.log('errors:', JSON.stringify(errs));
await b.close();
