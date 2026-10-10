// Build slides/AI-Golden-Century-Taipei.pptx with pptxgenjs (structured deck: theme, layouts, sections).
// usage: NODE_PATH=<node_modules> node tools/build/deck.js
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const { applyTheme } = require(process.env.APPLY_THEME);

const ROOT = path.resolve(__dirname, '../..');
const P = (f) => path.join(ROOT, f);
// public link printed on the deck
const SITE = process.env.SITE_URL || 'https://ai2033.taipei/';
const OUT = P('slides/AI-Golden-Century-Taipei.pptx');

const THEME = {
  name: 'AI Golden Century Taipei',
  headFontFace: 'Microsoft JhengHei',
  bodyFontFace: 'Microsoft JhengHei',
  colors: {
    dk1: '0B1730', lt1: 'FFFFFF', dk2: '14203A', lt2: 'F1F4F9',
    accent1: 'FFC83D', accent2: '1F6FD1', accent3: '3FA34D', accent4: 'C46A00', accent5: 'E8357F', accent6: '1AA7E8',
    hlink: '1F6FD1', folHlink: '6D2E8F',
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
pres.title = 'AI黃金世紀，從臺北開始';
pres.subject = '松山機場遷移・300 公頃臺北AI園區（2026/10/08 記者會重點）';
pres.author = '非官方整理';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const W = 13.333, H = 7.5;

// ---------- layouts ----------
const footer = (dark) => ({ text: { text: 'AI黃金世紀，從臺北開始｜非官方整理・資料：臺北市政府 2026/10/08 新聞稿', options: { x: 0.6, y: 7.0, w: 9, h: 0.3, fontSize: 10, color: dark ? C.accent1 : C.text2, margin: 0 } } });
pres.defineSlideMaster({
  title: 'TITLE_DARK', background: { color: HEX.dk1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 1.25, w: 7.6, h: 2.4, fontSize: 54, bold: true, color: C.background1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.6, y: 3.75, w: 7.4, h: 0.7, fontSize: 22, bold: true, color: C.background1, align: 'left', margin: 0 }, text: '' } },
  ],
});
pres.defineSlideMaster({
  title: 'CLOSING_DARK', background: { color: HEX.dk1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 4.55, w: 7.6, h: 2.1, fontSize: 48, bold: true, color: C.background1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
  ],
});
pres.defineSlideMaster({
  title: 'CONTENT_LIGHT', background: { color: HEX.lt1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 36, bold: true, color: C.text1, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
    footer(false),
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: HEX.dk2 },
});
pres.defineSlideMaster({
  title: 'CONTENT_DARK', background: { color: HEX.dk1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 36, bold: true, color: C.background1, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
    footer(true),
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: HEX.accent1 },
});

// ---------- helpers ----------
const T = (slide, text, o) => slide.addText(text, { isTextBox: true, margin: 0, valign: 'top', fontSize: 16, color: C.text1, ...o });
const pill = (slide, text, x, y, w, h, o = {}) => {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: Math.min(0.22, h / 2), fill: { color: o.fill || C.accent1 }, line: { type: 'none' }, objectName: o.name || 'pill' });
  T(slide, text, { x: x + 0.2, y, w: w - 0.4, h, valign: 'middle', fontSize: o.fontSize || 18, bold: true, color: o.color || C.text1, align: o.align || 'left' });
};
// native pixel size of a JPEG/PNG (pptxgenjs needs the real aspect ratio to crop without distortion)
function pixelSize(file) {
  const b = require('fs').readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  throw new Error('cannot read size of ' + file);
}
// Fill a w×h frame like CSS object-fit: cover. fy = vertical focus (0 top … 1 bottom), keeps faces in frame.
const img = (slide, file, x, y, w, h, o = {}) => {
  const { w: pw, h: ph } = pixelSize(P(file));
  const r = pw / ph, fx = o.fx ?? 0.5, fy = o.fy ?? (o.person ? 0.2 : 0.5);
  let iw, ih, cx = 0, cy = 0;
  if (r > w / h) { ih = h; iw = h * r; cx = (iw - w) * fx; } else { iw = w; ih = w / r; cy = (ih - h) * fy; }
  return slide.addImage({ path: P(file), x, y, w: iw, h: ih, sizing: { type: 'crop', x: cx, y: cy, w, h }, altText: o.alt || '', objectName: o.name || 'image' });
};
const card = (slide, x, y, w, h, fill, name) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.15, fill: { color: fill }, line: { type: 'none' }, objectName: name || 'card' });
const stat = (slide, x, y, w, big, label, color, dark) => {
  T(slide, big, { x, y, w, h: 0.95, fontSize: 54, bold: true, color: color || C.text1, valign: 'bottom' });
  T(slide, label, { x, y: y + 1.0, w, h: 0.45, fontSize: 16, bold: true, color: dark ? C.background1 : C.text2 });
};
const circleIcon = (slide, x, y, d, glyph, fill, color) => {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' }, objectName: 'icon-circle' });
  T(slide, glyph, { x, y, w: d, h: d, align: 'center', valign: 'middle', fontSize: Math.round(d * 30), bold: true, color: color || C.text1 });
};

