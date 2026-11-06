"""Build e2e/report/E2E-TEST-REPORT.xlsx from the last Playwright run.

Reads   e2e/test-cases.json   what each test checks and expects
        e2e/report/results.json  Playwright JSON reporter output
        e2e/defects.json      bugs found while testing
Writes  e2e/report/E2E-TEST-REPORT.xlsx and e2e/report/screenshots/<TC-ID>.png

Run after `npm run e2e`:  npm run e2e:report
"""

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "report"
SHOTS = REPORT / "screenshots"
OUT = REPORT / "E2E-TEST-REPORT.xlsx"

FONT = "Tahoma"  # professional and has Thai glyphs
ANSI = re.compile(r"\x1b\[[0-9;]*m")

cases = json.loads((ROOT / "test-cases.json").read_text(encoding="utf-8"))
results = json.loads((REPORT / "results.json").read_text(encoding="utf-8"))
defects = json.loads((ROOT / "defects.json").read_text(encoding="utf-8"))

# ---------- collect results by test id ----------
STATUS = {"passed": "Pass", "failed": "Fail", "timedOut": "Fail", "interrupted": "Fail", "skipped": "Skip"}
found = {}


def walk(suite, file=None):
    file = suite.get("file", file)
    for spec in suite.get("specs", []):
        m = re.search(r"TC-[A-Z]+-\d+", spec["title"])
        if not m:
            continue
        res = spec["tests"][0]["results"][-1] if spec["tests"][0]["results"] else {"status": "skipped"}
        shot = next((a.get("path") for a in res.get("attachments", []) if a.get("name") == "screenshot" and a.get("path")), None)
        err = ANSI.sub("", (res.get("error") or {}).get("message", "") or "")
        found[m.group(0)] = {
            "status": STATUS.get(res.get("status"), "Fail"),
            "seconds": round(res.get("duration", 0) / 1000, 2),
            "error": " ".join(err.strip().splitlines()[:4]),
            "shot": shot,
            "file": f"e2e/tests/{Path(spec.get('file') or file or '').name}:{spec.get('line', '')}",
        }
    for child in suite.get("suites", []):
        walk(child, file)


for s in results["suites"]:
    walk(s)

missing = [c["id"] for c in cases if c["id"] not in found]
extra = [i for i in found if i not in {c["id"] for c in cases}]
if missing or extra:
    raise SystemExit(f"test-cases.json and the run do not match. missing results: {missing} · not in catalog: {extra}")

# copy screenshots next to the report so links keep working after the next run
if SHOTS.exists():
    shutil.rmtree(SHOTS)
SHOTS.mkdir(parents=True)
for tc_id, r in found.items():
    if r["shot"] and Path(r["shot"]).exists():
        shutil.copy(r["shot"], SHOTS / f"{tc_id}.png")
        r["shot_rel"] = f"screenshots/{tc_id}.png"

stats = results.get("stats", {})
started = stats.get("startTime", "")
try:
    run_at = datetime.fromisoformat(started.replace("Z", "+00:00")).astimezone().strftime("%Y-%m-%d %H:%M")
except ValueError:
    run_at = started
pw_version = results.get("config", {}).get("version", "")

# ---------- styles ----------
thin = Side(style="thin", color="D0D0D0")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
HEAD_FILL = PatternFill("solid", fgColor="1F1F22")
HEAD_FONT = Font(name=FONT, bold=True, color="FFFFFF", size=10)
BODY = Font(name=FONT, size=10)
BOLD = Font(name=FONT, size=10, bold=True)
TITLE = Font(name=FONT, size=14, bold=True)
MUTED = Font(name=FONT, size=9, color="666666")
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="top", wrap_text=True)
PASS_FILL = PatternFill("solid", fgColor="D9F2E3")
FAIL_FILL = PatternFill("solid", fgColor="F9D6D5")
SKIP_FILL = PatternFill("solid", fgColor="EEEEEE")
LINK = Font(name=FONT, size=10, color="1F5FBF", underline="single")


