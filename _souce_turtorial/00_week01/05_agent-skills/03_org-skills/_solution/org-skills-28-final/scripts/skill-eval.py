#!/usr/bin/env python3
"""ด่าน 4: ผู้รีวิวรัน claude plugin eval บนเครื่องตัวเอง แล้วส่งผลขึ้น PR เป็น commit status ชื่อ skill-eval

CI ไม่มี token ของ AI ด่านนี้จึงใช้สิทธิ์ Claude ของผู้รีวิวและค่าใช้จ่ายของผู้รีวิว

ขั้นตอน: ดึง commit หัวของ PR มาเป็น worktree ชั่วคราว (ไม่กระทบไฟล์ที่กำลังทำงาน) → หา plugin ที่ PR แก้
และ plugin ที่พึ่งพามัน → รัน eval เทียบมี/ไม่มี plugin → ผ่านเมื่อทุก case ได้คะแนนถึงเกณฑ์และคะแนนเฉลี่ย
สูงกว่าตอนไม่มี plugin → โพสต์ผลเป็นความเห็นใน PR และตั้ง status บน commit นั้น push ใหม่แล้วต้องรันใหม่

ใช้:  python scripts/skill-eval.py --pr 12            # อ่าน diff ของ PR ก่อนเสมอ eval จะรันโค้ดของ PR บนเครื่องคุณ
      python scripts/skill-eval.py --pr 12 --no-post  # รันอย่างเดียว ไม่ส่งผล

token ของ Gitea: ตัวแปร GITEA_TOKEN หรือไฟล์ .gitea-token ในโฟลเดอร์นี้หรือโฟลเดอร์แม่
ต้องการสิทธิ์ write:repository และ write:issue
"""
import argparse, json, os, re, shutil, stat, subprocess, sys, tempfile, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTEXT = "skill-eval"
# สร้างจากหัวไฟล์ของทุกแผนก การที่ไฟล์นี้เปลี่ยนจึงไม่ได้แปลว่า core เปลี่ยน
GENERATED = {"plugins/core/skills/skill-finder/references/catalog.md"}


def read_token():
    token = os.environ.get("GITEA_TOKEN", "").strip()
    if token:
        return token
    for folder in [ROOT, *ROOT.parents]:
        path = folder / ".gitea-token"
        if path.exists():
            return path.read_text(encoding="utf-8").strip()
    sys.exit("ไม่พบ token: ตั้ง GITEA_TOKEN หรือวางไฟล์ .gitea-token")


def run_git(*args, token=None, cwd=ROOT):
    env = dict(os.environ)
    if token:
        # ส่งผ่าน environment เพื่อไม่ให้ token โผล่ใน argument ของ process
        env.update(GIT_CONFIG_COUNT="2", GIT_CONFIG_KEY_0="credential.helper", GIT_CONFIG_VALUE_0="",
                   GIT_CONFIG_KEY_1="http.extraHeader", GIT_CONFIG_VALUE_1=f"Authorization: token {token}")
    done = subprocess.run(["git", *args], cwd=cwd, env=env, check=True, capture_output=True, text=True, encoding="utf-8")
    return done.stdout.strip()


def eval_env():
    """environment ของ process ที่รันเนื้อหาของ PR ต้องไม่มี token ของ Gitea"""
    return {name: value for name, value in os.environ.items() if name != "GITEA_TOKEN"}


def remote_repo():
    url = run_git("remote", "get-url", "origin")
    m = re.match(r"^(https?://)(?:[^@/]*@)?([^/]+)/([^/]+)/([^/]+?)(?:\.git)?$", url)
    if not m:
        sys.exit(f"อ่าน remote ไม่ได้ ต้องเป็น http(s): {url}")
    return f"{m.group(1)}{m.group(2)}/api/v1", m.group(3), m.group(4)


