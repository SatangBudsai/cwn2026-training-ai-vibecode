#!/usr/bin/env python3
"""grade.py <sandbox> <task.json>  ->  JSON บรรทัดเดียวบน stdout

ตัวตรวจชุดโจทย์ web-fixer (PawPantry) · 14 ข้อตาม CONTRACT.md · stdlib เท่านั้น
SUITE = โฟลเดอร์ของไฟล์นี้: serve.sh · oracle/ · files/TEST-PLAN.md · files/e2e/{playwright.config.js,global-setup.js}
        · tasks/<id>/petshop (เว็บเดิมที่มีบั๊ก)
"""
import glob
import json
import os
import random
import re
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time

SUITE = os.path.dirname(os.path.abspath(__file__))
PW_BIN = "/workspace/pw/bin/playwright"
PW_NODE_PATH = "/workspace/pw/node_modules"
NODE_MODULES_CANDIDATES = ["/workspace/nm/node_modules",
                           os.path.join(SUITE, "..", "base", "node_modules")]
IGNORED_TC = "TC-AUTH-02"                 # ล้มในเว็บที่ถูกด้วย → ไม่ใช้ตัดสิน
PORT_RANGE = (4500, 4699)
DEADLINE = time.time() + 450              # สัญญา: จบภายใน 8 นาที (เผื่อ 30 วินาที)
TC_RE = re.compile(r"TC-[A-Z]+-\d+", re.I)
ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
FAILED_STATUSES = ("failed", "timedOut", "interrupted")

# Next 16 ตรวจว่า build ถูกสั่งโดย AI agent (ดูจาก env เหล่านี้) แล้วหยุด build เพื่อแสดง upgrade nudge
# → ตัดออกจาก env ของทุกคำสั่งที่ตัวตรวจรัน ให้ผลตรวจไม่ขึ้นกับว่าใครเรียก grade.py
AGENT_ENV_PREFIXES = ("CLAUDE_CODE", "CODEX_", "CURSOR_", "COPILOT_")
AGENT_ENV_NAMES = {"AI_AGENT", "CLAUDECODE", "ANTIGRAVITY_AGENT", "AUGMENT_AGENT", "GEMINI_CLI",
                   "OPENCODE_CLIENT", "REPL_ID", "__NEXT_AGENT_UPGRADE"}

_PROCS = []          # Popen ที่เปิด (process group ของตัวเอง)
_PIDFILES = []       # .serve.pid ของเว็บที่เปิด
_TMPDIRS = []
_LOCK = threading.Lock()
_USED_PORTS = set()


# ───────────────────────── process / cleanup ─────────────────────────
def _killpg(p):
    try:
        os.killpg(p.pid, signal.SIGTERM)
    except Exception:
        pass


def _kill_pid(pid):
    for sig in (signal.SIGTERM, signal.SIGKILL):
        try:
            os.kill(pid, sig)
        except Exception:
            return
        for _ in range(20):
            try:
                os.kill(pid, 0)
            except Exception:
                return
            time.sleep(0.1)


def cleanup():
    for pf in list(_PIDFILES):
        try:
            _kill_pid(int(open(pf).read().strip()))
        except Exception:
            pass
    for p in list(_PROCS):
        _killpg(p)
    time.sleep(0.3)
    for p in list(_PROCS):
        try:
            os.killpg(p.pid, signal.SIGKILL)
        except Exception:
            pass
    for d in list(_TMPDIRS):
        shutil.rmtree(d, ignore_errors=True)


def _on_signal(signum, frame):
    raise SystemExit(128 + signum)


def remaining(cap):
    return max(5, min(cap, DEADLINE - time.time()))


