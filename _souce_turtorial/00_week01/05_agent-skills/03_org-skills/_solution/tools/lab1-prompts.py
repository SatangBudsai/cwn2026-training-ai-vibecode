# พรอมต์ LAB 1 แบบเต็มรายคน (24 โต๊ะ): แต่ละพรอมต์บอกชัดว่าเป็นใคร ทำงานอะไร ใช้ไฟล์ไหน และเก็บ skill ชื่ออะไรไว้ที่ไหน
# งานของแต่ละคน = งานที่ Claude เลือกจากการ์ดตอนรันจริง (ผลอยู่ใน _solution/desks-after-lab1/<user>/work/)
# python lab1-prompts.py  → _solution/lab1/prompts/<user>.txt + _solution/lab1/prompts/README-block.md
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
people = {p['user']: p for p in json.loads((ROOT / 'novatech/seed/people.json').read_text(encoding='utf-8'))['people']}
dept = {d['team']: d['name'] for d in json.loads((ROOT / 'novatech/seed/people.json').read_text(encoding='utf-8'))['departments']}
icon = {'exec': '👔', 'sales': '💼', 'sa': '🧩', 'product': '📦', 'dev': '💻', 'qa': '🧪', 'devops': '⚙️', 'mlops': '🤖', 'hr': '🤝', 'finance': '🧾', 'platform': '🏛️'}

