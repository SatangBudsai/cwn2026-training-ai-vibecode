# ทำผลงาน LAB 1 ของ 5 โต๊ะ (sales-nida, md-somchai, fin-joy, hr-fah, ml-jay) ให้เป็นไฟล์ Word / Excel แบบที่บริษัทใช้จริง
# เนื้อหามาจากไฟล์ .md ที่ Claude เขียนตอนรันจริงทุกตัวอักษร (แค่แปลงรูปแบบ) · ใช้ pandoc + python-docx + openpyxl
# python lab1-office-files.py   (รันที่โฟลเดอร์ _solution/tools/)
import csv, re, subprocess
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

DESKS = Path(__file__).resolve().parent.parent / 'desks-after-lab1'
FONT, NAVY, GRAY, LINE = 'Leelawadee UI', '0B2545', 'F4F6F8', 'CBD2D9'   # สีจาก company-kit/brand-guide.md

def set_font(el, size=None, bold=None, color=None):
    rpr = el.get_or_add_rPr()
    fonts = rpr.find(qn('w:rFonts'))
    if fonts is None:
        fonts = OxmlElement('w:rFonts'); rpr.insert(0, fonts)
    for k in ('w:ascii', 'w:hAnsi', 'w:cs', 'w:eastAsia'):
        fonts.set(qn(k), FONT)
    if size:
        for tag in ('w:sz', 'w:szCs'):
            e = rpr.find(qn(tag))
            if e is None:
                e = OxmlElement(tag); rpr.append(e)
            e.set(qn('w:val'), str(size * 2))

def borders(table):
    tblPr = table._tbl.tblPr
    b = OxmlElement('w:tblBorders')
    for side in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement(f'w:{side}'); e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '4'); e.set(qn('w:color'), LINE); b.append(e)
    tblPr.append(b)
    for cell in table.rows[0].cells:                       # แถวหัวตารางพื้น Cloud Gray
        shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear'); shd.set(qn('w:fill'), GRAY)
        cell._tc.get_or_add_tcPr().append(shd)

def to_docx(md: Path, out: Path, header: str):
    subprocess.run(['pandoc', str(md), '-f', 'gfm', '-o', str(out)], check=True)
    doc = Document(out)
    for st in doc.styles:
        if st.type == 1 and hasattr(st, 'element'):
            set_font(st.element, size=11 if st.name in ('Normal', 'Body Text', 'First Paragraph', 'Compact') else None)
            if st.name.startswith('Heading') or st.name == 'Title':
                st.font.color.rgb = RGBColor.from_string(NAVY)
    for p in doc.paragraphs:
        for r in p.runs: set_font(r._element)
    for t in doc.tables:
        borders(t)
        for row in t.rows:
            for c in row.cells:
                for p in c.paragraphs:
                    p.paragraph_format.space_after = Pt(0)
                    for r in p.runs: set_font(r._element); r.font.size = Pt(9.5)
    sec = doc.sections[0]
    sec.left_margin = sec.right_margin = Pt(54)
    hp = sec.header.paragraphs[0]; hp.text = header
    for r in hp.runs: set_font(r._element); r.font.size = Pt(9); r.font.color.rgb = RGBColor.from_string(NAVY); r.bold = True
    doc.save(out)

def md_table(md: Path, first_col: str):
    """ตาราง markdown ตัวแรกที่หัวคอลัมน์แรกเป็น first_col → list ของแถว (ไม่รวมหัว)"""
    lines = md.read_text(encoding='utf-8').splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith(f'| {first_col} |'))
    rows = []
    for l in lines[start + 2:]:
        if not l.startswith('|'): break
        rows.append([c.strip().strip('*') for c in l.strip('|').split('|')])
    return rows

num = lambda s: float(s.replace(',', '').replace('−', '-')) if re.search(r'\d', s or '') else None

def sheet_style(ws, header_row, widths):
    thin = Side(style='thin', color=LINE)
    for c in ws[header_row]:
        c.font = Font(name=FONT, bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=NAVY)
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for row in ws.iter_rows(min_row=1):
        for c in row:
            if c.font.name != FONT: c.font = Font(name=FONT, bold=c.font.bold, color=c.font.color)
            if c.row >= header_row:
                c.border = Border(top=thin, bottom=thin, left=thin, right=thin)
                if c.row > header_row: c.alignment = Alignment(vertical='center', wrap_text=c.alignment.wrap_text)
    for col, w in widths.items(): ws.column_dimensions[col].width = w
    ws.freeze_panes = ws.cell(row=header_row + 1, column=1)
    ws.page_setup.orientation = 'landscape'; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True