def run(cmd, cwd=None, env=None, timeout=60):
    """รันคำสั่งใน process group ใหม่ · คืน (returncode|None เมื่อ timeout, output)"""
    e = {k: v for k, v in os.environ.items()
         if k not in AGENT_ENV_NAMES and not k.startswith(AGENT_ENV_PREFIXES)}
    e["NEXT_TELEMETRY_DISABLED"] = "1"
    if env:
        e.update(env)
    p = subprocess.Popen(cmd, cwd=cwd, env=e, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         stdin=subprocess.DEVNULL, start_new_session=True)
    with _LOCK:
        _PROCS.append(p)
    try:
        out, _ = p.communicate(timeout=timeout)
        rc = p.returncode
    except subprocess.TimeoutExpired:
        _killpg(p)
        try:
            out, _ = p.communicate(timeout=10)
        except Exception:
            out = b""
        rc = None
    return rc, (out or b"").decode("utf-8", "replace")


def mktemp(prefix):
    d = tempfile.mkdtemp(prefix=prefix)
    _TMPDIRS.append(d)
    return d


def short(s, n=160):
    s = ANSI_RE.sub("", str(s))
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1] + "…"


def last_line(text):
    lines = [l.strip() for l in ANSI_RE.sub("", text or "").splitlines() if l.strip()]
    return lines[-1] if lines else "(ไม่มีข้อความ)"


def build_error(text):
    """สรุปสาเหตุ build ล้มเป็นบรรทัดเดียว เช่น ./lib/x.ts:19:23 Error: Expression expected"""
    lines = [l.strip() for l in ANSI_RE.sub("", text or "").splitlines() if l.strip()]
    # webpack/SWC:  Error:   x Expression expected  ↵  ,-[/tmp/.../petshop/lib/pricing.ts:155:1]
    for i, l in enumerate(lines):
        m = re.match(r"^(?:Error:\s*)?x\s+(.+)$", l)
        if m and i + 1 < len(lines):
            at = re.search(r",-\[(.+?):(\d+):\d+\]", lines[i + 1])
            if at:
                f = re.sub(r"^.*?/petshop/", "", at.group(1))
                return "%s:%s %s" % (f, at.group(2), m.group(1).strip())
    loc = next((i for i, l in enumerate(lines) if re.match(r"^\.?/?[\w@./\[\]()-]+\.[cm]?[jt]sx?:\d+(:\d+)?$", l)), None)
    errs = [l for l in lines if re.match(r"^(Type error|Error|SyntaxError|TypeError|Module not found)\b", l)
            and "Turbopack build failed" not in l and "Build error occurred" not in l]
    if loc is not None:
        after = next((l for l in lines[loc + 1:] if re.match(r"^(Type error|Error|SyntaxError|Module not found)\b", l)), "")
        return "%s %s" % (lines[loc], after or (errs[0] if errs else ""))
    if errs:
        return errs[0]
    return last_line(text)


# ───────────────────────── web serving ─────────────────────────
def free_port():
    with _LOCK:
        ports = list(range(PORT_RANGE[0], PORT_RANGE[1] + 1))
        random.shuffle(ports)
        for port in ports:
            if port in _USED_PORTS:
                continue
            try:
                with socket.socket() as c:
                    c.settimeout(0.2)
                    if c.connect_ex(("127.0.0.1", port)) == 0:
                        continue           # มีคนฟังอยู่
                with socket.socket() as s:
                    s.bind(("127.0.0.1", port))
            except OSError:
                continue
            _USED_PORTS.add(port)
            return port
    raise RuntimeError("ไม่มีพอร์ตว่างในช่วง %d-%d" % PORT_RANGE)


def node_modules_target():
    for c in NODE_MODULES_CANDIDATES:
        if os.path.isdir(c):
            return c if c == NODE_MODULES_CANDIDATES[0] else os.path.realpath(c)
    return NODE_MODULES_CANDIDATES[0]


def copy_web(src, prefix):
    root = mktemp(prefix)
    dst = os.path.join(root, "petshop")
    shutil.copytree(src, dst, symlinks=True,
                    ignore=shutil.ignore_patterns(".next", "node_modules", ".serve.pid", ".serve.log"))
    os.symlink(node_modules_target(), os.path.join(dst, "node_modules"))   # ตาม CONTRACT: symlink
    return dst


