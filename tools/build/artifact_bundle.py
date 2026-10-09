#!/usr/bin/env python3
"""Build Claude-Artifact-ready copies of the three pages (site, 3D, transcript).

Artifact pages are wrapped in their own <html>/<head>/<body> skeleton, run in a locked-down frame
(no iframes, no downloads, no print, no Web Share) and can only fetch files published alongside them.
So each bundle gets: the page body with head assets on top, paths flattened to the bundle root,
YouTube embeds turned into links, downloads pointed at GitHub, and links to the sibling artifacts.

usage: python3 tools/build/artifact_bundle.py <outdir> [tools/build/artifact_urls.json]
"""
import json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.abspath(sys.argv[1])
URLS = {"main": "", "3d": "", "transcript": ""}
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
    html = html.replace('href="slides/AI-Golden-Century-Taipei.pptx" download', f'href="{RAW}/slides/AI-Golden-Century-Taipei.pptx"')
    html = html.replace('href="slides/AI-Golden-Century-Taipei.pdf" target="_blank" rel="noopener"', f'href="{GH}/blob/{BR}/slides/AI-Golden-Century-Taipei.pdf"')
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
    html = html.replace('href="../slides/AI-Golden-Century-Taipei.pdf"', f'href="{GH}/blob/{BR}/slides/AI-Golden-Century-Taipei.pdf"')
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


if __name__ == "__main__":
    shutil.rmtree(OUT, ignore_errors=True)
    man = {"site": build_site(), "3d": build_3d(), "transcript": build_transcript()}
    json.dump(man, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
    for k, v in man.items():
        size = sum(os.path.getsize(os.path.join(OUT, k, f)) for f in v) + os.path.getsize(os.path.join(OUT, k, "index.html"))
        print(k, len(v), "files", round(size / 1e6, 1), "MB")
