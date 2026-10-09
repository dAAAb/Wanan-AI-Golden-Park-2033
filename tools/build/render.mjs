// Render marketing stills of the 3D scene with headless Chromium (SwiftShader).
// usage: node tools/build/render.mjs <outdir> [baseUrl]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const out = process.argv[2] || 'assets/renders';
const base = process.argv[3] || 'http://127.0.0.1:8123/3d/';
const only = process.argv[4] ? process.argv[4].split(',') : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(base);
await p.waitForFunction(() => window.__S && window.__S.ready, null, { timeout: 240000 });
await p.addStyleTag({ content: '.lbl.small,.lbl.cp,#toast{display:none!important} .lbl{font-size:22px!important}' });
await p.evaluate(() => { __api.hud(false); document.getElementById('hud').style.display = ''; for (const id of ['mission', 'stats', 'toolbar', 'radar', 'speedo']) document.getElementById(id).style.display = 'none'; document.getElementById('hud').hidden = false; });
const Z = await p.evaluate(() => ({ R: { c: __api.R.c, u: __api.R.u, n: __api.R.n, L: __api.R.L }, z: __api.zones() }));
const c = Z.R.c, zc = Z.z;
const shots = [
  { name: 'aerial-2026', year: 0, time: 0, cam: [c[0] - 1500, 1050, c[1] + 1750, c[0] + 150, 0, c[1] - 150] },
  { name: 'aerial-2033', year: 1, time: 0, cam: [c[0] - 1500, 1050, c[1] + 1750, c[0] + 150, 0, c[1] - 150] },
  { name: 'night-2033', year: 1, time: 1, cam: [c[0] - 1500, 1050, c[1] + 1750, c[0] + 150, 0, c[1] - 150] },
  { name: 'park-2033', year: 1, time: 0, cam: [zc.park[0] - 820, 260, zc.park[1] + 420, zc.park[0] + 100, 0, zc.park[1] - 80] },
  { name: 'ai-2033', year: 1, time: 0, cam: [zc.ai[0] + 520, 230, zc.ai[1] + 560, zc.ai[0] - 40, 110, zc.ai[1]] },
  { name: 'live-2033', year: 1, time: 0, cam: [zc.live[0] + 520, 240, zc.live[1] + 520, zc.live[0], 20, zc.live[1] - 60] },
  { name: 'renewal-2033', year: 1, time: 0, cam: [zc.renewal[0] + 200, 380, zc.renewal[1] + 900, zc.renewal[0] + 300, 0, zc.renewal[1]] },
  { name: 'renewal-2026', year: 0, time: 0, cam: [zc.renewal[0] + 200, 380, zc.renewal[1] + 900, zc.renewal[0] + 300, 0, zc.renewal[1]] },
  { name: 'hero-night', year: 1, time: 1, cam: [zc.ai[0] - 900, 420, zc.ai[1] + 900, zc.ai[0] + 200, 120, zc.ai[1] - 300] },
];
for (const s of shots) {
  if (only && !only.includes(s.name)) continue;
  await p.evaluate(([y, t, cam]) => { __api.year(y); __api.time(t); __api.look(...cam); }, [s.year, s.time, s.cam]);
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `${out}/${s.name}.png` });
  console.log('rendered', s.name);
}
await b.close();