def serve(src, label):
    """คัดลอกเว็บ → build → เปิด · คืน dict(url|None, note)"""
    if not os.path.isdir(src):
        return {"url": None, "note": "ไม่มีโฟลเดอร์เว็บ %s" % src}
    try:
        web = copy_web(src, "grade-%s-" % label)
    except Exception as ex:
        return {"url": None, "note": "คัดลอกเว็บไม่ได้: %s" % short(ex)}
    serve_sh = os.path.join(SUITE, "serve.sh")
    log = os.path.join(os.path.dirname(web), "serve.log")
    pidfile = os.path.join(web, ".serve.pid")
    with _LOCK:
        _PIDFILES.append(pidfile)
    for attempt in range(3):                       # ชนพอร์ตกับ process อื่น → ลองพอร์ตใหม่
        port = free_port()
        rc, out = run(["bash", serve_sh, web, str(port), log], timeout=remaining(150))
        if rc == 0 and "READY" in out:
            time.sleep(0.6)
            try:
                pid = int(open(pidfile).read().strip())
                os.kill(pid, 0)                    # node ของเราต้องยังอยู่ (ไม่ใช่คนอื่นตอบ health)
                return {"url": "http://127.0.0.1:%d" % port, "note": ""}
            except Exception:
                continue
        if "BUILD FAILED" in out:
            try:
                txt = open(log, encoding="utf-8", errors="replace").read()
            except Exception:
                txt = out
            return {"url": None, "build_failed": True, "note": "build ล้ม: %s" % short(build_error(txt))}
        if rc is None:
            return {"url": None, "note": "build/เปิดเว็บเกินเวลา"}
        try:
            if os.path.exists(pidfile):
                _kill_pid(int(open(pidfile).read().strip()))
        except Exception:
            pass
        if "EADDRINUSE" not in out:
            break
    return {"url": None, "note": "เว็บไม่ขึ้น: %s" % short(last_line(out))}


# ───────────────────────── playwright ─────────────────────────
def parse_report(path):
    """คืน (tests, errors) · tests = [{title, tcs, status, msg}]"""
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception:
        return None, []
    tests = []

    def walk(suite, parents, top):
        titles = parents if top else parents + [suite.get("title", "")]
        for spec in suite.get("specs", []) or []:
            full = " ".join([t for t in titles if t] + [spec.get("title", "")])
            statuses, msg = [], ""
            for t in spec.get("tests", []) or []:
                res = t.get("results", []) or []
                st = res[-1].get("status", "unknown") if res else "skipped"
                statuses.append(st)
                if st in FAILED_STATUSES and not msg and res:
                    errs = res[-1].get("errors") or ([res[-1]["error"]] if res[-1].get("error") else [])
                    if errs:
                        msg = errs[0].get("message", "") or ""
            if any(s in FAILED_STATUSES for s in statuses):
                status = "failed"
            elif statuses and all(s == "skipped" for s in statuses):
                status = "skipped"
            elif any(s == "passed" for s in statuses):
                status = "passed"
            else:
                status = "skipped"
            tests.append({"title": full, "tcs": {m.upper() for m in TC_RE.findall(full)},
                          "status": status, "msg": msg})
        for s in suite.get("suites", []) or []:
            walk(s, titles, False)

    for s in data.get("suites", []) or []:
        walk(s, [], True)                         # ชั้นบนสุด = ชื่อไฟล์ ไม่นับ
    errors = [short(e.get("message", ""), 200) for e in data.get("errors", []) or [] if isinstance(e, dict)]
    return tests, errors


