#!/usr/bin/env python3
"""planner.py — แตกโจทย์เป็น DAG แล้ว "วางแผน" ว่างานไหนให้บัญชีไหน (ไม่เปิด worker จริง · ไม่ใช้โทเคน)

ใช้อัลกอริทึม KC-QUEST จาก tools/orch.py (อยู่ในโฟลเดอร์นี้ · ตัวเดียวกับ LAB 04.2)
แล้วจำลองเวลาทำงานตามลำดับ dependency → ได้ตารางแจกงาน + ภาพ DAG + ภาพไทม์ไลน์

เริ่มใช้ครั้งแรก (รันจากโฟลเดอร์ 02_DAG_Planner):
  python tools/planner.py doctor                                   ตรวจเครื่อง: python · orch.py · ตัววาด png · container โควตาจริง
  python tools/planner.py dag  --plan catfood --png --mode teach    อ่าน out/catfood/tasks.json → out/catfood/dag.png + rank-example.png
  python tools/planner.py plan --plan catfood --png --max-agents 6 --accounts "yolo1 yolo2:30 cyolo1"
                                                                   → out/catfood/gantt.png · dag.png (มีป้ายบัญชี) · PLAN.md
  ไม่ใส่ --plan = ใช้แผนที่แก้ล่าสุดใน out/

โหมด (--mode · ใช้ได้กับ dag และ plan):
  real  (ค่าเริ่มต้น) ใช้งานจริง: ภาพ DAG กระชับ มีแค่ rank + สายวิกฤต (+ ป้ายบัญชี)
  teach โหมดสอน: เหนือทุกกล่องมีสูตรแทนค่าพร้อมชื่องาน เช่น 3 + max(T12 7.5, T09 4.5) = 10.5
        + ภาพ rank-example.png แสดงวิธีคิด rank ทีละขั้นของงาน 1 งาน (เลือกเองด้วย --example T08
          ไม่ใส่ = งานบนสายวิกฤตที่มีงานรอมากที่สุด) + พิมพ์ลำดับคิดย้อนจากงานสุดท้าย

คำสั่ง:
  doctor                                             ตรวจความพร้อมของเครื่อง (ไม่แก้อะไร) + บอกวิธีแก้
  quota --out DIR                                    สำรวจโควตาทุกบัญชีที่ล็อกอิน (ฟรี) → DIR/quota.json
  dag   --plan NAME | --tasks FILE --out DIR [--name N] [--png]    ตรวจกราฟ + คิด rank + สายวิกฤต → dag.svg (ยังไม่แจกงาน · ไม่ถามโควตา)
  plan  --plan NAME | --tasks FILE --out DIR [--max-agents 6]       วางแผน → PLAN.md · dag.svg · gantt.svg · plan.json
        [--quota-json FILE]                          ใช้โควตาจากไฟล์ (ไม่ถามบัญชีจริง · ไว้ทดลองนอก container)
        [--accounts yolo1,yolo2:6,cyolo1]            บัญชีที่ใช้ (":6" = เหลือ 6% ใน 5 ชม.) · นอก container หรือใส่ % = ใช้ค่านี้แทนโควตาจริง
        [--problem FILE] [--name NAME]               ไฟล์โจทย์ · ชื่อที่แสดงในหัวภาพ/รายงาน
        [--png]                                      แปลง svg เป็น png ด้วย Chromium (Playwright ของ Python หรือ node)
        [--mode real|teach] [--example ID]           โหมดใช้งานจริง / โหมดสอน (ดูด้านบน)

tasks.json (AI เขียนตามพรอมต์ใน readme.md · ผลลัพธ์ปกติอยู่ที่ out/<ชื่อแผน>/):
  {"tasks": [{"id": "T01", "title": "...", "size": "S|M|L", "depends_on": [], "area": "backend|frontend|chat|rag|ml|k8s|agent|voice|test|image|infra",
              "only": "yolo|cyolo" (ไม่บังคับ), "exclusive": true (ไม่บังคับ)}]}
"""
import argparse, datetime as dt, glob, html, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.dirname(HERE)
ORCH_DIRS = [HERE, os.environ.get("ORCH_DIR", "")]      # orch.py อยู่ข้างไฟล์นี้ (ORCH_DIR = ใช้ตัวอื่นแทน)
for p in ORCH_DIRS:
    if p and os.path.exists(os.path.join(p, "orch.py")):
        sys.path.insert(0, os.path.abspath(p)); break
else:
    sys.exit("ERROR ไม่พบ tools/orch.py (อัลกอริทึม KC-QUEST) — ต้องอยู่โฟลเดอร์เดียวกับ planner.py")
try:                         # Python บน Windows ที่ไม่มีฐานข้อมูล timezone (ไม่ได้ลง tzdata) → ใช้เวลาไทย +07:00 แทน
    import zoneinfo; zoneinfo.ZoneInfo("Asia/Bangkok")
except Exception:
    import zoneinfo
    zoneinfo.ZoneInfo = lambda name=None: dt.timezone(dt.timedelta(hours=7), "ICT")
    TZ_FALLBACK = True
import orch  # noqa: E402  (KC-QUEST: score_accounts · choose_account · plan_assignments · reserve_on · why_text)

PALETTE = ["#2b7bd6", "#2e9e5b", "#8e44ad", "#c0392b", "#d4a017", "#16a3a3", "#e67e22", "#5d6d7e", "#d35490", "#6b8e23"]
CRIT = "#dc5a1e"
AREA_ICON = {"image": "🖼", "infra": "☁", "test": "🧪", "chat": "💬", "rag": "📚", "ml": "🧠", "k8s": "☸", "agent": "🤖", "voice": "🎙"}

# ---------------------------------------------------------------- quota
def assumed(acc, left):
    """บัญชีที่ผู้ใช้บอกเองในพรอมต์ (ไม่ได้ถามโควตาจริง) · left = % ที่เหลือในหน้าต่าง 5 ชม. · รีเซ็ตสัปดาห์อีก 7 วัน"""
    return {"account": acc, "kind": orch.kind_of(acc), "logged_in": True, "plan": "default", "assumed": True,
            "session_used": 100 - left, "session_reset": orch.iso(orch.now() + dt.timedelta(hours=5)) if left < 100 else None,
            "week_used": 0, "week_reset": orch.iso(orch.now() + dt.timedelta(hours=168))}

CONTAINER = os.environ.get("MACCOUNT_CONTAINER", "multi-account-devtool")

def container_quota(only):
    """อยู่นอก container แต่ container multi-account-devtool รันอยู่ → copy สคริปต์เข้าไปถามโควตาจริง (ฟรี) แล้วอ่านผลกลับมา · ไม่ได้ = None"""
    dk = shutil.which("docker")
    if not dk: return None
    run_ = lambda *c, t=60: subprocess.run([dk, *c], capture_output=True, text=True, encoding="utf-8", timeout=t)
    try:
        if run_("inspect", "-f", "{{.State.Running}}", CONTAINER).stdout.strip() != "true": return None
        run_("exec", CONTAINER, "mkdir", "-p", "/tmp/dagq")
        for f in (os.path.abspath(__file__), os.path.abspath(orch.__file__)):
            run_("cp", f, f"{CONTAINER}:/tmp/dagq/")
        r = run_("exec", "-w", "/tmp/dagq", CONTAINER, "python3", "planner.py", "quota", "--out", "/tmp/dagq/out",
                 *(["--accounts", ",".join(only)] if only else []), t=300)
        if r.returncode: return None
        return json.loads(run_("exec", CONTAINER, "cat", "/tmp/dagq/out/quota.json").stdout).get("accounts")
    except Exception:
        return None

