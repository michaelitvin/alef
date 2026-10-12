#!/usr/bin/env python3
"""Single-subject renders → transparent, cropped WebP sprites (magenta keyed with de-spill)."""
import glob, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
OUT = sys.argv[1]
for f in sorted(glob.glob(os.environ.get('SRC', 'final/*.png'))):
    im = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    bg = np.median(border, axis=0)
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    mag = np.minimum(R, B) - G
    bm = min(bg[0], bg[2]) - bg[1]
    a = 1.0 - np.clip((mag - 0.25 * bm) / (0.70 * bm), 0, 1)
    k = (1 - a)[..., None]
    rgb = np.clip((im - k * bg) / np.maximum(a[..., None], 1e-3), 0, 255)
    rgb = np.where(a[..., None] > 0.02, rgb, 0)
    # drop specks (e.g. the generator's corner mark): keep components of the dilated mask ≥ 1500 px
    lab, n = ndimage.label(ndimage.binary_dilation(a > 0.3, iterations=8))
    sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz >= 1500])
    a = np.where(keep, a, 0)
    rgb = np.where(keep[..., None], rgb, 0)
    # soft glows keep a magenta cast after de-spill → recolour tinted, semi-transparent edge pixels to warm glow
    if os.environ.get('DEHALO'):
        tint = (rgb[..., 0] + rgb[..., 2]) / 2 - rgb[..., 1]
        halo = (a < 0.92) & (tint > 30)
        rgb = np.where(halo[..., None], np.array([255, 232, 190], dtype=np.float32), rgb)
    ys, xs = np.where(a > 0.05)
    y0, y1, x0, x1 = max(0, ys.min() - 6), ys.max() + 7, max(0, xs.min() - 6), xs.max() + 7
    out = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8)[y0:y1, x0:x1])
    s = min(1, 420 / out.height)
    out = out.resize((round(out.width * s), round(out.height * s)), Image.LANCZOS)
    name = os.path.basename(f)[:-4]
    out.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    print(name, out.size)
