#!/usr/bin/env python3
"""Generate ElevenLabs audio options for the Nikkud Wizard Duel review page.

  python3 gen.py batch1.json            # generate every clip in the batch (skips clips already in the manifest)
  python3 gen.py batch1.json --only sfx-boom --force   # regenerate one clip (new version dir)

Batch file: {"clips": [{id, category, title, desc, kind: tts|sfx|music, options: [...]}]}
  tts option:   {label, voice, text, model?, lang?, seed?}   (model default eleven_v3)
  sfx option:   {label, prompt, seconds}
  music option: {label, prompt, ms}
Writes clips/<id>/v<N>-<i>.mp3 and manifest.json. Reads ELEVENLABS_API_KEY from the environment or the repo-root .env (gitignored); never prints it.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.getcwd()  # clips/ and manifest.json are written to the current directory (keep them out of the repo)
MANIFEST = os.path.join(WORK, "manifest.json")
API = "https://api.elevenlabs.io/v1"


ENV_FILE = os.path.join(os.path.dirname(HERE), "..", "..", ".env")


def key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, encoding="utf-8") as fh:
            for line in fh:
                if line.startswith("ELEVENLABS_API_KEY="):
                    return line.split("=", 1)[1].strip()
    sys.exit("ELEVENLABS_API_KEY missing (environment or repo-root .env)")


def post(path, body, k):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode(),
        headers={"xi-api-key": k, "Content-Type": "application/json"},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            if e.code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(4 * (attempt + 1))
                continue
            raise RuntimeError(f"HTTP {e.code}: {detail}")


def render(opt, kind, k):
    if kind == "tts":
        body = {"text": opt["text"], "model_id": opt.get("model", "eleven_v3")}
        if opt.get("lang"):
            body["language_code"] = opt["lang"]  # resolves Hebrew pronunciation ambiguity
        if opt.get("stability") is not None:  # v3/v4: 0.0 Creative (follows audio tags most), 0.5 Natural, 1.0 Robust
            body["voice_settings"] = {"stability": opt["stability"]}
        if opt.get("seed") is not None:
            body["seed"] = opt["seed"]
        return post(f"/text-to-speech/{opt['voice']}?output_format=mp3_44100_128", body, k)
    if kind == "sfx":
        return post("/sound-generation?output_format=mp3_44100_128",
                    {"text": opt["prompt"], "duration_seconds": opt.get("seconds", 1.5), "prompt_influence": 0.5}, k)
    if kind == "music":
        return post("/music?output_format=mp3_44100_128",
                    {"prompt": opt["prompt"], "music_length_ms": opt.get("ms", 30000)}, k)
    raise ValueError(kind)


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as fh:
            return json.load(fh)
    return {"clips": []}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("batch")
    ap.add_argument("--only", action="append")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    k = key()
    with open(args.batch, encoding="utf-8") as fh:
        batch = json.load(fh)
    man = load_manifest()
    by_id = {c["id"]: c for c in man["clips"]}

    for clip in batch["clips"]:
        if args.only and clip["id"] not in args.only:
            continue
        existing = by_id.get(clip["id"])
        if existing and not args.force:
            print(f"skip {clip['id']} (exists)")
            continue
        version = (existing["version"] + 1) if existing else 1
        out_dir = os.path.join(WORK, "clips", clip["id"])
        os.makedirs(out_dir, exist_ok=True)

        def job(i_opt):
            i, opt = i_opt
            rel = f"clips/{clip['id']}/v{version}-{i}.mp3"
            try:
                data = render(opt, clip["kind"], k)
                with open(os.path.join(WORK, rel), "wb") as fh:
                    fh.write(data)
                return {"file": rel, "label": opt["label"], "source": opt.get("text") or opt.get("prompt")}
            except Exception as e:  # keep going; show the failure on the review page
                return {"file": None, "label": opt["label"], "source": opt.get("text") or opt.get("prompt"), "error": str(e)}

        with ThreadPoolExecutor(max_workers=4) as ex:
            takes = list(ex.map(job, enumerate(clip["options"])))
        entry = {k2: clip[k2] for k2 in ("id", "category", "title", "desc", "kind")}
        entry.update(version=version, takes=takes, generated=time.strftime("%Y-%m-%d %H:%M"))
        by_id[clip["id"]] = entry
        ok = sum(1 for t in takes if t["file"])
        print(f"{clip['id']}: {ok}/{len(takes)} ok" + "".join(f"\n  ! {t['label']}: {t['error']}" for t in takes if not t["file"]))
        # save after each clip so the review page fills in progressively
        order = [c["id"] for c in man["clips"]]
        if clip["id"] not in order:
            man["clips"].append(entry)
        else:
            man["clips"][order.index(clip["id"])] = entry
        with open(MANIFEST, "w", encoding="utf-8") as fh:
            json.dump(man, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
