#!/usr/bin/env python3
"""kclab.py — โหมดสอนของ KC-QUEST: แสดงทุกตัวเลขที่อัลกอริทึมคิด ทีละรอบ ทีละบทบาท

อัลกอริทึมไม่ได้อยู่ในไฟล์นี้ ไฟล์นี้เรียก KC-QUEST ตัวจริงจาก base skill
`base_skills/dag-planner/scripts/kcquest.py` (ตัวเดียวกับที่คำสั่ง `dagplan.py plan` ใช้) แล้วจดทุกขั้นไว้ให้ดู
ทุกครั้งที่รัน จะเทียบผลกับ `kcquest.simulate()` ของ base skill ถ้าไม่ตรงกันจะหยุดพร้อมแจ้ง

  kclab.py doctor                         ตรวจ python · base skills · ตัวแปลงภาพ
  kclab.py rank   [--blocks F]            ① rank ทีละบล็อก · สายวิกฤต · ขอบล่างของเวลา
  kclab.py rounds [ตัวเลือก] [--png]      รอบแจกงานทั้งหมด · ใครได้กี่บล็อก · เวลารวม (--png = วาด DAG และ Gantt)
  kclab.py explain --round N [--png]      ทุกตัวเลขของรอบที่ N: ① ลำดับ ② กรอง ③ คะแนน ④ จอง

ตัวเลือกร่วม
  --blocks F        ไฟล์บล็อกงาน              (ค่าเริ่มต้น examples/meow-shop/blocks.json)
  --scenario F      สถานการณ์โควตาของบัญชี    (ค่าเริ่มต้น examples/quota_lesson.json)
  --max-agents N    จำนวน agent ที่รันพร้อมกันสูงสุด (ค่าเริ่มต้น 6)
  --weights K=V,..  เปลี่ยนน้ำหนัก เช่น urgency=0 หรือ load=-0.4  (urgency fit session speed load)
  --set A.K=V,..    แก้สถานการณ์เฉพาะจุด เช่น yolo2.week_reset_h=200 หรือ yolo1.session_left=40
  --out DIR         โฟลเดอร์ผล (ค่าเริ่มต้น out/lesson)

Python 3.8+ ไลบรารีมาตรฐานเท่านั้น · ไม่เรียกบัญชี AI · ไม่ใช้โทเคน
"""
import argparse
import copy
import datetime as dt
import json
import os
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.realpath(__file__))
ROOT = os.path.dirname(HERE)


def find_skill():
    """โฟลเดอร์ scripts ของ base skill dag-planner: $KCLAB_BASE_SKILLS → ../base_skills → ./base_skills"""
    for base in (os.environ.get("KCLAB_BASE_SKILLS"), os.path.join(ROOT, "base_skills"),
                 os.path.join(os.getcwd(), "base_skills")):
        if base and os.path.isfile(os.path.join(base, "dag-planner", "scripts", "kcquest.py")):
            return os.path.abspath(os.path.join(base, "dag-planner", "scripts"))
    sys.exit("ERROR ไม่พบ base_skills/dag-planner/scripts/kcquest.py (ต้องรันจากโฟลเดอร์ 06_KC_QUEST)")


SKILL = find_skill()
sys.path.insert(0, SKILL)
import kcquest as K  # noqa: E402  ← KC-QUEST ตัวจริงของ base skill
import render as R  # noqa: E402   ← ตัววาด DAG / Gantt ของ base skill

# เวลา "ตอนนี้" คงที่ → ตัวเลขในบทเรียนเท่ากันทุกครั้งที่รัน (ไม่ได้แก้ไฟล์ของ base skill)
FIXED_NOW = dt.datetime(2026, 11, 10, 9, 0, 0, tzinfo=K.TZ)
K.now = lambda: FIXED_NOW

NAMES = {"urgency": "U", "fit": "F", "session": "R", "speed": "V", "load": "L"}
ROLE_TH = {"worker": "ทำ", "reviewer": "ตรวจ", "candidate": "ตอบ", "judge": "ตัดสิน"}
COLORS = {"urgency": "#e8590c", "fit": "#2f9e44", "session": "#1c7ed6", "speed": "#7048e8", "load": "#c92a2a"}


