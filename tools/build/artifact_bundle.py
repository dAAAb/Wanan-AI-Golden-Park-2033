#!/usr/bin/env python3
"""Build Claude-Artifact-ready copies of the three pages (site, 3D, transcript).

Artifact pages are wrapped in their own <html>/<head>/<body> skeleton, run in a locked-down frame
(no iframes, no downloads, no print, no Web Share) and can only fetch files published alongside them.
So each bundle gets: the page body with head assets on top, paths flattened to the bundle root,
YouTube embeds turned into links, downloads pointed at GitHub, and links to the sibling artifacts.

usage: python3 tools/build/artifact_bundle.py <outdir> [tools/build/artifact_urls.json]
"""
import html as H, json, os, re, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.abspath(sys.argv[1])
URLS = {"main": "", "3d": "", "transcript": "", "slides": ""}
if len(sys.argv) > 2 and os.path.exists(sys.argv[2]):
    URLS.update(json.load(open(sys.argv[2])))
GH = "https://github.com/dAAAb/Wanan-AI-Golden-Park-2033"
BR = "claude/taipei-ai-park-interactive-wsso9d"
RAW = f"{GH}/raw/{BR}"
YT = "https://youtu.be/ircGbXWHRbQ"
THREE = "https://cdn.jsdelivr.net/npm/three@0.160.0"
# fall back to the GitHub copy of a page until its artifact exists
FALLBACK = {"main": f"https://raw.githack.com/dAAAb/Wanan-AI-Golden-Park-2033/{BR}/index.html",
            "3d": f"https://raw.githack.com/dAAAb/Wanan-AI-Golden-Park-2033/{BR}/3d/index.html",
            "transcript": f"https://raw.githack.com/dAAAb/Wanan-AI-Golden-Park-2033/{BR}/transcript/index.html"}
U = {k: (URLS.get(k) or FALLBACK[k]) for k in FALLBACK}
DECK = "slides/AI-Golden-Century-Taipei"
# PPT/PDF buttons go to the slides artifact once it exists, else to the files on GitHub
PPTX_URL = URLS.get("slides") or f"{RAW}/{DECK}.pptx"
PDF_URL = URLS.get("slides") or f"{GH}/blob/{BR}/{DECK}.pdf"


def read(p): return open(os.path.join(ROOT, p), encoding="utf-8").read()


def to_fragment(html, title):
    """Drop doctype/html/head/body wrappers; keep title, stylesheets, importmap and the body content."""
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    keep = []
    for m in re.finditer(r"<link[^>]+>|<script type=\"importmap\">.*?</script>|<style>.*?</style>", head, re.S):
        tag = m.group(0)
        if 'rel="icon"' in tag or 'rel="preconnect"' in tag: continue
        keep.append(tag)
    return f"<title>{title}</title>\n" + "\n".join(keep) + "\n" + body.strip() + "\n"


def ext_link(html):
    """Make every absolute http(s) link open in a new tab (in-frame navigation to other sites is blocked)."""
    def fix(m):
        tag = m.group(0)
        if 'href="http' in tag and "target=" not in tag:
            tag = tag[:-1] + ' target="_blank" rel="noopener">'
        return tag
    return re.sub(r"<a\s[^>]*>", fix, html)


def copy(rel_src, bundle, rel_dst=None, transform=None):
    dst = os.path.join(OUT, bundle, rel_dst or rel_src)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if transform:
        open(dst, "w", encoding="utf-8").write(transform(read(rel_src)))
    else:
        shutil.copyfile(os.path.join(ROOT, rel_src), dst)
    return os.path.relpath(dst, os.path.join(OUT, bundle))


def build_site():
    b = "site"
    html = read("index.html")
    html = html.replace('href="3d/index.html"', f'href="{U["3d"]}"').replace('href="transcript/index.html"', f'href="{U["transcript"]}"')
    # no iframes in artifacts: the video cover becomes a link to YouTube
    html = re.sub(r'<div class="video">.*?</div>\n',
                  f'<a class="video" href="{YT}">\n        <span class="video-cover"><img src="assets/photos/chiang-council.jpg" alt="">'
                  '<span class="play">▶</span><span class="vlabel">在 YouTube 觀看記者會</span></span>\n      </a>\n', html, count=1, flags=re.S)
    # downloads are inert inside the frame: send them to GitHub instead
    html = html.replace('href="slides/AI-Golden-Century-Taipei.pptx" download', f'href="{PPTX_URL}"')
    html = html.replace('href="slides/AI-Golden-Century-Taipei.pdf" target="_blank" rel="noopener"', f'href="{PDF_URL}"')
    html = re.sub(r'\s*<div class="share">.*?</div>', '', html, count=1, flags=re.S)
    html = ext_link(html)
    open_path = os.path.join(OUT, b, "index.html"); os.makedirs(os.path.dirname(open_path), exist_ok=True)
    open(open_path, "w", encoding="utf-8").write(to_fragment(html, "AI黃金世紀，從臺北開始"))
    files = [copy("assets/css/site.css", b), copy("assets/js/site.js", b), copy("assets/photos/credits.json", b)]
    for d in ("assets/photos", "assets/renders"):
        for f in sorted(os.listdir(os.path.join(ROOT, d))):
            if f.endswith(".jpg"): files.append(copy(f"{d}/{f}", b))
    return files