def load_snaps(run, quota_json, only, left=None):
    left = left or {}
    real = None if quota_json or os.path.isdir(orch.BASE) else container_quota(only)
    if real:                     # นอก container: ได้โควตาจริงจาก container multi-account-devtool · บัญชีที่ใส่ % เองใช้ค่าที่บอกมา
        snaps = [assumed(q["account"], left[q["account"]]) if q["account"] in left else q for q in real]
        print(f"โควตาจริงจาก container {CONTAINER}: " + ", ".join(f"{q['account']} {q.get('headroom')}%" for q in real if q.get("logged_in")))
    elif only and (left or not os.path.isdir(orch.BASE)):   # ไม่มี container หรือระบุ % เอง → ใช้ค่าที่บอกมา
        snaps = [assumed(a, left.get(a, 100)) for a in only]
    elif quota_json:
        snaps = (orch.jload(quota_json, {}) or {}).get("accounts", [])
        for q in snaps:          # ไฟล์ตัวอย่างใส่วันรีเซ็ตเป็น "+ชั่วโมง" ได้ → แปลงเป็นเวลาจริงจากตอนนี้
            for k in ("week_reset", "session_reset"):
                v = q.get(k)
                if isinstance(v, (int, float)): q[k] = orch.iso(orch.now() + dt.timedelta(hours=v))
    else:
        snaps = orch.quota_snapshot(run, only or None)
    for q in snaps:              # ข้อมูลโควตาเก่า (เวลารีเซ็ตผ่านไปแล้ว) → ถือว่ารีเซ็ตแล้ว ไม่งั้น U พุ่งเพราะดูเหมือนใกล้หมดอายุ
        for k, used, period in (("week_reset", "week_used", 168), ("session_reset", "session_used", 5)):
            t = orch.parse_iso(q.get(k)) if isinstance(q.get(k), str) else None
            if t and t <= orch.now():
                while t <= orch.now(): t += dt.timedelta(hours=period)
                q[k], q[used] = orch.iso(t), 0
                if used == "week_used": q.pop("week_model_used", None)
    snaps = orch.score_accounts(run, snaps)
    if only: snaps = [q for q in snaps if q["account"] in only]
    orch.jsave(run.f("quota.json"), {"at": orch.iso(orch.now()), "accounts": snaps})
    return snaps

# ---------------------------------------------------------------- DAG
def check_dag(tasks):
    ids = [t["id"] for t in tasks]; errs = []
    if len(ids) != len(set(ids)): errs.append("มี id ซ้ำ")
    for t in tasks:
        for d in t.get("depends_on", []):
            if d not in ids: errs.append(f"{t['id']}: ไม่พบ dependency {d}")
        if t.get("size") not in ("S", "M", "L") and not t.get("est_mtok"): errs.append(f"{t['id']}: size ต้องเป็น S/M/L")
    by = {t["id"]: t for t in tasks}; st = {}
    def dfs(i):
        st[i] = 1
        for d in by[i].get("depends_on", []):
            if d not in by: continue
            if st.get(d) == 1: errs.append(f"dependency วน: {i} → {d}")
            elif not st.get(d): dfs(d)
        st[i] = 2
    for i in ids:
        if not st.get(i): dfs(i)
    return errs

def raw_ranks(tasks, cost):
    """rank(j) = c_j + max_{k ∈ succ(j)} rank(k)  (ค่าดิบ หน่วย M tok — ใช้แสดงในภาพ) + สูตรที่แทนค่าแล้ว"""
    succ = {t["id"]: [] for t in tasks}; by = {t["id"]: t for t in tasks}
    for t in tasks:
        for d in t.get("depends_on", []): succ[d].append(t["id"])
    memo = {}
    def rank(i):
        if i not in memo: memo[i] = cost[i] + max([rank(k) for k in succ[i]] + [0])
        return memo[i]
    for t in tasks: rank(t["id"])
    calc = {}
    for t in tasks:
        i, ss = t["id"], succ[t["id"]]
        if not ss: calc[i] = f"= {cost[i]:g} (ไม่มีใครรอ)"
        elif len(ss) == 1: calc[i] = f"{cost[i]:g} + {ss[0]} {memo[ss[0]]:g} = {memo[i]:g}"
        else: calc[i] = f"{cost[i]:g} + max({', '.join(f'{k} {memo[k]:g}' for k in sorted(ss, key=lambda k: -memo[k]))}) = {memo[i]:g}"
    return {k: round(v, 3) for k, v in memo.items()}, succ, calc

def critical_path(tasks, rank, succ):
    roots = [t["id"] for t in tasks if not t.get("depends_on")]
    cur = max(roots, key=lambda i: rank[i]); path = [cur]
    while succ[cur]:
        cur = max(succ[cur], key=lambda k: rank[k]); path.append(cur)
    return path

# ---------------------------------------------------------------- simulate KC-QUEST over time
def simulate(run, tasks, snaps, cost):
    cfg = run.cfg; acfg = run.accounts_cfg()
    by = {t["id"]: t for t in tasks}
    orch_acc = orch.orchestrator_pick(snaps)
    states = []
    for q in snaps:
        if not q.get("logged_in") or q.get("disabled") or q.get("headroom") is None: continue
        a = q["account"]
        states.append(orch.make_state(a, q["kind"], orch.rate_for(run, a, q.get("plan"), "session"),
                                      orch.rate_for(run, a, q.get("plan"), "week"), q["headroom_session"], q["headroom_week"],
                                      q.get("hours_left") or 168, q.get("slots", 0), 0, a == orch_acc,
                                      float((acfg.get(a) or {}).get("bonus", 0)), q.get("cap_week", 100),
                                      orch.hours_until(q.get("session_reset"))))
    kind_of = {s["account"]: s["kind"] for s in states}
    norm = orch.critical_ranks(tasks, lambda t: cost[t["id"]])   # ① 0..1 ใช้ในตัวแปร speed ของ KC-QUEST
    t_now, done, running, out, rounds, peak = 0.0, set(), [], {}, [], 0
    while len(done) + sum(1 for v in out.values() if v.get("status") == "unassigned") < len(tasks):
        started_ids = set(out)
        ready = [t for t in tasks if t["id"] not in started_ids and all(d in done for d in t.get("depends_on", []))]
        if any(by[r["id"]].get("exclusive") for r in running): ready = []
        if any(t.get("exclusive") for t in ready):
            ex = [t for t in ready if t.get("exclusive")]
            ready = ex[:1] if not running else [t for t in ready if not t.get("exclusive")]
        items = [{"id": t["id"], "need": cost[t["id"]], "crit": norm.get(t["id"], 0), "only": t.get("only"),
                  "avoid": set(), "image": t.get("area") == "image"} for t in ready]
        n_w = sum(1 for r in running if not r["image"]); n_i = len(running) - n_w
        plan = orch.plan_assignments(items, states, cfg, cfg["max_agents"] - n_w, cfg["max_image_jobs"] - n_i) if items else []
        rnd = []
        for tid, c, mode, cands in plan:
            t = by[tid]; img = t.get("area") == "image"
            dur = max(cost[tid] / cfg["speed_mtok_h"].get(kind_of[c["account"]], 6.0), 0.05)
            rec = {"id": tid, "account": c["account"], "start": t_now, "end": t_now + dur, "image": img, "mode": mode,
                   "score": c["score"], "why": ("[ส่งต่อตามแผน] " if mode == "relay" else "") + orch.why_text(c, cost[tid], cands),
                   "alts": [f"{x['account']} {x['score']}" for x in cands[1:3]], "status": "planned"}
            out[tid] = rec; running.append(rec); rnd.append(tid)
            if t.get("exclusive"): break
        if rnd: rounds.append({"t_min": round(t_now * 60), "start": rnd})
        peak = max(peak, sum(1 for r in running if not r["image"]))
        if not running:          # ไม่มีใครรับงานที่เหลือได้เลย → ให้สมองแบ่งงานให้เล็กลง
            for t in ready: out[t["id"]] = {"id": t["id"], "status": "unassigned", "why": "ไม่มีบัญชีไหนปิดงานนี้ได้ (ควรแบ่งย่อย / เพิ่มบัญชี)"}
            if not ready: break
            continue
        nxt = min(r["end"] for r in running); t_now = nxt
        for r in [r for r in running if r["end"] <= nxt + 1e-9]:
            running.remove(r); done.add(r["id"])
            for s in states:
                if s["account"] == r["account"] and not r["image"]: s["used"] -= 1
    return out, rounds, peak, orch_acc, states

