"""Extract and normalize error codes from ticket text."""

import re
import unicodedata


_CODE = re.compile(
    r"(?<![A-Za-z0-9_])(?:ERR|E|อี)[\s_-]*([0-9]{3})(?![A-Za-z0-9_])",
    re.IGNORECASE,
)


def clean_code(text):
    """Return the first error code as E plus three digits, or None if absent.

    Accept English and Thai prefixes, common separators and Unicode decimal
    digits. Require a complete code so longer order or tracking numbers cannot
    be mistaken for an error code.
    """
    if not isinstance(text, str):
        return None

    normalized = []
    for char in unicodedata.normalize("NFKC", text):
        if unicodedata.category(char) == "Cf":
            continue
        if char.isdecimal():
            char = str(unicodedata.decimal(char))
        normalized.append(char)

    match = _CODE.search("".join(normalized))
    return "E" + match.group(1) if match else None
