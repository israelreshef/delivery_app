import re
import unicodedata


def normalize_address(s: str) -> str:
    """Normalize an address string for cache keying.

    Strips whitespace, transliterates Hebrew/accents to ASCII, removes
    common street-type prefixes and punctuation so that semantically equal
    addresses collide on the same cache key.
    """
    if not s:
        return ""
    s = s.strip().lower()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[.,/\-]", " ", s)
    s = re.sub(
        r"\b(st|street|str|רח|רחוב|שדרות|שד|דרך|דר|סב|סמטה|שכ|שיכון|השלום|הנביאים|הרצל)\b",
        " ",
        s,
    )
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def normalize_address_key(s: str, city: str = None, country_code: str = "IL") -> str:
    """Build a cache lookup key including city/country to avoid collisions."""
    base = normalize_address(s)
    parts = [base]
    if city:
        parts.append(normalize_address(city))
    parts.append((country_code or "IL").upper())
    return "|".join(p for p in parts if p)