def title(ws, text, sub):
    ws['A1'] = text; ws['A1'].font = Font(name=FONT, size=14, bold=True, color=NAVY)
    ws['A2'] = sub; ws['A2'].font = Font(name=FONT, size=10, color='52606D')

# ---------- sales-nida ----------
nida = DESKS / 'sales-nida' / 'work'
to_docx(nida / 'deal-001-proposal-nakhonluang-queue.md', nida / 'deal-001-proposal-nakhonluang-queue.docx', 'บริษัท โนวาเทค จำกัด · ข้อเสนอโครงการ (Proposal)')

wb = Workbook(); ws = wb.active; ws.title = 'ราคาลูกค้า'
title(ws, 'ใบคิดราคา deal-001 · ธนาคารนครหลวงพัฒนา', 'คิดโดย sales-nida · ราคาไม่รวม VAT · สูตรคำนวณในเซลล์ แก้จำนวนแล้วยอดเปลี่ยนเอง')
ws.append([]); ws.append(['รหัส', 'รายการ', 'จำนวน', 'หน่วย', 'ราคาต่อหน่วย', 'รวม (บาท)'])
r0 = ws.max_row + 1
for code, item, qty, unit_price, total in md_table(nida / 'deal-001-pricing-output.md', 'รหัส'):
    if not code: break
    q, u = qty.split(' ', 1)
    r = ws.max_row + 1
    ws.append([code, item, float(q), u, num(unit_price), f'=C{r}*E{r}'])
r1 = ws.max_row
ws.append(['', 'ส่วนลดพิเศษ', None, None, None, -300000])
d = ws.max_row
ws.append(['', 'รวมก่อน VAT', None, None, None, f'=SUM(F{r0}:F{d})']); s = ws.max_row
ws.append(['', 'VAT 7%', None, None, None, f'=ROUND(F{s}*0.07,0)']); v = ws.max_row
ws.append(['', 'รวมทั้งสิ้น', None, None, None, f'=F{s}+F{v}']); t = ws.max_row
sheet_style(ws, 4, {'A': 12, 'B': 58, 'C': 9, 'D': 11, 'E': 15, 'F': 16})
for row in ws.iter_rows(min_row=r0, max_row=t):
    for c in row[4:6]: c.number_format = '#,##0'
    row[1].alignment = Alignment(wrap_text=True, vertical='center')
for rr in (s, t): ws[f'B{rr}'].font = ws[f'F{rr}'].font = Font(name=FONT, bold=True)
wb.save(nida / 'deal-001-pricing.xlsx')

# ---------- md-somchai ----------
md = DESKS / 'md-somchai' / 'work' / 'DS-2026-034'
to_docx(md / 'approval.md', md / 'approval.docx', 'บริษัท โนวาเทค จำกัด · บันทึกผลพิจารณาดีล (ภายใน)')

# ---------- fin-joy ----------
joy = DESKS / 'fin-joy' / 'work'
to_docx(joy / 'deal-001-B-quotation-draft.md', joy / 'deal-001-B-quotation-draft.docx', 'บริษัท โนวาเทค จำกัด · ร่างตารางราคา (จากฝ่ายบัญชี)')

wb = Workbook(); ws = wb.active; ws.title = 'คิดราคา ฉบับ B'
title(ws, 'คิดราคา (ภายใน) deal-001 ฉบับ B เข้างบ 4.8M', '⚠️ เอกสารภายใน มีต้นทุนและ margin ห้ามส่งลูกค้า · คิดโดย fin-joy · บวก buffer 10% ใน man-day แล้ว')
ws.append([]); ws.append(['รหัส', 'รายการ', 'ประเมิน', 'จำนวน (รวม buffer)', 'หน่วย', 'ราคา/หน่วย', 'ราคาขาย', 'ต้นทุน/หน่วย', 'ต้นทุน', 'margin บรรทัด', 'หมายเหตุ'])
r0 = ws.max_row + 1
for code, item, est, qty, unit, price, _sale, cpu, _cost, _m, note in md_table(joy / 'deal-001-B-pricing-internal.md', 'รหัส'):
    if code in ('—', ''): break
    r = ws.max_row + 1
    ws.append([code, item, num(est), num(qty), unit, num(price), f'=D{r}*F{r}', num(cpu), f'=D{r}*H{r}', f'=(G{r}-I{r})/G{r}', note])
