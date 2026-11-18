#!/usr/bin/env python3
"""ma_common: shared helpers for the yolo / cyolo / agent-team skills.

An identical copy lives in each skill's scripts/ folder so every skill works on
its own after a plain folder copy. Standard library only, Python 3.8+.

Never reads or forwards credential files (.credentials.json, .claude.json,
auth.json). Never stores prompt text in the ledger.
"""
import datetime as _dt
import fcntl
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time

BASE = os.environ.get("MA_BASE", os.path.expanduser("~/ai-accounts"))
CLAUDE_ROOT = os.path.join(BASE, ".Claude")
CODEX_ROOT = os.path.join(BASE, ".Codex")
TEAM_ROOT = os.environ.get("MA_TEAM_DIR", "/workspace/.agent-team")
GLOBAL_LEDGER = os.path.join(TEAM_ROOT, "ledger.jsonl")
CACHE_DIR = os.path.join(TEAM_ROOT, ".cache")

CLAUDE_MODELS = ["opus", "sonnet", "haiku", "fable"]
CLAUDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"]
CODEX_EFFORT_ORDER = ["minimal", "low", "medium", "high", "xhigh", "max", "ultra"]

# difficulty -> (claude model, claude effort, codex effort)
DIFFICULTY = {
    1: ("haiku", "low", "low"),
    2: ("sonnet", "medium", "medium"),
    3: ("opus", "high", "high"),
    4: ("opus", "xhigh", "xhigh"),
    5: ("opus", "max", "max"),
    6: ("opus", "max", "ultra"),
}

LEDGER_FIELDS = ["ts_start", "ts_end", "run_id", "node", "account", "cli", "model",
                 "effort", "duration_s", "input_tokens", "cached_input_tokens",
                 "cache_write_tokens", "output_tokens", "reasoning_tokens", "cost_usd",
                 "status", "error", "prompt_chars", "result_chars"]

_ledger_lock = threading.Lock()


# ----------------------------------------------------------------- basics
def now_iso():
    return _dt.datetime.now().astimezone().isoformat(timespec="seconds")


def fmt_ts(epoch):
    if not epoch:
        return "-"
    return _dt.datetime.fromtimestamp(float(epoch)).astimezone().strftime("%Y-%m-%d %H:%M")


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path


def cli_of(account):
    if re.fullmatch(r"yolo\d+", account or ""):
        return "claude"
    if re.fullmatch(r"cyolo\d+", account or ""):
        return "codex"
    return None


def side_of(account):
    c = cli_of(account)
    return {"claude": "yolo", "codex": "cyolo"}.get(c)


def _num_key(name):
    m = re.search(r"(\d+)$", name)
    return int(m.group(1)) if m else 0


def list_accounts(side=None):
    """Accounts that have both an account folder and a wrapper command."""
    out = []
    for s, root in (("yolo", CLAUDE_ROOT), ("cyolo", CODEX_ROOT)):
        if side and side != s:
            continue
        names = []
        for d in glob.glob(os.path.join(root, s + "[0-9]*")):
            n = os.path.basename(d)
            if re.fullmatch(s + r"\d+", n) and os.path.isdir(d) and shutil.which(n):
                names.append(n)
        out += sorted(names, key=_num_key)
    return out


def table(headers, rows):
    """Plain markdown table (renders in a terminal and in Claude Code)."""
    rows = [["" if c is None else str(c) for c in r] for r in rows]
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    for r in rows:
        lines.append("| " + " | ".join(c.replace("|", "/").replace("\n", " ") for c in r) + " |")
    return "\n".join(lines)


def short(text, n=160):
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    return text if len(text) <= n else text[: n - 1] + "…"


# ------------------------------------------------------------ simulation
def _env_list(name):
    return [x.strip() for x in os.environ.get(name, "").split(",") if x.strip()]


def simulated_limit(account):
    return account in _env_list("MA_SIMULATE_LIMIT")


