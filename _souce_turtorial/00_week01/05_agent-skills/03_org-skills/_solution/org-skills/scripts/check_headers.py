#!/usr/bin/env python3
"""ด่าน 2 ของ CI — หัวไฟล์ SKILL.md ครบและอ้างถึงของที่มีจริง

    python scripts/check_headers.py                       # ตรวจทั้งคลัง
    python scripts/check_headers.py --base origin/main    # + skill ที่แก้เทียบ base ต้องเพิ่ม version
    GITEA_API=http://gitea:3000/api/v1 GITEA_TOKEN=... python scripts/check_headers.py   # + owner ต้องเป็น user ที่มีจริงใน Gitea

ตรวจ:
  - metadata มี owner, layer, version ครบและไม่ว่าง (owner = user Gitea, layer ตรง plugin, version = x.y.z)
  - uses / next / follows ทุกชื่อต้องเป็น skill ที่มีจริงในคลัง (follows → เฉพาะ core, ห้ามอ้างตัวเอง)
  - owner ต้องมีบัญชีจริงใน Gitea (ถ้าให้ GITEA_API มา)
  - skill ที่ไฟล์ใดไฟล์หนึ่งถูกแก้เทียบ --base ต้องเพิ่ม version (ห้ามเท่าเดิมหรือลดลง)
stdlib ล้วน — exit 1 ถ้าไม่ผ่าน
"""
import json, os, re, subprocess, sys, urllib.request, urllib.error
from pathlib import Path

# ORG_SKILLS_ROOT = tree ที่จะตรวจ (CI ใช้สคริปต์จาก main ตรวจ tree ของ PR) · ไม่ตั้ง = คลังที่สคริปต์นี้อยู่
ROOT = Path(os.environ.get("ORG_SKILLS_ROOT") or Path(__file__).resolve().parent.parent).resolve()
sys.path.insert(0, str(Path(__file__).resolve().parent))  # build.py ชุดเดียวกับสคริปต์นี้ (ไม่ใช่ของ tree ที่ตรวจ)
from build import parse_skill, CFG  # noqa: E402  (ใช้ parser เดียวกับ build.py)

REQUIRED = ("owner", "layer", "version")
REFS = ("uses", "next", "follows")


def vtuple(v):
    return tuple(int(x) for x in v.split(".")) if re.fullmatch(r"\d+\.\d+\.\d+", v or "") else None


def load_skills():
    layers = {p["name"]: p["layer"] for p in CFG["plugins"]}
    skills, errors = {}, []
    for md in sorted(ROOT.glob("plugins/*/skills/*/SKILL.md")):
        rel = md.parent.relative_to(ROOT).as_posix()
        plugin = md.parent.parent.parent.name
        fm, errs = parse_skill(md)
        errors += [f"{rel}: {e}" for e in errs]
        if not fm:
            continue
        meta = fm.get("metadata", {})
        for k in REQUIRED:
            if not str(meta.get(k, "")).strip():
                errors.append(f"{rel}: ไม่มี metadata.{k}")
        if meta.get("owner") and not re.fullmatch(r"[a-z]+-[a-z]+", meta["owner"]):
            errors.append(f"{rel}: owner '{meta['owner']}' ต้องเป็น user Gitea เช่น plat-may")
        if meta.get("layer") and meta["layer"] != layers.get(plugin):
            errors.append(f"{rel}: layer '{meta['layer']}' ต้องเป็น '{layers.get(plugin)}' ตาม plugin {plugin}")
        if meta.get("version") and not vtuple(meta["version"]):
            errors.append(f"{rel}: version '{meta['version']}' ต้องเป็น x.y.z")
        for k in REFS:
            if not isinstance(meta.get(k), list):
                errors.append(f"{rel}: {k} ต้องเป็นรายการ [..] (ว่างได้ [])")
                meta[k] = []
        skills[md.parent.name] = {"rel": rel, "plugin": plugin, **meta}
    return skills, errors


