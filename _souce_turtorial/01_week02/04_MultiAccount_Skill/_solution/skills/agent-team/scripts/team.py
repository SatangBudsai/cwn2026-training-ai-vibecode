#!/usr/bin/env python3
"""team.py - multi-account agent team (Claude yoloN + Codex cyoloN).

Main commands (see SKILL.md):
  run GRAPH|-          run a task graph, end with summary table + quota
  run --resume RID     rerun only failed/blocked nodes (optionally with edits)
  lead --goal "..."    leader episodes supervised by this script (leader handoff)
  status / stats / check / quota / approve / board / msg
Leader-only commands (used inside a lead episode):
  dispatch / wait / checkpoint / finish
"""
import argparse
import datetime as _dt
import fcntl
import json
import os
import random
import re
import string
import subprocess
import sys
import threading
import time

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import ma_common as mc  # noqa: E402

TEAM_PY = os.path.realpath(__file__)
TERMINAL = ("ok", "failed", "bad_output", "blocked")
DEFAULTS = dict(per_account=3, max_total=8, timeout=900, threshold=80, gate_timeout=1800)
KIND_PREF = {"image": "cyolo", "review": "cyolo", "code": "cyolo", "doc": "yolo", "long": "yolo"}


def P(*a):
    print(*a, flush=True)


# ================================================================= state
def run_dir_of(rid):
    return os.path.join(mc.TEAM_ROOT, rid)


def new_run_id():
    return _dt.datetime.now().strftime("%Y%m%d-%H%M%S-") + "".join(random.choice(string.ascii_lowercase)
                                                                    for _ in range(4))


def latest_run():
    if not os.path.isdir(mc.TEAM_ROOT):
        return None
    runs = [d for d in os.listdir(mc.TEAM_ROOT)
            if os.path.isfile(os.path.join(mc.TEAM_ROOT, d, "state.json"))]
    runs.sort(key=lambda d: os.path.getmtime(os.path.join(mc.TEAM_ROOT, d, "state.json")))
    return runs[-1] if runs else None


class Locked:
    def __init__(self, rd):
        self.path = os.path.join(rd, ".state.lock")

    def __enter__(self):
        self.f = open(self.path, "a")
        fcntl.flock(self.f, fcntl.LOCK_EX)
        return self

    def __exit__(self, *a):
        fcntl.flock(self.f, fcntl.LOCK_UN)
        self.f.close()


_tlock = threading.RLock()


def load_state(rd):
    with open(os.path.join(rd, "state.json"), encoding="utf-8") as f:
        return json.load(f)


def save_state(rd, st):
    path = os.path.join(rd, "state.json")
    tmp = path + ".tmp%d.%d" % (os.getpid(), threading.get_ident())
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def update(rd, fn):
    """Atomically read-modify-write state.json (safe across threads and processes)."""
    with _tlock, Locked(rd):
        st = load_state(rd)
        r = fn(st)
        save_state(rd, st)
        return r


