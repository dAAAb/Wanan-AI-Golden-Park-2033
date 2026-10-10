// README screenshots of the website, transcript and slide viewer (desktop + phone).
// usage: node tools/build/screenshots.mjs <outdir> [baseUrl]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const out = process.argv[2] || 'docs/screenshots';
const base = process.argv[3] || 'http://127.0.0.1:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const desk = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const phone = { ...devices['iPhone 13'], deviceScaleFactor: 2 };
const shots = [
  ['site-desktop.jpg', desk, '/index.html', null],
  ['site-mobile.jpg', phone, '/index.html', null],
  ['site-compare.jpg', desk, '/index.html', '#compare'],
  ['transcript.jpg', desk, '/transcript/index.html', null],
  ['slides.jpg', desk, '/slides/#6', null],
];
for (const [file, opts, path, sel] of shots) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  await p.goto(base + path); await p.waitForTimeout(1800);
  if (sel) {
    const el = await p.$(sel);
    if (el) { await el.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -90)); await p.waitForTimeout(1200); }
  }
  await p.screenshot({ path: `${out}/${file}`, type: 'jpeg', quality: 85 });
  console.log(file, sel ? 'section found' : '');
  await ctx.close();
}
await b.close();
