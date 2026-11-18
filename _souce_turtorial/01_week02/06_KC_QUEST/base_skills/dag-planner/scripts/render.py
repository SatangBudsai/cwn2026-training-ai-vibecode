#!/usr/bin/env python3
"""render.py — วาด DAG · Gantt (แผน/จริง) · compare เป็น SVG แล้วแปลงเป็น PNG ด้วย headless Chromium (ถ้ามี)"""
import glob
import html
import json
import os
import shutil
import subprocess
import tempfile

FONT = "Sarabun, Loma, Garuda, 'Noto Sans Thai', Tahoma, 'Noto Color Emoji', sans-serif"
CRIT = "#e8590c"
# สกิลของบล็อก → (สี, ไอคอน, ชื่อไทย) — ไม่ซ้ำกันทั้ง 6 แบบ
SKILL_STYLE = {
    "yolo": ("#7c3aed", "🧠", "yolo · Claude 1 บัญชี"),
    "cyolo": ("#059669", "⚙️", "cyolo · Codex 1 บัญชี"),
    "image": ("#db2777", "🖼️", "image · Codex สร้างภาพ"),
    "review": ("#2563eb", "🔍", "review · ผู้ทำ + ผู้ตรวจคนละ CLI"),
    "debate": ("#475569", "⚖️", "debate · Claude vs Codex + ผู้ตัดสิน"),
    "best_of": ("#0891b2", "🏆", "best_of · N ตัวเลือก + ผู้ตัดสิน"),
}
# difficulty → (รุ่น Claude, effort Claude, effort Codex) ตามตาราง DIFFICULTY ของ base skill agent-team
DIFF = {1: ("haiku", "low", "low"), 2: ("sonnet", "medium", "medium"), 3: ("opus", "high", "high"),
        4: ("opus", "xhigh", "xhigh"), 5: ("opus", "max", "max"), 6: ("opus", "max", "ultra")}
ACC_PALETTE = ["#1f6feb", "#2da44e", "#8250df", "#cf222e", "#bf8700", "#1b7c83", "#d1242f", "#57606a", "#bc4c00", "#6639ba"]


def esc(s): return html.escape(str(s), quote=True)
def short(s, n): s = str(s); return s if len(s) <= n else s[:n - 1] + "…"


def model_label(skill, d):
    m, ce, xe = DIFF.get(int(d or 2), DIFF[2])
    if skill == "yolo":
        return f"d{d} {m}/{ce}"
    if skill in ("cyolo", "image"):
        return f"d{d} codex/{'low' if skill == 'image' else xe}"
    return f"d{d} {m}/{ce}·codex {xe}"


def head(W, H, title, sub=""):
    S = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
         '<defs><marker id="ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
         '<path d="M0,0L10,5L0,10z" fill="#9a9a9a"/></marker>'
         f'<marker id="ac" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
         f'<path d="M0,0L10,5L0,10z" fill="{CRIT}"/></marker></defs>',
         f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
         f'<rect width="{W}" height="64" fill="#1e3a5f"/>',
         f'<text x="30" y="42" font-size="26" font-weight="700" fill="#fff">{esc(title)}</text>']
    if sub:
        S.append(f'<text x="30" y="88" font-size="16" fill="#555">{esc(sub)}</text>')
    return S


def skill_legend(S, x, y, skills, extra=(), maxw=1460):
    x0 = x
    for sk in skills:
        col, ic, name = SKILL_STYLE[sk]
        if x + 46 + 9 * len(name) > maxw:          # ขึ้นบรรทัดใหม่เมื่อเกินความกว้างภาพ
            x, y = x0, y + 28
        S.append(f'<rect x="{x}" y="{y - 17}" width="24" height="24" rx="6" fill="{col}"/>'
                 f'<text x="{x + 12}" y="{y + 1}" font-size="14" text-anchor="middle">{ic}</text>'
                 f'<text x="{x + 32}" y="{y}" font-size="16" fill="#333">{esc(name)}</text>')
        x += 46 + 9 * len(name)
    for txt, col in extra:
        if x + 30 + 9 * len(txt) > maxw:
            x, y = x0, y + 28
        S.append(f'<text x="{x}" y="{y}" font-size="16" fill="{col}" font-weight="700">{esc(txt)}</text>')
        x += 30 + 9 * len(txt)
    return x