// ---------- 1. title ----------
pres.addSection({ title: '開場' });
let s = pres.addSlide({ masterName: 'TITLE_DARK', sectionTitle: '開場' });
img(s, 'assets/photos/chiang-portrait.jpg', 8.55, 0, 4.783, 7.5, { person: true, alt: '臺北市長蔣萬安正式肖像', name: 'hero-photo' });
T(s, '2026.10.08 臺北市政府記者會', { x: 0.6, y: 0.65, w: 7, h: 0.45, fontSize: 18, bold: true, color: C.accent1 });
s.addText([{ text: 'AI黃金世紀，', options: { breakLine: true } }, { text: '從臺北開始！', options: { color: C.accent1 } }], { placeholder: 'title' });
s.addText('松山機場遷移・打造 300 公頃「臺北AI園區」', { placeholder: 'body' });
pill(s, '大台北 ＝ 亞洲新矽谷', 0.6, 4.8, 5.2, 0.7, { fontSize: 22 });
pill(s, '蔣萬安 ＋ 李四川 ＝ 大台北新矽谷', 0.6, 5.7, 7.2, 0.7, { fontSize: 22, fill: C.background1 });
T(s, '非官方整理｜照片：Wikimedia Commons（臺北市政府，姓名標示）', { x: 0.6, y: 6.85, w: 7.5, h: 0.35, fontSize: 11, color: C.background2 });
s.addNotes('開場：2026 年 10 月 8 日，臺北市長蔣萬安在市府大數據中心召開「打造AI黃金世紀、全面釋放都市潛力」記者會，宣布規劃遷移松山機場，整合機場及周邊 300 公頃，打造全新的臺北AI園區。');

// ---------- 2. one picture ----------
pres.addSection({ title: '願景' });
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '願景' });
s.addText('一張圖看懂：松山機場變身臺北AI園區', { placeholder: 'title' });
img(s, 'assets/renders/aerial-2033.jpg', 0.6, 1.5, 7.9, 4.45, { alt: '2033 年臺北AI園區 3D 示意', name: 'render' });
T(s, '3D 示意（依新聞稿文字繪製，非正式設計圖）', { x: 0.6, y: 6.05, w: 7.9, h: 0.35, fontSize: 11, color: C.text2 });
[['300', '公頃 臺北AI園區', C.text1], ['12兆', '預估產值（新臺幣）', C.accent2], ['110', '公頃 中央公園', C.accent3]].forEach(([b, l, c], i) => {
  card(s, 8.9, 1.5 + i * 1.55, 3.83, 1.4, C.background2, 'stat-card');
  stat(s, 9.15, 1.45 + i * 1.55, 3.4, b, l, c);
});
s.addNotes('核心概念：松機及周邊 300 公頃，分成 100 公頃 AI 產業聚落、90 公頃國際永續生活聚落、110 公頃中央公園；同時解鎖 570 公頃受航高限制的都更地區。產業局推估 12 兆產值。');

// ---------- 3. why now ----------
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '願景' });
s.addText('輝達來了，臺北最缺的是「腹地」', { placeholder: 'title' });
const why = [['北', '北士科', '只剩 T3、T4、T12，沒有超過 1 公頃的大面積產業用地'], ['內', '內湖科技園區', '緯穎、緯創興建總部後，已沒有足夠面積的產業用地'], ['南', '南港軟體園區', '已經滿了，AI 軟體辦公室競相進駐周邊'], ['洲', '洲美（北士科二期）', '規劃中，但面對湧來的 AI 浪潮仍遠遠不夠']];
why.forEach(([g, h, b], i) => {
  const y = 1.6 + i * 1.18;
  circleIcon(s, 0.6, y, 0.8, g, C.accent1);
  T(s, h, { x: 1.6, y: y - 0.02, w: 5.6, h: 0.42, fontSize: 20, bold: true });
  T(s, b, { x: 1.6, y: y + 0.42, w: 5.6, h: 0.6, fontSize: 15, color: C.text2 });
});
img(s, 'assets/photos/chiang-speech.jpg', 7.6, 1.5, 5.13, 3.4, { person: true, alt: '蔣萬安致詞', name: 'photo' });
card(s, 7.6, 5.05, 5.13, 1.65, C.text1, 'quote-card');
T(s, '「沒有腹地，『亞太AI首都』就只是空談。」', { x: 7.85, y: 5.2, w: 4.7, h: 1.0, fontSize: 20, bold: true, color: C.background1, valign: 'middle' });
T(s, '— 臺北市長 蔣萬安', { x: 7.85, y: 6.2, w: 4.7, h: 0.35, fontSize: 14, bold: true, color: C.accent1 });
s.addNotes('今年初輝達選擇臺北、落腳北士科。但臺北三大科技園區都滿了：北士科只剩 T3、T4、T12，內科、南軟也沒有大面積產業用地。洲美已規劃為北士科二期，仍不夠。');