def g(x, nd=3):
    """ตัวเลขสั้น ๆ: ตัดศูนย์ท้าย"""
    return f"{round(x, nd):g}"


def jload(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- อินพุต
def load_blocks(path):
    doc = jload(path)
    blocks = doc["blocks"]
    for b in blocks:
        b.setdefault("depends_on", [])
        b.setdefault("difficulty", 2)
        b.setdefault("skill", "yolo")
        b.setdefault("title", b["id"])
    # "c" = ขนาดเป็นตัวเลขตรง ๆ (ใช้กับตัวอย่างทฤษฎี) · ไม่มี = แปลงจาก S/M/L
    cost = {b["id"]: float(b["c"]) if "c" in b else K.CFG["size_mtok"][b["size"]] for b in blocks}
    rank, succ, calc = K.ranks(blocks, cost)
    crit = K.critical_path(blocks, rank, succ)
    return doc, blocks, cost, rank, succ, calc, crit


def load_scenario(path, sets=""):
    doc = jload(path)
    accs = doc["accounts"]
    for kv in filter(None, (sets or "").replace(" ", "").split(",")):
        key, _, val = kv.partition("=")
        acc, _, field = key.partition(".")
        hit = [a for a in accs if a["account"] == acc]
        if not hit or not field:
            sys.exit(f"ERROR --set {kv!r}: ไม่พบบัญชี {acc!r} หรือไม่ได้ระบุฟิลด์ (รูปแบบ yolo2.week_reset_h=200)")
        hit[0][field] = float(val)
    snaps = []
    for a in accs:
        s = {"account": a["account"], "kind": K.kind_of(a["account"]), "logged_in": True,
             "plan": a.get("plan", "default"), "note": a.get("note", ""),
             "session_used": 100 - float(a.get("session_left", 100)),
             "week_used": 100 - float(a.get("week_left", 100)),
             "week_reset": K.iso(FIXED_NOW + dt.timedelta(hours=float(a.get("week_reset_h", 168)))),
             "session_reset": None}
        if a.get("session_reset_h") is not None:
            s["session_reset"] = K.iso(FIXED_NOW + dt.timedelta(hours=float(a["session_reset_h"])))
        snaps.append(s)
    return doc, K.score_accounts(snaps)


def make_cfg(a):
    cfg = copy.deepcopy(K.CFG)
    cfg["max_agents"] = a.max_agents
    for kv in filter(None, (a.weights or "").replace(" ", "").split(",")):
        k, _, v = kv.partition("=")
        if k not in NAMES:
            sys.exit(f"ERROR --weights: ไม่รู้จัก {k!r} (ใช้ได้: {', '.join(NAMES)})")
        cfg["weights"][k] = float(v)
    return cfg


# ---------------------------------------------------------------- จำลอง + จดทุกขั้น
def room(s, cfg):
    """ส่วนประกอบของ capacity ไว้แสดงผล (ค่าจริงใช้ K.capacity)"""
    sig = cfg["safety"]
    m_s = K.margin(s, cfg, "session", s["used"] + 1)
    m_w = K.margin(s, cfg, "week", s["used"] + 1)
    room_s = max(0.0, s["h_s"] - m_s) / (sig * s["rs"])
    fresh = False
    if s.get("sreset_h") is not None:           # ถัง 5 ชม. จะรีเซ็ตก่อนใช้หมด → ได้ถังใหม่มาต่อ
        before = cfg["speed_mtok_h"].get(s["kind"], 6.0) * s["sreset_h"]
        if room_s >= before:
            room_s, fresh = before + (100 - m_s) / (sig * s["rs"]), True
    return {"m_s": m_s, "m_w": m_w, "room_s": room_s, "fresh": fresh,
            "room_w": max(0.0, s["h_w"] - m_w) / (sig * s["rw"]), "cap": K.capacity(s, cfg)}


def pick_traced(b, cost, crit, states, cfg):
    """เหมือน K.pick_roles ทุกประการ แต่จดตารางผู้สมัครของทุกบทบาท"""
    saved = copy.deepcopy(states)
    picks, used, roles = [], [], []
    for role, kind, need, rule in K.roles_of(b, cost, cfg):
        if rule == "other_cli":
            kind = "cyolo" if K.kind_of(picks[0]["account"]) == "yolo" else "yolo"
        cands = K.choose_account(need, crit, states, cfg, kind_only=kind, avoid=used)
        score = {c["account"]: c for c in cands}
        table = []
        for s in states:
            r = room(s, cfg)
            row = {"account": s["account"], "h_s": s["h_s"], "h_w": s["h_w"], "used": s["used"], "slots": s["slots"],
                   "hours_left": s["hours_left"], **r}
            if kind and s["kind"] != kind:
                row["out"] = "คนละฝั่ง"
            elif s["account"] in used:
                row["out"] = "อยู่ในบล็อกนี้แล้ว"
            elif s["used"] >= s["slots"]:
                row["out"] = "slot เต็ม"
            elif need > r["cap"]:
                row["out"] = f"c {g(need)} > C {g(r['cap'], 2)}"
            else:
                c = score[s["account"]]
                row.update(parts=c["parts"], score=c["score"], qs=c["qs"], qw=c["qw"])
            table.append(row)
        rec = {"role": role, "kind": kind, "need": need, "table": table, "winner": None}
        roles.append(rec)
        if not cands:
            states[:] = saved
            return None, roles
        c = cands[0]
        before = next(copy.deepcopy(s) for s in states if s["account"] == c["account"])
        K.reserve_on(states, c["account"], c["qs"], c["qw"])
        after = next(s for s in states if s["account"] == c["account"])
        rec.update(winner=c["account"], reserve={"h_s": [before["h_s"], after["h_s"]], "h_w": [before["h_w"], after["h_w"]],
                                                 "used": [before["used"], after["used"]], "slots": after["slots"]})
        used.append(c["account"])
        picks.append({"role": role, "account": c["account"], "score": c["score"], "need": round(need, 3),
                      "why": K.why_text(c, need, cands), "alts": [f"{x['account']} {x['score']}" for x in cands[1:3]]})
    return picks, roles


def trace(blocks, snaps, cost, rank, cfg, calib=None):
    """ลูปเดียวกับ K.simulate() + จดรายละเอียดทุกรอบ → (assign, rounds)"""
    calib = calib or {}
    by = {b["id"]: b for b in blocks}
    states = [K.make_state(q, cfg) for q in snaps if q.get("logged_in") and q.get("headroom") is not None]
    crit = K.norm_ranks(rank)
    t, done, running, out, rounds = 0.0, set(), [], {}, []
    while len(done) + sum(1 for v in out.values() if v["status"] == "unassigned") < len(blocks):
        ready = [b for b in blocks if b["id"] not in out and all(d in done for d in b.get("depends_on", []))]
        if any(by[r["id"]].get("exclusive") for r in running):
            ready = []
        if any(b.get("exclusive") for b in ready):
            ex = [b for b in ready if b.get("exclusive")]
            ready = ex[:1] if not running else [b for b in ready if not b.get("exclusive")]
        opts = {b["id"]: K.options(b, cost[b["id"]], crit[b["id"]], states, cfg) for b in ready}
        order = sorted(ready, key=lambda b: (min(opts[b["id"]], 3) or 9, -rank[b["id"]], -cost[b["id"]], b["id"]))
        free = cfg["max_agents"] - sum(len(r["accounts"]) for r in running)
        rnd = {"t_min": round(t * 60, 1), "running": [r["id"] for r in running], "free": free,
               "states": copy.deepcopy(states),
               "order": [{"id": b["id"], "skill": b["skill"], "options": opts[b["id"]], "rank": rank[b["id"]],
                          "crit": crit[b["id"]], "cost": cost[b["id"]]} for b in order],
               "blocks": [], "start": []}
        for b in order:
            nroles = len(K.roles_of(b, cost[b["id"]], cfg))
            if nroles > free:
                rnd["blocks"].append({"id": b["id"], "skip": f"ต้องใช้ {nroles} agent แต่เหลือที่ {free}"})
                continue
            picks, roles = pick_traced(b, cost[b["id"]], crit[b["id"]], states, cfg)
            if not picks:
                rnd["blocks"].append({"id": b["id"], "skip": "มีบทบาทที่ไม่มีบัญชีรับได้ → รอรอบถัดไป", "roles": roles})
                continue
            k = calib.get(b["skill"], calib.get("*", 1.0))
            base, dur = K.duration_h(b, picks, cost[b["id"]], cfg, k)
            rec = {"id": b["id"], "skill": b["skill"], "accounts": picks, "account": picks[0]["account"],
                   "start": t, "end": t + dur, "dur_base_h": round(base, 4), "k": k, "status": "planned",
                   "score": picks[0]["score"]}
            out[b["id"]] = rec
            running.append(rec)
            rnd["start"].append(b["id"])
            rnd["blocks"].append({"id": b["id"], "roles": roles, "start": t * 60, "end": (t + dur) * 60})
            free -= nroles
            if b.get("exclusive"):
                break
        if rnd["start"]:
            rounds.append(rnd)
        if not running:
            for b in ready:
                out[b["id"]] = {"id": b["id"], "skill": b["skill"], "accounts": [], "account": None,
                                "status": "unassigned", "why": "ไม่มีบัญชีชุดไหนปิดบล็อกนี้ได้"}
            if not ready:
                break
            continue
        nxt = min(r["end"] for r in running)
        t = nxt
        for r in [r for r in running if r["end"] <= nxt + 1e-9]:
            running.remove(r)
            done.add(r["id"])
            for p in r["accounts"]:
                K.release(states, p["account"])
    return out, rounds


def run(a):
    doc, blocks, cost, rank, succ, calc, crit = load_blocks(a.blocks)
    sdoc, snaps = load_scenario(a.scenario, a.set)
    cfg = make_cfg(a)
    assign, rounds = trace(blocks, snaps, cost, rank, cfg)
    ref, ref_rounds, _ = K.simulate(blocks, copy.deepcopy(snaps), cost, rank, cfg)   # ตัวจริงของ base skill
    same = set(assign) == set(ref) and all(
        [p["account"] for p in assign[i].get("accounts", [])] == [p["account"] for p in ref[i].get("accounts", [])]
        and abs(assign[i].get("start", 0) - ref[i].get("start", 0)) < 1e-9 for i in ref)
    if not same:
        sys.exit("ERROR ผลของ kclab.py ไม่ตรงกับ kcquest.simulate() ของ base skill — base skill เปลี่ยนรุ่น ต้องปรับ kclab.py")
    for b in blocks:
        assign.setdefault(b["id"], {"id": b["id"], "skill": b["skill"], "accounts": [], "account": None,
                                    "status": "blocked", "why": "รอบล็อกที่ไม่มีบัญชีรับ"})
    return {"doc": doc, "blocks": blocks, "cost": cost, "rank": rank, "succ": succ, "calc": calc, "crit": crit,
            "snaps": snaps, "cfg": cfg, "assign": assign, "rounds": rounds, "scenario": sdoc}


def span_min(assign):
    return max([r["end"] for r in assign.values() if r.get("status") == "planned"] + [0]) * 60


def lower_bound(x):
    """ขอบล่างของเวลา (นาที) = max(สายวิกฤต ÷ ความเร็วสูงสุด, งานรวม ÷ (N × ความเร็วสูงสุด))"""
    v = max(x["cfg"]["speed_mtok_h"].values())
    path = x["rank"][x["crit"][0]] / v * 60
    work = sum(x["cost"].values()) / (x["cfg"]["max_agents"] * v) * 60
    return path, work


# ---------------------------------------------------------------- แสดงผล
def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


def accounts_table(snaps, cfg):
    rows = []
    for q in snaps:
        rows.append([q["account"], g(q["headroom_session"]) + "%", g(q["headroom_week"]) + "%", g(q["hours_left"], 1),
                     q["use_first"], q["slots"], q.get("note", "")])
    return table(["บัญชี", "ถัง 5 ชม. เหลือ", "ถังสัปดาห์เหลือ", "รีเซ็ตใน (ชม.)", "U", "slot", "ลักษณะ"], rows)


def cmd_doctor(a):
    print(f"python      {sys.version.split()[0]}  {'✅' if sys.version_info >= (3, 8) else '❌ ต้อง 3.8+'}")
    print(f"base skill  {SKILL}  ✅")
    for n in ("agent-team", "yolo", "cyolo", "dag-planner"):
        ok = os.path.isfile(os.path.join(os.path.dirname(os.path.dirname(SKILL)), n, "SKILL.md"))
        print(f"  {n:<12} {'✅' if ok else '❌ ไม่พบ'}")
    chrome = R.find_chrome()
    print(f"ตัวแปลงภาพ  {chrome or 'ไม่พบ Chromium → ภาพจะเป็น .svg (เปิดในเบราว์เซอร์ได้)'}  {'✅' if chrome else '⚠'}")
    return 0


def cmd_rank(a):
    doc, blocks, cost, rank, succ, calc, crit = load_blocks(a.blocks)
    print(f"# ① rank · {doc.get('name', '')} · {len(blocks)} บล็อก\n")
    print("rank(j) = c_j + max rank ของบล็อกที่รอ j  (คิดย้อนจากบล็อกสุดท้าย)\n")
    mx = max(rank.values())
    rows = [[b["id"], b["title"], g(cost[b["id"]]), ", ".join(succ[b["id"]]) or "–", calc[b["id"]],
             f"**{g(rank[b['id']])}**", g(rank[b["id"]] / mx)] for b in sorted(blocks, key=lambda b: rank[b["id"]])]
    print(table(["บล็อก", "ชื่อ", "ขนาด c", "ใครรออยู่", "คำนวณ", "rank", "κ = rank ÷ rank สูงสุด"], rows))
    print(f"\nสายวิกฤต: {' → '.join(crit)} · ยาว {g(rank[crit[0]])}")
    total = sum(cost.values())
    print(f"งานรวม Σc = {g(total)} · ถ้ามี N บัญชีและทุกบัญชีเร็ว v: เวลารวม ≥ max({g(rank[crit[0]])} ÷ v, {g(total)} ÷ (N·v))")
    return 0


def cmd_rounds(a):
    x = run(a)
    cfg, assign = x["cfg"], x["assign"]
    w = cfg["weights"]
    print(f"# รอบแจกงาน · {x['doc'].get('name', '')} · {len(x['blocks'])} บล็อก · MAX_AGENTS {cfg['max_agents']}\n")
    print("น้ำหนัก: " + " · ".join(f"{NAMES[k]} {g(w[k])}" for k in NAMES) + "\n")
    print(accounts_table(x["snaps"], cfg) + "\n")
    rows = []
    for n, r in enumerate(x["rounds"], 1):
        got = " · ".join(f"{i}→{'+'.join(p['account'] for p in assign[i]['accounts'])}" for i in r["start"])
        rows.append([n, g(r["t_min"], 1), ", ".join(o["id"] for o in r["order"]), got])
    print(table(["รอบ", "นาทีที่", "บล็อกที่พร้อม (เรียงตาม ①)", "ได้งาน"], rows) + "\n")
    per = {}
    for i, rec in assign.items():
        for p in rec.get("accounts", []):
            d = per.setdefault(p["account"], {"n": 0, "mtok": 0.0})
            d["n"] += 1
            d["mtok"] += p["need"]
    print(table(["บัญชี", "บทบาทที่ได้", "โทเคนที่จอง (M)"],
                [[q["account"], per.get(q["account"], {}).get("n", 0), g(per.get(q["account"], {}).get("mtok", 0), 2)]
                 for q in x["snaps"]]) + "\n")
    bad = [i for i, r in assign.items() if r.get("status") != "planned"]
    path, work = lower_bound(x)
    print(f"สายวิกฤต: {' → '.join(x['crit'])} · ยาว {g(x['rank'][x['crit'][0]])}M tok")
    print(f"เวลารวม ≈ {span_min(assign):.1f} นาที · ขอบล่าง = max(สายวิกฤต {path:.1f}, งานรวม ÷ agent {work:.1f}) = {max(path, work):.1f} นาที")
    if bad:
        print(f"⚠ บล็อกที่ไม่มีบัญชีรับ: {', '.join(sorted(bad))}")
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "trace.json"), "w", encoding="utf-8") as f:
        json.dump({"accounts": x["snaps"], "rank": x["rank"], "critical_path": x["crit"], "assign": assign,
                   "rounds": x["rounds"], "span_min": span_min(assign), "weights": w}, f, ensure_ascii=False, indent=1)
    print(f"\nบันทึก {os.path.join(a.out, 'trace.json')}")
    if a.png:
        draw_plan(x, a.out)
    return 0


