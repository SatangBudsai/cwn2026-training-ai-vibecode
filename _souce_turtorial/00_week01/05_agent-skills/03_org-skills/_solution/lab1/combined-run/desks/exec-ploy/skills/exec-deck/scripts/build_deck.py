#!/usr/bin/env python3
"""exec-deck: สร้างสไลด์ประชุมผู้บริหาร (HTML 16:9 + PDF) จาก monthly-kpi.csv + content.json

ใช้:  python build_deck.py --kpi monthly-kpi.csv --content content.json --out work/ [--logo logo.svg] [--no-pdf]

- ตัวเลข/สีของการ์ด KPI คำนวณจาก CSV เอง (ผ่านเป้า = Teal, ต่ำกว่าเป้า = Spark Orange ได้ 1 จุดต่อหน้า)
- ข้อความ (หัวสไลด์แบบประโยค, bullet, เรื่องให้ MD ตัดสิน) มาจาก content.json ที่ Claude เขียน
- PDF พิมพ์ด้วย Edge/Chrome แบบ headless (ถ้าหาไม่เจอจะได้แค่ HTML และพิมพ์คำเตือน)
ใช้แค่ standard library
"""
import argparse, csv, html, json, os, shutil, subprocess, sys
from pathlib import Path

NAVY, TEAL, ORANGE, CLOUD, INK, LINE = "#0B2545", "#13A89E", "#F26B38", "#F4F6F8", "#1F2933", "#CBD2D9"
TH_MONTH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
LOWER_IS_BETTER = {"incidents_sev1", "incidents_sev2", "attrition", "deals_lost"}
LABEL = {
    "revenue": "รายได้", "gross_margin": "กำไรขั้นต้น", "pipeline_value": "มูลค่า pipeline",
    "deals_won": "ดีลที่ชนะ", "deals_lost": "ดีลที่แพ้", "win_rate": "Win rate (อัตราชนะ)",
    "projects_active": "โปรเจกต์ที่ดำเนินอยู่", "projects_on_time": "ส่งมอบตรงเวลา",
    "incidents_sev1": "เหตุขัดข้อง Sev1", "incidents_sev2": "เหตุขัดข้อง Sev2",
    "headcount": "พนักงาน", "open_positions": "ตำแหน่งว่าง", "attrition": "ลาออก",
    "customer_nps": "NPS ลูกค้า",
}
# การ์ด KPI ของแต่ละสไลด์ เรียงตามที่ MD อยากเห็นก่อน
SLIDE_TILES = {
    "finance": ["revenue", "gross_margin"],
    "pipeline": ["pipeline_value", "win_rate", "deals_won"],
    "delivery": ["projects_on_time", "incidents_sev1", "customer_nps"],
    "people": ["headcount", "open_positions", "attrition"],
}


def th_month(ym):
    y, m = ym.split("-")
    return f"{TH_MONTH[int(m)]} {y}"


def num(v):
    v = (v or "").strip()
    return float(v) if v else None


