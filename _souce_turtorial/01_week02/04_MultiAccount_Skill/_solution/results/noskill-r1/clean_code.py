import re
import unicodedata


def clean_code(text):
    """Return the first standalone error code, normalized to E and three digits."""
    if not isinstance(text, str) or not text:
        return None

    normalized = unicodedata.normalize('NFKC', text)
    normalized = ''.join(
        str(unicodedata.decimal(char)) if char.isdecimal() else char
        for char in normalized
        if unicodedata.category(char) != 'Cf'
    )
    # Keep whitespace: removing it globally could join unrelated words/numbers.
    # Thai prose may touch a code, so ASCII token boundaries are intentional.
    match = re.search(
        r'(?<![a-zA-Z0-9_])'
        r'(?:[eE](?:\s*[rR]\s*[rR])?|อ\s*ี)'
        r'[\s_\-‐‑‒–—−]*'
        r'([0-9])\s*([0-9])\s*([0-9])'
        r'(?![a-zA-Z0-9_])',
        normalized,
    )
    return 'E' + ''.join(match.groups()) if match else None
