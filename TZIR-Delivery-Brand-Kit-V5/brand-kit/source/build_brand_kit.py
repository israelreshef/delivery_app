#!/usr/bin/env python3
"""Build the TZIR Delivery V5 brand kit from deterministic source assets."""

from __future__ import annotations

import csv
import math
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source"
FONTS = SOURCE / "fonts"
GENERATED = SOURCE / "generated"

NAVY = "#07162c"
NAVY_SOFT = "#0b2448"
BLUE = "#145ddb"
LIGHT_BLUE = "#5aa0ff"
ICE = "#e8f1ff"
PAPER = "#f7f9fc"
WHITE = "#ffffff"
INK = "#0b1e3d"
MUTED = "#53637c"
LINE = "#dce4f0"
WHATSAPP = "#08786c"


def ensure_directories() -> None:
    for relative in (
        "logos/svg",
        "logos/png",
        "favicon",
        "whatsapp",
        "google",
        "instagram/highlights",
        "social",
        "print",
        "copy",
        "source/fonts/ttf",
    ):
        (ROOT / relative).mkdir(parents=True, exist_ok=True)


def convert_fonts() -> None:
    output = FONTS / "ttf"
    output.mkdir(parents=True, exist_ok=True)
    for source in FONTS.glob("*.woff2"):
        destination = output / f"{source.stem}.ttf"
        font = TTFont(source)
        font.flavor = None
        font.save(destination)


def font(script: str, weight: int, size: int) -> ImageFont.FreeTypeFont:
    family = "heebo-hebrew" if script == "he" else "heebo-latin"
    return ImageFont.truetype(str(FONTS / "ttf" / f"{family}-{weight}.ttf"), size=size)


def rtl(text: str) -> str:
    return text[::-1]


def draw_hebrew(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    face: ImageFont.FreeTypeFont,
    fill: str | tuple[int, ...],
    anchor: str = "ra",
) -> None:
    draw.text(xy, rtl(text), font=face, fill=fill, anchor=anchor)


def draw_round_line(
    draw: ImageDraw.ImageDraw,
    start: tuple[float, float],
    end: tuple[float, float],
    width: int,
    fill: str | tuple[int, ...],
) -> None:
    draw.line((start, end), width=width, fill=fill)
    radius = width / 2
    for x, y in (start, end):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


def draw_mark(
    image: Image.Image,
    box: tuple[int, int, int, int],
    variant: str = "color",
    container: bool = True,
) -> None:
    draw = ImageDraw.Draw(image)
    left, top, right, bottom = box
    size = right - left
    radius = int(size * 0.22)

    if container:
        if variant == "white":
            draw.rounded_rectangle(
                box,
                radius=radius,
                fill=None,
                outline=WHITE,
                width=max(2, int(size * 0.025)),
            )
        else:
            draw.rounded_rectangle(box, radius=radius, fill=NAVY)

    line_width = max(3, int(size * 0.145))
    top_color = WHITE if variant in ("color", "white") else NAVY
    bottom_color = LIGHT_BLUE if variant in ("color", "white") else NAVY
    if variant == "mono-white":
        top_color = WHITE
        bottom_color = WHITE

    draw_round_line(
        draw,
        (left + size * 0.72, top + size * 0.25),
        (left + size * 0.31, top + size * 0.48),
        line_width,
        top_color,
    )
    draw_round_line(
        draw,
        (left + size * 0.28, top + size * 0.76),
        (left + size * 0.69, top + size * 0.53),
        line_width,
        bottom_color,
    )


def tracked_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    face: ImageFont.FreeTypeFont,
    fill: str | tuple[int, ...],
    tracking: int,
) -> None:
    x, y = xy
    for character in text:
        draw.text((x, y), character, font=face, fill=fill, anchor="la")
        bounds = draw.textbbox((0, 0), character, font=face)
        x += bounds[2] - bounds[0] + tracking


def horizontal_logo(width: int, variant: str = "color") -> Image.Image:
    height = round(width * 0.30)
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    scale = width / 2400
    symbol = int(520 * scale)
    symbol_right = width - int(90 * scale)
    symbol_top = int(100 * scale)
    draw_mark(
        image,
        (symbol_right - symbol, symbol_top, symbol_right, symbol_top + symbol),
        variant="white" if variant == "white" else "color",
    )

    word_right = symbol_right - symbol - int(125 * scale)
    he_color = WHITE if variant == "white" else NAVY
    delivery_color = LIGHT_BLUE if variant == "white" else BLUE
    draw_hebrew(
        draw,
        (word_right, int(405 * scale)),
        "ציר",
        font("he", 800, int(310 * scale)),
        he_color,
    )
    tracked_text(
        draw,
        (int(120 * scale), int(305 * scale)),
        "DELIVERY",
        font("latin", 800, int(145 * scale)),
        delivery_color,
        int(26 * scale),
    )
    return image


