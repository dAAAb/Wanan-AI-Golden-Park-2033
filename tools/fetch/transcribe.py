#!/usr/bin/env python3
"""Transcribe the press-conference audio with faster-whisper and save JSON/SRT/TXT (Traditional Chinese)."""
import json, os, sys, time
from faster_whisper import WhisperModel
from opencc import OpenCC

AUDIO = sys.argv[1] if len(sys.argv) > 1 else "/tmp/yt/audio16k.wav"
MODEL = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
OUT = "research/youtube"
PROMPT = ("以下是臺北市長蔣萬安於臺北市政府大數據中心舉行的「打造AI黃金世紀、全面釋放都市潛力」記者會逐字稿，"
          "內容提到松山機場遷移、臺北AI園區、300公頃、100公頃AI產業聚落、90公頃國際永續生活聚落、110公頃臺北中央綠地公園、"
          "輝達、北士科、內湖科技園區、南港軟體園區、桃園機場第三航廈、第三跑道、12兆產值、6.5萬就業人口、570公頃航高限制、都市更新、李四川、新北。")
cc = OpenCC("s2twp")

def ts(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s - int(s)) * 1000):03d}"

def save(segs):
    json.dump(segs, open(f"{OUT}/whisper_segments.json", "w"), ensure_ascii=False, indent=0)
    with open(f"{OUT}/whisper.srt", "w") as f:
        for i, s in enumerate(segs, 1):
            f.write(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n")
    with open(f"{OUT}/whisper.txt", "w") as f:
        for s in segs:
            m, sec = divmod(int(s["start"]), 60); h, m = divmod(m, 60)
            f.write(f"[{h:02d}:{m:02d}:{sec:02d}] {s['text']}\n")

def main():
    os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
    segments, info = model.transcribe(AUDIO, language="zh", beam_size=5, vad_filter=True,
                                      vad_parameters={"min_silence_duration_ms": 500},
                                      initial_prompt=PROMPT, condition_on_previous_text=True)
    print("duration", info.duration, flush=True)
    segs = []
    for s in segments:
        segs.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": cc.convert(s.text.strip())})
        if len(segs) % 40 == 0:
            save(segs); print(f"{s.end:.0f}/{info.duration:.0f}s  elapsed {time.time()-t0:.0f}s", flush=True)
    save(segs)
    open(f"{OUT}/STATUS.txt", "a").write(f"whisper {MODEL} done: {len(segs)} segments in {time.time()-t0:.0f}s\n")

if __name__ == "__main__":
    main()
