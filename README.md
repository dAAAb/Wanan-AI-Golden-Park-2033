# AI黃金世紀，從臺北開始！

非官方整理網站：2026/10/08 臺北市長蔣萬安「打造AI黃金世紀、全面釋放都市潛力」記者會。內容包括松山機場遷移、300 公頃臺北AI園區、110 公頃中央公園。

## 公開連結

**Claude Artifacts 版（不需 githack）**

| 內容 | 連結 |
|---|---|
| 🌐 大字版互動網站 | https://claude.ai/artifact/8K5y9QidbXzNhXdy4qw3XF |
| 🚕 3D 臺北 GTA 沉浸體驗 | https://claude.ai/artifact/Tq7QNLoTAKGTSxAHkZiysG |
| 📜 記者會逐字稿 | https://claude.ai/artifact/Gtpv4cLdzdZ4EuogomFQ7J |
| 📊 簡報（線上翻閱＋PDF 下載；PPTX 由 GitHub 下載） | https://claude.ai/artifact/9dBaPN8bmqUmXCxnEyShDX |

> Artifact 版由 `tools/build/artifact_bundle.py` 產生（網址記在 `tools/build/artifact_urls.json`）：YouTube 影片改為連結、three.js 從 jsDelivr 載入；簡報頁內附 PDF，.pptx 因 Artifact 不能夾帶 Office 檔，改由 GitHub 下載。

**GitHub（githack）版**

| 內容 | 連結 |
|---|---|
| 🌐 大字版互動網站 | https://raw.githack.com/dAAAb/Wanan-AI-Golden-Park-2033/claude/taipei-ai-park-interactive-wsso9d/index.html |
| 🚕 3D 臺北 GTA 沉浸體驗 | https://raw.githack.com/dAAAb/Wanan-AI-Golden-Park-2033/claude/taipei-ai-park-interactive-wsso9d/3d/index.html |
| 📜 記者會逐字稿 | https://raw.githack.com/dAAAb/Wanan-AI-Golden-Park-2033/claude/taipei-ai-park-interactive-wsso9d/transcript/index.html |
| 📊 PPT 簡報（.pptx） | https://raw.githack.com/dAAAb/Wanan-AI-Golden-Park-2033/claude/taipei-ai-park-interactive-wsso9d/slides/AI-Golden-Century-Taipei.pptx |
| 📄 PDF 簡報 | https://raw.githack.com/dAAAb/Wanan-AI-Golden-Park-2033/claude/taipei-ai-park-interactive-wsso9d/slides/AI-Golden-Century-Taipei.pdf |

> 這些連結透過 raw.githack.com 直接從本 repo 提供，推送後幾分鐘內就會更新。第一次打開網頁時，githack 會先顯示「One more step」提示頁，按紅色的 **Open the page** 就會進入網站。
>
> **建議啟用 GitHub Pages（約 30 秒，網址更短、沒有提示頁）**：repo 的 Settings → Pages → Build and deployment → Source 選「Deploy from a branch」→ Branch 選 `claude/taipei-ai-park-interactive-wsso9d`、資料夾 `/ (root)` → Save。約 1 分鐘後即可使用：
> - 網站：https://daaab.github.io/Wanan-AI-Golden-Park-2033/
> - 3D：https://daaab.github.io/Wanan-AI-Golden-Park-2033/3d/
> - 逐字稿：https://daaab.github.io/Wanan-AI-Golden-Park-2033/transcript/
> - 簡報：https://daaab.github.io/Wanan-AI-Golden-Park-2033/slides/AI-Golden-Century-Taipei.pdf

## 結構

- `index.html` – 主網站（字體大小可調、前後對比滑桿、分區介紹、XY 軸捷運、大台北新矽谷、FAQ）
- `3d/` – three.js 3D 體驗：OpenStreetMap 真實街廓（約 6 萬棟建築）、開車／空拍／導覽模式、2026⇄2033 變身、日夜切換、小地圖、任務與檢查點
- `transcript/` – 逐字稿頁（可搜尋、可下載 .md）
- `slides/` – 16 頁簡報（PPTX＋PDF，含講者備註）
- `tools/build/` – 由 OSM 產生 3D 資料、產生逐字稿、渲染圖、簡報的腳本
- `.github/workflows/` – 在 GitHub Actions 抓取照片、OSM、新聞原文與影片音訊

## 影片逐字聽打版（Whisper）

YouTube 擋下雲端主機的自動下載，所以目前逐字稿頁放的是**市府新聞稿版致詞全文**，以及媒體報導整理的答問重點。以下任一方式提供音訊後，`fetch-transcript` 工作流程會自動用 Whisper 轉寫、轉成繁體，並更新逐字稿頁：

1. 把影片或音檔（mp3/m4a/mp4）上傳到 `research/youtube/input/`
2. 在 Actions → fetch-transcript → Run workflow，填入可直接下載的影音網址
3. 在 repo Secrets 新增 `YT_COOKIES`（YouTube cookies.txt），再手動執行 fetch-transcript

## 資料與授權

- 內容依據：臺北市政府新聞稿（2026/10/08）及中央社、自由時報、TVBS、聯合報等報導
- 地圖：© OpenStreetMap 貢獻者（ODbL），Geofabrik 擷取
- 照片：Wikimedia Commons（作者與授權見 `assets/photos/credits.json` 與網站底部）
- 3D 園區配置為依新聞稿文字繪製之**示意**，非正式設計圖；本站與臺北市政府無隸屬關係