// ---------- 4. hsinchu analogy ----------
s = pres.addSlide({ masterName: 'CONTENT_DARK', sectionTitle: '願景' });
s.addText('半世紀前竹科，半世紀後臺北', { placeholder: 'title' });
card(s, 0.6, 1.6, 5.4, 2.6, '1A2A52', 'era-card');
T(s, '1970s', { x: 0.9, y: 1.8, w: 4.8, h: 0.9, fontSize: 48, bold: true, color: C.background1 });
T(s, '新竹科學園區與半導體一度飽受質疑，五十年後孕育出台積電與「護國群山」。', { x: 0.9, y: 2.75, w: 4.8, h: 1.3, fontSize: 17, color: C.background1 });
T(s, '➜', { x: 6.1, y: 2.3, w: 1.1, h: 1.2, fontSize: 54, bold: true, color: C.accent1, align: 'center' });
card(s, 7.3, 1.6, 5.43, 2.6, C.accent1, 'era-card-now');
T(s, '2026', { x: 7.6, y: 1.8, w: 4.8, h: 0.9, fontSize: 48, bold: true, color: C.text1 });
T(s, '半導體正在走出去，世界正在走進臺北。產業要持續成長，就必須找到下一個空間。', { x: 7.6, y: 2.75, w: 4.9, h: 1.3, fontSize: 17, bold: true, color: C.text1 });
T(s, '「歷史告訴我們，必須在機會到來的時候，當機立斷、做出關鍵決定。」', { x: 0.6, y: 4.55, w: 12.1, h: 0.9, fontSize: 24, bold: true, color: C.accent1 });
T(s, '蔣萬安也提到：好友、立委葛如鈞博士走訪矽谷，分享當地出現「Taiwan Fever」、「Taipei Fever」。輝達來到臺北，國際企業、人才、技術與資金正加速匯聚。', { x: 0.6, y: 5.55, w: 12.1, h: 1.0, fontSize: 17, color: C.background1 });
s.addNotes('蔣萬安以竹科為例：1970 年代竹科構想也受質疑，五十年後成就護國群山。現在世界正在走進臺北，必須當機立斷。');

// ---------- 5. 300 ha split ----------
pres.addSection({ title: '300公頃' });
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '300公頃' });
s.addText('300 公頃怎麼用？', { placeholder: 'title' });
const zones = [['100', '公頃 AI 產業聚落', '松南營區、松機南側，與中央攜手整合', C.accent2], ['90', '公頃 國際永續生活聚落', '住宅與公共設施，可容納 3.5 萬人', C.accent4], ['110', '公頃 臺北中央公園', '松機北半側，臺北的「綠色脊柱」', C.accent3]];
zones.forEach(([b, h, d, col], i) => {
  const y = 1.55 + i * 1.65;
  card(s, 0.6, y, 6.9, 1.45, C.background2, 'zone-card');
  T(s, b, { x: 0.85, y: y + 0.18, w: 1.9, h: 1.1, fontSize: 54, bold: true, color: col, valign: 'middle' });
  T(s, h, { x: 2.75, y: y + 0.22, w: 4.6, h: 0.5, fontSize: 20, bold: true });
  T(s, d, { x: 2.75, y: y + 0.75, w: 4.6, h: 0.5, fontSize: 15, color: C.text2 });
});
s.addChart(pres.charts.DOUGHNUT, [{ name: '300 公頃配置', labels: ['AI 產業聚落', '生活聚落', '中央公園'], values: [100, 90, 110] }], {
  x: 7.8, y: 1.45, w: 4.9, h: 4.6, holeSize: 55, showLegend: true, legendPos: 'b', legendFontSize: 14, legendFontFace: '+mn-lt', legendColor: HEX.dk2,
  showValue: true, showPercent: false, dataLabelColor: 'FFFFFF', dataLabelFontSize: 16, dataLabelFontBold: true, dataLabelFontFace: '+mn-lt',
  chartColors: [HEX.accent2, HEX.accent4, HEX.accent3], showTitle: true, title: '單位：公頃', titleFontSize: 14, titleColor: HEX.dk2, titleFontFace: '+mn-lt',
});
T(s, '另解鎖 570 公頃受航高禁限建影響的都更地區', { x: 7.8, y: 6.15, w: 4.9, h: 0.5, fontSize: 15, bold: true, color: C.accent5, align: 'center' });
s.addNotes('300 公頃：100 公頃 AI 產業聚落、90 公頃國際永續生活聚落、110 公頃中央公園。另外打開 570 公頃受航高限制影響的都更劃定地區。');