def fail_reason(msg):
    """ย่อ error ของ Playwright เป็นข้อความสั้น เช่น expected ฿770 received ฿791"""
    m = ANSI_RE.sub("", msg or "")
    exp = re.search(r"Expected(?: string| pattern| value| substring)?:\s*(.+)", m)
    rec = re.search(r"Received(?: string| value)?:\s*(.+)", m)
    if exp and rec:
        return short("expected %s received %s" % (exp.group(1).strip(), rec.group(1).strip()), 140)
    loc = re.search(r"Locator:\s*(.+)", m)
    nf = re.search(r"element\(s\) not found|element is not (visible|enabled|attached)|Timeout \d+ms exceeded", m)
    if loc and (exp or nf):
        what = "expected %s" % exp.group(1).strip() if exp else ""
        return short("%s %s%s" % (loc.group(1).strip(), (nf.group(0) if nf else "ไม่ตรง"),
                                  (" · " + what) if what else ""), 140)
    first = next((l for l in m.splitlines() if l.strip()), "")
    return short(first, 140) or "ล้ม"


def run_oracle(url, out_dir, workers=6, grep=None):
    jf = os.path.join(out_dir, "oracle-%s.json" % (grep and "retry" or "full"))
    cmd = [PW_BIN, "test", "-c", "oracle.config.js"]
    if grep:
        cmd += ["-g", grep]
    env = {"BASE_URL": url, "JSON_OUT": jf, "OUT_DIR": os.path.join(out_dir, "oracle-out"),
           "NODE_PATH": PW_NODE_PATH, "WORKERS": str(workers), "HOLD_MS": "0", "CI": "1"}
    rc, out = run(cmd, cwd=os.path.join(SUITE, "oracle"), env=env, timeout=remaining(180))
    tests, errors = parse_report(jf)
    if tests is None:
        return None, "oracle ไม่ได้ผล: %s" % short(last_line(out)) if rc is not None else "oracle เกินเวลา"
    if rc is None:
        return tests, "oracle เกินเวลา"
    if errors:
        return tests, "oracle error: %s" % errors[0]
    return tests, ""


def oracle_with_retry(url, out_dir):
    tests, err = run_oracle(url, out_dir)
    if tests is None or err:
        return tests, err
    failed = sorted({tc for t in tests if t["status"] == "failed" for tc in t["tcs"]} - {IGNORED_TC})
    if failed and DEADLINE - time.time() > 90:     # รันซ้ำเฉพาะข้อที่ล้ม กัน flaky
        re_tests, re_err = run_oracle(url, out_dir, workers=2,
                                 grep="(" + "|".join(re.escape(t) for t in failed) + ")\\b")
        if re_tests and not re_err:              # รอบซ้ำต้องสมบูรณ์ จึงใช้ผลได้
            fixed_titles = {t["title"] for t in re_tests if t["status"] == "passed"}
            for t in tests:
                if t["status"] == "failed" and t["title"] in fixed_titles:
                    t["status"], t["msg"] = "passed", ""
    return tests, ""


def run_agent_tests(sandbox, url, out_dir, label):
    """คืน (tests|None, err) · err = สาเหตุที่ทำให้ผลรันไม่สมบูรณ์ (error ของ reporter, exit code ผิด, เกินเวลา)"""
    jf = os.path.join(out_dir, "agent-%s.json" % label)
    env = {"BASE_URL": url, "JSON_OUT": jf, "NODE_PATH": PW_NODE_PATH, "CI": "1"}
    rc, out = run([PW_BIN, "test", "-c", "e2e/playwright.config.js"], cwd=sandbox, env=env,
                  timeout=remaining(180))
    tests, errors = parse_report(jf)
    if rc is None:
        return tests, "เทสต์ของเอเจนต์เกิน 180 วินาที"
    if tests is None:
        return None, "รันเทสต์ของเอเจนต์ไม่ได้: %s" % short(last_line(out))
    if errors:
        return tests, "เทสต์ของเอเจนต์ error: %s" % errors[0]
    if rc != 0 and not any(t["status"] == "failed" for t in tests):
        return tests, "playwright จบด้วย exit code %d: %s" % (rc, short(last_line(out)))
    return tests, ""