# ---------------------------------------------------------------- render: DAG
def esc(s): return html.escape(str(s), quote=True)

def short(s, n):
    return s if len(s) <= n else s[:n - 1] + "…"

def wrap_calc(s, n):
    """ตัดสูตร rank ยาว ๆ เป็นหลายบรรทัดตรง ', ' (ไม่ตัดกลางชื่องาน)"""
    if len(s) <= n: return [s]
    out, cur = [], ""
    for part in s.split(", "):
        nxt = part if not cur else cur + ", " + part
        if cur and len(nxt) > n: out.append(cur + ","); cur = part
        else: cur = nxt
    return out + [cur]

def layout(tasks):
    by = {t["id"]: t for t in tasks}; depth = {}
    def dep(i):
        if i not in depth: depth[i] = 1 + max([dep(d) for d in by[i].get("depends_on", [])] + [-1])
        return depth[i]
    for t in tasks: dep(t["id"])
    cols = {}
    for t in tasks: cols.setdefault(depth[t["id"]], []).append(t["id"])
    pos = {}
    for c in sorted(cols):     # เรียงในคอลัมน์ตามค่าเฉลี่ยตำแหน่งของงานที่รอ (barycenter) → เส้นตัดกันน้อย
        cols[c].sort(key=lambda i: (sum(pos[d] for d in by[i].get("depends_on", [])) / max(1, len(by[i].get("depends_on", []))) if c else 0))
        for k, i in enumerate(cols[c]): pos[i] = k
    return depth, cols

def render_dag(tasks, cost, rank, succ, calc, crit, plan, colors, title, teach=False):
    """teach = โหมดสอน: มีสูตร rank ด้านบน + สูตรแทนค่าเหนือทุกกล่อง · real = กระชับ มีแค่ rank"""
    depth, cols = layout(tasks)
    NW, NH, CW, RH, X0, Y0 = (270, 108, 340, 180, 40, 240) if teach else (270, 108, 330, 140, 40, 120)
    nrow = max(len(v) for v in cols.values())
    W = X0 * 2 + (len(cols) - 1) * CW + NW
    H = Y0 + nrow * RH + 130
    xy = {}
    for c, ids in cols.items():
        off = (nrow - len(ids)) * RH / 2
        for k, i in enumerate(ids): xy[i] = (X0 + c * CW, Y0 + off + k * RH)
    cset, cedges = set(crit), set(zip(crit, crit[1:]))
    S = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Sarabun, Tahoma, sans-serif">',
         '<defs><marker id="ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#9a9a9a"/></marker>'
         f'<marker id="ac" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="{CRIT}"/></marker></defs>',
         f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
         f'<rect width="{W}" height="76" fill="#2b7bd6"/>',
         f'<text x="{X0}" y="50" font-size="30" font-weight="700" fill="#fff">{esc(title)}</text>',
         ]
    if teach: S += [
         f'<text x="{W/2}" y="132" font-size="30" text-anchor="middle" fill="#222" font-family="Cambria Math, Times New Roman, serif">'
         'rank(j) = c<tspan font-size="19" dy="7">j</tspan><tspan dy="-7"> + max</tspan><tspan font-size="19" dy="8">k∈succ(j)</tspan><tspan dy="-8"> rank(k)</tspan></text>',
         f'<text x="{W/2}" y="170" font-size="19" text-anchor="middle" fill="#666">c = โทเคนที่ประเมิน (ล้าน) · succ(j) = งานที่รองาน j (ลูกศรที่ออกจาก j) · เหนือกล่อง = สูตรแทนค่า · เส้นสีส้ม = สายวิกฤต (ยาวสุด)' + (' · ป้ายสี = บัญชีที่ได้งาน' if plan else '') + '</text>']
    # เส้น (วาดก่อนกล่อง) — สายวิกฤตวาดทีหลังให้อยู่บน
    edges = [(d, t["id"]) for t in tasks for d in t.get("depends_on", [])]
    for a, b in sorted(edges, key=lambda e: e in cedges):
        (x1, y1), (x2, y2) = xy[a], xy[b]
        x1, y1, x2, y2 = x1 + NW, y1 + NH / 2, x2 - 2, y2 + NH / 2
        mx = (x1 + x2) / 2
        on = (a, b) in cedges
        S.append(f'<path d="M{x1},{y1} C{mx},{y1} {mx},{y2} {x2},{y2}" fill="none" stroke="{CRIT if on else "#c4c4c4"}" '
                 f'stroke-width="{4 if on else 1.6}" marker-end="url(#{"ac" if on else "ag"})"/>')
    for t in tasks:
        i = t["id"]; x, y = xy[i]; on = i in cset; p = plan.get(i, {})
        acc = p.get("account"); col = colors.get(acc, "#999")
        lines = wrap_calc(calc[i], 30) if teach else []     # สูตรยาว (รอหลายงาน) → ตัดเป็น 2 บรรทัด
        for n, ln in enumerate(lines):
            S.append(f'<text x="{x + NW/2}" y="{y - 10 - (len(lines) - 1 - n) * 21}" font-size="17" text-anchor="middle" '
                     f'fill="{CRIT if on else "#777"}" font-weight="{700 if on else 400}">{esc(ln)}</text>')
        S.append(f'<rect x="{x}" y="{y}" width="{NW}" height="{NH}" rx="9" fill="{"#fdf0ea" if on else "#fff"}" '
                 f'stroke="{CRIT if on else "#bdbdbd"}" stroke-width="{2.5 if on else 1.8}"/>')
        tag = ((" " + AREA_ICON[t.get("area")]) if t.get("area") in AREA_ICON else "") + (" 🔒" if t.get("exclusive") else "")
        S.append(f'<text x="{x + NW/2}" y="{y + 29}" font-size="22" text-anchor="middle" fill="#111">{esc(i)} · {esc(t.get("size","?"))} {cost[i]:g}{tag}</text>')
        S.append(f'<text x="{x + NW/2}" y="{y + 54}" font-size="16" text-anchor="middle" fill="#555">{esc(short(t.get("title",""), 27))}</text>')
        S.append(f'<text x="{x + 12}" y="{y + 92}" font-size="24" font-weight="700" fill="#2b7bd6">rank {rank[i]:g}</text>')
        if not plan: continue           # โหมด dag: ยังไม่แจกงาน → ไม่มีป้ายบัญชี
        lab = acc or "ไม่มีใครรับ"
        bw = 16 + 10 * len(lab)
        S.append(f'<rect x="{x + NW - bw - 10}" y="{y + 70}" width="{bw}" height="29" rx="14.5" fill="{col if acc else "#fff"}" '
                 f'stroke="{col if acc else "#c0392b"}" stroke-width="1.5"/>')
        S.append(f'<text x="{x + NW - bw/2 - 10}" y="{y + 91}" font-size="17" font-weight="700" text-anchor="middle" '
                 f'fill="{"#fff" if acc else "#c0392b"}">{esc(lab)}</text>')
    lx = X0
    for a, c in colors.items():
        S.append(f'<rect x="{lx}" y="{H-48}" width="22" height="22" rx="5" fill="{c}"/><text x="{lx+30}" y="{H-30}" font-size="19" fill="#333">{esc(a)}</text>')
        lx += 50 + 11 * len(a) + 20
    used = [k for k in AREA_ICON if any(t.get("area") == k for t in tasks)]
    if used: S.append(f'<text x="{X0}" y="{H-78}" font-size="18" fill="#666">{esc(" · ".join(AREA_ICON[k] + " " + k for k in used))} · 🔒 รันคนเดียว</text>')
    S.append(f'<text x="{W - X0}" y="{H-30}" font-size="20" text-anchor="end" fill="{CRIT}" font-weight="700">━ สายวิกฤต: {esc(" → ".join(crit))}</text>')
    S.append("</svg>")
    return "\n".join(S)

