#!/usr/bin/env python3
"""Build data/airline-labels.json from the GetShoppingResults responses in the HAR capture.

Each itinerary in a response is an array laid out as
  [code, [airline names], [legs], from, [y,m,d], [h,m], to, [y,m,d], [h,m], duration, ..., [partner names], "shortId", ...]
The partner list (co-marketing / codeshare carriers) sits just before the short id; a leg flown by
another operator carries that operator's name in leg[2]. The label the results list shows is the
airline names joined by ", ", followed by " · " and the partners plus "ดำเนินการโดย <operator>"
when there are any.

Keys match data/flights-all.json: date|HH:MM|from|to|flight number of every leg, plus "#n" for the
n-th distinct itinerary (by leg departure dates/times) sharing that key, in order of first appearance.

usage: python3 -I scripts/v4/extract_airline_labels.py [HAR] [OUT]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HAR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/workspace/rea-flight-v3/har/flights.clean.har")
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "data" / "airline-labels.json"


def payloads(text):
    """Yield the decoded inner JSON of every wrb.fr frame in a batchexecute response."""
    body = text[text.index("\n") + 1:] if text.startswith(")]}'") else text
    dec = json.JSONDecoder()
    i = 0
    while i < len(body):
        j = body.find("[", i)
        if j < 0:
            break
        try:
            frame, end = dec.raw_decode(body, j)
        except json.JSONDecodeError:
            i = j + 1
            continue
        i = end
        for row in frame if isinstance(frame, list) else []:
            if isinstance(row, list) and len(row) > 2 and row[0] == "wrb.fr" and isinstance(row[2], str):
                yield json.loads(row[2])


def is_str_list(x):
    return isinstance(x, list) and all(isinstance(s, str) for s in x)


def is_ymd(x):
    return isinstance(x, list) and len(x) == 3 and all(isinstance(n, int) for n in x)


def is_hm(x):
    return isinstance(x, list) and 1 <= len(x) <= 2 and all(isinstance(n, int) or n is None for n in x)


def is_itinerary(a):
    return (isinstance(a, list) and len(a) > 17 and isinstance(a[0], str) and is_str_list(a[1]) and a[1]
            and isinstance(a[2], list) and a[2] and all(isinstance(l, list) and len(l) > 22 for l in a[2])
            and isinstance(a[3], str) and is_ymd(a[4]) and is_hm(a[5]) and isinstance(a[6], str))


def walk(node):
    if isinstance(node, list):
        if is_itinerary(node):
            yield node
            return
        for x in node:
            yield from walk(x)


def hm(t):
    h, m = (t + [0, 0])[:2]
    return f"{h or 0:02d}:{m or 0:02d}"


def flight_no(leg):
    fn = leg[22]
    return f"{fn[0]} {fn[1]}"


def key_of(it):
    y, m, d = it[4]
    return "|".join([f"{y:04d}-{m:02d}-{d:02d}", hm(it[5]), it[3], it[6], *map(flight_no, it[2])])


def identity(it):
    """Leg flight numbers with departure date/time: tells apart trips whose keys are identical."""
    return tuple((flight_no(l), tuple(l[20]), tuple(l[8])) for l in it[2])


def label_of(it):
    names = ", ".join(it[1])
    extras = list(it[16]) if is_str_list(it[16]) else []
    operators = list(dict.fromkeys(l[2] for l in it[2] if isinstance(l[2], str) and l[2]))
    if operators:
        extras.append("ดำเนินการโดย " + ", ".join(operators))
    return f"{names} · {', '.join(extras)}" if extras else names


def main():
    har = json.loads(HAR.read_text(encoding="utf-8"))
    labels = {}
    seen = {}  # base key -> distinct itineraries in order of first appearance
    responses = 0
    for e in har["log"]["entries"]:
        if "GetShoppingResults" not in e["request"]["url"]:
            continue
        responses += 1
        for p in payloads(e["response"]["content"].get("text") or ""):
            for it in walk(p):
                base, ident = key_of(it), identity(it)
                trips = seen.setdefault(base, [])
                if ident not in trips:
                    trips.append(ident)
                n = trips.index(ident) + 1
                k, lab = (base if n == 1 else f"{base}#{n}"), label_of(it)
                if labels.get(k, lab) != lab:
                    raise SystemExit(f"conflicting labels for {k}: {labels[k]!r} vs {lab!r}")
                labels[k] = lab
    out = {
        "meta": {
            "source": str(HAR),
            "responses": responses,
            "rule": "airline names joined by ', ' + ' · ' + partners and 'ดำเนินการโดย <operator>' when present",
            "count": len(labels),
        },
        "labels": dict(sorted(labels.items())),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(labels)} labels from {responses} responses -> {OUT}")


if __name__ == "__main__":
    main()