# ---------------------------------------------------------------- DAG
def layout(blocks):
    by = {b["id"]: b for b in blocks}
    depth = {}

    def dep(i):
        if i not in depth:
            depth[i] = 1 + max([dep(d) for d in by[i].get("depends_on", [])] + [-1])
        return depth[i]
    for b in blocks:
        dep(b["id"])
    cols, pos = {}, {}
    for b in blocks:
        cols.setdefault(depth[b["id"]], []).append(b["id"])
    for c in sorted(cols):
        cols[c].sort(key=lambda i: (sum(pos[d] for d in by[i].get("depends_on", [])) /
                                    max(1, len(by[i].get("depends_on", []))) if c else 0))
        for k, i in enumerate(cols[c]):
            pos[i] = k
    return cols


def render_dag(blocks, cost, rank, crit, title, plan=None, acc_colors=None):
    """กล่อง = id · ชื่อ · ขนาด · rank + ป้ายสกิล (สี+ไอคอน+รุ่น/effort) · plan = ป้ายบัญชีที่ได้"""
    plan, acc_colors = plan or {}, acc_colors or {}
    cols = layout(blocks)
    NW, NH, CW, RH, X0, Y0 = 340, 150 if plan else 128, 410, 185 if plan else 165, 40, 120
    nrow = max(len(v) for v in cols.values())
    W = max(X0 * 2 + (len(cols) - 1) * CW + NW, 1500)
    H = Y0 + nrow * RH + 150
    xy = {}
    for c, ids in cols.items():
        off = (nrow - len(ids)) * RH / 2
        for k, i in enumerate(ids):
            xy[i] = (X0 + c * CW, Y0 + off + k * RH)
    cset, cedges = set(crit), set(zip(crit, crit[1:]))
    S = head(W, H, title, "rank = ขนาด (ล้านโทเคน) + rank สูงสุดของบล็อกที่รอ · ป้ายสี = สกิลของบล็อก (รุ่น/effort จาก difficulty)"
             + (" · ป้ายล่าง = บัญชีที่ KC-QUEST แจก" if plan else ""))
    edges = [(d, b["id"]) for b in blocks for d in b.get("depends_on", [])]
    for a, b in sorted(edges, key=lambda e: e in cedges):
        (x1, y1), (x2, y2) = xy[a], xy[b]
        x1, y1, x2, y2 = x1 + NW, y1 + NH / 2, x2 - 2, y2 + NH / 2
        mx = (x1 + x2) / 2
        on = (a, b) in cedges
        S.append(f'<path d="M{x1},{y1} C{mx},{y1} {mx},{y2} {x2},{y2}" fill="none" stroke="{CRIT if on else "#c4c4c4"}" '
                 f'stroke-width="{4.5 if on else 1.8}" marker-end="url(#{"ac" if on else "ag"})"/>')
    for b in blocks:
        i = b["id"]
        x, y = xy[i]
        on = i in cset
        col, ic, _ = SKILL_STYLE[b["skill"]]
        S.append(f'<rect x="{x}" y="{y}" width="{NW}" height="{NH}" rx="10" fill="{"#fff4ec" if on else "#fff"}" '
                 f'stroke="{CRIT if on else "#bdbdbd"}" stroke-width="{3 if on else 1.6}"/>')
        S.append(f'<rect x="{x}" y="{y}" width="8" height="{NH}" rx="4" fill="{col}"/>')
        lock = " 🔒" if b.get("exclusive") else ""
        S.append(f'<text x="{x + 20}" y="{y + 28}" font-size="20" font-weight="700" fill="#111">{esc(i)}'
                 f'<tspan font-weight="400" fill="#555"> · {esc(b.get("size"))} {cost[i]:g}M{lock}</tspan></text>')
        S.append(f'<text x="{x + NW - 12}" y="{y + 28}" font-size="19" font-weight="700" text-anchor="end" '
                 f'fill="{CRIT if on else "#1f6feb"}">rank {rank[i]:g}</text>')
        S.append(f'<text x="{x + 20}" y="{y + 55}" font-size="16" fill="#333">{esc(short(b.get("title", ""), 30))}</text>')
        lab = f'{ic} {b["skill"]} · {model_label(b["skill"], b.get("difficulty", 2))}'
        S.append(f'<rect x="{x + 18}" y="{y + 68}" width="{NW - 32}" height="28" rx="14" fill="{col}"/>'
                 f'<text x="{x + 30}" y="{y + 88}" font-size="14" font-weight="700" fill="#fff">{esc(lab)}</text>')
        S.append(f'<text x="{x + 20}" y="{y + 117}" font-size="13" fill="#777">→ {esc(short(b.get("output", ""), 36))}</text>')
        if plan:
            p = plan.get(i) or {}
            accs = [a["account"] for a in p.get("accounts", [])]
            ax = x + 18
            if not accs:
                S.append(f'<text x="{ax}" y="{y + 141}" font-size="15" font-weight="700" fill="#cf222e">❌ ไม่มีบัญชีรับ</text>')
            for a in accs:
                w = 14 + 9.5 * len(a)
                S.append(f'<rect x="{ax}" y="{y + 124}" width="{w}" height="22" rx="11" fill="{acc_colors.get(a, "#888")}"/>'
                         f'<text x="{ax + w / 2}" y="{y + 140}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">{esc(a)}</text>')
                ax += w + 6
    used = [k for k in SKILL_STYLE if any(b["skill"] == k for b in blocks)]
    skill_legend(S, X0, H - 92, used, maxw=W - X0)
    S.append(f'<text x="{X0}" y="{H - 24}" font-size="17" fill="{CRIT}" font-weight="700">━ สายวิกฤต: {esc(" → ".join(crit))}'
             f' (ยาว {rank[crit[0]]:g}M tok)</text>')
    S.append(f'<text x="{W - X0}" y="{H - 24}" font-size="16" text-anchor="end" fill="#555">🔒 = exclusive (รันคนเดียว) · '
             f'แถบสีซ้ายกล่อง = สกิล · กรอบส้ม = บนสายวิกฤต</text>')
    S.append("</svg>")
    return "\n".join(S)


