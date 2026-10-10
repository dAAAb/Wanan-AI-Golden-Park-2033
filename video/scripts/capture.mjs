// Phone/desktop captures of the site for the intro video (serve the repo root first: npx http-server -p 8123 ..)
// usage: node video/scripts/capture.mjs [baseUrl]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const base = process.argv[2] || 'http://127.0.0.1:8123';
const out = new URL('../public/img/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const phone = { ...devices['iPhone 13'], deviceScaleFactor: 3 };
const shots = [
  ['phone-home.png', phone, '/index.html', null],
  ['phone-compare.png', phone, '/index.html', '#compare'],
  ['phone-plan.png', phone, '/index.html', '#plan'],
  ['phone-valley.png', phone, '/index.html', '#valley'],
  ['phone-transcript.png', phone, '/transcript/index.html', null],
  ['phone-slides.png', phone, '/slides/#2', null],
];
for (const [file, opts, path, sel] of shots) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  await p.goto(base + path); await p.waitForTimeout(1500);
  if (sel) { const el = await p.$(sel); if (el) { await el.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -60)); await p.waitForTimeout(1200); } else console.log('missing', sel); }
  await p.screenshot({ path: out + file });
  console.log(file);
  await ctx.close();
}
await b.close();