def header(ws, row, titles, widths=None):
    for i, t in enumerate(titles, 1):
        c = ws.cell(row=row, column=i, value=t)
        c.font, c.fill, c.alignment, c.border = HEAD_FONT, HEAD_FILL, CENTER, BORDER
        if widths:
            ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]


wb = Workbook()

# ---------- sheet: Test Cases ----------
tc = wb.active
tc.title = "Test Cases"
cols = ["ลำดับ", "Test ID", "โมดูล", "สิ่งที่ทดสอบ", "ระดับ", "ประเภท", "เงื่อนไขก่อนทดสอบ",
        "ขั้นตอนการทดสอบ", "ผลที่คาดหวัง (Expected)", "ผลที่ได้จริง (Actual)", "สถานะ (Status)",
        "เวลา (วินาที)", "หลักฐาน", "ไฟล์ test", "วันที่ทดสอบ"]
widths = [7, 13, 15, 34, 8, 12, 26, 38, 46, 40, 11, 10, 14, 26, 16]
header(tc, 1, cols, widths)
tc.freeze_panes = "C2"

for i, c in enumerate(cases, 1):
    r = found[c["id"]]
    actual = "เป็นไปตามที่คาดหวัง" if r["status"] == "Pass" else ("ข้ามการทดสอบ" if r["status"] == "Skip" else r["error"])
    values = [i, c["id"], c["module"], c["title"], c["priority"], c["type"], c["pre"], c["steps"],
              c["expected"], actual, r["status"], r["seconds"], None, r["file"], run_at]
    row = i + 1
    for j, v in enumerate(values, 1):
        cell = tc.cell(row=row, column=j, value=v)
        cell.font, cell.border = BODY, BORDER
        cell.alignment = CENTER if j in (1, 2, 5, 6, 11, 12, 15) else WRAP
    if r.get("shot_rel"):
        cell = tc.cell(row=row, column=13, value="ดูภาพ")
        cell.hyperlink = r["shot_rel"]
        cell.font = LINK
    else:
        tc.cell(row=row, column=13, value="-").font = BODY
    tc.cell(row=row, column=12).number_format = "0.00"

last = len(cases) + 1
status_rng = f"K2:K{last}"
tc.conditional_formatting.add(status_rng, CellIsRule(operator="equal", formula=['"Pass"'], fill=PASS_FILL))
tc.conditional_formatting.add(status_rng, CellIsRule(operator="equal", formula=['"Fail"'], fill=FAIL_FILL))
tc.conditional_formatting.add(status_rng, CellIsRule(operator="equal", formula=['"Skip"'], fill=SKIP_FILL))
tc.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{last}"

# ---------- sheet: สรุปผล ----------
sm = wb.create_sheet("สรุปผล", 0)
for col, w in zip("ABCDEFG", [24, 12, 12, 12, 12, 14, 30]):
    sm.column_dimensions[col].width = w
sm["A1"] = "รายงานผลการทดสอบ E2E · ข้าวไหนดี (lunch-draw)"
sm["A1"].font = TITLE

info = [
    ("วันที่ทดสอบ", run_at),
    ("ระบบที่ทดสอบ", "http://localhost:3200 (next build + next start, ข้อมูลแยกที่ e2e/.data)"),
    ("เครื่องมือ", f"Playwright {pw_version} · Chromium (Desktop 1440×1000 และมือถือ 390×844)"),
    ("ข้อมูลเริ่มต้น", "data/restaurants.json 237 ร้าน · รีเซ็ตก่อนทุก test ผ่าน POST /api/test/reset"),
    ("เวลารวม (วินาที)", round(stats.get("duration", 0) / 1000, 1)),
]
for k, (label, val) in enumerate(info, 3):
    sm.cell(row=k, column=1, value=label).font = BOLD
    sm.cell(row=k, column=2, value=val).font = BODY

