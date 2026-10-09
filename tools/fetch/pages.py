#!/usr/bin/env python3
"""Archive the text of official / news pages about the 2026-10-08 announcement for fact-checking."""
import json, os, re, time, requests, trafilatura

URLS = [
    "https://www.gov.taipei/News_Content.aspx?n=F0DDAF49B89E9413&sms=72544237BBE4C5F6&s=8ED4D25BC664CF21",
    "https://www.cna.com.tw/news/aipl/202610080124.aspx",
    "https://www.cna.com.tw/news/aloc/202610080387.aspx",
    "https://udn.com/news/story/7314/9802116",
    "https://udn.com/news/story/124652/9802260",
    "https://udn.com/news/story/124652/9804107",
    "https://udn.com/news/story/124652/9804117",
    "https://udn.com/news/story/124652/9803489",
    "https://udn.com/news/story/124652/9803593",
    "https://news.ltn.com.tw/news/politics/breakingnews/5599727",
    "https://news.ltn.com.tw/news/politics/breakingnews/5600713",
    "https://www.chinatimes.com/realtimenews/20261008002567-260407",
    "https://www.chinatimes.com/realtimenews/20261008005192-260407",
    "https://news.tvbs.com.tw/politics/4033223",
    "https://news.ebc.net.tw/news/politics/574742",
    "https://news.ebc.net.tw/news/living/574815",
    "https://news.nextapple.com/politics/20261008/1CF73DB6E1C1A1411AB067D4A426C210",
    "https://news.nextapple.com/politics/20261008/9ABDE05E0D22B05A9B5691B8832FA4CF",
    "https://annewsmedia.com/2026/10/08/regional-focus/22563/",
    "https://n.yam.com/Article/20261008259825",
    "https://n.yam.com/Article/20261008192413",
    "https://www.nownews.com/news/6881859",
    "https://www.nownews.com/news/6881657",
    "https://www.myhousing.com.tw/n/n01/north-taiwan/taipei-city-estate/298304/",
    "https://leho.com.tw/archives/399378",
    "https://www.worldjournal.com/wj/story/121221/9802151",
    "https://newtalk.tw/news/view/2026-10-09/1064564",
    "https://www.bnext.com.tw/article/92509/taipei-mayor-2026-shen-chiang-tech-policy",
    "https://zh.wikipedia.org/zh-tw/%E8%94%A3%E8%90%AC%E5%AE%89",
    "https://zh.wikipedia.org/zh-tw/%E8%87%BA%E5%8C%97%E6%9D%BE%E5%B1%B1%E6%A9%9F%E5%A0%B4",
]
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
      "Accept-Language": "zh-TW,zh;q=0.9"}

def main():
    os.makedirs("research/pages", exist_ok=True)
    index = []
    for i, u in enumerate(URLS):
        try:
            r = requests.get(u, headers=UA, timeout=60)
            html = r.text
            text = trafilatura.extract(html, include_comments=False, include_tables=True, favor_recall=True) or ""
            title = (re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I) or [None, ""])[1].strip()
            # keep og:image for reference
            og = (re.search(r'property="og:image"\s+content="([^"]+)"', html) or [None, ""])[1]
            fn = f"research/pages/{i:02d}.txt"
            open(fn, "w", encoding="utf-8").write(f"URL: {u}\nTITLE: {title}\nOG: {og}\nSTATUS: {r.status_code}\n\n{text}\n")
            index.append({"url": u, "title": title, "status": r.status_code, "chars": len(text), "file": fn})
            print(r.status_code, len(text), u)
        except Exception as e:
            print("ERR", u, e); index.append({"url": u, "error": str(e)})
        time.sleep(1)
    json.dump(index, open("research/pages/index.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
