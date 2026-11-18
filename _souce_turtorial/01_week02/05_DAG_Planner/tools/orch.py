#!/usr/bin/env python3
"""orch.py — "มือ" ของ Agent Orchestra (AI เป็นคนเรียกใช้ นักศึกษาไม่ต้องรันเอง)

แบ่งหน้าที่:
  สมอง (orchestrator AI ที่ทำตาม ORCHESTRA_RECIPE.md)  : อ่านโจทย์ แตกงาน เขียน prompt ของแต่ละงาน ตรวจผล
  มือ  (ไฟล์นี้ · ไม่ใช้ token)                         : วัดโควตา จับคู่งาน-บัญชี เปิด worker ดูโทเคน สลับบัญชี merge

คำสั่ง (ทุกคำสั่งรับ --run <โฟลเดอร์งาน>):
  init     --problem FILE [--max-agents 12] [--mirror DIR]   สร้างโฟลเดอร์งาน (mirror = copy BOARD.md ไปให้ดูสด)
  quota                                       สำรวจบัญชีทั้งหมด → ตารางคะแนน + บัญชีที่ควรเป็น orchestrator
  whoami                                      บัญชีของ session นี้ (จาก CLAUDE_CONFIG_DIR / CODEX_HOME)
  check                                       ตรวจ tasks.json (id ซ้ำ, dependency วน, ไฟล์ prompt ครบ)
  dispatch                                    เปิด worker ให้งานที่พร้อม ตามกติกา (ไม่เกิน max_agents)
  wait     [--timeout 540]                    เฝ้าดู worker · สลับบัญชีอัตโนมัติ · merge · คืน event ให้สมอง
  board                                       เขียน/พิมพ์ BOARD.md
  start    --task T --account A               สั่งเปิดงานกับบัญชีที่ระบุเอง (override)
  stop     --task T [--requeue]               หยุดงาน (requeue = ส่งต่อให้บัญชีอื่น)
  retry    --task T [--note TEXT]             ให้งาน failed/conflict กลับเข้าคิว
  handover [--to ACCOUNT]                     ส่งไม้ orchestrator ให้บัญชีที่โทเคนเหลือมากที่สุด
  infra    up|down                            เปิด/ปิด Postgres กลางสำหรับ dev (bm-devdb)
  report                                      สรุปทั้งรัน → REPORT.md (งาน × บัญชี × โทเคน × การสลับ)
  export   --to DIR                           copy โค้ด main + board + report ไปโฟลเดอร์ใน repo
"""
import argparse, datetime as dt, json, os, re, signal, subprocess, sys, time, glob, shutil
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

TZ = ZoneInfo(os.environ.get("TZ_NAME", "Asia/Bangkok"))
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/root/ai-accounts"
if os.path.exists("/etc/ai-accounts.conf"):
    for line in open("/etc/ai-accounts.conf"):
        m = re.match(r'\s*BASE_PATH="?([^"\n]+)"?', line)
        if m: BASE = os.path.expandvars(m.group(1).strip())

DEFAULT_CFG = {
    "max_agents": 12,              # worker ที่รันพร้อมกันสูงสุด (ไม่นับงาน image ของ cyolo)
    "max_image_jobs": 5,           # งาน image (cyolo) พร้อมกันสูงสุด — ไม่นับใน max_agents
    "per_account_max": {"yolo": 4, "cyolo": 3},
    "slot_pct": 8,                 # 1 slot ต้องมี headroom อย่างน้อยกี่ %
    "safety": 1.3,                 # ประเมินว่าพอ = headroom >= ค่าประเมิน x safety
    "switch_at": 90,               # (เดิม) ตอนนี้ใช้ margin() แทน — เหลือไว้ให้ config เก่าอ่านได้
    "hard_stop_at": 97,            # ใช้จริงถึงกี่ % → หยุดงานบนบัญชีนั้นทันที
    "orch_min_headroom": 15,       # orchestrator เหลือน้อยกว่านี้ → ส่งไม้ต่อ
    "usage_poll_sec": 90,          # อ่าน /usage ของบัญชี Claude ทุกกี่วินาที (ฟรี ไม่เสียโทเคน)
    "max_attempts": 4,
    # อัลกอริทึม KC-QUEST (KMITL–Chanwanich Quota-Urgency Expiry-aware Scheduling Technique) — ตัวแปร (factor) ที่ใช้ให้คะแนนบัญชี
    # เพิ่ม/ลดตัวแปรได้: ใส่น้ำหนัก 0 = ปิดตัวแปรนั้น · น้ำหนักติดลบ = เป็นค่าปรับ · เพิ่มตัวแปรใหม่ = เพิ่มฟังก์ชันใน FACTORS
    "weights": {"urgency": 0.40, "fit": 0.20, "session": 0.15, "speed": 0.15, "load": -0.10, "bonus": 0.0},
    "speed": {"yolo": 1.0, "cyolo": 0.7},
    "urgency_t0_h": 24,
    "speed_mtok_h": {"yolo": 7.2, "cyolo": 4.8},   # M token ต่อชั่วโมงต่อ worker (ใช้ประเมินว่างานจะข้ามรอบรีเซ็ต 5 ชม. ไหม)
    "relay": True, "relay_min_frac": 0.3,
    "react_h": 0.25, "min_margin": 2.0,            # เผื่อใต้เพดาน = โควตาที่ใช้ได้ใน 15 นาที (เวลาที่ ⑤ ตอบสนองทัน) อย่างน้อย 2%          # ⑨ ส่งต่อตามแผนเมื่อไม่มีบัญชีไหนรับได้คนเดียว
    "size_mtok": {"S": 0.6, "M": 1.5, "L": 3.0},   # ประเมินโทเคน (ล้าน, ถ่วงน้ำหนัก) ตามขนาดงาน
    # % ต่อ 1M weighted token — ค่าตั้งต้น แล้วเรียนรู้จริงระหว่างรัน (calibration)
    "prior_rate": {"session": {"max": 1.0, "team": 2.0, "pro": 1.0, "default": 2.0},
                   "week":    {"max": 0.12, "team": 0.25, "pro": 0.15, "default": 0.25}},
    "models": {
        "orchestrator": {"yolo": ["opus", "high"], "cyolo": ["gpt-6-astra", "high"]},
        "worker":       {"yolo": ["opus", "medium"], "cyolo": ["gpt-6-astra", "medium"]},
        "image":        {"cyolo": ["gpt-6-astra", "medium"]},
    },
    "dev_db": {"name": "bm-devdb", "port": 55432, "user": "dev", "password": "dev", "host": "auto",
               "image": "pgvector/pgvector:pg16"},                      # Postgres + pgvector (ใช้ RAG ได้)
    # บริการ dev เพิ่มเติมที่ worker ทุกตัวใช้ร่วมกัน (infra up เปิดให้) · ใส่ [] = ไม่เปิด
    "dev_services": [
        {"name": "bm-devmq", "image": "rabbitmq:4.4-management", "ports": {"5672": 55672, "15672": 55673},
         "env": "AMQP_URL=amqp://guest:guest@{host}:55672"},
        {"name": "bm-devembed", "image": "ghcr.io/huggingface/text-embeddings-inference:cpu-1.9",
         "args": "--model-id intfloat/multilingual-e5-small", "ports": {"80": 55680},
         "env": "EMBED_URL=http://{host}:55680"},
    ],
    "port_base": 4100,
}

# ---------------------------------------------------------------- utils
def now(): return dt.datetime.now(TZ)
def iso(t): return t.isoformat(timespec="seconds") if t else None
def parse_iso(s): return dt.datetime.fromisoformat(s) if s else None
def jload(p, default=None):
    try:
        with open(p, encoding="utf-8") as f: return json.load(f)
    except Exception: return default
def jsave(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f: json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, p)
def sh(cmd, cwd=None, check=False, timeout=None):
    r = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str), capture_output=True, text=True, timeout=timeout)
    if check and r.returncode != 0:
        raise SystemExit(f"command failed: {cmd}\n{r.stdout}\n{r.stderr}")
    return r
def kind_of(acc): return "cyolo" if acc.startswith("cyolo") else "yolo"
def acc_dir(acc): return f"{BASE}/.Codex/{acc}" if kind_of(acc) == "cyolo" else f"{BASE}/.Claude/{acc}"

class Run:
    def __init__(self, path):
        self.p = os.path.abspath(path)
        self.cfg = {**DEFAULT_CFG, **(jload(self.f("config.json"), {}) or {})}
    def f(self, *a): return os.path.join(self.p, *a)
    @property
    def app(self): return self.f("app")
    def tasks(self): return jload(self.f("tasks.json"), {"tasks": []})
    def save_tasks(self, d): jsave(self.f("tasks.json"), d)
    def event(self, kind, **kw):
        e = {"t": iso(now()), "event": kind, **kw}
        os.makedirs(self.f("logs"), exist_ok=True)
        with open(self.f("logs", "events.jsonl"), "a", encoding="utf-8") as fh:
            fh.write(json.dumps(e, ensure_ascii=False) + "\n")
        return e
    def accounts_cfg(self): return jload(self.f("accounts.json"), {}) or {}

# ---------------------------------------------------------------- quota
USAGE_RE = re.compile(r"^Current (session|week \(all models\)|week \(([^)]+)\)):\s*(\d+)% used(?:\s*·\s*resets (.+?) \(([^)]+)\))?")

def parse_reset(txt, tzname):
    if not txt: return None
    tz = ZoneInfo(tzname) if tzname else TZ
    t0 = now().astimezone(tz)
    for fmt in ("%b %d, %I:%M%p", "%b %d, %I%p", "%b %d %I:%M%p", "%b %d %I%p", "%I:%M%p", "%I%p"):
        try:
            d = dt.datetime.strptime(txt.strip(), fmt)
        except ValueError:
            continue
        if "%b" not in fmt:  # เฉพาะเวลา = วันนี้หรือพรุ่งนี้
            d = t0.replace(hour=d.hour, minute=d.minute, second=0, microsecond=0)
            return d if d > t0 else d + dt.timedelta(days=1)
        d = d.replace(year=t0.year, tzinfo=tz)
        if d < t0 - dt.timedelta(days=2): d = d.replace(year=t0.year + 1)
        return d
    return None