def load_kpi(path, cur, prev):
    rows = {}
    with open(path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            rows[r["metric"]] = {
                "unit": r["unit"], "cur": num(r.get(cur)), "prev": num(r.get(prev)),
                "target": num(r.get("target_monthly")), "note": (r.get("note") or "").strip(),
            }
    return rows


def fmt(v, unit):
    if v is None:
        return "-"
    if unit == "THB":
        return f"{v/1e6:,.2f}"
    if unit == "pct":
        return f"{v:.1f}"
    return f"{v:,.0f}"


def unit_suffix(unit):
    return {"THB": "ล้านบาท", "pct": "%", "people": "คน", "count": "", "score": ""}.get(unit, "")


def status(metric, k):
    """'good' | 'bad' | None (ไม่มีเป้า)"""
    if k["target"] is None or k["cur"] is None:
        return None
    ok = k["cur"] <= k["target"] if metric in LOWER_IS_BETTER else k["cur"] >= k["target"]
    return "good" if ok else "bad"


def delta_text(metric, k):
    c, p, u = k["cur"], k["prev"], k["unit"]
    if c is None or p is None:
        return ""
    if u == "pct":
        d = c - p
        return f"{'+' if d >= 0 else ''}{d:.1f} จุด จากเดือนก่อน"
    if u == "THB":
        d = (c - p) / p * 100 if p else 0
        return f"{'+' if d >= 0 else ''}{d:.1f}% จากเดือนก่อน"
    d = c - p
    return f"{'+' if d >= 0 else ''}{d:,.0f} จากเดือนก่อน"


def tile(metric, k, allow_orange, kpi):
    st = status(metric, k)
    color = INK
    badge = ""
    if st == "good":
        color, badge = TEAL, '<span class="badge good">ผ่านเป้า</span>'
    elif st == "bad":
        color = ORANGE if allow_orange else INK
        badge = '<span class="badge bad">ต่ำกว่าเป้า</span>' if allow_orange else '<span class="badge plain">ต่ำกว่าเป้า</span>'
    value = fmt(k["cur"], k["unit"])
    suffix = unit_suffix(k["unit"])
    if metric == "projects_on_time" and "projects_active" in kpi:
        act = kpi["projects_active"]["cur"]
        value = f"{k['cur']:.0f}/{act:.0f}"
        suffix = "โปรเจกต์"
    tgt = ""
    if k["target"] is not None:
        tgt = f'เป้า {fmt(k["target"], k["unit"])} {suffix}'.strip()
    return (f'<div class="tile"><div class="tl">{html.escape(LABEL.get(metric, metric))} {badge}</div>'
            f'<div class="tv" style="color:{color}">{value}<small> {suffix}</small></div>'
            f'<div class="ts">{html.escape(tgt)}{" · " if tgt and delta_text(metric, k) else ""}{html.escape(delta_text(metric, k))}</div></div>')


def tiles_html(name, kpi):
    out, orange_used = [], False
    for m in SLIDE_TILES[name]:
        if m not in kpi:
            continue
        bad = status(m, kpi[m]) == "bad"
        out.append(tile(m, kpi[m], bad and not orange_used, kpi))
        orange_used = orange_used or bad
    return '<div class="tiles">' + "".join(out) + "</div>", orange_used


def bar_chart(metric, k, prev_label, cur_label):
    """แท่ง 2 เดือน: เดือนก่อน Teal (ซีรีส์เทียบ), เดือนนี้ Navy (ซีรีส์หลัก), เป้า = เส้นประ Line Gray"""
    vals = [k["prev"] or 0, k["cur"] or 0]
    top = max(vals + [k["target"] or 0]) * 1.15 or 1
    W, H, base = 360, 220, 190
    def y(v):
        return base - v / top * 160
    bars = ""
    for i, (v, lab, col) in enumerate([(vals[0], prev_label, TEAL), (vals[1], cur_label, NAVY)]):
        x = 70 + i * 140
        bars += (f'<rect x="{x}" y="{y(v):.1f}" width="80" height="{base - y(v):.1f}" fill="{col}" rx="3"/>'
                 f'<text x="{x+40}" y="{y(v)-8:.1f}" text-anchor="middle" class="cv">{fmt(v, k["unit"])}</text>'
                 f'<text x="{x+40}" y="{base+22}" text-anchor="middle" class="cl">{lab}</text>')
    tline = ""
    if k["target"] is not None:
        ty = y(k["target"])
        tline = (f'<line x1="40" x2="{W-10}" y1="{ty:.1f}" y2="{ty:.1f}" stroke="{LINE}" stroke-width="2.5" stroke-dasharray="7 5"/>'
                 f'<text x="{W-10}" y="{ty-6:.1f}" text-anchor="end" class="cl">เป้า {fmt(k["target"], k["unit"])}</text>')
    title = f'{LABEL.get(metric, metric)} ({unit_suffix(k["unit"])})'
    return (f'<figure class="chart"><figcaption>{html.escape(title)}</figcaption>'
            f'<svg viewBox="0 0 {W} {H+10}" role="img" aria-label="{html.escape(title)}">'
            f'<line x1="40" x2="{W-10}" y1="{base}" y2="{base}" stroke="{LINE}"/>{bars}{tline}</svg></figure>')


def bullets(items, limit):
    items = items or []
    if len(items) > limit:
        print(f"[warn] bullet เกิน {limit} บรรทัด ตัดเหลือ {limit}: {items[limit:]}", file=sys.stderr)
    return "<ul>" + "".join(f"<li>{html.escape(t)}</li>" for t in items[:limit]) + "</ul>"


def logo_variants(logo_svg):
    navy = logo_svg
    # เวอร์ชันพื้นเข้ม: กรอบ+ชื่อเป็นขาว ตัว N เป็น Navy (ยังอ่านออก) จุด Teal คงเดิม
    white = (logo_svg.replace('fill="#0B2545"/>', 'fill="#FFFFFF"/>', 1)
             .replace('fill="#FFFFFF"/>\n  <circle', 'fill="#0B2545"/>\n  <circle', 1)
             .replace('fill="#0B2545">Novatech', 'fill="#FFFFFF">Novatech'))
    return navy, white


CSS = f"""
@page {{ size: 1280px 720px; margin: 0; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; background: #E5E9ED; color: {INK};
  font-family: 'IBM Plex Sans Thai', 'Leelawadee UI', Tahoma, sans-serif; }}
.slide {{ width: 1280px; height: 720px; position: relative; overflow: hidden; background: #fff;
  margin: 24px auto; box-shadow: 0 2px 12px rgba(0,0,0,.12); page-break-after: always; break-after: page; }}
.bar {{ background: {NAVY}; color: #fff; padding: 26px 48px 22px; min-height: 120px; }}
.bar .sec {{ font-size: 16px; letter-spacing: .04em; color: #A9C4E0; margin-bottom: 6px; }}
.bar h2 {{ margin: 0; font-size: 34px; font-weight: 600; line-height: 1.3; }}
.body {{ padding: 28px 48px 0; font-size: 22px; line-height: 1.55; }}
.tiles {{ display: flex; gap: 20px; margin-bottom: 22px; }}
.tile {{ flex: 1; background: {CLOUD}; border-radius: 8px; padding: 16px 20px; border-top: 4px solid {LINE}; }}
.tl {{ font-size: 18px; color: {INK}; }}
.tv {{ font-variant-numeric: tabular-nums; font-size: 46px; font-weight: 600; line-height: 1.2; margin: 4px 0; }}
.tv small {{ font-family: 'IBM Plex Sans Thai', sans-serif; font-size: 18px; font-weight: 400; color: {INK}; }}
.ts {{ font-size: 16px; color: #52606D; }}
.badge {{ font-size: 13px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }}
.badge.good {{ background: {TEAL}; color: #fff; }}
.badge.bad {{ background: {ORANGE}; color: #fff; }}
.badge.plain {{ border: 1px solid {LINE}; color: {INK}; }}
ul {{ margin: 0; padding-left: 26px; }} li {{ margin-bottom: 6px; }}
.two {{ display: flex; gap: 32px; align-items: flex-start; }} .two > div {{ flex: 1; }}
.chart {{ margin: 0; flex: 0 0 380px; }} .chart figcaption {{ font-size: 16px; color: #52606D; }}
.chart .cv {{ font-family: 'IBM Plex Mono', monospace; font-size: 15px; fill: {INK}; }}
.chart .cl {{ font-size: 14px; fill: #52606D; }}
.logo {{ position: absolute; right: 48px; bottom: 22px; width: 120px; }}
.foot {{ position: absolute; left: 48px; bottom: 26px; font-size: 13px; color: #7B8794; }}
.cover {{ background: {NAVY}; color: #fff; padding: 48px; }}
.cover .clogo {{ width: 200px; }}
.logo svg, .clogo svg {{ width: 100%; height: auto; display: block; }}
.cover h1 {{ font-size: 54px; font-weight: 600; margin: 120px 0 10px; }}
.cover .sub {{ font-size: 26px; color: #CFE0F0; }}
.cover .meta {{ position: absolute; left: 48px; bottom: 48px; font-size: 18px; color: #A9C4E0; }}
.sum {{ display: flex; flex-direction: column; gap: 18px; }}
.sum .row {{ display: flex; gap: 20px; background: {CLOUD}; border-radius: 8px; padding: 18px 22px; border-left: 8px solid {LINE}; }}
.sum .k {{ flex: 0 0 140px; font-weight: 600; font-size: 24px; }}
.sum .row.good {{ border-left-color: {TEAL}; }} .sum .row.good .k {{ color: {TEAL}; }}
.sum .row.decide {{ border-left-color: {ORANGE}; }} .sum .row.decide .k {{ color: {ORANGE}; }}
table {{ border-collapse: collapse; width: 100%; font-size: 18px; }}
th {{ background: {NAVY}; color: #fff; text-align: left; padding: 9px 12px; font-weight: 600; }}
td {{ padding: 9px 12px; border-bottom: 1px solid {LINE}; vertical-align: top; }}
tr:nth-child(even) td {{ background: {CLOUD}; }}
td.n {{ font-family: 'IBM Plex Mono', monospace; white-space: nowrap; }}
.hot {{ color: {ORANGE}; font-weight: 600; }}
.note {{ font-size: 16px; color: #52606D; margin-top: 10px; }}
@media print {{ body {{ background: #fff; }} .slide {{ margin: 0; box-shadow: none; }} }}
"""


def slide(sec, headline, inner, logo, page, total, foot):
    return (f'<section class="slide"><div class="bar"><div class="sec">{html.escape(sec)}</div>'
            f'<h2>{html.escape(headline)}</h2></div><div class="body">{inner}</div>'
            f'<div class="foot">{html.escape(foot)} · {page}/{total}</div><div class="logo">{logo}</div></section>')


def build(kpi_path, content_path, out_dir, logo_path, make_pdf):
    c = json.loads(Path(content_path).read_text(encoding="utf-8"))
    cur, prev = c["month"], c["prev_month"]
    kpi = load_kpi(kpi_path, cur, prev)
    logo_navy, logo_white = logo_variants(Path(logo_path).read_text(encoding="utf-8"))
    foot = c.get("footer", "โนวาเทค · เอกสารภายในผู้บริหาร")
    S = c["slides"]
    total = 7
    out = []
    # 1 ปก
    out.append(f'<section class="slide cover"><div class="clogo">{logo_white}</div>'
               f'<h1>{html.escape(c["title"])}</h1><div class="sub">{html.escape(c.get("subtitle", ""))}</div>'
               f'<div class="meta">วันประชุม {html.escape(c["meeting_date"])} · ข้อมูลเดือน {th_month(cur)} · จัดทำโดย {html.escape(c.get("prepared_by", ""))}</div></section>')
    # 2 สรุป 3 บรรทัด
    sm = c["summary"]
    rows = "".join(f'<div class="row {cls}"><div class="k">{lab}</div><div>{html.escape(sm[key])}</div></div>'
                   for key, lab, cls in [("good", "ดี", "good"), ("watch", "น่าห่วง", ""), ("decide", "ต้องตัดสินใจ", "decide")])
    out.append(slide("สรุป 3 บรรทัด", S["summary_headline"], f'<div class="sum">{rows}</div>', logo_navy, 2, total, foot))
    # 3-6 KPI slides
    secs = [("finance", "ตัวเลขการเงิน", "revenue"), ("pipeline", "Pipeline และดีลที่รออนุมัติ", None),
            ("delivery", "การส่งมอบโปรเจกต์และเหตุขัดข้อง", None), ("people", "คน", None)]
    for i, (name, sec, chart_metric) in enumerate(secs, start=3):
        s = S[name]
        t, orange_used = tiles_html(name, kpi)
        inner = t
        if name == "finance":
            inner += ('<div class="two">' + bar_chart("revenue", kpi["revenue"], th_month(prev), th_month(cur))
                      + bar_chart("gross_margin", kpi["gross_margin"], th_month(prev), th_month(cur))
                      + f'<div>{bullets(s.get("bullets"), 3)}</div></div>')
        elif name == "pipeline" and s.get("deals"):
            trs = "".join(
                f'<tr><td>{html.escape(d["id"])}</td><td>{html.escape(d["customer"])}</td>'
                f'<td class="n">{html.escape(d["value"])}</td><td class="n">{html.escape(d["margin"])}</td>'
                f'<td>{html.escape(d["status"])}</td></tr>' for d in s["deals"])
            inner += (f'<table><tr><th>ดีล</th><th>ลูกค้า</th><th>มูลค่า (ไม่รวม VAT)</th><th>Margin</th><th>สถานะ</th></tr>{trs}</table>'
                      + (f'<div class="note">{html.escape(" · ".join(s.get("bullets", [])))}</div>' if s.get("bullets") else ""))
        else:
            inner += bullets(s.get("bullets"), 3)
        out.append(slide(sec, s["headline"], inner, logo_navy, i, total, foot))
    # 7 เรื่องให้ MD ตัดสิน
    d = S["decisions"]
    trs = ""
    for j, it in enumerate(d["items"][:4], 1):
        dl = html.escape(it.get("deadline", ""))
        if j == 1 and dl:  # Spark Orange 1 จุด = เรื่องเร่งที่สุด
            dl = f'<span class="hot">{dl}</span>'
        trs += (f'<tr><td class="n">{j}</td><td><b>{html.escape(it["topic"])}</b><br>{html.escape(it["detail"])}</td>'
                f'<td>{html.escape(it["ask"])}</td><td>{dl}</td></tr>')
    if len(d["items"]) > 4:
        print("[warn] เรื่องให้ตัดสินเกิน 4 เรื่อง ตัดเหลือ 4", file=sys.stderr)
    out.append(slide("เรื่องที่ขอให้ MD ตัดสิน", d["headline"],
                     f'<table><tr><th>#</th><th>เรื่อง</th><th>ขอให้ตัดสิน</th><th>ภายใน</th></tr>{trs}</table>',
                     logo_navy, 7, total, foot))

    doc = (f'<!doctype html><html lang="th"><head><meta charset="utf-8">'
           f'<meta name="viewport" content="width=device-width, initial-scale=1">'
           f'<title>{html.escape(c["title"])}</title>'
           f'<link rel="preconnect" href="https://fonts.googleapis.com">'
           f'<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+Thai:wght@400;600&display=swap" rel="stylesheet">'
           f'<style>{CSS}</style></head><body>{"".join(out)}</body></html>')
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = c.get("file_stem", f"exec-deck-{cur}")
    html_path = out_dir / f"{stem}.html"
    html_path.write_text(doc, encoding="utf-8")
    print(f"HTML: {html_path}")
    if make_pdf:
        pdf_path = out_dir / f"{stem}.pdf"
        browser = find_browser()
        if not browser:
            print("[warn] ไม่พบ Edge/Chrome — เปิด HTML แล้วสั่ง Print > Save as PDF เอง", file=sys.stderr)
            return
        subprocess.run([browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        "--virtual-time-budget=8000", f"--print-to-pdf={pdf_path.resolve()}",
                        html_path.resolve().as_uri()], check=False, capture_output=True)
        print(f"PDF: {pdf_path}" if pdf_path.exists() else "[warn] สร้าง PDF ไม่สำเร็จ")


def find_browser():
    for name in ["msedge", "chrome", "google-chrome", "chromium", "chromium-browser"]:
        p = shutil.which(name)
        if p:
            return p
    for p in [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]:
        if os.path.exists(p):
            return p
    return None


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--kpi", required=True)
    ap.add_argument("--content", required=True)
    ap.add_argument("--out", default="work")
    ap.add_argument("--logo", default=str(Path(__file__).resolve().parent.parent / "assets" / "logo.svg"))
    ap.add_argument("--no-pdf", action="store_true")
    a = ap.parse_args()
    build(a.kpi, a.content, a.out, a.logo, not a.no_pdf)
