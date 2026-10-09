#!/usr/bin/env bash
# Fetch metadata, captions and audio for the 2026-10-08 press conference video.
set -u
VID="${1:-ircGbXWHRbQ}"
OUT=research/youtube
mkdir -p "$OUT" /tmp/yt
URL="https://www.youtube.com/watch?v=$VID"
CLIENTS=("default" "default,-web" "tv_simply" "mweb" "web_safari" "android_vr" "tv" "ios" "web_embedded")
for c in "${CLIENTS[@]}"; do
  echo "== metadata/subs with client $c"
  yt-dlp --skip-download --write-info-json --write-description --write-subs --write-auto-subs \
    --sub-langs "zh.*,zh,en,en-orig" --sub-format "json3/vtt/best" \
    --extractor-args "youtube:player_client=$c" -o "$OUT/%(id)s.%(ext)s" "$URL" && break
done
for c in "${CLIENTS[@]}"; do
  echo "== audio with client $c"
  if yt-dlp -f "bestaudio/best" --extractor-args "youtube:player_client=$c" -o "/tmp/yt/audio.%(ext)s" "$URL"; then break; fi
done
A=$(ls /tmp/yt/audio.* 2>/dev/null | head -1)
if [ -z "$A" ]; then echo "NO AUDIO"; echo "audio download failed $(date -u)" > "$OUT/STATUS.txt"; exit 0; fi
ffmpeg -nostdin -y -i "$A" -ac 1 -ar 16000 /tmp/yt/audio16k.wav
ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/yt/audio16k.wav > "$OUT/duration.txt"
echo "audio ok $(cat $OUT/duration.txt)s $(date -u)" > "$OUT/STATUS.txt"
