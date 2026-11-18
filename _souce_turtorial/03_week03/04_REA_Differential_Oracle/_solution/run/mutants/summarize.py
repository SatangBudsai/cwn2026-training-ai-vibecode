import pathlib,json,hashlib
R=pathlib.Path(__file__).resolve().parent.parent; M=R/'mutants'
o=json.loads((M/'outcomes.json').read_text()); manifest=json.loads((M/'manifest.json').read_text()); b=o['base']
lines=['# Mutation testing','', 'ทดสอบ v3 ฐานและ mutant 10 ตัว ทีละตัวด้วย Docker Compose ที่ **http://localhost:5090** แต่ละ mutant เริ่มจากฐานเดียวกัน เปลี่ยนตรรกะหนึ่งจุด ไม่รวมบั๊กหลายตัวเข้าด้วยกัน','', '## ผลตามเกณฑ์ที่ขอ','', '**จับได้ = มี test ล้มอย่างน้อย 1 ข้อ** ตารางนี้ใช้เกณฑ์ดังกล่าวตรงตัว จำนวนในวงเล็บคือข้อที่ล้ม/ข้อทั้งหมด ไม่ได้อ้างว่าทุกข้อที่ล้มเกิดจากบั๊กใหม่','', '| mutant | บั๊กที่ใส่ | acceptance จับได้ไหม | differential จับได้ไหม |','|---|---|---|---|']
counts={'acceptance':0,'differential':0}
for v in manifest:
 x=o[v['id']];cells=[]
 for suite in counts:
  failed=x[suite+'_failed'];total=x[suite+'_total'];code=x[suite+'_exit']
  if code==2:cell='ERROR: ตัวรัน/หลักฐานผิดพลาด'
  else:
   counts[suite]+=bool(failed);cell=f'{"ได้" if failed else "ไม่ได้"} ({len(failed)}/{total} ล้ม)'
  cells.append(cell)
 lines.append(f"| [{v['id']}](mutants/{v['id']}) | {v['bug']} | {' | '.join(cells)} |")
lines+=['', '| ชุดทดสอบ | ฆ่าได้ / ทั้งหมด | Mutation score ตามเกณฑ์ที่ขอ |','|---|---|---|']
for k,n in counts.items():lines.append(f'| {k} | {n}/10 | **{n*10}%** |')
lines+=['','## ข้อจำกัดของคะแนน: ฐานมีข้อที่ล้มอยู่แล้ว','',f"ก่อนใส่บั๊ก acceptance ล้ม {len(b['acceptance_failed'])}/82 ข้อ: {', '.join(b['acceptance_failed'])}; differential ล้ม {len(b['differential_failed'])}/8 สถานการณ์: {', '.join(b['differential_failed'])}",'', 'ดังนั้นคะแนนดิบที่สูงไม่ได้ยืนยันว่าชุดทดสอบแยก mutant ออกจากฐานได้ทุกตัว ข้อ F08/F14/F16 ของ acceptance ระบุว่ายืนยันผ่าน UI ไม่ได้ตั้งแต่ต้น ส่วน differential ฐานมีความต่างเรื่องชื่อสายการบิน การตัดสินจาก exit code เพียงอย่างเดียวจึงปะปนปัญหาเดิม','', 'ตารางต่อไปแยกเฉพาะ **ข้อที่ผ่านบนฐาน แต่ล้มบน mutant** เพื่อให้เห็นหลักฐานการตรวจพบเพิ่มเติม วิธีนี้เป็นเกณฑ์อนุรักษนิยม: อาจพลาดบั๊กใหม่ที่เพิ่มความผิดในข้อที่ล้มบนฐานอยู่แล้ว จึงไม่ควรนำไปตีความว่า mutant ที่ไม่มีข้อใหม่หลุดรอดแน่นอน','', '| mutant | acceptance: ข้อที่ล้มเพิ่มจากฐาน | differential: สถานการณ์ที่ล้มเพิ่มจากฐาน |','|---|---|---|']
newcounts={'acceptance':0,'differential':0}
for v in manifest:
 cells=[]
 for suite in newcounts:
  ids=sorted(set(o[v['id']][suite+'_failed'])-set(b[suite+'_failed']));newcounts[suite]+=bool(ids);cells.append(', '.join(ids) or 'ไม่มี')
 lines.append(f"| {v['id']} | {' | '.join(cells)} |")
