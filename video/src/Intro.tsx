import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion';
import timing from './timing.json';
import narration from '../narration.json';
import { loadFonts } from './fonts';
import { C } from './theme';
import { Brand, Progress, Subtitle } from './ui';
import { CODE_FIX, CODE_GLSL, CODE_NAN, CODE_OSM, COMMENT, PROMPT } from './content';
import { S1Hook, S2Origin, S3Idea, S4Prompt, S5Build, S6Bug, S7Demo, S8Deliver, S9Cta, SceneProps } from './scenes';

export type IntroProps = { modelLabel: string; bgm: boolean };

const SCENES: Record<string, React.FC<SceneProps>> = {
  's1-hook': S1Hook, 's2-origin': S2Origin, 's3-idea': S3Idea, 's4-prompt': S4Prompt, 's5-build': S5Build,
  's6-bug': S6Bug, 's7-demo': S7Demo, 's8-deliver': S8Deliver, 's9-cta': S9Cta,
};

// sound effects per scene: [file, frame within the scene, volume]
const sfx = (id: string, d: number, vo: number, sp: number, m: Record<string, number>): [string, number, number][] => {
  switch (id) {
    case 's1-hook': { const flip = m.flip ?? vo + Math.round(sp * 0.5); return [['shimmer-sparkle-sweep', 0, 0.45], ['clock-knob-spin', flip, 0.7], ['bass-hit-short', flip + 16, 0.7]]; }
    case 's2-origin': return [['swoosh-quick', 4, 0.5]];
    case 's3-idea': { const a = m.a ?? vo + 4; return [['whoosh-fast', a, 0.35], ['whoosh-fast', a + 24, 0.35], ['whoosh-fast', m.b ?? vo + Math.round(sp * 0.62), 0.35], ['bass-hit-futuristic', m.c ?? vo + Math.round(sp * 0.8), 0.6]]; }
    case 's4-prompt': { const end = Math.round(d * 0.62); const out: [string, number, number][] = []; for (let t = 8; t < end - 20; t += 54) out.push(['typewriter-digital', t, 0.22]); out.push(['hitech-bleep', end + 8, 0.6]); return out; }
    case 's5-build': return [['data-compute', 6, 0.3], ['transition-snap', (m.b ?? Math.round(d * 0.5)) - 6, 0.5]];
    case 's6-bug': return [['glitch-static', 4, 0.45], ['glitch-static', 40, 0.3], ['sweep-scifi-fast', (m.b ?? Math.round(d * 0.3)) - 4, 0.45], ['sparkle-wand', (m.c ?? Math.round(d * 0.74)) + 4, 0.55]];
    case 's7-demo': return [['power-up-electronic', (m.c1 ?? Math.round(d * 0.2)) + 10, 0.4], ['whoosh-fast', (m.c2 ?? Math.round(d * 0.62)) - 8, 0.4]];
    case 's8-deliver': return [['swoosh-quick', Math.round(d / 3), 0.4], ['swoosh-quick', Math.round((2 * d) / 3), 0.4]];
    case 's9-cta': return [['bass-hit-futuristic', 4, 0.6], ['sparkle-wand', 12, 0.5]];
    default: return [];
  }
};

const ALL_TEXT = [PROMPT, COMMENT.join(''), ...narration.scenes.map((s) => s.sub), ...[CODE_OSM, CODE_GLSL, CODE_NAN, CODE_FIX].flat().map((l) => l.t),
  '一切的起點我就想寫網站很強網友的經典作品一次做到底我的完整就這個字下午送出剩下的交給抓猜每棟樓多高棟真實建築讓窗戶在夜裡亮起來我負責當啟動未來的時候會閃黑色方塊畫面變黑追到根因幾行就修好實機畫面瀏覽器直接玩公頃臺北園區中央公園大字懶人包逐字稿頁簡報現在就去開車程式碼全部開源黃金世紀從臺北開始大台北亞洲新矽谷非官方粉絲作品地圖貢獻者園區配置為示意網站上線下小時分幾句一座可以開車的一位留言年月三'].join('');

export const Intro: React.FC<IntroProps> = ({ modelLabel, bgm }) => {
  loadFonts(ALL_TEXT + modelLabel);
  const total = timing.totalFrames;
  const speaking = (f: number) => timing.scenes.some((s) => f >= s.from + s.voFrom && f < s.from + s.voFrom + s.speechFrames);
  return (
    <AbsoluteFill style={{ background: C.navy }}>
      {timing.scenes.map((s) => {
        const Scene = SCENES[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <Scene dur={s.frames} vo={s.voFrom} speech={s.speechFrames} modelLabel={modelLabel} marks={s.marks as Record<string, number>} />
            <Subtitle subs={s.subs} />
            {s.vo ? <Sequence from={s.voFrom} name="voice"><Audio src={staticFile(s.vo)} /></Sequence> : null}
            {sfx(s.id, s.frames, s.voFrom, s.speechFrames, s.marks as Record<string, number>).map(([file, at, vol], k) => (
              <Sequence key={k} from={Math.max(0, at)} name={file}><Audio src={staticFile(`sfx/${file}.mp3`)} volume={vol} /></Sequence>
            ))}
            {s.from > 0 ? <Audio src={staticFile('sfx/transition-snap.mp3')} volume={0.3} /> : null}
          </Sequence>
        );
      })}
      {bgm ? (
        <Audio src={staticFile('sfx/bgm.mp3')} volume={(f) => interpolate(f, [0, 30, total - 75, total], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (speaking(f) ? 0.1 : 0.2)} />
      ) : null}
      <Brand />
      <Progress total={total} />
    </AbsoluteFill>
  );
};