# ---------------------------------------------------------------- Gantt (แผน / จริง)
def render_gantt(bars, accounts, crit, title, sub, skills_of):
    """bars = [{"block","account","start","end" (นาที),"role","skill"}] · แถว = บัญชี (แตกเลนเมื่อทับเวลา)
    บล็อกหลายบัญชี = แท่งในทุกแถวที่เกี่ยวข้อง + เส้นประเชื่อม + ป้ายชื่อเดียวกัน"""
    rows, lane_of = [], {}
    for a in accounts:
        ends = []
        for k_, br in enumerate(sorted([b for b in bars if b["account"] == a], key=lambda b: (b["start"], b["block"]))):
            k = next((j for j, e in enumerate(ends) if e <= br["start"] + 1e-9), None)
            if k is None:
                ends.append(br["end"])
                k = len(ends) - 1
            else:
                ends[k] = br["end"]
            lane_of[id(br)] = (a, k)
        for k in range(max(1, len(ends))):
            rows.append((a, k))
    span = max([b["end"] for b in bars] + [0.1])
    LW, X0, Y0, RH, W = 170, 30, 110, 44, 1500
    pw = W - LW - X0 * 2 - 20
    sc = pw / span
    H = Y0 + len(rows) * RH + 150
    cset = set(crit)
    S = head(W, H, title, sub)
    step = next(s for s in (0.25, 0.5, 1, 2, 5, 10, 15, 20, 30, 60, 120, 240, 480) if span / s <= 15)
    m = 0.0
    while m <= span + 1e-9:
        x = X0 + LW + m * sc
        S.append(f'<line x1="{x}" y1="{Y0 - 6}" x2="{x}" y2="{Y0 + len(rows) * RH}" stroke="#eee"/>'
                 f'<text x="{x}" y="{Y0 + len(rows) * RH + 20}" font-size="13" text-anchor="middle" fill="#777">{m:g}</text>')
        m += step
    S.append(f'<text x="{X0 + LW + pw / 2}" y="{Y0 + len(rows) * RH + 42}" font-size="14" text-anchor="middle" fill="#555">นาที</text>')
    for r, (a, k) in enumerate(rows):
        y = Y0 + r * RH
        S.append(f'<rect x="{X0}" y="{y}" width="{W - 2 * X0}" height="{RH}" fill="{"#fafafa" if r % 2 else "#fff"}"/>')
        S.append(f'<text x="{X0 + LW - 10}" y="{y + 28}" font-size="16" text-anchor="end" fill="#333">'
                 f'{esc(a)}{"" if k == 0 else f" #{k + 1}"}</text>')
    centers = {}
    for br in bars:
        a, k = lane_of[id(br)]
        y = Y0 + rows.index((a, k)) * RH
        x = X0 + LW + br["start"] * sc
        w = max(4, (br["end"] - br["start"]) * sc - 2)
        on = br["block"] in cset
        col = SKILL_STYLE[br["skill"]][0]
        S.append(f'<rect x="{x}" y="{y + 6}" width="{w}" height="{RH - 12}" rx="5" fill="{col}" fill-opacity="0.9" '
                 f'stroke="{CRIT if on else "none"}" stroke-width="3.5"/>')
        role = {"worker": "", "reviewer": "·ตรวจ", "candidate": "·ตอบ", "judge": "·ตัดสิน"}.get(br.get("role"), "")
        lab = f'{br["block"]}{role}' if w > 9 * len(br["block"] + role) else (br["block"] if w > 9 * len(br["block"]) else "")
        S.append(f'<text x="{x + w / 2}" y="{y + 28}" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">{esc(lab)}</text>')
        centers.setdefault(br["block"], []).append((x + 6, y + RH / 2))
    for blk, pts in centers.items():          # เส้นประเชื่อมแท่งของบล็อกเดียวกันที่อยู่หลายแถว
        if len(pts) < 2:
            continue
        pts.sort(key=lambda p: p[1])
        col = SKILL_STYLE[skills_of[blk]][0]
        S.append(f'<polyline points="{" ".join(f"{px},{py}" for px, py in pts)}" fill="none" stroke="{col}" '
                 f'stroke-width="2.5" stroke-dasharray="6 4"/>')
        for px, py in pts:
            S.append(f'<circle cx="{px}" cy="{py}" r="4.5" fill="#fff" stroke="{col}" stroke-width="2.5"/>')
    used = [k for k in SKILL_STYLE if k in set(skills_of.values())]
    skill_legend(S, X0, H - 62, used, [("▭ ขอบส้ม = สายวิกฤต", CRIT)], maxw=W - X0)
    S.append(f'<text x="{W - X0}" y="{H - 92}"font-size="15" text-anchor="end" fill="#555">'
             f'รวม ≈ {span:.1f} นาที · เส้นประ = บล็อกเดียวกันที่ใช้หลายบัญชี</text>')
    S.append("</svg>")
    return "\n".join(S)