# ---------------------------------------------------------------- render: ตัวอย่างคิด rank (โหมดสอน)
def pick_example(tasks, succ, crit):
    """งานบนสายวิกฤตที่มีงานรอมากที่สุด (เห็น max ชัด) · ไม่มีเลย = งานแรกของสายวิกฤต"""
    return max(crit, key=lambda i: (len(succ[i]), -crit.index(i)))

def render_rank_example(tasks, cost, rank, succ, j, title):
    """ภาพเดียวจบ: งาน j อยู่กลาง · ซ้าย = งานที่ j ต้องรอ (ไม่ใช้คิด) · ขวา = งานที่รอ j (succ) · ล่าง = แทนค่าทีละขั้น
    สีจับคู่ระหว่างกราฟกับสูตร: เขียว = c_j ของตัวเอง · น้ำเงิน = rank ของ succ · ส้ม = ตัวที่มากที่สุด"""
    by = {t["id"]: t for t in tasks}
    GREEN, BLUE = "#2e9e5b", "#2b7bd6"
    pred = list(by[j].get("depends_on", []))
    ss = sorted(succ[j], key=lambda k: -rank[k]); best = ss[0] if ss else None
    W, NW, NH, GAP = 1800, 330, 118, 34
    XP, XJ, XS = 70, (W - NW) / 2, W - 70 - NW
    n = max(len(pred), len(ss), 1)
    GY = 290; GH = n * NH + (n - 1) * GAP
    PY = GY + GH + 70                       # แผงคำนวณ
    H = PY + 530
    def col_y(k, m): return GY + (GH - (m * NH + (m - 1) * GAP)) / 2 + k * (NH + GAP)
    S = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Sarabun, Tahoma, sans-serif">',
         '<defs>' + "".join(f'<marker id="m{n_}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">'
                            f'<path d="M0,0L10,5L0,10z" fill="{c}"/></marker>' for n_, c in (("g", "#aaa"), ("b", BLUE), ("o", CRIT))) + '</defs>',
         f'<rect width="{W}" height="{H}" fill="#fff"/>',
         f'<rect width="{W}" height="76" fill="#2b7bd6"/>',
         f'<text x="40" y="50" font-size="30" font-weight="700" fill="#fff">{esc(title)}</text>',
         f'<text x="{W/2}" y="135" font-size="34" text-anchor="middle" fill="#222" font-family="Cambria Math, Times New Roman, serif">'
         f'rank(j) = <tspan fill="{GREEN}" font-weight="700">c<tspan font-size="22" dy="8">j</tspan></tspan><tspan dy="-8"> + max</tspan>'
         f'<tspan font-size="22" dy="9">k∈succ(j)</tspan><tspan dy="-9"> </tspan><tspan fill="{BLUE}" font-weight="700">rank(k)</tspan></text>',
         f'<text x="{W/2}" y="178" font-size="21" text-anchor="middle" fill="#555">ตัวอย่าง: j = {esc(j)} · '
         f'<tspan fill="{GREEN}" font-weight="700">สีเขียว = ขนาดของตัวเอง</tspan> · '
         f'<tspan fill="{BLUE}" font-weight="700">สีน้ำเงิน = rank ของงานที่รอ {esc(j)}</tspan> · '
         f'<tspan fill="{CRIT}" font-weight="700">สีส้ม = ตัวที่มากที่สุด</tspan></text>',
         f'<text x="{XP + NW/2}" y="{GY - 46}" font-size="20" text-anchor="middle" fill="#999">← งานที่ {esc(j)} ต้องรอ (depends_on)</text>',
         f'<text x="{XP + NW/2}" y="{GY - 20}" font-size="17" text-anchor="middle" fill="#999">ไม่ใช้คิด rank ของ {esc(j)}</text>',
         f'<text x="{XS + NW/2}" y="{GY - 46}" font-size="20" text-anchor="middle" fill="{BLUE}" font-weight="700">งานที่รอ {esc(j)} = succ({esc(j)}) →</text>',
         f'<text x="{XS + NW/2}" y="{GY - 20}" font-size="17" text-anchor="middle" fill="{BLUE}">ลูกศรที่ "ออกจาก" {esc(j)}</text>']
    yj = col_y(0, 1)
    def box(x, y, i, kind):
        t = by[i]; faded = kind == "pred"; hot = kind == "best"
        stroke = "#cfcfcf" if faded else CRIT if hot else BLUE if kind == "succ" else "#222"
        fill = "#fafafa" if faded else "#fdf0ea" if hot else "#eef5fd" if kind == "succ" else "#fff"
        dash = ' stroke-dasharray="8 6"' if faded else ""
        S.append(f'<rect x="{x}" y="{y}" width="{NW}" height="{NH}" rx="12" fill="{fill}" stroke="{stroke}" '
                 f'stroke-width="{2 if faded else 3.5}"{dash}/>')
        S.append(f'<text x="{x + NW/2}" y="{y + 34}" font-size="26" text-anchor="middle" fill="{"#aaa" if faded else "#111"}" font-weight="700">'
                 f'{esc(i)} · {esc(t.get("size", "?"))}</text>')
        S.append(f'<text x="{x + NW/2}" y="{y + 62}" font-size="18" text-anchor="middle" fill="{"#bbb" if faded else "#555"}">{esc(short(t.get("title", ""), 30))}</text>')
        if kind == "self":
            S.append(f'<rect x="{x + 14}" y="{y + 76}" width="{NW - 28}" height="32" rx="16" fill="{GREEN}"/>')
            S.append(f'<text x="{x + NW/2}" y="{y + 99}" font-size="21" text-anchor="middle" fill="#fff" font-weight="700">'
                     f'c = {cost[i]:g} (ขนาด {esc(t.get("size", "?"))})</text>')
        elif not faded:
            S.append(f'<text x="{x + 16}" y="{y + 101}" font-size="26" font-weight="700" fill="{CRIT if hot else BLUE}">rank {rank[i]:g}</text>')
            if hot: S.append(f'<text x="{x + NW - 16}" y="{y + 101}" font-size="21" text-anchor="end" font-weight="700" fill="{CRIT}">★ มากที่สุด</text>')
        else:
            S.append(f'<text x="{x + 16}" y="{y + 101}" font-size="20" fill="#bbb">rank {rank[i]:g} (ไม่เกี่ยว)</text>')
    for k, i in enumerate(pred):
        y = col_y(k, len(pred)); x1, y1, x2, y2 = XP + NW, y + NH / 2, XJ - 3, yj + NH / 2; mx = (x1 + x2) / 2
        S.append(f'<path d="M{x1},{y1} C{mx},{y1} {mx},{y2} {x2},{y2}" fill="none" stroke="#bbb" stroke-width="2" stroke-dasharray="8 6" marker-end="url(#mg)"/>')
        box(XP, y, i, "pred")
    for k, i in enumerate(ss):
        y = col_y(k, len(ss)); x1, y1, x2, y2 = XJ + NW, yj + NH / 2, XS - 3, y + NH / 2; mx = (x1 + x2) / 2; hot = i == best
        S.append(f'<path d="M{x1},{y1} C{mx},{y1} {mx},{y2} {x2},{y2}" fill="none" stroke="{CRIT if hot else BLUE}" stroke-width="{5 if hot else 3}" marker-end="url(#{"mo" if hot else "mb"})"/>')
        box(XS, y, i, "best" if hot else "succ")
    if not pred: S.append(f'<text x="{XP + NW/2}" y="{yj + NH/2 + 8}" font-size="20" text-anchor="middle" fill="#bbb">(งานแรก ไม่ต้องรอใคร)</text>')
    if not ss: S.append(f'<text x="{XS + NW/2}" y="{yj + NH/2 + 8}" font-size="20" text-anchor="middle" fill="#bbb">(ไม่มีใครรอ = งานสุดท้าย)</text>')
    box(XJ, yj, j, "self")
    # แผงคำนวณทีละขั้น
    S.append(f'<rect x="40" y="{PY}" width="{W - 80}" height="{H - PY - 40}" rx="16" fill="#fffaf2" stroke="#f0d9b5" stroke-width="2"/>')
    S.append(f'<text x="80" y="{PY + 52}" font-size="28" font-weight="700" fill="#222">คิด rank({esc(j)}) ทีละขั้น</text>')
    def g(v): return f'<tspan fill="{GREEN}" font-weight="700">{v}</tspan>'
    def b(v, hot=False): return f'<tspan fill="{CRIT if hot else BLUE}" font-weight="700">{v}</tspan>'
    terms = ", ".join(b(f"{k} {rank[k]:g}", k == best) for k in ss)
    steps = [("①", f'c<tspan font-size="18" dy="6">{esc(j)}</tspan><tspan dy="-6"> = </tspan>{g(f"{cost[j]:g}")}',
              f"ขนาดของ {esc(j)} เอง ({esc(by[j].get('size', '?'))} = {cost[j]:g} ล้านโทเคน · ดูที่กล่องกลาง)"),
             ("②", f'succ({esc(j)}) = {{{", ".join(b(k) for k in ss)}}}' if ss else f"succ({esc(j)}) = ∅",
              f'ดูลูกศรที่ "ออกจาก" {esc(j)} ไปทางขวา · ไม่ใช่งานที่ {esc(j)} รอ' + (f" ({', '.join(pred)})" if pred else "")),
             ("③", f'max({terms}) = {b(f"{rank[best]:g}", True)}' if ss else f"max(∅) = {g('0')}",
              f"เลือกแค่ตัวมากที่สุด ({best}) ไม่ใช่เอามาบวกกัน" if len(ss) > 1 else ("มีงานรอแค่งานเดียว ใช้ค่านั้นเลย" if ss else "ไม่มีใครรอ = 0")),
             ("④", f'rank({esc(j)}) = {g(f"{cost[j]:g}")} + {b(f"{rank[best]:g}", True) if ss else g("0")} = '
                   f'<tspan font-weight="700" fill="#111">{rank[j]:g}</tspan>', "ผลลัพธ์ = เลขในกล่อง " + esc(j) + " บนภาพ DAG")]
    for k, (no, f, why) in enumerate(steps):
        y = PY + 110 + k * 72
        S.append(f'<text x="80" y="{y}" font-size="30" fill="#dc5a1e" font-weight="700">{no}</text>')
        S.append(f'<text x="130" y="{y}" font-size="29" fill="#222" font-family="Sarabun, Tahoma, sans-serif">{f}</text>')
        S.append(f'<text x="{W - 80}" y="{y}" font-size="20" text-anchor="end" fill="#777">{why}</text>')
    S.append(f'<text x="80" y="{PY + 425}" font-size="21" fill="#555">💡 ทำไมใช้ max ไม่ใช่บวก: งานที่รอ {esc(j)} ทำ<tspan font-weight="700">พร้อมกันได้</tspan> '
             f'จึงรอแค่สายที่ยาวที่สุด · ทำไมคิดย้อน: ต้องรู้ rank ของงานทางขวาก่อน จึงเริ่มจากงานสุดท้าย (rank = ขนาดของตัวเอง)</text>')
    S.append(f'<text x="80" y="{PY + 465}" font-size="21" fill="#555">💡 c ใช้ของ<tspan font-weight="700">ตัวเองเท่านั้น</tspan> '
             f'(ไม่ใช่ c ของงานทางขวา เพราะ c ของพวกนั้นรวมอยู่ใน rank ของมันแล้ว)</text>')
    S.append("</svg>")
    return "\n".join(S)

