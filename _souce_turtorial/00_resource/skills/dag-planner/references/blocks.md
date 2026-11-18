# blocks.json — ฟิลด์ของบล็อก + ตัวอย่าง

```json
{"goal": "<โจทย์รวม>", "name": "<ชื่อแผน>", "blocks": [ {…}, … ]}
```

| ฟิลด์ | บังคับ | ค่า | ความหมาย |
|---|---|---|---|
| `id` | ✔ | `[A-Za-z0-9_.-]+` ไม่ซ้ำ | ใช้เป็น id ของ node ใน agent-team ด้วย |
| `title` | ✔ | ข้อความสั้น | แสดงในกล่อง DAG |
| `size` | ✔ | `S` `M` `L` | 0.6 / 1.5 / 3 ล้านโทเคน → ใช้คิด rank และเวลาในแผน · ใหญ่กว่า L ต้องแบ่ง |
| `depends_on` | | `["B01"]` | เฉพาะบล็อกที่ต้องรอไฟล์ผลจริง · ห้ามวง |
| `skill` | ✔ | `yolo` `cyolo` `image` `review` `debate` `best_of` | สกิลที่บล็อกนี้ใช้ (ตารางใน SKILL.md) |
| `difficulty` | | 1–6 (ค่าเริ่มต้น 2) | รุ่น/effort ตามตารางของ base skill agent-team |
| `output` | ✔ | path ใน `app/` | ไฟล์ผลของบล็อก (บล็อกถัดไปอ่านไฟล์นี้) · `image` ต้องเป็น `.png` |
| `done` | ✔ | 1 บรรทัด | เกณฑ์เสร็จที่ตรวจได้ (review ใช้เป็น criteria · best_of ใช้เป็นเกณฑ์ให้คะแนน) |
| `exclusive` | | `true` | บล็อกรวม/ทดสอบสุดท้าย รันคนเดียว แก้ไฟล์ของบล็อกอื่นได้ |
| `detail` | | ข้อความ | รายละเอียดงานเพิ่ม (ใส่ใน prompt) |
| `worker` | | `yolo` `cyolo` | review: บังคับฝั่งผู้ทำ (ไม่ใส่ = KC-QUEST เลือก) · ผู้ตรวจเป็นอีกฝั่งเสมอ |
| `n` | | 2–4 (ค่าเริ่มต้น 2) | best_of: จำนวนตัวเลือก (ใช้ n+1 บัญชี) |
| `max_rounds` | | ค่าเริ่มต้น 2 | review: จำนวนรอบแก้สูงสุด |
| `timeout` | | วินาที (600) | timeout ต่อการเรียกของ node |

## สิ่งที่ `dag` ตรวจ (ERROR = หยุด)

id ซ้ำ · `depends_on` อ้าง id ที่ไม่มีจริง/อ้างตัวเอง · วงวน (บอกเส้นทางวน) · skill ไม่รู้จัก · size ไม่ใช่ S/M/L · difficulty นอก 1–6 · ไม่มี output/done/title/goal · output เป็น absolute หรือมี `..` · image ที่ output ไม่ใช่ `.png` · best_of n นอก 2–4
คำเตือน (ไม่หยุด): จำนวนบล็อกนอก 6–14 · บล็อกแรกมี dependency · บล็อกสุดท้ายไม่ exclusive · ใช้บล็อกหลายบัญชีมากเกิน · output ซ้ำ

## ผลของแต่ละสกิลไปอยู่ที่ไหน

| skill | ใครเขียน `app/<output>` |
|---|---|
| yolo / cyolo | agent เขียนเองใน `cwd = app/` |
| image | `cyolo.py image` เขียน PNG ไปที่ `app/<output>` (agent-team ตรวจ PNG signature) |
| review | ผู้ทำเขียนไฟล์ ผู้ตรวจเปิดไฟล์ตรวจตาม `done` จน APPROVED |
| debate / best_of | ผู้ตอบตอบเนื้อหาไฟล์ในคำตอบ → บล็อกถัดไปอ่าน `{{file:id}}` (= `out/<id>.md` ของ run) · `report` บันทึกคำตอบที่ถูก/ชนะลง `app/<output>` |

## ตัวอย่าง 8 บล็อก ครบ 6 สกิล

```json
{"goal": "เว็บแนะนำร้านกาแฟหน้าเดียว มีเมนู โลโก้ และสโลแกน", "name": "cafe8",
 "blocks": [
  {"id": "B01", "title": "โครงโปรเจกต์ + index.html", "size": "S", "depends_on": [], "skill": "cyolo", "difficulty": 1,
   "output": "index.html", "done": "index.html มี header/main/footer และลิงก์ style.css"},
  {"id": "B02", "title": "เลือก framework CSS", "size": "S", "depends_on": ["B01"], "skill": "debate", "difficulty": 2,
   "output": "decision.md", "done": "ระบุ framework เดียวพร้อมเหตุผล 2 ข้อ"},
  {"id": "B03", "title": "โลโก้ร้าน", "size": "S", "depends_on": [], "skill": "image", "difficulty": 1,
   "output": "logo.png", "done": "PNG โลโก้ถ้วยกาแฟ สีน้ำตาล"},
  {"id": "B04", "title": "ข้อมูลเมนู", "size": "M", "depends_on": ["B01"], "skill": "yolo", "difficulty": 2,
   "output": "menu.json", "done": "JSON 8 เมนู มีชื่อ ราคา คำอธิบาย"},
  {"id": "B05", "title": "สไตล์ CSS", "size": "M", "depends_on": ["B02"], "skill": "review", "difficulty": 2,
   "output": "style.css", "done": "responsive 2 breakpoint ใช้ framework ตาม decision.md"},
  {"id": "B06", "title": "สโลแกนร้าน", "size": "S", "depends_on": [], "skill": "best_of", "n": 2, "difficulty": 1,
   "output": "slogan.txt", "done": "ไม่เกิน 8 คำ จำง่าย"},
  {"id": "B07", "title": "สคริปต์แสดงเมนู", "size": "L", "depends_on": ["B04", "B05"], "skill": "yolo", "difficulty": 3,
   "output": "menu.js", "done": "อ่าน menu.json แล้ว render การ์ดเมนูใน main"},
  {"id": "B08", "title": "รวม + ทดสอบ", "size": "M", "depends_on": ["B03", "B06", "B07"], "skill": "cyolo", "difficulty": 2,
   "output": "TEST.md", "done": "index.html ใช้ logo/slogan/menu.js ครบ และ TEST.md บันทึกผลตรวจ", "exclusive": true}]}
```