# ---------------------------------------------------------------- compare (แผน vs จริง)
def render_compare(rows, title, sub):
    """rows = [{"block","skill","p0","p1" (นาทีแผน),"a0","a1" (นาทีจริง) หรือ None,"status"}]
    แผนและจริงใช้แกนแยกกัน (ซ้าย/ขวา) เพราะสเกลต่างกันมากก่อนปรับ k"""
    W, X0, Y0, RH, LW = 1500, 30, 130, 46, 150
    PW = (W - 2 * X0 - LW - 60) / 2
    H = Y0 + len(rows) * RH + 110
    ps = max([r["p1"] for r in rows if r.get("p1") is not None] + [0.1])
    as_ = max([r["a1"] for r in rows if r.get("a1") is not None] + [0.1])
    S = head(W, H, title, sub)
    xp, xa = X0 + LW, X0 + LW + PW + 60
    S.append(f'<text x="{xp + PW / 2}" y="{Y0 - 14}" font-size="18" text-anchor="middle" font-weight="700" fill="#333">แผน (KC-QUEST) · {ps:.1f} นาที</text>')
    S.append(f'<text x="{xa + PW / 2}" y="{Y0 - 14}" font-size="18" text-anchor="middle" font-weight="700" fill="#333">จริง (agent-team) · {as_:.1f} นาที</text>')
    for x0, span in ((xp, ps), (xa, as_)):
        step = next(s for s in (0.25, 0.5, 1, 2, 5, 10, 15, 20, 30, 60, 120, 240, 480) if span / s <= 8)
        m = 0.0
        while m <= span + 1e-9:
            x = x0 + m * PW / span
            S.append(f'<line x1="{x}" y1="{Y0}" x2="{x}" y2="{Y0 + len(rows) * RH}" stroke="#eee"/>'
                     f'<text x="{x}" y="{Y0 + len(rows) * RH + 18}" font-size="12" text-anchor="middle" fill="#777">{m:g}</text>')
            m += step
    for k, r in enumerate(rows):
        y = Y0 + k * RH
        col = SKILL_STYLE[r["skill"]][0]
        S.append(f'<rect x="{X0}" y="{y}" width="{W - 2 * X0}" height="{RH}" fill="{"#fafafa" if k % 2 else "#fff"}"/>')
        S.append(f'<text x="{X0 + LW - 10}" y="{y + 28}" font-size="16" text-anchor="end" fill="#333">'
                 f'{SKILL_STYLE[r["skill"]][1]} {esc(r["block"])}</text>')
        if r.get("p1") is not None:
            x, w = xp + r["p0"] * PW / ps, max(3, (r["p1"] - r["p0"]) * PW / ps)
            S.append(f'<rect x="{x}" y="{y + 9}" width="{w}" height="{RH - 18}" rx="4" fill="{col}" fill-opacity="0.35" stroke="{col}"/>')
            S.append(f'<text x="{x + w + 6}" y="{y + 28}" font-size="12" fill="#555">{r["p1"] - r["p0"]:.1f}</text>')
        if r.get("a1") is not None:
            x, w = xa + r["a0"] * PW / as_, max(3, (r["a1"] - r["a0"]) * PW / as_)
            S.append(f'<rect x="{x}" y="{y + 9}" width="{w}" height="{RH - 18}" rx="4" fill="{col}"/>')
            S.append(f'<text x="{x + w + 6}" y="{y + 28}" font-size="12" fill="#555">{r["a1"] - r["a0"]:.1f}'
                     f'{"" if r.get("status") in ("ok", "done") else " " + esc(r.get("status"))}</text>')
        else:
            S.append(f'<text x="{xa + 6}" y="{y + 28}" font-size="13" fill="#cf222e">{esc(r.get("status") or "ไม่ได้รัน")}</text>')
    S.append(f'<text x="{X0}" y="{H - 30}" font-size="15" fill="#555">แท่งจาง = เวลาตามแผน · แท่งทึบ = เวลาจริง · '
             f'ตัวเลข = นาทีของบล็อก · ตัวปรับ k = จริง ÷ แผน (แยกตามสกิล) บันทึกใน calib.json</text>')
    S.append("</svg>")
    return "\n".join(S)