class Gitea:
    def __init__(self, api, owner, repo, token):
        self.user_url = api
        self.base = f"{api}/repos/{owner}/{repo}"
        self.token = token

    def call(self, method, url, body=None):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(url, data=data, method=method)
        request.add_header("Authorization", f"token {self.token}")
        request.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8") or "null")
        except urllib.error.HTTPError as error:
            sys.exit(f"Gitea ตอบ {error.code} ที่ {method} {url}: {error.read().decode('utf-8', 'replace')[:300]}")

    def me(self):
        return self.call("GET", f"{self.user_url}/user")["login"]

    def pull(self, number):
        return self.call("GET", f"{self.base}/pulls/{number}")

    def comment(self, number, text):
        return self.call("POST", f"{self.base}/issues/{number}/comments", {"body": text})

    def status(self, sha, state, description, target=""):
        body = {"context": CONTEXT, "state": state, "description": description[:140], "target_url": target}
        return self.call("POST", f"{self.base}/statuses/{sha}", body)


def manifest(tree, plugin):
    return json.loads((tree / "plugins" / plugin / ".claude-plugin/plugin.json").read_text(encoding="utf-8"))


def plugins_in(tree):
    return sorted(p.name for p in (tree / "plugins").iterdir() if (p / ".claude-plugin/plugin.json").exists())


def affected_plugins(tree, base, head):
    """plugin ที่ PR แก้ + plugin ที่พึ่งพามัน เพราะแก้ core แล้วพฤติกรรมของ shared เปลี่ยนได้"""
    # --no-renames: ย้าย skill ข้าม plugin ต้องเห็นทั้ง path เดิมและใหม่ ไม่งั้น plugin ต้นทางจะไม่ถูก eval
    names = run_git("diff", "--name-only", "--no-renames", base, head, "--", "plugins/").splitlines()
    changed = {n.split("/")[1] for n in names if n not in GENERATED}
    affected = {p for p in plugins_in(tree) if p in changed}
    dependents = {p for p in plugins_in(tree) if changed & set(manifest(tree, p).get("dependencies", []))}
    return sorted(affected | dependents)


def case_dirs(tree, plugin):
    return sorted(p.parent for p in (tree / "plugins" / plugin / "evals").glob("*/prompt.md"))


def prepare_plugin(tree, plugin):
    """ทำให้ plugin รันใน eval ได้ แก้เฉพาะใน worktree ชั่วคราว

    eval โหลด plugin แบบ inline จึงหา dependency จาก marketplace ไม่เจอและไม่ยอมโหลด plugin
    และ case อ้าง plugin นอกโฟลเดอร์ตัวเองไม่ได้ จึงคัดลอกจาก commit เดียวกันมาไว้ที่ .eval-deps/
    case ที่มี plugins: จะแทนที่ plugin เป้าหมาย จึงต้องระบุทั้งตัวเองและ dependency
    เช่น ["../../.eval-deps/core", "../../.eval-deps/shared"] ส่วน arm ไม่มี plugin จะตัดออกทั้งหมด
    """
    root = tree / "plugins" / plugin
    if not manifest(tree, plugin).get("dependencies"):
        return
    pending = [plugin]
    seen = set()
    while pending:
        name = pending.pop()
        if name in seen:
            continue
        seen.add(name)
        pending += manifest(tree, name).get("dependencies", [])
        shutil.copytree(tree / "plugins" / name, root / ".eval-deps" / name, ignore=shutil.ignore_patterns("evals", ".eval-deps"))
        strip_dependencies(root / ".eval-deps" / name)
    strip_dependencies(root)


def strip_dependencies(plugin_root):
    path = plugin_root / ".claude-plugin/plugin.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data.pop("dependencies", None)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def run_eval(tree, plugin, args, out):
    claude = shutil.which("claude") or sys.exit("ไม่พบคำสั่ง claude")
    result_path = out / f"{plugin}.json"
    command = [
        claude, "plugin", "eval", str(tree / "plugins" / plugin),
        "--ablation", "with-without", "--runs", str(args.runs), "--threshold", str(args.threshold),
        "--max-cost-usd", str(args.max_cost), "-j", str(args.concurrency), "--no-publish", "--trust-plugin",
        "--json", str(result_path), "--output-dir", str(out / plugin),
    ]
    print(f"รัน eval ของ {plugin} ...", flush=True)
    done = subprocess.run(command, cwd=tree, env=eval_env(), capture_output=True, text=True, encoding="utf-8", errors="replace")
    if not result_path.exists():
        return None, done.stderr[-800:]
    return json.loads(result_path.read_text(encoding="utf-8")), done.stderr[-800:]


def mean(values):
    return sum(values) / len(values) if values else 0.0


