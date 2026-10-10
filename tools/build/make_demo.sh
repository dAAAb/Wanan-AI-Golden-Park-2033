#!/usr/bin/env bash
# Assemble docs/demo.mp4 (title card -> recorded 3D frames -> end card) and the README preview docs/demo.gif.
# usage: tools/build/make_demo.sh <framesDir> [fps]
#   frames come from: node tools/build/record_demo.mjs <framesDir>
#   cards come from:  node tools/build/cards.mjs docs
set -euo pipefail
FR=${1:?frames dir}; FPS=${2:-30}; OUT=docs
N=$(ls "$FR"/f*.jpg | wc -l)
CLIP=$(python3 -c "print($N/$FPS)")
IN=2.5; END=3.5; X=0.6
OFF1=$(python3 -c "print($IN-$X)"); OFF2=$(python3 -c "print($IN+$CLIP-2*$X)")
ffmpeg -y -loglevel error \
  -loop 1 -framerate "$FPS" -t "$IN" -i "$OUT/card-intro.jpg" \
  -framerate "$FPS" -i "$FR/f%05d.jpg" \
  -loop 1 -framerate "$FPS" -t "$END" -i "$OUT/card-outro.jpg" \
  -filter_complex "[0:v]scale=1280:720,setsar=1,fps=$FPS,format=yuv420p[a];[1:v]scale=1280:720,setsar=1,fps=$FPS,format=yuv420p[b];[2:v]scale=1280:720,setsar=1,fps=$FPS,format=yuv420p[c];[a][b]xfade=transition=fade:duration=$X:offset=$OFF1[ab];[ab][c]xfade=transition=fade:duration=$X:offset=$OFF2[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart "$OUT/demo.mp4"
# README preview: the time machine, 14 s at 10 fps, 640 px wide
ffmpeg -y -loglevel error -ss 8 -t 14 -i "$OUT/demo.mp4" \
  -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
  "$OUT/demo.gif"
ls -la "$OUT/demo.mp4" "$OUT/demo.gif"
