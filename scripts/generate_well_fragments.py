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


def build_irregular_strip_mask(
    size: tuple[int, int],
    seed: int,
    width_range: tuple[float, float],
    height_range: tuple[float, float],
    waviness: float = 0.12,
    notch_count: int = 2,
    hole_count: int = 0,
    taper: float = 0.0,
    corner_bite: bool = False,
) -> Image.Image:
    width, height = size
    randomizer = random.Random(seed)
    fragment_width = round(width * randomizer.uniform(*width_range))
    fragment_height = round(height * randomizer.uniform(*height_range))
    center_x = round(width * randomizer.uniform(0.44, 0.56))
    center_y = round(height * randomizer.uniform(0.45, 0.6))
    left = center_x - (fragment_width // 2)
    right = left + fragment_width
    top = center_y - (fragment_height // 2)
    bottom = top + fragment_height

    point_count = 34
    points = []
    top_limit = fragment_height * waviness
    bottom_limit = fragment_height * waviness * 1.15
    top_offset = randomizer.uniform(-top_limit * 0.4, top_limit * 0.4)
    bottom_offset = randomizer.uniform(-bottom_limit * 0.4, bottom_limit * 0.4)

    for index in range(point_count + 1):
        amount = index / point_count
        x = round(left + (fragment_width * amount))
        top_offset += randomizer.uniform(-fragment_height * 0.028, fragment_height * 0.028)
        top_offset = max(-top_limit, min(top_limit, top_offset))
        taper_shift = taper * abs((amount - 0.5) * 2) * fragment_height * 0.28
        y = round(top + top_offset + taper_shift)
        points.append((x, y))

    for index in range(point_count, -1, -1):
        amount = index / point_count
        x = round(left + (fragment_width * amount))
        bottom_offset += randomizer.uniform(-fragment_height * 0.032, fragment_height * 0.032)
        bottom_offset = max(-bottom_limit, min(bottom_limit, bottom_offset))
        taper_shift = taper * abs((amount - 0.5) * 2) * fragment_height * 0.18
        y = round(bottom + bottom_offset - taper_shift)
        points.append((x, y))

    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(points, fill=255)

    for _ in range(notch_count):
        radius_x = randomizer.randint(max(18, fragment_height // 8), max(26, fragment_height // 3))
        radius_y = randomizer.randint(max(16, fragment_height // 10), max(24, fragment_height // 2))
        edge = randomizer.choice(["top", "bottom", "left", "right"])
        if edge in ("top", "bottom"):
            cx = randomizer.randint(left + radius_x, right - radius_x)
            cy = top + randomizer.randint(-radius_y, radius_y // 2) if edge == "top" else bottom + randomizer.randint(-radius_y // 2, radius_y)
        else:
            cx = left + randomizer.randint(-radius_x, radius_x // 2) if edge == "left" else right + randomizer.randint(-radius_x // 2, radius_x)
            cy = randomizer.randint(top + radius_y, bottom - radius_y)
        draw.ellipse((cx - radius_x, cy - radius_y, cx + radius_x, cy + radius_y), fill=0)

    if corner_bite:
        bite_width = randomizer.randint(fragment_width // 8, fragment_width // 4)
        bite_height = randomizer.randint(fragment_height // 5, fragment_height // 2)
        bite_side = randomizer.choice(["upper_left", "upper_right", "lower_left", "lower_right"])
        if bite_side == "upper_left":
            bite = [(left - 10, top - 10), (left + bite_width, top - 10), (left - 10, top + bite_height)]
        elif bite_side == "upper_right":
            bite = [(right + 10, top - 10), (right - bite_width, top - 10), (right + 10, top + bite_height)]
        elif bite_side == "lower_left":
            bite = [(left - 10, bottom + 10), (left + bite_width, bottom + 10), (left - 10, bottom - bite_height)]
        else:
            bite = [(right + 10, bottom + 10), (right - bite_width, bottom + 10), (right + 10, bottom - bite_height)]
        draw.polygon(bite, fill=0)

    for _ in range(hole_count):
        radius_x = randomizer.randint(max(10, fragment_height // 12), max(16, fragment_height // 5))
        radius_y = randomizer.randint(max(8, fragment_height // 14), max(14, fragment_height // 4))
        cx = randomizer.randint(left + radius_x + 18, right - radius_x - 18)
        cy = randomizer.randint(top + radius_y + 18, bottom - radius_y - 18)
        draw.ellipse((cx - radius_x, cy - radius_y, cx + radius_x, cy + radius_y), fill=0)

    return mask.filter(ImageFilter.GaussianBlur(1.4))


def build_fragment_variants(mask_luma: Image.Image, mask_alpha: Image.Image) -> list[tuple[str, Image.Image, int]]:
    variants = [
        ("well_fragment_01.png", transform_mask(mask_luma, 101, scale_x=0.84, scale_y=0.8), 101),
        ("well_fragment_02.png", transform_mask(mask_luma, 202, flip=True, scale_x=0.92, scale_y=0.88), 202),
        ("well_fragment_03.png", transform_mask(mask_alpha, 303, scale_x=0.84, scale_y=0.84), 303),
        ("well_fragment_04.png", transform_mask(mask_alpha, 404, flip=True, scale_x=0.76, scale_y=0.92), 404),
        ("well_fragment_05.png", build_irregular_strip_mask(CANVAS_SIZE, 505, (0.34, 0.48), (0.16, 0.22), waviness=0.16, notch_count=2, taper=0.12), 505),
        ("well_fragment_06.png", build_irregular_strip_mask(CANVAS_SIZE, 606, (0.44, 0.58), (0.16, 0.21), waviness=0.13, notch_count=3, taper=0.18, corner_bite=True), 606),
        ("well_fragment_07.png", build_irregular_strip_mask(CANVAS_SIZE, 707, (0.28, 0.38), (0.14, 0.18), waviness=0.22, notch_count=1, hole_count=1, taper=0.08), 707),
        ("well_fragment_08.png", build_irregular_strip_mask(CANVAS_SIZE, 808, (0.32, 0.44), (0.22, 0.3), waviness=0.14, notch_count=4, hole_count=1, taper=0.2, corner_bite=True), 808),
        ("well_fragment_09.png", build_irregular_strip_mask(CANVAS_SIZE, 909, (0.24, 0.34), (0.12, 0.16), waviness=0.24, notch_count=2, taper=0.32), 909),
        ("well_fragment_10.png", build_irregular_strip_mask(CANVAS_SIZE, 1001, (0.38, 0.48), (0.18, 0.24), waviness=0.18, notch_count=3, hole_count=2, taper=0.1), 1001),
        ("well_fragment_11.png", build_irregular_strip_mask(CANVAS_SIZE, 1102, (0.2, 0.3), (0.11, 0.15), waviness=0.2, notch_count=1, taper=0.42), 1102),
        ("well_fragment_12.png", build_irregular_strip_mask(CANVAS_SIZE, 1203, (0.3, 0.4), (0.2, 0.28), waviness=0.12, notch_count=3, taper=0.26, corner_bite=True), 1203),
        ("well_fragment_13.png", build_irregular_strip_mask(CANVAS_SIZE, 1304, (0.36, 0.46), (0.14, 0.19), waviness=0.18, notch_count=4, taper=0.08), 1304),
        ("well_fragment_14.png", build_irregular_strip_mask(CANVAS_SIZE, 1405, (0.16, 0.24), (0.11, 0.15), waviness=0.24, notch_count=2, taper=0.5, corner_bite=True), 1405),
    ]
    return variants


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

    variants = build_fragment_variants(mask_luma, mask_alpha)

    for filename, alpha_mask, seed in variants:
        image = compose_fragment(alpha_mask, seed)
        image.save(OUTPUT_DIR / filename)
        print(f"wrote {OUTPUT_DIR / filename}")


if __name__ == "__main__":
    main()
