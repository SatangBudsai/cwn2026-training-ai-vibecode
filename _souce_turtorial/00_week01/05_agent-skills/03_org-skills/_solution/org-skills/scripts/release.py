#!/usr/bin/env python3
"""ออกเวอร์ชันของคลัง — ทีมกลาง (plat-ken / plat-may) รันจาก main บนเครื่องตัวเอง ด้วย token ของตัวเอง

    git switch main && git pull
    python scripts/release.py --dry-run                              # ดูแผน (ไม่แตะ Gitea)
    python scripts/release.py --token-file <ไฟล์ token Gitea ของคุณ>  # ตรวจย้อนหลัง + ติด tag + สร้าง Release
    (CI) release.yml หลัง merge: python3 scripts/release.py --plan --comment   # ตรวจย้อนหลัง + คอมเมนต์แผนใน PR ไม่ติด tag

ทำไมไม่ออกเวอร์ชันอัตโนมัติใน CI: tag `v*` และ `*/*` ถูก protect ให้เฉพาะทีมกลาง และ Gitea 1.24 ใส่บัญชีของ Actions
ใน allowlist ของ tag protection ไม่ได้ (token ของ job ได้ 422) · ส่วนการใช้บัญชีบอตผ่าน secret ก็ไม่ปลอดภัย
เพราะ Gitea ส่ง repo secret ให้ workflow pull_request จาก branch ในคลังเดียวกัน (ใครเปิด PR ก็อ่าน secret ได้)

ทำอะไร
  1. ตรวจย้อนหลัง (scripts/merge_gate.py) ทุก PR ที่ merge ตั้งแต่ tag คลังล่าสุด — ด่าน CI เป็น task จริง,
     CODEOWNER approve, skill-eval มาจากผู้รีวิวตัวจริง · ไม่ผ่าน = ไม่ออกเวอร์ชัน
     เลข PR หาจาก Gitea (`GET /repos/{repo}/commits/{sha}/pull` ของทุก commit บนเส้น main) ไม่ใช่ "(#N)" ใน subject
     และทุก commit ในรอบต้องเป็น merge_commit_sha ของ PR ที่ merge เข้า main — ไม่ใช่ (push ตรง / rebase / ff) = ไม่ออกเวอร์ชัน
     (คลังเปิดแค่ merge commit + squash)
  2. tag ต่อ skill `<skill>/v<version>` ให้ทุก skill ที่ version ยังไม่เคยมี tag (= skill ที่เพิ่ม version)
  3. tag ของคลัง `vX.Y.Z` — major/minor/patch ตามการเปลี่ยนที่ใหญ่สุดของ skill (skill ใหม่ = minor · แก้นอก plugins/ อย่างเดียว = patch)
  4. Gitea Release ของ tag คลัง (PR ที่รวม, ผู้เปิด, ผู้ merge, skill เก่า → ใหม่) = CHANGELOG ของคลัง (หน้า Releases)
ครั้งแรก (ยังไม่มี tag เลย) = ติด tag เวอร์ชันปัจจุบันของทุก skill เป็นจุดตั้งต้น และตรวจย้อนหลังเฉพาะ PR ล่าสุด
stdlib ล้วน
"""
import argparse, datetime as dt, json, os, re, subprocess, sys, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import parse_skill  # noqa: E402
import merge_gate  # noqa: E402

VT = lambda v: tuple(int(x) for x in v.split("."))
REPO_TAG = re.compile(r"v\d+\.\d+\.\d+")


def git(*a, check=False):
    r = subprocess.run(["git", "-C", str(ROOT), *a], capture_output=True, text=True, encoding="utf-8")
    if check and r.returncode:
        sys.exit(f"git {' '.join(a)}: {r.stderr.strip()}")
    return r.stdout.strip()


