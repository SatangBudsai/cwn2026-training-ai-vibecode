#!/usr/bin/env python3
"""ด่าน 4 — ผู้รีวิวรัน eval ของ PR บนเครื่องตัวเอง แล้วส่งผลขึ้น PR เป็น commit status `skill-eval`

    git switch main && git pull                     # ต้องรันสคริปต์ของ main เท่านั้น ไม่ใช่ของ branch ใน PR
    python scripts/skill_eval.py 12 --token-file <ไฟล์-token-Gitea-ของคุณ>
    python scripts/skill_eval.py 12 --token-file <ไฟล์> --runs 3 --threshold 0.8 --case-threshold 0.6
    python scripts/skill_eval.py 12 --token-file <ไฟล์> --dry-run   # รันแต่ไม่โพสต์ผล

ทำอะไร
  1. อ่าน PR จาก Gitea → head sha + ไฟล์ที่แก้ → plugin ที่ถูกแก้และมีชุด eval (plugins/<p>/evals/)
  0. สคริปต์นี้ (และ merge_gate.py) ต้องตรงกับ origin/main — PR แก้ skill_eval.py เพื่อหลอกผู้รีวิวไม่ได้
  2. ต้องผ่าน CI (ด่าน 1–3) บน sha นั้นก่อน — กันการรันโค้ดที่ยังไม่ผ่านสแกนความปลอดภัยบนเครื่องผู้รีวิว
     ดูจาก task ของ Actions จริง (merge_gate.ci_tasks: ci.yml, pull_request_target, PR นี้, sha นี้)
     ไม่เชื่อ commit status `ci / …` เพราะใครมี write ก็โพสต์ status ชื่อนี้ได้
  3. แตก git worktree ชั่วคราวที่ sha ของ PR (ไม่แตะ checkout ของผู้รีวิว)
  4. รัน `claude plugin eval <plugin> --ablation with-without` = เทียบ มี skill / ไม่มี skill
  5. ผ่านเมื่อทุก plugin: คะแนนตอนมี skill >= --threshold และ Δ(มี − ไม่มี) >= --min-delta
     และทุก case ตอนมี skill >= --case-threshold (คะแนนรวมสูงซ่อน case ที่พังไม่ได้)
  6. โพสต์ commit status `skill-eval` (success/failure) บน head sha + คอมเมนต์ตารางผลใน PR

token AI ใช้ของผู้รีวิว (claude login บนเครื่อง) — ไม่มีใน CI · token Gitea อ่านจากไฟล์ (หรือ env) ไม่ถูกเขียนลงที่ใด
และถูกลบออกจาก env ก่อนเรียก `claude plugin eval` (hook/MCP ของ plugin ที่รันด้วย --trust-plugin มองไม่เห็น)
push commit ใหม่เข้า PR = sha ใหม่ = ต้องรันใหม่ (status ผูกกับ sha)
stdlib ล้วน · ใช้ได้ทั้ง Windows / macOS / Linux
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import merge_gate  # noqa: E402

CONTEXT = "skill-eval"
# env ที่ห้ามส่งต่อให้ claude plugin eval (และ hook/MCP ของ plugin ที่ถูกทดสอบ)
SECRET_ENV = re.compile(r"^(GITEA_.*|GITHUB_TOKEN|GH_TOKEN|RELEASE_TOKEN|.*_GITEA_TOKEN)$", re.I)


def api(args, method, path, body=None):
    req = urllib.request.Request(f"{args.gitea.rstrip('/')}/api/v1{path}", method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Authorization", f"token {args.token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"Gitea {method} {path} → HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")


def git(*a, cwd=ROOT, check=True):
    r = subprocess.run(["git", *a], cwd=cwd, capture_output=True, text=True, encoding="utf-8")
    if check and r.returncode:
        sys.exit(f"git {' '.join(a)}: {r.stderr.strip()}")
    return r.stdout.strip()


def set_status(args, sha, state, desc, url=""):
    print(f"→ status {CONTEXT}: {state} — {desc}")
    if args.dry_run:
        return
    api(args, "POST", f"/repos/{args.repo}/statuses/{sha}",
        {"context": CONTEXT, "state": state, "description": desc[:250], "target_url": url})


def ensure_main_scripts():
    """สคริปต์ที่กำลังรันต้องเป็นของ origin/main — ไม่งั้น PR แก้ skill_eval.py ให้ทำอะไรก็ได้บนเครื่องผู้รีวิว"""
    git("fetch", "-q", "origin", "+refs/heads/main:refs/remotes/origin/main")
    for name in ("skill_eval.py", "merge_gate.py"):
        ours = (ROOT / "scripts" / name).read_bytes().replace(b"\r\n", b"\n")
        r = subprocess.run(["git", "show", f"origin/main:scripts/{name}"], cwd=ROOT, capture_output=True)
        if r.returncode:
            print(f"⚠️  origin/main ยังไม่มี scripts/{name} (PR ตั้งต้น) — อ่านสคริปต์นี้เองก่อนรัน")
        elif r.stdout.replace(b"\r\n", b"\n") != ours:
            sys.exit(f"scripts/{name} ที่รันอยู่ไม่ตรงกับ origin/main — รันจาก main เท่านั้น: git switch main && git pull")


def run_eval(args, plugin_dir, out_json):
    exe = shutil.which("claude")
    if not exe:
        sys.exit("ไม่พบคำสั่ง claude — ติดตั้ง Claude Code และ login ก่อน")
    cmd = [exe, "plugin", "eval", str(plugin_dir), "--ablation", "with-without", "--trust-plugin",
           "--no-publish", "--threshold", "0", "--json", str(out_json), "--output-dir", str(out_json.parent)]
    if args.runs:
        cmd += ["--runs", str(args.runs)]
    if args.max_cost_usd:
        cmd += ["--max-cost-usd", str(args.max_cost_usd)]
    print("$ " + " ".join(cmd[1:]))
    # trust: โค้ดผ่าน CI (สแกนความปลอดภัย) แล้ว และ case ไม่ได้ให้สิทธิ์ Bash/Write — ไม่ส่ง --allow-tools / --scaffold
    env = {k: v for k, v in os.environ.items() if not SECRET_ENV.match(k)}
    rc = subprocess.run(cmd, env=env).returncode
    if not out_json.exists():
        return None, f"eval ไม่ได้ผล (exit {rc})"
    res = json.loads(out_json.read_text(encoding="utf-8"))
    if rc == 2 or res.get("partial"):
        return res, "eval ไม่ครบ (cost ceiling / credential)"
    return res, None


def summarize(name, res, args):
    ag = res["aggregates"]
    with_s = ag.get("overallScore", 0)
    without = [c["aggregates"].get("scoreWithout") for c in res["cases"] if c["aggregates"].get("scoreWithout") is not None]
    without_s = sum(without) / len(without) if without else None
    delta = ag.get("meanDelta", 0) or 0
    low = [c["name"] for c in res["cases"] if (c["aggregates"].get("score") or 0) < args.case_threshold]
    flat = [c["name"] for c in res["cases"] if c["aggregates"].get("delta") is not None and c["aggregates"]["delta"] <= 0]
    ok = with_s >= args.threshold and delta >= args.min_delta and not low
    rows = []
    for c in res["cases"]:
        a = c["aggregates"]
        failed = sorted({g["name"] for r in c["arms"].get("with", []) for g in r.get("graders", [])
                         if g.get("scored", True) and str(g.get("passed")).lower() != "true"})
        fired = [str(g.get("passed")).lower() == "true" for r in c["arms"].get("with", []) for g in r.get("graders", [])
                 if g.get("type") == "tool_used" or g.get("name") == "skill-fired"]
        rows.append(f"| `{c['name']}` | {a.get('score', 0):.2f} | {fmt(a.get('scoreWithout'))} | {sign(a.get('delta'))} | "
                    f"{sum(fired)}/{len(fired) or '-'} | {', '.join(failed) or '—'} |")
    return ok, with_s, without_s, delta, rows, low, flat


fmt = lambda v: "—" if v is None else f"{v:.2f}"
sign = lambda v: "—" if v is None else f"{v:+.2f}"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pr", type=int)
    ap.add_argument("--gitea", default=os.environ.get("GITEA_URL", "http://localhost:3300"))
    ap.add_argument("--repo", default="novatech/org-skills")
    ap.add_argument("--token-file", help="ไฟล์ token Gitea ของผู้รีวิว (ถ้าไม่ตั้ง env GITEA_TOKEN)")
    ap.add_argument("--runs", type=int, help="ทับ runs ต่อ case (ค่าเริ่มต้นตาม case = 3)")
    ap.add_argument("--threshold", type=float, default=0.8, help="คะแนนขั้นต่ำตอนมี skill (0..1)")
    ap.add_argument("--min-delta", type=float, default=0.0, help="Δ ขั้นต่ำ (มี − ไม่มี skill) — skill ต้องไม่ทำให้แย่ลง")
    ap.add_argument("--case-threshold", type=float, default=0.6, help="คะแนนขั้นต่ำต่อ case ตอนมี skill (0..1)")
    ap.add_argument("--max-cost-usd", type=float)
    ap.add_argument("--plugins", nargs="*", help="บังคับ plugin ที่จะรัน (ค่าเริ่มต้น: plugin ที่ PR แก้และมี evals/)")
    ap.add_argument("--skip-ci-check", action="store_true", help="ไม่รอ CI ผ่านก่อน (ไม่แนะนำ)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    args.token = Path(args.token_file).read_text().strip() if args.token_file else os.environ.get("GITEA_TOKEN", "")
    if not args.token:
        sys.exit("ต้องมี token Gitea ของผู้รีวิว: --token-file <ไฟล์> (แนะนำ) หรือ env GITEA_TOKEN")
    ensure_main_scripts()

    me = api(args, "GET", "/user")["login"]
    pr = api(args, "GET", f"/repos/{args.repo}/pulls/{args.pr}")
    if pr["state"] != "open":
        sys.exit(f"PR #{args.pr} ไม่ได้เปิดอยู่ ({pr['state']})")
    sha, base = pr["head"]["sha"], pr["base"]["ref"]
    print(f"PR #{args.pr} {pr['title']}\n  head {sha[:10]} · base {base} · ผู้รีวิว {me}")
    if pr["user"]["login"] == me:
        print("⚠️  คุณเป็นคนเปิด PR นี้เอง — ผล skill-eval ของคุณจะไม่ถูกนับ (merge_gate / ci / 4-review)")

    if not args.skip_ci_check:
        errs, notes = merge_gate.ci_tasks(merge_gate.Gitea(f"{args.gitea.rstrip('/')}/api/v1", args.token),
                                          args.repo, pr, base, merge_gate.CI_JOBS)
        print("\n".join("  " + x for x in notes))
        if errs:
            sys.exit("CI (ด่าน 1–3) ยังไม่ผ่าน — รอ CI เขียวก่อนรัน eval:\n  - " + "\n  - ".join(errs))

    git("fetch", "-q", "origin", f"+refs/pull/{args.pr}/head:refs/remotes/pr/{args.pr}", f"+refs/heads/{base}:refs/remotes/origin/{base}")
    if git("rev-parse", f"refs/remotes/pr/{args.pr}") != sha:
        sys.exit("sha ที่ fetch ได้ไม่ตรงกับ head ของ PR — ลองใหม่อีกครั้ง")
    changed = git("diff", "--name-only", f"origin/{base}...{sha}").split()
    touched = sorted({p.split("/")[1] for p in changed if p.startswith("plugins/")})
    work = Path(tempfile.mkdtemp(prefix=f"skill-eval-pr{args.pr}-"))
    wt = work / "tree"
    git("worktree", "add", "-q", "--detach", str(wt), sha)
    try:
        plugins = args.plugins if args.plugins is not None else [p for p in touched if (wt / "plugins" / p / "evals").is_dir()]
        no_suite = [p for p in touched if p not in plugins]
        print(f"  plugin ที่ PR แก้: {touched or '—'} · รัน eval: {plugins or '—'} · ยังไม่มีชุด eval: {no_suite or '—'}")
        pr_url = pr["html_url"]
        if not plugins:
            set_status(args, sha, "success", f"ไม่มี plugin ที่มีชุด eval ถูกแก้ — ตรวจโดย {me}", pr_url)
            return
        set_status(args, sha, "pending", f"{me} กำลังรัน eval: {', '.join(plugins)}", pr_url)

        lines, all_ok, short = [], True, []
        claude_ver = subprocess.run([shutil.which("claude") or "claude", "--version"], capture_output=True, text=True).stdout.strip()
        for p in plugins:
            out = work / p / "result.json"
            out.parent.mkdir(parents=True)
            res, err = run_eval(args, wt / "plugins" / p, out)
            if err:
                all_ok = False
                short.append(f"{p}: {err}")
                lines += [f"### `{p}` — ❌ {err}", ""]
                continue
            ok, ws, wo, d, rows, low, flat = summarize(p, res, args)
            all_ok &= ok
            short.append(f"{p} {ws:.2f}/{fmt(wo)} Δ{d:+.2f}" + (f" case<{args.case_threshold}: {','.join(low)}" if low else ""))
            lines += [f"### `{p}` — {'✅ ผ่าน' if ok else '❌ ไม่ผ่าน'} · มี skill {ws:.2f} · ไม่มี skill {fmt(wo)} · Δ {d:+.2f}",
                      f"{len(res['cases'])} case · ค่าใช้จ่าย ${res.get('costUsd', 0):.2f} · {res.get('durationSeconds', 0)} วินาที", "",
                      "| case | มี skill | ไม่มี skill | Δ | skill ถูกเรียก | grader ที่ไม่ผ่าน (มี skill) |", "|---|---|---|---|---|---|", *rows, "",
                      *([f"❌ case ที่ต่ำกว่าเกณฑ์ต่อ case ({args.case_threshold}): {', '.join(f'`{x}`' for x in low)}", ""] if low else []),
                      *([f"ℹ️ case ที่ skill ไม่ได้ทำให้ดีขึ้น (Δ ≤ 0): {', '.join(f'`{x}`' for x in flat)} — ใช้กันถดถอยได้ แต่ไม่ได้พิสูจน์ว่า skill ช่วย", ""] if flat else [])]
        state = "success" if all_ok else "failure"
        body = "\n".join([f"## skill-eval: {'✅ ผ่าน' if all_ok else '❌ ไม่ผ่าน'} (`{sha[:10]}`)", "",
                          f"รันโดย @{me} บนเครื่องตัวเอง · {claude_ver} · เกณฑ์: มี skill ≥ {args.threshold}, Δ ≥ {args.min_delta:+} และทุก case ≥ {args.case_threshold}", "",
                          *lines,
                          *( [f"plugin ที่แก้แต่ยังไม่มีชุด eval: {', '.join(no_suite)} — เจ้าของ plugin ควรเพิ่ม `plugins/<p>/evals/`", ""] if no_suite else []),
                          "<sub>scripts/skill_eval.py (ของ main) · push commit ใหม่ = ต้องรันใหม่ · ได้ผลแล้วกด Re-run ที่ ci / 4-review</sub>"])
        if args.dry_run:
            print(body)
        else:
            c = api(args, "POST", f"/repos/{args.repo}/issues/{args.pr}/comments", {"body": body})
            pr_url = c.get("html_url", pr_url)
        set_status(args, sha, state, f"{' · '.join(short)} — โดย {me}", pr_url)
        print(f"\nรายงาน HTML: {work}")
        sys.exit(0 if all_ok else 1)
    finally:
        git("worktree", "remove", "--force", str(wt), check=False)


if __name__ == "__main__":
    main()
