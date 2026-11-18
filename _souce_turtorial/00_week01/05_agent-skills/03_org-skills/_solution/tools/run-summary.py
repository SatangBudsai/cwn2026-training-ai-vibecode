# สรุปรอบรันแบบวางพรอมต์ครั้งเดียว: คำตอบของผู้ประสานงาน + ทุกโต๊ะ (คำสั่งที่ใช้ + คำตอบเต็ม) เป็น markdown
# usage: python run-summary.py <outer.jsonl> <logs-dir> <หัวเรื่อง> <บรรทัดอธิบาย> > claude-summaries.md
import json, sys, glob, os, re

def load(f):
    out = []
    for l in open(f, encoding='utf-8'):
        try: out.append(json.loads(l))
        except Exception: pass
    return out

def cell(s):
    return str(s).replace('\n', ' ').replace('|', '\\|')[:120]

outer, logs, title, intro = sys.argv[1:5]
print(f"# {title}\n\n{intro}\n")
results = [d for d in load(outer) if d.get('type') == 'result']
if results:
    print("## คำตอบสุดท้ายของ Claude ตัวหลัก (ผู้ประสานงาน)\n")
    print(results[-1].get('result', '').strip() + "\n")

def key(f):
    m = re.match(r'(\d+)', os.path.basename(f))
    return (int(m.group(1)) if m else 0, os.path.basename(f))

for f in sorted(glob.glob(os.path.join(logs, '*.jsonl')), key=key):
    ev = load(f); tools = []; res = {}
    for d in ev:
        if d.get('type') == 'assistant':
            for c in d['message']['content']:
                if c.get('type') == 'tool_use':
                    i = c['input']
                    what = i.get('skill') or i.get('file_path') or i.get('pattern') or i.get('description') or i.get('command') or ''
                    tools.append((c['name'], what))
        if d.get('type') == 'result': res = d
    name = os.path.basename(f)[:-6]
    sec = round(res.get('duration_ms', 0) / 1000)
    print(f"## โต๊ะ `{name}` · {sec} วินาที · {res.get('num_turns', '?')} รอบ\n")
    skills = [w for n, w in tools if n == 'Skill']
    print(f"skill ที่หยิบเอง: {', '.join('`'+s+'`' for s in skills) if skills else '— ไม่ได้เรียก skill'}\n")
    print("| # | เครื่องมือ | อะไร |\n|---|---|---|")
    for k, (n, w) in enumerate(tools, 1):
        print(f"| {k} | {n} | {cell(w)} |")
    print("\n**คำตอบของโต๊ะนี้**\n")
    print(res.get('result', '').strip() + "\n")