// ---------- 6. before / after ----------
s = pres.addSlide({ masterName: 'CONTENT_DARK', sectionTitle: '300公頃' });
s.addText('2026 ⇄ 2033：一樣的地，完全不同的未來', { placeholder: 'title' });
img(s, 'assets/renders/aerial-2026.jpg', 0.6, 1.55, 5.95, 3.35, { alt: '2026 松山機場', name: 'before' });
img(s, 'assets/renders/aerial-2033.jpg', 6.78, 1.55, 5.95, 3.35, { alt: '2033 臺北AI園區示意', name: 'after' });
pill(s, '2026 松山機場', 0.8, 1.75, 2.6, 0.5, { fontSize: 16, fill: C.background1 });
pill(s, '2033 臺北AI園區', 6.98, 1.75, 2.9, 0.5, { fontSize: 16 });
T(s, '機場及周邊約 213 公頃的跑道與停機坪', { x: 0.6, y: 5.1, w: 5.95, h: 0.9, fontSize: 18, color: C.background1 });
T(s, '北半側變中央公園、南側長出 AI 聚落與生活聚落', { x: 6.78, y: 5.1, w: 5.95, h: 0.9, fontSize: 18, bold: true, color: C.accent1 });
T(s, '畫面為 OpenStreetMap 資料建模之 3D 示意，配置非正式設計圖。', { x: 0.6, y: 6.3, w: 12.1, h: 0.35, fontSize: 11, color: C.background2 });
s.addNotes('左圖是今天的松山機場，右圖是依市府新聞稿描述繪製的 2033 示意：北半側 110 公頃中央公園，南側 AI 產業聚落與國際永續生活聚落。');

// ---------- 7. AI cluster ----------
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '300公頃' });
s.addText('100 公頃 AI 產業聚落：預估 12 兆產值', { placeholder: 'title' });
img(s, 'assets/renders/ai-2033.jpg', 0.6, 1.5, 6.6, 4.95, { alt: 'AI 產業聚落 3D 示意', name: 'render' });
[['12兆', '預估產值（新臺幣）', C.accent2], ['6.5萬', '就業人口', C.text1], ['200家', '產業鏈本土企業', C.accent4]].forEach(([b, l, c], i) => stat(s, 7.6, 1.4 + i * 1.6, 5.1, b, l, c));
T(s, '產業局以內科每公頃 360 億元產值為基數推估；產業鏈含台積電等 50 家上市櫃公司與 150 家未上市企業及新創。', { x: 7.6, y: 6.0, w: 5.1, h: 0.85, fontSize: 13, color: C.text2 });
s.addNotes('AI 產業聚落以松南營區、松機南側與中央整合。產業局以內科每公頃 360 億產值估算 12 兆，6.5 萬就業。');

// ---------- 8. central park ----------
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '300公頃' });
s.addText('110 公頃中央公園：臺北的「綠色脊柱」', { placeholder: 'title' });
img(s, 'assets/renders/park-2033.jpg', 0.6, 1.5, 6.6, 4.95, { alt: '中央公園 3D 示意', name: 'render' });
s.addChart(pres.charts.BAR, [{ name: '面積（公頃）', labels: ['大安森林公園', '東京代代木公園', '臺北中央公園'], values: [25.9, 54.1, 110] }], {
  x: 7.5, y: 1.45, w: 5.25, h: 3.6, barDir: 'bar', chartColors: [HEX.accent3], showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 14, dataLabelFontBold: true, dataLabelColor: HEX.dk1, dataLabelFontFace: '+mn-lt',
  catAxisLabelColor: HEX.dk2, catAxisLabelFontSize: 14, catAxisLabelFontFace: '+mn-lt', valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false,
  showTitle: true, title: '面積比較（公頃）', titleFontSize: 14, titleColor: HEX.dk2, titleFontFace: '+mn-lt',
});
T(s, '面積與倫敦海德公園相近，約為代代木公園 2 倍、大安森林公園 4 倍；並結合基隆河大直段河岸再造。', { x: 7.5, y: 5.25, w: 5.25, h: 1.2, fontSize: 16, bold: true });
T(s, '大安森林公園、代代木公園面積為公開資料；中央公園為市府規劃值。', { x: 7.5, y: 6.45, w: 5.25, h: 0.4, fontSize: 11, color: C.text2 });
s.addNotes('110 公頃中央公園在松機北半側，相當於大安森林公園四倍大，打造都市生態的綠色脊柱，結合基隆河大直段河岸再造。');