def agent_specs(sandbox):
    e2e = os.path.join(sandbox, "e2e")
    if not os.path.isdir(e2e):
        return []
    return [p for p in glob.glob(os.path.join(e2e, "**", "*.spec.js"), recursive=True)
            if "node_modules" not in p]


def install_e2e_config(sandbox):
    src = os.path.join(SUITE, "files", "e2e")
    dst = os.path.join(sandbox, "e2e")
    for f in ("playwright.config.js", "global-setup.js"):
        shutil.copyfile(os.path.join(src, f), os.path.join(dst, f))


# ───────────────────────── static checks ─────────────────────────
def report_tcs(sandbox):
    """TC ในคอลัมน์แรกของตารางใน BUGS-FOUND.md · None = ไม่มีไฟล์"""
    path = os.path.join(sandbox, "BUGS-FOUND.md")
    if not os.path.isfile(path):
        return None
    tcs = []
    for line in open(path, encoding="utf-8", errors="replace"):
        s = line.strip()
        if not s.startswith("|"):
            continue
        first_cell = s[1:].split("|", 1)[0]      # หัวตาราง/เส้นคั่นไม่มีรหัส TC จึงไม่ถูกนับเอง
        tcs += [m.upper() for m in TC_RE.findall(first_cell)]
    return tcs


def check(cid, ok, note):
    return {"id": cid, "pass": bool(ok), "note": note}


def static_checks(sandbox, bugs):
    out = {}
    rep = report_tcs(sandbox)
    planted = {tc for b in bugs for tc in b["tc"]}
    for b in bugs:
        cid = "reported_%s" % b["id"]
        if rep is None:
            out[cid] = check(cid, False, "ไม่มี BUGS-FOUND.md")
        else:
            hit = [tc for tc in b["tc"] if tc in rep]
            out[cid] = check(cid, hit, "รายงาน %s แล้ว" % ",".join(hit) if hit
                             else "ไม่มีแถวที่คอลัมน์แรกเป็น %s" % "/".join(b["tc"]))
    if rep is None:
        out["no_false_alarm"] = check("no_false_alarm", False, "ไม่มี BUGS-FOUND.md")
    elif not rep:
        out["no_false_alarm"] = check("no_false_alarm", False, "BUGS-FOUND.md ไม่มีแถวที่มีรหัส TC")
    else:
        extra = sorted(set(rep) - planted - {IGNORED_TC})
        out["no_false_alarm"] = check("no_false_alarm", not extra,
                                      "รายงานเกิน: %s" % ", ".join(extra) if extra
                                      else "ทุกแถวตรงกับบั๊กที่ฝัง (%d แถว)" % len(rep))
    # evidence
    missing = []
    for b in bugs:
        ok = False
        for tc in b["tc"]:
            for p in glob.glob(os.path.join(sandbox, "evidence", "*%s*.png" % tc)):
                try:
                    if os.path.getsize(p) > 5 * 1024 and open(p, "rb").read(8) == b"\x89PNG\r\n\x1a\n":
                        ok = True
                except Exception:
                    pass
        if not ok:
            missing.append("/".join(b["tc"]))
    out["evidence"] = check("evidence", not missing,
                            "ไม่มี evidence/*<TC>*.png (>5KB) ของ %s" % ", ".join(missing) if missing
                            else "มีภาพหลักฐานครบ %d บั๊ก" % len(bugs))
    # plan
    orig, mine = os.path.join(SUITE, "files", "TEST-PLAN.md"), os.path.join(sandbox, "TEST-PLAN.md")
    if not os.path.isfile(mine):
        out["plan_untouched"] = check("plan_untouched", False, "ไม่มี TEST-PLAN.md ใน sandbox")
    else:
        try:
            same = open(orig, "rb").read() == open(mine, "rb").read()
            out["plan_untouched"] = check("plan_untouched", same, "ตรงกับต้นฉบับ" if same
                                          else "TEST-PLAN.md ถูกแก้ (ไม่ตรงกับต้นฉบับ)")
        except Exception as ex:
            out["plan_untouched"] = check("plan_untouched", False, "อ่านแผนต้นฉบับไม่ได้: %s" % short(ex))
    return out