def summarize(plugin, result, expected_cases, threshold, min_delta):
    """คืน dict ผลของ plugin เดียว · ไม่อิง exit code เพราะ exit 1 ปนทั้งคะแนนต่ำและโหลด case ไม่ได้"""
    rows, problems = [], []
    if result is None:
        return {"plugin": plugin, "rows": rows, "problems": ["ไม่ได้ผลลัพธ์จาก claude plugin eval"], "cost": 0.0, "delta": 0.0, "passed": False}
    if result.get("partial"):
        problems.append(f"รันไม่ครบ: {result.get('partialReason', 'ไม่ทราบสาเหตุ')}")
    if len(result["cases"]) != expected_cases:
        problems.append(f"โหลด case ได้ {len(result['cases'])} จาก {expected_cases}")
    deltas = []
    for case in result["cases"]:
        withs = case["arms"].get("with", [])
        withouts = case["arms"].get("without", [])
        errors = [r["error"] for r in withs + withouts if r.get("error")]
        if errors:
            problems.append(f"{case['name']}: {errors[0][:120]}")
        score_with, score_without = mean([r["score"] for r in withs]), mean([r["score"] for r in withouts])
        fired = [g["passed"] for r in withs for g in r["graders"] if g.get("withOnly")]
        rows.append({
            "name": case["name"], "with": score_with, "without": score_without,
            "delta": score_with - score_without, "fired": f"{sum(fired)}/{len(fired)}" if fired else "—",
            "passed": bool(withs) and not errors and score_with >= threshold,
        })
        deltas.append(score_with - score_without)
    delta = mean(deltas)
    if rows and delta < min_delta:
        problems.append(f"มี plugin ไม่ได้ดีกว่าไม่มี (delta {delta:+.2f} ต่ำกว่าเกณฑ์ {min_delta:+.2f})")
    passed = bool(rows) and not problems and all(r["passed"] for r in rows)
    return {"plugin": plugin, "rows": rows, "problems": problems, "cost": result.get("costUsd", 0.0), "delta": delta, "passed": passed}


def render_report(summaries, skipped, sha, reviewer, args):
    lines = [f"## skill-eval · `{sha[:10]}`", "", f"รันโดย `{reviewer}` · runs {args.runs} · เกณฑ์คะแนน {args.threshold} · เกณฑ์ delta {args.min_delta:+.2f}", ""]
    for s in summaries:
        lines += [f"### `{s['plugin']}` {'✅' if s['passed'] else '❌'} delta เฉลี่ย {s['delta']:+.2f} · ค่าใช้จ่าย ${s['cost']:.2f}", ""]
        lines += ["| case | มี skill | ไม่มี skill | delta | skill ถูกเรียก | ผล |", "|---|---:|---:|---:|---:|---|"]
        lines += [f"| {r['name']} | {r['with']:.2f} | {r['without']:.2f} | {r['delta']:+.2f} | {r['fired']} | {'✅' if r['passed'] else '❌'} |" for r in s["rows"]]
        lines += ["", *[f"- ⚠️ {p}" for p in s["problems"]], ""]
    if skipped:
        lines += ["ไม่ได้วัดเพราะยังไม่มีชุด eval: " + " ".join(f"`{p}`" for p in skipped), ""]
    if not summaries and not skipped:
        lines += ["PR นี้ไม่ได้แก้ plugin ไม่ต้องวัด", ""]
    return "\n".join(lines)


def decide(summaries, skipped):
    """คืน (state, description) ของ commit status"""
    if any(not s["passed"] for s in summaries):
        failed = ", ".join(s["plugin"] for s in summaries if not s["passed"])
        return "failure", f"ไม่ผ่าน: {failed}"
    if summaries:
        detail = ", ".join(f"{s['plugin']} {s['delta']:+.2f}" for s in summaries)
        note = f" · ไม่มีชุด eval: {', '.join(skipped)}" if skipped else ""
        return "success", f"ผ่าน delta {detail}{note}"
    if skipped:
        return "success", f"ไม่ได้วัด: ยังไม่มีชุด eval ของ {', '.join(skipped)}"
    return "success", "ไม่ได้แก้ plugin ไม่ต้องวัด"