// ---------- 9. renewal ----------
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '300公頃' });
s.addText('解鎖 570 公頃都更：增加約 15 萬戶', { placeholder: 'title' });
img(s, 'assets/renders/renewal-2026.jpg', 0.6, 1.5, 4.1, 2.6, { alt: '航高限制下的老舊社區', name: 'before' });
img(s, 'assets/renders/renewal-2033.jpg', 0.6, 4.2, 4.1, 2.6, { alt: '解禁後都更示意', name: 'after' });
pill(s, '限高中', 0.75, 1.65, 1.5, 0.45, { fontSize: 14, fill: C.background1 });
pill(s, '解禁後', 0.75, 4.35, 1.5, 0.45, { fontSize: 14 });
[['570', '公頃都更劃定地區', C.accent5], ['15萬戶', '新增居住單元（都發局推估）', C.text1], ['3.5萬', '園區居住人口', C.accent4]].forEach(([b, l, c], i) => stat(s, 5.2, 1.4 + i * 1.6, 3.6, b, l, c));
card(s, 9.1, 1.5, 3.63, 5.3, C.background2, 'note-card');
T(s, '為什麼會長高？', { x: 9.35, y: 1.7, w: 3.2, h: 0.5, fontSize: 20, bold: true });
T(s, '跑道前後端的航高限制，讓周邊許多 4、5 層樓老舊建築長年無法改建，影響範圍不只臺北，也包括新北、基隆、桃園。松機遷移後，這些地區就有機會都更改建，大幅釋放城市再生潛力。', { x: 9.35, y: 2.3, w: 3.2, h: 4.3, fontSize: 17, color: C.text2 });
s.addNotes('航高限制讓周邊老公寓無法都更。松機遷移後約 570 公頃都更地區解鎖，加上園區開發，可增加約 15 萬戶。');

// ---------- 10. transport ----------
pres.addSection({ title: '交通' });
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '交通' });
s.addText('打通交通任督二脈：XY 軸捷運＋跨河廊道', { placeholder: 'title' });
card(s, 0.6, 1.5, 6.2, 5.25, C.background2, 'diagram-bg');
// X line
s.addShape(pres.shapes.LINE, { x: 0.95, y: 3.0, w: 5.4, h: 0, line: { color: HEX.accent6, width: 10 }, objectName: 'x-line' });
s.addShape(pres.shapes.LINE, { x: 3.65, y: 3.0, w: 0, h: 3.3, line: { color: HEX.accent5, width: 10 }, objectName: 'y-line' });
[[1.05, 3.0, '士林大同線', -0.62], [2.35, 3.0, '圓山', 0.25], [5.95, 3.0, '內湖', -0.62]].forEach(([x, y, n, dy]) => { s.addShape(pres.shapes.OVAL, { x: x - 0.17, y: y - 0.17, w: 0.34, h: 0.34, fill: { color: 'FFFFFF' }, line: { color: HEX.accent6, width: 4 } }); T(s, n, { x: x - 0.9, y: y + dy, w: 1.8, h: 0.4, fontSize: 14, bold: true, align: 'center' }); });
[[3.65, 3.85, '國父紀念館'], [3.65, 4.6, '大安'], [3.65, 5.35, '公館'], [3.65, 6.1, '中和']].forEach(([x, y, n]) => { s.addShape(pres.shapes.OVAL, { x: x - 0.17, y: y - 0.17, w: 0.34, h: 0.34, fill: { color: 'FFFFFF' }, line: { color: HEX.accent5, width: 4 } }); T(s, n, { x: x + 0.3, y: y - 0.2, w: 2, h: 0.4, fontSize: 14, bold: true }); });
s.addShape(pres.shapes.OVAL, { x: 3.35, y: 2.7, w: 0.6, h: 0.6, fill: { color: HEX.accent1 }, line: { color: HEX.dk1, width: 3 }, objectName: 'hub' });
T(s, '松山機場（臺北AI園區）', { x: 2.4, y: 2.05, w: 3.6, h: 0.45, fontSize: 15, bold: true, align: 'center' });
T(s, 'X 軸（東西向）', { x: 0.9, y: 1.7, w: 2.6, h: 0.4, fontSize: 15, bold: true, color: C.accent6 });
T(s, 'Y 軸（南北向）', { x: 4.2, y: 4.0, w: 2.4, h: 0.4, fontSize: 15, bold: true, color: C.accent5 });
T(s, '示意圖，路線未定案', { x: 4.2, y: 6.3, w: 2.4, h: 0.35, fontSize: 11, color: C.text2 });
circleIcon(s, 7.2, 1.55, 0.7, 'X', C.accent6, C.background1);
T(s, '連起四大產業園區', { x: 8.05, y: 1.55, w: 4.6, h: 0.45, fontSize: 20, bold: true });
T(s, 'X 軸串聯士林大同線、圓山、松山機場、內湖：北士科、臺北AI園區、內科、南軟一線相連。', { x: 8.05, y: 2.0, w: 4.6, h: 0.95, fontSize: 15, color: C.text2 });
circleIcon(s, 7.2, 3.15, 0.7, 'Y', C.accent5, C.background1);
T(s, '雙北跨市通勤', { x: 8.05, y: 3.15, w: 4.6, h: 0.45, fontSize: 20, bold: true });
T(s, 'Y 軸從松山機場往南，串聯國父紀念館、大安、公館到中和。', { x: 8.05, y: 3.6, w: 4.6, h: 0.75, fontSize: 15, color: C.text2 });
circleIcon(s, 7.2, 4.75, 0.7, '橋', C.accent1);
T(s, '跨河廊道', { x: 8.05, y: 4.75, w: 4.6, h: 0.45, fontSize: 20, bold: true });
T(s, '基湖路、敬業三路、北安路穿越松機腹地接松山、信義；民族東路向東串聯大直、內湖，向西接建國、新生高架。', { x: 8.05, y: 5.2, w: 4.6, h: 1.3, fontSize: 15, color: C.text2 });
s.addNotes('交通：XY 軸捷運，Y 軸南北向從松機往南到中和；X 軸東西向串聯士林大同線、圓山、松機、內湖。跨河廊道：基湖路、敬業三路、北安路，民族東路東延，紓解內科、大直通勤。');

