# Independent Playwright acceptance suite

อ้างอิงเฉพาะ EXPLORATION.md ส่วน B/C/F และการสำรวจ UI ที่ผู้ใช้เห็น ไม่อ่านซอร์สแอป ไม่ใช้ data-testid, CSS class, internal state หรือ API ภายใน และไม่กดดำเนินการต่อ/ล็อกอิน/ชำระเงิน

ต้องมี Node.js, แพ็กเกจ `playwright`, Chromium ของ Playwright และ `ffmpeg` ใน PATH หากยังไม่มีติดตั้งเฉพาะเครื่องมือทดสอบ:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

รันกับแอปใดก็ได้ที่กำหนดผ่าน BASE_URL (แอปต้องเปิดไว้ก่อน):

```sh
BASE_URL=http://localhost:5083 node accept/run.cjs
```

รัน baseline v2:

```sh
# หากพอร์ต 5082 ยังไม่เปิด:
(cd /workspace/rea-flight-v2/skythai-plus && docker compose up -d)
BASE_URL=http://localhost:5082 ACCEPT_REPORT=BASELINE.md node accept/run.cjs
```

ตัวรันใช้ Playwright โดยตรง แยก browser context ใหม่ทุก test, viewport 1366×900, ภาษา/เขตเวลาไทย, ทำงานพร้อมกัน 3 test (ปรับ ACCEPT_WORKERS ได้) ไม่มี retry หรือการลดเกณฑ์ให้ผ่าน baseline ตั้งเส้นทางกรุงเทพมหานคร → เมืองโตเกียว วันที่ 15 พฤศจิกายน 2026 ผ่านฟอร์มที่มองเห็น ไม่บังคับ URL ภายในให้เหมือน Google

- `suite.cjs`: 82 กรณีแยกข้อ B01–B35, C01–C31, F01–F16; เลข B เป็นลำดับแถวในส่วน B
- `run.cjs`: ตัวรัน วิดีโอทุกข้อ และแปลง GIF ด้วย ffmpeg
- `BASELINE.md`: ผลรัน v2; `REPORT.md`: ผลรันเป้าหมายอื่น
- `results.json`: ข้อผิดพลาดฉบับเต็มและ URL/วันเวลารันล่าสุด
- `video/<id>.webm`, `gif/<id>.gif`: วิดีโอและ GIF ทุกข้อ รวมข้อที่ไม่ผ่าน
- `screenshots/<id>.png`, `evidence/<id>.txt`: ภาพและ accessibility snapshot ตอนจบ

ค้างหน้าสุดท้าย 3 วินาทีก่อนจบทุกข้อ GIF ใช้ 5 fps, กว้าง 684 px และวนซ้ำ เก็บวิดีโอขนาดต้นฉบับไว้ การรันใหม่เขียนทับหลักฐานตาม ID จึงควรคัดลอกทั้ง accept/ หากต้องการเก็บผลหลายเวอร์ชัน

Exit code 0 = ผ่านทุกข้อ, 1 = มีข้อไม่ผ่านเกณฑ์/ยังยืนยันไม่ได้, 2 = ตัวรันหรือการสร้างหลักฐานผิดพลาด

ข้อจำกัดของคำตัดสิน: ส่วน F กล่าวถึง RPC และข้อมูลในเครือข่าย แต่คำสั่งงานนี้กำหนดให้ตรวจจากสิ่งที่ผู้ใช้เห็น จึงตรวจผลทาง UI ที่เกี่ยวข้องเท่านั้น F08/F14/F16 ยืนยันไม่ได้ในขอบเขตนี้และนับเป็นไม่ผ่านการยืนยันอย่างชัดเจน ไม่ใช่บั๊กที่พิสูจน์แล้ว F2 เป็นคำตอบสรุปจาก F1 จึงไม่เพิ่มกรณีซ้ำ C28–C30 เป็นสมมติฐาน [R] ตามเอกสาร ราคาตัวอย่างมาจากคนละ snapshot; เกณฑ์ที่ตรวจราคาประวัติศาสตร์เป็นการตรวจความตรงตามเอกสาร ไม่ใช่รับประกันราคาสด
