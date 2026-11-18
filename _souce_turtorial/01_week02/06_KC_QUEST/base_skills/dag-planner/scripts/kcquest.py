#!/usr/bin/env python3
"""kcquest.py — KC-QUEST (KMITL–Chanwanich Quota-Urgency Expiry-aware Scheduling Technique)

ดึงเฉพาะส่วนที่ dag-planner ใช้จาก tools/orch.py (สูตรและน้ำหนักเหมือนเดิม):
  ① rank        rank(j) = c_j + max rank(งานที่รอ j)              → ranks() · critical_path()
  ② capacity    งานใหญ่สุดที่บัญชีรับได้โดยไม่เกินเส้น θ (σ, margin)   → capacity()
  ③ คะแนน       Σ w·factor (U/F/R/V/L)                              → FACTORS · choose_account()
  ④ เลือก+จอง   MRV → rank → คะแนนสูงสุด → จองโควตาทันที            → plan_round() · reserve_on()
ส่วนที่เพิ่มสำหรับบล็อกหลายบัญชี: roles_of() แตกบล็อก review/debate/best_of เป็นหลายบทบาท
แต่ละบทบาทเลือกบัญชีด้วย choose_account() เดียวกัน (กันบัญชีซ้ำ · ผู้ตรวจ review คนละ CLI)
ไม่มีส่วน worker/postgres/merge ของ orch.py · Python 3.8+ stdlib เท่านั้น
"""
import copy
import datetime as dt
import re

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("Asia/Bangkok")
except Exception:                      # Python 3.8 / ไม่มี tzdata → +07:00
    ZoneInfo = None
    TZ = dt.timezone(dt.timedelta(hours=7), "ICT")

CFG = {
    "max_agents": 6,               # บทบาท (agent) ที่รันพร้อมกันสูงสุดทั้งทีม
    "per_account_max": {"yolo": 3, "cyolo": 3},   # orch.py = 4/3 · agent-team รับได้ 3 งาน/บัญชี → ใช้ค่าที่ต่ำกว่า
    "slot_pct": 8,                 # 1 slot ต้องมี headroom อย่างน้อยกี่ %
    "safety": 1.3,                 # σ
    "min_margin": 2.0, "react_h": 0.25,
    "weights": {"urgency": 0.40, "fit": 0.20, "session": 0.15, "speed": 0.15, "load": -0.10, "bonus": 0.0},
    "speed": {"yolo": 1.0, "cyolo": 0.7},
    "urgency_t0_h": 24,
    "speed_mtok_h": {"yolo": 7.2, "cyolo": 4.8},
    "size_mtok": {"S": 0.6, "M": 1.5, "L": 3.0},
    "prior_rate": {"session": {"max": 1.0, "team": 2.0, "pro": 1.0, "default": 2.0},
                   "week": {"max": 0.12, "team": 0.25, "pro": 0.15, "default": 0.25}},
    "check_frac": 0.3,             # ผู้ตรวจ (review) / ผู้ตัดสิน (debate, best_of) ใช้โทเคน ≈ 30% ของบล็อก
}

SKILLS = ("yolo", "cyolo", "image", "review", "debate", "best_of")


def now(): return dt.datetime.now(TZ)
def iso(t): return t.isoformat(timespec="seconds") if t else None


def parse_iso(s):
    try:
        t = dt.datetime.fromisoformat(s) if s else None
    except ValueError:
        return None
    return t.replace(tzinfo=TZ) if t and t.tzinfo is None else t


def kind_of(acc): return "cyolo" if acc.startswith("cyolo") else "yolo"


# ---------------------------------------------------------------- quota (จากแคชของ agent-team)
def parse_reset(txt):
    """'Nov 12, 5:59am (Asia/Bangkok)' (Claude /usage) หรือ ISO (Codex) → datetime"""
    if not txt:
        return None
    t = parse_iso(txt)
    if t:
        return t
    m = re.match(r"^(.*?)\s*\(([^)]+)\)\s*$", txt.strip())
    body, tzname = (m.group(1), m.group(2)) if m else (txt.strip(), None)
    tz = TZ
    if tzname and ZoneInfo:
        try:
            tz = ZoneInfo(tzname)
        except Exception:
            pass
    t0 = now().astimezone(tz)
    for fmt in ("%b %d, %I:%M%p", "%b %d, %I%p", "%b %d %I:%M%p", "%b %d %I%p", "%I:%M%p", "%I%p"):
        try:
            d = dt.datetime.strptime(body, fmt)
        except ValueError:
            continue
        if "%b" not in fmt:
            d = t0.replace(hour=d.hour, minute=d.minute, second=0, microsecond=0)
            return d if d > t0 else d + dt.timedelta(days=1)
        d = d.replace(year=t0.year, tzinfo=tz)
        if d < t0 - dt.timedelta(days=2):
            d = d.replace(year=t0.year + 1)
        return d
    return None