def stacked_logo(size: int, variant: str = "color") -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    mark_size = int(size * 0.40)
    draw_mark(
        image,
        (
            (size - mark_size) // 2,
            int(size * 0.07),
            (size + mark_size) // 2,
            int(size * 0.07) + mark_size,
        ),
        variant="white" if variant == "white" else "color",
    )
    he_color = WHITE if variant == "white" else NAVY
    delivery_color = LIGHT_BLUE if variant == "white" else BLUE
    draw_hebrew(
        draw,
        (size // 2, int(size * 0.64)),
        "ציר",
        font("he", 800, int(size * 0.18)),
        he_color,
        anchor="mm",
    )
    delivery_face = font("latin", 800, int(size * 0.065))
    text_width = sum(
        draw.textbbox((0, 0), character, font=delivery_face)[2] + int(size * 0.013)
        for character in "DELIVERY"
    )
    tracked_text(
        draw,
        ((size - text_width) // 2, int(size * 0.78)),
        "DELIVERY",
        delivery_face,
        delivery_color,
        int(size * 0.013),
    )
    return image


def outlined_svg_text(
    text: str,
    script: str,
    weight: int,
    font_size: float,
    x: float,
    baseline_y: float,
    fill: str,
    tracking: float = 0,
    align: str = "left",
) -> str:
    """Return font-independent SVG paths for a short logo word."""

    family = "heebo-hebrew" if script == "he" else "heebo-latin"
    font_file = FONTS / "ttf" / f"{family}-{weight}.ttf"
    svg_font = TTFont(font_file)
    glyph_set = svg_font.getGlyphSet()
    cmap = svg_font.getBestCmap()
    hmtx = svg_font["hmtx"].metrics
    scale = font_size / svg_font["head"].unitsPerEm
    visual_text = rtl(text) if script == "he" else text

    glyphs: list[tuple[str, float]] = []
    for character in visual_text:
        glyph_name = cmap.get(ord(character), ".notdef")
        glyphs.append((glyph_name, hmtx[glyph_name][0] * scale))

    total_width = sum(advance for _, advance in glyphs)
    total_width += tracking * max(0, len(glyphs) - 1)
    if align == "right":
        cursor = x - total_width
    elif align == "center":
        cursor = x - total_width / 2
    else:
        cursor = x

    paths: list[str] = []
    for glyph_name, advance in glyphs:
        pen = SVGPathPen(glyph_set)
        transformed = TransformPen(
            pen,
            (scale, 0, 0, -scale, cursor, baseline_y),
        )
        glyph_set[glyph_name].draw(transformed)
        commands = pen.getCommands()
        if commands:
            paths.append(f'<path d="{commands}" fill="{fill}"/>')
        cursor += advance + tracking

    svg_font.close()
    return "<g>" + "".join(paths) + "</g>"


def svg_mark(
    x: int,
    y: int,
    size: int,
    variant: str = "color",
    identifier: str = "mark",
) -> str:
    if variant == "white":
        container = (
            f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="{size * 0.22:.1f}" '
            'fill="#ffffff" fill-opacity=".10" stroke="#ffffff" '
            f'stroke-width="{size * 0.025:.1f}"/>'
        )
        top_color = WHITE
        bottom_color = LIGHT_BLUE
    elif variant == "mono":
        container = (
            f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="{size * 0.22:.1f}" '
            f'fill="{NAVY}"/>'
        )
        top_color = WHITE
        bottom_color = WHITE
    else:
        container = (
            f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="{size * 0.22:.1f}" '
            f'fill="{NAVY}"/>'
        )
        top_color = WHITE
        bottom_color = LIGHT_BLUE

    stroke_width = size * 0.145
    return (
        f'<g id="{identifier}">{container}'
        f'<path d="M {x + size * 0.72:.1f} {y + size * 0.25:.1f} '
        f'L {x + size * 0.31:.1f} {y + size * 0.48:.1f}" '
        f'stroke="{top_color}" stroke-width="{stroke_width:.1f}" stroke-linecap="round"/>'
        f'<path d="M {x + size * 0.28:.1f} {y + size * 0.76:.1f} '
        f'L {x + size * 0.69:.1f} {y + size * 0.53:.1f}" '
        f'stroke="{bottom_color}" stroke-width="{stroke_width:.1f}" stroke-linecap="round"/>'
        "</g>"
    )


def write_svgs() -> None:
    svg_dir = ROOT / "logos/svg"
    symbol = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">'
        + svg_mark(40, 40, 920)
        + "</svg>"
    )
    (svg_dir / "tzir-symbol-color.svg").write_text(symbol, encoding="utf-8")
    (svg_dir / "tzir-symbol-mono.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">'
        + svg_mark(40, 40, 920, "mono")
        + "</svg>",
        encoding="utf-8",
    )
    (svg_dir / "tzir-symbol-white.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">'
        + svg_mark(40, 40, 920, "white")
        + "</svg>",
        encoding="utf-8",
    )

    for variant in ("color", "white"):
        he_color = WHITE if variant == "white" else NAVY
        delivery_color = LIGHT_BLUE if variant == "white" else BLUE
        horizontal = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 720">
{svg_mark(1790, 100, 520, variant)}
{outlined_svg_text("ציר", "he", 800, 310, 1665, 635, he_color, align="right")}
{outlined_svg_text("DELIVERY", "latin", 800, 145, 120, 455, delivery_color, tracking=26)}
</svg>"""
        (svg_dir / f"tzir-logo-horizontal-{variant}.svg").write_text(
            horizontal, encoding="utf-8"
        )

        stacked = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1400">
{svg_mark(420, 98, 560, variant)}
{outlined_svg_text("ציר", "he", 800, 252, 700, 980, he_color, align="center")}
{outlined_svg_text("DELIVERY", "latin", 800, 91, 700, 1190, delivery_color, tracking=18, align="center")}
</svg>"""
        (svg_dir / f"tzir-logo-stacked-{variant}.svg").write_text(
            stacked, encoding="utf-8"
        )

    wordmark = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 520">
{outlined_svg_text("ציר", "he", 800, 300, 1650, 450, NAVY, align="right")}
{outlined_svg_text("DELIVERY", "latin", 800, 132, 100, 350, BLUE, tracking=24)}
</svg>"""
    (svg_dir / "tzir-wordmark-color.svg").write_text(wordmark, encoding="utf-8")


def save_png(image: Image.Image, path: Path, optimize: bool = True, dpi=(144, 144)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=optimize, dpi=dpi)


def export_logo_pngs() -> None:
    output = ROOT / "logos/png"
    horizontal = horizontal_logo(2400, "color")
    horizontal_white = horizontal_logo(2400, "white")
    stacked = stacked_logo(1400, "color")
    stacked_white = stacked_logo(1400, "white")
    symbol = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_mark(symbol, (52, 52, 972, 972))
    symbol_white = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_mark(symbol_white, (52, 52, 972, 972), "mono-white", container=False)

    save_png(horizontal, output / "tzir-logo-horizontal-color-2400.png")
    save_png(horizontal.resize((1200, 360), Image.Resampling.LANCZOS), output / "tzir-logo-horizontal-color-1200.png")
    save_png(horizontal.resize((600, 180), Image.Resampling.LANCZOS), output / "tzir-logo-horizontal-color-600.png")
    save_png(horizontal_white.resize((1200, 360), Image.Resampling.LANCZOS), output / "tzir-logo-horizontal-white-1200.png")
    save_png(stacked, output / "tzir-logo-stacked-color-1400.png")
    save_png(stacked_white, output / "tzir-logo-stacked-white-1400.png")
    save_png(symbol, output / "tzir-symbol-color-1024.png")
    save_png(symbol_white, output / "tzir-symbol-white-1024.png")


def export_favicons() -> None:
    output = ROOT / "favicon"
    master = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_mark(master, (48, 48, 976, 976))
    save_png(master.resize((512, 512), Image.Resampling.LANCZOS), output / "site-icon-512.png")
    save_png(master.resize((192, 192), Image.Resampling.LANCZOS), output / "pwa-icon-192.png")
    save_png(master.resize((180, 180), Image.Resampling.LANCZOS), output / "apple-touch-icon-180.png")
    for size in (16, 32, 48, 64):
        save_png(
            master.resize((size, size), Image.Resampling.LANCZOS),
            output / f"favicon-{size}.png",
        )
    master.save(
        output / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )
    (output / "favicon.svg").write_text(
        (ROOT / "logos/svg/tzir-symbol-color.svg").read_text(encoding="utf-8"),
        encoding="utf-8",
    )


def cover(image: Image.Image, size: tuple[int, int], centering=(0.5, 0.5)) -> Image.Image:
    return ImageOps.fit(image.convert("RGB"), size, Image.Resampling.LANCZOS, centering=centering)


def darken(image: Image.Image, amount: int = 95) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (7, 22, 44, amount))
    return Image.alpha_composite(image.convert("RGBA"), overlay)


def logo_lockup_on_canvas(
    image: Image.Image,
    x_right: int,
    y_top: int,
    scale: int,
    light: bool = True,
) -> None:
    draw = ImageDraw.Draw(image)
    draw_mark(
        image,
        (x_right - scale, y_top, x_right, y_top + scale),
        "white" if light else "color",
    )
    word_right = x_right - scale - int(scale * 0.22)
    draw_hebrew(
        draw,
        (word_right, y_top + int(scale * 0.53)),
        "ציר",
        font("he", 800, int(scale * 0.47)),
        WHITE if light else NAVY,
    )
    tracked_text(
        draw,
        (word_right - int(scale * 1.75), y_top + int(scale * 0.55)),
        "DELIVERY",
        font("latin", 800, int(scale * 0.19)),
        LIGHT_BLUE if light else BLUE,
        int(scale * 0.035),
    )


def profile_asset(size: int, background: str, mark_scale: float) -> Image.Image:
    image = Image.new("RGBA", (size, size), background)
    draw = ImageDraw.Draw(image)
    draw.ellipse(
        (int(size * 0.08), int(size * 0.08), int(size * 0.92), int(size * 0.92)),
        fill=ICE,
    )
    mark = int(size * mark_scale)
    left = (size - mark) // 2
    draw_mark(image, (left, left, left + mark, left + mark))
    return image.convert("RGB")


def clean_wallpaper() -> Image.Image:
    width, height = 1440, 2560
    image = Image.new("RGBA", (width, height), NAVY)
    draw = ImageDraw.Draw(image)
    for x in range(0, width + 1, 96):
        draw.line((x, 0, x, height), fill=(90, 160, 255, 10), width=1)
    for y in range(0, height + 1, 96):
        draw.line((0, y, width, y), fill=(90, 160, 255, 10), width=1)
    for row, y in enumerate(range(120, height, 300)):
        for x in range(100 + (row % 2) * 150, width, 300):
            tile = Image.new("RGBA", (78, 78), (0, 0, 0, 0))
            draw_mark(tile, (8, 8, 70, 70), "white")
            tile.putalpha(tile.getchannel("A").point(lambda alpha: int(alpha * 0.09)))
            image.alpha_composite(tile, (x, y))
    route = [(110, 2290), (350, 2050), (410, 1700), (760, 1420), (870, 970), (1260, 650)]
    draw.line(route, fill=(90, 160, 255, 65), width=9, joint="curve")
    for x, y in route:
        draw.ellipse((x - 16, y - 16, x + 16, y + 16), fill=(232, 241, 255, 120))
        draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=(90, 160, 255, 190))
    return image.convert("RGB")


def business_card(vertical_master: Image.Image) -> Image.Image:
    width, height = 1080, 1350
    image = Image.new("RGBA", (width, height), PAPER)
    top = darken(cover(vertical_master, (width, 720), centering=(0.5, 0.58)), 65)
    image.alpha_composite(top, (0, 0))
    draw = ImageDraw.Draw(image)
    logo_lockup_on_canvas(image, 970, 72, 150, True)
    draw_hebrew(
        draw,
        (930, 365),
        "שליחויות משפטיות ועסקיות",
        font("he", 800, 67),
        WHITE,
    )
    draw_hebrew(draw, (930, 455), "בגוש דן והמרכז", font("he", 600, 45), ICE)
    draw.rounded_rectangle((90, 580, 930, 664), radius=42, fill=WHATSAPP)
    draw_hebrew(
        draw,
        (880, 622),
        "לתיאום ישיר בוואטסאפ",
        font("he", 800, 39),
        WHITE,
        anchor="rm",
    )
    draw.text((140, 623), "WA", font=font("latin", 800, 28), fill=WHITE, anchor="lm")

    draw_hebrew(draw, (930, 825), "נקודת איסוף  יעד  דחיפות", font("he", 600, 36), MUTED)
    draw.line((90, 890, 930, 890), fill=LINE, width=2)
    draw.text((930, 1000), "052-332-2067", font=font("latin", 800, 64), fill=NAVY, anchor="ra")
    draw.text((930, 1080), "tzirdelivery.co.il", font=font("latin", 600, 38), fill=BLUE, anchor="ra")
    draw_hebrew(
        draw,
        (930, 1190),
        "עסק ישראלי וציוני גאה",
        font("he", 600, 34),
        NAVY,
    )
    draw.rectangle((90, 1245, 380, 1252), fill=BLUE)
    draw.rectangle((400, 1245, 560, 1252), fill=LIGHT_BLUE)
    draw.rectangle((580, 1245, 930, 1252), fill=NAVY)
    return image.convert("RGB")


def status_story(vertical_master: Image.Image) -> Image.Image:
    width, height = 1080, 1920
    image = darken(cover(vertical_master, (width, height), centering=(0.5, 0.52)), 72)
    draw = ImageDraw.Draw(image)
    logo_lockup_on_canvas(image, 980, 90, 155, True)
    draw_hebrew(
        draw,
        (930, 665),
        "מסמך חשוב",
        font("he", 800, 92),
        WHITE,
    )
    draw_hebrew(
        draw,
        (930, 780),
        "צריך ידיים אחראיות",
        font("he", 800, 88),
        WHITE,
    )
    draw_hebrew(
        draw,
        (930, 910),
        "שליחויות משפטיות ועסקיות",
        font("he", 600, 44),
        ICE,
    )
    draw_hebrew(draw, (930, 970), "גוש דן והמרכז", font("he", 600, 44), ICE)
    draw.rounded_rectangle((100, 1510, 980, 1630), radius=60, fill=WHATSAPP)
    draw_hebrew(
        draw,
        (915, 1570),
        "בדיקת שליחות בוואטסאפ",
        font("he", 800, 44),
        WHITE,
        anchor="rm",
    )
    draw.text((160, 1570), "052-332-2067", font=font("latin", 800, 31), fill=WHITE, anchor="lm")
    draw_hebrew(
        draw,
        (930, 1740),
        "עסק ישראלי וציוני גאה",
        font("he", 600, 34),
        ICE,
    )
    return image.convert("RGB")


def instagram_post(vertical_master: Image.Image) -> Image.Image:
    width, height = 1080, 1350
    image = darken(cover(vertical_master, (width, height), centering=(0.5, 0.56)), 62)
    draw = ImageDraw.Draw(image)
    logo_lockup_on_canvas(image, 970, 72, 145, True)
    draw_hebrew(draw, (930, 545), "מסמך חשוב", font("he", 800, 82), WHITE)
    draw_hebrew(draw, (930, 648), "לא מוסרים לכל אחד", font("he", 800, 77), WHITE)
    draw_hebrew(
        draw,
        (930, 770),
        "שליחויות משפטיות ועסקיות בגוש דן",
        font("he", 600, 38),
        ICE,
    )
    draw.rounded_rectangle((100, 1040, 930, 1140), radius=50, fill=WHATSAPP)
    draw_hebrew(
        draw,
        (880, 1090),
        "לתיאום ישיר בוואטסאפ",
        font("he", 800, 39),
        WHITE,
        anchor="rm",
    )
    draw.text((145, 1090), "052-332-2067", font=font("latin", 800, 28), fill=WHITE, anchor="lm")
    return image.convert("RGB")


def review_request_card() -> Image.Image:
    width, height = 1080, 1350
    image = Image.new("RGBA", (width, height), ICE)
    draw = ImageDraw.Draw(image)
    draw.ellipse((-220, -240, 720, 700), fill=(20, 93, 219, 18))
    draw.ellipse((650, 850, 1320, 1520), fill=(90, 160, 255, 30))
    logo_lockup_on_canvas(image, 970, 70, 145, False)
    star = []
    center = (540, 440)
    for index in range(10):
        angle = -math.pi / 2 + index * math.pi / 5
        radius = 96 if index % 2 == 0 else 42
        star.append((center[0] + math.cos(angle) * radius, center[1] + math.sin(angle) * radius))
    draw.polygon(star, fill=BLUE)
    draw_hebrew(draw, (930, 690), "השירות עזר לכם", font("he", 800, 76), NAVY)
    review_face = font("he", 800, 62)
    review_text = "נשמח לביקורת ב"
    review_visual = rtl(review_text)
    review_bounds = draw.textbbox((0, 0), review_visual, font=review_face)
    review_left = 930 - (review_bounds[2] - review_bounds[0])
    draw_hebrew(draw, (930, 785), review_text, review_face, NAVY)
    draw.text(
        (review_left - 18, 785),
        "Google",
        font=font("latin", 800, 55),
        fill=BLUE,
        anchor="ra",
    )
    draw_hebrew(
        draw,
        (930, 900),
        "הקישור לכרטיס העסק מצורף להודעה",
        font("he", 600, 37),
        MUTED,
    )
    draw.rounded_rectangle((120, 1030, 960, 1140), radius=55, fill=BLUE)
    draw_hebrew(
        draw,
        (900, 1085),
        "פותחים  מדרגים  וכותבים",
        font("he", 800, 39),
        WHITE,
        anchor="rm",
    )
    draw_hebrew(
        draw,
        (930, 1250),
        "תודה שבחרתם בציר",
        font("he", 600, 35),
        NAVY,
    )
    return image.convert("RGB")


def social_cover(wide_master: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = darken(cover(wide_master, size, centering=(0.5, 0.5)), 45)
    draw = ImageDraw.Draw(image)
    width, height = size
    scale = int(height * 0.16)
    logo_lockup_on_canvas(image, width - int(width * 0.055), int(height * 0.08), scale, True)
    title = "שליחויות משפטיות ועסקיות"
    title_size = int(height * 0.075)
    title_face = font("he", 800, title_size)
    max_title_width = int(width * 0.54)
    while (
        draw.textbbox((0, 0), rtl(title), font=title_face)[2] > max_title_width
        and title_size > 28
    ):
        title_size -= 2
        title_face = font("he", 800, title_size)
    copy_right = int(width * 0.57)
    draw_hebrew(
        draw,
        (copy_right, int(height * 0.52)),
        title,
        title_face,
        WHITE,
    )
    draw_hebrew(
        draw,
        (copy_right, int(height * 0.64)),
        "גוש דן והמרכז",
        font("he", 600, int(height * 0.052)),
        ICE,
    )
    draw.text(
        (copy_right, int(height * 0.75)),
        "052-332-2067",
        font=font("latin", 800, int(height * 0.044)),
        fill=LIGHT_BLUE,
        anchor="ra",
    )
    return image.convert("RGB")


def print_business_cards() -> tuple[Image.Image, Image.Image]:
    width, height = 1134, 661
    front = Image.new("RGBA", (width, height), PAPER)
    draw = ImageDraw.Draw(front)
    draw.rectangle((0, 0, 400, height), fill=NAVY)
    draw_mark(front, (92, 140, 308, 356), "white")
    draw.text((200, 435), "TZIR", font=font("latin", 800, 52), fill=WHITE, anchor="ma")
    draw.text((200, 492), "DELIVERY", font=font("latin", 600, 25), fill=LIGHT_BLUE, anchor="ma")
    draw_hebrew(draw, (1050, 170), "ציר דליברי", font("he", 800, 72), NAVY)
    draw_hebrew(
        draw,
        (1050, 250),
        "שליחויות משפטיות ועסקיות",
        font("he", 600, 36),
        MUTED,
    )
    draw.line((500, 318, 1050, 318), fill=LINE, width=2)
    draw.text((1050, 405), "052-332-2067", font=font("latin", 800, 47), fill=NAVY, anchor="ra")
    draw.text((1050, 470), "tzirdelivery.co.il", font=font("latin", 600, 31), fill=BLUE, anchor="ra")
    draw_hebrew(draw, (1050, 555), "גוש דן והמרכז", font("he", 600, 30), NAVY)

    back = Image.new("RGBA", (width, height), NAVY)
    draw = ImageDraw.Draw(back)
    draw_mark(back, (427, 80, 707, 360), "white")
    draw_hebrew(
        draw,
        (567, 455),
        "עסק ישראלי וציוני גאה",
        font("he", 800, 45),
        WHITE,
        anchor="ma",
    )
    draw_hebrew(
        draw,
        (567, 520),
        "אחריות  אמינות  תקשורת ישירה",
        font("he", 600, 29),
        ICE,
        anchor="ma",
    )
    return front.convert("RGB"), back.convert("RGB")


def draw_highlight_icon(kind: str) -> Image.Image:
    size = 1080
    image = Image.new("RGBA", (size, size), NAVY)
    draw = ImageDraw.Draw(image)
    draw.ellipse((150, 150, 930, 930), fill=NAVY_SOFT, outline=(90, 160, 255, 80), width=8)
    color = WHITE
    accent = LIGHT_BLUE
    if kind == "legal":
        draw.rounded_rectangle((350, 280, 730, 800), radius=45, outline=color, width=28)
        draw.line((430, 420, 650, 420), fill=accent, width=24)
        draw.line((430, 520, 650, 520), fill=color, width=20)
        draw.line((430, 620, 590, 620), fill=color, width=20)
    elif kind == "business":
        draw.rounded_rectangle((250, 390, 830, 760), radius=55, outline=color, width=30)
        draw.rounded_rectangle((420, 285, 660, 450), radius=40, outline=accent, width=26)
        draw.line((250, 530, 830, 530), fill=accent, width=24)
        draw.rounded_rectangle((500, 495, 580, 570), radius=18, fill=color)
    elif kind == "urgent":
        draw.polygon(((610, 220), (350, 565), (520, 565), (430, 860), (740, 470), (565, 470)), fill=accent)
    elif kind == "reviews":
        points = []
        for index in range(10):
            angle = -math.pi / 2 + index * math.pi / 5
            radius = 260 if index % 2 == 0 else 115
            points.append((540 + math.cos(angle) * radius, 540 + math.sin(angle) * radius))
        draw.polygon(points, fill=accent)
    elif kind == "contact":
        draw.rounded_rectangle((245, 285, 835, 710), radius=120, outline=color, width=30)
        draw.polygon(((430, 700), (355, 850), (555, 710)), fill=color)
        draw.ellipse((395, 470, 455, 530), fill=accent)
        draw.ellipse((510, 470, 570, 530), fill=accent)
        draw.ellipse((625, 470, 685, 530), fill=accent)
    elif kind == "israel":
        top = [(540, 260), (765, 650), (315, 650)]
        bottom = [(540, 820), (315, 430), (765, 430)]
        draw.line(top + [top[0]], fill=accent, width=28, joint="curve")
        draw.line(bottom + [bottom[0]], fill=color, width=28, joint="curve")
    return image.convert("RGB")


def brand_sheet() -> Image.Image:
    width, height = 2400, 1800
    image = Image.new("RGBA", (width, height), PAPER)
    draw = ImageDraw.Draw(image)
    draw.text((120, 125), "TZIR DELIVERY", font=font("latin", 800, 72), fill=NAVY, anchor="la")
    draw_hebrew(draw, (2280, 135), "מערכת מותג", font("he", 800, 72), NAVY)
    draw.text((1760, 135), "V5", font=font("latin", 800, 60), fill=BLUE, anchor="ra")
    draw.line((120, 220, 2280, 220), fill=LINE, width=3)

    logo = horizontal_logo(1800)
    image.alpha_composite(logo, (300, 285))
    dark_panel = Image.new("RGBA", (2160, 470), NAVY)
    white_logo = horizontal_logo(1400, "white")
    dark_panel.alpha_composite(white_logo, (380, 25))
    image.alpha_composite(dark_panel, (120, 880))

    colors = [
        ("NAVY", NAVY),
        ("BLUE", BLUE),
        ("LIGHT BLUE", LIGHT_BLUE),
        ("ICE", ICE),
        ("WHATSAPP", WHATSAPP),
    ]
    for index, (label, value) in enumerate(colors):
        x = 120 + index * 432
        draw.rounded_rectangle((x, 1420, x + 360, 1660), radius=28, fill=value, outline=LINE, width=2)
        text_color = WHITE if index != 3 else NAVY
        draw.text((x + 30, 1510), label, font=font("latin", 800, 28), fill=text_color)
        draw.text((x + 30, 1570), value.upper(), font=font("latin", 600, 24), fill=text_color)
    return image.convert("RGB")


def write_manifest(rows: list[tuple[str, str, str, str]]) -> None:
    with (ROOT / "ASSET-MANIFEST.csv").open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.writer(stream)
        writer.writerow(("קובץ", "פלטפורמה", "מטרה", "מידות"))
        writer.writerows(rows)


def main() -> None:
    ensure_directories()
    convert_fonts()
    write_svgs()
    export_logo_pngs()
    export_favicons()

    vertical_master = Image.open(GENERATED / "route-background-vertical-master.png")
    wide_master = Image.open(GENERATED / "route-background-wide-master.png")

    save_png(profile_asset(640, ICE, 0.58), ROOT / "whatsapp/whatsapp-profile-640.png")
    premium_wallpaper = darken(
        cover(vertical_master, (1440, 2560), centering=(0.5, 0.54)),
        48,
    ).convert("RGB")
    premium_wallpaper.save(ROOT / "whatsapp/whatsapp-wallpaper-premium-1440x2560.jpg", quality=94, optimize=True)
    clean_wallpaper().save(ROOT / "whatsapp/whatsapp-wallpaper-clean-1440x2560.jpg", quality=94, optimize=True)
    business_card(vertical_master).save(ROOT / "whatsapp/whatsapp-business-card-1080x1350.jpg", quality=95, optimize=True)
    status_story(vertical_master).save(ROOT / "whatsapp/whatsapp-status-1080x1920.jpg", quality=95, optimize=True)

    profile_asset(720, WHITE, 0.56).save(
        ROOT / "google/google-business-logo-720.png",
        format="PNG",
        compress_level=1,
        dpi=(144, 144),
    )
    overlay = Image.new("RGBA", (720, 720), (0, 0, 0, 0))
    draw_mark(overlay, (620, 620, 700, 700))
    save_png(overlay, ROOT / "google/google-real-photo-overlay-template-720.png")
    review_request_card().save(ROOT / "google/google-review-request-1080x1350.jpg", quality=95, optimize=True)

    save_png(profile_asset(1080, ICE, 0.56), ROOT / "instagram/instagram-profile-1080.png")
    instagram_post(vertical_master).save(ROOT / "instagram/instagram-feed-1080x1350.jpg", quality=95, optimize=True)
    status_story(vertical_master).save(ROOT / "instagram/instagram-story-1080x1920.jpg", quality=95, optimize=True)
    for kind in ("legal", "business", "urgent", "reviews", "contact", "israel"):
        save_png(draw_highlight_icon(kind), ROOT / f"instagram/highlights/highlight-{kind}-1080.png")

    social_cover(wide_master, (1920, 1080)).save(ROOT / "social/social-cover-1920x1080.jpg", quality=95, optimize=True)
    social_cover(wide_master, (1200, 630)).save(ROOT / "social/open-graph-1200x630.jpg", quality=95, optimize=True)
    social_cover(wide_master, (1640, 924)).save(ROOT / "social/facebook-cover-1640x924.jpg", quality=95, optimize=True)

    front, back = print_business_cards()
    save_png(front, ROOT / "print/business-card-front-96x56mm-300dpi.png", dpi=(300, 300))
    save_png(back, ROOT / "print/business-card-back-96x56mm-300dpi.png", dpi=(300, 300))
    save_png(brand_sheet(), ROOT / "TZIR-BRAND-SHEET.png")

    manifest = [
        ("logos/svg/tzir-logo-horizontal-color.svg", "כללי ודפוס", "לוגו ראשי צבעוני", "וקטור"),
        ("logos/svg/tzir-logo-horizontal-white.svg", "כללי ודפוס", "לוגו לבן לרקע כהה", "וקטור"),
        ("logos/svg/tzir-logo-stacked-color.svg", "כללי", "לוגו אנכי", "וקטור"),
        ("logos/svg/tzir-symbol-color.svg", "כללי", "הסמל בלבד", "וקטור"),
        ("logos/png/tzir-logo-horizontal-color-2400.png", "דפוס ומצגות", "לוגו שקוף גדול", "2400x720"),
        ("logos/png/tzir-logo-horizontal-color-600.png", "דוא״ל ומסמכים", "לוגו שקוף קטן", "600x180"),
        ("favicon/favicon.ico", "אתר", "פאביקון רב גדלים", "16 עד 64"),
        ("favicon/apple-touch-icon-180.png", "Apple", "אייקון למסך הבית", "180x180"),
        ("favicon/site-icon-512.png", "WordPress", "Site Icon", "512x512"),
        ("whatsapp/whatsapp-profile-640.png", "WhatsApp Business", "תמונת פרופיל", "640x640"),
        ("whatsapp/whatsapp-business-card-1080x1350.jpg", "WhatsApp", "כרטיס ביקור לשליחה", "1080x1350"),
        ("whatsapp/whatsapp-status-1080x1920.jpg", "WhatsApp Status", "סטטוס שיווקי", "1080x1920"),
        ("whatsapp/whatsapp-wallpaper-premium-1440x2560.jpg", "WhatsApp", "רקע שיחה או מכשיר", "1440x2560"),
        ("google/google-business-logo-720.png", "Google Business", "לוגו הכרטיס", "720x720"),
        ("google/google-review-request-1080x1350.jpg", "Google Reviews", "בקשת ביקורת לשיתוף", "1080x1350"),
        ("google/google-real-photo-overlay-template-720.png", "Google Business", "שכבת מותג לצילום אמיתי", "720x720"),
        ("instagram/instagram-profile-1080.png", "Instagram", "תמונת פרופיל", "1080x1080"),
        ("instagram/instagram-feed-1080x1350.jpg", "Instagram Feed", "פוסט היכרות", "1080x1350"),
        ("instagram/instagram-story-1080x1920.jpg", "Instagram Story", "סטורי", "1080x1920"),
        ("instagram/highlights", "Instagram", "שש עטיפות Highlights", "1080x1080"),
        ("social/social-cover-1920x1080.jpg", "כללי", "רקע מצגות וקמפיינים", "1920x1080"),
        ("social/open-graph-1200x630.jpg", "אתר ורשתות", "תצוגת קישור", "1200x630"),
        ("print/business-card-front-96x56mm-300dpi.png", "דפוס", "כרטיס ביקור קדמי עם גלישה", "1134x661"),
        ("print/business-card-back-96x56mm-300dpi.png", "דפוס", "כרטיס ביקור אחורי עם גלישה", "1134x661"),
    ]
    write_manifest(manifest)
    print(f"Built TZIR brand kit in {ROOT}")


if __name__ == "__main__":
    main()