# ───────────────────────── main ─────────────────────────
def grade(sandbox, task):
    bugs = [{"id": str(b["id"]), "tc": [t.upper() for t in b.get("tc", [])]} for b in task.get("bugs", [])]
    planted = {tc for b in bugs for tc in b["tc"]}
    res = {}
    res.update(static_checks(sandbox, bugs))      # ก่อนรันเทสต์ (เทสต์อาจเขียน evidence ทับ)

    specs, spec_note = agent_specs(sandbox), "ไม่มี e2e/*.spec.js"
    if specs:
        try:
            install_e2e_config(sandbox)
        except Exception as ex:
            specs, spec_note = [], "วาง config ของ e2e ไม่ได้: %s" % short(ex)
    work = mktemp("grade-work-")

    # เปิดเว็บที่แก้แล้ว + เว็บเดิมที่มีบั๊ก พร้อมกัน
    fixed_src = os.path.join(sandbox, "petshop")
    buggy_src = os.path.join(SUITE, "tasks", str(task.get("id")), "petshop")
    servers = {}

    def _serve(key, src):
        try:
            servers[key] = serve(src, key)
        except Exception as ex:
            servers[key] = {"url": None, "note": "เปิดเว็บไม่ได้: %s" % short(ex)}

    jobs = []
    if os.path.isdir(fixed_src):
        jobs.append(threading.Thread(target=_serve, args=("fixed", fixed_src), daemon=True))
    else:
        servers["fixed"] = {"url": None, "note": "ไม่มี petshop/ ใน sandbox"}
    if specs:
        if os.path.isdir(buggy_src):
            jobs.append(threading.Thread(target=_serve, args=("buggy", buggy_src), daemon=True))
        else:
            servers["buggy"] = {"url": None, "note": "ไม่มีเว็บต้นฉบับของโจทย์ %s" % buggy_src}
    for j in jobs:
        j.start()
    for j in jobs:
        j.join()
    fixed, buggy = servers.get("fixed", {}), servers.get("buggy", {})

    # 1) oracle กับเว็บที่แก้แล้ว  ‖  2) เทสต์ของเอเจนต์กับเว็บเดิมที่มีบั๊ก (คนละเซิร์ฟเวอร์ รันพร้อมกันได้)
    oracle_box, buggy_box = {}, {}

    def _oracle():
        try:
            oracle_box["r"] = oracle_with_retry(fixed["url"], work)
        except Exception as ex:
            oracle_box["r"] = (None, "oracle error: %s" % short(ex))

    def _buggy():
        try:
            buggy_box["r"] = run_agent_tests(sandbox, buggy["url"], work, "buggy")
        except Exception as ex:
            buggy_box["r"] = (None, "รันเทสต์ไม่ได้: %s" % short(ex))

    jobs = []
    if fixed.get("url"):
        jobs.append(threading.Thread(target=_oracle, daemon=True))
    if specs and buggy.get("url"):
        jobs.append(threading.Thread(target=_buggy, daemon=True))
    for j in jobs:
        j.start()
    for j in jobs:
        j.join()

    # ── fixed_* / no_regression
    if not fixed.get("url"):
        for b in bugs:
            res["fixed_" + b["id"]] = check("fixed_" + b["id"], False, fixed.get("note", "เว็บไม่ขึ้น"))
        res["no_regression"] = check("no_regression", False, fixed.get("note", "เว็บไม่ขึ้น"))
    else:
        otests, oerr = oracle_box.get("r", (None, "oracle ไม่ได้รัน"))
        if not otests or oerr:                     # ไม่มีผล หรือผลไม่สมบูรณ์ (error/เกินเวลา) → ไม่ผ่านทุกข้อที่ใช้ oracle
            why = oerr or "oracle ไม่มีผล"
            for b in bugs:
                res["fixed_" + b["id"]] = check("fixed_" + b["id"], False, why)
            res["no_regression"] = check("no_regression", False, why)
        else:
            for b in bugs:
                cid = "fixed_" + b["id"]
                bad, seen = [], set()
                for t in otests:
                    for tc in b["tc"]:
                        if tc in t["tcs"]:
                            seen.add(tc)
                            if t["status"] != "passed":
                                bad.append("%s ยังล้ม: %s" % (tc, fail_reason(t["msg"])) if t["status"] == "failed"
                                           else "%s ไม่ได้รัน (%s)" % (tc, t["status"]))
                unseen = [tc for tc in b["tc"] if tc not in seen]
                if unseen:
                    bad.append("oracle ไม่มีเทสต์ %s" % ",".join(unseen))
                res[cid] = check(cid, not bad, "; ".join(bad) if bad else "%s ผ่านแล้ว" % ",".join(b["tc"]))
            others = [t for t in otests if not (t["tcs"] & (planted | {IGNORED_TC}))]
            broken = [t for t in others if t["status"] == "failed"]
            notrun = [t for t in others if t["status"] != "passed" and t["status"] != "failed"]
            if broken or notrun:
                parts = []
                if broken:
                    first = broken[0]
                    tc = ",".join(sorted(first["tcs"])) or short(first["title"], 40)
                    parts.append("ล้ม %d ข้อ: %s · %s: %s" % (len(broken), ", ".join(
                        ",".join(sorted(t["tcs"])) or short(t["title"], 40) for t in broken[:6]),
                        tc, fail_reason(first["msg"])))
                if notrun:
                    parts.append("ไม่ได้รัน/ถูกข้าม %d ข้อ: %s" % (len(notrun), ", ".join(
                        ",".join(sorted(t["tcs"])) or short(t["title"], 40) for t in notrun[:6])))
                res["no_regression"] = check("no_regression", False, short(" · ".join(parts), 260))
            elif not others:
                res["no_regression"] = check("no_regression", False, "oracle ไม่มีเทสต์อื่นให้ตรวจ")
            else:
                res["no_regression"] = check("no_regression", True, "TC อื่นผ่านครบ %d เทสต์" % len(others))

    # ── caught_*
    if not specs:
        for b in bugs:
            res["caught_" + b["id"]] = check("caught_" + b["id"], False, spec_note)
    elif not buggy.get("url"):
        for b in bugs:
            res["caught_" + b["id"]] = check("caught_" + b["id"], False,
                                             "เปิดเว็บที่มีบั๊กไม่ได้: %s" % buggy.get("note", ""))
    else:
        btests, berr = buggy_box.get("r", (None, "ไม่ได้รัน"))
        for b in bugs:
            cid = "caught_" + b["id"]
            if not btests:
                res[cid] = check(cid, False, berr or "ไม่มีผลเทสต์")
                continue
            hit = [t for t in btests if t["status"] == "failed" and t["tcs"] & set(b["tc"])]
            named = [t for t in btests if t["tcs"] & set(b["tc"])]
            if berr:                                # ผลรันไม่สมบูรณ์ → เชื่อไม่ได้ว่าล้มเพราะบั๊ก
                res[cid] = check(cid, False, "ผลรันบนเว็บที่มีบั๊กไม่สมบูรณ์: %s" % berr)
                continue
            if hit:
                note = "เทสต์ %s ล้มบนเว็บที่มีบั๊ก" % ",".join(sorted(hit[0]["tcs"] & set(b["tc"])))
            elif named:
                note = "มีเทสต์ %s แต่ไม่ล้มบนเว็บที่มีบั๊ก (จับบั๊กไม่ได้)" % "/".join(b["tc"])
            else:
                note = "ไม่มีเทสต์ที่ชื่อมี %s" % "/".join(b["tc"])
            res[cid] = check(cid, hit, note)

    # ── tests_green (เทสต์ของเอเจนต์กับเว็บที่แก้แล้ว · หลัง oracle เพื่อไม่ให้ reset ข้อมูลชนกัน)
    if not specs:
        res["tests_green"] = check("tests_green", False, spec_note)
    elif not fixed.get("url"):
        res["tests_green"] = check("tests_green", False, fixed.get("note", "เว็บไม่ขึ้น"))
    else:
        gtests, gerr = run_agent_tests(sandbox, fixed["url"], work, "fixed")
        if not gtests:
            res["tests_green"] = check("tests_green", False, gerr or "ไม่มีเทสต์ที่รันได้")
        else:
            failed = [t for t in gtests if t["status"] == "failed"]
            notpass = [t for t in gtests if t["status"] not in ("passed", "failed")]
            passed = [t for t in gtests if t["status"] == "passed"]
            if failed:
                f = failed[0]
                note = "ล้ม %d/%d เทสต์ เช่น %s: %s" % (len(failed), len(gtests), short(f["title"], 50),
                                                      fail_reason(f["msg"]))
                res["tests_green"] = check("tests_green", False, note)
            elif gerr:
                res["tests_green"] = check("tests_green", False, gerr)
            elif notpass:                           # ต้องผ่านทุกเทสต์ → skipped/ไม่ได้รัน = ไม่ผ่าน
                res["tests_green"] = check("tests_green", False, "ไม่ได้รัน/ถูกข้าม %d/%d เทสต์ เช่น %s" % (
                    len(notpass), len(gtests), short(notpass[0]["title"], 60)))
            else:
                res["tests_green"] = check("tests_green", True, "ผ่านครบ %d เทสต์" % len(passed))
    return res