r1 = ws.max_row
ws.append(['—', 'ส่วนลดพิเศษ', None, None, None, None, -619000, None, None, None, 'ปิดส่วนต่างให้เข้างบ 4.8M · 13.7% > 10% → ต้องให้ MD อนุมัติ']); d = ws.max_row
ws.append(['', 'รวม', None, None, None, None, f'=SUM(G{r0}:G{d})', None, f'=SUM(I{r0}:I{r1})', f'=(G{d+1}-I{d+1})/G{d+1}', '']); tot = ws.max_row
ws.append([]); ws.append(['', 'VAT 7%', None, None, None, None, f'=ROUND(G{tot}*0.07,0)']); v = ws.max_row
ws.append(['', 'รวมทั้งสิ้น', None, None, None, None, f'=G{tot}+G{v}'])
ws.append(['', 'ผู้อนุมัติ', None, None, None, None, 'MD (md-somchai)'])
sheet_style(ws, 4, {'A': 11, 'B': 40, 'C': 9, 'D': 11, 'E': 9, 'F': 12, 'G': 14, 'H': 12, 'I': 14, 'J': 11, 'K': 48})
for row in ws.iter_rows(min_row=r0, max_row=ws.max_row):
    for c in (row[5], row[6], row[7], row[8]): c.number_format = '#,##0'
    row[9].number_format = '0.0%'
    for c in (row[1], row[10]): c.alignment = Alignment(wrap_text=True, vertical='center')
for c in ws[tot]: c.font = Font(name=FONT, bold=True)
wb.save(joy / 'deal-001-B-pricing-internal.xlsx')
# ---------- hr-fah ----------
fah = DESKS / 'hr-fah' / 'work'
to_docx(fah / 'NVT-JOB-2026-021-senior-fullstack.md', fah / 'NVT-JOB-2026-021-senior-fullstack.docx', 'บริษัท โนวาเทค จำกัด · ประกาศรับสมัครงาน NVT-JOB-2026-021')

# ---------- ml-jay ----------
jay = DESKS / 'ml-jay' / 'work'
to_docx(jay / '2026-W45-queue-forecast-experiments.md', jay / '2026-W45-queue-forecast-experiments.docx', 'บริษัท โนวาเทค จำกัด · ทีม ML · บันทึกการทดลองประจำสัปดาห์ (ภายใน)')
rows = list(csv.DictReader(open(jay / 'experiment-registry.csv', encoding='utf-8')))
wb = Workbook(); ws = wb.active; ws.title = 'สรุป run'
title(ws, 'ทะเบียนการทดลอง · โมเดลพยากรณ์คิวสาขา', 'จัดทำโดย ml-jay · สัปดาห์ 45 · เกณฑ์ TOR: MAPE ≤ 20% · ข้อมูลเต็มทุกคอลัมน์อยู่ในชีต "ทะเบียนเต็ม"')
ws.append([])
cols = [('run_id', 'run'), ('run_name', 'ชื่อ'), ('model', 'โมเดล'), ('data_version', 'ข้อมูล'), ('n_branches', 'สาขา'), ('seed', 'seed'),
        ('MAPE_pct', 'MAPE %'), ('MAPE_payday_pct', 'MAPE วันเงินเดือนออก %'), ('MAPE_holiday_week_pct', 'MAPE สัปดาห์วันหยุด %'), ('status', 'สถานะ'), ('decision', 'การตัดสินใจ')]
ws.append([h for _, h in cols])
fill = {'production': 'E5E7EB', 'superseded': 'F4F6F8', 'candidate': 'FEF3C7', 'planned': 'DBEAFE'}
for r in rows:
    ws.append([num(r[k]) if k.endswith('_pct') or k == 'n_branches' else r[k] for k, _ in cols])
    for c in ws[ws.max_row]: c.fill = PatternFill('solid', fgColor=fill.get(r['status'], 'FFFFFF'))
    m = ws.cell(row=ws.max_row, column=7)
    if m.value is not None: m.font = Font(name=FONT, bold=True, color='13A89E' if m.value <= 20 else 'F26B38')
sheet_style(ws, 4, {'A': 7, 'B': 18, 'C': 15, 'D': 10, 'E': 7, 'F': 18, 'G': 9, 'H': 13, 'I': 13, 'J': 12, 'K': 52})
for row in ws.iter_rows(min_row=5, max_row=ws.max_row):
    for c in row[6:9]: c.number_format = '0.0'
    for c in (row[5], row[10]): c.alignment = Alignment(wrap_text=True, vertical='center')
full = wb.create_sheet('ทะเบียนเต็ม')
full.append(list(rows[0].keys()))
for r in rows: full.append(list(r.values()))
sheet_style(full, 1, {})
wb.save(jay / 'experiment-registry.xlsx')
print('ok')
