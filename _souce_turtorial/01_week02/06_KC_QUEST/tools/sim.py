#!/usr/bin/env python3
"""sim.py — จำลองการแจกงานให้หลายบัญชี เทียบ KC-QUEST กับวิธีแจกงานพื้นฐาน 3 วิธี

KC-QUEST ที่ใช้คือโค้ดของ base skill (`base_skills/dag-planner/scripts/kcquest.py`: capacity · choose_account · reserve_on)
รัน: python tools/sim.py [--seeds 200] [--only B]        ผล: tools/sim_result.json · tools/sim_result.md

แบบจำลอง (เวลาเดินทีละ 1 นาที)
- โปรเจกต์: 16 งาน รูปแบบโปรเจกต์เว็บ (โครง → งานขนาน 12 งาน → รวม 2 งาน → ทดสอบ) ขนาด S/M/L
- ของจริงไม่ตรงกับที่ประเมิน: โทเคนจริง = ค่าประเมิน × lognormal(σ = 0.35) และอัตรากินโควตาจริงต่างจากที่ผู้แจกงานเชื่อ ±30%
- บัญชี: ถัง 5 ชม. (รีเซ็ตหลังเริ่มใช้ 5 ชม.) + ถังสัปดาห์ (รีเซ็ตตามเวลาที่กำหนด ส่วนที่เหลือหายไป)
- งานที่ชนเพดานกลางทาง: หยุด รอ 5 นาที งานที่ทำไปแล้วหาย 15% แล้วเข้าคิวใหม่ (ทุกวิธีโดนเหมือนกัน)
วิธีที่เทียบ
- KC-QUEST      ① เรียง MRV → rank ② กรองด้วย capacity ③ คะแนน U/F/R/V/L ④ จองทันที
- most-headroom ให้บัญชีที่โควตาเหลือมากที่สุด
- round-robin   วนให้ทีละบัญชี
- random        สุ่ม
ตัวชี้วัด: เวลาจบโปรเจกต์ · จำนวนครั้งที่ชนเพดานกลางงาน · ส่วนของโควตาที่ใช้ซึ่งมาจากบัญชีใกล้รีเซ็ต (≤ 48 ชม.)
"""
import argparse
import copy
import datetime as dt
import json
import math
import os
import random
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import kclab  # noqa: E402  (หา base skill + ตรึงเวลา "ตอนนี้")

K = kclab.K
CFG = copy.deepcopy(K.CFG)
SIZE = CFG["size_mtok"]
SPEED = {k: v / 60 for k, v in CFG["speed_mtok_h"].items()}      # M tok ต่อนาที: yolo 0.12 · cyolo 0.08
POLICIES = ["KC-QUEST", "most-headroom", "round-robin", "random"]

SCEN = {
    # ชื่อ: [(บัญชี, ใช้ไป 5 ชม. %, ใช้ไปสัปดาห์ %, ชม. ก่อนสัปดาห์รีเซ็ต, อายุของรอบ 5 ชม. ที่เปิดอยู่ (ชม.))]
    "A โควตาเหลือเยอะทุกบัญชี": [("yolo1", 0, 1, 150), ("yolo2", 0, 4, 86), ("yolo3", 6, 3, 110), ("cyolo1", 0, 0, 160)],
    "B มีบัญชีใกล้รีเซ็ต": [("yolo1", 0, 70, 3), ("yolo2", 0, 20, 150), ("yolo3", 0, 30, 120), ("cyolo1", 0, 10, 160)],
    "C โควตาตึงทุกบัญชี": [("yolo1", 0, 97, 40), ("yolo2", 75, 60, 100), ("yolo3", 0, 94, 20), ("cyolo1", 0, 90, 150)],
    "D ถัง 5 ชม. ใกล้เต็ม": [("yolo1", 80, 20, 60), ("yolo2", 70, 30, 90), ("yolo3", 10, 40, 130), ("cyolo1", 0, 20, 160)],
    "E โปรเจกต์ใหญ่ 3 เท่า": [("yolo1", 0, 1, 150), ("yolo2", 0, 4, 86), ("yolo3", 6, 3, 110), ("cyolo1", 0, 0, 160)],
    "F ถัง 5 ชม. เกือบเต็มแต่ใกล้รีเซ็ต": [("yolo1", 88, 10, 150, 4.6), ("yolo2", 90, 10, 90, 4.7),
                                        ("yolo3", 86, 10, 120, 4.5), ("cyolo1", 92, 10, 160, 4.8)],
}
SCALE = {"E โปรเจกต์ใหญ่ 3 เท่า": 3.0}
RATE = (CFG["prior_rate"]["session"]["default"], CFG["prior_rate"]["week"]["default"])    # สิ่งที่ผู้แจกงานเชื่อ


