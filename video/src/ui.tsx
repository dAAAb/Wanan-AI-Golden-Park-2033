import React from 'react';
import { AbsoluteFill, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C, MONO, SANS } from './theme';
import type { Line } from './content';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = Easing.bezier(0.22, 1, 0.36, 1);

// spring 0 -> 1 starting at frame `at`
export const usePop = (at = 0, damping = 14, mass = 0.7) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - at, fps, config: { damping, mass } });
};
// landscape (16:9) vs portrait (9:16) layout
export const useWide = () => { const { width, height } = useVideoConfig(); return width > height; };
// 0 -> 1 linear-eased over [a, b]
export const useRamp = (a: number, b: number) => interpolate(useCurrentFrame(), [a, b], [0, 1], { ...clamp, easing: ease });

// navy backdrop with a faint street grid drifting, like the minimap
export const Bg: React.FC<{ tint?: string }> = ({ tint }) => {
  const f = useCurrentFrame();
  const off = (f * 0.6) % 120;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 30%, ${C.navy2} 0%, ${C.navy} 55%, #060d1d 100%)` }}>
      <AbsoluteFill style={{ opacity: 0.18, backgroundImage: 'linear-gradient(rgba(255,255,255,.18) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.18) 2px, transparent 2px)', backgroundSize: '120px 120px', backgroundPosition: `${off}px ${off * 0.6}px`, transform: 'perspective(1200px) rotateX(38deg) scale(1.6)', transformOrigin: '50% 100%' }} />
      {tint ? <AbsoluteFill style={{ background: tint }} /> : null}
    </AbsoluteFill>
  );
};

// full-bleed footage: the 16:9 clip sharp in the middle, a blurred copy filling the vertical frame
// cover: fill the whole frame instead (cropping the game HUD at the edges)
export const Footage: React.FC<{ src: string; trim?: number; scale?: number; y?: number; dim?: number; zoom?: [number, number]; cover?: number }> = ({ src, trim = 0, scale = 1.32, y = 0, dim = 0, zoom = [1, 1], cover }) => {
  const f = useCurrentFrame(); const { durationInFrames, width: W, height: H } = useVideoConfig();
  const z = interpolate(f, [0, durationInFrames], zoom, clamp);
  const wide = W > H;
  if (cover || wide) {
    const k = cover ?? 1.0;
    const ch = (wide ? H : 1920) * k, cw = (ch * 16) / 9;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <OffthreadVideo src={staticFile(src)} trimBefore={trim} muted style={{ position: 'absolute', width: cw, height: ch, left: (W - cw) / 2, top: (H - ch) / 2 + y, transform: `scale(${z})` }} />
        {dim ? <AbsoluteFill style={{ background: `rgba(6,13,29,${dim})` }} /> : null}
      </AbsoluteFill>
    );
  }
  const w = 1080 * scale, h = (w * 9) / 16;
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile(src)} trimBefore={trim} muted style={{ position: 'absolute', width: 3413, height: 1920, left: (1080 - 3413) / 2, top: 0, filter: 'blur(36px) brightness(.55) saturate(1.2)' }} />
      <OffthreadVideo src={staticFile(src)} trimBefore={trim} muted style={{ position: 'absolute', width: w, height: h, left: (1080 - w) / 2, top: (1920 - h) / 2 + y, transform: `scale(${z})`, boxShadow: '0 30px 80px rgba(0,0,0,.55)' }} />
      {dim ? <AbsoluteFill style={{ background: `rgba(6,13,29,${dim})` }} /> : null}
    </AbsoluteFill>
  );
};

export const Chip: React.FC<{ children: React.ReactNode; gold?: boolean; size?: number; style?: React.CSSProperties }> = ({ children, gold, size = 34, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 1.15, padding: `${size * 0.32}px ${size * 0.6}px`, borderRadius: size * 0.6, background: gold ? C.gold : 'rgba(255,255,255,.1)', color: gold ? '#1a1200' : C.white, border: `2px solid ${gold ? C.gold : 'rgba(255,255,255,.28)'}`, whiteSpace: 'nowrap', ...style }}>{children}</div>
);