def board_append(rd, author, text):
    with open(os.path.join(rd, "board.md"), "a", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write("\n- [%s · %s] %s\n" % (mc.now_iso()[:19].replace("T", " "), author, text.strip()))
        fcntl.flock(f, fcntl.LOCK_UN)


def msg_append(rd, frm, to, text):
    path = os.path.join(rd, "msgs", "%s__%s.md" % (frm, to))
    with open(path, "a", encoding="utf-8") as f:
        f.write("\n## %s\n%s\n" % (mc.now_iso()[:19].replace("T", " "), text.strip()))
    return path


def event(rd, st, kind, **kw):
    kw.update(ts=mc.now_iso(), event=kind)
    st.setdefault("events", []).append(kw)
    mc.ledger_append(dict(ts_start=kw["ts"], ts_end=kw["ts"], run_id=st["run_id"], node=kw.get("node"),
                          account=kw.get("to") or kw.get("account"), cli=mc.cli_of(kw.get("to") or kw.get("account") or ""),
                          status=kind, error=kw.get("reason"), event=kind,
                          **{k: v for k, v in kw.items() if k in ("from", "to", "type")}), rd)


def init_run(rd, rid, graph, options, mode="run", goal=None):
    for sub in ("msgs", "out", "approve", "logs", "work", "final"):
        mc.ensure_dir(os.path.join(rd, sub))
    with open(os.path.join(rd, "graph.json"), "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False, indent=1)
    if not os.path.exists(os.path.join(rd, "board.md")):
        with open(os.path.join(rd, "board.md"), "w", encoding="utf-8") as f:
            f.write("# board.md · run %s\nกระดานความรู้กลาง: อ่านก่อนเริ่มงาน เพิ่มข้อค้นพบแบบต่อท้ายเท่านั้น "
                    "(ระบุผู้เขียนและเวลา)\n" % rid)
    if not os.path.exists(os.path.join(rd, "handoff.md")):
        with open(os.path.join(rd, "handoff.md"), "w", encoding="utf-8") as f:
            f.write("# handoff.md · run %s\nยังไม่มี checkpoint\n" % rid)
    st = dict(run_id=rid, mode=mode, goal=goal or graph.get("goal"), created=mc.now_iso(), done=False,
              options=options, nodes={}, accounts={}, running=[], switches=[], lead_history=[], events=[],
              leader={}, final=None)
    save_state(rd, st)
    return st


def norm_node(n, defaults):
    n = dict(n)
    for k, v in (defaults or {}).items():
        n.setdefault(k, v)
    n.setdefault("type", "task")
    n.setdefault("account", "any")
    n.setdefault("difficulty", 2)
    n.setdefault("depends_on", [])
    if isinstance(n["depends_on"], str):
        n["depends_on"] = [x for x in n["depends_on"].split(",") if x]
    n.setdefault("board", True)
    return n


def graph_nodes(graph):
    d = graph.get("defaults") or {}
    return [norm_node(n, d) for n in graph.get("nodes", [])]


def validate_graph(nodes):
    ids = [n.get("id") for n in nodes]
    errs = []
    if not nodes:
        errs.append("กราฟไม่มี nodes")
    for n in nodes:
        if not n.get("id") or not re.fullmatch(r"[A-Za-z0-9_.-]+", str(n.get("id"))):
            errs.append("node id ไม่ถูกต้อง: %r (ใช้ A-Z a-z 0-9 _ . -)" % n.get("id"))
        for d in n["depends_on"]:
            if d not in ids:
                errs.append("%s: depends_on ไม่พบ %s" % (n.get("id"), d))
        if n["type"] not in ("task", "review", "debate", "best_of", "image"):
            errs.append("%s: type ไม่รู้จัก %s" % (n["id"], n["type"]))
        if n["type"] in ("task", "image", "review", "debate", "best_of") and not n.get("prompt"):
            errs.append("%s: ไม่มี prompt" % n.get("id"))
    if len(set(ids)) != len(ids):
        errs.append("node id ซ้ำ")
    # cycle check
    deps = {n["id"]: n["depends_on"] for n in nodes if n.get("id")}
    seen, stack = set(), set()

    def visit(x):
        if x in stack:
            errs.append("กราฟมีวงวน ที่ %s" % x)
            return
        if x in seen:
            return
        stack.add(x)
        for d in deps.get(x, []):
            visit(d)
        stack.discard(x)
        seen.add(x)
    for x in deps:
        visit(x)
    return errs


# ======================================================= accounts / pool
def is_account(spec):
    return bool(mc.cli_of(spec or ""))


def node_accounts(n):
    """Account specs a node may use."""
    t = n["type"]
    if t == "review":
        return [n.get("worker") or n.get("account") or "any", n.get("reviewer") or "any"]
    if t in ("debate", "best_of"):
        return list(n.get("accounts") or (["yolo", "cyolo"] if t == "debate" else ["any", "any", "any"])) + \
            [n.get("judge") or "any"]
    return [n.get("account") or "any"]


def compute_pool(nodes, workers):
    all_acc = mc.list_accounts()
    if workers:
        return [a for a in workers if a in all_acc]
    specs = [s for n in nodes for s in node_accounts(n)]
    if specs and all(is_account(s) for s in specs):
        return sorted(set(specs), key=lambda a: (mc.side_of(a), mc._num_key(a)))
    sides = set()
    for s in specs:
        if s in ("yolo", "cyolo"):
            sides.add(s)
        elif s == "any":
            sides |= {"yolo", "cyolo"}
        elif is_account(s):
            sides.add(None)
    out = [a for a in all_acc if mc.side_of(a) in sides]
    for s in specs:
        if is_account(s) and s not in out:
            out.append(s)
    return out


def readiness(pool, recheck=False, quiet=False):
    cached = {} if recheck else mc.cached_check(600)
    todo = [a for a in pool if a not in cached]
    hit = [a for a in pool if a in cached]
    if hit and not quiet:
        P("· ใช้ผลตรวจความพร้อม (เรียกจริง) จาก cache ≤10 นาที: " + ", ".join(
            "%s=%s@%s" % (a, mc.STATUS_TH.get(cached[a]["status"], cached[a]["status"]), cached[a]["as_of"][11:19])
            for a in hit))
    if todo:
        if not quiet:
            P("· ตรวจความพร้อมด้วยการเรียกจริง: " + ", ".join(todo))
        for r in mc.check_accounts(todo):
            cached[r["account"]] = r
    return {a: cached[a] for a in pool if a in cached}


def setup_accounts(rd, pool, ready, roles=None):
    quotas = {}
    for a in pool:
        if ready.get(a, {}).get("status") == "ready":
            try:
                quotas[a] = mc.quota(a)
            except Exception as e:  # noqa
                quotas[a] = {"note": str(e)}

    def fn(st):
        thr = st["options"].get("threshold", DEFAULTS["threshold"])
        for a in pool:
            r = ready.get(a) or {"status": "error", "detail": "ไม่ได้ตรวจ"}
            acc = st["accounts"].setdefault(a, {})
            acc.update(check=r["status"], check_detail=r.get("detail"), role=(roles or {}).get(a, acc.get("role", "ลูกทีม")))
            acc.setdefault("stopped", False)
            if r["status"] != "ready":
                acc["unusable"] = mc.STATUS_TH.get(r["status"], r["status"])
            q = quotas.get(a)
            if q is not None:
                acc["quota"] = q
                used = mc.quota_used_pct(q)
                if used is not None and used >= thr and not acc["stopped"]:
                    acc["stopped"] = True
                    acc["stop_reason"] = "โควตา %s%% ≥ เกณฑ์ %s%%" % (used, thr)
        st["pool"] = pool
    update(rd, fn)


def usable(st, a):
    acc = st["accounts"].get(a)
    return bool(acc) and not acc.get("unusable") and not acc.get("stopped")


def score(st, a):
    acc = st["accounts"][a]
    q = mc.quota_cache_load().get(a) or acc.get("quota")
    used = mc.quota_used_pct(q)
    used = 50 if used is None else used
    load = sum(1 for n in st["nodes"].values() if n.get("planned") == a and n["status"] not in TERMINAL)
    load += sum(1 for r in st["running"] if r["account"] == a)
    return used + 15 * load + run_tokens(st, a) / 20000.0


def choose(st, spec, kind=None, exclude=()):
    """Router + quota balancing. Returns account or None."""
    if is_account(spec):
        return spec
    pool = [a for a in st.get("pool", []) if usable(st, a) and a not in exclude]
    pref = None
    if spec in ("yolo", "cyolo"):
        pool = [a for a in pool if mc.side_of(a) == spec]
    elif kind == "image":
        pool = [a for a in pool if mc.side_of(a) == "cyolo"]
    else:
        pref = KIND_PREF.get(kind or "")
    if not pool:
        return None
    pool.sort(key=lambda a: (0 if (pref is None or mc.side_of(a) == pref) else 1, score(st, a), a))
    return pool[0]


_ledger_cache = {}


def run_tokens(st, a, workers_only=True):
    rd = run_dir_of(st["run_id"])
    path = os.path.join(rd, "ledger.jsonl")
    try:
        mt = os.path.getmtime(path)
    except OSError:
        return 0
    key = path
    if _ledger_cache.get(key, (None,))[0] != mt:
        _ledger_cache[key] = (mt, mc.read_ledger(path))
    rows = _ledger_cache[key][1]
    return sum(mc.row_tokens(r) for r in rows if r.get("account") == a and not r.get("event")
               and not (workers_only and str(r.get("node") or "").startswith("lead#")))


# ============================================================ prompts
def strip_board(text):
    keep, board = [], []
    for line in (text or "").splitlines():
        m = re.match(r"\s*\**BOARD:\**\s*(.+)", line)
        if m:
            board.append(m.group(1).strip())
        else:
            keep.append(line)
    return "\n".join(keep).strip(), board


def substitute(rd, st, text, nid):
    def rep(m):
        key = m.group(1)
        if key.startswith("file:"):
            return os.path.join(rd, "out", key[5:] + ".md")
        if key == "run_dir":
            return rd
        if key == "board":
            return os.path.join(rd, "board.md")
        n = st["nodes"].get(key)
        if not n:
            return m.group(0)
        val = n.get("value")
        if val is None:
            return m.group(0)
        if len(val) > 2000:
            return "(ข้อมูลยาว อ่านจากไฟล์ %s)" % os.path.join(rd, "out", key + ".md")
        return val
    return re.sub(r"\{\{\s*([A-Za-z0-9_.:-]+)\s*\}\}", rep, text or "")


EXPECT_HINT = {
    "number": "รูปแบบคำตอบ: ตอบเฉพาะตัวเลขผลลัพธ์ตัวเดียว ไม่มีข้อความอื่น",
    "int": "รูปแบบคำตอบ: ตอบเฉพาะจำนวนเต็มตัวเดียว ไม่มีข้อความอื่น",
    "json": "รูปแบบคำตอบ: ตอบเป็น JSON ล้วน (ไม่มี ``` และไม่มีข้อความอื่น)",
}


def build_prompt(rd, st, n, acc, body, moved_from=None, extra=None):
    cwd = node_cwd(rd, n)
    parts = ["[งานทีม run %s · งาน %s · บัญชี %s]" % (st["run_id"], n["id"], acc)]
    if n.get("board", True):
        parts.append("กระดานความรู้กลาง: %s — อ่านก่อนเริ่ม ถ้าพบข้อเท็จจริงที่ agent อื่นควรรู้ ให้ใส่ในคำตอบเป็นบรรทัด "
                     "ขึ้นต้นด้วย \"BOARD: \" (ระบบต่อท้ายลงกระดานให้พร้อมชื่อและเวลา)" % os.path.join(rd, "board.md"))
    parts.append("โฟลเดอร์ทำงาน (absolute): %s · ถ้างานยาว ให้เขียนความคืบหน้าเป็นระยะลง %s" %
                 (cwd, os.path.join(rd, "msgs", "%s__progress.md" % n["id"])))
    if moved_from:
        parts.append("งานนี้ย้ายมาจากบัญชี %s ความคืบหน้าเดิม (ถ้ามี) อยู่ที่ %s อ่านก่อนแล้วทำต่อ ไม่ต้องเริ่มจากศูนย์" %
                     (moved_from, os.path.join(rd, "msgs", "%s__progress.md" % n["id"])))
    parts.append("")
    parts.append(substitute(rd, st, body, n["id"]))
    exp = n.get("expect")
    if extra is not None:
        if extra:
            parts.append(extra)
    elif exp in EXPECT_HINT:
        parts.append(EXPECT_HINT[exp])
    return "\n".join(parts)


def node_cwd(rd, n):
    cwd = n.get("cwd") or rd
    if not os.path.isabs(cwd):
        cwd = os.path.join(rd, cwd)
    mc.ensure_dir(cwd)
    return cwd


def check_expect(exp, text):
    """Return (ok, value, reason)."""
    t = (text or "").strip()
    if not exp:
        return True, t, ""
    if exp in ("number", "int"):
        c = t.replace(",", "").strip().strip("`*").strip()
        pat = r"-?\d+" if exp == "int" else r"-?\d+(?:\.\d+)?"
        if re.fullmatch(pat, c):
            return True, c, ""
        return False, t, "expect=%s แต่คำตอบไม่ใช่ตัวเลขล้วน: %s" % (exp, mc.short(t, 60))
    if exp == "json":
        c = re.sub(r"^```(?:json)?\s*|\s*```$", "", t)
        try:
            json.loads(c)
            return True, c, ""
        except ValueError as e:
            return False, t, "expect=json แต่ parse ไม่ได้: %s" % e
    if exp.startswith("regex:"):
        if re.search(exp[6:], t, re.S):
            return True, t, ""
        return False, t, "ไม่ตรง %s" % exp
    if exp.startswith("contains:"):
        if exp[9:] in t:
            return True, t, ""
        return False, t, "ไม่มีข้อความ %r" % exp[9:]
    if exp == "approved":
        return ("APPROVED" in t), t, "" if "APPROVED" in t else "ไม่มี APPROVED"
    if exp == "png":
        return True, t, ""
    return False, t, "expect ไม่รู้จัก: %s" % exp


# ===================================================== slots & calls
def acquire_slot(rd, nid, acc, token):
    def fn(st):
        o = st["options"]
        st["running"] = [r for r in st["running"] if _alive(r)]
        if not usable(st, acc):
            return "pinned_stopped" if is_pinned_node(st, nid) else "stopped"
        if sum(1 for r in st["running"] if r["account"] == acc) >= o.get("per_account", 3):
            return False
        if len(st["running"]) >= o.get("max_total", 8):
            return False
        st["running"].append(dict(account=acc, node=nid, pid=os.getpid(), token=token, since=mc.now_iso()))
        return True
    return update(rd, fn)


def release_slot(rd, token):
    def fn(st):
        st["running"] = [r for r in st["running"] if r.get("token") != token]
    update(rd, fn)


def _alive(r):
    if r.get("pid") == os.getpid():
        return True
    try:
        os.kill(r["pid"], 0)
        return True
    except (OSError, KeyError):
        return False


def is_pinned_node(st, nid):
    base = nid.split("#")[0]
    n = st["nodes"].get(base) or {}
    return bool(n.get("pinned"))


def record_switch(rd, st, nid, frm, to, reason):
    sw = dict(node=nid, **{"from": frm}, to=to, reason=reason, ts=mc.now_iso())
    st["switches"].append(sw)
    event(rd, st, "worker_switch", node=nid, to=to, reason=reason, **{"from": frm})
    board_append(rd, "team.py", "ย้ายงาน %s จาก %s ไป %s: %s" % (nid, frm, to or "-", reason))
    msg_append(rd, frm or "none", to or "none",
               "ย้ายงาน %s มาให้ %s เพราะ %s\nความคืบหน้าเดิม (ถ้ามี): %s" %
               (nid, to, reason, os.path.join(rd, "msgs", "%s__progress.md" % nid.split("#")[0])))
    P("↪ ย้ายงาน %s: %s → %s (%s)" % (nid, frm, to, reason))


def stop_account(rd, st, a, reason):
    acc = st["accounts"].setdefault(a, {})
    if acc.get("stopped"):
        return
    acc["stopped"] = True
    acc["stop_reason"] = reason
    event(rd, st, "worker_stop", account=a, reason=reason)
    board_append(rd, "team.py", "บัญชี %s หยุดรับงานใหม่: %s (งานที่รันอยู่ปล่อยให้จบ)" % (a, reason))
    P("⏸ %s หยุดรับงานใหม่: %s" % (a, reason))
    for nid, n in st["nodes"].items():
        if n.get("planned") == a and n["status"] in ("pending", "waiting_approval", "queued"):
            if n.get("pinned"):
                continue
            new = choose(st, n.get("spec", "any"), n.get("kind"), exclude=(a,))
            n["planned"] = new
            record_switch(rd, st, nid, a, new, "บัญชี %s หยุดรับงาน: %s" % (a, reason))


def after_call(rd, acc, res, nid):
    def fn(st):
        o = st["options"]
        if res.get("status") in mc.SWITCHABLE:
            st["accounts"].setdefault(acc, {})["unusable"] = "ล้ม: %s" % mc.short(res.get("error"), 60)
            return
        if str(nid).startswith("lead#"):
            return
        wb = o.get("worker_budget") or {}
        if o.get("demo_budget_first_worker") and res.get("ok") and not st.get("demo_budget_used"):
            st["demo_budget_used"] = acc
            wb[acc] = 1
            o["worker_budget"] = wb
        budget = wb.get(acc) or wb.get("*")
        if budget:
            used = run_tokens(st, acc)
            if used > budget:
                stop_account(rd, st, acc, "เกินงบโทเค็นลูกทีม (%d > %d)" % (used, budget))
        q = mc.quota_cache_load().get(acc)
        u = mc.quota_used_pct(q)
        if u is not None and u >= o.get("threshold", 80):
            stop_account(rd, st, acc, "โควตา %s%% ≥ เกณฑ์ %s%%" % (u, o.get("threshold", 80)))
    update(rd, fn)


def model_for(n, acc, difficulty=None):
    d = int(difficulty or n.get("difficulty") or 2)
    cm, ce, xe = mc.DIFFICULTY[max(1, min(6, d))]
    if n.get("type") == "image" or n.get("kind") == "image":
        cm, ce, xe = mc.DIFFICULTY[1]
    m, e = n.get("model"), n.get("effort")
    if mc.cli_of(acc) == "claude":
        model = m if m in mc.CLAUDE_MODELS else cm
        effort = e if e in mc.CLAUDE_EFFORTS else ("max" if e == "ultra" else ce)
        return model, effort
    model = m if (m and m not in mc.CLAUDE_MODELS) else None
    return model, (e if e in mc.CODEX_EFFORT_ORDER else xe)


def call_on(rd, nid, spec, kind, n, body_fn, difficulty=None, extra=None, first_account=None, image_out=None):
    """Call one agent for (sub)node nid with failover. body_fn(acc) -> prompt body."""
    pinned = is_account(spec)
    tried = []
    moved_from = None
    acc = first_account
    if not acc:
        acc = update(rd, lambda st: choose(st, spec, kind))
    while True:
        if not acc:
            return dict(ok=False, status="failed", error="ไม่มีบัญชีที่พร้อมสำหรับ %s (kind=%s)" % (spec, kind),
                        account=None, model=None, effort=None, result="", duration_s=0)
        token = "%s-%s-%s" % (os.getpid(), threading.get_ident(), time.time())
        while True:
            got = acquire_slot(rd, nid, acc, token)
            if got is True:
                break
            if got == "pinned_stopped":
                info = load_state(rd)["accounts"].get(acc, {})
                err = "บัญชี %s ที่ผู้ใช้ระบุ %s จึงไม่รันและไม่ย้ายอัตโนมัติ" % (
                    acc, "หยุดรับงาน: %s" % info.get("stop_reason") if info.get("stopped") else
                    "ใช้ไม่ได้: %s" % info.get("unusable"))
                P("⛔ %s: %s" % (nid, err))
                return dict(ok=False, status="failed", error=err, account=acc, model=None, effort=None,
                            result="", duration_s=0)
            if got == "stopped":
                old = acc

                def re_choose(st):
                    new = choose(st, spec, kind, exclude=tuple(tried) + (old,))
                    record_switch(rd, st, nid, old, new, "บัญชี %s หยุดรับงาน: %s" %
                                  (old, st["accounts"].get(old, {}).get("stop_reason") or
                                   st["accounts"].get(old, {}).get("unusable")))
                    return new
                acc = update(rd, re_choose)
                moved_from = old
                if not acc:
                    return dict(ok=False, status="failed", error="ไม่มีบัญชีอื่นรับงานต่อ", account=old,
                                model=None, effort=None, result="", duration_s=0)
                continue
            time.sleep(1.0)
        st = load_state(rd)
        model, effort = model_for(n, acc, difficulty)
        if mc.cli_of(acc) == "codex" and not model:
            model = mc.codex_default_model(acc)
        o = st["options"]
        sim = acc in (o.get("simulate_limit") or [])
        if o.get("demo_limit_first_worker") and not st.get("demo_limit_used") and not pinned:
            def mark(s):
                if s.get("demo_limit_used"):
                    return False
                s["demo_limit_used"] = acc
                s["options"].setdefault("simulate_limit", []).append(acc)
                return True
            sim = update(rd, mark) or sim
        prompt = build_prompt(rd, st, n, acc, body_fn(acc), moved_from=moved_from, extra=extra)
        _set_node(rd, nid.split("#")[0], account=acc, model=model, effort=effort)
        P("▶ %s → %s (%s/%s)%s" % (nid, acc, model or "default", effort, " [จำลองโควตาหมด]" if sim else ""))
        timeout = int(n.get("timeout") or o.get("timeout", 900))
        cwd = node_cwd(rd, n)
        try:
            if mc.cli_of(acc) == "claude":
                res = mc.call_claude(acc, prompt, model, effort, cwd=cwd, timeout=timeout, run_dir=rd,
                                     run_id=st["run_id"], node=nid, simulate_limit=sim)
            else:
                res = mc.call_codex(acc, prompt, model, effort, cwd=cwd, timeout=timeout, run_dir=rd,
                                    run_id=st["run_id"], node=nid, simulate_limit=sim)
        finally:
            release_slot(rd, token)
        if image_out and res.get("ok") and not mc.is_png(image_out):
            res.update(ok=False, status="bad_output", error="ไม่พบไฟล์ PNG ที่ %s" % image_out)
        after_call(rd, acc, res, nid)
        P("%s %s ← %s %.1fs in=%s out=%s %s" % ("✔" if res["ok"] else "✘", nid, acc, res["duration_s"],
                                               res.get("input_tokens"), res.get("output_tokens"),
                                               "" if res["ok"] else "(%s: %s)" % (res["status"], mc.short(res["error"], 80))))
        if res["ok"] or res["status"] not in mc.SWITCHABLE:
            return res
        tried.append(acc)
        if pinned:
            res["error"] = "บัญชี %s ที่ผู้ใช้ระบุล้ม (%s) ไม่ย้ายอัตโนมัติ: %s" % (acc, res["status"], res["error"])
            update(rd, lambda st: board_append(rd, "team.py", "งาน %s: %s" % (nid, res["error"])))
            return res
        old = acc

        def fail_over(st):
            new = choose(st, spec, kind, exclude=tuple(tried))
            if not new and spec == "any" and kind != "image":
                new = choose(st, "any", None, exclude=tuple(tried))
            record_switch(rd, st, nid, old, new, "%s ล้มเพราะ %s" % (old, res["status"]))
            return new
        acc = update(rd, fail_over)
        moved_from = old
        if not acc:
            return res


def _set_node(rd, nid, **kw):
    def fn(st):
        st["nodes"].setdefault(nid, {}).update(kw)
    update(rd, fn)


# ========================================================= node runners
def write_out(rd, name, text):
    path = os.path.join(rd, "out", name + ".md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text or "")
    return path


def push_board(rd, author, lines):
    for b in lines:
        board_append(rd, author, b)


def run_task(rd, n, st0):
    nid = n["id"]
    image_out = None
    kind = n.get("kind")
    if n["type"] == "image":
        kind = "image"
        image_out = n.get("path") or os.path.join(rd, "out", nid + ".png")
        if not os.path.isabs(image_out):
            image_out = os.path.join(rd, image_out)
        mc.ensure_dir(os.path.dirname(image_out))
        body = lambda acc: ("สร้างภาพ (image generation): %s\nบันทึกเป็นไฟล์ PNG ที่ %s (absolute path) แล้วตอบเฉพาะ path" %
                            (n["prompt"], image_out))
    else:
        body = lambda acc: n["prompt"]
    first = st0["nodes"][nid].get("planned")
    res = call_on(rd, nid, n.get("account", "any"), kind, n, body, first_account=first, image_out=image_out)
    return res, res.get("result", ""), image_out


def run_review(rd, n, st0):
    nid = n["id"]
    worker = n.get("worker") or n.get("account") or "any"
    reviewer = n.get("reviewer") or "any"
    rounds = int(n.get("max_rounds") or 3)
    work_path = review_path = None
    last = None
    total = []
    for r in range(1, rounds + 1):
        def wbody(acc, r=r, wp=work_path, rp=review_path):
            if r == 1:
                return n["prompt"]
            return ("%s\n\nนี่คือรอบแก้ไขที่ %d: งานรอบก่อนอยู่ที่ %s และข้อแก้ไขจากผู้ตรวจอยู่ที่ %s "
                    "อ่านทั้งสองไฟล์แล้วส่งงานฉบับแก้ไขที่สมบูรณ์" % (n["prompt"], r, wp, rp))
        res = call_on(rd, "%s#w%d" % (nid, r), worker, n.get("kind"), n, wbody)
        total.append(res)
        if not res["ok"]:
            return res, res.get("result", ""), None
        work, b = strip_board(res["result"])
        push_board(rd, "%s#w%d@%s" % (nid, r, res["account"]), b)
        work_path = write_out(rd, "%s.r%d.work" % (nid, r), work)
        criteria = n.get("criteria") or "ถูกต้อง ครบตามโจทย์"

        def rbody(acc, wp=work_path):
            return ("คุณคือผู้ตรวจ โจทย์ต้นฉบับ:\n%s\n\nงานที่ต้องตรวจอยู่ในไฟล์ %s (อ่านไฟล์นี้) เกณฑ์: %s\n"
                    "ถ้างานผ่านเกณฑ์ ให้ตอบบรรทัดแรกว่า APPROVED แล้วตามด้วยเหตุผลสั้น ๆ\n"
                    "ถ้าไม่ผ่าน ห้ามเขียนคำว่า APPROVED ให้ตอบบรรทัดแรกว่า CHANGES แล้วระบุข้อแก้ไขเป็นข้อ ๆ" %
                    (n["prompt"], wp, criteria))
        rv = call_on(rd, "%s#r%d" % (nid, r), reviewer, "review", n, rbody, difficulty=n.get("review_difficulty"),
                     extra="")
        total.append(rv)
        if not rv["ok"]:
            return rv, rv.get("result", ""), None
        review, b = strip_board(rv["result"])
        push_board(rd, "%s#r%d@%s" % (nid, r, rv["account"]), b)
        review_path = write_out(rd, "%s.r%d.review" % (nid, r), review)
        _set_node(rd, nid, rounds=r)
        first = (review.strip().splitlines() or [""])[0]
        if "APPROVED" in first.upper() and "CHANGES" not in first.upper():
            res = dict(res)
            res["review"] = "APPROVED รอบ %d โดย %s" % (r, rv["account"])
            last = res
            P("✔ %s APPROVED ในรอบ %d" % (nid, r))
            return res, work, None
        last = res
    last = dict(last)
    last.update(ok=False, status="bad_output", error="ไม่ได้ APPROVED ภายใน max_rounds=%d" % rounds)
    return last, work, None


def _parse_json_loose(text):
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", (text or "").strip())
    try:
        return json.loads(t)
    except ValueError:
        m = re.search(r"\{.*\}", t, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except ValueError:
                return None
    return None


def run_multi(rd, n, st0):
    """debate (default Claude vs Codex) and best_of: parallel answers, then a judge."""
    nid = n["id"]
    is_debate = n["type"] == "debate"
    specs = list(n.get("accounts") or (["yolo", "cyolo"] if is_debate else ["any", "any", "any"]))
    labels = [chr(ord("A") + i) for i in range(len(specs))]
    results = [None] * len(specs)
    used = []
    lock = threading.Lock()

    def one(i):
        spec = specs[i]
        with lock:
            # different accounts for each contestant when possible
            acc = update(rd, lambda st: choose(st, spec, n.get("kind"), exclude=tuple(used)) or choose(st, spec, n.get("kind")))
            used.append(acc)
        results[i] = call_on(rd, "%s#%s" % (nid, labels[i]), spec, n.get("kind"), n, lambda acc: n["prompt"],
                             first_account=acc, extra=("รูปแบบคำตอบ: " + n["format"]) if n.get("format") else None)
    ths = [threading.Thread(target=one, args=(i,)) for i in range(len(specs))]
    for t in ths:
        t.start()
    for t in ths:
        t.join()
    paths = {}
    for i, r in enumerate(results):
        txt, b = strip_board(r.get("result", ""))
        push_board(rd, "%s#%s@%s" % (nid, labels[i], r.get("account")), b)
        paths[labels[i]] = write_out(rd, "%s.%s" % (nid, labels[i]), txt if r["ok"] else "(ล้ม: %s)" % r.get("error"))
    okl = [labels[i] for i, r in enumerate(results) if r["ok"]]
    if not okl:
        r = dict(results[0])
        r.update(ok=False, status="failed", error="ทุกผู้ตอบล้ม")
        return r, "", None
    listing = "\n".join("- คำตอบ %s (บัญชี %s): %s" % (l, results[i].get("account"), paths[l])
                        for i, l in enumerate(labels) if l in okl)
    if is_debate:
        jprompt = ("คุณคือผู้ตัดสิน โจทย์:\n%s\n\nคำตอบจากผู้ตอบที่ทำงานแยกกัน (อ่านทุกไฟล์):\n%s\n\n"
                   "ตรวจความถูกต้องของแต่ละคำตอบด้วยตัวเอง เทียบกัน แล้วสรุปคำตอบที่ถูก\n"
                   "ตอบเป็น JSON ล้วน: {\"winner\": \"A|B|...|both|none\", \"answer\": \"คำตอบที่ถูก\", "
                   "\"reason\": \"เหตุผล\"}" % (n["prompt"], listing))
        if n.get("expect") in EXPECT_HINT:
            jprompt += "\nค่า answer ต้องเป็นไปตาม%s (ค่าล้วนในสตริง)" % EXPECT_HINT[n["expect"]].replace("รูปแบบคำตอบ: ", " ")
    else:
        jprompt = ("คุณคือผู้ตัดสิน โจทย์:\n%s\n\nผลงานจากหลายบัญชี (อ่านทุกไฟล์):\n%s\n\nเกณฑ์ให้คะแนน (0-10 ต่อข้อ): %s\n"
                   "ตอบเป็น JSON ล้วน: {\"scores\": {\"A\": 0, ...}, \"best\": \"A\", \"reason\": \"เหตุผล\"}" %
                   (n["prompt"], listing, n.get("criteria") or "ถูกต้อง ครบถ้วน ชัดเจน"))
    judge_spec = n.get("judge") or "any"
    contestants = tuple(r.get("account") for r in results if r.get("account"))
    # an independent judge: avoid the contestants' accounts when another account is available
    judge_acc = update(rd, lambda st: choose(st, judge_spec, n.get("kind"), exclude=contestants)
                       or choose(st, judge_spec, n.get("kind")))
    jr = call_on(rd, "%s#judge" % nid, judge_spec, n.get("kind"), n, lambda acc: jprompt, first_account=judge_acc,
                 difficulty=n.get("judge_difficulty") or max(2, int(n.get("difficulty") or 2)), extra="")
    if not jr["ok"]:
        return jr, "", None
    jtxt, b = strip_board(jr["result"])
    push_board(rd, "%s#judge@%s" % (nid, jr["account"]), b)
    write_out(rd, "%s.judge" % nid, jtxt)
    j = _parse_json_loose(jtxt)
    if not isinstance(j, dict):
        jr = dict(jr)
        jr.update(ok=False, status="bad_output", error="ผู้ตัดสินไม่ได้ตอบ JSON")
        return jr, jtxt, None
    if is_debate:
        value = str(j.get("answer", "")).strip()
        summary = "คำตอบ: %s\nผู้ชนะ: %s\nเหตุผลของผู้ตัดสิน (%s): %s\n\n%s" % (
            value, j.get("winner"), jr["account"], j.get("reason"), listing)
    else:
        best = str(j.get("best", "")).strip()
        try:
            with open(paths.get(best, ""), encoding="utf-8") as f:
                value = f.read().strip()
        except OSError:
            value = ""
        summary = value
        write_out(rd, "%s.judge" % nid, "%s\n\nคะแนน: %s\nเลือก: %s\nเหตุผล: %s" % (
            listing, json.dumps(j.get("scores"), ensure_ascii=False), best, j.get("reason")))
    _set_node(rd, nid, judge=dict(account=jr["account"], verdict=j))
    jr = dict(jr)
    jr["value_override"] = value
    return jr, summary, None


def execute_node(rd, nid):
    """Wait for deps / approval, run, write out/<nid>.md, update state. Process- and thread-safe."""
    st = load_state(rd)
    n = st["nodes"][nid]["spec_node"]
    gate_deadline = None
    while True:
        st = load_state(rd)
        bad = [d for d in n["depends_on"] if st["nodes"][d]["status"] in ("failed", "bad_output", "blocked")]
        if bad:
            _set_node(rd, nid, status="blocked", error="งานที่ต้องรอ %s ล้ม/ไม่ผ่าน จึงไม่รัน" % ",".join(bad),
                      ended=mc.now_iso())
            P("⛔ %s ถูกบล็อกเพราะ %s" % (nid, ",".join(bad)))
            return
        if all(st["nodes"][d]["status"] == "ok" for d in n["depends_on"]):
            break
        time.sleep(1.0)
    if n.get("approve"):
        flag = os.path.join(rd, "approve", nid)
        if not os.path.exists(flag):
            _set_node(rd, nid, status="waiting_approval")
            P("✋ %s รออนุมัติ: python3 %s approve %s %s  (หรือสร้างไฟล์ %s)" % (nid, TEAM_PY, st["run_id"], nid, flag))
            gt = st["options"].get("gate_timeout", DEFAULTS["gate_timeout"])
            gate_deadline = time.time() + gt if gt else None
            while not os.path.exists(flag):
                if gate_deadline and time.time() > gate_deadline:
                    _set_node(rd, nid, error="ยังไม่ได้รับอนุมัติภายใน %ss (resume ได้)" % gt)
                    P("✋ %s ยังไม่ได้รับอนุมัติ หยุดรอ (ใช้ run --resume %s หลังอนุมัติ)" % (nid, st["run_id"]))
                    return
                time.sleep(1.0)
            P("✔ %s ได้รับอนุมัติแล้ว" % nid)
    # moved before start because planned account stopped?
    def pre(st):
        node = st["nodes"][nid]
        node.update(status="running", started=mc.now_iso())
        p = node.get("planned")
        if p and not node.get("pinned") and not usable(st, p):
            new = choose(st, node.get("spec", "any"), node.get("kind"), exclude=(p,))
            record_switch(rd, st, nid, p, new, "บัญชี %s หยุดรับงาน/ใช้ไม่ได้: %s" % (
                p, st["accounts"].get(p, {}).get("stop_reason") or st["accounts"].get(p, {}).get("unusable")))
            node["planned"] = new
    update(rd, pre)
    # msgs for each incoming edge (relay handoff note)
    st = load_state(rd)
    for d in n["depends_on"]:
        msg_append(rd, d, nid, "ผลของ %s อยู่ที่ %s (ค่า: %s)" % (
            d, os.path.join(rd, "out", d + ".md"), mc.short(st["nodes"][d].get("value"), 120)))
    t0 = time.time()
    try:
        if n["type"] in ("task", "image"):
            res, text, image_out = run_task(rd, n, st)
        elif n["type"] == "review":
            res, text, image_out = run_review(rd, n, st)
        else:
            res, text, image_out = run_multi(rd, n, st)
    except Exception as e:  # never lose the run state
        res, text, image_out = dict(ok=False, status="failed", error="ข้อผิดพลาดภายใน: %r" % e), "", None
    clean, board_lines = strip_board(text)
    push_board(rd, "%s@%s" % (nid, res.get("account")), board_lines)
    out_path = write_out(rd, nid, clean if n["type"] != "debate" else text)
    value = res.get("value_override", clean)
    if image_out:
        value = image_out
    status = "ok" if res.get("ok") else ("bad_output" if res.get("status") == "bad_output" else "failed")
    err = "" if res.get("ok") else res.get("error")
    if res.get("ok"):
        ok, v, why = check_expect(n.get("expect"), value)
        if ok:
            value = v
        else:
            status, err = "bad_output", why + " (คำตอบเก็บไว้ที่ %s)" % out_path
    if image_out and status == "ok":
        res["review"] = "PNG ตรวจ signature แล้ว: %s" % image_out
    _set_node(rd, nid, status=status, value=value, error=err, out=out_path, ended=mc.now_iso(),
              duration_s=round(time.time() - t0, 1), review=res.get("review"))
    if status != "ok":
        P("✘ %s: %s" % (nid, err))


def add_nodes(rd, nodes):
    """Register nodes in state with a planned account (quota balanced)."""
    def fn(st):
        added = []
        for n in nodes:
            if n["id"] in st["nodes"]:
                continue
            spec = n.get("account", "any")
            kind = "image" if n["type"] == "image" else n.get("kind")
            entry = dict(status="pending", spec=spec, kind=kind, type=n["type"], pinned=is_account(spec),
                         difficulty=n.get("difficulty"), spec_node=n, depends_on=n["depends_on"])
            st["nodes"][n["id"]] = entry
            if n["type"] in ("task", "image"):
                entry["planned"] = choose(st, spec, kind)
            added.append(n["id"])
        return added
    return update(rd, fn)


# ============================================================== summary
def summary_rows(st, rd):
    rows = []
    led = mc.read_ledger(os.path.join(rd, "ledger.jsonl"))
    for nid, n in st["nodes"].items():
        mine = [r for r in led if not r.get("event") and str(r.get("node") or "").split("#")[0] == nid]
        tin = sum(r.get("input_tokens") or 0 for r in mine)
        tout = sum(r.get("output_tokens") or 0 for r in mine)
        accs = sorted({r["account"] for r in mine if r.get("account")})
        mods = sorted({"%s/%s" % (r.get("model") or "default", r.get("effort")) for r in mine})
        dur = n.get("duration_s") or round(sum(r.get("duration_s") or 0 for r in mine), 1)
        stat = n["status"]
        if n.get("error"):
            stat += ": " + mc.short(n["error"], 70)
        if n.get("review"):
            stat += " (%s)" % n["review"]
        rows.append([nid, ",".join(accs) or n.get("planned") or "-", ",".join(mods) or "-", dur, tin, tout, stat])
    return rows


def print_summary(rd, as_json=False):
    st = load_state(rd)
    rows = summary_rows(st, rd)
    used = sorted({a for r in mc.read_ledger(os.path.join(rd, "ledger.jsonl")) if not r.get("event")
                   for a in [r.get("account")] if a}, key=lambda a: (mc.side_of(a), mc._num_key(a)))
    quotas = {}
    for a in used:
        q = mc.quota_cache_load().get(a)
        if mc.cli_of(a) == "codex" or not q:
            q = mc.quota(a)
        quotas[a] = q
    if as_json:
        out = dict(run_id=st["run_id"], run_dir=rd, nodes={k: {x: v.get(x) for x in
                   ("status", "planned", "account", "model", "effort", "value", "error", "out", "duration_s", "review")}
                   for k, v in st["nodes"].items()},
                   switches=st["switches"], lead_history=st["lead_history"], quota=quotas,
                   table=[dict(zip(["node", "account", "model_effort", "seconds", "input_tokens", "output_tokens",
                                    "status"], r)) for r in rows])
        print(json.dumps(out, ensure_ascii=False, indent=1))
        return
    P("\n## สรุป run %s\nrun directory: %s\n" % (st["run_id"], rd))
    P(mc.table(["งาน", "บัญชี", "รุ่น/effort", "เวลา s", "input tokens", "output tokens", "สถานะ"], rows))
    if st["switches"]:
        P("\nการย้ายงานลูกทีม:\n" + mc.table(["งาน", "จาก", "ไป", "เหตุผล", "เวลา"],
                                               [[s["node"], s["from"], s["to"], s["reason"], s["ts"][11:19]]
                                                for s in st["switches"]]))
    P("\nโควตาของบัญชีที่ใช้:\n" + mc.table(["บัญชี", "โควตาล่าสุด"], [[a, mc.quota_text(quotas[a])] for a in used]))


def account_status_label(st, a):
    acc = st["accounts"].get(a, {})
    if acc.get("unusable"):
        return "ใช้ไม่ได้ (%s)" % acc["unusable"]
    if acc.get("stopped"):
        return "หยุดรับงาน (%s)" % acc.get("stop_reason")
    q = mc.quota_cache_load().get(a) or acc.get("quota")
    u = mc.quota_used_pct(q)
    if u is not None and u >= st["options"].get("threshold", 80) - 20:
        return "ใกล้หมด"
    return "พร้อม"


def status_table(st, rd):
    rows = []
    led = mc.read_ledger(os.path.join(rd, "ledger.jsonl"))
    for a in sorted(st["accounts"], key=lambda a: (mc.side_of(a) or "", mc._num_key(a))):
        acc = st["accounts"][a]
        running = [r["node"] for r in st["running"] if r["account"] == a]
        queued = [k for k, n in st["nodes"].items() if n.get("planned") == a and n["status"] in
                  ("pending", "waiting_approval")]
        toks = sum(mc.row_tokens(r) for r in led if r.get("account") == a and not r.get("event"))
        role = acc.get("role", "ลูกทีม")
        if st.get("leader", {}).get("current") == a:
            role = "หัวหน้า (ปัจจุบัน)"
        q = mc.quota_cache_load().get(a) or acc.get("quota")
        rows.append([a, role, ",".join(running) or "-", ",".join(queued) or "-", toks, mc.quota_text(q),
                     account_status_label(st, a)])
    return mc.table(["บัญชี", "บทบาท", "งานที่รัน", "งานในคิว", "tokens ใน run", "โควตาล่าสุด (เวลาของข้อมูล)",
                     "สถานะ"], rows)


# ============================================================ commands
def read_graph(arg):
    if arg == "-":
        data = sys.stdin.buffer.read().decode("utf-8-sig")
    else:
        path = arg if os.path.isabs(arg) or os.path.exists(arg) else os.path.join("/workspace", arg)
        with open(path, encoding="utf-8-sig") as f:
            data = f.read()
    try:
        return json.loads(data)
    except ValueError as e:
        raise SystemExit("กราฟไม่ใช่ JSON ที่ถูกต้อง: %s" % e)


def parse_budget(s):
    if not s:
        return {}
    out = {}
    for part in str(s).split(","):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = int(v)
        elif part:
            out["*"] = int(part)
    return out


def options_from(a, graph=None):
    g = (graph or {}).get("options") or {}
    o = dict(DEFAULTS)
    o.update({k: v for k, v in g.items()})
    for k in ("per_account", "max_total", "timeout", "threshold", "gate_timeout"):
        v = getattr(a, k, None)
        if v is not None:
            o[k] = v
    wb = parse_budget(getattr(a, "worker_token_budget", None)) or o.get("worker_budget") or {}
    o["worker_budget"] = wb
    sl = [x for x in (getattr(a, "simulate_limit", None) or "").split(",") if x] + mc._env_list("MA_SIMULATE_LIMIT")
    o["simulate_limit"] = sl
    return o


def run_threads(rd, ids):
    ths = [threading.Thread(target=execute_node, args=(rd, i), daemon=True) for i in ids]
    for t in ths:
        t.start()
    for t in ths:
        t.join()


def cmd_run(a):
    if a.resume:
        rid = a.resume
        rd = run_dir_of(rid)
        if not os.path.exists(os.path.join(rd, "state.json")):
            raise SystemExit("ไม่พบ run %s" % rid)
        st = load_state(rd)
        with open(os.path.join(rd, "graph.json"), encoding="utf-8") as f:
            graph = json.load(f)
        nodes = {n["id"]: n for n in graph_nodes(graph)}
        if a.graph:
            newg = read_graph(a.graph)
            for n in graph_nodes(newg):
                if n["id"] in nodes and st["nodes"].get(n["id"], {}).get("status") != "ok":
                    nodes[n["id"]] = n
        for s in a.set or []:
            m = re.match(r"([^.=]+)\.([A-Za-z_]+)=(.*)$", s, re.S)
            if not m or m.group(1) not in nodes:
                raise SystemExit("--set ต้องเป็น <node>.<field>=<value> ของ node ที่มีอยู่: %s" % s)
            v = m.group(3)
            nodes[m.group(1)][m.group(2)] = int(v) if v.isdigit() and m.group(2) in ("difficulty", "max_rounds", "timeout") else v
        graph["nodes"] = list(nodes.values())
        with open(os.path.join(rd, "graph.json"), "w", encoding="utf-8") as f:
            json.dump(graph, f, ensure_ascii=False, indent=1)
        redo = []

        def reset(st):
            for nid, n in nodes.items():
                e = st["nodes"].get(nid)
                if e and e["status"] != "ok":
                    e.update(status="pending", error="", spec_node=n, value=None)
                    redo.append(nid)
            st["accounts"] = {k: dict(v, unusable=None, stopped=False, stop_reason=None) for k, v in st["accounts"].items()}
            st["running"] = []
        update(rd, reset)
        P("▶ resume %s: รันใหม่เฉพาะ %s (งานที่สำเร็จแล้วไม่รันซ้ำ)" % (rid, ", ".join(redo) or "-"))
        pool = st.get("pool") or compute_pool(list(nodes.values()), None)
        setup_accounts(rd, pool, readiness(pool, a.recheck))
        def replan(st):
            for nid in redo:
                e = st["nodes"][nid]
                if e["type"] in ("task", "image"):
                    e["planned"] = choose(st, e["spec"], e.get("kind"))
        update(rd, replan)
        run_threads(rd, redo)
    else:
        if not a.graph:
            raise SystemExit("ต้องระบุกราฟ: run graph.json หรือ run - (stdin)")
        graph = read_graph(a.graph)
        nodes = graph_nodes(graph)
        errs = validate_graph(nodes)
        if errs:
            raise SystemExit("กราฟไม่ถูกต้อง:\n- " + "\n- ".join(errs))
        rid = a.run_id or new_run_id()
        rd = run_dir_of(rid)
        workers = [w.strip() for w in (a.workers or "").split(",") if w.strip()] or graph.get("workers")
        o = options_from(a, graph)
        init_run(rd, rid, graph, o)
        pool = compute_pool(nodes, workers)
        P("▶ run %s · run directory %s\n· บัญชีที่อนุญาต: %s" % (rid, rd, ", ".join(pool)))
        ready = readiness(pool, a.recheck)
        bad = ["%s=%s" % (k, mc.STATUS_TH.get(v["status"], v["status"])) for k, v in ready.items() if v["status"] != "ready"]
        if bad:
            P("· ข้ามบัญชีที่ใช้ไม่ได้: " + ", ".join(bad))
        setup_accounts(rd, pool, ready)
        add_nodes(rd, nodes)
        st = load_state(rd)
        P("· แผน: " + ", ".join("%s→%s" % (k, v.get("planned") or "/".join(node_accounts(v["spec_node"])))
                                 for k, v in st["nodes"].items()))
        if a.dry_run:
            P(status_table(st, rd))
            return 0
        run_threads(rd, [n["id"] for n in nodes])
    update(rd, lambda st: st.update(done=all(n["status"] in TERMINAL for n in st["nodes"].values())))
    print_summary(rd, a.json)
    st = load_state(rd)
    return 0 if all(n["status"] == "ok" for n in st["nodes"].values()) else 1


def resolve_rd(a):
    rid = getattr(a, "run", None) or os.environ.get("MA_TEAM_RUN") or latest_run()
    if not rid:
        return None
    rd = run_dir_of(rid)
    return rd if os.path.exists(os.path.join(rd, "state.json")) else None


def cmd_status(a):
    rd = resolve_rd(a)
    if not rd:
        P("ยังไม่มี run ใน %s (เริ่มด้วย team.py run หรือ team.py lead)" % mc.TEAM_ROOT)
        return 0
    st = load_state(rd)
    if a.refresh:
        for acc in st["accounts"]:
            if not st["accounts"][acc].get("unusable"):
                mc.quota(acc)
    P("run %s (%s) · เป้าหมาย: %s · เสร็จแล้ว: %s" % (st["run_id"], st["mode"], mc.short(st.get("goal") or "-", 100),
                                                     "ใช่" if st.get("done") else "ยัง"))
    if st.get("leader"):
        P("หัวหน้าปัจจุบัน: %s (episode %s)" % (st["leader"].get("current"), st["leader"].get("episode")))
    P(status_table(st, rd))
    P("\nงาน:\n" + mc.table(["งาน", "สถานะ", "บัญชี", "ค่า/ผล"], [
        [k, v["status"], v.get("account") or v.get("planned") or "-",
         mc.short(v.get("error") or v.get("value") or "", 70)] for k, v in st["nodes"].items()]))
    if st.get("leader"):
        _leader_check(rd, evaluate=False)
    return 0


def cmd_stats(a):
    rows = mc.read_ledger()
    if a.run:
        rows = [r for r in rows if r.get("run_id") == a.run]
    elif not a.all:
        rid = latest_run()
        if rid:
            rows = [r for r in rows if r.get("run_id") == rid]
            P("(run ล่าสุด %s · ใช้ --all เพื่อดูทั้งหมด)" % rid)
    if a.account:
        rows = [r for r in rows if r.get("account") == a.account]
    calls = [r for r in rows if not r.get("event")]
    if not calls:
        P("ยังไม่มีสถิติใน %s" % mc.GLOBAL_LEDGER)
        return 0
    if a.json:
        print(json.dumps(calls, ensure_ascii=False))
        return 0
    P(mc.stats_tables(calls))
    ev = [r for r in rows if r.get("event")]
    if ev:
        P("\nเหตุการณ์: " + ", ".join("%s×%d" % (k, sum(1 for r in ev if r["event"] == k))
                                      for k in sorted({r["event"] for r in ev})))
    return 0


def cmd_check(a):
    accs = [w for w in (a.workers or "").split(",") if w] or a.accounts or mc.list_accounts()
    res = mc.check_accounts(accs)
    print(json.dumps(res, ensure_ascii=False, indent=1) if a.json else mc.check_table(res))
    return 0


def cmd_quota(a):
    accs = [w for w in (a.workers or "").split(",") if w] or a.accounts or mc.list_accounts()
    txt, data = mc.quota_table(accs, refresh=a.refresh)
    print(json.dumps(data, ensure_ascii=False, indent=1) if a.json else txt)
    return 0


def cmd_approve(a):
    rd = run_dir_of(a.run_id)
    if not os.path.isdir(rd):
        raise SystemExit("ไม่พบ run %s" % a.run_id)
    path = os.path.join(rd, "approve", a.node)
    with open(path, "w", encoding="utf-8") as f:
        f.write("approved %s by %s\n" % (mc.now_iso(), a.by))
    board_append(rd, a.by, "อนุมัติงาน %s" % a.node)
    P("อนุมัติ %s แล้ว (%s)" % (a.node, path))
    return 0


def cmd_board(a):
    rd = resolve_rd(a)
    if not rd:
        P("ยังไม่มี run")
        return 0
    if a.text:
        board_append(rd, a.author, " ".join(a.text))
    with open(os.path.join(rd, "board.md"), encoding="utf-8") as f:
        P(f.read())
    return 0


def cmd_msg(a):
    rd = resolve_rd(a)
    if not rd:
        raise SystemExit("ยังไม่มี run")
    P(msg_append(rd, a.frm, a.to, " ".join(a.text)))
    return 0


# ======================================================== leader tools
def _leader_touch(rd, **kw):
    def fn(st):
        st["leader"]["heartbeat"] = mc.now_iso()
        st["leader"]["hb_epoch"] = time.time()
        st["leader"].update(kw)
        return st["leader"]
    return update(rd, fn)


def _leader_check(rd, evaluate=True):
    """Called after dispatch/checkpoint/wait: budget check during the episode."""
    st = load_state(rd)
    L = st.get("leader") or {}
    budget = L.get("budget")
    if evaluate and budget and (L.get("tokens") or 0) > budget and not L.get("stop_requested"):
        def fn(st):
            st["leader"]["stop_requested"] = mc.now_iso()
            st["leader"]["stop_reason"] = "หัวหน้าใช้ tokens %d เกินงบ %d" % (L.get("tokens") or 0, budget)
        update(rd, fn)
        L = load_state(rd)["leader"]
    if L.get("stop_requested") and os.environ.get("MA_TEAM_ROLE") == "leader":
        P("\nSTOP: %s — รัน checkpoint ทันที (ระบุสิ่งที่ทำแล้วและขั้นต่อไป) แล้วจบรอบนี้ หัวหน้าคนถัดไปจะทำต่อจาก handoff.md" %
          (L.get("stop_reason") or "ผู้ควบคุมขอให้ส่งไม้ต่อ"))
        return True
    return False


def cmd_dispatch(a):
    rd = resolve_rd(a)
    if not rd:
        raise SystemExit("ไม่พบ run (ใส่ --run)")
    st = load_state(rd)
    if a.id in st["nodes"]:
        P("งาน %s มีอยู่แล้ว สถานะ %s (ไม่สั่งซ้ำ) ผล: %s" % (a.id, st["nodes"][a.id]["status"],
                                                            os.path.join(rd, "out", a.id + ".md")))
        _leader_check(rd)
        return 0
    prompt = sys.stdin.read() if a.prompt == "-" else a.prompt
    n = dict(id=a.id, prompt=prompt, account=a.account, difficulty=a.difficulty,
             depends_on=[x for x in (a.depends or "").split(",") if x], type=a.type)
    for k in ("expect", "kind", "cwd", "model", "effort", "path"):
        if getattr(a, k, None):
            n[k] = getattr(a, k)
    n = norm_node(n, {})
    errs = [e for e in validate_graph([n]) if "depends_on" not in e]
    for d in n["depends_on"]:
        if d not in st["nodes"]:
            errs.append("depends_on ไม่พบ %s" % d)
    if errs:
        raise SystemExit("; ".join(errs))
    if a.account not in ("any", "yolo", "cyolo") and a.account not in st.get("pool", []):
        pool = st.get("pool", [])
        raise SystemExit("บัญชี %s ไม่อยู่ในรายชื่อที่อนุญาต (%s)" % (a.account, ",".join(pool)))
    add_nodes(rd, [n])
    with open(os.path.join(rd, "graph.json"), encoding="utf-8") as f:
        g = json.load(f)
    g.setdefault("nodes", []).append(n)
    with open(os.path.join(rd, "graph.json"), "w", encoding="utf-8") as f:
        json.dump(g, f, ensure_ascii=False, indent=1)
    spawn_exec(rd, load_state(rd)["run_id"], a.id)
    st = load_state(rd)
    P("สั่งงาน %s แล้ว → บัญชีที่วางแผน %s · ผลจะอยู่ที่ %s" % (a.id, st["nodes"][a.id].get("planned") or a.account,
                                                            os.path.join(rd, "out", a.id + ".md")))
    if os.environ.get("MA_TEAM_ROLE") == "leader":
        _leader_touch(rd, dispatch_count=(st["leader"].get("dispatch_count") or 0) + 1)
    _leader_check(rd)
    return 0


def spawn_exec(rd, rid, nid):
    """Start a worker fully detached (double fork): it is no longer a descendant of the
    leader's CLI process, so killing/stopping the leader cannot kill the worker."""
    logp = os.path.join(rd, "logs", nid + ".log")
    pid = os.fork()
    if pid == 0:
        try:
            os.setsid()
            if os.fork() != 0:
                os._exit(0)
            fd = os.open(logp, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
            nul = os.open(os.devnull, os.O_RDONLY)
            os.dup2(nul, 0)
            os.dup2(fd, 1)
            os.dup2(fd, 2)
            os.execv(sys.executable, [sys.executable, TEAM_PY, "_exec", "--run", rid, "--node", nid])
        finally:
            os._exit(1)
    os.waitpid(pid, 0)
    _set_node(rd, nid, spawned=time.time())


def revive_workers(rd):
    """Supervisor safety net: a dispatched worker whose process vanished is restarted when it
    has not spent tokens yet; otherwise it is marked failed (no automatic paid retry)."""
    st = load_state(rd)
    led = None
    for nid, n in st["nodes"].items():
        if n["status"] not in ("pending", "running", "waiting_approval") or not n.get("spawned"):
            continue
        pid = n.get("exec_pid")
        if pid:
            try:
                os.kill(pid, 0)
                if open("/proc/%d/stat" % pid).read().split()[2] != "Z":
                    continue
            except (OSError, IndexError):
                pass
        elif time.time() - n["spawned"] < 15:
            continue
        if led is None:
            led = mc.read_ledger(os.path.join(rd, "ledger.jsonl"))
        spent = [r for r in led if not r.get("event") and str(r.get("node") or "").split("#")[0] == nid]
        if spent:
            _set_node(rd, nid, status="failed", error="process ของลูกทีมหายกลางคันหลังใช้ tokens แล้ว (ไม่ retry อัตโนมัติ)")
            board_append(rd, "ผู้ควบคุม", "งาน %s: process ลูกทีมหายกลางคัน ทำเครื่องหมายล้ม" % nid)
        else:
            board_append(rd, "ผู้ควบคุม", "งาน %s: process ลูกทีมหายก่อนเริ่มเรียกโมเดล เริ่มใหม่ให้" % nid)
            P("♻ เริ่ม process ลูกทีม %s ใหม่ (process เดิมหายก่อนใช้ tokens)" % nid)
            _set_node(rd, nid, status="pending", exec_pid=None)
            spawn_exec(rd, st["run_id"], nid)


def cmd_exec(a):
    rd = run_dir_of(a.run)
    _set_node(rd, a.node, exec_pid=os.getpid())
    execute_node(rd, a.node)
    return 0


def cmd_wait(a):
    rd = resolve_rd(a)
    if not rd:
        raise SystemExit("ไม่พบ run")
    ids = [x for x in (a.ids or "").split(",") if x]
    deadline = time.time() + a.timeout
    while True:
        st = load_state(rd)
        target = ids or list(st["nodes"].keys())
        pending = [i for i in target if st["nodes"].get(i, {}).get("status") not in TERMINAL]
        if os.environ.get("MA_TEAM_ROLE") == "leader":
            _leader_touch(rd)
        if not pending or time.time() > deadline:
            break
        time.sleep(2)
    P(mc.table(["งาน", "สถานะ", "บัญชี", "ค่า (สั้น)", "ไฟล์ผล"], [
        [i, st["nodes"].get(i, {}).get("status", "ไม่พบ"), st["nodes"].get(i, {}).get("account") or "-",
         mc.short(st["nodes"].get(i, {}).get("error") or st["nodes"].get(i, {}).get("value") or "", 60),
         os.path.join(rd, "out", i + ".md")] for i in target]))
    if pending:
        P("ยังไม่เสร็จ: %s (เรียก wait อีกครั้ง)" % ", ".join(pending))
    if os.environ.get("MA_TEAM_ROLE") == "leader":
        _leader_check(rd)
    return 0


def cmd_checkpoint(a):
    rd = resolve_rd(a)
    if not rd:
        raise SystemExit("ไม่พบ run")
    st = load_state(rd)
    who = st.get("leader", {}).get("current") or "?"
    ep = st.get("leader", {}).get("episode")
    with open(os.path.join(rd, "handoff.md"), "a", encoding="utf-8") as f:
        f.write("\n## checkpoint %s · หัวหน้า %s (episode %s)\n- ทำแล้ว: %s\n- กำลังรัน/รอ: %s\n- ขั้นต่อไป: %s\n%s" % (
            mc.now_iso()[:19].replace("T", " "), who, ep, a.done, a.running or "-", a.next,
            "- การตัดสินใจสำคัญ: %s\n" % a.decision if a.decision else ""))
    _leader_touch(rd, checkpoint_at=mc.now_iso(), checkpoints=(st["leader"].get("checkpoints") or 0) + 1)
    P("บันทึก checkpoint แล้ว (%s)" % os.path.join(rd, "handoff.md"))
    _leader_check(rd)
    return 0


def cmd_finish(a):
    rd = resolve_rd(a)
    if not rd:
        raise SystemExit("ไม่พบ run")
    if a.output and not os.path.exists(a.output):
        raise SystemExit("ไม่พบไฟล์ผลลัพธ์ %s (เขียนไฟล์ก่อนแล้วค่อย finish)" % a.output)

    def fn(st):
        st["done"] = True
        st["final"] = dict(output=a.output, summary=a.summary, by=st.get("leader", {}).get("current"), ts=mc.now_iso())
    update(rd, fn)
    board_append(rd, "หัวหน้า", "จบงาน: %s" % a.summary)
    P("บันทึกว่างานเสร็จแล้ว ผู้ควบคุมจะสรุปผล")
    return 0


# ============================================================ supervisor
LEADER_PROMPT = """คุณคือหัวหน้าทีม (บัญชี {acc} · episode {ep}) ของงานทีม run {rid}
เป้าหมาย: {goal}

สถานะทั้งหมดอยู่ในไฟล์ ไม่ได้อยู่ในความจำของคุณ เริ่มด้วยการอ่าน {rd}/handoff.md และรัน `{T} status`
คำสั่งของคุณ (T = {T} · ทุกคำสั่งรู้ run เองจาก env):
- สั่งงานลูกทีม: T dispatch --id <id> --difficulty <1-6> [--account any|yolo|cyolo] [--depends a,b] [--expect number|json] --prompt "<โจทย์ที่ครบในตัว ระบุ path แบบ absolute>"
  ลูกทีมรันเป็น process แยก (ผลอยู่ที่ {rd}/out/<id>.md) · id ซ้ำ = ไม่สั่งซ้ำ · ใช้ {{{{file:<id>}}}} ในโจทย์เพื่ออ้างผลของงานก่อนหน้าเป็น path
- รอผล: T wait --ids a,b (รอได้สูงสุด 300 วินาทีต่อครั้ง เรียกซ้ำได้)
- บันทึกจุดพัก (หลังทุกขั้นสำคัญ และก่อนจบรอบ): T checkpoint --done "..." --next "..." [--decision "..."]
- จบงานเมื่อเป้าหมายเสร็จและเขียนไฟล์ผลรวมแล้ว: T finish --output <absolute path> --summary "..."
กติกา:
1. แบ่งงานเป็นชิ้นเล็กให้ลูกทีมทำ ห้ามทำงานย่อยเอง ยกเว้นการรวมผลเป็นไฟล์เดียว (อ่าน out/*.md แล้วเขียนไฟล์ผลรวมที่ {rd}/final/)
2. อย่าสั่งงานที่มีอยู่แล้วซ้ำ ดูจาก `T status` · งานใดล้มให้ตัดสินใจเองว่าจะสั่งงานใหม่ (id ใหม่) หรือไม่
3. ถ้าคำสั่งใดพิมพ์ STOP ให้รัน checkpoint ทันทีแล้วจบรอบ ไม่ต้องทำอย่างอื่น
4. ตอบสั้น ๆ ไม่ต้องอธิบายยาว"""


def pick_leader(st, succession, exclude):
    cands = [a for a in succession if a not in exclude]
    ready = [a for a in cands if st["accounts"].get(a, {}).get("check") == "ready"
             and not st["accounts"][a].get("lead_failed")]
    if not ready:
        return None
    prev = st.get("leader", {}).get("current")
    side = mc.side_of(prev) if prev else mc.side_of(ready[0])
    # explicit succession order first; same side before the other side when automatic
    if st["options"].get("succession_explicit"):
        return ready[0]
    same = [a for a in ready if mc.side_of(a) == side]
    other = [a for a in ready if mc.side_of(a) != side]
    key = lambda a: (mc.quota_used_pct(mc.quota_cache_load().get(a) or st["accounts"][a].get("quota")) or 50)
    return (sorted(same, key=key) + sorted(other, key=key))[0]


def write_auto_handoff(rd, st, note):
    lines = ["\n## สถานะอัตโนมัติจากผู้ควบคุม %s (%s)" % (mc.now_iso()[:19].replace("T", " "), note)]
    for k, n in st["nodes"].items():
        lines.append("- %s: %s · บัญชี %s · %s" % (k, n["status"], n.get("account") or n.get("planned") or "-",
                                                  mc.short(n.get("error") or n.get("value") or "", 80)))
    if not st["nodes"]:
        lines.append("- ยังไม่มีงานที่สั่ง")
    with open(os.path.join(rd, "handoff.md"), "a", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def lead_switch(rd, frm, to, typ, reason):
    def fn(st):
        h = dict(**{"from": frm}, to=to, type=typ, reason=reason, ts=mc.now_iso())
        st["lead_history"].append(h)
        event(rd, st, "lead_switch", account=to, to=to, reason=reason, type=typ, **{"from": frm})
        if frm in st["accounts"]:
            st["accounts"][frm]["role"] = "หัวหน้าเดิม"
        if to in st["accounts"]:
            st["accounts"][to]["role"] = "หัวหน้า"
        write_auto_handoff(rd, st, "สลับหัวหน้า %s → %s" % (frm, to))
    update(rd, fn)
    board_append(rd, "ผู้ควบคุม", "สลับหัวหน้า%s %s → %s: %s" % (typ, frm, to or "-", reason))
    P("⇄ สลับหัวหน้า%s: %s → %s (%s)" % (typ, frm, to or "-", reason))


def run_episode(rd, acc, ep, opts):
    st = load_state(rd)
    T = "python3 " + TEAM_PY
    prompt = LEADER_PROMPT.format(acc=acc, ep=ep, rid=st["run_id"], goal=st["goal"], rd=rd, T=T)
    budget = None
    lb = opts.get("lead_budget") or {}
    budget = lb.get(acc) or lb.get("*")
    if opts.get("demo") and ep_index(st, acc) == 2:
        budget = 1

    def fn(s):
        s["leader"].update(current=acc, episode=ep, tokens=0, budget=budget, stop_requested=None, stop_reason=None,
                           dispatch_count=0, hb_epoch=time.time(), heartbeat=mc.now_iso(), checkpoints=0,
                           started=mc.now_iso())
    update(rd, fn)
    env = dict(os.environ, MA_TEAM_RUN=st["run_id"], MA_TEAM_ROLE="leader")
    holder = []
    out = {}
    last_flush = [0.0]

    def on_event(kind, data):
        if kind == "tokens":
            tok = (data.get("input") or 0) + (data.get("cache_write") or 0) + (data.get("output") or 0)
            if time.time() - last_flush[0] > 1.0 or True:
                last_flush[0] = time.time()
                update(rd, lambda s: s["leader"].update(tokens=tok, hb_epoch=time.time()))

    model, effort = model_for({"difficulty": opts.get("leader_difficulty", 2)}, acc)
    sim = acc in (opts.get("simulate_limit") or [])

    def target():
        if mc.cli_of(acc) == "claude":
            out["res"] = mc.call_claude(acc, prompt, model, effort, cwd=rd, timeout=opts.get("episode_timeout", 1800),
                                        run_dir=rd, run_id=st["run_id"], node="lead#%d" % ep, on_event=on_event,
                                        proc_holder=holder, env=env, simulate_limit=sim)
        else:
            out["res"] = mc.call_codex(acc, prompt, model, effort, cwd=rd, timeout=opts.get("episode_timeout", 1800),
                                       run_dir=rd, run_id=st["run_id"], node="lead#%d" % ep, proc_holder=holder,
                                       env=env, simulate_limit=sim)
    P("👑 episode %d: หัวหน้า %s (%s/%s)%s" % (ep, acc, model or "default", effort,
                                              " งบ %s tokens" % budget if budget else ""))
    th = threading.Thread(target=target, daemon=True)
    th.start()
    crash_on = opts.get("simulate_crash") or []
    if opts.get("demo") and ep_index(load_state(rd), acc) == 1:
        crash_on = list(crash_on) + [acc]
    killed = None
    seen_dispatch = 0
    while th.is_alive():
        th.join(1.0)
        revive_workers(rd)
        s = load_state(rd)
        L = s["leader"]
        if L.get("dispatch_count", 0) != seen_dispatch:
            seen_dispatch = L.get("dispatch_count", 0)
        if acc in crash_on and seen_dispatch >= 1 and not killed:
            killed = "crash"
            P("💥 จำลองหัวหน้า %s ล้มกลางคัน (หลังสั่งงาน %d ชิ้น)" % (acc, seen_dispatch))
            for p in holder:
                mc._kill(p)
        if L.get("stop_requested") and not killed:
            cp = L.get("checkpoint_at") or ""
            if cp > L["stop_requested"]:
                time.sleep(3)
                killed = "budget"
                for p in holder:
                    mc._kill(p)
        if not killed and time.time() - (L.get("hb_epoch") or time.time()) > opts.get("heartbeat_timeout", 900):
            killed = "heartbeat"
            for p in holder:
                mc._kill(p)
    res = out.get("res") or {}
    s = load_state(rd)
    if s.get("done"):
        return "done", None
    if killed == "crash":
        return "reactive", "หัวหน้าหยุดกะทันหัน (จำลอง --simulate-crash)"
    if killed == "budget" or s["leader"].get("stop_requested"):
        return "proactive", s["leader"].get("stop_reason") or "เกินงบหัวหน้า"
    if killed == "heartbeat":
        return "reactive", "heartbeat ไม่อัปเดตเกิน %ss" % opts.get("heartbeat_timeout", 900)
    if not res.get("ok"):
        return "reactive", "รอบของหัวหน้าล้ม (%s): %s" % (res.get("status"), mc.short(res.get("error"), 80))
    lb_total = sum(mc.row_tokens(r) for r in mc.read_ledger(os.path.join(rd, "ledger.jsonl"))
                   if r.get("account") == acc and str(r.get("node") or "").startswith("lead#"))
    if budget and lb_total > budget:
        return "proactive", "หัวหน้าใช้ tokens %d เกินงบ %d" % (lb_total, budget)
    q = mc.quota_cache_load().get(acc)
    u = mc.quota_used_pct(q)
    if u is not None and u >= opts.get("threshold", 80):
        return "proactive", "โควตาหัวหน้า %s%% ≥ เกณฑ์" % u
    return "continue", None


def ep_index(st, acc):
    """1-based index of acc among distinct leaders so far (demo uses it)."""
    order = []
    for h in st.get("lead_history", []):
        for x in (h["from"], h["to"]):
            if x and x not in order:
                order.append(x)
    first = st.get("leader", {}).get("first")
    if first and first not in order:
        order.insert(0, first)
    return order.index(acc) + 1 if acc in order else len(order) + 1


def cmd_lead(a):
    workers = [w.strip() for w in (a.workers or "").split(",") if w.strip()]
    if a.resume:
        rid = a.resume
        rd = run_dir_of(rid)
        st = load_state(rd)
        opts = st["options"]
    else:
        goal = a.goal
        if a.demo and not goal:
            goal = DEMO_GOAL
        if not goal:
            raise SystemExit("ต้องระบุ --goal (หรือใช้ --demo เพื่อใช้งานตัวอย่าง)")
        rid = a.run_id or new_run_id()
        rd = run_dir_of(rid)
        opts = options_from(a)
        opts.update(lead_budget=parse_budget(a.lead_token_budget), simulate_crash=[x for x in (a.simulate_crash or "").split(",") if x],
                    demo=a.demo, leader_difficulty=a.leader_difficulty, episode_timeout=a.episode_timeout,
                    heartbeat_timeout=a.heartbeat_timeout, succession_explicit=bool(a.succession))
        if a.demo:
            opts.update(demo_limit_first_worker=True, demo_budget_first_worker=True, per_account=1)
        init_run(rd, rid, {"goal": goal, "nodes": []}, opts, mode="lead", goal=goal.replace("{run_dir}", rd))
        goal = goal.replace("{run_dir}", rd)
        update(rd, lambda st: st.update(goal=goal))
        pool = workers or mc.list_accounts()
        succession = [x for x in (a.succession or "").split(",") if x]
        allp = list(dict.fromkeys(pool + succession))
        P("▶ lead run %s · run directory %s" % (rid, rd))
        P("· เป้าหมาย: %s" % goal)
        ready = readiness(allp, a.recheck)
        bad = ["%s=%s" % (k, mc.STATUS_TH.get(v["status"], v["status"])) for k, v in ready.items() if v["status"] != "ready"]
        if bad:
            P("· ข้ามบัญชีที่ใช้ไม่ได้: " + ", ".join(bad))
        setup_accounts(rd, allp, ready)
        if not succession:
            rl = [x for x in allp if ready.get(x, {}).get("status") == "ready"]
            claude = [x for x in rl if mc.side_of(x) == "yolo"]
            codex = [x for x in rl if mc.side_of(x) == "cyolo"]
            first = a.leader or (claude or codex or [None])[0]
            rest = [x for x in claude + codex if x != first]
            succession = [first] + rest
        elif a.leader:
            succession = [a.leader] + [x for x in succession if x != a.leader]
        update(rd, lambda st: st.update(succession=succession, pool=[x for x in pool]))
        update(rd, lambda st: st["leader"].update(first=succession[0]))
        if a.demo:
            P("· โหมดสาธิต: หัวหน้าคนที่ 1 ล้มกลางคัน (เชิงรับ) · หัวหน้าคนที่ 2 งบ 1 token (เชิงรุก) · "
              "ลูกทีมคนแรกจำลองโควตาหมด (ย้ายงาน) · ลูกทีมที่ทำงานแรกเสร็จเกินงบ (หยุดรับงาน)")
        P("· ลำดับผู้สืบทอด: %s" % " → ".join(x for x in succession if x))
    st = load_state(rd)
    succession = st.get("succession") or []
    leader = st.get("leader", {}).get("current") or succession[0]
    if not leader:
        raise SystemExit("ไม่มีบัญชีที่พร้อมเป็นหัวหน้า")
    tried_fail = set()
    ep = st.get("leader", {}).get("episode") or 0
    t0 = time.time()
    while ep < a.max_episodes:
        ep += 1
        outcome, reason = run_episode(rd, leader, ep, load_state(rd)["options"])
        if outcome == "done":
            P("✔ หัวหน้า %s ประกาศจบงาน" % leader)
            break
        if outcome == "continue":
            P("· episode %d จบโดยยังไม่ finish หัวหน้า %s ทำต่อรอบถัดไป" % (ep, leader))
            continue
        typ = "เชิงรับ" if outcome == "reactive" else "เชิงรุก"
        tried_fail.add(leader)
        if outcome == "reactive":
            update(rd, lambda st: st["accounts"].setdefault(leader, {}).update(lead_failed=reason))
        nxt = pick_leader(load_state(rd), succession, tried_fail)
        lead_switch(rd, leader, nxt, typ, reason)
        if not nxt:
            P("✘ ไม่มีผู้สืบทอดที่พร้อม หยุดงาน (resume ได้ด้วย lead --resume %s)" % st["run_id"])
            break
        leader = nxt
    # wait for workers that are still running
    deadline = time.time() + a.episode_timeout
    while time.time() < deadline:
        st = load_state(rd)
        if all(n["status"] in TERMINAL or n["status"] == "waiting_approval" for n in st["nodes"].values()):
            break
        revive_workers(rd)
        time.sleep(2)
    lead_summary(rd, time.time() - t0)
    st = load_state(rd)
    ok = st.get("done") and all(n["status"] == "ok" for n in st["nodes"].values())
    return 0 if ok else 1


DEMO_GOAL = ("ทำเอกสารสรุปตัวเลข 4 ข้อ: (1) 17*23 (2) 2**12 (3) ผลรวม 1..50 (4) จำนวนเฉพาะที่น้อยกว่า 30 มีกี่ตัว "
             "ให้ลูกทีมคนละข้อ (difficulty 1, --expect number) แล้วรวมเป็นไฟล์ Markdown เดียวที่ {run_dir}/final/result.md "
             "เป็นตาราง ข้อ | โจทย์ | คำตอบ | บัญชีที่ทำ")


def lead_summary(rd, elapsed):
    st = load_state(rd)
    P("\n## สรุป lead run %s (%.0f วินาที)\nrun directory: %s" % (st["run_id"], elapsed, rd))
    fin = st.get("final") or {}
    P("ผลลัพธ์รวม: %s · สรุปจากหัวหน้า: %s" % (fin.get("output") or "-", fin.get("summary") or "-"))
    P("\nประวัติการสลับหัวหน้า:\n" + (mc.table(["จาก", "ไป", "ชนิด", "เหตุผล", "เวลา"], [
        [h["from"], h["to"] or "-", h["type"], h["reason"], h["ts"][11:19]] for h in st["lead_history"]])
        if st["lead_history"] else "(ไม่มี)"))
    P("\nการย้ายงานลูกทีม:\n" + (mc.table(["งาน", "จาก", "ไป", "เหตุผล", "เวลา"], [
        [s["node"], s["from"], s["to"] or "-", s["reason"], s["ts"][11:19]] for s in st["switches"]])
        if st["switches"] else "(ไม่มี)"))
    stops = [e for e in st.get("events", []) if e.get("event") == "worker_stop"]
    if stops:
        P("\nบัญชีที่หยุดรับงาน:\n" + mc.table(["บัญชี", "เหตุผล"], [[e.get("account"), e.get("reason")] for e in stops]))
    P("\nผลของแต่ละงาน:\n" + mc.table(["งาน", "บัญชี", "รุ่น/effort", "เวลา s", "input tokens", "output tokens", "สถานะ"],
                                      summary_rows(st, rd)))
    P("\nสถิติแยกตามบัญชี (รวมหัวหน้า):")
    P(mc.stats_tables([r for r in mc.read_ledger(os.path.join(rd, "ledger.jsonl")) if not r.get("event")],
                      by=("account",)))
    P("\nสถานะบัญชี:\n" + status_table(st, rd))


# ================================================================= main
def main(argv=None):
    ap = argparse.ArgumentParser(description="multi-account agent team")
    sp = ap.add_subparsers(dest="cmd")

    r = sp.add_parser("run", help="run a task graph")
    r.add_argument("graph", nargs="?", help="graph.json path (relative paths resolve to /workspace) or - for stdin")
    r.add_argument("--resume", metavar="RUN_ID")
    r.add_argument("--set", action="append", help="on resume: <node>.<field>=<value> (prompt, expect, account...)")
    r.add_argument("--workers", help="only these accounts, e.g. yolo1,yolo2,cyolo1")
    r.add_argument("--per-account", type=int, dest="per_account")
    r.add_argument("--max-total", type=int, dest="max_total")
    r.add_argument("--timeout", type=int)
    r.add_argument("--threshold", type=int, help="stop giving work at quota %% (default 80)")
    r.add_argument("--gate-timeout", type=int, dest="gate_timeout")
    r.add_argument("--worker-token-budget", help="N (every worker) or acc=N,acc2=M")
    r.add_argument("--simulate-limit", help="accounts that fail like quota exhausted (test)")
    r.add_argument("--run-id")
    r.add_argument("--recheck", action="store_true", help="ignore readiness cache (10 min)")
    r.add_argument("--dry-run", action="store_true", help="plan only, no model calls besides readiness")
    r.add_argument("--json", action="store_true")

    ld = sp.add_parser("lead", help="supervised leader episodes with handoff")
    ld.add_argument("--goal")
    ld.add_argument("--demo", action="store_true", help="turn on all simulators (works with your own --goal)")
    ld.add_argument("--leader")
    ld.add_argument("--succession", help="e.g. yolo1,yolo2,cyolo1")
    ld.add_argument("--workers")
    ld.add_argument("--lead-token-budget", help="N or acc=N")
    ld.add_argument("--worker-token-budget")
    ld.add_argument("--simulate-crash", help="leader account(s) that crash after their first dispatch")
    ld.add_argument("--simulate-limit", help="account(s) failing like quota exhausted")
    ld.add_argument("--leader-difficulty", type=int, default=2)
    ld.add_argument("--max-episodes", type=int, default=8)
    ld.add_argument("--episode-timeout", type=int, default=1800)
    ld.add_argument("--heartbeat-timeout", type=int, default=900)
    ld.add_argument("--per-account", type=int, dest="per_account")
    ld.add_argument("--max-total", type=int, dest="max_total")
    ld.add_argument("--timeout", type=int)
    ld.add_argument("--threshold", type=int)
    ld.add_argument("--resume", metavar="RUN_ID")
    ld.add_argument("--run-id")
    ld.add_argument("--recheck", action="store_true")

    s = sp.add_parser("status")
    s.add_argument("--run")
    s.add_argument("--refresh", action="store_true")
    s = sp.add_parser("stats")
    s.add_argument("--run")
    s.add_argument("--all", action="store_true")
    s.add_argument("--account")
    s.add_argument("--json", action="store_true")
    for name in ("check", "quota"):
        c = sp.add_parser(name)
        c.add_argument("accounts", nargs="*")
        c.add_argument("--workers")
        c.add_argument("--json", action="store_true")
        if name == "quota":
            c.add_argument("--refresh", action="store_true")
    ap_ = sp.add_parser("approve")
    ap_.add_argument("run_id")
    ap_.add_argument("node")
    ap_.add_argument("--by", default="human")
    b = sp.add_parser("board")
    b.add_argument("text", nargs="*")
    b.add_argument("--run")
    b.add_argument("--author", default="agent")
    m = sp.add_parser("msg")
    m.add_argument("frm")
    m.add_argument("to")
    m.add_argument("text", nargs="+")
    m.add_argument("--run")

    d = sp.add_parser("dispatch", help="(leader) start a worker task in the background")
    d.add_argument("--run")
    d.add_argument("--id", required=True)
    d.add_argument("--prompt", required=True)
    d.add_argument("--account", default="any")
    d.add_argument("--difficulty", type=int, default=2)
    d.add_argument("--depends")
    d.add_argument("--expect")
    d.add_argument("--kind")
    d.add_argument("--type", default="task", choices=["task", "image"])
    d.add_argument("--path")
    d.add_argument("--cwd")
    d.add_argument("--model")
    d.add_argument("--effort")
    w = sp.add_parser("wait")
    w.add_argument("--run")
    w.add_argument("--ids")
    w.add_argument("--timeout", type=int, default=300)
    c = sp.add_parser("checkpoint")
    c.add_argument("--run")
    c.add_argument("--done", required=True)
    c.add_argument("--next", required=True)
    c.add_argument("--running")
    c.add_argument("--decision")
    f = sp.add_parser("finish")
    f.add_argument("--run")
    f.add_argument("--output")
    f.add_argument("--summary", required=True)
    x = sp.add_parser("_exec")
    x.add_argument("--run", required=True)
    x.add_argument("--node", required=True)

    a = ap.parse_args(argv)
    if not a.cmd:
        ap.print_help()
        return 0
    fn = {"run": cmd_run, "lead": cmd_lead, "status": cmd_status, "stats": cmd_stats, "check": cmd_check,
          "quota": cmd_quota, "approve": cmd_approve, "board": cmd_board, "msg": cmd_msg,
          "dispatch": cmd_dispatch, "wait": cmd_wait, "checkpoint": cmd_checkpoint, "finish": cmd_finish,
          "_exec": cmd_exec}[a.cmd]
    return fn(a)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
