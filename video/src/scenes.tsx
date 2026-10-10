import React from 'react';
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { C, MONO, SANS } from './theme';
import { Bg, Chip, clamp, CodePanel, ease, Footage, Kicker, Phone, Roll, Shot, usePop, useRamp } from './ui';
import { CODE_FIX, CODE_GLSL, CODE_NAN, CODE_OSM, COMMENT, COMMENT_HL, PROMPT } from './content';

export type SceneProps = { dur: number; vo: number; speech: number; modelLabel: string };
const big = (size: number, color = C.white): React.CSSProperties => ({ fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 1.12, color, textAlign: 'center', textWrap: 'balance' } as React.CSSProperties);

// 1 — the hook: 14:20 prompt -> 16:06 live, over the time machine
export const S1Hook: React.FC<SceneProps> = ({ vo, speech }) => {
  const f = useCurrentFrame();
  const flipAt = vo + Math.round(speech * 0.5);
  const card = usePop(0, 13);
  const flip = interpolate(f, [flipAt, flipAt + 22], [0, 1], clamp);
  const badge = usePop(flipAt + 16, 10, 0.6);
  const head = usePop(flipAt + 26);
  return (
    <AbsoluteFill>
      <Footage src="clips/timemachine.mp4" trim={90} cover={1.25} dim={0.5} zoom={[1.0, 1.1]} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40, paddingBottom: 220 }}>
        <div style={{ transform: `scale(${0.7 + card * 0.3})`, opacity: card, background: 'rgba(6,13,29,.82)', border: `3px solid ${C.gold}`, borderRadius: 44, padding: '40px 70px 50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 44, color: C.cream }}>10/9　{flip < 0.5 ? '下 prompt' : '網站上線'}</div>
          <Roll from="14:20" to="16:06" t={flip} size={210} />
        </div>
        <div style={{ transform: `scale(${badge}) rotate(${(1 - badge) * -12}deg)`, opacity: badge }}>
          <Chip gold size={64}>⏱ 1 小時 46 分</Chip>
        </div>
        <div style={{ ...big(76), opacity: head, transform: `translateY(${(1 - head) * 30}px)`, padding: '0 60px' }}>
          幾句 prompt →<br /><span style={{ color: C.gold }}>一座可以開車的 3D 臺北</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 2 — the comment that started it
export const S2Origin: React.FC<SceneProps> = ({ vo, speech }) => {
  const f = useCurrentFrame();
  const card = usePop(4, 15);
  const hlAt = (k: number) => vo + Math.round(speech * [0.25, 0.45, 0.72][k]);
  const text = COMMENT.join('\n');
  // paint each highlighted phrase with a marker sweep
  const parts: React.ReactNode[] = [];
  let rest = text, key = 0;
  while (rest.length) {
    let best = -1, which = -1;
    COMMENT_HL.forEach((h, k) => { const i = rest.indexOf(h); if (i >= 0 && (best < 0 || i < best)) { best = i; which = k; } });
    if (best < 0) { parts.push(rest); break; }
    parts.push(rest.slice(0, best));
    const h = COMMENT_HL[which]; const p = interpolate(f, [hlAt(which), hlAt(which) + 14], [0, 100], { ...clamp, easing: ease });
    parts.push(<span key={key++} style={{ backgroundImage: `linear-gradient(90deg, ${C.gold} ${p}%, transparent ${p}%)`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 0.5em', backgroundPosition: '0 88%', color: p > 0 ? C.white : undefined }}>{h}</span>);
    rest = rest.slice(best + h.length);
  }
  return (
    <AbsoluteFill>
      <Bg />
      <Kicker>一切的起點</Kicker>
      <div style={{ position: 'absolute', top: 120, left: 40, fontFamily: 'serif', fontSize: 420, color: 'rgba(255,200,61,.12)', lineHeight: 1 }}>“</div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 260 }}>
        <div style={{ width: 960, transform: `translateY(${(1 - card) * 160}px)`, opacity: card, background: '#16213d', border: '2px solid rgba(255,255,255,.14)', borderRadius: 34, padding: '40px 46px', boxShadow: '0 40px 90px rgba(0,0,0,.45)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 26 }}>
            <div style={{ width: 82, height: 82, borderRadius: 41, background: '#56627e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46 }}>👤</div>
            <div>
              <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 38, color: C.white }}>一位網友</div>
              <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.muted }}>留言 · 2026 年 10 月</div>
            </div>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 46, lineHeight: 1.6, color: '#e7ecf6', whiteSpace: 'pre-wrap' }}>{parts}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 3 — the idea: three pieces snap together
export const S3Idea: React.FC<SceneProps> = ({ vo, speech, modelLabel }) => {
  const f = useCurrentFrame();
  const at = [vo + 4, vo + Math.round(speech * 0.35), vo + Math.round(speech * 0.62)];
  const pops = at.map((a) => usePop(a, 12));
  const merge = usePop(vo + Math.round(speech * 0.8), 11);
  const items: [string, string, string][] = [['🤖', modelLabel, '寫 3D 網站很強'], ['🌐', 'three.js', '3D 臺北'], ['🚕', 'GTA 台北', '網友的經典作品']];
  return (
    <AbsoluteFill>
      <Bg />
      <Kicker>我就想……</Kicker>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34, paddingBottom: 300 }}>
        {items.map(([ic, a, b], i) => (
          <div key={i} style={{ width: 860, display: 'flex', alignItems: 'center', gap: 30, padding: '30px 40px', borderRadius: 30, background: i === 0 ? 'rgba(255,200,61,.14)' : 'rgba(255,255,255,.07)', border: `2px solid ${i === 0 ? C.gold : 'rgba(255,255,255,.2)'}`, opacity: pops[i], transform: `translateX(${(1 - pops[i]) * (i % 2 ? 700 : -700)}px) scale(${1 - merge * 0.08})` }}>
            <div style={{ fontSize: 84 }}>{ic}</div>
            <div>
              <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 60, color: i === 0 ? C.gold : C.white, lineHeight: 1.1 }}>{a}</div>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: C.muted }}>{b}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 20, opacity: merge, transform: `scale(${0.6 + merge * 0.4}) rotate(${(1 - merge) * 8}deg)` }}>
          <Chip gold size={78}>＝ 一次做到底！</Chip>
        </div>
      </AbsoluteFill>
      {f < 0 ? null : null}
    </AbsoluteFill>
  );
};

