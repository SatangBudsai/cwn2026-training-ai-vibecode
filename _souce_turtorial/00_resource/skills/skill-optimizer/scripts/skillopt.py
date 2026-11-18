#!/usr/bin/env python3
"""skillopt.py - วัดและปรับปรุงสกิลแบบมีหลักฐาน (eval-driven skill optimization)

  skillopt.py lint   <skill_dir>                                   ต้นทุนบริบทของสกิล (ไม่ใช้โทเคน)
  skillopt.py run    <suite_dir> --skill <skill_dir|none> --label v0 [--split train|val|all]
                     [--reps 2] [--accounts yolo2,yolo3] [--par 4] [--model sonnet] [--effort medium]
  skillopt.py grade  <suite_dir> --label v0                         ตรวจซ้ำโดยไม่เรียกโมเดล
  skillopt.py report <suite_dir> [--labels v0,v1]                   ตารางเทียบรุ่น + results.json
  skillopt.py failures <suite_dir> --label v0 [--split train|val|test|all]  ข้อที่ไม่ผ่าน + path ของ transcript (ค่าเริ่มต้น train)
  skillopt.py null   <suite_dir> --label v0                         ความแกว่งของรุ่นเดียวกันระหว่างรอบ (A/A)
  skillopt.py gate   <suite_dir> --base v0 --cand v1 [--z 1.5]      รับ/ไม่รับรุ่นใหม่ (ชุด val ไม่ลด + ดีขึ้นเกินความแกว่ง)

suite_dir/suite.json:
  {"name": "...", "skill_name": "dag-planner", "prompt": "... {goal} ...", "timeout": 900,
   "extra_skills": ["../../../05_DAG_Planner/base_skills/agent-team"], "env": {"K": "{sandbox}/x"},
   "grader": "grade.py", "tasks": [{"id": "t1", "split": "train", ...ตัวแปรของ prompt...}]}
ผลของแต่ละรอบ: suite_dir/runs/<label>/<task>-r<k>/ (sandbox/ transcript.jsonl metrics.json grade.json)

ตัวรันใช้กติกาเดียวกับ base skill `yolo`: yoloN -p ... --output-format stream-json --no-session-persistence
--strict-mcp-config < /dev/null และไม่เชื่อ exit code (ดู is_error) · Python 3.8+ stdlib เท่านั้น
"""
import argparse, json, os, re, shutil, statistics, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor

SECRET_RE = re.compile(r"\.credentials\.json|auth\.json|\.claude\.json")