TCS = "'Test Cases'"
row0 = 10
sm.cell(row=row0 - 1, column=1, value="ผลตามระดับความสำคัญ").font = BOLD
header(sm, row0, ["ระดับ", "ทั้งหมด", "ผ่าน", "ล้ม", "ข้าม", "อัตราผ่าน"])
levels = [("P1 ร้ายแรง", "P1"), ("P2 ปานกลาง", "P2"), ("P3 เล็กน้อย", "P3")]
for k, (label, p) in enumerate(levels, row0 + 1):
    sm.cell(row=k, column=1, value=label)
    sm.cell(row=k, column=2, value=f'=COUNTIFS({TCS}!$E$2:$E${last},"{p}")')
    sm.cell(row=k, column=3, value=f'=COUNTIFS({TCS}!$E$2:$E${last},"{p}",{TCS}!$K$2:$K${last},"Pass")')
    sm.cell(row=k, column=4, value=f'=COUNTIFS({TCS}!$E$2:$E${last},"{p}",{TCS}!$K$2:$K${last},"Fail")')
    sm.cell(row=k, column=5, value=f'=COUNTIFS({TCS}!$E$2:$E${last},"{p}",{TCS}!$K$2:$K${last},"Skip")')
    sm.cell(row=k, column=6, value=f"=IF(B{k}=0,0,C{k}/B{k})")
tot = row0 + 4
sm.cell(row=tot, column=1, value="รวม")
for col in "BCDE":
    sm[f"{col}{tot}"] = f"=SUM({col}{row0 + 1}:{col}{tot - 1})"
sm[f"F{tot}"] = f"=IF(B{tot}=0,0,C{tot}/B{tot})"
for k in range(row0 + 1, tot + 1):
    for col in range(1, 7):
        c = sm.cell(row=k, column=col)
        c.font = BOLD if k == tot else BODY
        c.border = BORDER
        c.alignment = Alignment(horizontal="left" if col == 1 else "center")
    sm.cell(row=k, column=6).number_format = "0.0%"

mrow = tot + 3
sm.cell(row=mrow - 1, column=1, value="ผลตามโมดูล").font = BOLD
header(sm, mrow, ["โมดูล", "ทั้งหมด", "ผ่าน", "ล้ม", "ข้าม", "อัตราผ่าน"])
modules = list(dict.fromkeys(c["module"] for c in cases))
for k, m in enumerate(modules, mrow + 1):
    sm.cell(row=k, column=1, value=m)
    sm.cell(row=k, column=2, value=f'=COUNTIFS({TCS}!$C$2:$C${last},A{k})')
    sm.cell(row=k, column=3, value=f'=COUNTIFS({TCS}!$C$2:$C${last},A{k},{TCS}!$K$2:$K${last},"Pass")')
    sm.cell(row=k, column=4, value=f'=COUNTIFS({TCS}!$C$2:$C${last},A{k},{TCS}!$K$2:$K${last},"Fail")')
    sm.cell(row=k, column=5, value=f'=COUNTIFS({TCS}!$C$2:$C${last},A{k},{TCS}!$K$2:$K${last},"Skip")')
    sm.cell(row=k, column=6, value=f"=IF(B{k}=0,0,C{k}/B{k})")
    for col in range(1, 7):
        c = sm.cell(row=k, column=col)
        c.font, c.border = BODY, BORDER
        c.alignment = Alignment(horizontal="left" if col == 1 else "center")
    sm.cell(row=k, column=6).number_format = "0.0%"

