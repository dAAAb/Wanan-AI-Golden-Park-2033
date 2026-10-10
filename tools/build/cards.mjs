// Render the title cards in tools/build/cards.html (GitHub social preview, demo-video intro/outro).
// usage: node tools/build/cards.mjs <outdir> [baseUrl]   (baseUrl serves the repo root, e.g. npx http-server)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const out = process.argv[2] || 'docs';
const base = process.argv[3] || 'http://127.0.0.1:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [card, w, h, file] of [['social', 1280, 640, 'social-preview.jpg'], ['intro', 1280, 720, 'card-intro.jpg'], ['outro', 1280, 720, 'card-outro.jpg']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${base}/tools/build/cards.html?card=${card}`);
  await p.waitForSelector('body[data-ready="1"]');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${file}`, type: 'jpeg', quality: 90 });
  console.log(file);
  await p.close();
}
await b.close();
