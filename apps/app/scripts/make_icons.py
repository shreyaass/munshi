"""
Generates the Munshi icon set from assets/Premium Gold Ledger & Rupee Icon.png.

Run from the repo root:
    python apps/app/scripts/make_icons.py

Requires Pillow: python -m pip install pillow
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "assets" / "Premium Gold Ledger & Rupee Icon.png"
OUT = ROOT / "apps" / "app" / "public" / "icons"

BRAND = (7, 61, 43)  # #073D2B, same as --brand / theme-color


def on_brand(im: Image.Image, size: int, scale: float) -> Image.Image:
    """Square, opaque icon: brand background with the artwork centred."""
    canvas = Image.new("RGB", (size, size), BRAND)
    inner = max(1, round(size * scale))
    art = im.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(art, (offset, offset))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGB")

    # "any" icons: the artwork is already a rounded green tile, so keep it whole.
    for size in (192, 512):
        src.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)

    # iOS applies its own mask, so no transparency and a little breathing room.
    on_brand(src, 180, 0.92).save(OUT / "apple-touch-icon.png", optimize=True)

    # Maskable: art inside the 80% safe zone so Android can crop to any shape.
    on_brand(src, 512, 0.78).save(OUT / "maskable-512.png", optimize=True)

    src.resize((32, 32), Image.LANCZOS).save(OUT / "favicon-32.png", optimize=True)
    src.resize((64, 64), Image.LANCZOS).save(OUT / "favicon-64.png", optimize=True)

    for name in ("icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "favicon-32.png"):
        path = OUT / name
        print(f"{path.relative_to(ROOT)}  {Image.open(path).size}")


if __name__ == "__main__":
    main()
