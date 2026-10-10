// Record the 3D demo video frame by frame on a virtual clock (headless Chromium + SwiftShader).
// requestAnimationFrame, performance.now and setTimeout are replaced once the scene is ready, so every
// frame advances exactly 1/FPS s of game time no matter how slowly the software renderer draws it.
// usage: node tools/build/record_demo.mjs <framesDir> [baseUrl] [fps] [maxFrames]
//   NO_CAPTION=1 hides the guided tour's own caption (for footage that gets its own subtitles, e.g. video/)
//   then: ffmpeg (see tools/build/make_demo.sh)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2] || 'demo-frames';
const base = process.argv[3] || 'http://127.0.0.1:8123/3d/';
const FPS = +(process.argv[4] || 30);
const MAX = +(process.argv[5] || 1e9);
fs.mkdirSync(out, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, screen: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => {
  // virtual clock, switched on by __vt.start(); until then everything runs in real time
  const realNow = performance.now.bind(performance), realRaf = window.requestAnimationFrame.bind(window);
  const realSetTimeout = window.setTimeout.bind(window), realClearTimeout = window.clearTimeout.bind(window);
  const vt = { on: false, now: 0, raf: [], timers: [], id: 1e6 };
  performance.now = () => (vt.on ? vt.now : realNow());
  window.requestAnimationFrame = (cb) => { if (!vt.on) return realRaf(cb); vt.raf.push(cb); return vt.raf.length; };
  window.setTimeout = (fn, ms = 0, ...a) => { if (!vt.on) return realSetTimeout(fn, ms, ...a); const id = ++vt.id; vt.timers.push({ id, at: vt.now + ms, fn: () => fn(...a) }); return id; };
  window.clearTimeout = (id) => { vt.timers = vt.timers.filter(t => t.id !== id); realClearTimeout(id); };
  window.__vt = {
    start() { vt.now = realNow(); vt.on = true; },
    tick(ms) {
      vt.now += ms;
      const due = vt.timers.filter(t => t.at <= vt.now); vt.timers = vt.timers.filter(t => t.at > vt.now); due.forEach(t => t.fn());
      const cbs = vt.raf; vt.raf = []; cbs.forEach(cb => cb(vt.now));
    },
  };
});
await p.goto(base);
await p.waitForFunction(() => window.__S && window.__S.ready, null, { timeout: 300000 });
await p.addStyleTag({ content: '#toast{display:none!important} .lbl{animation:none!important}' + (process.env.NO_CAPTION ? ' #caption{display:none!important}' : '') });
await p.click('#btnStart');
await p.waitForTimeout(2500);
// the loop's next real frame queues into the virtual one
await p.evaluate(() => { __vt.start(); __S.keys = {}; });
await p.waitForTimeout(300);

let n = 0;
const shot = async () => { await p.screenshot({ path: `${out}/f${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 }); n++; };
const run = async (secs, each) => {
  const frames = Math.round(secs * FPS);
  for (let i = 0; i < frames && n < MAX; i++) {
    await p.evaluate(([ms, code, i]) => { if (code) (0, eval)(code)(i); __vt.tick(ms); }, [1000 / FPS, each ? `(${each})` : '', i]);
    await shot();
    if (n % 60 === 0) console.log(`frame ${n} (${(n / FPS).toFixed(1)} s)`);
  }
};

// 1. drive up 敦化北路 towards the airport, HUD on
await run(7, (i) => { __S.keys = { ArrowUp: true }; });
// 2. the time machine: 2026 -> 2033 orbit (the game's own cutscene)
await p.evaluate(() => { __S.keys = {}; __api.cutscene(); });
await run(12.5);
// 3. 2033 close-ups from the guided tour: central park, AI cluster, living quarter
await p.evaluate(() => { __api.tour(15); __S.year = __S.yearTarget = 1; });
await run(19);
// 4. dusk to night over the AI park
await p.evaluate(() => { __S.timeMode = 1; __S.todTarget = 1; });
await run(6);
console.log('frames', n);
await b.close();
