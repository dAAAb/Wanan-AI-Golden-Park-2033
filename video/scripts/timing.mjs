// Scene timing for the intro video -> src/timing.json
// Uses the real narration (public/vo/<scene>.mp3, made by the tts workflow) when present,
// otherwise estimates speech length from the text so the cut can be built before the voice exists.
// usage: node scripts/timing.mjs
import fs from 'fs';
import { execFileSync } from 'child_process';
const root = new URL('..', import.meta.url).pathname;
const FPS = 30;
const nar = JSON.parse(fs.readFileSync(root + 'narration.json', 'utf8'));
// minimum on-screen time per scene (visual needs), extra hold after the voice, and the lead-in before it
const MIN = { 's1-hook': 8, 's2-origin': 8, 's3-idea': 6, 's4-prompt': 10, 's5-build': 10, 's6-bug': 11, 's7-demo': 11, 's8-deliver': 7, 's9-cta': 7.5 };
const LEAD = { 's1-hook': 0.5, 's4-prompt': 0.3 };
const TAIL = { 's4-prompt': 6.0, 's6-bug': 1.6, 's7-demo': 1.2, 's9-cta': 2.2 };
const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// word timings of the narration take (ElevenLabs Scribe alignment) + where each scene clip was cut from it
let words = null, cuts = null;
if (fs.existsSync(root + 'public/vo/words.json') && fs.existsSync(root + 'public/vo/source.json')) {
  words = JSON.parse(fs.readFileSync(root + 'public/vo/words.json', 'utf8')).words;
  cuts = JSON.parse(fs.readFileSync(root + 'public/vo/source.json', 'utf8')).cuts;
}
// per scene: every spoken character with its time (seconds, relative to the scene's clip)
const charTimes = (() => {
  if (!words) return null;
  const scenes = [[]];
  for (const w of words) {
    if (/^\[pause\]$/.test(w.text)) { scenes.push([]); continue; }
    const txt = w.text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, '');
    // spread the token's time over its parts: a Latin word ~1.6 syllables, a CJK character 1, punctuation a short beat
    const units = txt.match(/[A-Za-z0-9.]+|./g) || [];
    const wt = (u) => (/^[A-Za-z0-9.]+$/.test(u) ? 1.6 : /[，。：；！？、「」…—]/.test(u) ? 0.6 : 1);
    const tot = units.reduce((a, u) => a + wt(u), 0) || 1;
    let acc2 = 0;
    for (const u of units) { const at = w.start + ((w.end - w.start) * acc2) / tot; for (const ch of u) scenes[scenes.length - 1].push([ch, at]); acc2 += wt(u); }
  }
  return scenes.map((c, i) => c.map(([ch, x]) => [ch, x - Math.max(0, (cuts[i]?.[0] ?? 0) - 0.08)]));
})();
// visual beats pinned to the moment a phrase is spoken (frames from scene start)
const MARKS = {
  's1-hook': { flip: '四點零六分' },
  's2-origin': { hl0: '逐字稿', hl1: '簡報', hl2: '沒耐心' },
  's3-idea': { a: '聽說', b: '網友也做過', c: '那，就一次' },
  's5-build': { b: '再寫' },
  's6-bug': { b: '它追到', c: '幾行' },
  's7-demo': { c1: '按下時光機', c2: '一百一十' },
};

let t = 0, hasVoice = true;
const scenes = nar.scenes.map((s) => {
  const vo = `vo/${s.id}.mp3`, path = root + 'public/' + vo;
  let speech;
  if (fs.existsSync(path)) speech = dur(path);
  else { hasVoice = false; speech = s.text.replace(/\s+/g, '').length / 4.6; }   // ~4.6 characters/s for zh-TW narration
  const lead = LEAD[s.id] ?? 0.25;
  const len = Math.max(MIN[s.id] ?? 6, lead + speech + (TAIL[s.id] ?? 0.45));
  // subtitle chunks: split on punctuation, timed in proportion to their length across the speech
  const parts = s.sub.split(/(?<=[，。：；！？｜→]|——)/).map((x) => x.trim()).filter((x) => x.replace(/[—→\s]/g, '').length);
  const total = parts.reduce((a, p) => a + p.length, 0);
  let acc = 0;
  const cc = charTimes && charTimes[nar.scenes.indexOf(s)];
  const ct = cc && cc.map((x) => x[1]);
  const spoken = cc ? cc.map((x) => x[0]).join('') : s.text.replace(/\s+/g, '');
  const marks = {};
  for (const [k, ph] of Object.entries(MARKS[s.id] || {})) {
    const i = spoken.indexOf(ph.replace(/\s+/g, ''));
    if (i >= 0) marks[k] = Math.round((lead + (ct ? ct[i] : (i / spoken.length) * speech)) * FPS);
  }
  // a subtitle chunk starts when the narration reaches the same fraction of the scene's spoken characters
  const at = (frac) => ct && ct.length ? lead + ct[Math.min(ct.length - 1, Math.floor(frac * ct.length))] - (frac > 0 ? 0 : 0.15) : lead + frac * speech;
  const subs = parts.map((p) => { const a = at(acc / total); acc += p.length; const b = acc >= total ? lead + speech : at(acc / total); return { text: p.replace(/[，。；｜—]+$/, ''), from: Math.max(0, Math.round(a * FPS)), to: Math.round(b * FPS) }; });
  const out = { id: s.id, from: Math.round(t * FPS), frames: Math.round(len * FPS), voFrom: Math.round(lead * FPS), speechFrames: Math.round(speech * FPS), vo: fs.existsSync(path) ? vo : null, subs, marks };
  t += len;
  return out;
});
const timing = { fps: FPS, hasVoice, totalFrames: Math.round(t * FPS), scenes };
fs.writeFileSync(root + 'src/timing.json', JSON.stringify(timing, null, 1));
console.log(`${hasVoice ? 'voice' : 'estimated'} timing: ${t.toFixed(1)} s`, scenes.map((s) => `${s.id} ${(s.frames / FPS).toFixed(1)}s`).join(' | '));
