#!/usr/bin/env python3
"""ออก tag เวอร์ชันและเขียน CHANGELOG.md หลัง merge เข้า main (รันโดย .gitea/workflows/release.yml)

เลขเวอร์ชันของคลัง (vX.Y.Z) ตาม plugin ที่ขึ้นเลขมากที่สุดนับจาก tag ล่าสุด:
ขึ้น major → major · ขึ้น minor หรือมี plugin ใหม่ → minor · นอกนั้น → patch · ยังไม่มี tag → v1.0.0

ใช้:  python scripts/release.py [--dry-run]
"""
import argparse, datetime, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRANCH = "main"
CHANGELOG = "CHANGELOG.md"
HEADER = "# CHANGELOG\n\nสร้างอัตโนมัติเมื่อ merge เข้า main โดย `scripts/release.py` ห้ามแก้ไฟล์นี้เอง\n"
RELEASE_MARK = "chore(release):"
TAG = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
MERGE_SUBJECT = re.compile(r"^Merge pull request '(.+)' \(#(\d+)\) from ")
SQUASH_SUBJECT = re.compile(r"^(.+) \(#(\d+)\)$")
ATTEMPTS = 3


def git(*args, check=True):
    done = subprocess.run(["git", *args], cwd=ROOT, check=check, capture_output=True, text=True, encoding="utf-8")
    return done.stdout.strip()


def latest_tag():
    tags = [t for t in git("tag", "--list", "v*").splitlines() if TAG.match(t)]
    return max(tags, key=lambda t: tuple(int(n) for n in TAG.match(t).groups()), default=None)


def plugin_versions(ref):
    """{plugin: version} ณ commit นั้น"""
    versions = {}
    for path in git("ls-tree", "-r", "--name-only", ref, "plugins/").splitlines():
        m = re.match(r"^plugins/([^/]+)/\.claude-plugin/plugin\.json$", path)
        if m:
            versions[m.group(1)] = json.loads(git("show", f"{ref}:{path}")).get("version", "0.0.0")
    return versions


def bump_level(old, new):
    """0 = patch, 1 = minor, 2 = major"""
    level = 0
    for plugin, version in new.items():
        if plugin not in old:
            level = max(level, 1)
            continue
        before, after = [tuple(int(n) for n in v.split(".")) for v in (old[plugin], version)]
        if after[0] > before[0]:
            level = 2
        elif after[:2] > before[:2]:
            level = max(level, 1)
    return level


def next_version(tag, level):
    if tag is None:
        return "v1.0.0"
    major, minor, patch = (int(n) for n in TAG.match(tag).groups())
    if level == 2:
        return f"v{major + 1}.0.0"
    if level == 1:
        return f"v{major}.{minor + 1}.0"
    return f"v{major}.{minor}.{patch + 1}"


def describe_commit(subject, author):
    for pattern in (MERGE_SUBJECT, SQUASH_SUBJECT):
        m = pattern.match(subject)
        if m:
            return f"- {m.group(1)} (#{m.group(2)}) · {author}"
    return f"- {subject} · {author}"


def changes_since(tag):
    """รายการบน main นับจาก tag ล่าสุด ไม่รวม commit ของ release เอง"""
    span = f"{tag}..HEAD" if tag else "HEAD"
    log = git("log", "--first-parent", "--format=%an%x1f%s", span)
    entries = []
    for row in log.splitlines():
        author, subject = row.split("\x1f", 1)
        if not subject.startswith(RELEASE_MARK):
            entries.append(describe_commit(subject, author))
    return entries


def render_entry(version, date, entries, old, new):
    lines = [f"## {version} · {date}", "", *entries, ""]
    changed = [p for p in sorted(new) if old.get(p) != new[p]]
    if changed:
        lines += ["เวอร์ชัน plugin:", ""]
        lines += [f"- `{p}` {old[p]} → {new[p]}" if p in old else f"- `{p}` ใหม่ {new[p]}" for p in changed]
        lines.append("")
    return "\n".join(lines)


def insert_entry(current, entry):
    body = current[len(HEADER):].lstrip("\n") if current.startswith(HEADER) else current
    return f"{HEADER}\n{entry}\n{body}".rstrip("\n") + "\n"


def prepare():
    """คืน (version, entry) หรือ None ถ้าไม่มีอะไรต้องออก"""
    tag = latest_tag()
    entries = changes_since(tag)
    if not entries:
        return None
    old = plugin_versions(tag) if tag else {}
    new = plugin_versions("HEAD")
    version = next_version(tag, bump_level(old, new) if tag else 0)
    date = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    return version, render_entry(version, date, entries, old, new)


def release_once():
    prepared = prepare()
    if prepared is None:
        print("ไม่มีอะไรใหม่ตั้งแต่ tag ล่าสุด")
        return True
    version, entry = prepared
    path = ROOT / CHANGELOG
    current = path.read_text(encoding="utf-8") if path.exists() else ""
    path.write_text(insert_entry(current, entry), encoding="utf-8", newline="\n")
    message = f"{RELEASE_MARK} {version} [skip ci]"
    git("add", CHANGELOG)
    git("-c", "user.name=novatech-ci", "-c", "user.email=ci@novatech.test", "commit", "-q", "-m", message)
    git("-c", "user.name=novatech-ci", "-c", "user.email=ci@novatech.test", "tag", "-a", version, "-m", f"{version}\n\n{entry}")
    # atomic: main กับ tag ต้องขึ้นพร้อมกัน ไม่งั้นรอบหน้าจะออกเวอร์ชันเดิมซ้ำ
    pushed = subprocess.run(
        ["git", "push", "--atomic", "origin", f"HEAD:refs/heads/{BRANCH}", f"refs/tags/{version}"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
    )
    if pushed.returncode == 0:
        print(f"ออก {version} แล้ว\n\n{entry}")
        return True
    print(f"push ไม่สำเร็จ: {pushed.stderr.strip()}", file=sys.stderr)
    git("tag", "-d", version)
    return False


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="พิมพ์ฉบับร่าง ไม่เขียนไฟล์ ไม่ push")
    args = parser.parse_args()
    git("fetch", "--quiet", "--tags", "origin")
    if args.dry_run:
        prepared = prepare()
        print(prepared[1] if prepared else "ไม่มีอะไรใหม่ตั้งแต่ tag ล่าสุด")
        return 0
    for attempt in range(1, ATTEMPTS + 1):
        # ถ้ามีคน merge ระหว่างทาง push จะถูกปฏิเสธ ให้เริ่มใหม่จาก main ล่าสุด
        git("fetch", "--quiet", "--tags", "origin", BRANCH)
        git("reset", "--quiet", "--hard", "FETCH_HEAD")
        if release_once():
            return 0
        print(f"ลองใหม่ ({attempt}/{ATTEMPTS})", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
