# kit — ชุดวัดกลาง

```
kit/measure.sh <BASE_URL> <โฟลเดอร์ผล>      # เช่น kit/measure.sh http://localhost:5084 out/v4
```
exit 0 = gate ผ่าน · 1 = gate ไม่ผ่าน · 2 = รันไม่ได้ ผลอยู่ที่ `<โฟลเดอร์ผล>/report.json` (คะแนน, Score, gate, รายการปัญหา) และ `summary.md`

| ไม้บรรทัด | ตัวรัน | ใช้ของเดิมใน src/ (ไม่แก้) |
|---|---|---|
| acceptance 82 ข้อ | lib/accept.mjs | accept/suite.cjs (cases+setup), accept/report.cjs |
| differential S1–S8 | lib/diff.mjs | diff/scenarios.mjs, diff/lib/*, เฉลย diff/diff-results.json, runner/stub-frozen.mjs |
| โครงสร้าง | lib/structure.mjs | structure/structure-compare.mjs (คัดลอกทั้งไฟล์ + ต่อท้ายบรรทัด export), original.yml |
| visual diff | lib/visual.mjs | ขั้นตอนของ visual/visual-ch4.cjs, visual/reference.png |
| เที่ยวบิน | lib/flights.mjs | diff/lib/clone.mjs rowsLoc |

- ทุกตัวไปหน้าผลค้นหาผ่านฟอร์มบนจอ (setup ของชุด acceptance → "→ เที่ยวเดียว" → ค้นหา) จึงใช้กับแอปไหนก็ได้ที่มีฟอร์มค้นหา ไม่ผูกกับ URL ของ v4
- เครื่องมืออยู่ใน `.tools/` (Playwright 1.64.0-alpha-1790635538000 → Chromium r1247 ใน /ms-playwright, pixelmatch, pngjs) `lib/hooks.mjs` ให้ไฟล์ใน src/ หา package เจอ และแทน frozen/open-original.mjs ด้วย stub (ไม่ต่อ Google)
- ต่างจาก accept/run.cjs: ไม่อัดวิดีโอ/GIF และไม่ค้างภาพ 3 วินาที (ไม่มีผลต่อผ่าน/ไม่ผ่าน) เปิดได้ด้วย `MEASURE_VIDEO=1 ACCEPT_HOLD_MS=3000`
- differential รัน 4 สถานการณ์พร้อมกัน (`DIFF_PARALLEL=1` เพื่อรันทีละตัว)
