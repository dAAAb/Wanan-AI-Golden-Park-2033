// Words and code shown on screen. Narration lives in ../narration.json.

// the comment that started it all (as posted, lightly line-broken)
export const COMMENT = [
  '可否請提供此演講完整的逐字稿？',
  '盼能多傳播給更多知識分子！…',
  '一定要 push 所有可用的媒體，',
  '將那演講內容提綱挈 + PPT 圖，',
  '趕緊傳播出去',
  '（現有很多人不太看文字、沒耐心）',
];
export const COMMENT_HL = ['完整的逐字稿', 'PPT 圖', '很多人不太看文字、沒耐心'];

// the whole prompt, verbatim
export const PROMPT = `可否製作逐字稿
以及 PPT PDF 和 清晰字大的互動式網站
都給我公開連結
感謝：
AI黃金世紀，
從臺北開始！！
大台北
= 亞洲新矽谷
蔣萬安 + 李四川
= 大台北新矽谷
https://youtu.be/ircGbXWHRbQ?si=gRi8lFJCsbfnrr47
可以使用 three js 做台北的 3D 模擬
點進去可以有一個類似 台北 GTA (你上網查）的沈浸式互動頁面 可以體驗 松機變成 台北 AI 園區 和110公頃綠地的感覺
根據這個發表會和網路上的官方訊息
製作超級厲害的網頁介紹
要穿插蔣萬安市長的照片
謝謝`;

export type Line = { t: string; hl?: boolean; add?: boolean; del?: boolean; dim?: boolean };

// tools/build/build_city.py — guessing a height for every OpenStreetMap building
export const CODE_OSM: Line[] = [
  { t: 'for (typ, oid), el in blds.items():' },
  { t: '    t = el.get("tags", {})' },
  { t: '    for pg in as_polys(el):' },
  { t: '        if pg.area < 30: continue' },
  { t: '        h = num(t.get("height")) or \\', hl: true },
  { t: '            (num(t.get("building:levels")) or 0) * 3.3', hl: true },
  { t: '        bt = t.get("building", "yes")' },
  { t: '        if not h:' },
  { t: '            if bt in ("apartments", "residential"):' },
  { t: '                h = hrand(oid, 13, 26)' },
  { t: '            elif bt in ("commercial", "office", "hotel"):' },
  { t: '                h = hrand(oid, 20, 45)' },
];

// 3d/js/city.js — window lights painted in the fragment shader
export const CODE_GLSL: Line[] = [
  { t: 'vec2 cell = vec2(vWin.x / 3.4, (vWin.y - 0.6) / 3.3);' },
  { t: 'vec2 f = fract(cell); vec2 id = floor(cell);' },
  { t: 'winMask = step(0.2, f.x) * step(f.x, 0.8)' },
  { t: '        * step(0.22, f.y) * step(f.y, 0.86);' },
  { t: 'winRnd = whash(id + vec2(vSeed * 91.7, vSeed * 13.3));' },
  { t: '' },
  { t: '// 入夜：一半的窗戶亮燈', dim: true },
  { t: 'float lit = winMask * step(0.5, winRnd) * uNight;', hl: true },
  { t: 'vec3 wc = mix(vec3(1.0, .78, .45), vec3(.7, .85, 1.0),' },
  { t: '              step(0.82, winRnd));' },
  { t: 'totalEmissiveRadiance += lit * wc * 0.95;', hl: true },
];

// three.js instancing: normals are divided by the squared scale
export const CODE_NAN: Line[] = [
  { t: '// three.js：instanced 法向量除以縮放的平方', dim: true },
  { t: 'mat3 im = mat3( instanceMatrix );' },
  { t: 'transformedNormal /= vec3( dot( im[0], im[0] ),' },
  { t: '                           dot( im[1], im[1] ), ... );', hl: true },
  { t: '' },
  { t: '// 2033 的屋頂從高度 0 長出來 → 1 / 0 = ∞', dim: true },
  { t: '// 0 × ∞ = NaN → 光暈把 NaN 糊成黑色方塊', dim: true },
];

// 3d/js/main.js — the fix
export const CODE_FIX: Line[] = [
  { t: '_s.set(d[2] * .92, k, d[3] * .92);', del: true },
  { t: '_s.set(d[2] * .92, Math.max(0.01, k), d[3] * .92);', add: true },
  { t: '' },
  { t: '// 光暈之前先把 NaN 擋掉', dim: true },
  { t: 'texel = min(max(texel, vec4(0.0)), vec4(64.0));', add: true },
];
