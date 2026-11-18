"""Extract a three-digit error code from ticket text."""

import re
import unicodedata


def clean_code(text):
    """Return the first error code as E plus ASCII digits, or None.

    Accept E, ERR, ERROR and Thai อี prefixes, ignoring case, format
    characters and common separators, with optional code/no. connectors.
    Digits must form an exact run of three.
    """
    if not isinstance(text, str) or not text:
        return None

    # Remove invisible formatting even inside a prefix or digit sequence.
    text = ''.join(c for c in text if unicodedata.category(c) != 'Cf')
    text = unicodedata.normalize('NFKC', text).casefold()
    normalized = []
    for char in text:
        if char.isdecimal():
            normalized.append(str(unicodedata.decimal(char)))
        elif unicodedata.category(char) == 'Pd' or char == '\N{MINUS SIGN}':
            normalized.append('-')
        else:
            normalized.append(char)
    text = ''.join(normalized)

    match = re.search(
        r'(?<![a-z0-9_])(?:error|err|e|อี)[\s_:\-]*'
        r'(?:(?:code|no\.?)[\s_:\-]*)?([0-9]{3})(?!\d)',
        text,
    )
    return 'E' + match.group(1) if match else None