# ----------------------------------------------------------------- ledger
def ledger_append(row, run_dir=None):
    """Append one row to the global ledger (and the run ledger when given)."""
    full = {k: row.get(k) for k in LEDGER_FIELDS}
    for k, v in row.items():
        if k not in full and k not in ("prompt", "result"):
            full[k] = v
    line = json.dumps(full, ensure_ascii=False) + "\n"
    targets = [GLOBAL_LEDGER]
    if run_dir:
        targets.append(os.path.join(run_dir, "ledger.jsonl"))
    with _ledger_lock:
        for path in targets:
            ensure_dir(os.path.dirname(path))
            with open(path, "a", encoding="utf-8") as f:
                fcntl.flock(f, fcntl.LOCK_EX)
                f.write(line)
                fcntl.flock(f, fcntl.LOCK_UN)


def read_ledger(path=None):
    path = path or GLOBAL_LEDGER
    rows = []
    if not os.path.exists(path):
        return rows
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rows.append(json.loads(line))
                except ValueError:
                    pass
    return rows


def row_tokens(r):
    """Tokens counted against budgets: everything except cache reads.

    Claude reports input_tokens without cache; Codex input_tokens already
    includes cached_input_tokens, so cached tokens are subtracted for Codex.
    """
    i = r.get("input_tokens") or 0
    if r.get("cli") == "codex":
        i -= r.get("cached_input_tokens") or 0
    return max(i, 0) + (r.get("cache_write_tokens") or 0) + (r.get("output_tokens") or 0)


def stats_tables(rows, by=("account", "model", "run_id")):
    rows = [r for r in rows if r.get("event") is None]
    out = []
    names = {"account": "บัญชี", "model": "รุ่น", "run_id": "run"}
    for key in by:
        groups = {}
        for r in rows:
            k = r.get(key) or "-"
            if key == "model" and r.get("effort"):
                k = "%s/%s" % (k, r.get("effort"))
            groups.setdefault(k, []).append(r)
        body = []
        tot = dict(n=0, ok=0, fail=0, inp=0, cin=0, cw=0, out=0, rs=0, cost=0.0, dur=0.0)
        for k in sorted(groups):
            g = groups[k]
            n = len(g)
            ok = sum(1 for r in g if r.get("status") == "ok")
            vals = dict(
                inp=sum(r.get("input_tokens") or 0 for r in g),
                cin=sum(r.get("cached_input_tokens") or 0 for r in g),
                cw=sum(r.get("cache_write_tokens") or 0 for r in g),
                out=sum(r.get("output_tokens") or 0 for r in g),
                rs=sum(r.get("reasoning_tokens") or 0 for r in g),
                cost=sum(r.get("cost_usd") or 0 for r in g),
                dur=sum(r.get("duration_s") or 0 for r in g))
            body.append([k, n, ok, n - ok, vals["inp"], vals["cin"], vals["cw"], vals["out"],
                         vals["rs"], "%.4f" % vals["cost"], "%.1f" % vals["dur"],
                         "%.1f" % (vals["dur"] / n if n else 0)])
            tot["n"] += n
            tot["ok"] += ok
            tot["fail"] += n - ok
            for x in ("inp", "cin", "cw", "out", "rs", "cost", "dur"):
                tot[x] += vals[x]
        body.append(["**รวม**", tot["n"], tot["ok"], tot["fail"], tot["inp"], tot["cin"], tot["cw"],
                     tot["out"], tot["rs"], "%.4f" % tot["cost"], "%.1f" % tot["dur"],
                     "%.1f" % (tot["dur"] / tot["n"] if tot["n"] else 0)])
        out.append("### ตาม%s\n" % names.get(key, key) + table(
            [names.get(key, key), "ครั้ง", "สำเร็จ", "ล้ม", "input", "cached_in", "cache_write",
             "output", "reasoning", "cost_usd(ราคาตามรายการ)", "เวลารวม s", "เฉลี่ย s"], body))
    return "\n\n".join(out)


# ------------------------------------------------------------ error kinds
_LIMIT_RE = re.compile(r"usage limit|rate.?limit|limit reached|quota|too many requests|429|"
                       r"hit your limit|out of extra usage|exceeded", re.I)