# ---------------------------------------------------------------- SVG → PNG
def find_chrome():
    """headless Chromium ที่มีจริง: $DAGPLAN_CHROME → Playwright browsers → chromium/google-chrome ใน PATH"""
    env = os.environ.get("DAGPLAN_CHROME")
    if env and os.path.isfile(env):
        return env
    roots = [os.environ.get("PLAYWRIGHT_BROWSERS_PATH") or "", "/ms-playwright", os.path.expanduser("~/.cache/ms-playwright")]
    for r in [x for x in roots if x]:
        for pat in ("chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell",
                    "chromium-*/chrome-linux*/chrome"):
            hits = sorted(glob.glob(os.path.join(r, pat)))
            if hits:
                return hits[-1]
    for n in ("chromium", "chromium-browser", "google-chrome", "chrome"):
        p = shutil.which(n)
        if p:
            return p
    return None


def svg_size(svg_path):
    import re
    with open(svg_path, encoding="utf-8") as f:
        head_ = f.read(400)
    m = re.search(r'width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"', head_)
    return (int(float(m.group(1))), int(float(m.group(2)))) if m else (1600, 1000)


def to_png(svg_path, scale=2):
    """คืน path ของ png หรือ None (ไม่มี Chromium → ใช้ svg)"""
    chrome = find_chrome()
    if not chrome:
        return None
    png = svg_path[:-4] + ".png"
    w, h = svg_size(svg_path)
    with tempfile.TemporaryDirectory() as td:
        page = os.path.join(td, "p.html")
        with open(svg_path, encoding="utf-8") as f:
            body = f.read()
        with open(page, "w", encoding="utf-8") as f:
            f.write(f'<!doctype html><meta charset="utf-8"><style>html,body{{margin:0;background:#fff}}</style>{body}')
        cmd = [chrome, "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={td}/u",
               f"--force-device-scale-factor={scale}", f"--window-size={w},{h}", f"--screenshot={png}",
               "--default-background-color=ffffffff", "file://" + page]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        except Exception:
            return None
    return png if os.path.exists(png) and os.path.getsize(png) > 0 and r.returncode == 0 else None


if __name__ == "__main__":
    print(json.dumps({"chrome": find_chrome()}))
