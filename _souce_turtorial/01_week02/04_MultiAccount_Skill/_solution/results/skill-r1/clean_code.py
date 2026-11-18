"""Extract normalized, three-digit error codes from ticket text."""

import re
import unicodedata


def clean_code(text):
    """Return the first error code as ``Eddd``, or None when absent.

    Accept E, ERR, ERROR (optionally followed by "code"), and Thai อี.
    Thai text can touch a code; Latin letters and digits cannot form part
    of its prefix or suffix. Unicode decimal digits are returned as ASCII.
    """
    if not isinstance(text, str):
        return None

    normalized = unicodedata.normalize("NFKC", text)
    normalized = "".join(
        str(unicodedata.decimal(char))
        if char.isdecimal()
        else char
        for char in normalized
        if unicodedata.category(char) != "Cf"
    ).casefold()

    # Do not use \b: Thai prose often directly adjoins the Latin prefix.
    # Keep the digits contiguous so longer IDs cannot yield partial codes.
    match = re.search(
        r"(?<![a-z0-9])(?:error(?:\s+code)?|err|e|อี)"
        r"[\s_:=#\-\u2010-\u2015\u2212]*"
        r"([0-9]{3})(?![0-9a-z])",
        normalized,
    )
    return "E" + match.group(1) if match else None