# user: (งาน 1 ชิ้น, ไฟล์ใน company-kit, ใช้โน้ตส่วนตัวไหม)
TASKS = {
    'md-somchai': ('พิจารณาดีล DS-2026-034 ว่าอนุมัติหรือตีกลับ พร้อมเหตุผล', ['deal-summaries/DS-2026-034-muangmai-hospital-portal.md', 'margin-rules.md', 'price-list.csv'], True),
    'exec-ploy': ('ทำสไลด์ประชุมผู้บริหารเดือน พ.ย. 2026 (HTML + PDF) ที่ MD อ่านจบใน 5 นาที', ['monthly-kpi.csv', 'brand-guide.md', 'logo.svg'], False),
    'cco-wit': ('ทบทวน pipeline ดีลทั้งหมด: ดีลไหนควรเร่ง ส่งต่อ ประคอง หรือตีกลับ', ['monthly-kpi.csv', 'deal-summaries/', 'deal-001/', 'deal-002/', 'product/'], False),
    'cto-nat': ('ทบทวนความเสี่ยงทางเทคนิคของ deal-001 ก่อนรับงาน', ['deal-001/tor-bank-queue.md', 'incident-2026-09.md', 'deploy-runbook.md', 'arch-standards.md', 'ml-queue-forecast/', 'qa/'], False),
    'cfo-ying': ('สรุปรายได้ ต้นทุน และกำลังคนเดือน ต.ค. 2026 ให้ MD: เงินพอไหม ควรรับคนเพิ่มหรือยัง', ['monthly-kpi.csv', 'margin-rules.md', 'jd-template.md'], False),
    'sales-nida': ('ร่าง proposal ให้ลูกค้าธนาคารตาม TOR ของ deal-001 พร้อมใบคิดราคา', ['deal-001/tor-bank-queue.md', 'won-proposals/', 'price-list.csv', 'margin-rules.md', 'brand-guide.md'], False),
    'sales-krit': ('เขียนอีเมลติดตามลูกค้า deal-002 หลังประชุมวันที่ 28 ต.ค. 2026', ['meeting-notes/2026-10-28-bank-meeting.md', 'deal-002/tor-bank-dispute.md'], False),
    'sa-ton': ('แปลง TOR ของ deal-001 เป็น spec และแผนทดสอบ', ['deal-001/tor-bank-queue.md', 'arch-standards.md'], False),
    'sa-ice': ('วาดแผนภาพ architecture ของระบบจองคิวสาขา (deal-001) ตามมาตรฐานบริษัท', ['arch-standards.md', 'deal-001/tor-bank-queue.md'], False),
    'pm-beam': ('จัดลำดับฟีเจอร์ NovaQueue จาก feedback ไตรมาส 3 แล้วเขียน PRD ฟีเจอร์ที่ควรทำก่อน 1 ฉบับ', ['product/novaqueue-feedback-2026-q3.md', 'product/novaqueue-overview.md', 'product/product-lifecycle-policy.md'], False),
    'pm-gift': ('วางแผนเลิกให้บริการ NovaQueue v1 พร้อมร่างประกาศแจ้งลูกค้า', ['product/novaqueue-v1-customers.csv', 'product/product-lifecycle-policy.md'], False),
    'dev-pond': ('รีวิว PR ตัวอย่าง 1 ชิ้นตามมาตรฐานโค้ดของทีม (ถ้าไม่มีโค้ดจริงให้ทำ PR สมมติขึ้นมาเอง)', ['coding-rules.md', 'project-scaffold-notes.md'], False),
    'dev-mew': ('ขึ้นโปรเจกต์ระบบสมาชิก + ชำระเงินใหม่ให้รันได้และ test ผ่าน', ['project-scaffold-notes.md', 'coding-rules.md'], False),
    'qa-bank': ('เขียนรายงานบั๊กจาก log ของ test ที่ล้ม', ['qa/failed-test-log.txt', 'qa/bug-template.md'], False),
    'ops-art': ('ทำ checklist ขึ้นระบบจริงรอบ 2026.11', ['deploy-runbook.md'], False),
    'ops-fon': ('เขียน postmortem เหตุระบบ payment ล่มเดือน ก.ย. 2026 แบบไม่โทษคน', ['incident-2026-09.md'], False),
    'ml-jay': ('จัดระเบียบผลการทดลองโมเดลพยากรณ์คิวประจำสัปดาห์ และเทียบทุกรอบ', ['ml-queue-forecast/experiment-results.csv', 'ml-queue-forecast/notes.md', 'deal-001/tor-bank-queue.md'], False),
    'ml-pim': ('ทำแผนปล่อยโมเดลพยากรณ์คิว r03 พร้อมเกณฑ์ถอยกลับ', ['ml-queue-forecast/', 'deploy-runbook.md'], False),
    'hr-fah': ('เขียนประกาศรับสมัคร Senior Full-stack Developer สำหรับโปรเจกต์ deal-001', ['jd-template.md', 'hr-benefits-faq.md', 'brand-guide.md', 'deal-001/tor-bank-queue.md'], False),
    'hr-oat': ('เตรียมชุดต้อนรับ Dev คนใหม่ที่จะเข้างานวันจันทร์ 9 พ.ย. 2026', ['onboarding-notes.md', 'hr-benefits-faq.md'], False),
    'fin-joy': ('คิดราคาและกำไรของ deal-001 ให้ Sales', ['price-list.csv', 'margin-rules.md', 'deal-001/tor-bank-queue.md', 'won-proposals/'], False),
    'fin-nok': ('ตรวจใบแจ้งหนี้ INV-2026-0142 ก่อนส่งลูกค้า', ['invoices/INV-2026-0142.md', 'invoices/invoicing-rules.md'], False),
    'plat-may': ('ตรวจใบแจ้งหนี้ INV-2026-0142 ตามนโยบายข้อมูลลูกค้า', ['customer-data-policy.md', 'invoices/INV-2026-0142.md', 'brand-guide.md'], False),
}
ORDER = ['exec', 'sales', 'sa', 'product', 'dev', 'qa', 'devops', 'mlops', 'hr', 'finance', 'platform']
MAIN = ['sales-nida', 'md-somchai', 'fin-joy']        # 3 โต๊ะที่ผู้เรียนทำเอง