// persistent link chip for traffic
export const Brand: React.FC<{ hide?: boolean }> = ({ hide }) => {
  const wide = useWide();
  return (
    <div style={{ position: 'absolute', top: wide ? 30 : 92, right: wide ? 40 : 0, left: wide ? undefined : 0, display: 'flex', justifyContent: 'center', opacity: hide ? 0 : 1 }}>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: wide ? 26 : 30, color: C.white, background: 'rgba(6,13,29,.72)', border: '2px solid rgba(255,200,61,.6)', borderRadius: 999, padding: '10px 26px', letterSpacing: 0.5 }}>
        臺北 2033 <span style={{ color: C.gold }}>· ai2033.taipei</span>
      </div>
    </div>
  );
};

// subtitle for the current chunk, bottom third (clear of the Reels/Shorts buttons)
export const Subtitle: React.FC<{ subs: { text: string; from: number; to: number }[] }> = ({ subs }) => {
  const f = useCurrentFrame();
  const wide = useWide();
  const i = subs.findIndex((s, k) => f >= s.from && (f < (subs[k + 1]?.from ?? s.to + 20)));
  if (i < 0) return null;
  const s = subs[i];
  const a = interpolate(f, [s.from, s.from + 5], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: wide ? 200 : 60, right: wide ? 200 : 60, ...(wide ? { bottom: 56 } : { top: 1500 }), display: 'flex', justifyContent: 'center' }}>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: wide ? 46 : 54, lineHeight: 1.32, color: C.white, textAlign: 'center', textWrap: 'balance', padding: '14px 28px', borderRadius: 22, background: 'rgba(6,13,29,.78)', opacity: a, transform: `translateY(${(1 - a) * 14}px)`, textShadow: '0 2px 0 rgba(0,0,0,.4)' } as React.CSSProperties}>{s.text}</div>
    </div>
  );
};

export const Progress: React.FC<{ total: number }> = ({ total }) => {
  const f = useCurrentFrame();
  return <div style={{ position: 'absolute', left: 0, bottom: 0, height: 10, width: `${(f / total) * 100}%`, background: C.gold }} />;
};