// 4 — the whole prompt, typed out
export const S4Prompt: React.FC<SceneProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const n = PROMPT.length;
  const typeEnd = Math.round(dur * 0.62);
  const shown = Math.floor(interpolate(f, [8, typeEnd], [0, n], clamp));
  const sent = usePop(typeEnd + 8, 10);
  const lines = PROMPT.slice(0, shown).split('\n').length;
  const scroll = Math.max(0, lines - 14) * 58;
  const win = usePop(0, 16);
  return (
    <AbsoluteFill>
      <Bg />
      <Kicker y={210}>我的完整 prompt</Kicker>
      <div style={{ position: 'absolute', top: 285, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Chip size={30}>就這 {n} 個字 · 下午 2:20 送出</Chip>
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 380, height: 1020, borderRadius: 34, background: '#0e1730', border: '2px solid rgba(255,200,61,.45)', boxShadow: '0 40px 90px rgba(0,0,0,.5)', overflow: 'hidden', opacity: win, transform: `translateY(${(1 - win) * 80}px)` }}>
        <div style={{ position: 'absolute', left: 44, right: 44, top: 36 - scroll, fontFamily: SANS, fontWeight: 700, fontSize: 38, lineHeight: '58px', color: '#e7ecf6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {PROMPT.slice(0, shown)}
          <span style={{ display: 'inline-block', width: 4, height: 44, marginLeft: 4, verticalAlign: 'middle', background: C.gold, opacity: Math.floor(f / 8) % 2 ? 1 : 0.15 }} />
        </div>
        <div style={{ position: 'absolute', right: 30, bottom: 30, width: 110, height: 110, borderRadius: 55, background: sent > 0.01 ? C.gold : 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 58, color: '#1a1200', transform: `scale(${1 + sent * 0.15 - Math.max(0, sent - 1) * 0.15})`, boxShadow: sent > 0.01 ? `0 0 ${60 * sent}px rgba(255,200,61,.7)` : 'none' }}>↑</div>
      </div>
      <div style={{ position: 'absolute', top: 1420, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: sent, transform: `scale(${0.8 + sent * 0.2})` }}>
        <Chip gold size={44}>送出 ✓ 剩下的交給 AI</Chip>
      </div>
    </AbsoluteFill>
  );
};

// 5 — OSM -> 60,000 buildings, then the window shader
export const S5Build: React.FC<SceneProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const half = Math.round(dur * 0.5);
  const count = Math.round(interpolate(f, [20, half - 20], [0, 60000], { ...clamp, easing: ease }));
  const b = useRamp(half - 8, half + 8);
  const night = useRamp(half + 20, dur);
  return (
    <AbsoluteFill>
      <Bg />
      {/* A: OpenStreetMap -> buildings */}
      <AbsoluteFill style={{ opacity: 1 - b, transform: `translateY(${-b * 120}px)` }}>
        <Kicker y={200}>抓 OpenStreetMap，猜每棟樓多高</Kicker>
        <div style={{ position: 'absolute', top: 290, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <CodePanel file="tools/build/build_city.py" lang="Python" lines={CODE_OSM} at={6} perLine={5} size={27} />
        </div>
        <div style={{ position: 'absolute', top: 1010, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 170, color: C.gold, lineHeight: 1 }}>{count.toLocaleString('en-US')}</div>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 50, color: C.white }}>棟真實建築 → 3D</div>
        </div>
      </AbsoluteFill>
      {/* B: GLSL windows at night */}
      <AbsoluteFill style={{ opacity: b, transform: `translateY(${(1 - b) * 120}px)` }}>
        <Kicker y={200}>寫 shader，讓窗戶在夜裡亮起來</Kicker>
        <div style={{ position: 'absolute', top: 290, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Sequence from={half} layout="none"><CodePanel file="3d/js/city.js" lang="GLSL" lines={CODE_GLSL} at={0} perLine={4} size={26} /></Sequence>
        </div>
        <div style={{ position: 'absolute', top: 960, left: 50, right: 50, height: 470, borderRadius: 28, overflow: 'hidden', border: '2px solid rgba(255,255,255,.15)' }}>
          <Img src={staticFile('img/aerial-2033.jpg')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.15 - night * 0.1})` }} />
          <Img src={staticFile('img/hero-night.jpg')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: night, transform: `scale(${1.15 - night * 0.1})` }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 6 — the black-block bug and the fix
export const S6Bug: React.FC<SceneProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const a = Math.round(dur * 0.3), c = Math.round(dur * 0.74);
  const bubble = usePop(4, 13);
  const toB = useRamp(a - 6, a + 8);
  const toC = useRamp(c - 6, c + 8);
  const ok = usePop(c + 10, 10);
  const jitter = f < a ? Math.sin(f * 2.3) * 6 * (Math.floor(f / 3) % 2) : 0;
  return (
    <AbsoluteFill>
      <Bg tint={f < a ? 'rgba(255,0,60,.05)' : undefined} />
      {/* A: bug report */}
      <AbsoluteFill style={{ opacity: 1 - toB }}>
        <Kicker y={200}>我負責當 QA</Kicker>
        <div style={{ position: 'absolute', top: 300, right: 60, maxWidth: 820, transform: `scale(${bubble})`, transformOrigin: '100% 0', background: C.gold, color: '#1a1200', borderRadius: '36px 36px 8px 36px', padding: '26px 36px', fontFamily: SANS, fontWeight: 900, fontSize: 48 }}>啟動未來的時候，會閃黑色方塊 🤔</div>
        <div style={{ position: 'absolute', top: 520, left: 40, right: 40, height: 625, borderRadius: 28, overflow: 'hidden', border: `3px solid ${C.red}`, transform: `translateX(${jitter}px)` }}>
          <Img src={staticFile('img/bug-before.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f % 9 < 2 ? 'hue-rotate(90deg) saturate(2)' : 'none' }} />
          <div style={{ position: 'absolute', left: 20, top: 20 }}><Chip size={30} style={{ background: C.red, borderColor: C.red }}>BUG：畫面 69% 變黑</Chip></div>
        </div>
      </AbsoluteFill>
      {/* B: the root cause + diff */}
      <AbsoluteFill style={{ opacity: toB * (1 - toC) }}>
        <Kicker y={200}>AI 追到根因</Kicker>
        <div style={{ position: 'absolute', top: 290, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
          <Sequence from={a} layout="none"><CodePanel file="three.js · instancing" lang="GLSL" lines={CODE_NAN} at={0} perLine={4} size={26} /></Sequence>
          <Sequence from={a + 30} layout="none"><CodePanel file="3d/js/main.js" lang="diff" lines={CODE_FIX} at={0} perLine={6} size={27} /></Sequence>
        </div>
      </AbsoluteFill>
      {/* C: fixed */}
      <AbsoluteFill style={{ opacity: toC }}>
        <Kicker y={200}>幾行就修好</Kicker>
        <div style={{ position: 'absolute', top: 300, left: 40, right: 40, height: 625, borderRadius: 28, overflow: 'hidden', border: `3px solid ${C.green}` }}>
          <Img src={staticFile('img/bug-after.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ position: 'absolute', top: 990, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${ok})` }}>
          <Chip gold size={60}>✅ 黑色畫面 69% → 0%</Chip>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 7 — the real thing: drive, time machine, central park
export const S7Demo: React.FC<SceneProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const c1 = Math.round(dur * 0.2), c2 = Math.round(dur * 0.62);
  const t300 = usePop(c1 + 40, 11), t110 = usePop(c2 + 15, 11);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={c1}><Footage src="clips/drive.mp4" trim={60} zoom={[1, 1.05]} /></Sequence>
      <Sequence from={c1} durationInFrames={c2 - c1}><Footage src="clips/timemachine.mp4" trim={30} zoom={[1, 1.06]} /></Sequence>
      <Sequence from={c2}><Footage src="clips/tour.mp4" trim={60} zoom={[1, 1.05]} /></Sequence>
      <div style={{ position: 'absolute', top: 200, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><Chip size={30}>🎮 實機畫面 · 瀏覽器直接玩</Chip></div>
      {f >= c1 && f < c2 ? <div style={{ position: 'absolute', top: 1250, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${t300})` }}><Chip gold size={64}>300 公頃 臺北AI園區</Chip></div> : null}
      {f >= c2 ? <div style={{ position: 'absolute', top: 1250, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${t110})` }}><Chip gold size={64} style={{ background: C.green, borderColor: C.green, color: '#04210d' }}>🌳 110 公頃 中央公園</Chip></div> : null}
    </AbsoluteFill>
  );
};

