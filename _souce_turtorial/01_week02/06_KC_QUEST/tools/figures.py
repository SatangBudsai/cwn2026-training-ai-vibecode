#!/usr/bin/env python3
"""figures.py — วาดภาพข้อมูลของบทเรียนจากตัวเลขที่คำนวณจริง → image/lesson-*.png

  python tools/figures.py            วาดทุกภาพ
  python tools/figures.py sim        วาดเฉพาะภาพที่ชื่อมีคำนี้

ภาพที่ได้
  lesson-dag.png · lesson-gantt-plan.png   DAG และ Gantt ของแผนเหมียวช็อปในสถานการณ์ของบทเรียน (ตัววาดของ base skill)
  lesson-round1-scores.png · lesson-round3-scores.png   คะแนนแยกตามตัวแปรของรอบที่ 1 และ 3
  lesson-urgency-curve.png                 กราฟ U = 24 ÷ (24 + T)
  lesson-sim.png                           ผลจำลองเทียบวิธีแจกงาน (อ่านจาก tools/sim_result.json)
ภาพการ์ตูน kc-*.png สร้างด้วยเครื่องมือสร้างภาพ ไม่ได้มาจากไฟล์นี้
"""
import argparse
import json
import os
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import kclab  # noqa: E402

K, R, ROOT = kclab.K, kclab.R, kclab.ROOT
IMG = os.path.join(ROOT, "image")
TEAL, ORANGE = "#0f766e", "#e8590c"


def args(**kw):
    d = dict(blocks=os.path.join(ROOT, "examples", "meow-shop", "blocks.json"),
             scenario=os.path.join(ROOT, "examples", "quota_lesson.json"), max_agents=6, weights=None, set=None)
    d.update(kw)
    return argparse.Namespace(**d)


def save(name, svg):
    """SVG → image/<name>.png (ไม่มี Chromium = เก็บ .svg)"""
    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, name + ".svg")
        with open(p, "w", encoding="utf-8") as f:
            f.write(svg)
        png = R.to_png(p)
        dst = os.path.join(IMG, name + (".png" if png else ".svg"))
        shutil.copy(png or p, dst)
    print("ภาพ:", os.path.relpath(dst, ROOT))


def fig_plan():
    x = kclab.run(args())
    with tempfile.TemporaryDirectory() as td:
        kclab.draw_plan(x, td)
        for src, dst in (("dag", "lesson-dag"), ("gantt-plan", "lesson-gantt-plan")):
            ext = ".png" if os.path.exists(os.path.join(td, src + ".png")) else ".svg"
            shutil.copy(os.path.join(td, src + ext), os.path.join(IMG, dst + ext))
            print("ภาพ:", os.path.join("image", dst + ext))
    for n in (1, 3):
        save(f"lesson-round{n}-scores", kclab.scores_svg(x, n))


def fig_urgency():
    _, snaps = kclab.load_scenario(args().scenario)
    t0 = K.CFG["urgency_t0_h"]
    W, H, x0, y0, pw, ph = 1500, 760, 110, 150, 1300, 470
    X = lambda t: x0 + pw * t / 168
    Y = lambda u: y0 + ph * (1 - u)
    S = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{R.FONT}">',
         f'<rect width="{W}" height="{H}" fill="#fff"/><rect width="{W}" height="64" fill="{TEAL}"/>',
         f'<text x="28" y="42" font-size="28" font-weight="700" fill="#fff">U = {t0} ÷ ({t0} + T) · T = จำนวนชั่วโมงก่อนถังสัปดาห์รีเซ็ต</text>',
         f'<text x="28" y="104" font-size="20" fill="#444">T น้อย (ใกล้รีเซ็ต) → U เข้าใกล้ 1 · T = {t0} ชม. → U = 0.5 · T มาก → U เข้าใกล้ 0 แต่ไม่ติดลบ</text>']
    for u in (0, 0.25, 0.5, 0.75, 1):
        S.append(f'<line x1="{x0}" y1="{Y(u)}" x2="{x0 + pw}" y2="{Y(u)}" stroke="#e5e7eb"/>'
                 f'<text x="{x0 - 14}" y="{Y(u) + 6}" font-size="18" text-anchor="end" fill="#555">{u:g}</text>')
    for t in range(0, 169, 24):
        S.append(f'<line x1="{X(t)}" y1="{y0}" x2="{X(t)}" y2="{y0 + ph}" stroke="#f1f3f5"/>'
                 f'<text x="{X(t)}" y="{y0 + ph + 28}" font-size="18" text-anchor="middle" fill="#555">{t}</text>')
    pts = " ".join(f"{X(t / 2):.1f},{Y(t0 / (t0 + t / 2)):.1f}" for t in range(0, 337))
    S.append(f'<polyline points="{pts}" fill="none" stroke="{ORANGE}" stroke-width="4"/>')
    S.append(f'<line x1="{X(t0)}" y1="{Y(0.5)}" x2="{X(t0)}" y2="{y0 + ph}" stroke="#999" stroke-dasharray="5 5"/>'
             f'<text x="{X(t0) + 10}" y="{Y(0.5) - 12}" font-size="18" fill="#666">T = {t0} → U = 0.5</text>')
    seen = {}
    for q in sorted(snaps, key=lambda q: q["hours_left"]):
        seen.setdefault(q["hours_left"], []).append(q)
    for k, (t, qs) in enumerate(seen.items()):
        u = qs[0]["use_first"]
        col = ORANGE if k == 0 else TEAL
        S.append(f'<circle cx="{X(t)}" cy="{Y(u)}" r="10" fill="{col}" stroke="#fff" stroke-width="3"/>')
        lab = " · ".join(q["account"] for q in qs) + f"  T = {t:g} → U = {u}"
        up = k % 2 == 0
        S.append(f'<text x="{X(t)}" y="{Y(u) + (-22 if up else 40)}" font-size="19" font-weight="700" text-anchor="{"start" if t < 60 else "middle"}" fill="{col}">{lab}</text>')
    S.append(f'<text x="{x0 + pw / 2}" y="{y0 + ph + 66}" font-size="19" text-anchor="middle" fill="#444">T (ชั่วโมงก่อนถังสัปดาห์รีเซ็ต)</text>')
    S.append(f'<text x="34" y="{y0 - 14}" font-size="19" fill="#444">U</text></svg>')
    save("lesson-urgency-curve", "\n".join(S))