crow = mrow + len(modules) + 3
sm.cell(row=crow - 1, column=1, value="เกณฑ์การปล่อยใช้งาน").font = BOLD
header(sm, crow, ["เกณฑ์", "ต้องได้", "ผลจริง", "ผ่านเกณฑ์"])
p1 = row0 + 1
sm.cell(row=crow + 1, column=1, value="P1 ผ่านทั้งหมด")
sm.cell(row=crow + 1, column=2, value="ล้ม 0 ข้อ")
sm.cell(row=crow + 1, column=3, value=f'=C{p1}&" / "&B{p1}')
sm.cell(row=crow + 1, column=4, value=f'=IF(D{p1}=0,"ผ่าน","ไม่ผ่าน")')
sm.cell(row=crow + 2, column=1, value="อัตราผ่านรวม")
sm.cell(row=crow + 2, column=2, value=0.95)
sm.cell(row=crow + 2, column=2).number_format = "0%"
sm.cell(row=crow + 2, column=3, value=f"=F{tot}")
sm.cell(row=crow + 2, column=3).number_format = "0.0%"
sm.cell(row=crow + 2, column=4, value=f'=IF(C{crow + 2}>=B{crow + 2},"ผ่าน","ไม่ผ่าน")')
sm.cell(row=crow + 3, column=1, value="สรุป")
sm.cell(row=crow + 3, column=4,
        value=f'=IF(AND(D{crow + 1}="ผ่าน",D{crow + 2}="ผ่าน"),"พร้อมปล่อยใช้งาน","ยังไม่พร้อม")')
for k in range(crow + 1, crow + 4):
    for col in range(1, 5):
        c = sm.cell(row=k, column=col)
        c.font = BOLD if k == crow + 3 else BODY
        c.border = BORDER
        c.alignment = Alignment(horizontal="left" if col == 1 else "center")
verdict = f"D{crow + 1}:D{crow + 3}"
sm.conditional_formatting.add(verdict, FormulaRule(formula=[f'OR(D{crow + 1}="ผ่าน",D{crow + 1}="พร้อมปล่อยใช้งาน")'], fill=PASS_FILL))
sm.conditional_formatting.add(verdict, FormulaRule(formula=[f'OR(D{crow + 1}="ไม่ผ่าน",D{crow + 1}="ยังไม่พร้อม")'], fill=FAIL_FILL))
note = sm.cell(row=crow + 5, column=1,
               value="เกณฑ์ 95% เป็นค่าเดียวกับแผนทดสอบของ PawPantry (week01/TEST-PLAN.md) · ตัวเลขทั้งหมดคำนวณจากชีต Test Cases ด้วยสูตร")
note.font = MUTED

# ---------- sheet: Defects ----------
df = wb.create_sheet("Defects")
dcols = ["รหัสบั๊ก", "Test ID", "ความรุนแรง", "วันที่พบ", "อาการ", "รายละเอียด", "สาเหตุ", "การแก้ไข", "สถานะ"]
header(df, 1, dcols, [10, 13, 12, 12, 34, 34, 44, 44, 18])
rows_d = list(defects)
# anything failing in this run that is not logged yet
logged = {d["test"] for d in defects}
for c in cases:
    r = found[c["id"]]
    if r["status"] == "Fail" and c["id"] not in logged:
        rows_d.append({"id": f"BUG-{len(rows_d) + 1:02d}", "test": c["id"],
                       "severity": {"P1": "สูง (P1)", "P2": "ปานกลาง (P2)", "P3": "ต่ำ (P3)"}[c["priority"]],
                       "found": run_at[:10], "title": c["title"], "detail": r["error"],
                       "cause": "ยังไม่ได้วิเคราะห์", "fix": "-", "status": "เปิดอยู่"})
for i, d in enumerate(rows_d, 2):
    for j, key in enumerate(["id", "test", "severity", "found", "title", "detail", "cause", "fix", "status"], 1):
        cell = df.cell(row=i, column=j, value=d[key])
        cell.font, cell.border = BODY, BORDER
        cell.alignment = CENTER if j in (1, 2, 3, 4, 9) else WRAP
df.freeze_panes = "A2"

for ws in wb.worksheets:
    ws.sheet_view.showGridLines = ws.title != "สรุปผล"

# formulas are written without cached values: let Excel compute them when the file opens
wb.calculation.fullCalcOnLoad = True

REPORT.mkdir(parents=True, exist_ok=True)
wb.save(OUT)
passed = sum(1 for r in found.values() if r["status"] == "Pass")
print(f"wrote {OUT} · {passed}/{len(found)} passed · {len(rows_d)} defect rows · screenshots: {len(list(SHOTS.glob('*.png')))}")
