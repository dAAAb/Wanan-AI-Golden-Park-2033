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
const TAIL = { 's4-prompt': 6.0, 's7-demo': 1.2, 's9-cta': 2.2 };
const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

let t = 0, hasVoice = true;
const scenes = nar.scenes.map((s) => {
  const vo = `vo/${s.id}.mp3`, path = root + 'public/' + vo;
  let speech;
  if (fs.existsSync(path)) speech = dur(path);
  else { hasVoice = false; speech = s.text.replace(/\s+/g, '').length / 4.6; }   // ~4.6 characters/s for zh-TW narration
  const lead = LEAD[s.id] ?? 0.25;
  const len = Math.max(MIN[s.id] ?? 6, lead + speech + (TAIL[s.id] ?? 0.45));
  // subtitle chunks: split on punctuation, timed in proportion to their length across the speech
  const parts = s.sub.split(/(?<=[，。：；！？—→｜])/).map((x) => x.trim()).filter(Boolean);
  const total = parts.reduce((a, p) => a + p.length, 0);
  let acc = 0;
  const subs = parts.map((p) => { const a = lead + (acc / total) * speech; acc += p.length; return { text: p.replace(/[，。；｜]$/, ''), from: Math.round(a * FPS), to: Math.round((lead + (acc / total) * speech) * FPS) }; });
  const out = { id: s.id, from: Math.round(t * FPS), frames: Math.round(len * FPS), voFrom: Math.round(lead * FPS), speechFrames: Math.round(speech * FPS), vo: fs.existsSync(path) ? vo : null, subs };
  t += len;
  return out;
});
const timing = { fps: FPS, hasVoice, totalFrames: Math.round(t * FPS), scenes };
fs.writeFileSync(root + 'src/timing.json', JSON.stringify(timing, null, 1));
console.log(`${hasVoice ? 'voice' : 'estimated'} timing: ${t.toFixed(1)} s`, scenes.map((s) => `${s.id} ${(s.frames / FPS).toFixed(1)}s`).join(' | '));