// 8 — everything else: big-type site, transcript, slides, on a phone
export const S8Deliver: React.FC<SceneProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const shots = ['img/phone-home.png', 'img/phone-transcript.png', 'img/phone-slides.png'];
  const seg = dur / shots.length;
  const i = Math.min(shots.length - 1, Math.floor(f / seg));
  const local = f - i * seg;
  const phone = usePop(0, 15);
  const labels: [string, number][] = [['🔤 大字懶人包', 0], ['📜 逐字稿', 1], ['📊 16 頁簡報', 2]];
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 200 }}>
        <div style={{ transform: `translateY(${(1 - phone) * 300}px)`, opacity: phone }}>
          <Phone width={560}>
            {shots.map((s, k) => {
              const o = k === i ? interpolate(local, [0, 8], [k === 0 ? 1 : 0, 1], clamp) : k === i - 1 ? interpolate(local, [0, 8], [1, 0], clamp) : 0;
              const scroll = k === i ? interpolate(local, [10, seg], [0, -120], clamp) : 0;
              return <Shot key={s} src={s} style={{ position: 'absolute', top: scroll, opacity: o }} />;
            })}
          </Phone>
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 1390, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
        {labels.map(([t, k]) => <Chip key={t} gold={k === i} size={36}>{t}</Chip>)}
      </div>
    </AbsoluteFill>
  );
};