def backward_order(tasks, rank, succ):
    """ลำดับคิด rank: งานที่ไม่มีใครรอก่อน แล้วไล่ย้อน (งานจะคิดได้เมื่อ succ คิดครบแล้ว)"""
    done, order = set(), []
    while len(order) < len(tasks):
        ready = sorted((t["id"] for t in tasks if t["id"] not in done and all(k in done for k in succ[t["id"]])), key=lambda i: rank[i])
        order += ready; done |= set(ready)
    return order

# ---------------------------------------------------------------- render: Gantt
def render_gantt(tasks, plan, colors, crit, title):
    rows, lanes = [], {}
    for a in colors:      # แต่ละบัญชีแตกเป็นเลน (worker พร้อมกัน) — งานที่ไม่ทับเวลากันใช้เลนเดียวกัน
        recs = sorted([p for p in plan.values() if p.get("account") == a], key=lambda p: p["start"])
        ends = []
        for p in recs:
            k = next((k for k, e in enumerate(ends) if e <= p["start"] + 1e-9), None)
            if k is None: ends.append(p["end"]); k = len(ends) - 1
            else: ends[k] = p["end"]
            lanes[p["id"]] = (a, k)
        for k in range(max(1, len(ends))): rows.append((a, k))
    span = max([p["end"] for p in plan.values() if p.get("end")] + [0.1]) * 60
    LW, X0, Y0, RH, W = 150, 30, 80, 38, 1400
    pw = W - LW - X0 * 2; sc = pw / span
    H = Y0 + len(rows) * RH + 70
    cset = set(crit)
    S = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Sarabun, Tahoma, sans-serif">',
         f'<rect width="{W}" height="{H}" fill="#fff"/>',
         f'<text x="{X0}" y="38" font-size="22" font-weight="700" fill="#222">{esc(title)}</text>',
         f'<text x="{X0}" y="62" font-size="14" fill="#666">แกนนอน = นาทีโดยประมาณ (โทเคนที่ประเมิน ÷ ความเร็วของ CLI) · ขอบส้ม = งานบนสายวิกฤต</text>']
    step = next(s for s in (5, 10, 15, 20, 30, 60, 120, 240) if span / s <= 14)
    m = 0
    while m <= span + 1e-9:
        x = X0 + LW + m * sc
        S.append(f'<line x1="{x}" y1="{Y0-6}" x2="{x}" y2="{Y0 + len(rows)*RH}" stroke="#eee"/><text x="{x}" y="{Y0 + len(rows)*RH + 20}" font-size="13" text-anchor="middle" fill="#777">{m}</text>')
        m += step
    for r, (a, k) in enumerate(rows):
        y = Y0 + r * RH
        S.append(f'<text x="{X0 + LW - 10}" y="{y + 24}" font-size="15" text-anchor="end" fill="#333">{esc(a)}{"" if k == 0 else f" #{k+1}"}</text>')
        S.append(f'<line x1="{X0 + LW}" y1="{y + RH}" x2="{W - X0}" y2="{y + RH}" stroke="#f2f2f2"/>')
    for tid, (a, k) in lanes.items():
        p = plan[tid]; y = Y0 + rows.index((a, k)) * RH
        x = X0 + LW + p["start"] * 60 * sc; w = max(3, (p["end"] - p["start"]) * 60 * sc - 2)
        on = tid in cset
        S.append(f'<rect x="{x}" y="{y + 5}" width="{w}" height="{RH - 10}" rx="5" fill="{colors[a]}" fill-opacity="0.88" '
                 f'stroke="{CRIT if on else "none"}" stroke-width="3"/>')
        S.append(f'<text x="{x + w/2}" y="{y + 24}" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">{esc(tid) if w > 26 else ""}</text>')
    S.append(f'<text x="{W - X0}" y="{H - 14}" font-size="14" text-anchor="end" fill="#555">รวม ≈ {span:.0f} นาที</text></svg>')
    return "\n".join(S)

