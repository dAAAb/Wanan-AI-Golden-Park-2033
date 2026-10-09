#!/usr/bin/env python3
"""Build transcript/index.html and transcript/transcript.md.

Sources:
  * research/pages/00.txt — Taipei City Government press release (2026-10-08), the official written version of the speech
  * research/youtube/whisper_segments.json — speech-to-text of the video, when available (see fetch-transcript workflow)
"""
import html, json, os, re

PR = "research/pages/00.txt"
WS = "research/youtube/whisper_segments.json"
OUT_HTML = "transcript/index.html"
OUT_MD = "transcript/transcript.md"
VID = "ircGbXWHRbQ"

raw = open(PR, encoding="utf-8").read().split("\n\n", 1)[1]
lines = [l.strip().replace("　", "　") for l in raw.splitlines() if l.strip()]
blocks = []  # (kind, text)
for l in lines:
    if len(l) < 40 and "。" not in l and "，" not in l:
        blocks.append(("h", l))
    else:
        blocks.append(("p", l))

def hl(t):
    t = html.escape(t)
    # highlight direct quotes 「…」 spoken by the mayor
    t = re.sub(r"「([^「」]{6,}?)」", r"<q>「\1」</q>", t)
    for k in ["300公頃", "100公頃", "90公頃", "110公頃", "570公頃", "12兆", "6.5萬", "3.5萬", "15萬戶", "首都科技廊帶", "臺北XY軸捷運", "臺北AI園區"]:
        t = t.replace(k, f"<mark>{k}</mark>")
    return t

segs = []
if os.path.exists(WS):
    try: segs = json.load(open(WS, encoding="utf-8"))
    except Exception: segs = []

def ts(s):
    s = int(s); h, r = divmod(s, 3600); m, sec = divmod(r, 60)
    return f"{h:d}:{m:02d}:{sec:02d}" if h else f"{m:d}:{sec:02d}"

QA = [
    ("松山機場的運量由誰承接？", "蔣萬安表示，五楊高架、機場捷運完成後，臺北到桃園機場約 36 分鐘；桃園機場第三航廈預計 2027 年啟用、第三跑道預計 2033 年完工，整體量能足以承接松山機場的航運功能，松機遷移的客觀配套條件已趨成熟。", "TVBS 2026/10/08", "https://news.tvbs.com.tw/politics/4033223"),
    ("軍民合用、國防怎麼辦？", "蔣萬安說明，松山機場目前並非空軍的戰術基地，相關國防功能可以延伸與彈性調整，市府一定會與國防部及中央政府共同合作、共同討論。過去輝達也曾考慮松南營區，未來松機確定遷移後，市府規劃以松南營區及松機南側與中央攜手整合。", "TVBS 2026/10/08", "https://news.tvbs.com.tw/politics/4033223"),
    ("什麼時候完成？", "蔣萬安表示，松機遷移計畫預計於 2033 年完成，距今約 8 年，但現在就必須開始規劃與準備；城市的改變需要大破大立，市府會全力溝通，爭取中央與市民支持。", "TVBS 2026/10/08", "https://news.tvbs.com.tw/politics/4033223"),
    ("交通怎麼改善？", "規劃基湖路、敬業三路、北安路透過跨河廊道穿越松機腹地，直接銜接松山、信義；民族東路向東延伸穿越松機基地進入內科，往西連接建國高架、新生高架，「相當於打通臺北市交通的任督二脈」。捷運則規劃臺北 XY 軸捷運。", "自由時報 2026/10/08", "https://news.ltn.com.tw/news/politics/breakingnews/5599727"),
]

# ---------------- markdown ----------------
md = ["# AI黃金世紀，就從臺北開始｜2026/10/08 記者會逐字稿", "",
      f"影片：https://youtu.be/{VID}", ""]
if segs:
    md += ["## 影片語音逐字稿（自動語音辨識，已轉繁體）", ""]
    md += [f"[{ts(s['start'])}] {s['text']}" for s in segs]
    md += [""]
md += ["## 致詞全文（臺北市政府新聞稿版）", "",
       "> 來源：臺北市政府新聞稿〈輝達來了！蔣萬安發表「AI黃金世紀」新願景 拋松機遷移打造百公頃臺北AI園區〉（2026/10/08）。", ""]
for k, t in blocks:
    md += [f"### {t}" if k == "h" else t, ""]
md += ["## 記者會答問重點（媒體報導整理）", ""]
for q, a, src, url in QA:
    md += [f"**問：{q}**", "", a, "", f"（來源：[{src}]({url})）", ""]
os.makedirs("transcript", exist_ok=True)
open(OUT_MD, "w", encoding="utf-8").write("\n".join(md))