// ---------- 11. CTC ----------
s = pres.addSlide({ masterName: 'CONTENT_DARK', sectionTitle: '交通' });
s.addText('首都科技廊帶（CTC）：串聯北臺灣 8 縣市', { placeholder: 'title' });
const nodes = { 臺北: [4.6, 2.6], 新北: [3.7, 3.4], 基隆: [6.0, 1.9], 宜蘭: [6.5, 4.4], 桃園: [2.4, 3.8], 新竹縣: [1.6, 4.9], 新竹市: [1.3, 5.5], 苗栗: [1.0, 6.3] };
const edges = [['臺北', '新北'], ['臺北', '基隆'], ['臺北', '宜蘭'], ['新北', '桃園'], ['桃園', '新竹縣'], ['新竹縣', '新竹市'], ['新竹市', '苗栗']];
edges.forEach(([a, b]) => { const [x1, y1] = nodes[a], [x2, y2] = nodes[b]; s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.01, h: Math.abs(y2 - y1) || 0.01, flipV: (x2 - x1) * (y2 - y1) < 0, line: { color: HEX.accent1, width: 3 } }); });
Object.entries(nodes).forEach(([n, [x, y]]) => {
  const d = n === '臺北' ? 0.95 : 0.42;
  s.addShape(pres.shapes.OVAL, { x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color: n === '臺北' ? HEX.accent1 : '6FB4FF' }, line: { type: 'none' }, objectName: 'node' });
  T(s, n, n === '臺北' ? { x: x - 0.6, y: y - 0.25, w: 1.2, h: 0.5, fontSize: 16, bold: true, align: 'center', valign: 'middle' } : { x: x + 0.3, y: y - 0.2, w: 1.4, h: 0.4, fontSize: 15, bold: true, color: C.background1 });
});
const ctc = [['新北', '結合李四川倡議，以輕軌及快速道路連結蘆洲、五股、板橋、土城等科技園區'], ['桃竹苗', '串聯桃園各產業園區、桃園機場與「桃竹苗大矽谷推動方案」'], ['基隆・宜蘭', '連結基隆智慧科技園區、宜蘭科學園區'], ['陸海空', '完成陸、海、空整合，打造北臺灣黃金產業生活圈']];
ctc.forEach(([h, b], i) => {
  const y = 1.55 + i * 1.3;
  card(s, 7.4, y, 5.33, 1.15, '1A2A52', 'ctc-card');
  T(s, h, { x: 7.65, y: y + 0.12, w: 4.9, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
  T(s, b, { x: 7.65, y: y + 0.52, w: 4.9, h: 0.6, fontSize: 14, color: C.background1 });
});
s.addNotes('首都科技廊帶串聯新北、桃園、基隆、宜蘭、新竹縣市、苗栗共 8 縣市，結合李四川、張善政、高虹安、鍾東錦、謝國樑、徐欣瑩、吳宗憲等人推動的建設。');

// ---------- 12. valley ----------
pres.addSection({ title: '大台北新矽谷' });
s = pres.addSlide({ masterName: 'CONTENT_DARK', sectionTitle: '大台北新矽谷' });
s.addText([{ text: '蔣萬安 ＋ 李四川 ＝ ' }, { text: '大台北新矽谷', options: { color: C.accent1 } }], { placeholder: 'title' });
img(s, 'assets/photos/chiang-stage.jpg', 0.6, 1.55, 2.9, 3.5, { person: true, alt: '臺北市長蔣萬安', name: 'photo-chiang' });
T(s, '＋', { x: 3.55, y: 2.7, w: 0.8, h: 1.0, fontSize: 48, bold: true, color: C.accent1, align: 'center' });
img(s, 'assets/photos/lee-shih-chuan.jpg', 4.4, 1.55, 2.9, 3.5, { person: true, alt: '李四川', name: 'photo-lee' });
T(s, '蔣萬安', { x: 0.6, y: 5.15, w: 2.9, h: 0.45, fontSize: 20, bold: true, color: C.accent1 });
T(s, '臺北市長・臺北AI園區', { x: 0.6, y: 5.6, w: 2.9, h: 0.4, fontSize: 14, color: C.background1 });
T(s, '李四川', { x: 4.4, y: 5.15, w: 2.9, h: 0.45, fontSize: 20, bold: true, color: C.accent1 });
T(s, '新北市長參選人・AI 科技廊帶', { x: 4.4, y: 5.6, w: 2.9, h: 0.4, fontSize: 14, color: C.background1 });
card(s, 7.7, 1.55, 5.03, 1.75, C.accent1, 'valley-card');
T(s, '大台北 ＝ 亞洲新矽谷', { x: 7.95, y: 1.7, w: 4.6, h: 1.4, fontSize: 28, bold: true, valign: 'middle' });
T(s, '「AI 這一波，是歷史時刻，也是台灣的機遇，新北必須接住。」', { x: 7.7, y: 3.5, w: 5.03, h: 1.1, fontSize: 18, bold: true, color: C.background1 });
T(s, '— 李四川', { x: 7.7, y: 4.6, w: 5.03, h: 0.35, fontSize: 14, bold: true, color: C.accent1 });
T(s, '李四川認同臺北AI園區：輝達進駐後北市已沒有地，應提早規劃；中和光復線往北延伸，新店、中永和一路接到未來的臺北AI園區。', { x: 7.7, y: 5.05, w: 5.03, h: 1.4, fontSize: 14, color: C.background1 });
s.addNotes('雙北合作：李四川認同松機遷移構想，主張 AI 科技廊帶，以蘆社大橋、淡北快線、中和光復線北延，把北士科與臺北AI園區的紅利延伸到新北。');

// ---------- 13. timeline ----------
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '大台北新矽谷' });
s.addText('時程與配套：2033 年，條件成熟', { placeholder: 'title' });
s.addShape(pres.shapes.LINE, { x: 0.8, y: 3.0, w: 11.4, h: 0, line: { color: HEX.dk1, width: 4 }, objectName: 'timeline' });
const tl = [['1936', '臺北飛行場啟用', false], ['2026.10', '宣布松機遷移構想', true], ['2027', '桃機第三航廈預計啟用', false], ['2033', '桃機第三跑道完工・目標完成遷移', true]];
tl.forEach(([y, t, hl], i) => {
  const x = 0.9 + i * 3.05;
  s.addShape(pres.shapes.OVAL, { x: x - 0.2, y: 2.8, w: 0.4, h: 0.4, fill: { color: hl ? HEX.accent1 : 'FFFFFF' }, line: { color: HEX.dk1, width: 4 }, objectName: 'dot' });
  T(s, y, { x: x - 0.2, y: 1.7, w: 2.8, h: 0.8, fontSize: 32, bold: true, color: hl ? C.accent4 : C.text1, valign: 'bottom' });
  T(s, t, { x: x - 0.2, y: 3.4, w: 2.8, h: 0.9, fontSize: 16, bold: hl });
});
[['36 分鐘', '五楊高架、機場捷運完成後，臺北到桃園機場約 36 分鐘'], ['中央協調', '松機兼具國際、兩岸、離島航線與國防、救災任務，市府將與交通部、國防部及中央共同討論'], ['現在開始', '「如果沒有開始，就永遠不會有成果。」大巨蛋花了 32 年，公館圓環討論 20 多年']].forEach(([h, b], i) => {
  const x = 0.6 + i * 4.1;
  card(s, x, 4.6, 3.9, 2.15, C.background2, 'next-card');
  T(s, h, { x: x + 0.25, y: 4.75, w: 3.4, h: 0.5, fontSize: 22, bold: true, color: C.accent2 });
  T(s, b, { x: x + 0.25, y: 5.3, w: 3.4, h: 1.35, fontSize: 14, color: C.text2 });
});
s.addNotes('時程：桃機三航廈 2027 年啟用、第三跑道 2033 年完工，市府目標屆時完成遷移。交通部、內政部表示需審慎評估，市府將全力溝通、爭取中央支持。');