def to_png(svg_path):
    """แปลง svg → png ด้วย Chromium: Playwright ของ Python ก่อน ไม่มีค่อยใช้ playwright-core ของ node (ไม่มีทั้งคู่ = ข้าม ใช้ svg แทน)"""
    png, url = svg_path[:-4] + ".png", "file:///" + os.path.abspath(svg_path).replace(os.sep, "/").lstrip("/")
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            for ch in (None, "chrome", "msedge"):     # Chromium ของ Playwright ไม่ตรงรุ่น → ใช้ Chrome/Edge ที่มีในเครื่อง
                try: b = pw.chromium.launch(channel=ch) if ch else pw.chromium.launch()
                except Exception: continue
                pg = b.new_page(device_scale_factor=2); pg.goto(url); pg.locator("svg").screenshot(path=png); b.close()
                return png
    except Exception:
        pass
    node, npm = shutil.which("node"), shutil.which("npm")
    if not (node and npm): return None
    root = subprocess.run([npm, "root", "-g"], capture_output=True, text=True).stdout.strip()
    pc = next((p for p in (os.path.join(root, "@playwright", "mcp", "node_modules", "playwright-core"),
                           os.path.join(root, "playwright-core"), os.path.join(root, "playwright")) if os.path.isdir(p)), None)
    if not pc: return None
    js = f"""const {{chromium}}=require({json.dumps(pc)});(async()=>{{const b=await chromium.launch();const p=await b.newPage({{deviceScaleFactor:2}});
await p.goto({json.dumps(url)});const s=await p.$('svg');await s.screenshot({{path:{json.dumps(png)}}});await b.close();}})();"""
    r = subprocess.run([node, "-e", js], capture_output=True, text=True, timeout=120)
    return png if r.returncode == 0 and os.path.exists(png) else None