def snap_from_team(acc, q, plan_hint=None):
    """แปลง 1 รายการของ `team.py quota --json` (สกิล agent-team ใน base_skills) → snapshot แบบ orch.py

    ฟิลด์ที่ใช้: session_pct · session_resets · week_pct · week_resets · week_other{รุ่น: %} · plan
    Codex มี primary/secondary {used_percent, window_minutes, resets} → หน้าต่าง < 7 วัน = session, ยาวสุด = week
    """
    q = q or {}
    s = {"account": acc, "kind": kind_of(acc), "logged_in": True, "plan": q.get("plan") or plan_hint or "default",
         "session_used": 0, "session_reset": None, "week_used": 0, "week_reset": None, "at": q.get("as_of")}
    wins = {}
    if q.get("session_pct") is not None:
        wins["session"] = (float(q["session_pct"]), q.get("session_resets"))
    if q.get("week_pct") is not None:
        wins["week"] = (float(q["week_pct"]), q.get("week_resets"))
    for w in (q.get("primary"), q.get("secondary")):          # Codex: เวลารีเซ็ตอยู่ในหน้าต่างดิบ
        if not w:
            continue
        slot = "session" if (w.get("window_minutes") or 0) < 10080 else "week"
        if slot in wins and not wins[slot][1]:
            wins[slot] = (wins[slot][0], w.get("resets"))
    for slot, (pct, rst_txt) in wins.items():
        rst = parse_reset(rst_txt)
        if rst and rst <= now():                # ข้อมูลเก่า: รอบนั้นรีเซ็ตแล้ว → 0%
            step = dt.timedelta(hours=5 if slot == "session" else 168)
            while rst <= now():
                rst += step
            pct = 0.0
        s[slot + "_used"], s[slot + "_reset"] = pct, iso(rst)
    other = [float(v) for v in (q.get("week_other") or {}).values() if v is not None]
    if other:                                   # เพดานเฉพาะรุ่น นับเป็นเพดานสัปดาห์อีกตัว
        s["week_model_used"] = max(other)
    if not wins:
        s["usage_error"] = (q.get("note") or "ไม่มีข้อมูลโควตา") + " → ถือว่า 0%"
    return s


def assumed(acc, left, plan="default"):
    """โควตาสมมติจาก --accounts acc:left (เหลือ left% ในหน้าต่าง 5 ชม.) — ไว้ทดลอง what-if"""
    return {"account": acc, "kind": kind_of(acc), "logged_in": True, "plan": plan, "assumed": True,
            "session_used": 100 - left, "session_reset": iso(now() + dt.timedelta(hours=5)) if left < 100 else None,
            "week_used": 0, "week_reset": iso(now() + dt.timedelta(hours=168))}


