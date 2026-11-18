#!/usr/bin/env python3
"""ด่าน 2: หัวไฟล์ SKILL.md ครบและอ้างอิงถูกต้อง

ใช้กฎจาก build-catalog.py (มีครบทุกช่อง, layer ตรงชั้น, uses/next/follows ชี้ skill ที่มีจริง)
แล้วตรวจเพิ่มสิ่งที่ build-catalog ยอมให้ผ่าน: owner หรือ version ว่าง, version ผิดรูปแบบ,
skill ที่อยู่นอก marketplace และ plugin ที่แก้แล้วไม่ขึ้นเลข version

ใช้:  python scripts/check-frontmatter.py [--base origin/main]
      ไม่ใส่ --base จะข้ามการตรวจเลข version ของ plugin ที่แก้
"""
import argparse, importlib.util, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
OWNER = re.compile(r"^[a-z0-9][a-z0-9-]*$")
# สร้างจากหัวไฟล์ของทุกแผนก การที่ไฟล์นี้เปลี่ยนจึงไม่ได้แปลว่า core เปลี่ยน
GENERATED = {"plugins/core/skills/skill-finder/references/catalog.md"}


def load_build_catalog():
    spec = importlib.util.spec_from_file_location("build_catalog", ROOT / "scripts/build-catalog.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def version_tuple(version):
    return tuple(int(part) for part in version.split("."))


def check_skills(skills):
    errors = []
    for skill in skills:
        if not OWNER.match(skill["owner"]):
            errors.append(f"{skill['name']}: owner ต้องเป็นชื่อ user แต่พบ '{skill['owner']}'")
        if not SEMVER.match(skill["version"]):
            errors.append(f"{skill['name']}: version ต้องเป็น X.Y.Z แต่พบ '{skill['version']}'")
    return errors


def check_outside_marketplace(plugins):
    known = {p["name"] for p in plugins}
    return [
        f"{path.relative_to(ROOT).as_posix()}: อยู่ใน plugin ที่ไม่มีใน marketplace.json"
        for path in sorted(ROOT.glob("plugins/*/skills/*/SKILL.md"))
        if path.parts[len(ROOT.parts) + 1] not in known
    ]


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8").stdout


def changed_plugins(merge_base):
    names = git("diff", "--name-only", "--no-renames", merge_base, "HEAD", "--", "plugins/").splitlines()
    return sorted({n.split("/")[1] for n in names if n not in GENERATED})


def check_version_bumps(base):
    merge_base = git("merge-base", base, "HEAD").strip()
    errors = []
    for plugin in changed_plugins(merge_base):
        manifest = f"plugins/{plugin}/.claude-plugin/plugin.json"
        path = ROOT / manifest
        if not path.exists():
            continue  # ลบ plugin ทั้งตัว
        new = json.loads(path.read_text(encoding="utf-8")).get("version", "")
        if not SEMVER.match(new):
            errors.append(f"{manifest}: version ต้องเป็น X.Y.Z แต่พบ '{new}'")
            continue
        try:
            old = json.loads(git("show", f"{merge_base}:{manifest}")).get("version", "0.0.0")
        except subprocess.CalledProcessError:
            continue  # plugin ใหม่
        if version_tuple(new) <= version_tuple(old):
            errors.append(f"{plugin}: แก้ plugin แล้วต้องขึ้น version ใน plugin.json (ตอนนี้ {old} → {new})")
    return errors


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="branch ปลายทางสำหรับตรวจการขึ้น version เช่น origin/main")
    args = parser.parse_args()

    plugins, skills, errors = load_build_catalog().load()
    errors += check_skills(skills) + check_outside_marketplace(plugins)
    if args.base:
        errors += check_version_bumps(args.base)
    if errors:
        print("หัวไฟล์ไม่ผ่าน:", *errors, sep="\n- ", file=sys.stderr)
        return 1
    print(f"ผ่าน: หัวไฟล์ครบ {len(skills)} skill ใน {len(plugins)} plugin")
    return 0


if __name__ == "__main__":
    sys.exit(main())