# ---------------------------------------------------------------- report
def write_report(run, args, tasks, snaps, cost, rank, crit, plan, rounds, peak, orch_acc, imgs):
    by = {t["id"]: t for t in tasks}
    pl = [p for p in plan.values() if p.get("status") == "planned"]
    span = max([p["end"] for p in pl] + [0]) * 60
    serial = sum(cost[t["id"]] / run.cfg["speed_mtok_h"]["yolo"] for t in tasks) * 60
    logged = [q["account"] for q in snaps if q.get("logged_in")]
    L = [f"# PLAN · {args.name or os.path.basename(args.problem or args.tasks)}", "",
         f"**MAX_AGENTS:** {run.cfg['max_agents']} · **บัญชีที่ล็อกอิน:** {len(logged)} ({', '.join(logged)}) · "
         f"**ตัวคุมวง (เหลือมากสุด):** `{orch_acc}` · วางแผนเมื่อ {orch.now().strftime('%d/%m/%Y %H:%M')}", "",
         "> แผนนี้ **ยังไม่ได้รันจริง** — คำนวณด้วย KC-QUEST ตัวเดียวกับ LAB 04.2 แล้วจำลองเวลาตามลำดับ dependency", "",
         "## 1) โควตาของแต่ละบัญชี", "", orch.fmt_quota(snaps), "",
         "## 2) กราฟงาน (DAG) + rank + บัญชีที่ได้งาน", "", f"![DAG]({imgs['dag']})", "",
         f"**สายวิกฤต (critical path):** {' → '.join(crit)} · ยาว {rank[crit[0]]:g}M tok", ""]
    if imgs.get("example"): L += ["**ตัวอย่างคิด rank ทีละขั้น (โหมดสอน):**", "", f"![ตัวอย่างคิด rank]({imgs['example']})", ""]
    L += [
         "## 3) ตารางแจกงาน", "",
         "| งาน | ชื่อ | ขนาด · c | ต้องรอ | rank | บัญชี | เริ่ม–จบ (นาที) | เหตุผล KC-QUEST |", "|---|---|---|---|---|---|---|---|"]
    for t in sorted(tasks, key=lambda t: (plan.get(t["id"], {}).get("start", 1e9), -rank[t["id"]])):
        p = plan.get(t["id"], {}); i = t["id"]
        when = f"{p['start']*60:.0f}–{p['end']*60:.0f}" if p.get("status") == "planned" else "–"
        L.append(f"| {'**'+i+'**' if i in crit else i} | {t.get('title','')} | {t.get('size')} · {cost[i]:g} | {', '.join(t.get('depends_on', [])) or '–'} "
                 f"| {rank[i]:g} | {p.get('account') or '❌'} | {when} | {p.get('why','')} |")
    L += ["", "## 4) ไทม์ไลน์ (ใครทำงานไหน เมื่อไร)", "", f"![Gantt]({imgs['gantt']})", "",
          "## 5) รอบแจกงาน", "", "| นาทีที่ | งานที่เริ่ม |", "|---|---|"]
    L += [f"| {r['t_min']} | " + ", ".join(i + "→" + plan[i]["account"] for i in r["start"]) + " |" for r in rounds]
    cnt = {}
    for p in pl: cnt.setdefault(p["account"], []).append(p["id"])
    L += ["", "## 6) สรุป", "",
          f"- งานทั้งหมด {len(tasks)} · แจกได้ {len(pl)} · ไม่มีใครรับ {len(tasks) - len(pl)}",
          f"- worker พร้อมกันสูงสุด **{peak}** (เพดาน {run.cfg['max_agents']} · งานรูปของ cyolo ไม่นับ)",
          f"- เวลาประมาณ **{span:.0f} นาที** (ถ้าทำทีละงานด้วยบัญชีเดียว ≈ {serial:.0f} นาที → เร็วขึ้น ~{serial/max(span,1e-9):.1f} เท่า)"]
    L += [f"- `{a}` ได้ {len(v)} งาน: {', '.join(v)}" for a, v in cnt.items()]
    bad = [t["id"] for t in tasks if plan.get(t["id"], {}).get("status") != "planned"]
    if bad: L.append(f"- ⚠️ งานที่ไม่มีบัญชีไหนปิดได้: {', '.join(bad)} → แบ่งงานให้เล็กลง หรือล็อกอินเพิ่ม")
    open(run.f("PLAN.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")

# ---------------------------------------------------------------- doctor
def doctor():
    """ตรวจเครื่องครั้งแรก: บอกว่าอะไรพร้อม อะไรขาด และแก้อย่างไร (ไม่ติดตั้งอะไรเอง)"""
    ok, rows = True, []
    def row(good, what, fix=""):
        nonlocal ok
        ok &= good is not False
        rows.append(("✅" if good else ("⚠️" if good is None else "❌")) + f" {what}" + (f"\n     → {fix}" if fix and not good else ""))
    row(sys.version_info >= (3, 9), f"Python {sys.version.split()[0]}", "ต้องใช้ Python 3.9 ขึ้นไป")
    row(True, f"orch.py (KC-QUEST) ที่ {os.path.relpath(os.path.dirname(orch.__file__), LAB)}")
    row(None if globals().get("TZ_FALLBACK") else True, "ฐานข้อมูล timezone" + (" (ไม่มี ใช้ +07:00 แทน · ใช้งานได้)" if globals().get("TZ_FALLBACK") else ""),
        "ถ้าอยากได้ค่าตรงเป๊ะ: pip install tzdata")
    t = os.path.join(LAB, "out", "_doctor"); os.makedirs(t, exist_ok=True)
    open(os.path.join(t, "t.svg"), "w", encoding="utf-8").write('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><text y="15">ทดสอบ</text></svg>')
    png = to_png(os.path.join(t, "t.svg")); shutil.rmtree(t, ignore_errors=True)
    row(bool(png) or None, "ตัวแปลงภาพเป็น png (Chromium/Chrome/Edge)" + ("" if png else " — ไม่มี จะได้แค่ .svg (เปิดดูในเบราว์เซอร์ได้)"),
        "pip install playwright (ใช้ Chrome/Edge ที่มีในเครื่องได้เลย) หรือ python -m playwright install chromium")
    inside = os.path.isdir(orch.BASE)
    dk = shutil.which("docker")
    up = bool(dk) and subprocess.run([dk, "inspect", "-f", "{{.State.Running}}", CONTAINER], capture_output=True, text=True).stdout.strip() == "true"
    row(True if (inside or up) else None,
        "โควตาจริง: " + ("อยู่ใน container" if inside else f"container {CONTAINER} รันอยู่" if up else "ไม่พบ container → ใช้ค่าที่ใส่ใน --accounts (ไม่ใส่ % = เหลือเต็ม)"),
        f"อยากได้โควตาจริง: เปิด container {CONTAINER} (ไม่บังคับ)")
    if inside or up:             # บอกชื่อบัญชีที่ล็อกอิน + เหลือกี่ % → เอาไปใส่บรรทัด "บัญชี:" ในพรอมต์ ② ได้เลย
        qd = os.path.join(LAB, "out", "_quota")
        snaps = orch.score_accounts(orch.Run(qd), orch.quota_snapshot(orch.Run(qd))) if inside else container_quota([])
        shutil.rmtree(qd, ignore_errors=True)
        acc = [f"{q['account']} {q.get('headroom')}%" for q in (snaps or []) if q.get("logged_in")]
        rows.append(f"👥 บัญชีที่ล็อกอิน: {', '.join(acc) if acc else 'ยังไม่มี'}")
    plans = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(LAB, "out", "*", "tasks.json")))
    rows.append(f"📁 แผนที่มีอยู่ใน out/: {', '.join(plans) if plans else 'ยังไม่มี'}")
    print("ตรวจเครื่องสำหรับ planner.py\n" + "\n".join(rows))
    print("\nพร้อมใช้ ✅" if ok else "\nยังไม่พร้อม ❌ แก้ตามลูกศรด้านบนก่อน")
    if not ok: sys.exit(1)