def draw_plan(x, out):
    """DAG + Gantt ด้วยตัววาดของ base skill (หน้าตาเดียวกับผลของ dagplan.py plan)"""
    blocks, assign, cfg = x["blocks"], x["assign"], x["cfg"]
    accs = [q["account"] for q in x["snaps"]]
    colors = {acc: R.ACC_PALETTE[k % len(R.ACC_PALETTE)] for k, acc in enumerate(accs)}
    name = x["doc"].get("name", "plan")
    bars = [{"block": r["id"], "account": p["account"], "start": r["start"] * 60, "end": r["end"] * 60,
             "role": p["role"], "skill": r["skill"]}
            for r in assign.values() if r.get("status") == "planned" for p in r["accounts"]]
    for fn, svg in (("dag.svg", R.render_dag(blocks, x["cost"], x["rank"], x["crit"],
                                             f"DAG + บัญชีที่ได้งาน · {name} · MAX_AGENTS={cfg['max_agents']}", assign, colors)),
                    ("gantt-plan.svg", R.render_gantt(bars, accs, x["crit"], f"Gantt แผน · {name}",
                                                      "แถว = บัญชี · แท่ง = บล็อก (สีตามสกิล) · เวลา = โทเคนประเมิน ÷ ความเร็ว CLI"
                                                      f" · KC-QUEST · MAX_AGENTS={cfg['max_agents']}",
                                                      {b["id"]: b["skill"] for b in blocks}))):
        p = os.path.join(out, fn)
        with open(p, "w", encoding="utf-8") as f:
            f.write(svg)
        print("ภาพ:", R.to_png(p) or p)


