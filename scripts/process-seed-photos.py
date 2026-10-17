"""Process fictional seed originals once; contributor processing stays unchanged."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BOXES = {
    "RAINY7Q": (0.4419, 0.4425, 0.1500, 0.1175),
    "EH2ZED": (0.2800, 0.6433, 0.1756, 0.1317),
    "2FOG4ME": (0.2969, 0.5383, 0.3481, 0.2592),
    "MAPLE9X": (0.4250, 0.4950, 0.2156, 0.1758),
    "YEEHA7Z": (0.4037, 0.5892, 0.1856, 0.1375),
}

def process(image, box):
    image = image.convert("RGB")
    image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    w, h = image.size
    blurred = image.resize((max(1, round(w / 24)), max(1, round(h / 24))), Image.Resampling.BILINEAR).resize((w, h), Image.Resampling.BICUBIC)
    x, y, bw, bh = box
    left, top = round(x * w), round(y * h)
    rect = (left, top, left + round(bw * w), top + round(bh * h))
    blurred.paste(image.crop(rect), rect)
    return blurred

if __name__ == "__main__":
    import io
    outputs = {}
    for name, box in BOXES.items():
        with Image.open(ROOT / "docs/seed-photos" / f"{name}.png") as image:
            buffer = io.BytesIO()
            process(image, box).save(buffer, "JPEG", quality=85)
            outputs[name] = buffer.getvalue()
            print(f"{name}: {len(outputs[name])} bytes")
    total = sum(map(len, outputs.values()))
    print(f"Total: {total} bytes")
    if total > 1_000_000:
        raise SystemExit("STOP: seed photos exceed 1 MB; nothing bundled")
    target = ROOT / "src/lib/seed-photos"
    target.mkdir(exist_ok=True)
    for name, data in outputs.items():
        (target / f"{name}.jpg").write_bytes(data)