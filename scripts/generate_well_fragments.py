from pathlib import Path
import random

from PIL import Image, ImageChops, ImageColor, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "public"
FRAGMENT_DIR = PUBLIC_DIR / "well" / "fragments"
OUTPUT_DIR = FRAGMENT_DIR / "generated"

CANVAS_SIZE = (1280, 768)
ALPHA_CROP_THRESHOLD = 16
ALPHA_CROP_PADDING = 12


def load_texture(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def fit_cover(image: Image.Image, size: tuple[int, int], offset_seed: int) -> Image.Image:
    width, height = size
    scale = max(width / image.width, height / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    randomizer = random.Random(offset_seed)
    max_x = max(0, resized.width - width)
    max_y = max(0, resized.height - height)
    left = randomizer.randint(0, max_x) if max_x else 0
    top = randomizer.randint(0, max_y) if max_y else 0
    return resized.crop((left, top, left + width, top + height))


def base_mask_from_luma(path: Path) -> Image.Image:
    image = Image.open(path).convert("L")
    return ImageOps.autocontrast(image)


def base_mask_from_alpha(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    return ImageOps.autocontrast(image.getchannel("A"))


def transform_mask(mask: Image.Image, seed: int, flip: bool = False, scale_x: float = 1.0, scale_y: float = 1.0) -> Image.Image:
    work = mask.copy()
    if flip:
      work = ImageOps.mirror(work)

    target_w = max(1, round(work.width * scale_x))
    target_h = max(1, round(work.height * scale_y))
    resized = work.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("L", mask.size, 0)
    left = (mask.width - target_w) // 2
    top = (mask.height - target_h) // 2
    canvas.paste(resized, (left, top))

    randomizer = random.Random(seed)
    draw = ImageDraw.Draw(canvas)
    bbox = canvas.getbbox()
    if bbox:
        for _ in range(10):
            radius = randomizer.randint(20, 64)
            edge = randomizer.choice(["top", "bottom", "left", "right"])
            if edge in ("top", "bottom"):
                cx = randomizer.randint(bbox[0] + radius, bbox[2] - radius)
                cy = bbox[1] + randomizer.randint(-radius // 2, radius // 2) if edge == "top" else bbox[3] + randomizer.randint(-radius // 2, radius // 2)
            else:
                cx = bbox[0] + randomizer.randint(-radius // 2, radius // 2) if edge == "left" else bbox[2] + randomizer.randint(-radius // 2, radius // 2)
                cy = randomizer.randint(bbox[1] + radius, bbox[3] - radius)
            draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=0)

    return canvas.filter(ImageFilter.GaussianBlur(0.8))


def make_stains(size: tuple[int, int], seed: int) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    randomizer = random.Random(seed)
    colors = [
        (110, 77, 46, 48),
        (82, 56, 33, 38),
        (149, 115, 76, 34),
    ]
    for _ in range(12):
        w = randomizer.randint(80, 240)
        h = randomizer.randint(34, 120)
        x = randomizer.randint(-40, size[0] - 20)
        y = randomizer.randint(-20, size[1] - 10)
        color = randomizer.choice(colors)
        draw.ellipse((x, y, x + w, y + h), fill=color)
    return layer.filter(ImageFilter.GaussianBlur(18))


def colorize_texture(texture: Image.Image, seed: int) -> Image.Image:
    randomizer = random.Random(seed)
    contrast = ImageEnhance.Contrast(texture).enhance(randomizer.uniform(0.96, 1.1))
    color = ImageEnhance.Color(contrast).enhance(randomizer.uniform(0.82, 0.94))
    brightness = ImageEnhance.Brightness(color).enhance(randomizer.uniform(0.88, 1.0))
    tint = Image.new("RGB", texture.size, ImageColor.getrgb(randomizer.choice(["#c8ae84", "#b9976d", "#d6bc94"])))
    return ImageChops.multiply(brightness, tint)


def compose_fragment(mask: Image.Image, seed: int) -> Image.Image:
    texture_a = fit_cover(load_texture(PUBLIC_DIR / "textures" / "paper_texture_rugged.png"), CANVAS_SIZE, seed)
    texture_b = fit_cover(load_texture(PUBLIC_DIR / "parchment_bg.png"), CANVAS_SIZE, seed + 11)
    base = Image.blend(texture_a, texture_b, 0.52)
    base = colorize_texture(base, seed)

    fragment = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    fragment.paste(base.convert("RGBA"), (0, 0))

    stains = make_stains(CANVAS_SIZE, seed + 23)
    fragment = Image.alpha_composite(fragment, stains)

    alpha = mask.resize(CANVAS_SIZE, Image.Resampling.LANCZOS)
    edge_dark = ImageChops.subtract(alpha, alpha.filter(ImageFilter.GaussianBlur(16)))
    edge_layer = Image.new("RGBA", CANVAS_SIZE, (58, 40, 24, 0))
    edge_layer.putalpha(ImageEnhance.Brightness(edge_dark).enhance(1.2))
    fragment = Image.alpha_composite(fragment, edge_layer)

    highlight = Image.new("RGBA", CANVAS_SIZE, (246, 233, 202, 0))
    glow = Image.new("L", CANVAS_SIZE, 0)
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((120, 140, 580, 420), fill=110)
    glow_draw.ellipse((640, 220, 1040, 520), fill=80)
    glow = glow.filter(ImageFilter.GaussianBlur(48))
    highlight.putalpha(glow)
    fragment = Image.alpha_composite(fragment, highlight)

    fragment.putalpha(alpha)
    crop_alpha = alpha.point(lambda value: 255 if value >= ALPHA_CROP_THRESHOLD else 0)
    bbox = crop_alpha.getbbox()
    if not bbox:
        return fragment
    left = max(0, bbox[0] - ALPHA_CROP_PADDING)
    top = max(0, bbox[1] - ALPHA_CROP_PADDING)
    right = min(fragment.width, bbox[2] + ALPHA_CROP_PADDING)
    bottom = min(fragment.height, bbox[3] + ALPHA_CROP_PADDING)
    return fragment.crop((left, top, right, bottom))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    mask_luma = base_mask_from_luma(FRAGMENT_DIR / "fragment_mask.png")
    mask_alpha = base_mask_from_alpha(FRAGMENT_DIR / "fragment_02.png")

    variants = [
        ("well_fragment_01.png", transform_mask(mask_luma, 101, scale_x=1.02, scale_y=0.96), 101),
        ("well_fragment_02.png", transform_mask(mask_luma, 202, flip=True, scale_x=0.96, scale_y=1.0), 202),
        ("well_fragment_03.png", transform_mask(mask_alpha, 303, scale_x=1.0, scale_y=0.92), 303),
        ("well_fragment_04.png", transform_mask(mask_alpha, 404, flip=True, scale_x=0.94, scale_y=0.94), 404),
        ("well_fragment_05.png", transform_mask(mask_luma, 505, scale_x=0.9, scale_y=0.92), 505),
        ("well_fragment_06.png", transform_mask(mask_luma, 606, flip=True, scale_x=1.06, scale_y=0.9), 606),
    ]

    for filename, alpha_mask, seed in variants:
        image = compose_fragment(alpha_mask, seed)
        image.save(OUTPUT_DIR / filename)
        print(f"wrote {OUTPUT_DIR / filename}")


if __name__ == "__main__":
    main()