def cmd_explain(a):
    x = run(a)
    cfg, rounds = x["cfg"], x["rounds"]
    if not 1 <= a.round <= len(rounds):
        sys.exit(f"ERROR มี {len(rounds)} รอบ (ดูด้วยคำสั่ง rounds)")
    r = rounds[a.round - 1]
    w, sig = cfg["weights"], cfg["safety"]
    by = {b["id"]: b for b in x["blocks"]}
    print(f"# รอบที่ {a.round} · นาทีที่ {g(r['t_min'], 1)} · กำลังรันอยู่: {', '.join(r['running']) or '–'} · ที่ว่างของทีม {r['free']} agent\n")
    print("## สถานะบัญชีตอนเริ่มรอบ\n")
    print(table(["บัญชี", "H⁵ (5 ชม.)", "Hʷ (สัปดาห์)", "รีเซ็ตใน T (ชม.)", "งานที่ทำอยู่ / slot"],
                [[s["account"], g(s["h_s"], 2), g(s["h_w"], 2), g(s["hours_left"], 1), f"{s['used']}/{s['slots']}"]
                 for s in r["states"]]) + "\n")
    print("## ① จัดลำดับ: ทางเลือกน้อยก่อน (MRV) → rank มากก่อน → ขนาดใหญ่ก่อน\n")
    print(table(["ลำดับ", "บล็อก", "สกิล", "ขนาด c", "rank", "κ", "บัญชีที่รับได้ |A|"],
                [[n, o["id"], o["skill"], g(o["cost"]), g(o["rank"]), g(o["crit"]), o["options"]]
                 for n, o in enumerate(r["order"], 1)]) + "\n")
    for blk in r["blocks"]:
        b = by[blk["id"]]
        print(f"## {b['id']} · {b['title']} · สกิล {b['skill']} · c = {g(x['cost'][b['id']])}M\n")
        if blk.get("skip"):
            print(f"ข้าม: {blk['skip']}\n")
        for ro in blk.get("roles", []):
            side = {"yolo": "ต้องเป็น Claude", "cyolo": "ต้องเป็น Codex", None: "ฝั่งไหนก็ได้"}[ro["kind"]]
            print(f"### บทบาท {ROLE_TH[ro['role']]} · ต้องใช้ {g(ro['need'])}M · {side}\n")
            rows = []
            for t in ro["table"]:
                cap = (f"min({g(t['room_s'], 2)}{' ↻' if t.get('fresh') else ''}, {g(t['room_w'], 2)})"
                       f" = {g(t['cap'], 2)}")
                if t.get("out"):
                    rows.append([t["account"], g(t["h_s"], 2), g(t["h_w"], 2), f"{t['used']}/{t['slots']}", cap,
                                 "❌ " + t["out"], "", "", "", "", "", ""])
                else:
                    p = t["parts"]
                    star = " ★" if t["account"] == ro["winner"] else ""
                    rows.append([t["account"], g(t["h_s"], 2), g(t["h_w"], 2), f"{t['used']}/{t['slots']}", cap, "✅",
                                 p.get("urgency", "–"), p.get("fit", "–"), p.get("session", "–"), p.get("speed", "–"),
                                 p.get("load", "–"), f"**{t['score']}**{star}"])
            print(table(["บัญชี", "H⁵", "Hʷ", "used/slot", "② C = min(5 ชม., สัปดาห์)", "ผ่านกรอง", "U", "F", "R", "V", "L", "③ S"],
                        rows) + "\n")
            if ro["winner"]:
                rv = ro["reserve"]
                win = next(t for t in ro["table"] if t["account"] == ro["winner"])
                p = win["parts"]
                terms = " + ".join(f"{g(w[k])}×{p[k]}" for k in NAMES if w.get(k) and k in p).replace("+ -", "− ")
                print(f"S({ro['winner']}) = 100 × ({terms}) = {win['score']}")
                print(f"④ จอง {ro['winner']}: H⁵ {g(rv['h_s'][0], 2)} → {g(rv['h_s'][1], 2)} (−{g(win['qs'], 2)})"
                      f" · Hʷ {g(rv['h_w'][0], 2)} → {g(rv['h_w'][1], 2)} (−{g(win['qw'], 2)})"
                      f" · used {rv['used'][0]} → {rv['used'][1]} จาก {rv['slots']}\n")
            else:
                print("ไม่มีบัญชีผ่านกรอง → คืนการจองของบล็อกนี้ทั้งหมด\n")
        if "start" in blk:
            print(f"เวลาในแผน: นาทีที่ {blk['start']:.1f}–{blk['end']:.1f}\n")
    if a.png:
        os.makedirs(a.out, exist_ok=True)
        p = os.path.join(a.out, f"round-{a.round}.svg")
        with open(p, "w", encoding="utf-8") as f:
            f.write(scores_svg(x, a.round))
        print("ภาพ:", R.to_png(p) or p)
    return 0