def prompt(u):
    p = people[u]
    head = f"ฉันคือ {p['name']} ({u}) {p['role'].split(' ดูแล ')[0]} ฝ่าย {dept[p['team']]} · นี่คือโต๊ะของฉัน (novatech/desks/{u}/)\nอ่านการ์ดของฉันก่อน: ../../people/{p['team']}/{u}.md\n"
    if u == 'qa-mint':
        return head + ("skill test-from-plan ของฉันทำเสร็จแล้วตั้งแต่ส่วน 02 อยู่ที่ ../../company-kit/qa/test-from-plan-skill/\n"
                       "คัดลอกมาเป็น skill ส่วนตัวที่ .claude/skills/test-from-plan/ แล้วเติม metadata ในหัวไฟล์: owner: qa-mint, layer: personal, version, uses, next, follows (ชื่อ skill ของคนอื่นดูได้ใน ../../people/README.md)\n"
                       "ห้ามแก้เนื้อหาขั้นตอนเดิม จบแล้วสรุปสั้น ๆ ว่าเติมอะไรและเพราะอะไร\n")
    task, files, notes = TASKS[u]
    src = ', '.join(f'../../company-kit/{f}' for f in files) + (' และโน้ตของฉัน notes/deal-rules.md' if notes else '')
    return head + (f"1. ลงมือทำงานจริง 1 ชิ้น: {task}\n"
                   f"   ข้อมูลที่ใช้: {src}\n"
                   f"   เก็บผลงานไว้ใน work/\n"
                   f"2. เก็บวิธีทำงานนี้เป็น skill ส่วนตัวชื่อ {p['skill']} ที่ .claude/skills/{p['skill']}/\n"
                   f"   - หัวไฟล์มี name, description (ใช้คำที่ฉันชอบพิมพ์ในการ์ด) และ metadata: owner: {u}, layer: personal, version, uses, next, follows (ชื่อ skill ของคนอื่นดูได้ใน ../../people/README.md)\n"
                   f"   - skill เล็ก โฟกัสเรื่องเดียว และต้องใช้ได้ที่เครื่องคนอื่น: ความรู้ที่จำเป็นจาก company-kit ให้สรุปไว้ใน references/ ของ skill\n"
                   f"จบแล้วสรุปสั้น ๆ: ทำงานอะไร ได้ไฟล์อะไร skill มีไฟล์อะไรบ้าง และมีจุดไหนที่ต้องตัดสินใจเอง\n")

def quoted(text):
    """แสดงพรอมต์เป็นข้อความอ้างอิง (blockquote) แทน code block เพื่อไม่ให้มีปุ่มก๊อปบน GitHub · เป็นตัวอย่างให้อ่าน ไม่ใช่ให้วาง"""
    lines = []
    for l in text.rstrip('\n').split('\n'):
        ind = len(l) - len(l.lstrip(' '))
        l = l.lstrip(' ')
        l = re.sub(r'^(\d+)\. ', r'\1\. ', l)          # กัน markdown แปลงเป็นรายการลำดับ
        l = re.sub(r'^- ', r'\- ', l)
        lines.append('> ' + '&emsp;' * (ind // 3) + l + '  ')
    return '\n'.join(lines) + '\n'

def block(u, level='####'):
    p = people[u]
    return (f"{level} {icon[p['team']]} {p['name'].split()[0]} `{u}` → skill `{p['skill']}`\n\n"
            f"สิ่งที่ agent ย่อยของโต๊ะ `desks/{u}/` ได้รับ · ผลจริง: "
            + (f"[`work/`](_solution/desks-after-lab1/{u}/work/) · " if (ROOT / f'_solution/desks-after-lab1/{u}/work').exists() else '')
            + f"[`skill`](_solution/desks-after-lab1/{u}/skills/{p['skill']}/)\n\n"
            f"{quoted(prompt(u))}\n")

out = ROOT / '_solution/lab1/prompts'; out.mkdir(exist_ok=True)
users = [u for t in ORDER for u in people if people[u]['team'] == t and (u in TASKS or u == 'qa-mint')]
for u in users:
    (out / f'{u}.txt').write_text(prompt(u), encoding='utf-8')
md = [block('sales-nida')]
rest = []
for t in ORDER:
    us = [u for u in users if people[u]['team'] == t and u != 'sales-nida']
    if us: rest.append(f"**{icon[t]} {dept[t]}**\n\n" + '\n'.join(block(u, '#####') for u in us))
md.append("<details>\n<summary>📋 ดูพรอมต์ที่อีก 23 คนได้รับ (ตามแผนก)</summary>\n\n" + '\n'.join(rest) + "\n</details>\n")
(out / 'README-block.md').write_text('\n'.join(md), encoding='utf-8')
print(len(users), 'prompts')
