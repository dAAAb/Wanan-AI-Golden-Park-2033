# 臺北 2033 介紹影片（Remotion）

直式 1080×1920、約 80–95 秒的導流短片：網友留言 → 構想 → 完整 prompt → 程式碼特寫（OpenStreetMap、GLSL 窗光、NaN 黑方塊 bug）→ 3D 實機畫面 → 網站／逐字稿／簡報 → `ai2033.taipei`。

## 流程

1. **旁白**：`narration.json` 是逐場景的旁白（`text` 給語音念、`sub` 是字幕）。推送後 GitHub Actions 的 `tts` 工作流程會用 ElevenLabs（專案擁有者的聲音、最新 v4 模型）產生 `public/vo/*.mp3` 與 `timing.json` 並自動提交。需要 repo secret `ELEVENLABS_API_KEY`。
2. **3D 畫面**：`public/clips/*.mp4` 由 `tools/build/record_demo.mjs` 錄的逐格畫面切出（不進 git）：
   ```bash
   node tools/build/record_demo.mjs /tmp/frames
   cd video/public/clips
   for seg in "drive 0 210" "timemachine 210 375" "tour 585 570" "night 1155 180"; do set -- $seg
     ffmpeg -y -framerate 30 -start_number $2 -i /tmp/frames/f%05d.jpg -frames:v $3 -c:v libx264 -crf 18 -pix_fmt yuv420p $1.mp4; done
   ```
3. **網站截圖**：`node video/scripts/capture.mjs`（先在 repo 根目錄 `npx http-server -p 8123 .`）。
4. **時間軸**：`node scripts/timing.mjs` 依實際旁白長度（沒有旁白時用字數估算）產生 `src/timing.json`。
5. **輸出**：
   ```bash
   cd video && npm install
   node scripts/timing.mjs
   npx remotion render src/index.ts IntroVertical out/intro.mp4 --props='{"modelLabel":"Claude","bgm":true}'
   ```
   `modelLabel` 是第 3 幕畫面上顯示的 AI 模型名稱；`bgm:false` 輸出無配樂版（保留音效）。

音樂與音效出處見 `public/sfx/ATTRIBUTION.md`（Mixkit 免費授權）。部分鏡頭參考 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) 的配方。