def fig_sim():
    path = os.path.join(HERE, "sim_result.json")
    if not os.path.exists(path):
        print("ข้าม lesson-sim: ยังไม่มี tools/sim_result.json (รัน python tools/sim.py ก่อน)")
        return
    doc = json.load(open(path, encoding="utf-8"))
    res, pols = doc["result"], ["KC-QUEST", "most-headroom", "round-robin", "random"]
    col = {"KC-QUEST": ORANGE, "most-headroom": "#1c7ed6", "round-robin": "#2f9e44", "random": "#868e96"}
    W, H, x0, y0, ph = 1500, 820, 90, 190, 420
    gw = (W - x0 - 40) / len(res)
    S = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{R.FONT}">',
         f'<rect width="{W}" height="{H}" fill="#fff"/><rect width="{W}" height="64" fill="{TEAL}"/>',
         f'<text x="28" y="42" font-size="28" font-weight="700" fill="#fff">ผลจำลอง {doc["seeds"]} รอบต่อสถานการณ์ · เวลาจบโปรเจกต์เฉลี่ย (ยิ่งสั้นยิ่งดี)</text>']
    lx = 28
    for p in pols:
        S.append(f'<rect x="{lx}" y="88" width="22" height="22" rx="4" fill="{col[p]}"/>'
                 f'<text x="{lx + 30}" y="106" font-size="20" fill="#333">{p}</text>')
        lx += 60 + 13 * len(p)
    S.append(f'<text x="28" y="150" font-size="18" fill="#666">ตัวเลขบนแท่ง = เปอร์เซ็นต์เทียบกับวิธีที่เร็วที่สุดของสถานการณ์นั้น (100 = เร็วที่สุด) · ตัวเลขใต้ชื่อสถานการณ์ = นาทีของ KC-QUEST</text>')
    for g, (scen, r) in enumerate(res.items()):
        best = min(r[p]["minutes"] for p in pols)
        gx = x0 + g * gw
        bw = (gw - 40) / len(pols)
        for k, p in enumerate(pols):
            rel = r[p]["minutes"] / best
            h = ph * (rel - 0.8) / 0.7                 # แกนเริ่มที่ 80% เพื่อให้เห็นส่วนต่าง
            bx = gx + 14 + k * bw
            S.append(f'<rect x="{bx:.1f}" y="{y0 + ph - h:.1f}" width="{bw - 6:.1f}" height="{h:.1f}" fill="{col[p]}"/>'
                     f'<text x="{bx + (bw - 6) / 2:.1f}" y="{y0 + ph - h - 8:.1f}" font-size="17" text-anchor="middle" '
                     f'font-weight="{700 if p == "KC-QUEST" else 400}" fill="#333">{rel * 100:.0f}</text>')
        name = scen.split(" ", 1)
        S.append(f'<text x="{gx + gw / 2:.1f}" y="{y0 + ph + 30}" font-size="20" font-weight="700" text-anchor="middle" fill="{TEAL}">{name[0]}</text>')
        words, line, lines = name[1].split(" "), "", []
        for wd in words:
            if len(line) + len(wd) > 16 and line:
                lines.append(line)
                line = wd
            else:
                line = (line + " " + wd).strip()
        lines.append(line)
        for i, ln in enumerate(lines[:3]):
            S.append(f'<text x="{gx + gw / 2:.1f}" y="{y0 + ph + 56 + i * 22}" font-size="16" text-anchor="middle" fill="#444">{R.esc(ln)}</text>')
        S.append(f'<text x="{gx + gw / 2:.1f}" y="{y0 + ph + 132}" font-size="17" text-anchor="middle" fill="{ORANGE}">{r["KC-QUEST"]["minutes"]:g} นาที</text>')
    S.append(f'<line x1="{x0}" y1="{y0 + ph}" x2="{W - 40}" y2="{y0 + ph}" stroke="#333"/>')
    S.append(f'<text x="28" y="{H - 24}" font-size="17" fill="#666">แกนตั้งเริ่มที่ 80 เพื่อให้เห็นส่วนต่าง · รายละเอียดทุกตัวชี้วัดอยู่ใน tools/sim_result.md</text></svg>')
    save("lesson-sim", "\n".join(S))


FIGS = {"plan": fig_plan, "urgency": fig_urgency, "sim": fig_sim}


def main():
    os.makedirs(IMG, exist_ok=True)
    want = sys.argv[1:]
    for name, fn in FIGS.items():
        if not want or any(w in name for w in want):
            fn()
    return 0


if __name__ == "__main__":
    sys.exit(main())