def force_remove(function, path, _):
    os.chmod(path, stat.S_IWRITE)  # Windows: ไฟล์ใน .git เป็น read-only
    function(path)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pr", type=int, required=True)
    parser.add_argument("--runs", type=int, default=3, help="จำนวนรอบต่อ case (ค่าเริ่มต้น 3)")
    parser.add_argument("--threshold", type=float, default=0.75, help="คะแนนขั้นต่ำของทุก case (ค่าเริ่มต้น 0.75)")
    parser.add_argument("--min-delta", type=float, default=0.1, help="คะแนนที่ต้องดีกว่าตอนไม่มี plugin (ค่าเริ่มต้น 0.1)")
    parser.add_argument("--max-cost", type=float, default=10.0, help="เพดานค่าใช้จ่ายต่อ plugin เป็น USD (ค่าเริ่มต้น 10)")
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--no-post", action="store_true", help="รันอย่างเดียว ไม่ส่งผลขึ้น PR")
    parser.add_argument("--yes", action="store_true", help="ยืนยันว่าอ่าน diff ของ PR แล้ว")
    args = parser.parse_args()

    api, owner, repo = remote_repo()
    token = read_token()
    gitea = Gitea(api, owner, repo, token)
    reviewer = gitea.me()
    pr = gitea.pull(args.pr)
    sha, base_ref, author = pr["head"]["sha"], pr["base"]["ref"], pr["user"]["login"]
    if pr["state"] != "open":
        sys.exit(f"PR #{args.pr} ไม่ได้เปิดอยู่")
    if author == reviewer and not args.no_post:
        sys.exit(f"{reviewer} เป็นผู้เปิด PR นี้ ส่งผล skill-eval ให้งานตัวเองไม่ได้ ให้ผู้รีวิวเป็นคนรัน (ลองดูผลเองใช้ --no-post)")
    print(f"PR #{args.pr}: {pr['title']}\nผู้เปิด {author} · commit {sha}\nผู้รีวิว {reviewer}")
    if not args.yes and input("eval จะรันเนื้อหาของ PR ด้วยสิทธิ์ของคุณ อ่าน diff แล้วใช่ไหม [y/N] ").strip().lower() != "y":
        return 1

    run_git("fetch", "--quiet", "origin", f"+refs/heads/{base_ref}:refs/remotes/origin/{base_ref}", f"refs/pull/{args.pr}/head", token=token)
    run_git("cat-file", "-e", f"{sha}^{{commit}}")
    base_sha = run_git("merge-base", f"origin/{base_ref}", sha)
    work = Path(tempfile.mkdtemp(prefix="skill-eval-"))
    tree, out = work / "tree", work / "out"
    out.mkdir()
    try:
        run_git("worktree", "add", "--quiet", "--detach", str(tree), sha)
        affected = affected_plugins(tree, base_sha, sha)
        summaries, skipped = [], []
        for plugin in affected:
            cases = case_dirs(tree, plugin)
            if not cases:
                skipped.append(plugin)
                continue
            prepare_plugin(tree, plugin)
            result, stderr = run_eval(tree, plugin, args, out)
            # ไม่แสดงบรรทัด Report: เพราะ worktree ชั่วคราวจะถูกลบเมื่อจบ
            notes = [line for line in stderr.splitlines() if line.strip() and not line.startswith("Report:")]
            if notes:
                print(chr(10).join(notes), file=sys.stderr)
            summaries.append(summarize(plugin, result, len(cases), args.threshold, args.min_delta))
    finally:
        try:
            run_git("worktree", "remove", "--force", str(tree))
        except subprocess.CalledProcessError:
            pass
        run_git("worktree", "prune")
        shutil.rmtree(work, onerror=force_remove)

    report = render_report(summaries, skipped, sha, reviewer, args)
    state, description = decide(summaries, skipped)
    print(f"\n{report}\nผล: {state} · {description}")
    if args.no_post:
        print("--no-post: ไม่ได้ส่งผลขึ้น PR")
        return 0 if state == "success" else 1
    # status ผูกกับ commit ที่วัดจริง ถ้ามี push ใหม่ระหว่างรัน ผลนี้จะไม่นับให้ commit ใหม่
    comment = gitea.comment(args.pr, report)
    gitea.status(sha, state, description, comment.get("html_url", ""))
    print(f"ส่ง status {CONTEXT}={state} บน {sha[:10]} แล้ว")
    return 0 if state == "success" else 1


if __name__ == "__main__":
    sys.exit(main())
