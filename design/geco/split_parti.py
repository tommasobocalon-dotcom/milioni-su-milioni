"""Divide le pose del geco in corpo fermo + parti animabili.

Ogni parte: poligono (zona che si stacca) + disco sul perno. Il disco resta sia nel corpo
sia nella parte: ruotando attorno al suo centro ricade su sé stesso e la giuntura non si apre.
"fill": zona del corpo da ricostruire (inpainting) quando la parte sta davanti al corpo,
così muovendola non si vede un buco.

Uso: python split_parti.py [anteprima.png]
"""
import sys, json, os
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter, ImageChops

BASE = os.path.dirname(os.path.abspath(__file__)) + "/"
SRC = BASE + "scontornati/"
OUT = BASE + "parti/"
N = 768

POSES = {
    "saluto": {"src": "geco-v2-saluto.png", "parts": {
        "mano": {"poly": [(0.69, 0.27), (0.95, 0.27), (0.95, 0.65), (0.74, 0.65), (0.72, 0.58), (0.70, 0.535), (0.672, 0.50), (0.672, 0.40), (0.69, 0.36)],
                 "pivot": (0.70, 0.535), "r": 0.05}}},
    "casa": {"src": "geco-posa-casa.png", "parts": {
        "mano": {"poly": [(0.08, 0.28), (0.30, 0.28), (0.30, 0.48), (0.25, 0.48), (0.25, 0.62), (0.08, 0.62)],
                 "pivot": (0.30, 0.415), "r": 0.065}}},
    "professionista": {"src": "geco-posa-professionista.png", "parts": {
        "braccio": {"poly": [(0.0, 0.30), (0.205, 0.30), (0.21, 0.455), (0.27, 0.455), (0.27, 0.615), (0.24, 0.63), (0.18, 0.665), (0.0, 0.665)],
                    "pivot": (0.27, 0.535), "r": 0.08}}},
    "partner": {"src": "geco-posa-partner.png", "parts": {
        "mano": {"poly": [(0.365, 0.455), (0.50, 0.455), (0.535, 0.53), (0.535, 0.63), (0.43, 0.63), (0.365, 0.60)],
                 "pivot": (0.52, 0.57), "r": 0.035, "fill": True}}},
    "token": {"src": "geco-posa-token.png", "parts": {
        "moneta1": {"poly": [(0.0, 0.59), (0.165, 0.59), (0.165, 0.72), (0.0, 0.72)], "pivot": (0.095, 0.66), "r": 0.0},
        "moneta2": {"poly": [(0.125, 0.69), (0.275, 0.69), (0.275, 0.815), (0.125, 0.815)], "pivot": (0.185, 0.75), "r": 0.0}}},
    "recensioni": {"src": "geco-posa-recensioni.png", "parts": {
        "stella": {"poly": [(0.675, 0.33), (1.0, 0.33), (1.0, 0.58), (0.72, 0.60), (0.69, 0.56), (0.68, 0.48)],
                   "pivot": (0.70, 0.53), "r": 0.04, "fill": [(0.66, 0.44), (0.73, 0.44), (0.73, 0.60), (0.66, 0.60)]}}},
}


def poly(p):
    m = Image.new("L", (N, N), 0)
    ImageDraw.Draw(m).polygon([(x * N, y * N) for x, y in p], fill=255)
    return m.filter(ImageFilter.GaussianBlur(1.2))


def disc(c, r):
    m = Image.new("L", (N, N), 0)
    if r > 0:
        ImageDraw.Draw(m).ellipse([(c[0] - r) * N, (c[1] - r) * N, (c[0] + r) * N, (c[1] + r) * N], fill=255)
    return m.filter(ImageFilter.GaussianBlur(1.2))


def inpaint(im, region):
    """Ricostruisce RGB e alpha del corpo nella zona coperta dalla parte."""
    rgba = np.array(im)
    m = (np.array(region) > 8).astype(np.uint8) * 255
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    rgb = cv2.inpaint(cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR), m, 9, cv2.INPAINT_TELEA)
    rgb = cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB)
    a = rgba[:, :, 3].copy()
    a_fill = cv2.inpaint(a, m, 9, cv2.INPAINT_TELEA)
    a = np.where(m > 0, np.maximum(a, a_fill), a)
    return Image.fromarray(np.dstack([rgb, a]).astype(np.uint8), "RGBA")


def run(preview_path=None):
    os.makedirs(OUT, exist_ok=True)
    tiles = []
    for key, spec in POSES.items():
        im = Image.open(SRC + spec["src"]).convert("RGBA").resize((N, N))
        a = im.getchannel("A")
        body = Image.new("L", (N, N), 255)
        fill = Image.new("L", (N, N), 0)
        for n, p in spec["parts"].items():
            P, Dk = poly(p["poly"]), disc(p["pivot"], p["r"])
            part = im.copy(); part.putalpha(ImageChops.multiply(a, ImageChops.lighter(P, Dk)))
            part.save(f"{OUT}geco-{key}-{n}.png")
            body = ImageChops.multiply(body, ImageChops.lighter(ImageChops.invert(P), Dk))
            if p.get("fill"):
                fill = ImageChops.lighter(fill, P if p["fill"] is True else poly(p["fill"]))
        src = inpaint(im, fill) if fill.getbbox() else im
        b = src.copy()
        keep = ImageChops.lighter(ImageChops.multiply(a, body), ImageChops.multiply(src.getchannel("A"), fill))
        b.putalpha(keep)
        b.save(f"{OUT}geco-{key}-corpo.png")
        if preview_path:
            t = Image.new("RGBA", (N, N), (213, 224, 207, 255)); t.alpha_composite(b); tiles.append(t)
    if preview_path:
        s = Image.new("RGB", (384 * len(tiles), 384))
        for i, t in enumerate(tiles):
            s.paste(t.convert("RGB").resize((384, 384)), (i * 384, 0))
        s.save(preview_path)
    json.dump({k: {n: {"pivot": p["pivot"]} for n, p in v["parts"].items()} for k, v in POSES.items()},
              open(OUT + "pivot.json", "w"), indent=2)


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else None)