lines+=['',f"จำนวน mutant ที่ทำให้มีข้อผ่าน→ล้มใหม่: acceptance **{newcounts['acceptance']}/10 ({newcounts['acceptance']*10}%)**; differential **{newcounts['differential']}/10 ({newcounts['differential']*10}%)** เป็นขอบล่างจากสถานะรายข้อ ไม่ใช่คะแนนที่หักล้างรายละเอียดในข้อที่ฐานล้ม",'', 'ตัวอย่าง: M02 ทำให้ differential S4 รายงาน 300 แทน 18 ใบ และ M04 ทำให้ S3 เหลือ 299 แทน 300 ใบ แม้ S4/S3 จะล้มบนฐานอยู่แล้วด้วยเรื่องชื่อสายการบิน ส่วน M05 เปลี่ยนเงื่อนไขตรงค่าขอบราคา แต่ไม่มีข้อผ่าน→ล้มใหม่ในทั้งสองชุด จึงยังไม่มีหลักฐานจากสถานะรายข้อว่าชุดทดสอบตรวจจับบั๊กขอบนี้ได้','', '## วิธีรันและหลักฐาน','', '- สำเนาฐาน: `mutants/base/`; การเปลี่ยนแปลงแต่ละตัว: [manifest.json](mutants/manifest.json) (ระบุข้อความก่อน/หลังครบถ้วน)', '- Acceptance ใช้สำเนาไฟล์ `.cjs` จาก `/workspace/rea-flight-v3/accept` ทุกไบต์ รัน `BASE_URL=http://localhost:5090 ACCEPT_WORKERS=6 node mutants/runs/<id>/accept/run.cjs` จำนวน 82 ข้อ', '- Differential ใช้สำเนา `.mjs` และ `lib/` จาก `diff/` ทุกไบต์ รัน `node --require ./mutants/endpoint.cjs ./mutants/runs/<id>/diff/run.mjs v3` จำนวน 8 สถานการณ์ พร้อมรันต้นฉบับแช่แข็งใหม่ทุกครั้ง ไม่ใช้ผลเก่าแทนเฉลย', '- `endpoint.cjs` เป็น harness ตั้งค่า Playwright context: เปลี่ยน baseURL ที่ differential กำหนดตายตัวจาก `http://localhost:5083` เป็น `http://localhost:5090` เท่านั้น ไม่แก้ scenario/assertion/test และไม่ส่ง request ไปยัง v3 ที่พอร์ตเดิม', '- Runner: [run.py](mutants/run.py); คำสั่งทำซ้ำ `python mutants/run.py` (เขียนทับหลักฐานรอบเดิม) ใช้ `docker compose -p mutation-<id> -f mutants/<id>/mutation-compose.yml up -d --build` รอ `/api/health` แล้วรันสองชุด ก่อน `down -v --remove-orphans` ใน `finally`', '- [ผลรวม JSON](mutants/outcomes.json); หลักฐานแยกรอบที่ `mutants/runs/base/` และ `mutants/runs/M01/` ถึง `M10/`: `compose.log`, `acceptance.log`, `differential.log`, `cleanup.log`, JSON รายข้อ, screenshot, video และ GIF', '- [SHA-256 ของต้นฉบับชุดทดสอบ](mutants/test-hashes.json); ตรวจทั้งต้นฉบับและสำเนาทุกรอบว่าเหมือนเดิม; ผลตรวจใน [verification.json](mutants/verification.json)', '- ปิด container และลบ volume ของ Compose project สำหรับฐานและ mutant ทั้งหมดหลังจบ ไม่หยุดแอปเดิมที่พอร์ต 5081–5083','']
(R/'MUTATION.md').write_text('\n'.join(lines))
