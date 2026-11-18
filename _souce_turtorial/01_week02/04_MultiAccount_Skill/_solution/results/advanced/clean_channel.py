import unicodedata


def clean_channel(channel):
    """Return 'line', 'app', or 'email'; return None for unknown/non-string input.

    Normalize Unicode, case, whitespace, invisible format characters, and
    hyphen variants while preserving Thai vowels and tone marks.
    """
    if not isinstance(channel, str):
        return None

    normalized = unicodedata.normalize("NFKC", channel).casefold()
    normalized = "".join(
        char
        for char in normalized
        if not char.isspace()
        and unicodedata.category(char) not in {"Cf", "Pd"}
        and char != "_"
    )

    aliases = {
        "line": "line",
        "line@": "line",
        "ไลน์": "line",
        "ไลน์@": "line",
        "app": "app",
        "application": "app",
        "mobileapp": "app",
        "mobileapplication": "app",
        "แอป": "app",
        "แอพ": "app",
        "แอปพลิเคชัน": "app",
        "แอปพลิเคชั่น": "app",
        "แอพพลิเคชัน": "app",
        "แอพพลิเคชั่น": "app",
        "email": "email",
        "อีเมล": "email",
        "อีเมล์": "email",
        "เมล": "email",
        "เมล์": "email",
    }
    return aliases.get(normalized)
