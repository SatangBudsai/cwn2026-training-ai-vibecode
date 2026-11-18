# สร้างการ์ดพนักงาน people/<แผนก>/<user>.md และ people/README.md ใหม่จาก seed/people.json
# ใช้เมื่อเพิ่ม/ย้ายคน หรือเปลี่ยนสายบังคับบัญชา · รัน: python _solution/tools/people-docs.py (จากโฟลเดอร์ 03_org-skills)
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'novatech')
d = json.load(open(os.path.join(ROOT, 'seed', 'people.json'), encoding='utf-8'))
P = {p['user']: p for p in d['people']}
DEP = {x['team']: x['name'] for x in d['departments']}
DIV = {t: v for v in d['divisions'] for t in v['teams']}
HEADS = {v['head'] for v in d['divisions']}
LEAD = {p['team']: p['user'] for p in d['people'] if p['lead']}
ICON = {'exec': '👔', 'sales': '💼', 'sa': '🧩', 'product': '📦', 'dev': '💻', 'qa': '🧪', 'devops': '⚙️',
        'mlops': '🤖', 'hr': '🤝', 'finance': '🧾', 'platform': '🏛️'}


def boss(p):
    if p['user'] == 'md-somchai': return None
    if p['team'] == 'exec': return 'md-somchai'
    if p['lead']: return DIV[p['team']]['head']
    return LEAD[p['team']]


def level(p):
    if p['user'] == 'md-somchai': return 1
    if p['team'] == 'exec': return 2
    return 3 if p['lead'] else 4


def division(p):
    if p['user'] in HEADS: return next(v['name'] for v in d['divisions'] if v['head'] == p['user'])
    return DIV[p['team']]['name'] if p['team'] in DIV else 'สำนักผู้บริหาร'


link = lambda u, frm: f"[`{u}`](../{P[u]['team']}/{u}.md)"
LVL = {1: 'ชั้น 1 · MD', 2: 'ชั้น 2 · ผู้บริหารสาย / สำนัก MD', 3: 'ชั้น 3 · หัวหน้าแผนก', 4: 'ชั้น 4 · พนักงาน'}

for p in d['people']:
    os.makedirs(os.path.join(ROOT, 'people', p['team']), exist_ok=True)
    b = boss(p); subs = [q['user'] for q in d['people'] if boss(q) == p['user']]
    rows = [('แผนก', DEP[p['team']]), ('สายงาน', division(p)), ('ระดับ', LVL[level(p)]),
            ('บทบาท', p['role'] + (' · 👑 หัวหน้า = ผู้ดูแล skill ของแผนก (CODEOWNER)' if p['lead'] else '')),
            ('รายงานต่อ (หัวหน้า)', f"{link(b, p)} {P[b]['role']}" if b else '— (บนสุดของบริษัท)')]
    if subs: rows.append(('ลูกทีม (สั่งงานได้)', ' · '.join(link(s, p) for s in subs)))
    rows += [('โต๊ะทำงาน', f"`desks/{p['user']}/`"), ('บัญชี Gitea', f"`{p['user']}`")]
    skill = f"`{p['skill']}` (สร้างใน LAB 1)" if p['skill'] else '— ยังไม่มี (คนใหม่ ใช้ทดลองว่าได้ความรู้ของทีมไปใช้ตั้งแต่วันแรกไหม)'
    body = [f"# 🪪 {p['name']} (`{p['user']}`)", '', '| | |', '|---|---|'] + [f'| {k} | {v} |' for k, v in rows]
    body += ['', '## เก่งเรื่อง', p['specialty'], '', '## งานที่ทำซ้ำ', p['repeat'], '',
             '## ความเก่งนี้จะกลายเป็น skill', skill, '', '## คำที่ชอบพิมพ์สั่ง AI'] + [f'- "{x}"' for x in p['phrases']]
    open(os.path.join(ROOT, 'people', p['team'], p['user'] + '.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(body) + '\n')

n = len(d['people']); leads = sum(p['lead'] for p in d['people'])
out = [f'# 🪪 พนักงานโนวาเทค {n} คน', '',
       'แต่ละคน **เก่งคนละเรื่อง** และความเก่งนั้นยังอยู่ในหัวของเขาคนเดียว (หัวข้อ 18.2) · 👑 = หัวหน้า / ผู้ดูแล skill ของแผนก',
       'ข้อมูลต้นทาง: [seed/people.json](../seed/people.json) · การ์ดแยกโฟลเดอร์ตามแผนก: `people/<แผนก>/<user>.md` (ชื่อโฟลเดอร์ = ชื่อทีมใน Gitea)', '',
       '## ผังองค์กร: ใครรายงานต่อใคร (4 ชั้น)', '',
       f'![ผังองค์กรโนวาเทค {n} คน 4 ชั้น: MD → ผู้บริหาร 3 สาย (ธุรกิจ, เทคโนโลยี, บริหารและการเงิน) → หัวหน้าแผนก → พนักงาน](../../img/org-chart.png)', '',
       '| ชั้น | ใคร | สั่งงานใคร |', '|---|---|---|',
       '| 1 · MD | `md-somchai` | ผู้บริหารสาย 3 คน + ผู้ช่วยผู้บริหาร |',
       '| 2 · ผู้บริหารสาย | ' + ' · '.join(f"`{v['head']}` {v['name']}" for v in d['divisions']) + ' | หัวหน้าแผนกในสายของตัวเอง |',
       '| 2 · สำนัก MD | `exec-ploy` ผู้ช่วยผู้บริหาร 👑 | — (ช่วยงาน MD และดูแล skill ฝั่งผู้บริหาร) |',
       f'| 3 · หัวหน้าแผนก 👑 | {leads - 1} คน | ลูกทีมในแผนกตัวเอง |',
       '| 4 · พนักงาน | ที่เหลือ รวมน้องใหม่ | — |', '',
       '| สายงาน | ผู้บริหาร | แผนกในสาย |', '|---|---|---|'] + \
      [f"| {v['name']} | `{v['head']}` | " + ' · '.join(DEP[t] for t in v['teams']) + ' |' for v in d['divisions']] + \
      ['', '> 🏛️ **ทีมกลาง (platform)** ไม่ใช่ทีมดูแลระบบลูกค้า แต่เป็นทีมภายในที่ดูแลเครื่องมือกลางและ **คลัง skill ของทั้งบริษัท** (repo, CI, กติกาหัวไฟล์) อยู่ในสายเทคโนโลยี', '',
       '## รายชื่อตามแผนก', '']
for x in d['departments']:
    t = x['team']; ps = [p for p in d['people'] if p['team'] == t]
    out += [f"### {ICON[t]} {x['name']} · `{t}/` · {len(ps)} คน", '', '| user | ชื่อ | บทบาท | รายงานต่อ | skill |', '|---|---|---|---|---|']
    for p in ps:
        b = boss(p)
        out.append(f"| [`{p['user']}`]({t}/{p['user']}.md) | {p['name']} | {p['role']}{' 👑' if p['lead'] else ''} | {('`' + b + '`') if b else '—'} | {('`' + p['skill'] + '`') if p['skill'] else '— (น้องใหม่)'} |")
    out.append('')
open(os.path.join(ROOT, 'people', 'README.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print(n, 'cards')