# ---------------------------------------------------------------- main
def main():
    for f in (sys.stdout, sys.stderr):      # Windows console (cp874) พิมพ์ไทย/สัญลักษณ์ไม่ได้
        try: f.reconfigure(encoding="utf-8")
        except Exception: pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", nargs="?", choices=["doctor", "quota", "dag", "plan"])
    ap.add_argument("--plan", help="ชื่อแผน = โฟลเดอร์ out/<ชื่อ>/ (ใช้แทน --tasks/--out)")
    ap.add_argument("--out"); ap.add_argument("--tasks"); ap.add_argument("--problem"); ap.add_argument("--name")
    ap.add_argument("--max-agents", type=int, default=6); ap.add_argument("--quota-json"); ap.add_argument("--accounts", default="")
    ap.add_argument("--png", action="store_true")
    ap.add_argument("--mode", choices=["real", "teach"], default="real", help="real = ใช้งานจริง (ภาพกระชับ) · teach = โหมดสอน (สูตรแทนค่า + ภาพตัวอย่างคิด rank)")
    ap.add_argument("--example", help="โหมดสอน: งานที่ใช้ทำภาพตัวอย่างคิด rank (ไม่ใส่ = เลือกให้)")
    a = ap.parse_args()
    if not a.cmd: print(__doc__); return
    if a.cmd == "doctor": return doctor()
    if a.cmd in ("dag", "plan") and not a.tasks:          # หาไฟล์งานเอง: --plan ชื่อ หรือแผนที่แก้ล่าสุดใน out/
        if a.plan: a.tasks = os.path.join(LAB, "out", a.plan, "tasks.json")
        else:
            found = sorted(glob.glob(os.path.join(LAB, "out", "*", "tasks.json")), key=os.path.getmtime)
            if not found: sys.exit("ERROR ยังไม่มีแผนใน out/ — ให้เขียน out/<ชื่อแผน>/tasks.json ก่อน (ดูรูปแบบใน --help)")
            a.tasks = found[-1]; print(f"ใช้แผนล่าสุด: {os.path.relpath(a.tasks, LAB)}")
        if not os.path.exists(a.tasks): sys.exit(f"ERROR ไม่พบ {a.tasks}")
    a.out = a.out or (os.path.dirname(os.path.abspath(a.tasks)) if a.tasks else os.path.join(LAB, "out", a.plan or "_quota"))
    a.name = a.name or a.plan or (os.path.basename(a.out) if a.tasks else None)
    os.makedirs(a.out, exist_ok=True)
    cfg = orch.jload(os.path.join(a.out, "config.json"), {}) or {}
    cfg["max_agents"] = a.max_agents; orch.jsave(os.path.join(a.out, "config.json"), cfg)
    run = orch.Run(a.out)
    only, left = [], {}
    for x in (x.strip() for x in a.accounts.replace(" ", ",").split(",")):
        if not x: continue
        n, _, pct = x.partition(":"); only.append(n)
        if pct: left[n] = max(0, min(100, int(pct.rstrip("%"))))
    snaps = load_snaps(run, a.quota_json, only, left) if a.cmd != "dag" else []
    if a.cmd == "quota":
        print(orch.fmt_quota(snaps)); print(f"\nตัวคุมวงที่ควรใช้: {orch.orchestrator_pick(snaps)}"); return
    tasks = (orch.jload(a.tasks, {}) or {}).get("tasks", [])
    errs = check_dag(tasks)
    if errs: print("ERROR\n" + "\n".join(errs)); sys.exit(1)
    cost = {t["id"]: float(t.get("est_mtok") or run.cfg["size_mtok"][t.get("size", "M")]) for t in tasks}
    rank, succ, calc = raw_ranks(tasks, cost)
    crit = critical_path(tasks, rank, succ)
    name = a.name or os.path.splitext(os.path.basename(a.problem or a.tasks))[0]
    teach = a.mode == "teach"
    ex = None
    if teach:                     # โหมดสอน: ภาพตัวอย่างคิด rank ของงาน 1 งาน
        ex = a.example or pick_example(tasks, succ, crit)
        if ex not in succ: sys.exit(f"ERROR --example {ex} ไม่มีในแผน")
        open(run.f("rank-example.svg"), "w", encoding="utf-8").write(render_rank_example(tasks, cost, rank, succ, ex, f"ตัวอย่างคิด rank ทีละขั้น · {ex} · {name}"))
        ex = (to_png(run.f("rank-example.svg")) if a.png else None) or run.f("rank-example.svg")
    if a.cmd == "dag":
        open(run.f("dag.svg"), "w", encoding="utf-8").write(render_dag(tasks, cost, rank, succ, calc, crit, {}, {}, f"แตกโจทย์เป็นกราฟงาน (DAG) · {name}", teach))
        png = to_png(run.f("dag.svg")) if a.png else None
        if a.png and not png: print("WARN แปลง dag.svg เป็น png ไม่ได้ (ใช้ svg แทน)")
        orch.jsave(run.f("dag.json"), {"critical_path": crit, "rank": rank, "calc": calc})
        print(f"OK {len(tasks)} งาน · สายวิกฤต {' → '.join(crit)} · ยาว {rank[crit[0]]:g}M tok · โหมด {a.mode}")
        if teach:
            print("ลำดับคิด rank (ย้อนจากงานสุดท้าย · งานจะคิดได้เมื่องานที่รอมันคิดครบแล้ว):")
            for k, i in enumerate(backward_order(tasks, rank, succ), 1): print(f"  {k:>2}. {i:<6} rank {rank[i]:<6g} {calc[i]}")
        else:
            for t in sorted(tasks, key=lambda t: -rank[t["id"]]): print(f"  {t['id']:<6} rank {rank[t['id']]:<6g} {calc[t['id']]}")
        print(f"ผลลัพธ์: {png or run.f('dag.svg')}" + (f" · {ex}" if ex else "")); return
    plan, rounds, peak, orch_acc, _ = simulate(run, tasks, snaps, cost)
    accs = [q["account"] for q in snaps if q.get("logged_in") and not q.get("disabled")]
    colors = {acc: PALETTE[k % len(PALETTE)] for k, acc in enumerate(accs)}
    open(run.f("dag.svg"), "w", encoding="utf-8").write(render_dag(tasks, cost, rank, succ, calc, crit, plan, colors, f"แตกโจทย์เป็นกราฟงาน (DAG) · {name} · MAX_AGENTS={a.max_agents}", teach))
    open(run.f("gantt.svg"), "w", encoding="utf-8").write(render_gantt(tasks, {k: v for k, v in plan.items() if v.get("status") == "planned"}, colors, crit, f"ไทม์ไลน์แผนงาน · {name}"))
    imgs = {"dag": "dag.svg", "gantt": "gantt.svg"}
    if ex: imgs["example"] = os.path.basename(ex)
    if a.png:
        for k in imgs:
            p = to_png(run.f(imgs[k]))
            if p: imgs[k] = os.path.basename(p)
            else: print(f"WARN แปลง {imgs[k]} เป็น png ไม่ได้ (ใช้ svg แทน)")
    write_report(run, a, tasks, snaps, cost, rank, crit, plan, rounds, peak, orch_acc, imgs)
    orch.jsave(run.f("plan.json"), {"critical_path": crit, "rank": rank, "peak_workers": peak, "rounds": rounds, "assign": plan})
    print(f"OK {len(tasks)} งาน · สายวิกฤต {' → '.join(crit)} · worker พร้อมกันสูงสุด {peak}/{a.max_agents}")
    for t in tasks:
        p = plan.get(t["id"], {}); print(f"  {t['id']:<6} rank {rank[t['id']]:<6g} → {p.get('account') or '❌ ไม่มีใครรับ'}")
    print(f"ผลลัพธ์: {run.f('PLAN.md')} · {run.f(imgs['dag'])} · {run.f(imgs['gantt'])}" + (f" · {ex}" if ex else ""))

if __name__ == "__main__":
    main()