def claude_quota(acc):
    env = {**os.environ}
    r = sh([acc, "auth", "status", "--json"], timeout=60)
    try: st = json.loads(r.stdout)
    except Exception: st = {}
    if not st.get("loggedIn"):
        return {"account": acc, "kind": "yolo", "logged_in": False}
    q = {"account": acc, "kind": "yolo", "logged_in": True, "plan": st.get("subscriptionType") or "default",
         "session_used": None, "session_reset": None, "week_used": None, "week_reset": None, "at": iso(now())}
    try:
        out = sh(f"{acc} -p --strict-mcp-config /usage </dev/null", timeout=120).stdout
    except subprocess.TimeoutExpired:
        out = ""
    for line in out.splitlines():
        m = USAGE_RE.match(line.strip())
        if not m: continue
        which, model, pct, rst, tz = m.groups()
        reset = parse_reset(rst, tz)
        if which == "session":
            q["session_used"], q["session_reset"] = int(pct), iso(reset)
        elif which.startswith("week (all"):
            q["week_used"], q["week_reset"] = int(pct), iso(reset)
        else:  # โควตาเฉพาะรุ่น นับเป็นเพดานสัปดาห์อีกตัว
            if q.get("week_used") is None or int(pct) > (q.get("week_model_used") or 0):
                q["week_model_used"], q["week_model"] = int(pct), model
    if q["session_used"] is None and q["week_used"] is None:
        q["usage_error"] = "อ่าน /usage ไม่ได้"
    return q

def codex_rollouts(acc):
    fs = glob.glob(f"{acc_dir(acc)}/sessions/*/*/*/*.jsonl")
    return sorted(fs, key=os.path.getmtime, reverse=True)

def codex_rate_from_file(path):
    last = None
    try:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                if '"rate_limits"' in line:
                    last = line
    except FileNotFoundError:
        return None
    if not last: return None
    try:
        d = json.loads(last)
        return (d.get("payload") or {}).get("rate_limits"), d.get("timestamp")
    except Exception:
        return None

def codex_quota(acc):
    r = sh(f"{acc} login status </dev/null 2>&1", timeout=60)
    txt = (r.stdout + r.stderr)
    if "Logged in" not in txt:
        return {"account": acc, "kind": "cyolo", "logged_in": False}
    q = {"account": acc, "kind": "cyolo", "logged_in": True, "plan": "default",
         "session_used": None, "session_reset": None, "week_used": None, "week_reset": None, "at": None}
    for f in codex_rollouts(acc)[:20]:
        got = codex_rate_from_file(f)
        if not got or not got[0]: continue
        rl, ts = got
        q["plan"] = rl.get("plan_type") or "default"
        q["at"] = ts
        for key in ("primary", "secondary"):
            w = rl.get(key)
            if not w: continue
            mins = w.get("window_minutes") or 0
            reset = dt.datetime.fromtimestamp(w["resets_at"], TZ) if w.get("resets_at") else None
            slot = "session" if mins and mins <= 600 else "week"
            used = round(float(w.get("used_percent") or 0))
            if reset and mins and reset < now():   # ข้อมูลจาก session เก่า: รอบนั้นรีเซ็ตไปแล้ว → เลื่อนไปรอบถัดไป · ใช้ไป 0%
                step = dt.timedelta(minutes=mins)
                while reset < now(): reset += step
                used = 0
            q[f"{slot}_used"], q[f"{slot}_reset"] = used, iso(reset)
        break
    if q["at"] is None:
        q["usage_error"] = "ยังไม่มีข้อมูลโควตา (ยังไม่เคยใช้) → ถือว่า 0%"
        q["session_used"], q["week_used"] = 0, 0
    return q

def list_accounts():
    accs = []
    for k in ("yolo", "cyolo"):
        for n in range(1, 10):
            a = f"{k}{n}"
            if shutil.which(a) and os.path.isdir(acc_dir(a)): accs.append(a)
    return accs