// 9 — call to action
export const S9Cta: React.FC<SceneProps> = () => {
  const url = usePop(4, 10, 0.6);
  const gh = usePop(26);
  const s1 = usePop(46), s2 = usePop(60);
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <Img src={staticFile('img/hero-night.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.25 + f * 0.0012})`, filter: 'blur(7px) brightness(.38) saturate(1.2)' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34, paddingBottom: 260 }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 46, color: C.cream, opacity: url }}>👇 現在就去開車</div>
        <div style={{ transform: `scale(${url})`, background: C.gold, color: '#1a1200', fontFamily: SANS, fontWeight: 900, fontSize: 112, borderRadius: 40, padding: '18px 54px', boxShadow: `0 0 ${80 * url}px rgba(255,200,61,.55)` }}>ai2033.taipei</div>
        <div style={{ opacity: gh, transform: `translateY(${(1 - gh) * 20}px)`, fontFamily: MONO, fontWeight: 700, fontSize: 32, color: C.white, background: 'rgba(6,13,29,.7)', padding: '12px 24px', borderRadius: 16 }}>github.com/dAAAb/Wanan-AI-Golden-Park-2033</div>
        <div style={{ opacity: gh, fontFamily: SANS, fontWeight: 900, fontSize: 36, color: C.green }}>程式碼全部開源</div>
        <div style={{ ...big(86), marginTop: 30, opacity: s1, transform: `translateY(${(1 - s1) * 30}px)` }}>AI黃金世紀，<br /><span style={{ color: C.gold }}>從臺北開始！</span></div>
        <div style={{ opacity: s2, fontFamily: SANS, fontWeight: 900, fontSize: 46, color: C.cream }}>大台北 ＝ 亞洲新矽谷</div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 24, color: 'rgba(255,255,255,.6)' }}>非官方粉絲作品 · 地圖 © OpenStreetMap 貢獻者 · 園區配置為示意</div>
    </AbsoluteFill>
  );
};