def scores_svg(x, n):
    """แท่งคะแนนแยกตามตัวแปร ของทุกบทบาทในรอบที่ n (ความยาวแต่ละสี = น้ำหนัก × ค่าตัวแปร × 100)"""
    r, w = x["rounds"][n - 1], x["cfg"]["weights"]
    by = {b["id"]: b for b in x["blocks"]}
    W, x0, px = 1500, 330, 17.0            # px = พิกเซลต่อ 1 คะแนน
    rows = []
    for blk in r["blocks"]:
        for ro in blk.get("roles", []):
            ok = sorted([t for t in ro["table"] if not t.get("out")], key=lambda t: -t["score"])
            cut = [t for t in ro["table"] if t.get("out") and t["out"] not in ("คนละฝั่ง", "อยู่ในบล็อกนี้แล้ว")]
            if ok:
                rows.append(("head", f"{blk['id']} {by[blk['id']]['title']} · {ROLE_TH[ro['role']]} ({g(ro['need'])}M)"))
                rows += [("bar", t, t["account"] == ro["winner"]) for t in ok]
                rows += [("cut", t) for t in cut]
    H = 150 + sum(44 if k[0] == "head" else 34 for k in rows) + 50
    S = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{R.FONT}">',
         f'<rect width="{W}" height="{H}" fill="#fff"/><rect width="{W}" height="64" fill="#0f766e"/>',
         f'<text x="28" y="42" font-size="28" font-weight="700" fill="#fff">KC-QUEST รอบที่ {n} · นาทีที่ {g(r["t_min"], 1)}'
         f' · คะแนนแยกตามตัวแปร</text>']
    lx = 28
    for k in NAMES:
        lab = f"{NAMES[k]} × {g(w[k])}"
        S.append(f'<rect x="{lx}" y="84" width="20" height="20" rx="4" fill="{COLORS[k]}"/>'
                 f'<text x="{lx + 28}" y="101" font-size="19" fill="#333">{lab}</text>')
        lx += 150
    y = 132
    for k in rows:
        if k[0] == "head":
            S.append(f'<text x="28" y="{y + 26}" font-size="21" font-weight="700" fill="#0f766e">{R.esc(k[1])}</text>')
            y += 44
            continue
        t = k[1]
        S.append(f'<text x="{x0 - 190}" y="{y + 20}" font-size="19" fill="#333">{t["account"]}</text>')
        if k[0] == "cut":
            S.append(f'<text x="{x0}" y="{y + 20}" font-size="18" fill="#c92a2a">✗ ตัดทิ้งตอนกรอง: {R.esc(t["out"])}</text>')
            y += 34
            continue
        neg = sum(-w[f] * t["parts"][f] * 100 for f in NAMES if w.get(f, 0) < 0 and f in t["parts"])
        cx = x0
        if neg > 0:
            S.append(f'<rect x="{x0 - neg * px:.1f}" y="{y + 3}" width="{neg * px:.1f}" height="22" fill="{COLORS["load"]}" opacity=".75"/>')
        for f in NAMES:
            if w.get(f, 0) > 0 and f in t["parts"]:
                ln = w[f] * t["parts"][f] * 100 * px
                S.append(f'<rect x="{cx:.1f}" y="{y + 3}" width="{ln:.1f}" height="22" fill="{COLORS[f]}"/>')
                cx += ln
        won = k[2]
        S.append(f'<text x="{cx + 10:.1f}" y="{y + 21}" font-size="19" font-weight="{700 if won else 400}" '
                 f'fill="{"#e8590c" if won else "#555"}">{t["score"]}{" ★ ได้งาน" if won else ""}</text>')
        y += 34
    S.append(f'<line x1="{x0}" y1="124" x2="{x0}" y2="{y}" stroke="#999" stroke-dasharray="4 4"/>')
    S.append(f'<text x="28" y="{y + 30}" font-size="17" fill="#666">ความยาวแต่ละสี = น้ำหนัก × ค่าตัวแปร × 100 · '
             f'แท่งแดงทางซ้ายของเส้นประ = ค่าปรับ L (ถูกหักออก) · ตัวเลขท้ายแท่ง = คะแนนรวม S</text></svg>')
    return "\n".join(S)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd")
    sub.add_parser("doctor")
    for c in ("rank", "rounds", "explain"):
        p = sub.add_parser(c)
        p.add_argument("--blocks", default=os.path.join(ROOT, "examples", "meow-shop", "blocks.json"))
        if c == "rank":
            continue
        p.add_argument("--scenario", default=os.path.join(ROOT, "examples", "quota_lesson.json"))
        p.add_argument("--max-agents", type=int, default=6)
        p.add_argument("--weights")
        p.add_argument("--set")
        p.add_argument("--out", default=os.path.join(ROOT, "out", "lesson"))
        p.add_argument("--png", action="store_true")
        if c == "explain":
            p.add_argument("--round", type=int, required=True)
    a = ap.parse_args()
    if not a.cmd:
        ap.print_help()
        return 1
    return {"doctor": cmd_doctor, "rank": cmd_rank, "rounds": cmd_rounds, "explain": cmd_explain}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