def score_accounts(run, snaps):
    """เติม headroom / ความเร่งด่วนวันหมดอายุ / คะแนน / slot ให้แต่ละบัญชี"""
    cfg, acfg, t = run.cfg, run.accounts_cfg(), now()
    base = jload(run.f("state", "baseline.json"), {}) or {}
    for q in snaps:
        if not q.get("logged_in"): continue
        a = q["account"]; c = acfg.get(a, {})
        if c.get("disabled"): q["disabled"] = True; continue
        su = q.get("session_used") or 0
        wu = max(q.get("week_used") or 0, q.get("week_model_used") or 0)
        # เพดานสัปดาห์ = 100 หรือ งบที่อนุญาตให้ LAB นี้ใช้ (budget_pct นับจากตอนเริ่มรัน)
        start_w = base.get(a, {}).get("week_used", wu)
        cap_w = min(100, start_w + c["budget_pct"]) if "budget_pct" in c else 100
        q["cap_week"] = cap_w
        q["headroom_session"] = max(0, 100 - su)
        q["headroom_week"] = max(0, cap_w - wu)
        q["headroom"] = min(q["headroom_session"], q["headroom_week"])
        # วันหมดอายุ = รีเซ็ตโควตาสัปดาห์ หรือ วันหมดแพลน (ถ้าใส่ไว้ใน accounts.json) อันไหนมาก่อน
        exp = [parse_iso(q.get("week_reset"))]
        if c.get("plan_expires"):
            exp.append(dt.datetime.fromisoformat(c["plan_expires"]).replace(tzinfo=TZ))
        exp = [e for e in exp if e]
        expires = min(exp) if exp else t + dt.timedelta(days=7)
        hours = max(1.0, (expires - t).total_seconds() / 3600)
        q["expires"], q["hours_left"] = iso(expires), round(hours, 1)
        # ความเร่งด่วนวันหมดอายุ (0..1) — ตัวแปร U ของ KC-QUEST
        q["use_first"] = round(cfg["urgency_t0_h"] / (cfg["urgency_t0_h"] + hours), 3)
    ok = [q for q in snaps if q.get("logged_in") and not q.get("disabled")]
    for q in ok:   # คะแนนภาพรวมของบัญชี (ไว้แสดงในตาราง · การเลือกจริงต่องานใช้ choose_account)
        q["score"] = round(100 * (0.6 * q["use_first"] + 0.4 * q["headroom"] / 100), 1)
        # slot = จำนวนงานพร้อมกัน · 0 เฉพาะเมื่อเหลือไม่ถึงเส้นเผื่อขั้นต่ำ (ส่วนว่ารับงานไหนได้ capacity() ใน KC-QUEST ตัดสินเอง)
        q["slots"] = 0 if q["headroom"] <= cfg["min_margin"] else max(1, min(cfg["per_account_max"][q["kind"]], int(q["headroom"] // cfg["slot_pct"])))
    return snaps

def quota_snapshot(run, accounts=None):
    accounts = accounts or list_accounts()
    def one(a): return claude_quota(a) if kind_of(a) == "yolo" else codex_quota(a)
    with ThreadPoolExecutor(8) as ex: snaps = list(ex.map(one, accounts))
    snaps = score_accounts(run, snaps)
    jsave(run.f("state", "quota.json"), {"at": iso(now()), "accounts": snaps})
    return snaps

def orchestrator_pick(snaps, exclude=()):
    ok = [q for q in snaps if q.get("logged_in") and not q.get("disabled") and q["account"] not in exclude]
    ok.sort(key=lambda q: q["headroom"] + (5 if q["kind"] == "yolo" else 0), reverse=True)  # โทเคนเหลือมากที่สุด (yolo ได้ +5 เพราะตอบเร็วกว่า)
    return ok[0]["account"] if ok else None

def fmt_quota(snaps):
    rows = ["| บัญชี | แพลน | ใช้ไป 5 ชม. | ใช้ไปสัปดาห์ | เพดาน | เหลือ (headroom) | หมดอายุ/รีเซ็ต | เร่งด่วน U | คะแนน | slot |",
            "|---|---|---|---|---|---|---|---|---|---|"]
    for q in snaps:
        if not q.get("logged_in"):
            rows.append(f"| {q['account']} | – | ยังไม่ล็อกอิน | | | | | | | 0 |"); continue
        if q.get("disabled"):
            rows.append(f"| {q['account']} | {q.get('plan')} | ปิดไว้ใน accounts.json | | | | | | | 0 |"); continue
        exp = parse_iso(q.get("expires"))
        pc = lambda v: "-" if v is None else f"{v}%"
        rows.append(f"| {q['account']} | {q.get('plan')} | {pc(q.get('session_used'))} | {pc(q.get('week_used'))} | {q.get('cap_week')}% "
                    f"| **{q.get('headroom')}%** | {exp.strftime('%d/%m %H:%M') if exp else '-'} ({q.get('hours_left')} ชม.) "
                    f"| {q.get('use_first')} | {q.get('score')} | {q.get('slots')} |")
    return "\n".join(rows)

# ---------------------------------------------------------------- tokens from logs
W_IN, W_CW, W_CR, W_OUT = 1.0, 1.25, 0.1, 5.0   # น้ำหนักตามสัดส่วนราคา (input=1)

def yolo_log_stats(path):
    """อ่าน stream-json ของ claude: weighted token สะสม + ผลลัพธ์สุดท้าย"""
    seen, wt, res, last_text = {}, 0.0, None, ""
    try:
        fh = open(path, encoding="utf-8", errors="ignore")
    except FileNotFoundError:
        return {"mtok": 0, "result": None, "last": ""}
    with fh:
        for line in fh:
            line = line.strip()
            if not line.startswith("{"): continue
            try: e = json.loads(line)
            except Exception: continue
            if e.get("type") == "assistant":
                m = e.get("message") or {}
                u = m.get("usage") or {}
                seen[m.get("id") or len(seen)] = (u.get("input_tokens", 0) * W_IN + u.get("cache_creation_input_tokens", 0) * W_CW
                                                   + u.get("cache_read_input_tokens", 0) * W_CR + u.get("output_tokens", 0) * W_OUT)
                for c in m.get("content") or []:
                    if c.get("type") == "text" and c.get("text"): last_text = c["text"][-400:]
            elif e.get("type") == "result":
                res = {"is_error": e.get("is_error"), "subtype": e.get("subtype"), "cost": e.get("total_cost_usd"),
                       "text": str(e.get("result") or "")[-600:], "turns": e.get("num_turns")}
    wt = sum(seen.values())
    return {"mtok": round(wt / 1e6, 3), "result": res, "last": last_text}

def cyolo_log_stats(path, acc):
    """อ่าน --json ของ codex + rollout (โทเคนสด + rate_limits สด)"""
    tid, failed, done, usage = None, None, False, None
    try:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                if not line.startswith("{"): continue
                try: e = json.loads(line)
                except Exception: continue
                t = e.get("type")
                if t == "thread.started": tid = e.get("thread_id")
                elif t == "turn.failed": failed = str((e.get("error") or {}).get("message"))[:400]
                elif t == "turn.completed": done, usage = True, e.get("usage")
                elif t == "error": failed = str(e.get("message"))[:400]
    except FileNotFoundError:
        pass
    mtok, rate = 0.0, None
    if tid:
        fs = [f for f in codex_rollouts(acc)[:50] if tid in os.path.basename(f)]
        if fs:
            tot = None
            with open(fs[0], encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    if '"token_count"' not in line: continue
                    try: d = json.loads(line)
                    except Exception: continue
                    info = (d.get("payload") or {}).get("info") or {}
                    tot = info.get("total_token_usage") or tot
                    rate = (d.get("payload") or {}).get("rate_limits") or rate
            if tot:
                cached = tot.get("cached_input_tokens", 0)
                mtok = ((tot.get("input_tokens", 0) - cached) * W_IN + cached * W_CR + tot.get("output_tokens", 0) * W_OUT) / 1e6
    res = None
    if done or failed:
        res = {"is_error": bool(failed), "text": failed or "", "usage": usage}
    return {"mtok": round(mtok, 3), "result": res, "rate_limits": rate, "thread": tid}

# ---------------------------------------------------------------- tasks
def task_by_id(d, tid):
    for t in d["tasks"]:
        if t["id"] == tid: return t
    raise SystemExit(f"ไม่พบงาน {tid}")

def est_mtok(run, t):
    """ค่าประเมินโทเคนของงาน × ตัวคูณที่เรียนรู้จากงานขนาดเดียวกันที่เสร็จแล้ว"""
    base = float(t.get("est_mtok") or run.cfg["size_mtok"].get(t.get("size", "M"), 1.5))
    f = (jload(run.f("state", "size_cal.json"), {}) or {}).get(t.get("size", "M"), 1.0)
    return round(base * f, 3)

def learn_size(run, t):
    """งานเสร็จ → ปรับตัวคูณขนาดงาน (EMA) = โทเคนจริง / ค่าประเมินตั้งต้น"""
    base = float(t.get("est_mtok") or run.cfg["size_mtok"].get(t.get("size", "M"), 1.5))
    if base <= 0 or not t.get("mtok_used"): return
    cal = jload(run.f("state", "size_cal.json"), {}) or {}
    k = t.get("size", "M"); r = max(0.2, min(5.0, t["mtok_used"] / base))
    cal[k] = round(0.6 * cal[k] + 0.4 * r, 3) if k in cal else round(r, 3)
    jsave(run.f("state", "size_cal.json"), cal)

# ---------------------------------------------------------------- KC-QUEST algorithm
def critical_ranks(tasks, cost):
    """critical path: rank(j) = cost(j) + max rank(งานที่รอ j) → งานบนเส้นทางยาวสุดได้เริ่มก่อน (คืนค่า 0..1)
    tasks = [{"id","depends_on"}], cost = ฟังก์ชัน task → โทเคนที่เหลือ"""
    succ = {t["id"]: [] for t in tasks}
    by = {t["id"]: t for t in tasks}
    for t in tasks:
        for dep in t.get("depends_on", []):
            if dep in succ: succ[dep].append(t["id"])
    memo = {}
    def rank(i):
        if i not in memo:
            memo[i] = cost(by[i]) + max([rank(k) for k in succ[i]] + [0])
        return memo[i]
    for t in tasks: rank(t["id"])
    mx = max(list(memo.values()) + [1e-9])
    return {i: round(v / mx, 3) for i, v in memo.items()}

def task_ranks(run, d):
    return critical_ranks(d["tasks"], lambda t: 0 if t["status"] == "done" else est_mtok(run, t))

def account_states(run, q_by, run_now, d, orch):
    """สถานะของแต่ละบัญชี "หลังหักงานที่กำลังรัน" (headroom ที่ยังว่างจริง)"""
    acfg = run.accounts_cfg(); states = []
    for a, q in q_by.items():
        if not q.get("logged_in") or q.get("disabled") or q.get("headroom") is None: continue
        rs = rate_for(run, a, q.get("plan"), "session"); rw = rate_for(run, a, q.get("plan"), "week")
        pend = 0.0; used = 0
        for tid, r in run_now.items():
            if r["account"] != a: continue
            if not r.get("image"): used += 1
            t = task_by_id(d, tid); est = est_mtok(run, t)
            pend += r["rem"] if r.get("rem") is not None else max(est - t.get("mtok_used", 0), 0.15 * est)
        states.append(make_state(a, q["kind"], rs, rw, q["headroom_session"] - pend * rs, q["headroom_week"] - pend * rw,
                                 q.get("hours_left") or 168, q.get("slots", 0), used, a == orch,
                                 float((acfg.get(a) or {}).get("bonus", 0)), q.get("cap_week", 100),
                                 hours_until(q.get("session_reset"))))
    return states

def make_state(acc, kind, rs, rw, h_s, h_w, hours_left, slots, used, is_orch=False, bonus=0.0, cap_w=100, sreset_h=None):
    """sreset_h = อีกกี่ชั่วโมงหน้าต่าง 5 ชม. จะรีเซ็ต (None = ยังไม่เริ่มนับ → เต็ม 5 ชม.)"""
    return {"account": acc, "kind": kind, "rs": rs, "rw": rw, "h_s": h_s, "h_w": h_w, "hours_left": max(1.0, hours_left),
            "urg": max(h_w, 0) / max(1.0, hours_left), "slots": slots, "used": used, "is_orch": is_orch, "bonus": bonus,
            "cap_w": cap_w, "sreset_h": sreset_h}

# ตัวแปร (factor) ของ KC-QUEST — แต่ละตัวคืนค่า 0..1 · คะแนน = Σ น้ำหนัก × ค่า  (น้ำหนักอยู่ใน cfg["weights"])
# เพิ่มตัวแปรใหม่: เพิ่มฟังก์ชันที่นี่ + ใส่น้ำหนักใน config.json  · ลดตัวแปร: ตั้งน้ำหนัก 0
FACTORS = {
    # U: ความเร่งด่วนวันหมดอายุ = T0 / (T0 + ชั่วโมงก่อนหมดอายุ)  (T0 = 24 ชม. → เหลือ 1 วัน = 0.5)
    #    ใกล้รีเซ็ต/หมดแพลน → U เข้าใกล้ 1 → ใช้ก่อน (โควตาที่เหลือจะหายไปฟรี ๆ) · ปริมาณที่เหลือดูที่ F + เงื่อนไขปิดงานได้
    "urgency": lambda s, x: x["cfg"]["urgency_t0_h"] / (x["cfg"]["urgency_t0_h"] + s["hours_left"]),
    # F: best-fit — งานใช้โควตาสัปดาห์ที่เหลือไปกี่ส่วน → งานพอดีถังที่สุด เก็บถังใหญ่ไว้ให้งานใหญ่
    "fit":     lambda s, x: min(1.0, x["qw"] / max(s["h_w"], 1e-9)),
    # R: ที่ว่างในหน้าต่าง 5 ชม. หลังรับงาน → ไม่ไปชนเพดานรายชั่วโมง
    "session": lambda s, x: max(0.0, s["h_s"] - x["qs"]) / 100,
    # V: ความเร็วของ CLI × ความสำคัญบน critical path → งานวิกฤตไปบัญชีที่ตอบเร็ว
    "speed":   lambda s, x: x["cfg"]["speed"].get(s["kind"], 1.0) * x["crit"],
    # L: โหลดตอนนี้ (งานที่รัน ÷ slot) → น้ำหนักติดลบ = กระจายงาน
    "load":    lambda s, x: s["used"] / max(1, s["slots"]),
    # B: ค่าพิเศษต่อบัญชีจาก accounts.json (เช่น "bonus": 1 = อยากให้ใช้บัญชีนี้ก่อน) — ปิดไว้ (น้ำหนัก 0)
    "bonus":   lambda s, x: s.get("bonus", 0.0),
}

def hours_until(ts):
    t = parse_iso(ts) if isinstance(ts, str) else ts
    return None if not t else max(0.0, (t - now()).total_seconds() / 3600)

def margin(s, cfg, window, workers=1):
    """เส้นเผื่อใต้เพดาน (%) = อัตรา × ความเร็ว × เวลาตอบสนอง × จำนวน worker บนบัญชี — ใช้ทั้งตอนแจกงานและตอนย้ายงาน"""
    r = s["rs"] if window == "session" else s["rw"]
    return max(cfg["min_margin"], r * cfg["speed_mtok_h"].get(s["kind"], 6.0) * cfg["react_h"] * max(1, workers))

def session_burn(rems, rate, sreset_h, cfg, kind):
    """⑦ % ของหน้าต่าง 5 ชม. ที่งานที่เหลือจะใช้ "ก่อนรีเซ็ต" (หลังรีเซ็ตเป็นโควตารอบใหม่ ไม่นับ)"""
    if sreset_h is None: return sum(rems) * rate
    cap = cfg["speed_mtok_h"].get(kind, 6.0) * sreset_h
    return sum(min(r, cap) for r in rems) * rate

def capacity(s, cfg, reserve=0.0, sigma=None):
    """งานขนาดใหญ่สุด (M tok) ที่บัญชีนี้รับได้โดยไม่เกินเส้น θ (หลังเผื่อ σ แล้ว)
    ⑦ รู้เวลารีเซ็ต 5 ชม.: ถ้าหน้าต่างจะรีเซ็ตก่อนงานเสร็จ ส่วนหลังรีเซ็ตได้โควตา 5 ชม. ใหม่"""
    sig = cfg["safety"] if sigma is None else sigma
    m_s, m_w = margin(s, cfg, "session", s["used"] + 1), margin(s, cfg, "week", s["used"] + 1)
    room_s = max(0.0, s["h_s"] - m_s - reserve) / (sig * s["rs"])            # ก่อนรีเซ็ต
    room_w = max(0.0, s["h_w"] - m_w - reserve) / (sig * s["rw"])
    sr = s.get("sreset_h")
    if sr is not None:
        speed = cfg["speed_mtok_h"].get(s["kind"], 6.0)
        before = speed * sr                                                   # โทเคนที่ทำทันก่อนรีเซ็ต
        if room_s >= before:                                                  # ไม่ชนก่อนรีเซ็ต → หลังรีเซ็ตได้เพิ่ม
            room_s = before + (100 - m_s) / (sig * s["rs"])
    return min(room_s, room_w)

def choose_account(cost, crit, states, cfg, kind_only=None, avoid=(), need_slot=True, image=False, partial=0.0):
    """KC-QUEST: คืนบัญชีที่ "ปิดงานนี้ได้" เรียงตามคะแนน (มาก→น้อย) พร้อมค่าตัวแปรแยกส่วน

    ปิดงานได้ (feasible): cost ≤ capacity(บัญชี)
      capacity = min( (h_s − m_s − reserve) / (σ·r_s) [+ โควตา 5 ชม. ใหม่ถ้ารีเซ็ตก่อนงานเสร็จ],
                      (h_w − m_w − reserve) / (σ·r_w) )
      σ = safety (1.3) เผื่อค่าประเมินคลาดเคลื่อน · m = margin() เผื่อเวลาตอบสนอง (เส้นเดียวกับที่ ⑤ ใช้ย้ายงาน → ไม่ย้ายไปมา)
      reserve = กันโควตาให้ orchestrator ถ้าเป็นบัญชีของมัน
    partial > 0 (โหมดส่งต่อ): รับบัญชีที่ทำได้อย่างน้อย partial×cost แล้วคูณคะแนนด้วยสัดส่วนที่ทำได้
    คะแนน = Σ_i w_i · factor_i   (ดู FACTORS)
    """
    W, sig = cfg["weights"], cfg["safety"]
    out = []
    for s in states:
        if kind_only and s["kind"] != kind_only: continue
        if image and s["kind"] != "cyolo": continue
        if s["account"] in avoid: continue
        if need_slot and not image and s["used"] >= s["slots"] - (1 if s["is_orch"] else 0): continue
        reserve = cfg["orch_min_headroom"] + 5 if s["is_orch"] else 0
        cap = capacity(s, cfg, reserve)
        frac = min(1.0, cap / max(cost, 1e-9))
        if frac < 1.0 and (partial <= 0 or frac < partial): continue
        part = cost * frac
        qs, qw = sig * s["rs"] * part, sig * s["rw"] * part
        x = {"qs": qs, "qw": qw, "crit": crit, "cfg": cfg}
        parts = {k: round(FACTORS[k](s, x), 3) for k, w in W.items() if w and k in FACTORS}
        sc = sum(W[k] * v for k, v in parts.items()) * (frac if partial else 1.0)
        out.append({"account": s["account"], "score": round(100 * sc, 1), "qs": round(qs, 2), "qw": round(qw, 2),
                    "parts": parts, "frac": round(frac, 2), "cap": round(cap, 2)})
    out.sort(key=lambda o: -o["score"])
    return out

def plan_assignments(ready, states, cfg, free_workers, free_images):
    """วางแผนแจกงานรอบเดียว (ใช้ทั้งใน orch.py และ sim.py)
    ready = [{"id","need","crit","only","avoid","image"}]  → คืน [(id, candidate, "full"|"relay")]
    ⑧ MRV: งานที่มีบัญชีรับได้น้อยที่สุดได้เลือกก่อน (กันงานยืดหยุ่นแย่งที่ของงานที่มีทางเลือกเดียว) แล้วตาม critical path
    ⑨ ส่งต่อตามแผน: ถ้าไม่มีบัญชีไหนปิดงานคนเดียวได้ แต่โควตารวมของทีมพอ → เริ่มที่บัญชีที่ดีสุด แล้ว ⑤ ย้ายต่อเมื่อใกล้เพดาน"""
    opts = lambda r: choose_account(r["need"], r["crit"], states, cfg, kind_only=r.get("only"),
                                    avoid=r.get("avoid") or (), image=r.get("image"))
    order = sorted(ready, key=lambda r: (min(len(opts(r)), 3) if opts(r) else 9, -r["crit"], -r["need"]))
    plan = []
    for r in order:
        if r.get("image"):
            if free_images <= 0: continue
        elif free_workers <= 0: continue
        c = opts(r); mode = "full"
        if not c and cfg.get("relay", True):
            # โควตารวมของทีม (ไม่คูณ σ ซ้ำ — ⑤ เฝ้าดูและส่งต่อให้ตลอดทาง)
            pool = sum(capacity(s, cfg, sigma=1.0) for s in states if not (r.get("only") and s["kind"] != r["only"]))
            idle = free_workers >= cfg["max_agents"] and not plan          # ไม่มีใครทำงานอยู่เลย → ห้ามค้าง
            if pool >= r["need"] or idle:
                for frac in (cfg.get("relay_min_frac", 0.3), 0.1):
                    c = choose_account(r["need"], r["crit"], states, cfg, kind_only=r.get("only"), avoid=r.get("avoid") or (),
                                       image=r.get("image"), partial=frac)
                    if c: break
                if not c and idle:      # ⑩ best-effort: ทั้งทีมว่าง → ใช้โควตาส่วนเผื่อได้ (เพดานจริงยังคุมด้วย LIMIT_HANDOFF)
                    be = {**cfg, "safety": 1.0, "min_margin": 0.0, "react_h": 0.0}
                    c = choose_account(r["need"], r["crit"], states, be, kind_only=r.get("only"), avoid=r.get("avoid") or (),
                                       image=r.get("image"), partial=0.01)
                mode = "relay"
        if not c: continue
        best = c[0]
        reserve_on(states, best["account"], best["qs"], best["qw"], r.get("image"))
        plan.append((r["id"], best, mode, c))
        if r.get("image"): free_images -= 1
        else: free_workers -= 1
    return plan

def reserve_on(states, acc, qs, qw, image=False):
    """จองโควตาที่ประเมินไว้ให้บัญชีที่ได้งาน → งานถัดไปเห็น headroom ที่ลดลงแล้ว"""
    for s in states:
        if s["account"] == acc:
            s["h_s"] -= qs; s["h_w"] -= qw
            if not image: s["used"] += 1
            s["urg"] = max(s["h_w"], 0) / s["hours_left"]

def why_text(c, need, cands):
    p = " ".join(f"{k}={v}" for k, v in c["parts"].items())
    alt = f" · อันดับ 2 {cands[1]['account']} {cands[1]['score']}" if len(cands) > 1 else ""
    return f"KC-QUEST {c['score']} ({p}) · ประเมิน {need:.2f}M tok ≈ 5ชม. {c['qs']}% / สัปดาห์ {c['qw']}%{alt}"

def deps_done(d, t):
    st = {x["id"]: x["status"] for x in d["tasks"]}
    return all(st.get(dep) == "done" for dep in t.get("depends_on", []))

def rate_for(run, acc, plan, window):
    cal = jload(run.f("state", "calibration.json"), {}) or {}
    r = (cal.get(acc) or {}).get(window)
    if r: return r
    pr = run.cfg["prior_rate"][window]
    return pr.get(plan, pr["default"])

def fits(run, q, need_mtok):
    """งานนี้ปิดได้ด้วยโควตาที่เหลือของบัญชีนี้ไหม (เผื่อ safety)"""
    need_s = need_mtok * rate_for(run, q["account"], q.get("plan"), "session") * run.cfg["safety"]
    need_w = need_mtok * rate_for(run, q["account"], q.get("plan"), "week") * run.cfg["safety"]
    st_a = {"rs": need_s / max(need_mtok * run.cfg["safety"], 1e-9), "rw": need_w / max(need_mtok * run.cfg["safety"], 1e-9), "kind": q["kind"]}
    ok = need_s <= q["headroom_session"] - margin(st_a, run.cfg, "session") and need_w <= q["headroom_week"] - margin(st_a, run.cfg, "week")
    return ok, round(need_s, 1), round(need_w, 2)

def running(run):
    out = {}
    for f in glob.glob(run.f("state", "running", "*.json")):
        r = jload(f)
        if r: out[r["task"]] = r
    return out

def pid_alive(pid):
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    try:  # zombie = จบแล้ว
        with open(f"/proc/{pid}/stat") as fh:
            return fh.read().split()[2] != "Z"
    except Exception:
        return True

WORKER_RULES = """
## กติกาของ worker (อ่านให้ครบก่อนเริ่ม)
- คุณคือ worker ในทีม multi-agent · ทำ **เฉพาะงานนี้** ใน git worktree ปัจจุบัน `{wt}` (branch `task/{tid}`)
- ไฟล์ที่เป็นของงานนี้: {owns} — หลีกเลี่ยงแก้ไฟล์ของงานอื่น ถ้าจำเป็นต้องแก้ไฟล์ส่วนกลาง ให้แก้น้อยที่สุดและบอกในรายงาน
- เขียนความคืบหน้าลง `{progress}` เป็น checklist (`- [ ]` / `- [x]`) ตั้งแต่เริ่มงาน และอัปเดตทุกครั้งที่จบข้อย่อย
- `git add -A && git commit -m "{tid}: <ข้อย่อย>"` หลังจบแต่ละข้อย่อย (งานจะไม่หายถ้าถูกสลับบัญชีกลางทาง)
- ทดสอบตาม "เกณฑ์ผ่าน" ด้วยตัวเองก่อนจบ · ห้ามรัน `docker compose` ยกเว้นงานที่ระบุว่า exclusive
- ทรัพยากรของคุณ: `PORT={port}` (ใช้เปิด dev server) · `DATABASE_URL={dburl}` (Postgres+pgvector dev ฐานข้อมูลของงานนี้คนเดียว) · `MOCK_LLM_PORT={mport}`{extra}
- ห้ามพิมพ์ค่า secret · ห้ามแตะโฟลเดอร์นอก `{wt}` ยกเว้นไฟล์ progress · ห้าม push
- จบงาน: เขียนบรรทัดสุดท้ายของ `{progress}` เป็น `STATUS: DONE` (หรือ `STATUS: BLOCKED <เหตุผล>`) แล้ว commit ครั้งสุดท้าย
"""

def dev_db_host(c):
    """host ของ Postgres dev: docker ใน container (DinD) → 127.0.0.1 · docker ของเครื่อง host ผ่าน docker.sock → host.docker.internal"""
    if c.get("host", "auto") != "auto": return c["host"]
    import socket
    try:
        socket.create_connection(("127.0.0.1", c["port"]), timeout=1).close(); return "127.0.0.1"
    except OSError:
        return "host.docker.internal"

def build_prompt(run, t, wt, port, attempt, handoff):
    cfg = run.cfg["dev_db"]
    dbname = "t_" + re.sub(r"\W", "_", t["id"].lower())
    dburl = f"postgres://{cfg['user']}:{cfg['password']}@{dev_db_host(cfg)}:{cfg['port']}/{dbname}"
    body = open(run.f("tasks", f"{t['id']}.md"), encoding="utf-8").read()
    shared = run.f("tasks", "_shared.md")
    head = open(shared, encoding="utf-8").read() if os.path.exists(shared) else ""
    p = f"# งาน {t['id']}: {t.get('title','')}\n\n{head}\n\n{body}\n" + WORKER_RULES.format(
        wt=wt, tid=t["id"], owns=", ".join(t.get("owns", [])) or "-", progress=run.f("progress", f"{t['id']}.md"),
        port=port, dburl=dburl, mport=port + 500,
        extra="".join(f" · `{x['env'].format(host=dev_db_host(cfg))}` (ใช้ร่วมกันทั้งทีม)" for x in run.cfg.get("dev_services", [])))
    if handoff:
        p += f"\n## ⚠️ งานนี้ส่งต่อมาจากบัญชีอื่น (รอบที่ {attempt})\n{handoff}\n- อ่าน `git log --oneline -15` และไฟล์ progress ก่อน แล้ว**ทำต่อจากที่ค้าง ไม่ต้องเริ่มใหม่**\n"
    return p, dburl, dbname

def ensure_db(run, dbname):
    c = run.cfg["dev_db"]
    sh(f"docker exec {c['name']} psql -U {c['user']} -tc \"SELECT 1 FROM pg_database WHERE datname='{dbname}'\" | grep -q 1 "
       f"|| docker exec {c['name']} createdb -U {c['user']} {dbname}")

def git(run, *args, cwd=None):
    return sh(["git", *args], cwd=cwd or run.app)

def start_task(run, t, acc, d, reason=""):
    tid = t["id"]
    attempt = t.get("attempts", 0) + 1
    wt = run.f("wt", tid)
    if not os.path.isdir(wt):
        br = f"task/{tid}"
        exists = git(run, "rev-parse", "--verify", br).returncode == 0
        r = git(run, "worktree", "add", wt, br) if exists else git(run, "worktree", "add", "-b", br, wt, "main")
        if r.returncode != 0: raise SystemExit(r.stderr)
    used_ports = {r["port"] for r in running(run).values()}
    port = next(p for p in range(run.cfg["port_base"], run.cfg["port_base"] + 100) if p not in used_ports)
    prompt, dburl, dbname = build_prompt(run, t, wt, port, attempt, t.get("handoff_note"))
    if t.get("area") != "image":
        try: ensure_db(run, dbname)
        except Exception: pass
    pfile = run.f("logs", f"{tid}.a{attempt}.prompt.md")
    open(pfile, "w", encoding="utf-8").write(prompt)
    log = run.f("logs", f"{tid}.a{attempt}.{acc}.jsonl")
    role = "image" if t.get("area") == "image" else "worker"
    model, effort = (t.get("model") or run.cfg["models"][role][kind_of(acc)])
    env = {**os.environ, "PORT": str(port), "DATABASE_URL": dburl, "MOCK_LLM_PORT": str(port + 500)}
    if kind_of(acc) == "yolo":
        cmd = [acc, "-p", "--model", model, "--effort", effort, "--strict-mcp-config", "--output-format", "stream-json",
               "--verbose", "--add-dir", run.f("progress")]
        stdin = open(pfile, "rb")
    else:
        cmd = [acc, "exec", "--skip-git-repo-check", "-m", model, "-c", f'model_reasoning_effort="{effort}"',
               "--json", "-o", run.f("logs", f"{tid}.a{attempt}.out"), "-"]
        stdin = open(pfile, "rb")
    p = subprocess.Popen(cmd, cwd=wt, env=env, stdin=stdin, stdout=open(log, "w"), stderr=subprocess.STDOUT,
                         start_new_session=True)
    rec = {"task": tid, "account": acc, "kind": kind_of(acc), "pid": p.pid, "port": port, "log": log, "attempt": attempt,
           "started": iso(now()), "est_mtok": est_mtok(run, t), "mtok_before": t.get("mtok_used", 0.0),
           "image": t.get("area") == "image"}
    jsave(run.f("state", "running", f"{tid}.json"), rec)
    t.update(status="running", account=acc, attempts=attempt)
    t.setdefault("history", []).append({"t": iso(now()), "account": acc, "attempt": attempt, "why": reason})
    run.event("START", task=tid, account=acc, attempt=attempt, why=reason)
    return rec

def progress_of(run, tid):
    p = run.f("progress", f"{tid}.md")
    try: txt = open(p, encoding="utf-8").read()
    except FileNotFoundError: return 0.0, None
    done = len(re.findall(r"^\s*[-*] \[[xX]\]", txt, re.M)); todo = len(re.findall(r"^\s*[-*] \[ \]", txt, re.M))
    m = re.search(r"STATUS:\s*(DONE|BLOCKED.*)", txt)
    frac = done / (done + todo) if done + todo else 0.0
    return frac, (m.group(1).strip() if m else None)

def autocommit(run, tid, msg):
    wt = run.f("wt", tid)
    if os.path.isdir(wt):
        sh(f'git add -A && git -c user.name=orchestra -c user.email=orchestra@local commit -qm "{msg}" || true', cwd=wt)

def merge_task(run, tid):
    autocommit(run, tid, f"{tid}: auto-commit ก่อน merge")
    r = git(run, "-c", "user.name=orchestra", "-c", "user.email=orchestra@local", "merge", "--no-ff", "-m", f"merge task/{tid}", f"task/{tid}")
    if r.returncode != 0:
        git(run, "merge", "--abort")
        return False, (r.stdout + r.stderr)[-800:]
    return True, ""

def stop_proc(rec):
    try:
        os.killpg(rec["pid"], signal.SIGTERM)
        time.sleep(3)
        if pid_alive(rec["pid"]): os.killpg(rec["pid"], signal.SIGKILL)
    except ProcessLookupError:
        pass

def handoff_note(run, t, rec, why):
    frac, _ = progress_of(run, t["id"])
    log = sh(["git", "log", "--oneline", "-10", "main..HEAD"], cwd=run.f("wt", t["id"])).stdout
    n = len([l for l in log.splitlines() if l.strip()])
    return (f"- เหตุผลที่สลับ: {why}\n- บัญชีเดิม: {rec['account']} · checklist ~{int(frac*100)}% · commit ของงานนี้แล้ว {n} ครั้ง\n"
            f"- commit ของงานนี้ (ใหม่สุดก่อน):\n```\n{log}```")

def requeue(run, d, t, rec, why, avoid=True):
    stop_proc(rec)
    autocommit(run, t["id"], f"{t['id']}: WIP ก่อนสลับบัญชี")
    t["handoff_note"] = handoff_note(run, t, rec, why)
    t["status"] = "ready"
    if avoid: t.setdefault("avoid", []).append(rec["account"])
    os.remove(run.f("state", "running", f"{t['id']}.json"))
    return run.event("HANDOFF", task=t["id"], from_account=rec["account"], why=why)

# ---------------------------------------------------------------- dispatch
def dispatch(run, snaps=None, quiet=False):
    d = run.tasks()
    snaps = snaps or (jload(run.f("state", "quota.json"), {}) or {}).get("accounts") or quota_snapshot(run)
    q_by = {q["account"]: q for q in snaps if q.get("logged_in") and not q.get("disabled")}
    run_now = running(run)
    orch = (jload(run.f("state", "orchestrator.json"), {}) or {}).get("account")
    used = {}
    for r in run_now.values(): used[r["account"]] = used.get(r["account"], 0) + (0 if r.get("image") else 1)
    n_workers = sum(0 if r.get("image") else 1 for r in run_now.values())
    n_images = sum(1 if r.get("image") else 0 for r in run_now.values())
    exclusive_running = any(task_by_id(d, tid).get("exclusive") for tid in run_now)
    started = []
    ready = [t for t in d["tasks"] if t["status"] in ("ready", "todo") and deps_done(d, t)]
    if exclusive_running: ready = []
    if any(t.get("exclusive") for t in ready):               # งาน exclusive รอจนไม่มีใครรัน แล้วรันคนเดียว
        ex = [t for t in ready if t.get("exclusive")]
        ready = ex[:1] if not run_now else [t for t in ready if not t.get("exclusive")]
    ranks = task_ranks(run, d)                              # ① critical path
    states = account_states(run, q_by, run_now, d, orch)
    items = []
    for t in ready:
        avoid = set(t.get("avoid", []))
        if len(avoid) >= len(states): avoid = set()            # เคยหลบครบทุกบัญชีแล้ว → เปิดให้ทุกบัญชี
        items.append({"id": t["id"], "need": max(est_mtok(run, t) - float(t.get("mtok_used", 0)) * 0.5, est_mtok(run, t) * 0.3),
                      "crit": ranks.get(t["id"], 0), "only": t.get("only"), "avoid": avoid, "image": t.get("area") == "image"})
    plan = plan_assignments(items, states, run.cfg, run.cfg["max_agents"] - n_workers,
                            run.cfg["max_image_jobs"] - n_images)  # ②③④⑧⑨
    for tid, c, mode, cands in plan:
        t = task_by_id(d, tid)
        need = next(i["need"] for i in items if i["id"] == tid)
        why = ("[ส่งต่อตามแผน ทำได้ ~" + str(int(100 * c["frac"])) + "%] " if mode == "relay" else "") + why_text(c, need, cands)
        rec = start_task(run, t, c["account"], d, why)
        started.append((tid, c["account"], why))
        run_now[tid] = rec
        if t.get("exclusive"): break
    run.save_tasks(d)
    write_board(run)
    if not quiet:
        for tid, a, why in started: print(f"START {tid} → {a} · {why}")
        if not started: print("ไม่มีงานที่เปิดได้ตอนนี้ (รอ dependency / slot / โควตา)")
    return started

# ---------------------------------------------------------------- monitor
def calibrate(run, acc, window, d_pct, d_mtok):
    if d_mtok < 0.3 or d_pct <= 0: return
    cal = jload(run.f("state", "calibration.json"), {}) or {}
    c = cal.setdefault(acc, {})
    r = d_pct / d_mtok
    c[window] = round(0.5 * c[window] + 0.5 * r, 3) if c.get(window) else round(r, 3)
    jsave(run.f("state", "calibration.json"), cal)

def monitor_once(run, snaps_cache):
    """1 รอบเฝ้าดู: อัปเดตโทเคน, จับงานจบ, คาดการณ์โควตา, สลับบัญชี, merge · คืนรายการ event"""
    d = run.tasks(); evs = []
    run_now = running(run)
    t_now = now()
    # 1) โทเคนสะสมต่อบัญชี (ใช้ทำ calibration % ต่อโทเคน)
    acct = jload(run.f("state", "acct_mtok.json"), {}) or {}
    for tid, rec in run_now.items():
        st = yolo_log_stats(rec["log"]) if rec["kind"] == "yolo" else cyolo_log_stats(rec["log"], rec["account"])
        rec["_st"] = st
        a = acct.setdefault(rec["account"], {"cum": 0.0, "seen": {}})
        key = os.path.basename(rec["log"])
        a["cum"] = round(a["cum"] + max(0.0, st["mtok"] - a["seen"].get(key, 0.0)), 4)
        a["seen"][key] = st["mtok"]
    # 2) refresh quota ของบัญชีที่มีงานรัน + orchestrator (ไม่เกินทุก usage_poll_sec · /usage ไม่เสียโทเคน)
    orch = (jload(run.f("state", "orchestrator.json"), {}) or {}).get("account")
    accs = {r["account"] for r in run_now.values()} | ({orch} if orch else set())
    stale = [x for x in accs if (t_now - snaps_cache.get(x, {}).get("_t", t_now - dt.timedelta(days=1))).total_seconds() > run.cfg["usage_poll_sec"]]
    allq = (jload(run.f("state", "quota.json"), {}) or {}).get("accounts", [])
    by = {q["account"]: q for q in allq}
    if stale:
        with ThreadPoolExecutor(8) as ex:
            fresh = list(ex.map(lambda x: claude_quota(x) if kind_of(x) == "yolo" else codex_quota(x), stale))
        for q in fresh:
            if q.get("session_used") is None and q["account"] in by:   # อ่านไม่ได้ → ใช้ค่าเดิม
                continue
            q["_t"] = t_now
            snaps_cache[q["account"]] = q
            a = acct.setdefault(q["account"], {"cum": 0.0, "seen": {}})
            a["sample_cum"] = a["cum"]                      # โทเคนสะสม ณ เวลาที่อ่าน /usage
            for w in ("session", "week"):                     # calibration: Δ% / Δtoken ตั้งแต่จุดที่ % เปลี่ยนครั้งก่อน
                u = q.get(f"{w}_used")
                if u is None: continue
                anc = a.get(f"anchor_{w}")
                if anc is None or u < anc[0]:
                    a[f"anchor_{w}"] = [u, a["cum"]]
                elif u > anc[0]:
                    calibrate(run, q["account"], w, u - anc[0], a["cum"] - anc[1])
                    a[f"anchor_{w}"] = [u, a["cum"]]
            by[q["account"]] = {k: v for k, v in q.items() if not k.startswith("_")}
        jsave(run.f("state", "quota.json"), {"at": iso(now()), "accounts": score_accounts(run, list(by.values()))})
    jsave(run.f("state", "acct_mtok.json"), acct)
    snaps = (jload(run.f("state", "quota.json"), {}) or {}).get("accounts", [])
    q_by = {q["account"]: q for q in snaps}

    # 3) งานที่รันอยู่: โทเคน / จบ / ล้ม
    per_acc_remaining = {}
    for tid, rec in list(run_now.items()):
        t = task_by_id(d, tid)
        st = rec.pop("_st")
        rec["mtok_now"] = st["mtok"]
        t["mtok_used"] = round(rec.get("mtok_before", 0) + st["mtok"], 3)
        frac, status = progress_of(run, tid)
        t["progress"] = round(frac, 2)
        alive = pid_alive(rec["pid"])
        if rec["kind"] == "cyolo" and st.get("rate_limits"):
            rl = st["rate_limits"]
            for key in ("primary", "secondary"):
                w = rl.get(key)
                if w and key in ("primary", "secondary"):
                    slot = "session" if (w.get("window_minutes") or 0) <= 600 else "week"
                    if rec["account"] in q_by: q_by[rec["account"]][f"{slot}_used"] = round(float(w.get("used_percent") or 0))
        if not alive:
            res = st["result"] or {}
            txt = (res.get("text") or "") + " " + (st.get("last") or "")
            limit_hit = bool(re.search(r"usage limit|rate limit|limit reached|quota|429|reached your", txt, re.I)) and (res.get("is_error") or status != "DONE")
            os.remove(run.f("state", "running", f"{tid}.json"))
            if limit_hit:
                t["status"] = "ready"; t.setdefault("avoid", []).append(rec["account"])
                autocommit(run, tid, f"{tid}: WIP (โควตาหมด)")
                t["handoff_note"] = handoff_note(run, t, rec, "บัญชีเดิมโควตาหมด (limit)")
                evs.append(run.event("LIMIT_HANDOFF", task=tid, from_account=rec["account"]))
            elif status == "DONE" and not res.get("is_error"):
                ok, err = merge_task(run, tid)
                if ok:
                    t["status"] = "done"; t["finished"] = iso(now()); learn_size(run, t)
                    evs.append(run.event("DONE", task=tid, account=rec["account"], mtok=t["mtok_used"], summary=(res.get("text") or "")[-300:]))
                else:
                    t["status"] = "ready"
                    t["handoff_note"] = ("- merge เข้า main แล้ว **conflict** · ให้รัน `git merge main` ใน worktree นี้ แก้ conflict ให้ครบ "
                                         "รันเกณฑ์ผ่านซ้ำ แล้วเขียน STATUS: DONE ใหม่\n```\n" + err + "\n```")
                    # ล้างบรรทัด STATUS เดิม ให้ worker เขียนใหม่
                    pf = run.f("progress", f"{tid}.md")
                    open(pf, "w", encoding="utf-8").write(re.sub(r"STATUS:.*", "", open(pf, encoding="utf-8").read()))
                    evs.append(run.event("MERGE_CONFLICT", task=tid, account=rec["account"]))
            else:
                if t["attempts"] >= run.cfg["max_attempts"]:
                    t["status"] = "failed"
                    evs.append(run.event("FAILED", task=tid, account=rec["account"], status=status, detail=txt[-400:]))
                else:
                    t["status"] = "ready"
                    autocommit(run, tid, f"{tid}: WIP (จบไม่ครบ)")
                    t["handoff_note"] = handoff_note(run, t, rec, f"worker จบโดยงานยังไม่เสร็จ ({status or 'ไม่มี STATUS'}): {txt[-200:]}")
                    evs.append(run.event("INCOMPLETE", task=tid, account=rec["account"], status=status, detail=txt[-300:]))
            continue
        jsave(run.f("state", "running", f"{tid}.json"), rec)
        # ประเมินงานที่เหลือ: max(ค่าประเมินที่เหลือ, อัตราจริงจาก progress)
        est = est_mtok(run, t)
        used_here = st["mtok"]
        rem = max(est - t["mtok_used"], 0.15 * est)
        if frac >= 0.15: rem = max(rem * 0.5, used_here * (1 - frac) / frac)
        rec["rem"] = rem
        per_acc_remaining.setdefault(rec["account"], []).append((rem, tid, rec))

    # 4) คาดการณ์โควตาต่อบัญชี → สลับงานถ้าจะเกินเพดาน
    for acc, items in per_acc_remaining.items():
        q = q_by.get(acc)
        if not q or q.get("session_used") is None: continue
        rs = rate_for(run, acc, q.get("plan"), "session"); rw = rate_for(run, acc, q.get("plan"), "week")
        a = acct.get(acc, {})
        lag = max(0.0, a.get("cum", 0) - a.get("sample_cum", a.get("cum", 0)))   # ใช้ไปแล้วแต่ /usage ยังไม่อัปเดต
        tot = sum(x[0] for x in items)
        wk = max(q.get("week_used") or 0, q.get("week_model_used") or 0)
        cap_w = q.get("cap_week", 100)
        st_a = {"rs": rs, "rw": rw, "kind": q["kind"]}
        lim_s = 100 - margin(st_a, run.cfg, "session", len(items))
        lim_w = cap_w - margin(st_a, run.cfg, "week", len(items))
        sr = hours_until(q.get("session_reset"))
        proj_s = q["session_used"] + lag * rs + session_burn([x[0] for x in items], rs, sr, run.cfg, q["kind"])
        proj_w = wk + (lag + tot) * rw
        q["proj_session"], q["proj_week"] = round(proj_s, 1), round(proj_w, 1)
        hard = q["session_used"] >= run.cfg["hard_stop_at"] or wk >= cap_w
        if not (hard or proj_s > lim_s or proj_w > lim_w): continue
        items.sort(key=lambda x: x[0], reverse=True)       # ย้ายงานที่เหลือมากที่สุดก่อน
        for rem, tid, rec in items:
            t = task_by_id(d, tid)
            if t.get("no_handoff"): continue
            # ⑤ ย้ายงาน: ใช้ KC-QUEST ตัวเดียวกันหาบัญชีที่ "ปิดงานส่วนที่เหลือ" ได้ดีที่สุด
            others = choose_account(rem, task_ranks(run, d).get(tid, 0), account_states(run, q_by, running(run), d, orch),
                                    run.cfg, kind_only=t.get("only"), avoid={acc}, need_slot=False, image=bool(rec.get("image")),
                                    partial=run.cfg.get("relay_min_frac", 0.3) if run.cfg.get("relay", True) else 0.0)
            if not others and not hard:
                evs.append(run.event("WARN_NO_TARGET", task=tid, account=acc, proj_session=q["proj_session"], proj_week=q["proj_week"]))
                break
            why = (f"{acc} ใช้ถึงเพดานแล้ว (5ชม. {q['session_used']}% · สัปดาห์ {wk}%/{cap_w}%)" if hard else
                   f"คาดว่า {acc} จะใช้ถึง 5ชม. {q['proj_session']}% / สัปดาห์ {q['proj_week']}% (เพดาน {cap_w}%) ก่อนงานเสร็จ")
            if others: why += f" → รับต่อได้ดีสุด: {others[0]['account']} (KC-QUEST {others[0]['score']})"
            evs.append(requeue(run, d, t, rec, why))
            proj_s -= rem * rs; proj_w -= rem * rw
            if not hard and proj_s <= lim_s and proj_w <= lim_w: break
    jsave(run.f("state", "quota.json"), {"at": iso(now()), "accounts": list(q_by.values())})

    # 5) orchestrator เหลือน้อย?
    if orch and orch in q_by:
        q = q_by[orch]
        if q.get("headroom") is not None and q["headroom"] < run.cfg["orch_min_headroom"]:
            evs.append(run.event("ORCH_LOW", account=orch, headroom=q["headroom"]))
    run.save_tasks(d)
    return evs

def cmd_wait(run, timeout):
    """เฝ้าดูจนกว่าจะมี event ที่สมองต้องรู้ (หรือหมดเวลา) · ระหว่างนั้นเปิดงานใหม่ให้อัตโนมัติ"""
    cache = {}
    t0 = time.time(); allev = []
    while True:
        evs = monitor_once(run, cache)
        allev += evs
        dispatch(run, quiet=True)
        d = run.tasks()
        left = [t for t in d["tasks"] if t["status"] not in ("done", "failed", "skipped")]
        if not left:
            allev.append(run.event("ALL_DONE")); break
        if not running(run) and not [t for t in left if deps_done(d, t) and t["status"] in ("ready", "todo")]:
            allev.append(run.event("STUCK", left=[t["id"] for t in left])); break
        important = [e for e in allev if e["event"] in ("DONE", "FAILED", "MERGE_CONFLICT", "ORCH_LOW", "INCOMPLETE")]
        if important or time.time() - t0 > timeout: break
        time.sleep(20)
    write_board(run)
    print(json.dumps({"events": allev, "running": list(running(run).keys())}, ensure_ascii=False, indent=1))

# ---------------------------------------------------------------- board
def write_board(run):
    d = run.tasks(); rn = running(run)
    qs = (jload(run.f("state", "quota.json"), {}) or {}).get("accounts", [])
    orch = (jload(run.f("state", "orchestrator.json"), {}) or {}).get("account")
    icon = {"todo": "⏳", "ready": "🔁", "running": "🏃", "done": "✅", "failed": "❌", "skipped": "⏭️"}
    n_done = sum(t["status"] == "done" for t in d["tasks"])
    L = [f"# BOARD · {os.path.basename(run.p)} · อัปเดต {now().strftime('%d/%m %H:%M:%S')}", "",
         f"**orchestrator:** `{orch}` · **worker รันอยู่:** {sum(0 if r.get('image') else 1 for r in rn.values())}/{run.cfg['max_agents']} "
         f"· **image:** {sum(1 if r.get('image') else 0 for r in rn.values())}/{run.cfg['max_image_jobs']} (ไม่นับ) · **เสร็จ:** {n_done}/{len(d['tasks'])}", "",
         "## งาน", "", "| งาน | ชื่อ | สถานะ | บัญชี | ความคืบหน้า | โทเคน (M) ใช้/ประเมิน | รอบ | ขึ้นกับ |", "|---|---|---|---|---|---|---|---|"]
    for t in d["tasks"]:
        L.append(f"| {t['id']} | {t.get('title','')} | {icon.get(t['status'],'')} {t['status']} | {t.get('account','') or ''} "
                 f"| {int(100*t.get('progress',0))}% | {t.get('mtok_used',0)}/{est_mtok(run,t)} | {t.get('attempts',0)} | {', '.join(t.get('depends_on',[]))} |")
    L += ["", "## บัญชี", "", fmt_quota(qs), ""]
    ev = []
    try: ev = open(run.f("logs", "events.jsonl"), encoding="utf-8").read().splitlines()[-15:]
    except FileNotFoundError: pass
    L += ["## event ล่าสุด", "", "```"] + ev + ["```"]
    open(run.f("BOARD.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
    mirror = run.cfg.get("board_mirror")          # copy ไปโฟลเดอร์ใน repo ให้เปิดดูสดใน JupyterLab / Windows ได้
    if mirror:
        try:
            os.makedirs(mirror, exist_ok=True)
            open(os.path.join(mirror, "BOARD.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
        except OSError:
            pass
    return "\n".join(L)

# ---------------------------------------------------------------- commands
def whoami():
    c = os.environ.get("CLAUDE_CONFIG_DIR") or os.environ.get("CODEX_HOME") or ""
    return os.path.basename(c.rstrip("/")) or None

def cmd_init(run, problem, max_agents, mirror=None):
    os.makedirs(run.p, exist_ok=True)
    for sub in ("tasks", "progress", "logs", "state/running", "wt"): os.makedirs(run.f(sub), exist_ok=True)
    cfg = jload(run.f("config.json"), {}) or {}
    cfg["max_agents"] = max_agents
    if mirror: cfg["board_mirror"] = os.path.abspath(mirror)
    jsave(run.f("config.json"), cfg)
    if not os.path.exists(run.f("accounts.json")):
        jsave(run.f("accounts.json"), {"_help": "ใส่ได้ต่อบัญชี: plan_expires (YYYY-MM-DD), budget_pct (% ของสัปดาห์ที่ให้ LAB ใช้), disabled"})
    shutil.copy(problem, run.f("PROBLEM.md"))
    if not os.path.isdir(run.f("app", ".git")):
        os.makedirs(run.app, exist_ok=True)
        sh("git init -q -b main && git config user.name orchestra && git config user.email orchestra@local "
           "&& git commit -q --allow-empty -m init", cwd=run.app, check=True)
        open(os.path.join(run.app, ".gitignore"), "w").write("node_modules/\n.next/\n.env\n.env.vast\ntest-results/\nplaywright-report/\n")
        sh("git add -A && git -c user.name=orchestra -c user.email=orchestra@local commit -qm gitignore", cwd=run.app)
    if not os.path.exists(run.f("tasks.json")): run.save_tasks({"tasks": []})
    me = whoami()
    if me: jsave(run.f("state", "orchestrator.json"), {"account": me, "since": iso(now())})
    run.event("INIT", problem=problem, max_agents=max_agents, orchestrator=me)
    print(f"OK run={run.p} orchestrator={me}")

def cmd_quota(run, as_json):
    snaps = quota_snapshot(run)
    base_p = run.f("state", "baseline.json")
    if not os.path.exists(base_p):
        jsave(base_p, {q["account"]: {"week_used": max(q.get("week_used") or 0, q.get("week_model_used") or 0)} for q in snaps if q.get("logged_in")})
        snaps = score_accounts(run, snaps); jsave(run.f("state", "quota.json"), {"at": iso(now()), "accounts": snaps})
    if as_json:
        print(json.dumps(snaps, ensure_ascii=False, indent=1)); return
    print(fmt_quota(snaps))
    best = orchestrator_pick(snaps)
    tot = sum(q.get("slots", 0) for q in snaps if q.get("logged_in"))
    me = whoami()
    print(f"\nบัญชีที่ล็อกอิน: {', '.join(q['account'] for q in snaps if q.get('logged_in'))}")
    print(f"orchestrator ที่ควรใช้ (headroom มากสุด): {best}  · session นี้คือ: {me}")
    print(f"slot รวม {tot} → worker พร้อมกันได้ {min(tot, run.cfg['max_agents'])} (เพดาน max_agents={run.cfg['max_agents']})")
    run.event("QUOTA", best_orchestrator=best, accounts={q['account']: q.get('headroom') for q in snaps if q.get('logged_in')})

def cmd_check(run):
    d = run.tasks(); ids = [t["id"] for t in d["tasks"]]; errs = []
    if len(ids) != len(set(ids)): errs.append("มี id ซ้ำ")
    for t in d["tasks"]:
        t.setdefault("status", "todo")
        for dep in t.get("depends_on", []):
            if dep not in ids: errs.append(f"{t['id']}: ไม่พบ dependency {dep}")
        if not os.path.exists(run.f("tasks", f"{t['id']}.md")): errs.append(f"{t['id']}: ไม่มีไฟล์ tasks/{t['id']}.md")
        if t.get("size") not in ("S", "M", "L") and not t.get("est_mtok"): errs.append(f"{t['id']}: size ต้องเป็น S/M/L")
    # หา cycle
    state = {}
    def dfs(i):
        state[i] = 1
        for dep in task_by_id(d, i).get("depends_on", []):
            if state.get(dep) == 1: errs.append(f"dependency วนที่ {i} → {dep}")
            elif dep in ids and not state.get(dep): dfs(dep)
        state[i] = 2
    for i in ids:
        if not state.get(i): dfs(i)
    run.save_tasks(d)
    if errs: print("ERROR\n" + "\n".join(errs)); sys.exit(1)
    snaps = (jload(run.f("state", "quota.json"), {}) or {}).get("accounts", [])
    big = [] if not snaps else [t["id"] for t in d["tasks"] if not any(fits(run, q, est_mtok(run, t))[0] for q in snaps if q.get("logged_in") and not q.get("disabled"))]
    print(f"OK {len(ids)} งาน · ประเมินรวม {sum(est_mtok(run,t) for t in d['tasks']):.1f}M tok")
    if big: print("⚠️ งานที่ไม่มีบัญชีไหนปิดได้ในรอบเดียว (ควรแบ่งย่อย): " + ", ".join(big))
    write_board(run)

def cmd_handover(run, to):
    snaps = quota_snapshot(run)
    cur = (jload(run.f("state", "orchestrator.json"), {}) or {}).get("account")
    to = to or orchestrator_pick(snaps, exclude=(cur,))
    if not to: raise SystemExit("ไม่มีบัญชีอื่นให้ส่งไม้")
    model, effort = run.cfg["models"]["orchestrator"][kind_of(to)]
    recipe = os.path.join(os.path.dirname(HERE), "ORCHESTRA_RECIPE.md")
    prompt = (f"ใช้ skill yolo และ cyolo · คุณคือ orchestrator คนใหม่ (รับไม้ต่อจาก {cur}) "
              f"ทำตาม {recipe} ต่อจากสถานะในโฟลเดอร์งาน RUN={run.p} — ข้ามขั้นที่ 1–2 (วางแผนเสร็จแล้ว) "
              f"เริ่มที่ขั้นที่ 3 (loop dispatch/wait) ทันที อ่าน {run.f('BOARD.md')} และ {run.f('NOTES.md')} ก่อน")
    jsave(run.f("state", "orchestrator.json"), {"account": to, "since": iso(now()), "from": cur})
    log = run.f("logs", f"orchestrator.{to}.{now().strftime('%H%M%S')}.jsonl")
    if kind_of(to) == "yolo":
        cmd = [to, "-p", "--model", model, "--effort", effort, "--strict-mcp-config", "--output-format", "stream-json", "--verbose"]
        stdin = subprocess.PIPE
    else:
        cmd = [to, "exec", "--skip-git-repo-check", "-m", model, "-c", f'model_reasoning_effort="{effort}"', "--json", "-"]
        stdin = subprocess.PIPE
    p = subprocess.Popen(cmd, cwd=run.p, stdin=stdin, stdout=open(log, "w"), stderr=subprocess.STDOUT, start_new_session=True)
    if stdin == subprocess.PIPE: p.stdin.write(prompt.encode()); p.stdin.close()
    run.event("ORCH_SWITCH", from_account=cur, to_account=to, pid=p.pid, log=log)
    write_board(run)
    print(f"ส่งไม้ orchestrator: {cur} → {to} (pid {p.pid}) · log {log}")

def cmd_infra(run, action):
    c = run.cfg["dev_db"]
    if action == "up":
        r = sh(f"docker ps -a --format '{{{{.Names}}}}' | grep -qx {c['name']}")
        if r.returncode != 0:
            sh(f"docker run -d --name {c['name']} -p 127.0.0.1:{c['port']}:5432 -e POSTGRES_USER={c['user']} "
               f"-e POSTGRES_PASSWORD={c['password']} {c.get('image', 'postgres:16-alpine')}", check=True)
        else:
            sh(f"docker start {c['name']}")
        for x in run.cfg.get("dev_services", []):          # RabbitMQ / embedder ฯลฯ ที่ใช้ร่วมกัน
            if sh(f"docker ps -a --format '{{{{.Names}}}}' | grep -qx {x['name']}").returncode == 0:
                sh(f"docker start {x['name']}"); continue
            ports = " ".join(f"-p 127.0.0.1:{h}:{ct}" for ct, h in x.get("ports", {}).items())
            sh(f"docker run -d --name {x['name']} {ports} {x['image']} {x.get('args', '')}", check=True)
        for _ in range(30):
            if sh(f"docker exec {c['name']} pg_isready -U {c['user']}").returncode == 0: break
            time.sleep(2)
        print(f"dev db พร้อม: {dev_db_host(c)}:{c['port']} (user {c['user']})")
        for x in run.cfg.get("dev_services", []): print(f"{x['name']} เปิดแล้ว → {x['env'].format(host=dev_db_host(c))}")
    else:
        sh(f"docker rm -f {c['name']} " + " ".join(x["name"] for x in run.cfg.get("dev_services", [])))
        print("ปิด dev db + บริการ dev แล้ว")

def cmd_report(run):
    """สรุปผลทั้งรัน: งาน × บัญชี × โทเคน × การสลับ → REPORT.md"""
    d = run.tasks()
    evs = []
    try: evs = [json.loads(l) for l in open(run.f("logs", "events.jsonl"), encoding="utf-8") if l.strip()]
    except FileNotFoundError: pass
    first = parse_iso(evs[0]["t"]) if evs else now()
    last = parse_iso(evs[-1]["t"]) if evs else now()
    per_acc = {}
    for t in d["tasks"]:
        for h in t.get("history", []): per_acc.setdefault(h["account"], {"starts": 0, "tasks": set()})
    acct = jload(run.f("state", "acct_mtok.json"), {}) or {}
    for e in evs:
        if e["event"] == "START":
            a = per_acc.setdefault(e["account"], {"starts": 0, "tasks": set()}); a["starts"] += 1; a["tasks"].add(e["task"])
    n = lambda k: sum(1 for e in evs if e["event"] == k)
    peak, cur = 0, 0
    for e in evs:
        if e["event"] == "START": cur += 1; peak = max(peak, cur)
        elif e["event"] in ("DONE", "HANDOFF", "LIMIT_HANDOFF", "INCOMPLETE", "FAILED", "MERGE_CONFLICT", "STOP"): cur = max(0, cur - 1)
    L = [f"# REPORT · {os.path.basename(run.p)}", "",
         f"- เวลา: {first.strftime('%d/%m %H:%M')} → {last.strftime('%H:%M')} ({(last-first).total_seconds()/60:.0f} นาที)",
         f"- งาน: {sum(t['status']=='done' for t in d['tasks'])}/{len(d['tasks'])} เสร็จ · worker พร้อมกันสูงสุด {peak} ตัว (เพดาน {run.cfg['max_agents']})",
         f"- ส่งงานต่อ (HANDOFF): {n('HANDOFF')} ครั้ง · โควตาหมดกลางงาน: {n('LIMIT_HANDOFF')} · merge conflict: {n('MERGE_CONFLICT')} · ทำไม่จบแล้วทำต่อ: {n('INCOMPLETE')}",
         f"- สลับ orchestrator: {n('ORCH_SWITCH')} ครั้ง", "",
         "## งาน", "", "| งาน | ชื่อ | สถานะ | บัญชีที่ทำ (ตามลำดับ) | รอบ | โทเคน (M) |", "|---|---|---|---|---|---|"]
    for t in d["tasks"]:
        chain = " → ".join(h["account"] for h in t.get("history", []))
        L.append(f"| {t['id']} | {t.get('title','')} | {t['status']} | {chain} | {t.get('attempts',0)} | {t.get('mtok_used',0)} |")
    L += ["", "## บัญชี", "", "| บัญชี | เปิดงาน (ครั้ง) | งานที่แตะ | โทเคนรวม (M) | % ต่อ 1M token (เรียนรู้จริง 5ชม./สัปดาห์) |", "|---|---|---|---|---|"]
    cal = jload(run.f("state", "calibration.json"), {}) or {}
    for a, v in sorted(per_acc.items()):
        c = cal.get(a, {})
        L.append(f"| {a} | {v['starts']} | {len(v['tasks'])} | {acct.get(a,{}).get('cum',0)} | {c.get('session','-')} / {c.get('week','-')} |")
    L += ["", "## การสลับบัญชี / orchestrator", ""]
    for i, e in enumerate(evs):
        k = e["event"]
        if k in ("HANDOFF", "LIMIT_HANDOFF"):
            nxt = next((x["account"] for x in evs[i + 1:] if x["event"] == "START" and x.get("task") == e.get("task")), "?")
            L.append(f"- `{e['t'][11:19]}` **{k}** งาน {e.get('task')} · {e.get('from_account')} → **{nxt}** · {e.get('why','')}")
        elif k == "ORCH_LOW":
            L.append(f"- `{e['t'][11:19]}` **ORCH_LOW** ตัวคุมวง {e.get('account')} เหลือ {e.get('headroom')}%")
        elif k == "ORCH_SWITCH":
            L.append(f"- `{e['t'][11:19]}` **ORCH_SWITCH** ส่งไม้ตัวคุมวง {e.get('from_account')} → **{e.get('to_account')}**")
    L += ["", "## โควตาตอนจบ", "", fmt_quota((jload(run.f("state", "quota.json"), {}) or {}).get("accounts", []))]
    open(run.f("REPORT.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("\n".join(L))

def cmd_export(run, to):
    """copy ผลลัพธ์ (โค้ด main + board + report + log เหตุการณ์ + โจทย์ที่แตกแล้ว) ไปโฟลเดอร์ใน repo"""
    to = os.path.abspath(to)
    os.makedirs(to, exist_ok=True)
    if os.path.isdir(os.path.join(to, "app")): shutil.rmtree(os.path.join(to, "app"))
    os.makedirs(os.path.join(to, "app"))
    sh(f"git archive main | tar -x -C '{to}/app'", cwd=run.app, check=True)
    for extra in ("test-gifs", "test-videos", "TEST_REPORT.md"):   # ไฟล์ผลทดสอบที่ไม่ได้ commit
        src = os.path.join(run.app, extra)
        if os.path.exists(src) and not os.path.exists(os.path.join(to, "app", extra)):
            (shutil.copytree if os.path.isdir(src) else shutil.copy)(src, os.path.join(to, "app", extra))
    os.makedirs(os.path.join(to, "orchestra"), exist_ok=True)
    for f in ("BOARD.md", "REPORT.md", "NOTES.md", "PROBLEM.md", "tasks.json", "config.json", "accounts.json"):
        if os.path.exists(run.f(f)): shutil.copy(run.f(f), os.path.join(to, "orchestra", f))
    for sub in ("tasks", "progress"):
        if os.path.isdir(run.f(sub)):
            shutil.copytree(run.f(sub), os.path.join(to, "orchestra", sub), dirs_exist_ok=True)
    shutil.copy(run.f("logs", "events.jsonl"), os.path.join(to, "orchestra", "events.jsonl"))
    for f in ("quota.json", "calibration.json"):
        if os.path.exists(run.f("state", f)): shutil.copy(run.f("state", f), os.path.join(to, "orchestra", f))
    print(f"export → {to}")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd")
    ap.add_argument("arg", nargs="?")
    ap.add_argument("--run", default=os.environ.get("RUN", "."))
    ap.add_argument("--problem"); ap.add_argument("--max-agents", type=int, default=12)
    ap.add_argument("--mirror", help="init: โฟลเดอร์ใน repo ที่จะ copy BOARD.md ไปให้ดูสด")
    ap.add_argument("--task"); ap.add_argument("--account"); ap.add_argument("--to")
    ap.add_argument("--timeout", type=int, default=540); ap.add_argument("--json", action="store_true")
    ap.add_argument("--requeue", action="store_true"); ap.add_argument("--note", default="")
    a = ap.parse_args()
    run = Run(a.run)
    if a.cmd == "init": cmd_init(run, a.problem, a.max_agents, a.mirror)
    elif a.cmd == "quota": cmd_quota(run, a.json)
    elif a.cmd == "whoami": print(whoami())
    elif a.cmd == "check": cmd_check(run)
    elif a.cmd == "dispatch": dispatch(run, quota_snapshot(run))
    elif a.cmd == "wait": cmd_wait(run, a.timeout)
    elif a.cmd == "board": print(write_board(run))
    elif a.cmd == "start":
        d = run.tasks(); t = task_by_id(d, a.task); start_task(run, t, a.account, d, "สั่งเอง"); run.save_tasks(d); write_board(run)
    elif a.cmd == "stop":
        d = run.tasks(); t = task_by_id(d, a.task); rec = running(run).get(a.task)
        if not rec: raise SystemExit("งานนี้ไม่ได้รันอยู่")
        if a.requeue: print(requeue(run, d, t, rec, a.note or "สั่งสลับเอง"))
        else:
            stop_proc(rec); autocommit(run, a.task, f"{a.task}: WIP (หยุด)"); t["status"] = "ready"
            os.remove(run.f("state", "running", f"{a.task}.json")); run.event("STOP", task=a.task)
        run.save_tasks(d); write_board(run)
    elif a.cmd == "retry":
        d = run.tasks(); t = task_by_id(d, a.task); t["status"] = "ready"; t["attempts"] = min(t.get("attempts", 0), run.cfg["max_attempts"] - 1)
        if a.note: t["handoff_note"] = (t.get("handoff_note") or "") + "\n- หมายเหตุจาก orchestrator: " + a.note
        run.save_tasks(d); run.event("RETRY", task=a.task, note=a.note); print("OK")
    elif a.cmd == "handover": cmd_handover(run, a.to)
    elif a.cmd == "infra": cmd_infra(run, a.arg or "up")
    elif a.cmd == "report": cmd_report(run)
    elif a.cmd == "export": cmd_export(run, a.to or a.arg)
    else: ap.print_help()

if __name__ == "__main__":
    main()