# ------------------------------------------------------------------ lint
def lint(skill_dir):
    p = os.path.join(skill_dir, "SKILL.md")
    txt = open(p, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n", txt, re.S)
    front = m.group(1) if m else ""
    dm = re.search(r"^description:\s*(.*)$", front, re.M)
    desc = dm.group(1).strip() if dm else ""
    body = txt[m.end():] if m else txt
    links = re.findall(r"\]\(([^)#]+)\)", body) + re.findall(r"`((?:references|scripts)/[\w./-]+)`", body)
    missing = sorted({l for l in links if not l.startswith("http") and not os.path.exists(os.path.join(skill_dir, l))})
    files = []
    for root, _, fs in os.walk(skill_dir):
        for f in fs:
            if "__pycache__" in root:
                continue
            fp = os.path.join(root, f)
            files.append((os.path.relpath(fp, skill_dir), os.path.getsize(fp)))
    hard = sorted(set(re.findall(r"(/root/[\w./-]+|/workspace/[\w./-]+)", body)))
    return {"skill": os.path.basename(os.path.abspath(skill_dir)),
            "description_chars": len(desc), "skill_md_lines": body.count("\n") + 1,
            "skill_md_chars": len(body), "skill_md_bytes": len(body.encode("utf-8")),
            "files": len(files), "total_bytes": sum(s for _, s in files),
            "missing_links": missing, "hardcoded_paths": len(hard),
            "warnings": ([] if desc else ["ไม่มี description"]) +
                        (["description ยาวเกิน 1024 ตัวอักษร (ชั้นที่ 1 ถูกโหลดทุก session)"] if len(desc) > 1024 else []) +
                        (["SKILL.md ยาวเกิน 500 บรรทัด ควรย้ายรายละเอียดไป references/"] if body.count("\n") > 500 else []) +
                        (["ลิงก์ไปไฟล์ที่ไม่มีจริง: " + ", ".join(missing)] if missing else [])}


# ------------------------------------------------------------------ run one trial
def parse_transcript(path):
    tools, errs, res, toks = [], 0, None, {"in": 0, "cache_w": 0, "cache_r": 0, "out": 0}
    skill_read = False
    for line in open(path, encoding="utf-8", errors="replace"):
        try:
            m = json.loads(line)
        except ValueError:
            continue
        t = m.get("type")
        if t == "assistant":
            for c in (m.get("message") or {}).get("content", []):
                if c.get("type") == "tool_use":
                    s = c["name"] + " " + json.dumps(c.get("input"), ensure_ascii=False)
                    tools.append(s)
                    if "SKILL.md" in s:
                        skill_read = True
        elif t == "user":
            for c in (m.get("message") or {}).get("content", []):
                if isinstance(c, dict) and c.get("type") == "tool_result" and c.get("is_error"):
                    errs += 1
        elif t == "result":
            res = m
    u = (res or {}).get("usage") or {}
    return {"ok": bool(res) and not res.get("is_error"), "tool_calls": len(tools), "tool_errors": errs,
            "num_turns": (res or {}).get("num_turns"), "cost_usd": round((res or {}).get("total_cost_usd") or 0, 4),
            "input_tokens": u.get("input_tokens") or 0, "cache_read": u.get("cache_read_input_tokens") or 0,
            "cache_write": u.get("cache_creation_input_tokens") or 0, "output_tokens": u.get("output_tokens") or 0,
            "skill_read": skill_read, "credential_touch": sum(1 for t in tools if SECRET_RE.search(t)),
            "result": (res or {}).get("result", ""), "commands": [t[:400] for t in tools]}


def fill(s, d):
    return re.sub(r"\{(\w+)\}", lambda m: str(d[m.group(1)]) if m.group(1) in d else m.group(0), s)


def run_trial(suite_dir, suite, task, rep, a, account):
    rdir = os.path.join(suite_dir, "runs", a.label, "%s-r%d" % (task["id"], rep))
    sb = os.path.join(rdir, "sandbox")
    shutil.rmtree(rdir, ignore_errors=True)
    os.makedirs(sb)
    ign = shutil.ignore_patterns("__pycache__", ".ipynb_checkpoints")
    if a.skill != "none":
        shutil.copytree(a.skill, os.path.join(sb, "skills", suite["skill_name"]), ignore=ign)
        for e in suite.get("extra_skills", []):
            src = os.path.normpath(os.path.join(suite_dir, e))
            shutil.copytree(src, os.path.join(sb, "skills", os.path.basename(src)), ignore=ign)
    for f in suite.get("files", []) + task.get("files", []):   # ไฟล์/โฟลเดอร์ตั้งต้น (ของทุกโจทย์ + ของโจทย์นี้)
        src = os.path.normpath(os.path.join(suite_dir, fill(f, task)))
        if os.path.isdir(src):                          # โฟลเดอร์ → วางเป็น sandbox/<ชื่อโฟลเดอร์> (เช่น เว็บที่ต้องแก้)
            shutil.copytree(src, os.path.join(sb, os.path.basename(src)), ignore=ign, symlinks=True)
        else:
            shutil.copy(src, sb)
    v = dict(task, sandbox=sb)
    prompt = fill(suite["prompt"], v)
    env = os.environ.copy()
    for k in list(env):
        if k.startswith("CLAUDE") or k.startswith("MA_"):
            env.pop(k)
    for k, val in suite.get("env", {}).items():
        env[k] = fill(val, v)
    cmd = [account, "-p", prompt, "--model", a.model, "--effort", a.effort, "--output-format", "stream-json",
           "--verbose", "--no-session-persistence", "--strict-mcp-config"]
    tpath = os.path.join(rdir, "transcript.jsonl")
    t0 = time.time()
    timed_out = False
    with open(tpath, "wb") as out, open(os.path.join(rdir, "stderr.txt"), "wb") as err:
        p = subprocess.Popen(cmd, cwd=sb, env=env, stdin=subprocess.DEVNULL, stdout=out, stderr=err,
                             start_new_session=True)
        try:
            p.wait(timeout=suite.get("timeout", 900))
        except subprocess.TimeoutExpired:
            timed_out = True
            try:
                os.killpg(p.pid, 9)
            except OSError:
                pass
            p.wait()
    m = parse_transcript(tpath)
    m.update(task=task["id"], split=task.get("split", "train"), rep=rep, label=a.label, account=account,
             model=a.model, effort=a.effort, wall_s=round(time.time() - t0, 1), timed_out=timed_out)
    json.dump(m, open(os.path.join(rdir, "metrics.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    g = grade_trial(suite_dir, suite, task, rdir)
    print("%-4s %-22s r%d %-6s score %.2f  %5.0fs  calls %2d err %d  $%.2f%s" % (
        a.label, task["id"], rep, account, g["score"], m["wall_s"], m["tool_calls"], m["tool_errors"],
        m["cost_usd"], "  TIMEOUT" if timed_out else ("" if m["ok"] else "  ERROR")), flush=True)
    return m


def grade_trial(suite_dir, suite, task, rdir):
    tf = os.path.join(rdir, "task.json")
    json.dump(task, open(tf, "w", encoding="utf-8"), ensure_ascii=False)
    try:
        r = subprocess.run([sys.executable, os.path.join(suite_dir, suite["grader"]), os.path.join(rdir, "sandbox"), tf],
                           capture_output=True, text=True, timeout=600)
        g = json.loads(r.stdout)
    except Exception as e:  # ตัวตรวจล้ม = 0 คะแนน พร้อมเหตุผล ไม่เดาผล
        g = {"score": 0.0, "checks": [{"id": "grader", "pass": False, "note": "ตัวตรวจล้ม: %s" % str(e)[:200]}]}
    json.dump(g, open(os.path.join(rdir, "grade.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return g


def load_suite(d):
    return json.load(open(os.path.join(d, "suite.json"), encoding="utf-8"))


def cmd_run(a):
    suite = load_suite(a.suite)
    tasks = [t for t in suite["tasks"] if a.split == "all" or t.get("split", "train") == a.split]
    if a.tasks:
        tasks = [t for t in tasks if t["id"] in a.tasks.split(",")]
    accounts = a.accounts.split(",")
    jobs = [(t, r) for r in range(1, a.reps + 1) for t in tasks]
    lock, load = threading.Lock(), {x: 0 for x in accounts}

    def one(j):
        with lock:
            acc = min(load, key=load.get)
            load[acc] += 1
        try:
            return run_trial(a.suite, suite, j[0], j[1], a, acc)
        finally:
            with lock:
                load[acc] -= 1
    with ThreadPoolExecutor(a.par) as ex:
        list(ex.map(one, jobs))
    return 0


def cmd_grade(a):
    suite = load_suite(a.suite)
    by = {t["id"]: t for t in suite["tasks"]}
    base = os.path.join(a.suite, "runs", a.label)
    for d in sorted(os.listdir(base)):
        tid = d.rsplit("-r", 1)[0]
        if tid in by:
            g = grade_trial(a.suite, suite, by[tid], os.path.join(base, d))
            print("%-26s %.2f" % (d, g["score"]))
    return 0


# ------------------------------------------------------------------ aggregate
def collect(suite_dir, label):
    rows, base = [], os.path.join(suite_dir, "runs", label)
    for d in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        try:
            m = json.load(open(os.path.join(base, d, "metrics.json"), encoding="utf-8"))
            g = json.load(open(os.path.join(base, d, "grade.json"), encoding="utf-8"))
        except (OSError, ValueError):
            continue
        m["score"], m["checks"], m["dir"] = g["score"], g["checks"], os.path.join(base, d)
        rows.append(m)
    return rows


def summarize(rows):
    def mean(k):
        return round(statistics.mean(r[k] for r in rows), 3) if rows else None
    out = {"n": len(rows), "score": mean("score"),
           "score_sd": round(statistics.pstdev([r["score"] for r in rows]), 3) if rows else None,
           "perfect": sum(1 for r in rows if r["score"] >= 0.999),
           # รอบที่เอเจนต์เปิด SKILL.md จริง (รอบที่ไม่เปิด ไม่ได้วัดสกิล) และรอบที่จบไม่ปกติ (หมดเวลา / CLI ล้ม)
           "skill_read": sum(1 for r in rows if r.get("skill_read")),
           "abnormal": sum(1 for r in rows if r.get("timed_out") or not r.get("ok", True)),
           "wall_s": mean("wall_s"), "tool_calls": mean("tool_calls"), "tool_errors": mean("tool_errors"),
           "cost_usd": mean("cost_usd"), "output_tokens": mean("output_tokens"),
           # โทเคนขาเข้าทั้งหมดที่โมเดลต้องอ่าน (รวมที่อ่านจาก cache) = ตัวแทนของ "งานที่ทำต่อรอบ"
           "context_tokens": round(statistics.mean(r.get("input_tokens", 0) + r.get("cache_read", 0) + r.get("cache_write", 0) for r in rows)) if rows else None}
    checks = {}
    for r in rows:
        for c in r["checks"]:
            p = checks.setdefault(c["id"], [0, 0])
            p[0] += 1 if c["pass"] else 0
            p[1] += 1
    out["checks"] = {k: "%d/%d" % (v[0], v[1]) for k, v in checks.items()}
    return out


def cmd_report(a):
    base = os.path.join(a.suite, "runs")
    labels = a.labels.split(",") if a.labels else sorted(os.listdir(base))
    res = {}
    for lb in labels:
        rows = collect(a.suite, lb)
        res[lb] = {"all": summarize(rows)}
        for sp in ("train", "val", "test"):
            res[lb][sp] = summarize([r for r in rows if r["split"] == sp])
        for sp in ("all", "val", "test"):
            res[lb][sp].pop("checks", None)
        res[lb]["trials"] = [dict({k: r[k] for k in ("task", "split", "rep", "account", "score", "wall_s", "tool_calls",
                                                 "tool_errors", "cost_usd", "output_tokens", "timed_out")},
                                  # ผลรายข้อเก็บเฉพาะชุด train · ชุด val/test เก็บแค่คะแนน (กันคำตอบรั่วเข้าการแก้สกิล)
                                  failed=[c["id"] for c in r["checks"] if not c["pass"]] if r["split"] == "train" else None)
                             for r in rows]
    json.dump(res, open(os.path.join(a.suite, "results.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    H = ["รุ่น", "ชุด", "รอบ", "คะแนน", "sd", "เต็มทุกข้อ", "เวลา (s)", "คำสั่ง", "คำสั่งล้ม", "ค่าใช้จ่าย", "output tok", "โทเคนขาเข้า",
         "อ่านสกิล", "จบไม่ปกติ"]
    L = ["| " + " | ".join(H) + " |", "|" + "---|" * len(H)]
    for lb in labels:
        for sp in ("train", "val", "test", "all"):
            s = res[lb][sp]
            if s["n"]:
                L.append("| %s | %s | %d | **%.1f%%** | %.1f | %d/%d | %.0f | %.1f | %.1f | $%.3f | %.0f | %.0f | %d/%d | %d |" % (
                    lb, sp, s["n"], s["score"] * 100, s["score_sd"] * 100, s["perfect"], s["n"], s["wall_s"],
                    s["tool_calls"], s["tool_errors"], s["cost_usd"], s["output_tokens"], s["context_tokens"],
                    s["skill_read"], s["n"], s["abnormal"]))
    ids = []
    for lb in labels:
        for k in res[lb]["train"]["checks"]:
            if k not in ids:
                ids.append(k)
    L += ["", "| ข้อตรวจ (เฉพาะชุด train) | " + " | ".join(labels) + " |", "|---|" + "---|" * len(labels)]
    for k in ids:
        L.append("| %s | %s |" % (k, " | ".join(res[lb]["train"]["checks"].get(k, "-") for lb in labels)))
    print("\n".join(L))
    return 0


def cmd_failures(a):
    for r in collect(a.suite, a.label):
        if a.split != "all" and r["split"] != a.split:
            continue
        bad = [c for c in r["checks"] if not c["pass"]]
        if bad or r["tool_errors"]:
            print("## %s r%d (%s) score %.2f · คำสั่งล้ม %d · %s/transcript.jsonl" % (
                r["task"], r["rep"], r["split"], r["score"], r["tool_errors"], r["dir"]))
            for c in bad:
                print("  ✗ %s: %s" % (c["id"], c.get("note", "")))
    return 0


def noise_of(rows):
    """ความแกว่งของรุ่นเดียวกัน (A/A) -> dict หรือ None (ถ้าไม่มีโจทย์ที่รันอย่างน้อย 2 รอบ)
    sd      = ส่วนเบี่ยงเบนของคะแนนระหว่างรอบของโจทย์เดียวกัน (รวมทุกโจทย์แบบ pooled · สกิลไม่ได้แก้อะไรเลย)
    se_mean = sd / sqrt(จำนวนรอบทั้งหมด) = ความแกว่งของค่าเฉลี่ยของรุ่นนี้
    สูตรนี้ใช้ได้กับ --reps เท่าใดก็ได้ (ไม่ใช้ max-min ซึ่งโตตามจำนวนรอบ)"""
    by = {}
    for r in rows:
        by.setdefault(r["task"], []).append(r["score"])
    vs = [(statistics.variance(v), len(v)) for v in by.values() if len(v) > 1]
    if not vs:
        return None
    var = sum(x * (n - 1) for x, n in vs) / sum(n - 1 for _, n in vs)
    trials = sum(n for _, n in vs)
    return {"tasks": len(vs), "trials": trials, "var": var, "sd": var ** 0.5, "se_mean": (var / trials) ** 0.5,
            "moved": sum(1 for v in by.values() if len(v) > 1 and max(v) - min(v) > 1e-9)}


def se_diff(b, c):
    """ความแกว่งของ "ส่วนต่างค่าเฉลี่ย" ระหว่างสองรุ่น = sqrt(se_mean_b^2 + se_mean_c^2) · None ถ้ารุ่นใดรันโจทย์ละรอบเดียว"""
    nb, nc = noise_of(b), noise_of(c)
    if nb is None or nc is None:
        return None
    return (nb["se_mean"] ** 2 + nc["se_mean"] ** 2) ** 0.5


def cmd_null(a):
    rows = collect(a.suite, a.label)
    for sp in ("train", "val", "test", "all"):
        rs = [r for r in rows if sp == "all" or r["split"] == sp]
        if not rs:
            continue
        n = noise_of(rs)
        if n is None:
            print("%s: ไม่มีข้อมูล (ต้องรันโจทย์ละอย่างน้อย 2 รอบ)" % sp)
            continue
        print("%s: %d โจทย์ %d รอบ · คะแนนต่างกันระหว่างรอบ %d โจทย์ · sd ระหว่างรอบ %.1f จุด · ความแกว่งของค่าเฉลี่ย %.1f จุด"
              " · ความแกว่งของส่วนต่างสองรุ่น %.1f จุด" % (sp, n["tasks"], n["trials"], n["moved"], n["sd"] * 100,
                                                   n["se_mean"] * 100, n["se_mean"] * 2 ** 0.5 * 100))
    print("สกิลรุ่นเดียวกัน โจทย์เดียวกัน ยังได้คะแนนต่างกันเท่านี้ → ประตูรับใช้เกณฑ์ = ค่าที่มากกว่าระหว่าง --eps กับ"
          " --z (1.5) × ความแกว่งของส่วนต่างสองรุ่น · ถ้าเป็น 0 ทุกโจทย์ ชุดโจทย์อาจง่ายไปหรือจำนวนรอบน้อยไป")
    return 0


def keyset(rows):
    return sorted((r["task"], r["rep"]) for r in rows)


def cmd_gate(a):
    b, c = collect(a.suite, a.base), collect(a.suite, a.cand)
    out, ok = [], True
    if keyset(b) != keyset(c):                      # ค่าเฉลี่ยของโจทย์คนละชุดเทียบกันไม่ได้
        only_b = sorted(set(keyset(b)) - set(keyset(c)))
        only_c = sorted(set(keyset(c)) - set(keyset(b)))
        print("ERROR สองรุ่นรันโจทย์ × รอบ ไม่ตรงกัน → เทียบไม่ได้ (รันให้ครบชุดเดียวกันก่อน)\n  มีเฉพาะ %s: %s\n  มีเฉพาะ %s: %s" % (
            a.base, only_b[:8], a.cand, only_c[:8]))
        return 2
    for lb, rows in ((a.base, b), (a.cand, c)):
        bad = [r for r in rows if r.get("timed_out") or not r.get("ok", True)]
        if bad:
            out.append("⚠ %s มี %d รอบจบไม่ปกติ (หมดเวลา/CLI ล้ม): %s → เปิด stderr.txt ดูว่าเป็นความผิดของสกิลหรือของระบบ"
                       " (โควตาหมด เครือข่าย) ถ้าเป็นของระบบให้รันรอบนั้นซ้ำก่อนตัดสิน" % (
                           lb, len(bad), ", ".join("%s-r%d" % (r["task"], r["rep"]) for r in bad[:6])))
        nr = [r for r in rows if "skill_read" in r and not r["skill_read"]]
        if nr and len(nr) < len(rows):              # ไม่เปิดทุกรอบ = แขนที่ไม่มีสกิล ไม่ต้องเตือน
            out.append("⚠ %s มี %d รอบที่เอเจนต์ไม่ได้เปิด SKILL.md → รอบนั้นไม่ได้วัดสกิล" % (lb, len(nr)))

    def thr(sp):
        rb = [r for r in b if sp == "all" or r["split"] == sp]
        rc = [r for r in c if sp == "all" or r["split"] == sp]
        sd = se_diff(rb, rc)
        return (max(a.eps, a.z * sd), sd) if sd is not None else (a.eps, None)

    for sp in ("train", "val"):
        sb, sc = summarize([r for r in b if r["split"] == sp]), summarize([r for r in c if r["split"] == sp])
        if not sb["n"] or not sc["n"]:
            out.append("%s: ไม่มีข้อมูลครบทั้งสองรุ่น" % sp)
            ok = False
            continue
        t, sd = thr(sp)
        d = sc["score"] - sb["score"]
        out.append("%s: %.1f%% → %.1f%% (%+.1f) · เกณฑ์ %.1f จุด%s · ค่าใช้จ่าย $%.2f → $%.2f · คำสั่ง %.1f → %.1f" % (
            sp, sb["score"] * 100, sc["score"] * 100, d * 100, t * 100,
            "" if sd is not None else " (ไม่รู้ความแกว่ง: โจทย์ละรอบเดียว ใช้ --eps)", sb["cost_usd"], sc["cost_usd"],
            sb["tool_calls"], sc["tool_calls"]))
        if sp == "val" and d < -t:
            ok = False
            out.append("  ✗ คะแนนชุด val ลดลงเกิน %.1f จุด → รุ่นใหม่จำโจทย์ชุด train (overfit) หรือทำของเดิมพัง" % (t * 100))
        if sp == "train" and d < -t:
            ok = False
            out.append("  ✗ คะแนนชุด train ลดลงเกิน %.1f จุด → การแก้ไม่ได้ผล" % (t * 100))
    if ok:
        sb, sc = summarize(b), summarize(c)
        t, sd = thr("all")
        k = a.cost_metric
        name = {"cost_usd": "ค่าใช้จ่าย", "tool_calls": "จำนวนคำสั่ง", "context_tokens": "โทเคนขาเข้า"}[k]
        gain, cheaper = sc["score"] - sb["score"], sc[k] < sb[k] * 0.9
        delta = "%s %.4g → %.4g (%+.0f%%)" % (name, sb[k], sc[k], (sc[k] / sb[k] - 1) * 100 if sb[k] else 0)
        out.append("รวม: %.1f%% → %.1f%% (%+.1f) · เกณฑ์ %.1f จุด = ค่าที่มากกว่าระหว่าง eps %.1f กับ z %.1f × ความแกว่งของส่วนต่าง %s" % (
            sb["score"] * 100, sc["score"] * 100, gain * 100, t * 100, a.eps * 100, a.z,
            "%.1f จุด" % (sd * 100) if sd is not None else "(ไม่รู้)"))
        if gain <= t and not cheaper:
            ok = False
            out.append("  ✗ คะแนนรวมดีขึ้น %+.1f จุด ไม่เกินเกณฑ์ %.1f จุด และ%sไม่ลดลงอย่างน้อย 10%% [%s] → ยังไม่มีหลักฐานพอให้รับ" % (
                gain * 100, t * 100, name, delta))
        else:
            out.append("  ✓ %s" % ("คะแนนรวมดีขึ้น %+.1f จุด มากกว่าเกณฑ์ %.1f จุด" % (gain * 100, t * 100) if gain > t
                                 else "คะแนนเท่าเดิม (อยู่ในช่วงความแกว่ง) และ%sลดลงอย่างน้อย 10%% [%s]" % (name, delta)))
    print("\n".join(out))
    print("ผล: %s %s แทน %s" % ("ACCEPT ✅ รับ" if ok else "REJECT ❌ ไม่รับ", a.cand, a.base))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("lint").add_argument("skill")
    r = sp.add_parser("run")
    r.add_argument("suite"); r.add_argument("--skill", required=True); r.add_argument("--label", required=True)
    r.add_argument("--split", default="all", choices=["train", "val", "test", "all"]); r.add_argument("--tasks")
    r.add_argument("--reps", type=int, default=2); r.add_argument("--accounts", default="yolo2,yolo3")
    r.add_argument("--par", type=int, default=4); r.add_argument("--model", default="sonnet")
    r.add_argument("--effort", default="medium")
    p = sp.add_parser("grade"); p.add_argument("suite"); p.add_argument("--label", required=True)
    p = sp.add_parser("failures"); p.add_argument("suite"); p.add_argument("--label", required=True)
    p.add_argument("--split", default="train", choices=["train", "val", "test", "all"],
                   help="ค่าเริ่มต้น train: ระหว่างแก้สกิลห้ามเปิดผลรายข้อของชุด val/test")
    p = sp.add_parser("null"); p.add_argument("suite"); p.add_argument("--label", required=True)
    p = sp.add_parser("report"); p.add_argument("suite"); p.add_argument("--labels")
    p = sp.add_parser("gate"); p.add_argument("suite"); p.add_argument("--base", required=True)
    p.add_argument("--cand", required=True); p.add_argument("--eps", type=float, default=0.02)
    p.add_argument("--z", type=float, default=1.5,
                   help="ต้องดีขึ้นกี่เท่าของความแกว่งของส่วนต่าง (1.5 = รุ่นที่ไม่ต่างจริงหลุดผ่านราว 7%% · 2 = ราว 2%%)")
    p.add_argument("--cost-metric", default="cost_usd", choices=["cost_usd", "tool_calls", "context_tokens"],
                   help="ตัวชี้วัดต้นทุนที่ใช้ตัดสินเมื่อคะแนนเท่าเดิม (ต้องเลือกก่อนวัดรุ่นใหม่)")
    a = ap.parse_args()
    for st in (sys.stdout, sys.stderr):              # console ของ Windows (cp874/cp1252) พิมพ์ไทยและสัญลักษณ์ไม่ได้
        if hasattr(st, "reconfigure"):
            st.reconfigure(encoding="utf-8", errors="replace")
    if a.cmd == "lint":
        print(json.dumps(lint(a.skill), ensure_ascii=False, indent=1))
        return 0
    a.suite = os.path.abspath(a.suite)
    if a.cmd == "run" and a.skill != "none":
        a.skill = os.path.abspath(a.skill)
    return {"run": cmd_run, "grade": cmd_grade, "report": cmd_report, "failures": cmd_failures, "gate": cmd_gate, "null": cmd_null}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