def post(g, path, body):
    req = urllib.request.Request(g.api + path, method="POST", data=json.dumps(body).encode())
    req.add_header("Authorization", f"token {g.token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:300]
        hint = " — tag นี้ถูก protect: ต้องเป็นทีมกลาง (plat-ken / plat-may)" if e.code == 422 and "/tags" in path else ""
        sys.exit(f"Gitea POST {path} → HTTP {e.code}: {msg}{hint}")


def skills_now():
    out = {}
    for md in sorted(ROOT.glob("plugins/*/skills/*/SKILL.md")):
        fm, _ = parse_skill(md)
        if fm and re.fullmatch(r"\d+\.\d+\.\d+", fm.get("metadata", {}).get("version", "")):
            out[md.parent.name] = {"plugin": md.parent.parent.parent.name, "version": fm["metadata"]["version"],
                                   "owner": fm["metadata"].get("owner", "")}
    return out


def plan(sha):
    tags = set(git("tag", "--list").split())
    skills = skills_now()
    repo_tags = sorted((t for t in tags if REPO_TAG.fullmatch(t)), key=lambda t: VT(t[1:]), reverse=True)
    first = not repo_tags
    changes = []
    for name, s in skills.items():
        tag = f"{name}/v{s['version']}"
        if tag in tags:
            continue
        prev = sorted((VT(t.split("/v")[1]) for t in tags if t.startswith(f"{name}/v")), reverse=True)
        old = ".".join(map(str, prev[0])) if prev else None
        if old and VT(s["version"]) < VT(old):
            print(f"⚠️  {name}: version {s['version']} ต่ำกว่า tag เดิม {old} — ข้าม")
            continue
        kind = "new" if not old else ("major" if VT(s["version"])[0] > VT(old)[0] else
                                       "minor" if VT(s["version"])[1] > VT(old)[1] else "patch")
        changes.append({"skill": name, **s, "old": old, "tag": tag, "kind": kind})
    removed = sorted({t.split("/v")[0] for t in tags if "/v" in t} - set(skills))
    removed = [r for r in removed if f"{r}/removed" not in tags]
    cur = VT(repo_tags[0][1:]) if repo_tags else None
    if first:
        new = (1, 0, 0)
    else:
        kinds = {c["kind"] for c in changes} | ({"major"} if removed else set())
        level = "major" if "major" in kinds else "minor" if kinds & {"minor", "new"} else "patch"
        new = (cur[0] + 1, 0, 0) if level == "major" else (cur[0], cur[1] + 1, 0) if level == "minor" else (cur[0], cur[1], cur[2] + 1)
    # PR ที่ merge ตั้งแต่ tag คลังล่าสุด (ครั้งแรก = เฉพาะ PR ล่าสุด เพราะ PR ก่อนหน้ายังไม่มีด่านให้ตรวจ)
    rng = f"{repo_tags[0]}..{sha}" if repo_tags else f"{sha}~1..{sha}"
    # ทุก commit บนเส้น main (first-parent) — เลข PR หาจาก Gitea ใน prs_in_range() ไม่เชื่อ "(#N)" ใน subject
    # (subject ของ rebase / fast-forward มาจากผู้เปิด PR และผู้ merge แก้ข้อความ merge commit ได้)
    commits = [l.split(" ", 1) for l in git("log", "--first-parent", "--format=%H %s", rng).splitlines()]
    return {"first": first, "changes": changes, "removed": removed, "repo_tag": "v" + ".".join(map(str, new)),
            "prev_repo_tag": repo_tags[0] if repo_tags else None, "commits": commits, "sha": sha}


def prs_in_range(g, repo, commits):
    """commit บน main → PR ที่ Gitea บันทึกว่า merge ออกมาเป็น commit นี้ (merge_commit_sha)
    → (เลข PR เรียงเก่า→ใหม่, commit ที่ไม่ได้มาจาก PR ไหนเลย)
    commit ที่ไม่ใช่ merge_commit_sha ของ PR = push ตรง หรือ commit ย่อยของ rebase / fast-forward → ห้ามออกเวอร์ชัน"""
    numbers, orphans = [], []
    for sha, subject in reversed(commits):
        pr = g.req(f"/repos/{repo}/commits/{sha}/pull", ok404=True)
        if pr and pr.get("merged") and pr.get("merge_commit_sha") == sha and pr["base"]["ref"] == "main":
            if pr["number"] not in numbers:
                numbers.append(pr["number"])
        else:
            orphans.append((sha, subject))
    return numbers, orphans


def section(p, prs, date):
    L = [f"## {p['repo_tag']} — {date}", ""]
    for pr in prs:
        L.append(f"- PR #{pr['number']}: {pr['title']} — เปิดโดย @{pr['user']['login']}"
                 + (f" · merge โดย @{pr['merged_by']['login']}" if pr.get("merged_by") else ""))
    L.append(f"- commit `{p['sha'][:10]}`" + (f" · เทียบ {p['prev_repo_tag']}" if p["prev_repo_tag"] else ""))
    if p["first"]:
        L.append("- จุดตั้งต้น: ติด tag เวอร์ชันปัจจุบันของทุก skill")
    L.append("")
    if p["changes"]:
        L += ["| skill | plugin | เวอร์ชัน | ประเภท | tag |", "|---|---|---|---|---|"]
        label = {"new": "skill ใหม่", "major": "major", "minor": "minor", "patch": "patch"}
        for c in sorted(p["changes"], key=lambda c: (c["plugin"], c["skill"])):
            ver = f"{c['old']} → {c['version']}" if c["old"] else c["version"]
            L.append(f"| `{c['skill']}` | {c['plugin']} | {ver} | {label[c['kind']]} | `{c['tag']}` |")
    for r in p["removed"]:
        L.append(f"- ลบ skill `{r}`")
    if not p["changes"] and not p["removed"]:
        L.append("- ไม่มี skill เปลี่ยนเวอร์ชัน (แก้ไฟล์กลางของคลัง / CI)")
    return "\n".join(L) + "\n"


def audit(g, repo, commits):
    """merge_gate ย้อนหลังกับทุก PR ในรอบนี้ + ทุก commit บน main ต้องมาจาก PR → (ข้อความ, ผ่านไหม, PR)"""
    numbers, orphans = prs_in_range(g, repo, commits)
    out, ok, prs = [], not orphans, []
    for sha, subject in orphans:
        out.append(f"❌ commit `{sha[:10]}` {subject[:80]} — ไม่ได้มาจาก PR ไหน (push ตรง / rebase / fast-forward) ไม่มีด่านให้ตรวจ")
    for n in numbers:
        pr = g.req(f"/repos/{repo}/pulls/{n}")
        prs.append(pr)
        if not pr.get("merged"):
            continue
        base = g.req(f"/repos/{repo}/git/commits/{pr['merge_commit_sha']}")["parents"][0]["sha"]
        errors, notes = merge_gate.check(g, repo, pr, base)
        ok &= not errors
        out.append(f"#{n} {'✅' if not errors else '❌'} {pr['title']}")
        out += [f"    - {e}" for e in errors] + [f"    {x}" for x in notes if x.startswith("⚠️")]
    return out, ok, prs


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="ดูแผนอย่างเดียว ไม่เรียก Gitea")
    ap.add_argument("--plan", action="store_true", help="ตรวจย้อนหลัง + แสดงแผน ไม่ติด tag (ใช้ใน CI)")
    ap.add_argument("--comment", action="store_true", help="กับ --plan: คอมเมนต์ผลใน PR ล่าสุด")
    ap.add_argument("--repo", default=os.environ.get("REPO", "novatech/org-skills"))
    ap.add_argument("--api", default=os.environ.get("GITEA_API", "http://localhost:3300/api/v1"))
    ap.add_argument("--token-file", help="ไฟล์ token Gitea ของคุณ (แนะนำ) — หรือ env GITEA_TOKEN")
    args = ap.parse_args()

    if args.plan or args.dry_run:
        sha = os.environ.get("SHA") or git("rev-parse", "HEAD")
    else:  # ออกจริง: ต้องเป็นปลาย main ล่าสุด tree สะอาด (= release.py / merge_gate.py ที่รันอยู่คือของ main)
        git("fetch", "-q", "--tags", "origin", "+refs/heads/main:refs/remotes/origin/main", check=True)
        sha = git("rev-parse", "HEAD")
        if sha != git("rev-parse", "origin/main") or git("status", "--porcelain", "--untracked-files=no"):
            sys.exit("ต้องรันจากปลาย origin/main ที่ไม่มีไฟล์แก้ค้าง: git switch main && git pull")
    p = plan(sha)
    date = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%d")
    if args.dry_run:
        print(section(p, [], date))
        print(f"[dry-run] commit บน main ในรอบนี้: {len(p['commits'])} (หา PR จาก Gitea ตอนรันจริง) · จะสร้าง tag: {p['repo_tag']} + {', '.join(c['tag'] for c in p['changes']) or '—'}")
        return

    token = Path(args.token_file).read_text().strip() if args.token_file else os.environ.get("GITEA_TOKEN", "")
    if not token:
        sys.exit("ต้องมี token Gitea: --token-file หรือ env GITEA_TOKEN")
    g = merge_gate.Gitea(args.api, token)
    lines, ok, prs = audit(g, args.repo, p["commits"])
    sec = section(p, prs, date)
    tags = [p["repo_tag"]] + [c["tag"] for c in p["changes"]] + [f"{r}/removed" for r in p["removed"]]
    print("ตรวจย้อนหลัง (merge_gate):\n  " + ("\n  ".join(lines) or "— ไม่มี PR ในรอบนี้") + "\n\n" + sec)

    if args.plan:
        if args.comment and prs:
            body = "\n".join([f"## release: {'รอทีมกลางออกเวอร์ชัน' if ok else '❌ ตรวจย้อนหลังไม่ผ่าน — ห้ามออกเวอร์ชัน'}", "",
                              "ตรวจย้อนหลังด้วย `scripts/merge_gate.py`:", "", *[f"- {x.strip()}" for x in lines], "",
                              f"แผน: tag {', '.join(f'`{t}`' for t in tags)}" if ok else
                              "PR ด้านบนถูก merge ทั้งที่ผลบางด่านไม่ใช่ของจริงหรือไม่มี approve จาก CODEOWNER — ทีมกลางต้องตรวจก่อน",
                              "", "ทีมกลาง (plat-ken / plat-may) ออกเวอร์ชันจาก main: `python scripts/release.py --token-file <ไฟล์ token>`"
                              " — CI ติด tag เองไม่ได้ เพราะ tag ถูก protect และ Gitea 1.24 ใส่ Actions ใน allowlist ไม่ได้"])
            post(g, f"/repos/{args.repo}/issues/{prs[-1]['number']}/comments", {"body": body})
        sys.exit(0 if ok else 1)

    if not ok:
        sys.exit("❌ ตรวจย้อนหลังไม่ผ่าน — ไม่ออกเวอร์ชัน (ดูรายการด้านบน)")
    if any(REPO_TAG.fullmatch(t) for t in git("tag", "--points-at", sha).split()):
        sys.exit(f"{sha[:10]} ออกเวอร์ชันไปแล้ว")
    for c in p["changes"]:
        post(g, f"/repos/{args.repo}/tags", {"tag_name": c["tag"], "target": sha,
                                             "message": f"{c['skill']} {c['version']} ({c['plugin']}, owner {c['owner']})"})
        print(f"🏷  {c['tag']}")
    for r in p["removed"]:
        post(g, f"/repos/{args.repo}/tags", {"tag_name": f"{r}/removed", "target": sha, "message": f"ลบ skill {r}"})
    post(g, f"/repos/{args.repo}/tags", {"tag_name": p["repo_tag"], "target": sha, "message": f"novatech-skills {p['repo_tag']}"})
    print(f"🏷  {p['repo_tag']}")
    post(g, f"/repos/{args.repo}/releases", {"tag_name": p["repo_tag"], "name": f"novatech-skills {p['repo_tag']}", "body": sec})
    print(f"🚀 release {p['repo_tag']} — {args.api.replace('/api/v1', '')}/{args.repo}/releases")
    git("fetch", "-q", "--tags", "origin")


if __name__ == "__main__":
    main()