def build_3d():
    b = "3d"
    # import-map targets must be ./-relative (a bare "vendor/…" is ignored as a bare specifier)
    fix = lambda s: s.replace("../vendor/", "./vendor/").replace("../assets/", "./assets/")
    # three.js comes from the allowlisted CDN (same npm build as vendor/three, r160)
    html = read("3d/index.html").replace("../vendor/three/three.module.min.js", f"{THREE}/build/three.module.min.js").replace("../vendor/three/addons/", f"{THREE}/examples/jsm/")
    html = fix(html)
    html = html.replace('href="../index.html"', f'href="{U["main"]}"').replace('href="../transcript/index.html"', f'href="{U["transcript"]}"')
    html = ext_link(html)
    p = os.path.join(OUT, b, "index.html"); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8").write(to_fragment(html, "臺北 2033"))
    files = [copy("3d/style.css", b, "style.css")]
    for f in ("main.js", "city.js", "content.js"):
        files.append(copy(f"3d/js/{f}", b, f"js/{f}", fix))
    files.append(copy("3d/data/city.json", b, "data/city.json"))
    # every image the page or its scripts point at
    refs = set()
    for src in ("3d/index.html", "3d/js/main.js", "3d/js/city.js", "3d/js/content.js"):
        refs |= set(re.findall(r"\.\./(assets/[\w./-]+\.(?:jpg|png|webp))", read(src)))
    for f in sorted(refs):
        files.append(copy(f, b))
    return files


def build_transcript():
    b = "transcript"
    html = read("transcript/index.html").replace("../assets/", "assets/")
    html = html.replace('href="../index.html#sources"', f'href="{U["main"]}"').replace('href="../index.html"', f'href="{U["main"]}"')
    html = html.replace('href="../3d/index.html"', f'href="{U["3d"]}"')
    html = html.replace('href="../slides/AI-Golden-Century-Taipei.pdf"', f'href="{PDF_URL}"')
    html = html.replace('href="transcript.md" download', f'href="{GH}/blob/{BR}/transcript/transcript.md"')
    html = re.sub(r'<button class="btn" onclick="print\(\)">.*?</button>', '', html)
    html = re.sub(r'<div class="vid"><iframe[^>]*></iframe></div>',
                  f'<a class="vid" href="{YT}"><span class="vid-link">▶ 在 YouTube 觀看記者會</span></a>', html)
    html = ext_link(html)
    p = os.path.join(OUT, b, "index.html"); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8").write(to_fragment(html, "AI黃金世紀記者會逐字稿"))
    css = read("transcript/transcript.css") + "\n.vid{display:flex;align-items:center;justify-content:center;text-decoration:none;background:linear-gradient(135deg,#0b1730,#1c2f5e)}\n.vid-link{color:#ffc83d;font-weight:900;font-size:1.1em}\n"
    os.makedirs(os.path.join(OUT, b), exist_ok=True)
    open(os.path.join(OUT, b, "transcript.css"), "w", encoding="utf-8").write(css)
    return ["transcript.css", copy("transcript/transcript.js", b, "transcript.js"), copy("assets/photos/chiang-council.jpg", b)]


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


def build_slides():
    """Slide viewer: every page as an image, notes, and the real PPTX/PDF files for download."""
    b = "slides"
    d = os.path.join(OUT, b); os.makedirs(os.path.join(d, "img"), exist_ok=True); os.makedirs(os.path.join(d, "thumb"), exist_ok=True)
    pdf = os.path.join(ROOT, DECK + ".pdf")
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=86", "-scale-to-x", "1920", "-scale-to-y", "1080", pdf, os.path.join(d, "img", "s")], check=True)
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=80", "-scale-to-x", "480", "-scale-to-y", "270", pdf, os.path.join(d, "thumb", "s")], check=True)
    imgs, thumbs = sorted(os.listdir(os.path.join(d, "img"))), sorted(os.listdir(os.path.join(d, "thumb")))
    notes = deck_notes()
    assert len(imgs) == len(thumbs) == len(notes) == len(TITLES), (len(imgs), len(notes))
    data = [{"t": t, "n": n, "img": f"img/{i}", "th": f"thumb/{th}"} for t, n, i, th in zip(TITLES, notes, imgs, thumbs)]
    page = read("tools/build/artifact_slides.html")
    page = page.replace("/*SLIDES*/[]", json.dumps(data, ensure_ascii=False))
    for k, v in {"__GH_PPTX__": f"{RAW}/{DECK}.pptx", "__GH_PDF__": f"{GH}/blob/{BR}/{DECK}.pdf",
                 "__PPTX_SRC__": "files/AI-Golden-Century-Taipei.pptx.zip", "__PDF_SRC__": "files/AI-Golden-Century-Taipei.pdf",
                 "__U_MAIN__": U["main"], "__U_3D__": U["3d"], "__U_TRANSCRIPT__": U["transcript"]}.items():
        page = page.replace(k, v)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page)
    # a .pptx is a zip; it is published under .zip (a standard web type) and saved back as .pptx
    files = [copy(DECK + ".pptx", b, "files/AI-Golden-Century-Taipei.pptx.zip"), copy(DECK + ".pdf", b, "files/AI-Golden-Century-Taipei.pdf")]
    return files + [f"img/{f}" for f in imgs] + [f"thumb/{f}" for f in thumbs]


if __name__ == "__main__":
    shutil.rmtree(OUT, ignore_errors=True)
    man = {"site": build_site(), "3d": build_3d(), "transcript": build_transcript(), "slides": build_slides()}
    json.dump(man, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
    for k, v in man.items():
        size = sum(os.path.getsize(os.path.join(OUT, k, f)) for f in v) + os.path.getsize(os.path.join(OUT, k, "index.html"))
        print(k, len(v), "files", round(size / 1e6, 1), "MB")
