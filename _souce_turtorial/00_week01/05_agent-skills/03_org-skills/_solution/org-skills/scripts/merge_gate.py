#!/usr/bin/env python3
"""ด่านก่อน merge — ตรวจว่าผลของทุกด่านใน PR เป็นของจริง ไม่ดูแค่ commit status

ทำไมต้องมี: ใน Gitea 1.24 ใครมีสิทธิ์ write (รวมถึง token ของ Actions ใน job ของ PR) ก็ POST commit status
ชื่อไหนก็ได้ และ branch protection ผูก required status กับ "ผู้ที่โพสต์" ไม่ได้ จึงเชื่อแค่ status ไม่ได้

    python scripts/merge_gate.py 12 --token-file <ไฟล์ token Gitea ของคุณ>   # ผู้ merge รันจาก main ก่อนกด merge
    (CI)      ci / 4-review รันไฟล์นี้จาก main ด้วย --ci (token ของ job)
    (release) release.yml / release.py ใช้ audit ย้อนหลังกับ PR ที่ merge แล้ว ก่อนออก tag

ตรวจ 3 อย่าง (ไม่ผ่านข้อใด = exit 1)
  1. ด่าน 1–3 (+ 4-review ถ้าไม่ใช่ --ci): ต้องมี task ของ Actions จริงจาก workflow ci.yml, event pull_request_target
     (= workflow จาก main แก้ใน PR ไม่ได้), ของ PR นี้ (#N), sha = head, สถานะ success
     และต้องรันหลังการเปลี่ยน base branch ครั้งล่าสุด (กันการเปิด PR ไปที่ branch ที่แก้ ci.yml แล้วค่อยเปลี่ยน base)
  2. CODEOWNER: ทุกไฟล์ที่ PR แก้ต้องได้ approve บน head (ไม่ stale ไม่ dismiss) จาก CODEOWNER ของ path นั้น
     ที่ไม่ใช่ผู้เปิด PR · CODEOWNERS อ่านจาก base · path ที่ CODEOWNER มีแค่ผู้เปิด PR → ทีมกลาง approve แทน
  3. skill-eval: status ล่าสุดเป็น success และโพสต์โดยบัญชีคน (ไม่ใช่ Actions) ที่ไม่ใช่ผู้เปิด PR
     และเป็น CODEOWNER ของ path ที่แก้ หรืออยู่ในทีมกลาง (`platform_team` ใน scripts/plugins.json ของ base)
PR ตั้งต้น (base ยังไม่มี .gitea/workflows/ci.yml): ข้อ 1 ยอมรับ event pull_request แทน พร้อมคำเตือน
stdlib ล้วน
"""
import argparse, datetime as dt, json, os, re, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path

CI_WORKFLOW = "ci.yml"
CI_JOBS = ("1-structure", "2-headers", "3-security")
REVIEW_JOB = "4-review"
EVAL_CONTEXT = "skill-eval"


class Gitea:
    def __init__(self, api, token):
        self.api, self.token = api.rstrip("/"), token

    def req(self, path, raw=False, ok404=False):
        r = urllib.request.Request(self.api + path)
        r.add_header("Authorization", f"token {self.token}")
        try:
            with urllib.request.urlopen(r, timeout=30) as resp:
                body = resp.read()
                return body.decode("utf-8") if raw else (json.loads(body) if body else None)
        except urllib.error.HTTPError as e:
            if ok404 and e.code == 404:
                return None
            sys.exit(f"Gitea GET {path} → HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")

    def pages(self, path, key=None, limit=50):
        out, page = [], 1
        while True:
            sep = "&" if "?" in path else "?"
            batch = self.req(f"{path}{sep}limit={limit}&page={page}") or []
            items = batch.get(key, []) if key else batch
            out += items
            if len(items) < limit:
                return out
            page += 1


def ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def codeowner_rules(text):
    """Gitea CODEOWNERS: <regexp ของ path> @user ... · ทุกบรรทัดที่ตรงถูกนับรวม"""
    rules = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        pat, *users = line.split()
        rules.append((re.compile(f"^(?:{pat})$"), [u.lstrip("@") for u in users if u.startswith("@")]))
    return rules