_EXPIRED_RE = re.compile(r"OAuth session expired|could not be refreshed|token.*expired|"
                         r"Failed to authenticate|invalid.*(token|credential)|refresh_token", re.I)
_NOLOGIN_RE = re.compile(r"Not logged in|Please run /login|401 Unauthorized|Missing bearer|"
                         r"login required|codex login", re.I)


def classify_error(text):
    t = text or ""
    if t.startswith("simulated"):
        return "limit"
    if _EXPIRED_RE.search(t):
        return "auth_expired"
    if _NOLOGIN_RE.search(t):
        return "not_logged_in"
    if _LIMIT_RE.search(t):
        return "limit"
    if "timeout" in t.lower():
        return "timeout"
    return "error"


SWITCHABLE = ("limit", "auth_expired", "not_logged_in")


# ------------------------------------------------------------ quota cache
def _quota_cache_path():
    return os.path.join(CACHE_DIR, "quota.json")


def quota_cache_load():
    try:
        with open(_quota_cache_path(), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def quota_cache_put(account, info):
    ensure_dir(CACHE_DIR)
    path = _quota_cache_path()
    with open(path + ".lock", "a") as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        data = quota_cache_load()
        data[account] = info
        tmp = path + ".tmp%d" % os.getpid()
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        os.replace(tmp, path)
        fcntl.flock(lk, fcntl.LOCK_UN)


# ------------------------------------------------------------ Claude side
def _claude_rate_info(ev):
    info = ev.get("rate_limit_info") or {}
    w = info.get("unifiedWindows") or {}
    q = {"source": "stream rate_limit_event", "as_of": now_iso(), "status": info.get("status")}
    if "five_hour" in w:
        q["session_pct"] = round(100 * float(w["five_hour"].get("utilization") or 0))
        q["session_resets"] = fmt_ts(w["five_hour"].get("resetsAt"))
    if "seven_day" in w:
        q["week_pct"] = round(100 * float(w["seven_day"].get("utilization") or 0))
        q["week_resets"] = fmt_ts(w["seven_day"].get("resetsAt"))
    return q


def call_claude(account, prompt, model="sonnet", effort="medium", cwd=None, timeout=900,
                json_schema=None, extra_args=None, run_dir=None, run_id=None, node=None,
                on_event=None, proc_holder=None, ledger=True, simulate_limit=False, env=None, no_sim=False):
    """Run `yoloN -p` once (non-interactive) and return a result dict.

    Uses stream-json so tokens and rate-limit info are visible while running.
    exit code 0 does not mean success: is_error/result are checked.
    """
    t0 = time.time()
    ts_start = now_iso()
    res = dict(ok=False, account=account, cli="claude", model=model, effort=effort, result="",
               error="", status="error", real_model=None, usage={}, cost_usd=None,
               structured_output=None, session_id=None)
    if (simulated_limit(account) and not no_sim) or simulate_limit:
        time.sleep(0.05)
        res.update(error="simulated: usage limit reached (MA_SIMULATE_LIMIT)", status="limit")
    else:
        cmd = [account, "-p", prompt, "--model", model, "--effort", effort,
               "--output-format", "stream-json", "--verbose", "--no-session-persistence",
               "--strict-mcp-config"]
        if json_schema:
            cmd += ["--json-schema", json_schema if isinstance(json_schema, str) else json.dumps(json_schema)]
        if extra_args:
            cmd += list(extra_args)
        final = None
        live = {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0}
        try:
            p = subprocess.Popen(cmd, cwd=cwd or None, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                 stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace",
                                 start_new_session=True)
            if proc_holder is not None:
                proc_holder.append(p)
            fired = []
            timer = threading.Timer(timeout, lambda: (fired.append(1), _kill(p)))
            timer.start()
            err_chunks = []
            et = threading.Thread(target=lambda: err_chunks.append(p.stderr.read()), daemon=True)
            et.start()
            for line in p.stdout:
                line = line.strip()
                if not line.startswith("{"):
                    continue
                try:
                    ev = json.loads(line)
                except ValueError:
                    continue
                typ = ev.get("type")
                if typ == "assistant":
                    u = (ev.get("message") or {}).get("usage") or {}
                    live["input"] += u.get("input_tokens") or 0
                    live["cache_write"] += u.get("cache_creation_input_tokens") or 0
                    live["cache_read"] += u.get("cache_read_input_tokens") or 0
                    live["output"] += u.get("output_tokens") or 0
                    if on_event:
                        on_event("tokens", dict(live))
                elif typ == "rate_limit_event":
                    q = _claude_rate_info(ev)
                    q["account"] = account
                    quota_cache_put(account, q)
                    if on_event:
                        on_event("rate", q)
                elif typ == "result":
                    final = ev
            p.wait()
            timer.cancel()
            et.join(2)
            timed_out = bool(fired)
            if final is None:
                # killed / crashed: keep the tokens already reported by the stream
                res["usage"] = {"input_tokens": live["input"], "cache_creation_input_tokens": live["cache_write"],
                                "cache_read_input_tokens": live["cache_read"], "output_tokens": live["output"]}
                stderr = "".join(err_chunks)
                res["error"] = "timeout after %ss" % timeout if timed_out else \
                    short(stderr or "no result (exit %s)" % p.returncode, 300)
                res["status"] = classify_error(res["error"])
            else:
                res["result"] = final.get("result") or ""
                res["session_id"] = final.get("session_id")
                res["cost_usd"] = final.get("total_cost_usd")
                res["usage"] = final.get("usage") or {}
                mu = final.get("modelUsage") or {}
                res["real_model"] = ",".join(mu.keys()) or None
                res["structured_output"] = final.get("structured_output")
                if final.get("is_error") or final.get("subtype") not in (None, "success"):
                    res["error"] = short(res["result"] or final.get("subtype") or "is_error", 300)
                    res["status"] = classify_error(res["error"])
                else:
                    res["ok"] = True
                    res["status"] = "ok"
        except FileNotFoundError:
            res["error"] = "ไม่พบคำสั่ง %s" % account
    u = res["usage"] or {}
    res.update(ts_start=ts_start, ts_end=now_iso(), duration_s=round(time.time() - t0, 2),
               input_tokens=u.get("input_tokens") or 0,
               cached_input_tokens=u.get("cache_read_input_tokens") or 0,
               cache_write_tokens=u.get("cache_creation_input_tokens") or 0,
               output_tokens=u.get("output_tokens") or 0,
               reasoning_tokens=(u.get("output_tokens_details") or {}).get("thinking_tokens") or 0)
    if ledger:
        ledger_append(_ledger_row(res, prompt, run_id, node), run_dir)
    return res


def _kill(p):
    try:
        os.killpg(p.pid, 15)
    except OSError:
        pass


def _ledger_row(res, prompt, run_id, node):
    return dict(ts_start=res["ts_start"], ts_end=res["ts_end"], run_id=run_id, node=node,
                account=res["account"], cli=res["cli"], model=res["model"], effort=res["effort"],
                duration_s=res["duration_s"], input_tokens=res["input_tokens"],
                cached_input_tokens=res["cached_input_tokens"],
                cache_write_tokens=res["cache_write_tokens"], output_tokens=res["output_tokens"],
                reasoning_tokens=res["reasoning_tokens"],
                cost_usd=res.get("cost_usd") if res["cli"] == "claude" else None,
                status=res["status"], error=short(res["error"], 200) if res["error"] else None,
                prompt_chars=len(prompt or ""), result_chars=len(res.get("result") or ""),
                real_model=res.get("real_model"))


_USAGE_RE = re.compile(r"Current (session|week \(([^)]*)\)):\s*(\d+)% used(?:\s*·\s*resets\s*(.+))?")


def claude_quota(account, timeout=60):
    """Built-in `/usage` (no model call). Returns parsed lines or no-data."""
    q = {"account": account, "as_of": now_iso(), "source": "/usage"}
    try:
        p = subprocess.run([account, "-p", "/usage"], stdin=subprocess.DEVNULL, capture_output=True,
                           text=True, timeout=timeout, encoding="utf-8", errors="replace", cwd="/tmp")
        txt = p.stdout
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        q["note"] = "อ่านไม่ได้: %s" % short(e, 80)
        return q
    found = False
    for m in _USAGE_RE.finditer(txt):
        found = True
        if m.group(1) == "session":
            q["session_pct"] = int(m.group(3))
            q["session_resets"] = (m.group(4) or "").strip()
        elif m.group(2) == "all models":
            q["week_pct"] = int(m.group(3))
            q["week_resets"] = (m.group(4) or "").strip()
        else:
            q.setdefault("week_other", {})[m.group(2)] = int(m.group(3))
    if not found:
        q["note"] = "ไม่มีข้อมูลโควตา" + (" (ไม่ได้ล็อกอินด้วย subscription)" if "Total cost" in txt else
                                         ": " + short(txt, 60))
    elif "session_pct" not in q:
        q["note"] = "/usage ไม่มีบรรทัด Current session (ยังไม่มี session ที่เปิดอยู่)"
    quota_cache_put(account, q)
    return q


def claude_check(account, timeout=120):
    """Real minimal call. Returns ready / expired / not_logged_in / limit / error."""
    try:
        st = subprocess.run([account, "auth", "status"], capture_output=True, text=True, timeout=30,
                            stdin=subprocess.DEVNULL, cwd="/tmp")
        logged = '"loggedIn": true' in st.stdout
    except (subprocess.TimeoutExpired, FileNotFoundError):
        logged = None
    if logged is False:
        return dict(account=account, status="not_logged_in", detail="auth status: loggedIn false",
                    as_of=now_iso())
    r = call_claude(account, "ตอบ OK", "haiku", "low", cwd="/tmp", timeout=timeout, node="check", no_sim=True)
    if r["ok"]:
        return dict(account=account, status="ready", detail="ตอบ %s ใน %.1fs" % (short(r["result"], 20),
                                                                              r["duration_s"]),
                    as_of=now_iso())
    kind = r["status"]
    status = {"auth_expired": "expired", "not_logged_in": "not_logged_in", "limit": "limit"}.get(kind, "error")
    if status == "not_logged_in" and logged:
        status = "expired"
    return dict(account=account, status=status, detail=short(r["error"], 120), as_of=now_iso())


# ------------------------------------------------------------- Codex side
def codex_home(account):
    return os.path.join(CODEX_ROOT, account)


def codex_models(account=None):
    accs = [account] if account else list_accounts("cyolo")
    for a in accs:
        path = os.path.join(codex_home(a), "models_cache.json")
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            continue
        models = []
        for m in data.get("models", []):
            models.append(dict(slug=m.get("slug"), visibility=m.get("visibility"),
                               priority=m.get("priority", 999),
                               default=m.get("default_reasoning_level"),
                               efforts=[x.get("effort") for x in m.get("supported_reasoning_levels") or []]))
        models.sort(key=lambda m: m["priority"])
        return models, data.get("fetched_at")
    return [], None


def codex_default_model(account=None):
    models, _ = codex_models(account)
    for m in models:
        if m["visibility"] == "list":
            return m["slug"]
    return models[0]["slug"] if models else None


def codex_resolve(model, effort, account=None):
    """Return (model, effort, note). Lowers unsupported effort to the highest supported one."""
    models, _ = codex_models(account)
    model = model or codex_default_model(account)
    info = next((m for m in models if m["slug"] == model), None)
    if not info:
        return model, effort, "ไม่พบรุ่น %s ใน models_cache.json (ส่งไปตามที่ระบุ)" % model
    if effort in info["efforts"]:
        return model, effort, ""
    want = CODEX_EFFORT_ORDER.index(effort) if effort in CODEX_EFFORT_ORDER else 99
    ok = [e for e in info["efforts"] if e in CODEX_EFFORT_ORDER and CODEX_EFFORT_ORDER.index(e) <= want]
    new = ok[-1] if ok else (info["default"] or info["efforts"][0])
    return model, new, "ลด effort จาก %s เป็น %s (%s ไม่รองรับ)" % (effort, new, model)


def call_codex(account, prompt, model=None, effort="medium", cwd=None, timeout=900, ephemeral=True,
               images=None, output_schema=None, run_dir=None, run_id=None, node=None, on_event=None,
               proc_holder=None, ledger=True, simulate_limit=False, env=None, no_sim=False):
    t0 = time.time()
    ts_start = now_iso()
    model, effort, note = codex_resolve(model, effort, account)
    res = dict(ok=False, account=account, cli="codex", model=model, effort=effort, result="", error="",
               status="error", note=note, usage={}, real_model=model, thread_id=None, cost_usd=None)
    if (simulated_limit(account) and not no_sim) or simulate_limit:
        time.sleep(0.05)
        res.update(error="simulated: usage limit reached (MA_SIMULATE_LIMIT)", status="limit")
    else:
        fd, out_file = tempfile.mkstemp(prefix="cyolo-", suffix=".txt")
        os.close(fd)
        cmd = [account, "exec", "--skip-git-repo-check", "-m", model, "-c",
               "model_reasoning_effort=%s" % effort, "--json", "-o", out_file]
        if ephemeral:
            cmd.append("--ephemeral")
        if cwd:
            cmd += ["-C", cwd]
        for im in images or []:
            cmd += ["-i", im]
        if output_schema:
            cmd += ["--output-schema", output_schema]
        cmd += ["--", prompt]
        errors = []
        failed = []
        usage = None
        try:
            p = subprocess.Popen(cmd, cwd=cwd or "/tmp", env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                 stderr=subprocess.DEVNULL, text=True, encoding="utf-8", errors="replace",
                                 start_new_session=True)
            if proc_holder is not None:
                proc_holder.append(p)
            fired_l = []
            timer = threading.Timer(timeout, lambda: (fired_l.append(1), _kill(p)))
            timer.start()
            for line in p.stdout:
                line = line.strip()
                if not line.startswith("{"):
                    continue
                try:
                    ev = json.loads(line)
                except ValueError:
                    continue
                typ = ev.get("type")
                if typ == "thread.started":
                    res["thread_id"] = ev.get("thread_id")
                elif typ == "turn.completed":
                    usage = ev.get("usage") or {}
                    if on_event:
                        on_event("tokens", usage)
                elif typ == "turn.failed":
                    failed.append(1)
                    errors.append((ev.get("error") or {}).get("message") or "turn.failed")
                elif typ == "error":
                    errors.append(ev.get("message") or "error")
            p.wait()
            fired = bool(fired_l)
            timer.cancel()
            try:
                with open(out_file, encoding="utf-8", errors="replace") as f:
                    res["result"] = f.read().strip()
            except OSError:
                pass
            if usage is not None and not failed:
                res["ok"] = True
                res["status"] = "ok"
            else:
                if fired and usage is None:
                    res["error"] = "timeout after %ss" % timeout
                else:
                    res["error"] = short(errors[-1] if errors else "no turn.completed (exit %s)" % p.returncode, 300)
                res["status"] = classify_error(res["error"])
            res["usage"] = usage or {}
        except FileNotFoundError:
            res["error"] = "ไม่พบคำสั่ง %s" % account
        finally:
            try:
                os.unlink(out_file)
            except OSError:
                pass
    u = res["usage"] or {}
    res.update(ts_start=ts_start, ts_end=now_iso(), duration_s=round(time.time() - t0, 2),
               input_tokens=u.get("input_tokens") or 0, cached_input_tokens=u.get("cached_input_tokens") or 0,
               cache_write_tokens=u.get("cache_write_input_tokens") or 0,
               output_tokens=u.get("output_tokens") or 0, reasoning_tokens=u.get("reasoning_output_tokens") or 0)
    if ledger:
        ledger_append(_ledger_row(res, prompt, run_id, node), run_dir)
    return res


def codex_login_status(account):
    try:
        p = subprocess.run([account, "login", "status"], capture_output=True, text=True, timeout=30,
                           stdin=subprocess.DEVNULL, cwd="/tmp")
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return None, short(e, 80)
    txt = (p.stdout + "\n" + p.stderr).strip()
    if "Logged in" in txt:
        return True, short(txt.splitlines()[-1], 60)
    if "Not logged in" in txt:
        return False, "Not logged in"
    return None, short(txt, 80)


def codex_check(account, timeout=180):
    logged, detail = codex_login_status(account)
    if logged is False:
        return dict(account=account, status="not_logged_in", detail=detail, as_of=now_iso())
    r = call_codex(account, "ตอบคำว่า OK เท่านั้น", None, "low", timeout=timeout, node="check", no_sim=True)
    if r["ok"] and r["result"]:
        return dict(account=account, status="ready", detail="ตอบ %s ใน %.1fs" % (short(r["result"], 20),
                                                                              r["duration_s"]),
                    as_of=now_iso())
    kind = r["status"]
    status = {"auth_expired": "expired", "not_logged_in": "expired", "limit": "limit"}.get(kind, "error")
    return dict(account=account, status=status, detail=short(r["error"], 120), as_of=now_iso())


def codex_quota(account):
    """rate_limits from the newest non-ephemeral rollout. Always reports data time."""
    q = {"account": account, "source": "sessions rollout"}
    files = glob.glob(os.path.join(codex_home(account), "sessions", "*", "*", "*", "*.jsonl"))
    files.sort(key=lambda f: os.path.getmtime(f), reverse=True)
    for f in files[:30]:
        last = None
        try:
            with open(f, encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    if '"token_count"' not in line or '"rate_limits"' not in line:
                        continue
                    try:
                        ev = json.loads(line)
                    except ValueError:
                        continue
                    rl = (ev.get("payload") or {}).get("rate_limits")
                    if rl and (rl.get("primary") or rl.get("secondary")):
                        last = (ev.get("timestamp"), rl)
        except OSError:
            continue
        if last:
            ts, rl = last
            try:
                as_of = _dt.datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().isoformat(
                    timespec="seconds")
            except (ValueError, AttributeError):
                as_of = ts
            q["as_of"] = as_of
            for name in ("primary", "secondary"):
                w = rl.get(name)
                if w:
                    q[name] = dict(used_percent=w.get("used_percent"), window_minutes=w.get("window_minutes"),
                                   resets=fmt_ts(w.get("resets_at")))
            # map to the common fields: shortest window = "session", longest = "week"
            wins = [rl[n] for n in ("primary", "secondary") if rl.get(n)]
            wins.sort(key=lambda w: w.get("window_minutes") or 0)
            if wins:
                if (wins[0].get("window_minutes") or 0) < 10080:
                    q["session_pct"] = round(wins[0].get("used_percent") or 0)
                q["week_pct"] = round(wins[-1].get("used_percent") or 0)
            q["plan"] = rl.get("plan_type")
            return q
    q["as_of"] = None
    q["note"] = "ไม่มีข้อมูล (ยังไม่มี rollout ที่ไม่ใช่ ephemeral) ใช้ quota --refresh"
    return q


def quota(account, refresh=False):
    if cli_of(account) == "claude":
        return claude_quota(account)
    if refresh:
        call_codex(account, "ตอบคำว่า OK เท่านั้น", None, "low", ephemeral=False, node="quota-refresh",
                   timeout=180)
    return codex_quota(account)


def quota_text(q):
    if not q:
        return "ไม่มีข้อมูล"
    parts = []
    if q.get("session_pct") is not None:
        parts.append("session %s%%" % q["session_pct"])
    if q.get("week_pct") is not None:
        parts.append("week %s%%" % q["week_pct"])
    if not parts:
        return "ไม่มีข้อมูล" + (" (%s)" % q["note"] if q.get("note") else "")
    return "%s (ข้อมูล %s)" % (" · ".join(parts), (q.get("as_of") or "-")[:16].replace("T", " "))


def quota_used_pct(q):
    """Highest known usage percent (session or week); None when unknown."""
    if not q:
        return None
    vals = [q.get(k) for k in ("session_pct", "week_pct") if q.get(k) is not None]
    return max(vals) if vals else None


def quota_table(accounts, refresh=False):
    rows, data = [], {}
    for a in accounts:
        q = quota(a, refresh=refresh)
        data[a] = q
        if cli_of(a) == "claude":
            rows.append([a, q.get("session_pct", "-"), q.get("session_resets", "-"), q.get("week_pct", "-"),
                         q.get("week_resets", "-"), (q.get("as_of") or "-")[:19], q.get("note", "")])
        else:
            pr = q.get("primary") or {}
            sc = q.get("secondary") or {}
            rows.append([a, q.get("session_pct", "-"), "-", q.get("week_pct", pr.get("used_percent", "-")),
                         pr.get("resets", "-") if pr else "-", (q.get("as_of") or "ไม่มีข้อมูล")[:19],
                         q.get("note", "") + ("" if not sc else " secondary %s%%" % sc.get("used_percent"))])
    return table(["บัญชี", "session %", "session reset", "week %", "week reset", "เวลาของข้อมูล", "หมายเหตุ"],
                 rows), data


STATUS_TH = {"ready": "พร้อม", "expired": "ล็อกอินแล้วแต่หมดอายุ", "not_logged_in": "ไม่ได้ล็อกอิน",
             "limit": "โควตาหมด", "error": "ผิดพลาด"}


def check_accounts(accounts, parallel=True):
    results = {}

    def one(a):
        results[a] = claude_check(a) if cli_of(a) == "claude" else codex_check(a)

    ths = [threading.Thread(target=one, args=(a,)) for a in accounts]
    for t in ths:
        t.start()
        if not parallel:
            t.join()
    for t in ths:
        t.join()
    ensure_dir(CACHE_DIR)
    path = os.path.join(CACHE_DIR, "check.json")
    try:
        with open(path, encoding="utf-8") as f:
            old = json.load(f)
    except (OSError, ValueError):
        old = {}
    old.update(results)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(old, f, ensure_ascii=False, indent=1)
    return [results[a] for a in accounts]


def check_table(results):
    return table(["บัญชี", "สถานะ", "รายละเอียด", "ตรวจเมื่อ"],
                 [[r["account"], STATUS_TH.get(r["status"], r["status"]), r["detail"], r["as_of"][:19]]
                  for r in results])


def cached_check(max_age_s=600):
    try:
        with open(os.path.join(CACHE_DIR, "check.json"), encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return {}
    out = {}
    for a, r in data.items():
        try:
            age = time.time() - _dt.datetime.fromisoformat(r["as_of"]).timestamp()
        except (ValueError, KeyError):
            continue
        if age <= max_age_s:
            out[a] = r
    return out


def is_png(path):
    try:
        with open(path, "rb") as f:
            return f.read(8) == b"\x89PNG\r\n\x1a\n"
    except OSError:
        return False


def print_result(res, as_json=False):
    if as_json:
        keep = {k: v for k, v in res.items() if k not in ("usage",)}
        print(json.dumps(keep, ensure_ascii=False, indent=1))
    else:
        if res["ok"]:
            print(res["result"])
        else:
            print("ล้ม (%s): %s" % (res["status"], res["error"]), file=sys.stderr)
        print("\n" + table(["บัญชี", "รุ่น/effort", "เวลา s", "input", "cached_in", "cache_write", "output",
                            "reasoning", "cost_usd", "สถานะ"],
                           [[res["account"], "%s/%s" % (res["model"], res["effort"]), res["duration_s"],
                             res["input_tokens"], res["cached_input_tokens"], res["cache_write_tokens"],
                             res["output_tokens"], res["reasoning_tokens"],
                             "-" if res.get("cost_usd") is None else "%.4f" % res["cost_usd"],
                             res["status"]]]), file=sys.stderr)
        if res.get("note"):
            print("หมายเหตุ: " + res["note"], file=sys.stderr)
