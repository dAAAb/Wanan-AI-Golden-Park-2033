#!/usr/bin/env python3
"""Collect freely-licensed photos from Wikimedia Commons.

Phase 1 (always): small candidate thumbnails + license metadata -> research/candidates/
Phase 2 (if tools/fetch/photo_picks.txt lists files): full-size picks -> assets/photos/
"""
import json, os, re, sys, time, urllib.parse
import requests

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "WananAIGoldenParkBot/1.0 (https://github.com/dAAAb/Wanan-AI-Golden-Park-2033)"}
S = requests.Session(); S.headers.update(UA)

GROUPS = {
    "chiang":   {"queries": ["Chiang Wan-an", "蔣萬安", "Wan-an Chiang"], "limit": 70},
    "lee":      {"queries": ["李四川", "Lee Shih-chuan", "Li Szu-chuan"], "limit": 15},
    "songshan": {"queries": ["Taipei Songshan Airport aerial", "松山機場", "Songshan Airport runway"], "limit": 25},
    "skyline":  {"queries": ["Taipei skyline night", "Taipei 101 skyline", "Taipei city aerial view"], "limit": 20},
    "park":     {"queries": ["Daan Forest Park aerial", "Dajia Riverside Park", "Keelung River Taipei"], "limit": 12},
}

def api(**params):
    params.update(format="json", formatversion=2)
    for i in range(5):
        try:
            r = S.get(API, params=params, timeout=60)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print("retry", e); time.sleep(3 * (i + 1))
    return {}

def cat_files(cat, depth=1, seen=None):
    seen = seen if seen is not None else set()
    if cat in seen: return []
    seen.add(cat)
    out = []
    cont = {}
    while True:
        d = api(action="query", list="categorymembers", cmtitle=cat, cmlimit=500, cmtype="file|subcat", **cont)
        for m in d.get("query", {}).get("categorymembers", []):
            if m["ns"] == 6: out.append(m["title"])
            elif m["ns"] == 14 and depth > 0: out += cat_files(m["title"], depth - 1, seen)
        if "continue" in d: cont = d["continue"]
        else: break
    return out

def search(q, ns, limit=50):
    d = api(action="query", list="search", srsearch=q, srnamespace=ns, srlimit=limit)
    return [x["title"] for x in d.get("query", {}).get("search", [])]

def info(titles, width):
    res = {}
    for i in range(0, len(titles), 40):
        chunk = titles[i:i + 40]
        d = api(action="query", titles="|".join(chunk), prop="imageinfo",
                iiprop="url|size|mime|extmetadata", iiurlwidth=width)
        for p in d.get("query", {}).get("pages", []):
            ii = (p.get("imageinfo") or [None])[0]
            if not ii: continue
            em = ii.get("extmetadata", {})
            g = lambda k: re.sub(r"<[^>]+>", "", em.get(k, {}).get("value", "")).strip()
            res[p["title"]] = {
                "title": p["title"], "mime": ii.get("mime"), "w": ii.get("width"), "h": ii.get("height"),
                "thumb": ii.get("thumburl"), "page": ii.get("descriptionurl"),
                "license": g("LicenseShortName"), "artist": g("Artist"), "credit": g("Credit"),
                "desc": g("ImageDescription")[:400], "date": g("DateTimeOriginal") or g("DateTime"),
            }
    return res

def slug(t):
    t = t.replace("File:", "")
    base, ext = os.path.splitext(t)
    base = re.sub(r"[^A-Za-z0-9一-鿿_-]+", "_", base)[:70]
    return base + (ext.lower() if ext.lower() in (".jpg", ".jpeg", ".png", ".webp") else ".jpg")

def download(url, path):
    for i in range(4):
        try:
            r = S.get(url, timeout=120)
            if r.status_code == 200:
                open(path, "wb").write(r.content); return True
            print("http", r.status_code, url)
        except Exception as e:
            print("dl retry", e)
        time.sleep(2 * (i + 1))
    return False

def main():
    os.makedirs("research/candidates", exist_ok=True)
    manifest = {}
    for g, cfg in GROUPS.items():
        titles = []
        for q in cfg["queries"]:
            for c in search(q, 14, 5):
                titles += cat_files(c, depth=1)
            titles += search(q, 6, 50)
        uniq = []
        for t in titles:
            if t not in uniq and re.search(r"\.(jpe?g|png|webp)$", t, re.I): uniq.append(t)
        uniq = uniq[: cfg["limit"] * 2]
        meta = info(uniq, 480)
        items = [meta[t] for t in uniq if t in meta and (meta[t]["w"] or 0) >= 800][: cfg["limit"]]
        d = f"research/candidates/{g}"; os.makedirs(d, exist_ok=True)
        for n, it in enumerate(items):
            fn = f"{n:02d}_{slug(it['title'])}"
            if it["thumb"] and download(it["thumb"], f"{d}/{fn}"):
                it["file"] = f"{d}/{fn}"
        manifest[g] = items
        print(g, len(items))
    json.dump(manifest, open("research/candidates/manifest.json", "w"), ensure_ascii=False, indent=1)

    picks_file = "tools/fetch/photo_picks.txt"
    if os.path.exists(picks_file):
        picks = [l.strip() for l in open(picks_file, encoding="utf-8") if l.strip() and not l.startswith("#")]
        if picks:
            os.makedirs("assets/photos", exist_ok=True)
            pm = info([p.split("=>")[0].strip() for p in picks], 1920)
            credits = []
            for p in picks:
                t, _, name = [x.strip() for x in p.partition("=>")]
                it = pm.get(t)
                if not it: print("missing", t); continue
                name = name or slug(t)
                url = it["thumb"] if (it["w"] or 0) > 1920 else it["thumb"] or it["page"]
                if download(url, f"assets/photos/{name}"):
                    it["file"] = f"assets/photos/{name}"; credits.append(it)
            json.dump(credits, open("assets/photos/credits.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