// ---------- 14. 3D experience ----------
pres.addSection({ title: '體驗與結語' });
s = pres.addSlide({ masterName: 'CONTENT_DARK', sectionTitle: '體驗與結語' });
s.addText('親自開車看：3D 臺北 2033', { placeholder: 'title' });
img(s, 'assets/renders/hero-night.jpg', 0.6, 1.5, 8.2, 4.6, { alt: '臺北AI園區夜景 3D 示意', name: 'render' });
s.addImage({ path: P('assets/qr-site.png'), x: 9.35, y: 1.5, w: 2.6, h: 2.6, altText: '網站 QR Code', objectName: 'qr' });
T(s, '掃描進入網站', { x: 9.1, y: 4.2, w: 3.1, h: 0.45, fontSize: 18, bold: true, color: C.accent1, align: 'center' });
T(s, '開著臺北小黃開到松山機場，按一下切換 2026 ⇄ 2033，看 110 公頃中央公園長出來；還有逐字稿、簡報下載。', { x: 9.1, y: 4.75, w: 3.63, h: 1.6, fontSize: 14, color: C.background1 });
T(s, SITE, { x: 0.6, y: 6.25, w: 12.1, h: 0.4, fontSize: 11, color: C.background2, hyperlink: { url: SITE } });
s.addNotes('網站提供 GTA 風格的 3D 臺北體驗、大字版重點整理、記者會逐字稿與本簡報下載。');

