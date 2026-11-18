#!/usr/bin/env python3
"""apply_bugs.py <clean_dir> <out_dir> <BUG_ID>... : copy the clean web and apply the patch.json of each bug.
Fails if a `find` string is missing or appears more than once. node_modules becomes a symlink ($NM or the clean one)."""
import json, os, shutil, sys

clean, out, bugs = sys.argv[1], sys.argv[2], sys.argv[3:]
BUGS = os.environ.get("BUGS_DIR") or os.path.join(os.path.dirname(os.path.abspath(clean)), "bugs")
NM = os.environ.get("NM") or os.path.realpath(os.path.join(clean, "node_modules"))
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(clean, out, symlinks=True,
                ignore=shutil.ignore_patterns("node_modules", ".next", ".serve.*", "STRIPPED.md", ".web*"))
os.symlink(NM, os.path.join(out, "node_modules"))
for b in bugs:
    for p in json.load(open(os.path.join(BUGS, b, "patch.json"), encoding="utf-8")):
        f = os.path.join(out, p["file"])
        s = open(f, encoding="utf-8").read()
        n = s.count(p["find"])
        if n != 1:
            sys.exit("ERROR %s: find พบ %d ครั้งใน %s (ต้องพบ 1 ครั้ง)" % (b, n, p["file"]))
        open(f, "w", encoding="utf-8").write(s.replace(p["find"], p["replace"]))
print("applied", " ".join(bugs) or "(none)", "->", out)