// ---------- code ----------
const KW = /\b(for|in|if|elif|else|or|and|not|continue|return|const|let|float|vec2|vec3|vec4|mat3|uniform|varying|def|import|from)\b/g;
const tokenize = (s: string) => {
  // comments first, then strings / numbers / keywords
  const ci = s.search(/(\/\/|#(?!include))/);
  const code = ci >= 0 ? s.slice(0, ci) : s, com = ci >= 0 ? s.slice(ci) : '';
  const out: { t: string; c: string }[] = [];
  const re = /("[^"]*"|'[^']*'|\b\d+(\.\d+)?\b|\.\d+\b|\b[A-Za-z_][\w.]*(?=\()|\b(for|in|if|elif|else|or|and|not|continue|return|const|let|float|vec2|vec3|vec4|mat3|uniform|varying)\b)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), c: '#d6deeb' });
    const tok = m[0];
    const col = /^["']/.test(tok) ? '#ecc48d' : /^\.?\d/.test(tok) ? '#f78c6c' : KW.test(tok) ? '#c792ea' : '#82aaff';
    KW.lastIndex = 0;
    out.push({ t: tok, c: col }); last = m.index + tok.length;
  }
  if (last < code.length) out.push({ t: code.slice(last), c: '#d6deeb' });
  if (com) out.push({ t: com, c: '#7f8ca8' });
  return out;
};

export const CodePanel: React.FC<{ file: string; lines: Line[]; at?: number; perLine?: number; size?: number; width?: number; lang?: string }> = ({ file, lines, at = 0, perLine = 4, size = 30, width = 980, lang }) => {
  const f = useCurrentFrame();
  const shown = Math.floor((f - at) / perLine);
  return (
    <div style={{ width, borderRadius: 26, overflow: 'hidden', background: C.code, border: '2px solid rgba(255,255,255,.12)', boxShadow: '0 30px 80px rgba(0,0,0,.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px', background: '#111b33', borderBottom: '2px solid rgba(255,255,255,.08)' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />)}
        <div style={{ marginLeft: 12, fontFamily: MONO, fontSize: 26, color: C.muted, fontWeight: 500 }}>{file}</div>
        {lang ? <div style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 22, color: C.gold, fontWeight: 700 }}>{lang}</div> : null}
      </div>
      <div style={{ padding: '18px 0' }}>
        {lines.map((l, i) => {
          const vis = i < shown;
          const typed = i === shown ? Math.max(0, Math.floor(((f - at) % perLine) / perLine * l.t.length)) : vis ? l.t.length : 0;
          const bg = l.add ? C.add : l.del ? C.del : l.hl && vis ? C.codeLine : 'transparent';
          return (
            <div key={i} style={{ display: 'flex', fontFamily: MONO, fontSize: size, lineHeight: 1.55, whiteSpace: 'pre', background: bg, padding: '0 24px', opacity: i <= shown ? 1 : 0.0 }}>
              <span style={{ width: size * 1.6, color: l.add ? C.green : l.del ? C.red : '#4d5a78', flex: 'none' }}>{l.add ? '+' : l.del ? '−' : i + 1}</span>
              <span style={{ textDecoration: l.del ? 'line-through' : 'none', textDecorationColor: 'rgba(255,90,90,.7)' }}>
                {l.dim ? <span style={{ color: '#7f8ca8' }}>{l.t.slice(0, typed)}</span> : tokenize(l.t.slice(0, typed)).map((k, j) => <span key={j} style={{ color: k.c }}>{k.t}</span>)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// phone mockup with a URL bar
export const Phone: React.FC<{ children: React.ReactNode; width?: number; url?: string }> = ({ children, width = 600, url = 'ai2033.taipei' }) => {
  const h = width * 2.06;
  return (
    <div style={{ width, height: h, borderRadius: width * 0.13, background: '#05080f', padding: width * 0.03, boxShadow: '0 40px 100px rgba(0,0,0,.6), inset 0 0 0 3px #2a3550' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: width * 0.105, overflow: 'hidden', background: C.navy, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 'none', height: width * 0.15, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: width * 0.02, background: '#0f1a33' }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: width * 0.042, color: C.cream, background: 'rgba(255,255,255,.1)', borderRadius: 999, padding: `${width * 0.012}px ${width * 0.05}px` }}>🔒 {url}</div>
        </div>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
      </div>
    </div>
  );
};

export const Shot: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src)} style={{ width: '100%', display: 'block', ...style }} />
);

// rolling digits (mechanical counter) from `a` to `b` text of equal length
export const Roll: React.FC<{ from: string; to: string; t: number; size: number; color?: string }> = ({ from, to, t, size, color = C.gold }) => (
  <div style={{ display: 'flex', fontFamily: MONO, fontWeight: 700, fontSize: size, color, lineHeight: 1 }}>
    {to.split('').map((ch, i) => {
      const a = from[i] ?? ch;
      if (a === ch || !/\d/.test(ch)) return <span key={i} style={{ display: 'inline-block', width: /\d/.test(ch) ? size * 0.62 : undefined }}>{t < 0.5 ? a : ch}</span>;
      const k = interpolate(t, [i * 0.08, 0.6 + i * 0.08], [0, 1], { ...clamp, easing: ease });
      return (
        <span key={i} style={{ display: 'inline-block', width: size * 0.62, height: size, overflow: 'hidden', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, top: -k * size }}>{a}</span>
          <span style={{ position: 'absolute', left: 0, top: (1 - k) * size }}>{ch}</span>
        </span>
      );
    })}
  </div>
);

export const Kicker: React.FC<{ children: React.ReactNode; y?: number }> = ({ children, y = 230 }) => {
  const a = usePop(2);
  const wide = useWide();
  return <div style={{ position: 'absolute', top: wide ? 44 : y, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.gold, letterSpacing: 2, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>{children}</div>;
};
