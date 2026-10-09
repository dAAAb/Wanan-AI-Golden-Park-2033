// End-to-end check of the public site: load each page in headless Chromium, record errors, screenshot.
import { chromium } from 'playwright';
const base = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' });
const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
p.on('requestfailed', r => errs.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));
p.on('response', r => { if (r.status() >= 400) errs.push('http ' + r.status() + ' ' + r.url()); });
const t0 = Date.now();
await p.goto(base + '/3d/index.html');
await p.waitForTimeout(3000);
console.log('url', p.url(), 'title', await p.title());
console.log('body', (await p.evaluate(() => document.body ? document.body.innerText.slice(0, 400) : 'nobody')).replace(/\n/g, ' | '));
await p.screenshot({ path: 'research/verify/e2e-3d-first.png' });
for (let i = 0; i < 30; i++) {
  await p.waitForTimeout(10000);
  const st = await p.evaluate(() => ({ ready: !!(window.__S && window.__S.ready), load: (document.getElementById('loadText') || {}).textContent || document.title }));
  console.log(`t=${(Date.now() - t0) / 1000}s ready=${st.ready} load=${st.load}`);
  if (i === 2) await p.screenshot({ path: 'research/verify/e2e-3d-loading.png' });
  if (st.ready) break;
}
console.log('errors:', JSON.stringify(errs.slice(0, 30)));
try { await p.click('#btnStart', { timeout: 5000 }); await p.waitForTimeout(8000); } catch (e) { console.log('start click failed', e.message); }
await p.screenshot({ path: 'research/verify/e2e-3d.png' });
await p.goto(base + '/index.html'); await p.waitForTimeout(4000);
await p.screenshot({ path: 'research/verify/e2e-site.png' });
await p.goto(base + '/transcript/index.html'); await p.waitForTimeout(3000);
await p.screenshot({ path: 'research/verify/e2e-transcript.png' });
console.log('all errors:', JSON.stringify(errs.slice(0, 60)));
await b.close();
