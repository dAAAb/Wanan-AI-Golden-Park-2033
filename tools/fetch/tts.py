#!/usr/bin/env python3
"""Narration for the intro video with ElevenLabs (runs in GitHub Actions; needs secret ELEVENLABS_API_KEY).

Reads video/narration.json, picks the newest model whose id matches the requested generation (e.g. "v4"),
and writes one mp3 per scene plus timing/alignment JSON to the output dir. Each scene is sent with its
neighbours as previous_text/next_text so the delivery flows across clips.

usage: python3 tools/fetch/tts.py video/narration.json video/public/vo
"""
import base64, json, os, re, sys, urllib.request, urllib.error

API = "https://api.elevenlabs.io/v1"
KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()


def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": "application/json"},
                                 method="POST" if body is not None else "GET")
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())


def main():
    src, out = sys.argv[1], sys.argv[2]
    if not KEY:
        sys.exit("ELEVENLABS_API_KEY secret is not set (repo Settings -> Secrets and variables -> Actions)")
    cfg = json.load(open(src, encoding="utf-8"))
    os.makedirs(out, exist_ok=True)
    models = call("/models")
    ids = [m.get("model_id", "") for m in models]
    print("available models:", ", ".join(ids))
    want = cfg.get("model", "v4").lower()
    cands = [i for i in ids if re.search(rf"(^|_){re.escape(want)}($|_)", i.lower()) and "flash" not in i and "turbo" not in i]
    if not cands:
        sys.exit(f"no ElevenLabs model matching '{want}' is available to this key")
    model = sorted(cands, key=len)[0]
    print("using model:", model)
    voice = cfg["voice_id"]
    scenes = cfg["scenes"]
    timing = {"model": model, "voice_id": voice, "scenes": []}
    for i, s in enumerate(scenes):
        body = {"text": s["text"], "model_id": model,
                "previous_text": scenes[i - 1]["text"] if i else None,
                "next_text": scenes[i + 1]["text"] if i + 1 < len(scenes) else None}
        body = {k: v for k, v in body.items() if v is not None}
        align = None
        try:
            r = call(f"/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128", body)
            audio = base64.b64decode(r["audio_base64"]); align = r.get("alignment")
        except urllib.error.HTTPError as e:
            print(f"{s['id']}: with-timestamps unavailable ({e.code}: {e.read()[:200]!r}); plain synthesis")
            body.pop("previous_text", None); body.pop("next_text", None)
            req = urllib.request.Request(f"{API}/text-to-speech/{voice}?output_format=mp3_44100_128", data=json.dumps(body).encode(),
                                         headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"}, method="POST")
            with urllib.request.urlopen(req, timeout=180) as rr:
                audio = rr.read()
        open(os.path.join(out, s["id"] + ".mp3"), "wb").write(audio)
        end = align["character_end_times_seconds"][-1] if align and align.get("character_end_times_seconds") else None
        timing["scenes"].append({"id": s["id"], "file": s["id"] + ".mp3", "speech_end": end, "alignment": align})
        print(f"{s['id']}: {len(audio)} bytes" + (f", {end:.2f}s" if end else ""))
    json.dump(timing, open(os.path.join(out, "timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
