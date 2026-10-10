#!/usr/bin/env python3
"""Slide viewer page (slides/index.html): every page of the deck as an image, speaker notes, downloads.

The same viewer template (tools/build/artifact_slides.html) also feeds the Claude Artifact copy built
by artifact_bundle.py; this script builds the version served on the website itself.

usage: python3 tools/build/slides_page.py      (after the PDF in slides/ has been rebuilt)
"""
import html as H, json, os, re, shutil, subprocess, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DECK = "slides/AI-Golden-Century-Taipei"
SITE = "https://ai2033.taipei"
TITLES = ["AI黃金世紀，從臺北開始！", "一張圖看懂：松山機場變身臺北AI園區", "輝達來了，臺北最缺的是「腹地」", "半世紀前竹科，半世紀後臺北",
          "300 公頃怎麼用？", "2026 ⇄ 2033：一樣的地，完全不同的未來", "100 公頃 AI 產業聚落：預估 12 兆產值", "110 公頃中央公園：臺北的「綠色脊柱」",
          "解鎖 570 公頃都更：增加約 15 萬戶", "打通交通任督二脈：XY 軸捷運＋跨河廊道", "首都科技廊帶（CTC）：串聯北臺灣 8 縣市", "蔣萬安 ＋ 李四川 ＝ 大台北新矽谷",
          "時程與配套：2033 年，條件成熟", "親自開車看：3D 臺北 2033", "結語：為臺灣開創新的「AI黃金世紀」", "資料來源與授權"]


def deck_notes():
    """Speaker notes of each slide, in order (without the slide-number field)."""
    z = zipfile.ZipFile(os.path.join(ROOT, DECK + ".pptx"))
    n = len([f for f in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", f)])
    out = []
    for i in range(1, n + 1):
        rel = z.read(f"ppt/slides/_rels/slide{i}.xml.rels").decode()
        m = re.search(r"notesSlides/(notesSlide\d+\.xml)", rel)
        runs = [H.unescape(t) for t in re.findall(r"<a:t>([^<]*)</a:t>", z.read("ppt/notesSlides/" + m.group(1)).decode())] if m else []
        if runs and runs[-1].strip() == str(i): runs = runs[:-1]
        out.append("".join(runs).strip())
    return out


def render_pages(outdir):
    """Rasterise the PDF into outdir/img (1920 px) and outdir/thumb (480 px); returns the slide data list."""
    for sub in ("img", "thumb"):
        shutil.rmtree(os.path.join(outdir, sub), ignore_errors=True); os.makedirs(os.path.join(outdir, sub))
    pdf = os.path.join(ROOT, DECK + ".pdf")
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=86", "-scale-to-x", "1920", "-scale-to-y", "1080", pdf, os.path.join(outdir, "img", "s")], check=True)
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=80", "-scale-to-x", "480", "-scale-to-y", "270", pdf, os.path.join(outdir, "thumb", "s")], check=True)
    imgs, thumbs = sorted(os.listdir(os.path.join(outdir, "img"))), sorted(os.listdir(os.path.join(outdir, "thumb")))
    notes = deck_notes()
    assert len(imgs) == len(thumbs) == len(notes) == len(TITLES), (len(imgs), len(notes))
    return [{"t": t, "n": n, "img": f"img/{i}", "th": f"thumb/{th}"} for t, n, i, th in zip(TITLES, notes, imgs, thumbs)]


def viewer(data, links):
    """Fill the viewer template; links maps the template's __PLACEHOLDERS__ to URLs."""
    page = open(os.path.join(ROOT, "tools/build/artifact_slides.html"), encoding="utf-8").read()
    page = page.replace("/*SLIDES*/[]", json.dumps(data, ensure_ascii=False))
    for k, v in links.items():
        page = page.replace(k, v)
    return page


def main():
    out = os.path.join(ROOT, "slides")
    data = render_pages(out)
    frag = viewer(data, {"__GH_PPTX__": "AI-Golden-Century-Taipei.pptx", "__GH_PDF__": "AI-Golden-Century-Taipei.pdf",
                         "__PDF_SRC__": "AI-Golden-Century-Taipei.pdf",
                         "__U_MAIN__": "../", "__U_3D__": "../3d/", "__U_TRANSCRIPT__": "../transcript/"})
    # on the website the files sit next to the page: plain download links, sibling pages in the same tab
    frag = frag.replace('id="getPptx" href="AI-Golden-Century-Taipei.pptx" target="_blank" rel="noopener"', 'id="getPptx" href="AI-Golden-Century-Taipei.pptx" download')
    frag = re.sub(r'(href="\.\./[^"]*") target="_blank" rel="noopener"', r"\1", frag)
    head, body = frag.split('<div class="app">', 1)
    head = head.replace("<title>AI黃金世紀簡報</title>", "<title>簡報｜AI黃金世紀，從臺北開始（2026/10/08 記者會）</title>")
    desc = "「AI黃金世紀，從臺北開始」16 頁簡報線上翻閱：松山機場遷移、300 公頃臺北AI園區、110 公頃中央公園，附講者備註與 PPTX／PDF 下載（非官方整理）。"
    page = f"""<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{head.strip()}
<meta name="description" content="{desc}">
<link rel="canonical" href="{SITE}/slides/">
<meta property="og:type" content="website">
<meta property="og:title" content="AI黃金世紀，從臺北開始！簡報">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE}/slides/">
<meta property="og:image" content="{SITE}/slides/img/s-01.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b1730">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>">
<style>html,body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
</head>
<body>
<div class="app">{body.rstrip()}
</body>
</html>
"""
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(page)
    print("slides/index.html", len(data), "slides")


if __name__ == "__main__":
    main()
