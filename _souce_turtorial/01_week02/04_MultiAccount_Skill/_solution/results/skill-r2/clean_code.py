"""Extract a three-digit error code from ticket text."""

import re
import unicodedata


# Preserve nonbreaking spaces during normalization: they can be inserted inside
# a code, but can also separate that code from the surrounding English words.
_NONBREAKING = "\u00a0\u2007\u202f"
_GAP = "[" + _NONBREAKING + "]*"
_PREFIX = (
    rf"e{_GAP}(?:r{_GAP}r{_GAP}(?:o{_GAP}r{_GAP})?)?"
    rf"|อ{_GAP}ี"
    rf"|ร{_GAP}ห{_GAP}ั{_GAP}ส"
)
_CODE = re.compile(
    rf"(?<![a-z0-9_])(?:{_PREFIX})[\s_:=-]*"
    rf"([0-9]{_GAP}[0-9]{_GAP}[0-9])"
    rf"(?![a-z0-9_]|{_GAP}[0-9])",
    re.IGNORECASE,
)


def clean_code(text):
    """Return the first explicit error code as Eddd, or None for missing input."""
    if not isinstance(text, str):
        return None

    normalized = []
    for original in text:
        if original in _NONBREAKING:
            normalized.append(original)
            continue
        for char in unicodedata.normalize("NFKC", original):
            category = unicodedata.category(char)
            point = ord(char)
            if (
                category == "Cf"
                or char == "\u034f"  # Combining grapheme joiner.
                or 0xFE00 <= point <= 0xFE0F  # Variation selectors.
                or 0xE0100 <= point <= 0xE01EF
            ):
                continue
            if char.isdecimal():
                normalized.append(str(unicodedata.decimal(char)))
            elif category == "Pd" or char == "\u2212":
                normalized.append("-")
            elif char.isspace() and char not in _NONBREAKING:
                normalized.append(" ")
            else:
                normalized.append(char)

    match = _CODE.search("".join(normalized))
    if match is None:
        return None
    return "E" + "".join(char for char in match.group(1) if char.isdecimal())
