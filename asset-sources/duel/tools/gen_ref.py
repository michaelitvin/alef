#!/usr/bin/env python3
"""Gemini image generation with a style-reference image. Key: GOOGLE_AI_STUDIO_API_KEY from the environment or the repo-root .env; never printed.
  python3 gen_ref.py --ref art/p3-glow.png --prompt-file p.txt --out out.png [--aspect 16:9] [--model gemini-3-pro-image]
"""
import argparse, base64, json, sys, urllib.request, urllib.error
ap = argparse.ArgumentParser()
ap.add_argument('--ref', action='append', default=[]); ap.add_argument('--prompt-file', required=True)
ap.add_argument('--out', required=True); ap.add_argument('--aspect', default='16:9'); ap.add_argument('--model', default='gemini-3-pro-image')
a = ap.parse_args()
import os
_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.env')
key = os.environ.get('GOOGLE_AI_STUDIO_API_KEY') or next((l.split('=', 1)[1].strip().strip('"\'') for l in (open(_env) if os.path.exists(_env) else []) if l.startswith('GOOGLE_AI_STUDIO_API_KEY=')), None) or sys.exit('GOOGLE_AI_STUDIO_API_KEY missing')
parts = [{'inlineData': {'mimeType': 'image/png', 'data': base64.b64encode(open(r, 'rb').read()).decode()}} for r in a.ref]
parts.append({'text': open(a.prompt_file, encoding='utf-8').read()})
body = {'contents': [{'parts': parts}], 'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': a.aspect}}}
req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent',
                             data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
try:
    p = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(f'HTTP {e.code}: {e.read().decode()[:500]}')
for c in p.get('candidates', []):
    for part in c.get('content', {}).get('parts', []):
        if 'inlineData' in part:
            open(a.out, 'wb').write(base64.b64decode(part['inlineData']['data'])); print(a.out); sys.exit(0)
sys.exit('no image: ' + json.dumps(p)[:500])