def ci_tasks(g, repo, pr, base_ref, jobs=None):
    """ด่าน CI ต้องมี task ของ Actions จริง — คืน (errors, notes)"""
    errors, notes = [], []
    n, sha, q = pr["number"], pr["head"]["sha"], urllib.parse.quote
    bootstrap = g.req(f"/repos/{repo}/raw/{q('.gitea/workflows/' + CI_WORKFLOW)}?ref={q(base_ref)}", raw=True, ok404=True) is None
    event = "pull_request" if bootstrap else "pull_request_target"
    if bootstrap:
        notes.append(f"⚠️  base ({base_ref}) ยังไม่มี {CI_WORKFLOW} = PR ตั้งต้น: ด่าน CI รันจาก workflow ของ PR เอง (event pull_request) — ผู้รีวิวต้องอ่าน workflow/สคริปต์ด้วยตัวเอง")
    retarget = [ts(e["created_at"]) for e in g.pages(f"/repos/{repo}/issues/{n}/timeline") if e.get("type") == "change_target_branch"]
    since = max(retarget) if retarget else None
    tasks = [t for t in g.pages(f"/repos/{repo}/actions/tasks", key="workflow_runs")
             if t["head_sha"] == sha and t["workflow_id"] == CI_WORKFLOW and t["event"] == event and t["head_branch"] == f"#{n}"]
    jobs = jobs or (CI_JOBS if bootstrap else CI_JOBS + (REVIEW_JOB,))
    for job in jobs:
        cand = sorted((t for t in tasks if t["name"] == job), key=lambda t: t["id"], reverse=True)
        if since:
            cand = [t for t in cand if ts(t["created_at"]) > since]
        if not cand:
            errors.append(f"ด่าน `{job}`: ไม่มี task ของ Actions ({CI_WORKFLOW}, {event}, #{n}, {sha[:10]})"
                          + (" หลังเปลี่ยน base branch — push commit ใหม่ให้ CI รันจาก main" if since else ""))
        elif cand[0]["status"] != "success":
            errors.append(f"ด่าน `{job}`: task ล่าสุด {cand[0]['status']} — {cand[0]['url']}")
        else:
            notes.append(f"✔ ด่าน {job}: task #{cand[0]['id']} ({event}) success")
    return errors, notes