def project_dag(rng, scale=1.0):
    T = [{"id": "T01", "size": "M", "depends_on": []}]
    for i in range(2, 14):
        dep = ["T01"] if i < 10 else ["T01", f"T{i - 7:02d}"]
        T.append({"id": f"T{i:02d}", "size": rng.choice("SMML"), "depends_on": dep})
    T.append({"id": "T14", "size": "M", "depends_on": [f"T{i:02d}" for i in range(2, 9)]})
    T.append({"id": "T15", "size": "M", "depends_on": [f"T{i:02d}" for i in range(9, 14)]})
    T.append({"id": "T16", "size": "L", "depends_on": ["T14", "T15"]})
    for t in T:
        t["est"] = SIZE[t["size"]] * scale
        t["true"] = t["est"] * math.exp(rng.gauss(0, 0.35))
    return T


class Acc:
    def __init__(self, name, su, wu, hours, rng, sess_age_h=0.0):
        self.name, self.kind = name, K.kind_of(name)
        self.su, self.wu, self.exp, self.hours0 = float(su), float(wu), hours * 60, hours
        self.rs, self.rw = RATE[0] * rng.uniform(0.7, 1.3), RATE[1] * rng.uniform(0.7, 1.3)    # อัตราจริง
        self.sess_start = -int(sess_age_h * 60) if su > 0 else None
        self.used_week, self.expired = 0.0, False

    def tick(self, t):
        if self.sess_start is not None and t - self.sess_start >= 300:
            self.su, self.sess_start = 0.0, None
        if not self.expired and t >= self.exp:
            self.wu, self.expired, self.exp = 0.0, True, t + 7 * 24 * 60

    def use(self, t, mtok):
        if self.sess_start is None:
            self.sess_start = t
        self.su += mtok * self.rs
        self.wu += mtok * self.rw
        if not self.expired:
            self.used_week += mtok * self.rw


def states_of(accs, running, t_min):
    """สถานะที่ผู้แจกงานมองเห็น: โควตาที่เหลือ หักส่วนที่งานซึ่งกำลังรันยังต้องใช้ (ตามค่าประเมิน)"""
    snaps = []
    for a in accs:
        run_on = [t for t in running if t["acc"] is a]
        pend = sum(max(t["est"] - t["done"], 0.15 * t["est"]) for t in run_on)
        sr = None if a.sess_start is None else max(0.0, (300 - (t_min - a.sess_start)) / 60)
        snaps.append({"account": a.name, "kind": a.kind, "logged_in": True, "plan": "default",
                      "session_used": min(100.0, a.su + pend * RATE[0]), "week_used": min(100.0, a.wu + pend * RATE[1]),
                      "week_reset": K.iso(K.now() + dt.timedelta(minutes=max(60, a.exp - t_min))),
                      "session_reset": None if sr is None else K.iso(K.now() + dt.timedelta(hours=sr)),
                      "_used": len(run_on)})
    out = []
    for q in K.score_accounts(snaps):
        s = K.make_state(q, CFG)
        s["used"] = q["_used"]
        out.append(s)
    return out


