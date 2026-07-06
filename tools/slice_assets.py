"""Slice the six AI sheets in /assets into game-ready sprites for manifest.json.

The sheets fake transparency with a baked-in checkerboard; sprites are
extracted by flood-keying neutral bright pixels from each crop's borders
(dark ink outlines act as barriers). Run without args to render a review
contact sheet into tools/detected/; run with --install to quantize and write
into src/client/public/assets/. Requires: pip install pillow numpy.
"""

import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
from collections import deque

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets"
DBG = Path(__file__).resolve().parent / "detected"
DBG.mkdir(exist_ok=True)
DEST = ROOT / "src" / "client" / "public" / "assets"
INSTALL = "--install" in sys.argv


def flood_key(rgb: np.ndarray, all_neutral: bool = False) -> np.ndarray:
    """Keep-mask for a crop: key neutral-bright checker connected to the borders
    (or everywhere when all_neutral, for sprites with enclosed checker pockets)."""
    r = rgb[:, :, 0].astype(int)
    g = rgb[:, :, 1].astype(int)
    b = rgb[:, :, 2].astype(int)
    neutral = (
        (np.abs(r - g) <= 14)
        & (np.abs(g - b) <= 14)
        & (np.abs(r - b) <= 14)
        & (np.minimum(np.minimum(r, g), b) >= 185)
    )
    if all_neutral:
        return ~neutral
    h, w = neutral.shape
    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if neutral[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if neutral[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in (
            (1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1),
        ):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and neutral[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return ~bg


# key -> spec. roi/erase in SHEET pixel coords.
#   opaque: skip keying (crop is used as-is, fully opaque)
#   erase:  list of [x0,y0,x1,y1] rects zeroed after keying
#   rotate: PIL transpose op applied after trim (270 = 90° clockwise)
#   pre_rotate_deg: free rotation (expand) applied after trim
#   pad_circle_bottom: extend canvas down so height == width (clipped round shield)
#   fit: (w,h) max box for final resize
SPRITES = {
    # --- assets.png: player first-person gear ---
    # Blade leans 43° right of vertical in the art; rotate upright, then crop
    # so the grip (494px below the tip) sits at 85% height per the art contract.
    "fp_sword": {"sheet": "assets", "roi": [1000, 545, 1448, 1086], "fit": (512, 768), "pre_rotate_deg": 43, "crop_height_after": 580},
    "round_shield": {"sheet": "assets", "roi": [0, 620, 570, 1086], "fit": (640, 640), "pad_circle_bottom": True},
    # --- assets2.png: environment ---
    "sky_painting": {"sheet": "assets2", "roi": [90, 88, 1036, 406], "opaque": True, "fit": (1280, 720)},
    "dark_tower": {"sheet": "assets2", "roi": [1092, 25, 1420, 470], "fit": (512, 640), "fit_height": 640},
    "pine_silhouette": {"sheet": "assets2", "roi": [40, 480, 245, 800], "fit": (256, 512)},
    "castle_gate": {"sheet": "assets2", "roi": [968, 800, 1428, 1060], "fit": (960, 720)},
    "fog_band": {"sheet": "assets2", "roi": [415, 550, 915, 710], "fit": (1280, 256)},
    # --- assets3.png: Fallen Rival rig ---
    "fallen_rival_head": {"sheet": "assets3", "roi": [80, 160, 300, 480], "fit": (192, 192)},
    "fallen_rival_torso": {"sheet": "assets3", "roi": [365, 140, 775, 600], "fit": (280, 340)},
    # Arm art bakes in the held spear; erase tip above the fist + shaft stubs
    # (the game renders the weapon as its own rotating sprite).
    "fallen_rival_arm_front": {"sheet": "assets3", "roi": [810, 20, 1030, 540], "fit": (180, 280), "erase": [[904, 18, 1035, 236], [946, 236, 1035, 302], [946, 302, 1004, 376], [938, 450, 1012, 540]]},
    "fallen_rival_arm_back": {"sheet": "assets3", "roi": [1085, 175, 1420, 590], "fit": (180, 280)},
    "fallen_rival_leg_front": {"sheet": "assets3", "roi": [110, 610, 285, 1035], "fit": (170, 280)},
    "fallen_rival_leg_back": {"sheet": "assets3", "roi": [455, 620, 670, 1030], "fit": (170, 280)},
    "fallen_rival_weapon_frost_spear": {"sheet": "assets3", "roi": [858, 556, 1035, 1070], "fit": (420, 160), "rotate": Image.Transpose.ROTATE_270},
    "fallen_rival_shield": {"sheet": "assets3", "roi": [1100, 620, 1355, 1040], "fit": (240, 240)},
    # --- assets4.png: Warden King rig ---
    "warden_king_head": {"sheet": "assets4", "roi": [40, 20, 320, 320], "fit": (256, 256)},
    "warden_king_torso": {"sheet": "assets4", "roi": [380, 15, 870, 590], "fit": (420, 520)},
    "warden_king_arm_front": {"sheet": "assets4", "roi": [875, 25, 1120, 560], "fit": (260, 420)},
    "warden_king_arm_back": {"sheet": "assets4", "roi": [1165, 40, 1420, 540], "fit": (260, 420)},
    "warden_king_leg_front": {"sheet": "assets4", "roi": [405, 602, 675, 1040], "fit": (220, 360)},
    "warden_king_leg_back": {"sheet": "assets4", "roi": [680, 590, 850, 1030], "fit": (220, 360)},
    "warden_king_weapon_hammer": {"sheet": "assets4", "roi": [20, 370, 370, 1030], "fit": (520, 220), "rotate": Image.Transpose.ROTATE_270},
    "warden_king_cape": {"sheet": "assets4", "roi": [855, 580, 1310, 1060], "fit": (480, 520)},
    # --- assets5.png: Road Soldier rig ---
    "road_soldier_head": {"sheet": "assets5", "roi": [140, 60, 415, 395], "fit": (192, 192)},
    "road_soldier_torso": {"sheet": "assets5", "roi": [520, 110, 955, 550], "fit": (256, 320)},
    # Erase the baked-in sword (pommel, crossguard, blade stub) around the fist.
    "road_soldier_arm_front": {"sheet": "assets5", "roi": [275, 445, 515, 865], "fit": (160, 256), "erase": [[268, 702, 328, 792], [428, 688, 472, 710], [424, 708, 570, 870]]},
    "road_soldier_arm_back": {"sheet": "assets5", "roi": [990, 160, 1360, 505], "fit": (160, 256)},
    "road_soldier_leg_front": {"sheet": "assets5", "roi": [530, 600, 730, 995], "fit": (160, 256)},
    "road_soldier_leg_back": {"sheet": "assets5", "roi": [825, 600, 1040, 970], "fit": (160, 256)},
    "road_soldier_weapon": {"sheet": "assets5", "roi": [60, 420, 225, 980], "fit": (320, 128), "rotate": Image.Transpose.ROTATE_270},
    "road_soldier_shield": {"sheet": "assets5", "roi": [1100, 645, 1390, 950], "fit": (220, 220)},
    # --- assets6.png: UI + VFX ---
    "ui_heart_full": {"sheet": "assets6", "roi": [70, 40, 275, 240], "fit": (64, 64)},
    "ui_heart_empty": {"sheet": "assets6", "roi": [300, 40, 505, 240], "fit": (64, 64), "all_neutral": True},
    "ui_guard_icon": {"sheet": "assets6", "roi": [550, 25, 750, 245], "fit": (64, 64)},
    "ui_burst_icon": {"sheet": "assets6", "roi": [780, 30, 1015, 245], "fit": (64, 64)},
    "ui_crosshair_weakpoint": {"sheet": "assets6", "roi": [780, 255, 970, 455], "fit": (96, 96), "all_neutral": True},
    "vfx_red_telegraph_arc": {"sheet": "assets6", "roi": [1010, 260, 1400, 460], "fit": (768, 256)},
    "vfx_guard_spark": {"sheet": "assets6", "roi": [520, 450, 890, 730], "fit": (256, 256)},
    "vfx_burst_slash": {"sheet": "assets6", "roi": [20, 720, 660, 1070], "fit": (1024, 512)},
}

sheets = {
    name: np.asarray(Image.open(SRC / f"{name}.png").convert("RGBA"))
    for name in {s["sheet"] for s in SPRITES.values()}
}

results = {}
for key, spec in SPRITES.items():
    x0, y0, x1, y1 = spec["roi"]
    crop = sheets[spec["sheet"]][y0:y1, x0:x1].copy()

    if spec.get("opaque"):
        img = Image.fromarray(crop[:, :, :3]).convert("RGBA")
    else:
        keep = flood_key(crop[:, :, :3], all_neutral=spec.get("all_neutral", False))
        for ex0, ey0, ex1, ey1 in spec.get("erase", []):
            keep[max(0, ey0 - y0):max(0, ey1 - y0), max(0, ex0 - x0):max(0, ex1 - x0)] = False
        mask = Image.fromarray((keep * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(1.0)
        )
        crop[:, :, 3] = np.asarray(mask)
        img = Image.fromarray(crop)
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)

    if spec.get("pad_circle_bottom") and img.width > img.height:
        padded = Image.new("RGBA", (img.width, img.width), (0, 0, 0, 0))
        padded.paste(img, (0, 0))
        img = padded

    if "pre_rotate_deg" in spec:
        img = img.rotate(spec["pre_rotate_deg"], expand=True, resample=Image.BICUBIC)
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
        if "crop_height_after" in spec:
            img = img.crop((0, 0, img.width, min(img.height, spec["crop_height_after"])))
            bbox = img.getbbox()
            if bbox:
                img = img.crop(bbox)

    if "rotate" in spec:
        img = img.transpose(spec["rotate"])

    fw, fh = spec["fit"]
    if spec.get("fit_height"):
        scale = spec["fit_height"] / img.height
    else:
        scale = min(fw / img.width, fh / img.height, 1.0)
    if scale < 1.0 or spec.get("fit_height"):
        img = img.resize(
            (max(1, round(img.width * scale)), max(1, round(img.height * scale))),
            Image.LANCZOS,
        )
    results[key] = img

if INSTALL:
    total = 0
    for key, img in results.items():
        path = DEST / f"{key}.png"
        img.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(
            path, optimize=True
        )
        total += path.stat().st_size
        print(f"  {key}.png  {img.width}x{img.height}  {path.stat().st_size // 1024}KB")
    print(f"TOTAL {total // 1024}KB across {len(results)} files")
else:
    # contact sheet on dark dusk background for review
    cols = 6
    cell = 260
    rows = (len(results) + cols - 1) // cols
    board = Image.new("RGB", (cols * cell, rows * cell), (23, 20, 40))
    d = ImageDraw.Draw(board)
    for i, (key, img) in enumerate(sorted(results.items())):
        cx, cy = (i % cols) * cell, (i // cols) * cell
        thumb = img.copy()
        thumb.thumbnail((cell - 20, cell - 40))
        board.paste(thumb, (cx + (cell - thumb.width) // 2, cy + 8), thumb)
        d.text((cx + 6, cy + cell - 26), f"{key} {img.width}x{img.height}", fill=(240, 230, 200), font_size=15)
    board.save(DBG / "contact_sheet.png")
    print("wrote", DBG / "contact_sheet.png")

    # grid-annotated zooms for the tricky arm crops (sheet coords every 50px)
    for key in ("road_soldier_arm_front", "fallen_rival_arm_front", "fp_sword"):
        spec = SPRITES[key]
        x0, y0, x1, y1 = spec["roi"]
        crop = sheets[spec["sheet"]][y0:y1, x0:x1]
        zoom = Image.fromarray(crop).convert("RGB")
        d = ImageDraw.Draw(zoom)
        for gx in range(x0 - x0 % 50 + 50, x1, 50):
            d.line([(gx - x0, 0), (gx - x0, y1 - y0)], fill=(255, 0, 0), width=1)
            d.text((gx - x0 + 2, 2), str(gx), fill=(255, 0, 0), font_size=16)
        for gy in range(y0 - y0 % 50 + 50, y1, 50):
            d.line([(0, gy - y0), (x1 - x0, gy - y0)], fill=(255, 0, 0), width=1)
            d.text((2, gy - y0 + 2), str(gy), fill=(255, 0, 0), font_size=16)
        zoom.save(DBG / f"grid_{key}.png")
        print("wrote", DBG / f"grid_{key}.png")
