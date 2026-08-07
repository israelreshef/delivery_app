#!/usr/bin/env python3
"""Validate dimensions, formats, transparency and required brand-kit files."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]

EXPECTED_DIMENSIONS = {
    "logos/png/tzir-logo-horizontal-color-2400.png": (2400, 720),
    "logos/png/tzir-logo-horizontal-color-1200.png": (1200, 360),
    "logos/png/tzir-logo-horizontal-color-600.png": (600, 180),
    "logos/png/tzir-logo-stacked-color-1400.png": (1400, 1400),
    "logos/png/tzir-symbol-color-1024.png": (1024, 1024),
    "favicon/site-icon-512.png": (512, 512),
    "favicon/pwa-icon-192.png": (192, 192),
    "favicon/apple-touch-icon-180.png": (180, 180),
    "favicon/favicon-16.png": (16, 16),
    "favicon/favicon-32.png": (32, 32),
    "favicon/favicon-48.png": (48, 48),
    "whatsapp/whatsapp-profile-640.png": (640, 640),
    "whatsapp/whatsapp-business-card-1080x1350.jpg": (1080, 1350),
    "whatsapp/whatsapp-status-1080x1920.jpg": (1080, 1920),
    "whatsapp/whatsapp-wallpaper-premium-1440x2560.jpg": (1440, 2560),
    "whatsapp/whatsapp-wallpaper-clean-1440x2560.jpg": (1440, 2560),
    "google/google-business-logo-720.png": (720, 720),
    "google/google-review-request-1080x1350.jpg": (1080, 1350),
    "google/google-real-photo-overlay-template-720.png": (720, 720),
    "instagram/instagram-profile-1080.png": (1080, 1080),
    "instagram/instagram-feed-1080x1350.jpg": (1080, 1350),
    "instagram/instagram-story-1080x1920.jpg": (1080, 1920),
    "social/social-cover-1920x1080.jpg": (1920, 1080),
    "social/open-graph-1200x630.jpg": (1200, 630),
    "social/facebook-cover-1640x924.jpg": (1640, 924),
    "print/business-card-front-96x56mm-300dpi.png": (1134, 661),
    "print/business-card-back-96x56mm-300dpi.png": (1134, 661),
    "TZIR-BRAND-SHEET.png": (2400, 1800),
}

REQUIRED_FILES = [
    "README-HE.md",
    "PLATFORM-GUIDE-HE.md",
    "ASSET-MANIFEST.csv",
    "PROMPTS.md",
    "source/fonts/OFL-Heebo.txt",
    "favicon/favicon.ico",
    "favicon/favicon.svg",
    "logos/svg/tzir-symbol-color.svg",
    "logos/svg/tzir-symbol-mono.svg",
    "logos/svg/tzir-symbol-white.svg",
    "logos/svg/tzir-logo-horizontal-color.svg",
    "logos/svg/tzir-logo-horizontal-white.svg",
    "logos/svg/tzir-logo-stacked-color.svg",
    "logos/svg/tzir-logo-stacked-white.svg",
    "logos/svg/tzir-wordmark-color.svg",
    "copy/whatsapp-business-card-caption-he.txt",
    "copy/google-review-request-caption-he.txt",
    "copy/instagram-bio-he.txt",
    "copy/instagram-intro-post-caption-he.txt",
]


def main() -> None:
    failures: list[str] = []

    for relative in REQUIRED_FILES:
        path = ROOT / relative
        if not path.is_file() or path.stat().st_size == 0:
            failures.append(f"Missing or empty: {relative}")

    for relative, expected in EXPECTED_DIMENSIONS.items():
        path = ROOT / relative
        try:
            with Image.open(path) as image:
                if image.size != expected:
                    failures.append(f"{relative}: expected {expected}, got {image.size}")
        except Exception as error:
            failures.append(f"{relative}: cannot open image: {error}")

    for svg in (ROOT / "logos/svg").glob("*.svg"):
        try:
            tree = ET.parse(svg)
            if any(element.tag.endswith("text") for element in tree.iter()):
                failures.append(
                    f"{svg.relative_to(ROOT)}: logo text must be converted to vector paths"
                )
        except Exception as error:
            failures.append(f"{svg.relative_to(ROOT)}: invalid SVG XML: {error}")

    transparent_files = [
        ROOT / "logos/png/tzir-symbol-color-1024.png",
        ROOT / "logos/png/tzir-logo-horizontal-color-2400.png",
        ROOT / "google/google-real-photo-overlay-template-720.png",
    ]
    for path in transparent_files:
        with Image.open(path) as image:
            if image.mode != "RGBA":
                failures.append(f"{path.relative_to(ROOT)}: missing alpha channel")
            elif image.getpixel((0, 0))[3] != 0:
                failures.append(f"{path.relative_to(ROOT)}: corner is not transparent")

    google_logo = ROOT / "google/google-business-logo-720.png"
    if not (10 * 1024 <= google_logo.stat().st_size <= 5 * 1024 * 1024):
        failures.append("google-business-logo-720.png is outside Google's 10 KB to 5 MB range")

    highlights = list((ROOT / "instagram/highlights").glob("highlight-*-1080.png"))
    if len(highlights) != 6:
        failures.append(f"Expected 6 Instagram highlight covers, found {len(highlights)}")
    for path in highlights:
        with Image.open(path) as image:
            if image.size != (1080, 1080):
                failures.append(f"{path.relative_to(ROOT)}: incorrect highlight size")

    if failures:
        print("\n".join(failures))
        raise SystemExit(1)

    print(
        f"Validated {len(EXPECTED_DIMENSIONS)} sized assets, "
        f"{len(list((ROOT / 'logos/svg').glob('*.svg')))} SVG files and "
        f"{len(highlights)} Instagram highlights."
    )


if __name__ == "__main__":
    main()