def order(bugs):
    ids = [b["id"] for b in bugs]
    return ([("fixed_" + i) for i in ids] + ["no_regression", "tests_green"] + [("caught_" + i) for i in ids]
            + [("reported_" + i) for i in ids] + ["no_false_alarm", "evidence", "plan_untouched"])


def main():
    signal.signal(signal.SIGTERM, _on_signal)
    signal.signal(signal.SIGINT, _on_signal)
    signal.signal(signal.SIGHUP, _on_signal)
    bugs, res, fatal = [], {}, ""
    try:
        if len(sys.argv) != 3:
            raise ValueError("usage: grade.py <sandbox> <task.json>")
        sandbox = os.path.abspath(sys.argv[1])
        task = json.load(open(sys.argv[2], encoding="utf-8"))
        bugs = [{"id": str(b["id"]), "tc": list(b.get("tc", []))} for b in task.get("bugs", [])]
        if not os.path.isdir(sandbox):
            fatal = "ไม่มีโฟลเดอร์ sandbox %s" % sandbox
        else:
            res = grade(sandbox, task)
    except SystemExit as ex:                # ถูก signal ระหว่างตรวจ
        fatal = "ตัวตรวจถูกสั่งหยุดกลางคัน (exit %s)" % ex.code
    except BaseException as ex:             # ห้าม crash: ทุกข้อที่ยังไม่มีผล = ไม่ผ่าน
        fatal = "ตัวตรวจ error: %s" % short(repr(ex))
    finally:
        try:
            cleanup()
        except Exception:
            pass
    checks = [res.get(cid) or check(cid, False, fatal or "ไม่ได้ตรวจ") for cid in order(bugs)]
    score = round(sum(c["pass"] for c in checks) / len(checks), 3) if checks else 0.0
    sys.stdout.write(json.dumps({"score": score, "checks": checks}, ensure_ascii=False) + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