def run(policy, scen, seed):
    rng = random.Random(seed)
    tasks = project_dag(rng, SCALE.get(scen, 1.0))
    accs = [Acc(*a[:4], rng, *a[4:]) for a in SCEN[scen]]
    by = {t["id"]: t for t in tasks}
    for t in tasks:
        t.update(done=0.0, status="todo", acc=None, wait=0)
    cost = {t["id"]: t["est"] for t in tasks}
    rank, _, _ = K.ranks(tasks, cost)
    crit = K.norm_ranks(rank)
    t_min, rr, hits = 0, 0, 0
    while any(t["status"] != "done" for t in tasks) and t_min < 72 * 60:
        for a in accs:
            a.tick(t_min)
        ready = [t for t in tasks if t["status"] == "todo" and t["wait"] <= t_min
                 and all(by[d]["status"] == "done" for d in t["depends_on"])]
        running = [t for t in tasks if t["status"] == "run"]
        if ready and len(running) < CFG["max_agents"]:
            states = states_of(accs, running, t_min)
            need = {t["id"]: max(t["est"] - t["done"], 0.3 * t["est"]) for t in ready}
            if policy == "KC-QUEST":          # ① MRV → rank → ขนาด
                opt = {t["id"]: len(K.choose_account(need[t["id"]], crit[t["id"]], states, CFG)) for t in ready}
                ready.sort(key=lambda t: (min(opt[t["id"]], 3) or 9, -rank[t["id"]], -t["est"], t["id"]))
            else:
                ready.sort(key=lambda t: t["id"])
            n_run = len(running)
            for t in ready:
                if n_run >= CFG["max_agents"]:
                    break
                free = [s for s in states if s["used"] < s["slots"]]
                if not free:
                    break
                c = need[t["id"]]
                if policy == "KC-QUEST":      # ② กรอง ③ คะแนน ④ จอง
                    cands = K.choose_account(c, crit[t["id"]], states, CFG)
                    if not cands:
                        if running or n_run > len(running):
                            continue          # รอให้งานอื่นจบก่อน
                        s = max(free, key=lambda s: min(s["h_s"], s["h_w"]))     # ทั้งทีมว่างแต่ไม่มีใครผ่านกรอง → ห้ามค้าง
                        pick, qs, qw = s["account"], CFG["safety"] * s["rs"] * c, CFG["safety"] * s["rw"] * c
                    else:
                        pick, qs, qw = cands[0]["account"], cands[0]["qs"], cands[0]["qw"]
                else:
                    if policy == "most-headroom":
                        s = max(free, key=lambda s: min(s["h_s"], s["h_w"]))
                    elif policy == "round-robin":
                        s = free[rr % len(free)]
                        rr += 1
                    else:
                        s = rng.choice(free)
                    pick, qs, qw = s["account"], CFG["safety"] * s["rs"] * c, CFG["safety"] * s["rw"] * c
                K.reserve_on(states, pick, qs, qw)
                t["status"], t["acc"] = "run", next(a for a in accs if a.name == pick)
                n_run += 1
        for t in [t for t in tasks if t["status"] == "run"]:
            a = t["acc"]
            step = min(SPEED[a.kind], t["true"] - t["done"])
            if a.su + step * a.rs > 100 or a.wu + step * a.rw > 100:        # ชนเพดานกลางงาน
                hits += 1
                t["done"] = max(0.0, t["done"] - 0.15 * t["true"])
                t["status"], t["wait"], t["acc"] = "todo", t_min + 5, None
                continue
            a.use(t_min, step)
            t["done"] += step
            if t["done"] >= t["true"] - 1e-9:
                t["status"] = "done"
        t_min += 1
    tot = sum(a.used_week for a in accs) or 1e-9
    has_soon = any(a.hours0 <= 48 for a in accs)
    return {"minutes": t_min, "limit_hits": hits, "unfinished": sum(t["status"] != "done" for t in tasks),
            "expiring_share": 100 * sum(a.used_week for a in accs if a.hours0 <= 48) / tot if has_soon else None}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--seeds", type=int, default=200)
    ap.add_argument("--only", help="รันเฉพาะสถานการณ์ที่ชื่อขึ้นต้นด้วยตัวอักษรนี้ เช่น B")
    ap.add_argument("--out", default=os.path.join(HERE, "sim_result.json"))
    a = ap.parse_args()
    res = {}
    for scen in SCEN:
        if a.only and not scen.startswith(a.only):
            continue
        res[scen] = {}
        for pol in POLICIES:
            rs = [run(pol, scen, seed) for seed in range(a.seeds)]
            exp = [r["expiring_share"] for r in rs if r["expiring_share"] is not None]
            res[scen][pol] = {"minutes": round(sum(r["minutes"] for r in rs) / len(rs), 1),
                              "limit_hits": round(sum(r["limit_hits"] for r in rs) / len(rs), 2),
                              "unfinished_runs": sum(1 for r in rs if r["unfinished"]),
                              "expiring_share": round(sum(exp) / len(exp), 1) if exp else None}
        print(scen)
        for pol in POLICIES:
            r = res[scen][pol]
            print(f"  {pol:<14} {r['minutes']:>7} นาที · ชนเพดาน {r['limit_hits']:>5} ครั้ง"
                  + (f" · ใช้จากบัญชีใกล้รีเซ็ต {r['expiring_share']}%" if r["expiring_share"] is not None else "")
                  + (f" · ไม่จบ {r['unfinished_runs']} รอบ" if r["unfinished_runs"] else ""))
    if a.only:
        return 0
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"seeds": a.seeds, "result": res}, f, ensure_ascii=False, indent=1)
    L = [f"# ผลจำลอง KC-QUEST เทียบวิธีพื้นฐาน · {a.seeds} รอบต่อสถานการณ์", "",
         "ค่าเฉลี่ยต่อโปรเจกต์ · สร้างด้วย `python tools/sim.py` · KC-QUEST คือโค้ดของ `base_skills/dag-planner/scripts/kcquest.py`", ""]
    for scen, r in res.items():
        L += [f"## {scen}", "", "| วิธี | เวลาจบ (นาที) | ชนเพดานกลางงาน (ครั้ง) | ใช้จากบัญชีใกล้รีเซ็ต (% ของที่ใช้) | รอบที่ไม่จบ |",
              "|---|---|---|---|---|"]
        L += [f"| {p} | {r[p]['minutes']} | {r[p]['limit_hits']} | "
              f"{'–' if r[p]['expiring_share'] is None else r[p]['expiring_share']} | {r[p]['unfinished_runs']} |" for p in POLICIES]
        L.append("")
    with open(a.out[:-5] + ".md", "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print("บันทึก", a.out, "และ", a.out[:-5] + ".md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