def check(g, repo, pr, base_ref, *, ci_mode=False, plat=None):
    """คืน (errors, notes) — errors ว่าง = ผ่าน"""
    n, sha, author = pr["number"], pr["head"]["sha"], pr["user"]["login"]
    q = urllib.parse.quote
    errors, notes = ci_tasks(g, repo, pr, base_ref, CI_JOBS if ci_mode else None)

    # ---------- 2. CODEOWNER ของทุก path ที่แก้ต้อง approve ----------
    rules = codeowner_rules(g.req(f"/repos/{repo}/raw/{q('.gitea/CODEOWNERS')}?ref={q(base_ref)}", raw=True, ok404=True) or "")
    if plat is None:
        cfg = g.req(f"/repos/{repo}/raw/{q('scripts/plugins.json')}?ref={q(base_ref)}", raw=True, ok404=True)
        plat = json.loads(cfg).get("platform_team") if cfg else None
        plat = plat or ["plat-ken", "plat-may"]  # PR ตั้งต้น: base ยังไม่มี platform_team
    latest = {}
    for rv in sorted(g.pages(f"/repos/{repo}/pulls/{n}/reviews"), key=lambda r: r["id"]):
        if rv.get("user") and rv["state"] in ("APPROVED", "REQUEST_CHANGES"):
            latest[rv["user"]["login"]] = rv
    approvers = {u for u, rv in latest.items() if rv["state"] == "APPROVED" and not rv.get("stale")
                 and not rv.get("dismissed") and rv.get("commit_id") == sha and u != author}
    files = [f["filename"] for f in g.pages(f"/repos/{repo}/pulls/{n}/files")]
    need = {}  # กลุ่มเจ้าของ → path
    path_owners = set()
    for f in files:
        owners = {u for rx, us in rules if rx.match(f) for u in us}
        path_owners |= owners
        group = frozenset(owners - {author}) or frozenset(set(plat) - {author})
        need.setdefault(group, []).append(f)
    for group, fs in sorted(need.items(), key=lambda kv: sorted(kv[0])):
        ok = group & approvers
        label = f"{len(fs)} ไฟล์ เช่น `{fs[0]}`"
        if ok:
            notes.append(f"✔ CODEOWNER: {label} — approve โดย {', '.join(sorted(ok))}")
        else:
            errors.append(f"CODEOWNER: {label} ต้องได้ approve บน {sha[:10]} จาก {' / '.join(sorted(group))}")

    # ---------- 3. skill-eval ต้องมาจากผู้รีวิวตัวจริง ----------
    allowed = (path_owners | set(plat)) - {author}
    sts = [s for s in g.pages(f"/repos/{repo}/commits/{sha}/statuses") if s["context"] == EVAL_CONTEXT]
    st = max(sts, key=lambda s: s["id"]) if sts else None
    who = (st.get("creator") or {}).get("login") if st else None
    if not st:
        errors.append(f"`{EVAL_CONTEXT}`: ยังไม่มีผล — ผู้รีวิวรัน scripts/skill_eval.py {n} จาก main")
    elif st["status"] != "success":
        errors.append(f"`{EVAL_CONTEXT}`: {st['status']} — {st.get('description', '')[:120]}")
    elif not who:
        errors.append(f"`{EVAL_CONTEXT}`: status ถูกโพสต์ด้วย token ของ Actions ไม่ใช่ผู้รีวิว — ไม่นับ")
    elif who not in allowed:
        errors.append(f"`{EVAL_CONTEXT}`: โพสต์โดย {who} ซึ่ง{'เป็นผู้เปิด PR' if who == author else 'ไม่ใช่ CODEOWNER ของ path ที่แก้หรือทีมกลาง'} — ไม่นับ")
    else:
        notes.append(f"✔ {EVAL_CONTEXT}: success โดย {who}")
    return errors, notes


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pr", type=int)
    ap.add_argument("--repo", default=os.environ.get("REPO", "novatech/org-skills"))
    ap.add_argument("--api", default=os.environ.get("GITEA_API", "http://localhost:3300/api/v1"))
    ap.add_argument("--token-file", help="ไฟล์ token Gitea (แนะนำ) — หรือตั้ง env GITEA_TOKEN")
    ap.add_argument("--ci", action="store_true", help="โหมด job ci / 4-review: ไม่ตรวจ task ของตัวเอง")
    args = ap.parse_args()
    token = Path(args.token_file).read_text().strip() if args.token_file else os.environ.get("GITEA_TOKEN", "")
    if not token:
        sys.exit("ต้องมี token Gitea: --token-file หรือ env GITEA_TOKEN")
    g = Gitea(args.api, token)
    pr = g.req(f"/repos/{args.repo}/pulls/{args.pr}")
    if pr.get("merged"):  # audit ย้อนหลัง: base = main ก่อน merge (parent แรกของ merge commit)
        base_ref = g.req(f"/repos/{args.repo}/git/commits/{pr['merge_commit_sha']}")["parents"][0]["sha"]
    else:
        base_ref = pr["base"]["ref"]
        if pr["state"] != "open":
            sys.exit(f"PR #{args.pr} ปิดไปแล้วโดยไม่ได้ merge")
    print(f"PR #{args.pr} {pr['title']}\n  head {pr['head']['sha'][:10]} · base {pr['base']['ref']} ({base_ref[:10]}) · ผู้เปิด {pr['user']['login']}")
    errors, notes = check(g, args.repo, pr, base_ref, ci_mode=args.ci)
    print("\n".join("  " + x for x in notes))
    if errors:
        print("\n❌ ยัง merge ไม่ได้:\n" + "\n".join(f"  - {e}" for e in errors))
        if args.ci:
            print("\nได้ approve / skill-eval ครบแล้ว → กด Re-run ที่ job ci / 4-review (Gitea 1.24 ไม่รันใหม่ให้เองเมื่อมีรีวิว)")
        sys.exit(1)
    print("\n✅ ผ่าน — ผลทุกด่านเป็นของจริง" + ("" if args.ci else " merge ได้"))


if __name__ == "__main__":
    main()