def check_refs(skills):
    errors = []
    for name, s in skills.items():
        for k in REFS:
            for ref in s[k]:
                if ref == name:
                    errors.append(f"{s['rel']}: {k} อ้างตัวเอง")
                elif ref not in skills:
                    errors.append(f"{s['rel']}: {k} อ้าง '{ref}' ที่ไม่มีในคลัง")
                elif k == "follows" and skills[ref]["plugin"] != "core":
                    errors.append(f"{s['rel']}: follows ใช้ได้เฉพาะ skill ใน core ('{ref}' อยู่ plugin {skills[ref]['plugin']})")
    return errors


def check_owners(skills):
    api, token = os.environ.get("GITEA_API"), os.environ.get("GITEA_TOKEN")
    if not api:
        print("ℹ️  ไม่ได้ตั้ง GITEA_API — ข้ามการเช็กว่า owner มีบัญชีจริง")
        return []
    errors, seen = [], {}
    for s in skills.values():
        o = s.get("owner")
        if not o or o in seen:
            continue
        req = urllib.request.Request(f"{api.rstrip('/')}/users/{o}")
        if token:
            req.add_header("Authorization", f"token {token}")
        try:
            urllib.request.urlopen(req, timeout=10).read()
            seen[o] = True
        except urllib.error.HTTPError as e:
            seen[o] = e.code != 404
            if e.code != 404:
                print(f"⚠️  เช็ก owner {o} ไม่ได้ (HTTP {e.code}) — ข้าม")
        except OSError as e:
            print(f"⚠️  ต่อ Gitea ไม่ได้ ({e}) — ข้ามการเช็ก owner")
            return []
    for s in skills.values():
        if s.get("owner") and seen.get(s["owner"]) is False:
            errors.append(f"{s['rel']}: owner '{s['owner']}' ไม่มีบัญชีใน Gitea")
    return errors


def git(*args):
    return subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, encoding="utf-8")


def check_version_bump(skills, base):
    r = git("diff", "--name-only", f"{base}...HEAD")
    if r.returncode:
        return [f"--base {base}: git diff ไม่ได้ ({r.stderr.strip()})"]
    changed = {"/".join(p.split("/")[:4]) for p in r.stdout.split() if re.match(r"plugins/[^/]+/skills/[^/]+/", p)}
    errors = []
    for name, s in skills.items():
        if s["rel"] not in changed:
            continue
        old = git("show", f"{base}:{s['rel']}/SKILL.md")
        if old.returncode:
            print(f"🆕 {s['rel']}: skill ใหม่ version {s.get('version')}")
            continue
        m = re.search(r"^  version:\s*(\S+)", old.stdout, re.M)
        ov, nv = vtuple(m.group(1) if m else ""), vtuple(s.get("version", ""))
        if ov and nv and nv <= ov:
            errors.append(f"{s['rel']}: แก้ไฟล์ใน skill แต่ version ยัง {s.get('version')} (base {m.group(1)}) — ต้องเพิ่ม version")
        elif ov and nv:
            print(f"⬆️  {s['rel']}: {m.group(1)} → {s['version']}")
    return errors


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    base = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else None
    skills, errors = load_skills()
    errors += check_refs(skills)
    errors += check_owners(skills)
    if base:
        errors += check_version_bump(skills, base)
    n_refs = sum(len(s[k]) for s in skills.values() for k in REFS)
    print(f"{len(skills)} skill · ตรวจ owner/layer/version + {n_refs} การอ้างถึง (uses/next/follows)")
    if errors:
        print("❌ หัวไฟล์ไม่ผ่าน:")
        print("\n".join("  - " + e for e in errors))
        sys.exit(1)
    print("✅ หัวไฟล์ครบและอ้างถึง skill ที่มีจริงทั้งหมด")


if __name__ == "__main__":
    main()