# ---------------- html ----------------
pr_html = "\n".join(f'<h3 id="s{i}">{html.escape(t)}</h3>' if k == "h" else f"<p>{hl(t)}</p>" for i, (k, t) in enumerate(blocks))
toc = "\n".join(f'<li><a href="#s{i}">{html.escape(t)}</a></li>' for i, (k, t) in enumerate(blocks) if k == "h")
qa_html = "\n".join(f'<div class="qa"><p class="q">問：{html.escape(q)}</p><p>{html.escape(a)}</p><p class="src">來源：<a href="{url}" target="_blank" rel="noopener">{src}</a></p></div>' for q, a, src, url in QA)
if segs:
    verb = "\n".join(f'<p class="seg"><a class="t" href="https://youtu.be/{VID}?t={int(s["start"])}" target="_blank" rel="noopener">{ts(s["start"])}</a> {html.escape(s["text"])}</p>' for s in segs)
    verb_block = f'''<section class="block" id="verbatim"><h2>影片語音逐字稿</h2>
<p class="badge ok">自動語音辨識（Whisper）＋繁體轉換，可能有少數錯字，點時間可跳到影片該段。</p>
<div class="segs">{verb}</div></section>'''
else:
    verb_block = '''<section class="block" id="verbatim"><h2>影片語音逐字稿</h2>
<p class="badge wait">⏳ 影片逐字聽打版製作中</p>
<p>YouTube 目前阻擋了自動下載音訊，所以這裡先放<strong>市府新聞稿版的致詞全文</strong>（在下方）。新聞稿是市府發布的官方文字版本；記者會現場的口語用字可能略有不同。</p>
<p>聽打版完成後，會自動出現在這裡，每一句都附時間碼，點一下就能跳到影片該段。</p></section>'''

page = f'''<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>記者會逐字稿｜AI黃金世紀，就從臺北開始（2026/10/08）</title>
<meta name="description" content="臺北市長蔣萬安 2026/10/08「打造AI黃金世紀、全面釋放都市潛力」記者會逐字稿：松山機場遷移、300 公頃臺北AI園區、110 公頃中央公園。大字版，可搜尋。">
<meta property="og:title" content="記者會逐字稿｜AI黃金世紀，就從臺北開始">
<meta property="og:image" content="../assets/og.jpg">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📜</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="transcript.css">
</head>
<body>
<header class="bar">
  <a class="home" href="../">← 回首頁</a>
  <div class="find"><input id="q" type="search" placeholder="搜尋逐字稿，例如：中央公園" aria-label="搜尋逐字稿"><span id="hits" aria-live="polite"></span></div>
  <div class="fs" role="group" aria-label="字體大小"><button data-fs="-1" aria-label="字體縮小">A−</button><button data-fs="1" aria-label="字體放大">A＋</button></div>
</header>
<main class="wrap">
  <p class="kicker">2026.10.08 臺北市政府記者會</p>
  <h1>AI黃金世紀，<br>就從臺北開始</h1>
  <p class="meta">「打造AI黃金世紀、全面釋放都市潛力」重大政策記者會・臺北市長 蔣萬安</p>
  <div class="hero">
    <img src="../assets/photos/chiang-council.jpg" alt="臺北市長蔣萬安">
    <div class="vid"><iframe title="記者會影片" loading="lazy" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" src="https://www.youtube-nocookie.com/embed/{VID}?rel=0"></iframe></div>
  </div>
  <div class="actions"><a class="btn" href="transcript.md" download>⬇ 下載文字檔（.md）</a><a class="btn" href="../slides/AI-Golden-Century-Taipei.pdf">📄 簡報 PDF</a><a class="btn gold" href="../3d/">🚕 3D 體驗</a><button class="btn" onclick="print()">🖨 列印</button></div>
  {verb_block}
  <section class="block" id="speech">
    <h2>致詞全文（臺北市政府新聞稿版）</h2>
    <p class="badge">來源：<a href="https://www.gov.taipei/News_Content.aspx?n=F0DDAF49B89E9413&amp;sms=72544237BBE4C5F6&amp;s=8ED4D25BC664CF21" target="_blank" rel="noopener">臺北市政府新聞稿（2026/10/08）</a>。黃底為重點數字，<q>「引號」</q>為市長原話。</p>
    <nav class="toc" aria-label="段落目錄"><b>段落目錄</b><ol>{toc}</ol></nav>
    <div class="text">{pr_html}</div>
  </section>
  <section class="block" id="qa">
    <h2>記者會答問重點</h2>
    <p class="badge">依媒體報導整理，非逐字。</p>
    {qa_html}
  </section>
  <p class="foot">非官方整理。照片：Wikimedia Commons（臺北市政府，姓名標示）。<a href="../#sources">完整資料來源</a></p>
</main>
<script src="transcript.js" defer></script>
</body>
</html>
'''
open(OUT_HTML, "w", encoding="utf-8").write(page)
print("wrote", OUT_HTML, OUT_MD, "segments:", len(segs), "blocks:", len(blocks))