// ---------- 15. closing ----------
s = pres.addSlide({ masterName: 'CLOSING_DARK', sectionTitle: '體驗與結語' });
img(s, 'assets/photos/chiang-stage.jpg', 8.55, 0, 4.783, 7.5, { person: true, alt: '臺北市長蔣萬安', name: 'closing-photo' });
T(s, '「我的第一個任期，成功爭取輝達進駐；我的第二個任期，要抓住 AI 這樣的歷史性機遇，為臺灣開創新的『AI黃金世紀』。」', { x: 0.6, y: 1.0, w: 7.5, h: 2.6, fontSize: 26, bold: true, color: C.background1 });
T(s, '— 臺北市長 蔣萬安', { x: 0.6, y: 3.65, w: 7.5, h: 0.45, fontSize: 18, bold: true, color: C.accent1 });
s.addText([{ text: 'AI黃金世紀，', options: { breakLine: true } }, { text: '從臺北開始！', options: { color: C.accent1 } }], { placeholder: 'title' });
s.addNotes('結語：輝達來了，AI 世紀也來了，臺北要抓住這個關鍵時機，讓世界看見臺北，更因為臺北看見臺灣。AI黃金世紀，就從臺北開始。');

// ---------- 16. sources ----------
s = pres.addSlide({ masterName: 'CONTENT_LIGHT', sectionTitle: '體驗與結語' });
s.addText('資料來源與授權', { placeholder: 'title' });
const src = [
  '臺北市政府新聞稿〈輝達來了！蔣萬安發表「AI黃金世紀」新願景 拋松機遷移打造百公頃臺北AI園區〉2026/10/08',
  '影片：AI黃金世紀，就從臺北開始｜20261008 發布會完整版（youtu.be/ircGbXWHRbQ）',
  '中央社、自由時報、TVBS、聯合報、住展雜誌等 2026/10/08–09 報導（含交通部、李四川回應）',
  '地圖與 3D：© OpenStreetMap 貢獻者（ODbL），three.js 建模；園區配置為依新聞稿文字繪製之示意',
  '照片：Wikimedia Commons — 臺北市政府（姓名標示）、Solomon203（CC BY-SA 4.0）、高雄市政府（姓名標示）',
  '本簡報為非官方整理，與臺北市政府無隸屬關係；正式內容以市府公告為準',
];
s.addText(src.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < src.length - 1, paraSpaceAfter: 10 } })), { x: 0.6, y: 1.55, w: 12.1, h: 5.2, fontSize: 16, color: C.text1, valign: 'top', isTextBox: true, margin: 0 });
s.addNotes('資料來源與照片授權。');

async function fixEastAsianFonts(file) {
  // pptxgenjs/applyTheme leave the theme's East Asian typeface empty, so CJK text would fall back to PMingLiU.
  const JSZip = require('jszip');
  const fs = require('fs');
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(zip.files).filter(n => /^ppt\/theme\/theme\d+\.xml$/.test(n))) {
    let x = await zip.file(name).async('string');
    x = x.replace(/<a:ea typeface="[^"]*"\/>/g, `<a:ea typeface="${THEME.bodyFontFace}"/>`);
    x = x.replace(/<a:font script="Hant" typeface="[^"]*"\/>/g, `<a:font script="Hant" typeface="${THEME.bodyFontFace}"/>`);
    if (!/script="Hant"/.test(x)) x = x.replace(/(<a:(?:major|minor)Font>[\s\S]*?<a:cs typeface="[^"]*"\/>)/g, `$1<a:font script="Hant" typeface="${THEME.bodyFontFace}"/>`);
    zip.file(name, x);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await fixEastAsianFonts(OUT);
  console.log('wrote', OUT);
})();