def score_accounts(snaps, cfg=CFG):
    """เติม headroom / U / คะแนนภาพรวม / slot (เหมือน orch.score_accounts ไม่รวม budget_pct)"""
    t = now()
    for q in snaps:
        su = q.get("session_used") or 0
        wu = max(q.get("week_used") or 0, q.get("week_model_used") or 0)
        q["cap_week"] = 100
        q["headroom_session"] = max(0, 100 - su)
        q["headroom_week"] = max(0, 100 - wu)
        q["headroom"] = min(q["headroom_session"], q["headroom_week"])
        exp = parse_iso(q.get("week_reset")) or t + dt.timedelta(days=7)
        hours = max(1.0, (exp - t).total_seconds() / 3600)
        q["expires"], q["hours_left"] = iso(exp), round(hours, 1)
        q["use_first"] = round(cfg["urgency_t0_h"] / (cfg["urgency_t0_h"] + hours), 3)
        q["score"] = round(100 * (0.6 * q["use_first"] + 0.4 * q["headroom"] / 100), 1)
        q["slots"] = 0 if q["headroom"] <= cfg["min_margin"] else \
            max(1, min(cfg["per_account_max"][q["kind"]], int(q["headroom"] // cfg["slot_pct"])))
    return snaps


def rate_for(cfg, plan, window):
    pr = cfg["prior_rate"][window]
    return pr.get(plan, pr["default"])


def hours_until(ts):
    t = parse_iso(ts) if isinstance(ts, str) else ts
    return None if not t else max(0.0, (t - now()).total_seconds() / 3600)


def make_state(q, cfg=CFG):
    return {"account": q["account"], "kind": q["kind"], "rs": rate_for(cfg, q.get("plan"), "session"),
            "rw": rate_for(cfg, q.get("plan"), "week"), "h_s": q["headroom_session"], "h_w": q["headroom_week"],
            "hours_left": max(1.0, q.get("hours_left") or 168), "slots": q.get("slots", 0), "used": 0,
            "bonus": 0.0, "sreset_h": hours_until(q.get("session_reset"))}


# ---------------------------------------------------------------- ① rank + สายวิกฤต
def ranks(blocks, cost):
    """rank(j) = c_j + max_{k∈succ(j)} rank(k) (หน่วย M tok) → (rank, succ, สูตรแทนค่า)"""
    succ = {b["id"]: [] for b in blocks}
    for b in blocks:
        for d in b.get("depends_on", []):
            succ[d].append(b["id"])
    memo = {}

    def rank(i):
        if i not in memo:
            memo[i] = cost[i] + max([rank(k) for k in succ[i]] + [0])
        return memo[i]
    for b in blocks:
        rank(b["id"])
    calc = {}
    for b in blocks:
        i, ss = b["id"], sorted(succ[b["id"]], key=lambda k: -memo[k])
        calc[i] = (f"= {cost[i]:g} (ไม่มีใครรอ)" if not ss else
                   f"{cost[i]:g} + max({', '.join(f'{k} {memo[k]:g}' for k in ss)}) = {memo[i]:g}")
    return {k: round(v, 3) for k, v in memo.items()}, succ, calc


def critical_path(blocks, rank, succ):
    roots = [b["id"] for b in blocks if not b.get("depends_on")]
    cur = max(roots, key=lambda i: (rank[i], -roots.index(i)))
    path = [cur]
    while succ[cur]:
        cur = max(succ[cur], key=lambda k: (rank[k], -succ[cur].index(k)))
        path.append(cur)
    return path


def norm_ranks(rank):
    mx = max(list(rank.values()) + [1e-9])
    return {i: round(v / mx, 3) for i, v in rank.items()}


# ---------------------------------------------------------------- ②③ capacity + คะแนน
FACTORS = {
    "urgency": lambda s, x: x["cfg"]["urgency_t0_h"] / (x["cfg"]["urgency_t0_h"] + s["hours_left"]),   # U
    "fit": lambda s, x: min(1.0, x["qw"] / max(s["h_w"], 1e-9)),                                      # F
    "session": lambda s, x: max(0.0, s["h_s"] - x["qs"]) / 100,                                       # R
    "speed": lambda s, x: x["cfg"]["speed"].get(s["kind"], 1.0) * x["crit"],                          # V
    "load": lambda s, x: s["used"] / max(1, s["slots"]),                                              # L
    "bonus": lambda s, x: s.get("bonus", 0.0),
}


def margin(s, cfg, window, workers=1):
    r = s["rs"] if window == "session" else s["rw"]
    return max(cfg["min_margin"], r * cfg["speed_mtok_h"].get(s["kind"], 6.0) * cfg["react_h"] * max(1, workers))


def capacity(s, cfg, sigma=None):
    """งานใหญ่สุด (M tok) ที่บัญชีนี้ปิดได้โดยไม่เกินเส้น θ · รู้เวลารีเซ็ต 5 ชม. (⑦)"""
    sig = cfg["safety"] if sigma is None else sigma
    m_s, m_w = margin(s, cfg, "session", s["used"] + 1), margin(s, cfg, "week", s["used"] + 1)
    room_s = max(0.0, s["h_s"] - m_s) / (sig * s["rs"])
    room_w = max(0.0, s["h_w"] - m_w) / (sig * s["rw"])
    sr = s.get("sreset_h")
    if sr is not None:
        before = cfg["speed_mtok_h"].get(s["kind"], 6.0) * sr
        if room_s >= before:
            room_s = before + (100 - m_s) / (sig * s["rs"])
    return min(room_s, room_w)


def choose_account(cost, crit, states, cfg, kind_only=None, avoid=()):
    """บัญชีที่ "ปิดงานนี้ได้" (cost ≤ capacity และมี slot ว่าง) เรียงตามคะแนน มาก→น้อย"""
    W, sig = cfg["weights"], cfg["safety"]
    out = []
    for s in states:
        if kind_only and s["kind"] != kind_only:
            continue
        if s["account"] in avoid or s["used"] >= s["slots"]:
            continue
        cap = capacity(s, cfg)
        if cost > cap:
            continue
        qs, qw = sig * s["rs"] * cost, sig * s["rw"] * cost
        x = {"qs": qs, "qw": qw, "crit": crit, "cfg": cfg}
        parts = {k: round(FACTORS[k](s, x), 3) for k, w in W.items() if w and k in FACTORS}
        sc = sum(W[k] * v for k, v in parts.items())
        out.append({"account": s["account"], "kind": s["kind"], "score": round(100 * sc, 1), "qs": round(qs, 2),
                    "qw": round(qw, 2), "parts": parts, "cap": round(cap, 2)})
    out.sort(key=lambda o: (-o["score"], o["account"]))
    return out


def reserve_on(states, acc, qs, qw):
    """④ จองโควตา + slot ทันที → บทบาท/บล็อกถัดไปเห็น headroom ที่ลดลงแล้ว"""
    for s in states:
        if s["account"] == acc:
            s["h_s"] -= qs
            s["h_w"] -= qw
            s["used"] += 1


def release(states, acc):
    for s in states:
        if s["account"] == acc:
            s["used"] -= 1


def why_text(c, need, cands):
    p = " ".join(f"{k[0].upper()}={v}" for k, v in c["parts"].items())
    alt = f" · อันดับ 2 {cands[1]['account']} {cands[1]['score']}" if len(cands) > 1 else ""
    return f"{c['account']} {c['score']} ({p}) · {need:.2f}M ≈ 5ชม. {c['qs']}% / สัปดาห์ {c['qw']}%{alt}"


# ---------------------------------------------------------------- บล็อก → บทบาท
def roles_of(b, cost, cfg=CFG):
    """[(role, kind_only, M tok, กติกา)] · กติกา: 'other_cli' = ต่าง CLI จากผู้ทำ · บัญชีในบล็อกเดียวกันห้ามซ้ำเสมอ"""
    sk, c, ck = b["skill"], cost, cost * cfg["check_frac"]
    if sk == "yolo":
        return [("worker", "yolo", c, None)]
    if sk in ("cyolo", "image"):
        return [("worker", "cyolo", c, None)]
    if sk == "review":
        return [("worker", b.get("worker"), c, None), ("reviewer", None, ck, "other_cli")]
    if sk == "debate":
        return [("candidate", "yolo", c, None), ("candidate", "cyolo", c, None), ("judge", None, ck, None)]
    if sk == "best_of":
        return [("candidate", None, c, None)] * int(b.get("n") or 2) + [("judge", None, ck, None)]
    raise ValueError(f"skill ไม่รู้จัก {sk}")


def pick_roles(b, cost, crit, states, cfg):
    """เลือกบัญชีทุกบทบาทของบล็อก (จองทันทีทีละบทบาท) · ไม่ครบ = คืนสถานะเดิม → None"""
    saved = copy.deepcopy(states)
    picks, used = [], []
    for role, kind, need, rule in roles_of(b, cost, cfg):
        if rule == "other_cli":
            kind = "cyolo" if kind_of(picks[0]["account"]) == "yolo" else "yolo"
        cands = choose_account(need, crit, states, cfg, kind_only=kind, avoid=used)
        if not cands:
            states[:] = saved
            return None
        c = cands[0]
        reserve_on(states, c["account"], c["qs"], c["qw"])
        used.append(c["account"])
        picks.append({"role": role, "account": c["account"], "score": c["score"], "need": round(need, 3),
                      "why": why_text(c, need, cands), "alts": [f"{x['account']} {x['score']}" for x in cands[1:3]]})
    return picks


def options(b, cost, crit, states, cfg):
    """MRV: จำนวนบัญชีที่รับบทบาทหลักได้ (บทบาทที่ทางเลือกน้อยที่สุด)"""
    n = []
    for role, kind, need, rule in roles_of(b, cost, cfg):
        if rule == "other_cli":
            n.append(len(choose_account(need, crit, states, cfg)))
        else:
            n.append(len(choose_account(need, crit, states, cfg, kind_only=kind)))
    return min(n) if n else 0


def duration_h(b, picks, cost, cfg, k=1.0):
    """เวลาประเมิน (ชม.) = ผู้ทำ (ขนานกันถ้าหลายคน) + ผู้ตรวจ/ผู้ตัดสิน ต่อกัน · × k ที่เรียนรู้จากรอบก่อน"""
    sp = cfg["speed_mtok_h"]
    work = [p for p in picks if p["role"] in ("worker", "candidate")]
    check = [p for p in picks if p["role"] in ("reviewer", "judge")]
    base = max(p["need"] / sp[kind_of(p["account"])] for p in work) + \
        sum(p["need"] / sp[kind_of(p["account"])] for p in check)
    return max(base, 0.02), max(base, 0.02) * k


# ---------------------------------------------------------------- จำลองเวลา (ใช้ KC-QUEST ทุกครั้งที่มีบล็อกพร้อม)
def simulate(blocks, snaps, cost, rank, cfg=CFG, calib=None):
    calib = calib or {}
    by = {b["id"]: b for b in blocks}
    states = [make_state(q, cfg) for q in snaps if q.get("logged_in") and q.get("headroom") is not None]
    crit = norm_ranks(rank)
    t, done, running, out, rounds, peak = 0.0, set(), [], {}, [], 0
    while len(done) + sum(1 for v in out.values() if v["status"] == "unassigned") < len(blocks):
        ready = [b for b in blocks if b["id"] not in out and all(d in done for d in b.get("depends_on", []))]
        if any(by[r["id"]].get("exclusive") for r in running):
            ready = []
        if any(b.get("exclusive") for b in ready):
            ex = [b for b in ready if b.get("exclusive")]
            ready = ex[:1] if not running else [b for b in ready if not b.get("exclusive")]
        # ⑧ MRV ก่อน แล้ว rank (สายยาวได้ก่อน) แล้วขนาด
        order = sorted(ready, key=lambda b: (min(options(b, cost[b["id"]], crit[b["id"]], states, cfg), 3) or 9,
                                             -rank[b["id"]], -cost[b["id"]], b["id"]))
        free = cfg["max_agents"] - sum(len(r["accounts"]) for r in running)
        rnd = []
        for b in order:
            nroles = len(roles_of(b, cost[b["id"]], cfg))
            if nroles > free:
                continue
            picks = pick_roles(b, cost[b["id"]], crit[b["id"]], states, cfg)
            if not picks:
                continue
            k = calib.get(b["skill"], calib.get("*", 1.0))
            base, dur = duration_h(b, picks, cost[b["id"]], cfg, k)
            rec = {"id": b["id"], "skill": b["skill"], "accounts": picks, "account": picks[0]["account"],
                   "start": t, "end": t + dur, "dur_base_h": round(base, 4), "k": k, "status": "planned",
                   "score": picks[0]["score"]}
            out[b["id"]] = rec
            running.append(rec)
            rnd.append(b["id"])
            free -= nroles
            if b.get("exclusive"):
                break
        if rnd:
            rounds.append({"t_min": round(t * 60, 1), "start": rnd})
        peak = max(peak, sum(len(r["accounts"]) for r in running))
        if not running:
            for b in ready:
                out[b["id"]] = {"id": b["id"], "skill": b["skill"], "accounts": [], "account": None, "status": "unassigned",
                                "why": "ไม่มีบัญชีชุดไหนปิดบล็อกนี้ได้ (แบ่งให้เล็กลง / เพิ่มบัญชี / ลด n)"}
            if not ready:
                break
            continue
        nxt = min(r["end"] for r in running)
        t = nxt
        for r in [r for r in running if r["end"] <= nxt + 1e-9]:
            running.remove(r)
            done.add(r["id"])
            for p in r["accounts"]:
                release(states, p["account"])
    return out, rounds, peak
