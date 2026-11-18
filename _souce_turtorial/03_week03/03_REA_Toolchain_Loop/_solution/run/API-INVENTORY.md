# API-INVENTORY — คำขอเครือข่ายของ Google Flights (กรุงเทพ → โตเกียว เที่ยวเดียว 15 พ.ย. 2026, th/THB)

- ที่มา: `har/flights.har` บันทึกโดย `scripts/journey.mjs` (Playwright 1.64, 1 พ.ย. 2026 ราว 00:03 น. เวลาไทย) เดินตามเส้นทาง: ผลค้นหา → "ดูเที่ยวบินเพิ่มเติม" → ตัวกรอง "บินตรงเท่านั้น" → ขยายรายละเอียด VZ 832 → "เลือกเที่ยวบิน" → หยุดที่หน้า "ตัวเลือกการจอง"
- อ่านด้วย REA `inspect_web_network_capture` (format har) → evidence `ev_c07f46256f0c9066151a1e2620d7955a8fe7169f81029f9fa105e430b07ec486` (125/125 records, coverage complete) และ `inspect_analysis_view` แบบ api-surface → `ev_2e31218927997…` (89 กลุ่ม, ไม่มี path ที่ต้องเดา template) ส่งออกไว้ที่ `rea/evidence-bundle.json` ตารางสรุปสร้างด้วย `scripts/inventory.py` → `rea/inventory.json`
- REA ไม่รับ HAR ดิบ: `HAR schema validation failed: /log/entries/2/request/url must match format "uri"` เพราะ URL ของ Google Fonts มี `|` ที่ยังไม่ได้ encode จึงใช้ `scripts/clean_har.py` แปลงเป็น `%7C` แล้วเขียนเป็น `har/flights.clean.har` (แก้ 1 ช่อง ไฟล์ดิบไม่ถูกแก้)
- ขนาด: **req** = request body · **ข้อมูลจริง** = `response.content.size` (หลังถอดการบีบอัด) · **บนสาย** = `response.bodySize` (ค่า -1/ไม่รายงาน นับเป็น 0) หน่วยไบต์ ถ้าเป็นกลุ่มจะเป็นผลรวม
- REA ตัด cookie/header ที่เป็น credential (`NID`, `Cookie`, `Set-Cookie`) ออกจากผลให้แล้ว แต่ **HAR ดิบยังมีค่าเหล่านี้อยู่ ห้ามนำไฟล์ใน `har/` และ `trace/` ออกจาก container**

## 1. คำขอที่มีข้อมูลเที่ยวบิน (หัวใจของงานนี้)

ทุกตัวเป็น `POST https://www.google.com/_/FlightsFrontendUi/data/travel.frontend.flights.FlightsFrontendService/<RPC>` ส่ง `f.req=` (form-urlencoded) และได้ response แบบ stream: `)]}'` แล้วตามด้วยก้อน `<ความยาว>\n[["wrb.fr",null,"<JSON>"],…]` หลายก้อน

| คำขอ | method | ทำหน้าที่อะไร | ขนาดข้อมูล |
|---|---|---|---|
| `GetShoppingResults` #52 (ตอนเปิดผลค้นหา) | POST | ค้นหาเที่ยวบินรอบแรก ส่ง `f.req` = [ต้นทาง `/m/0fn2g`, ปลายทาง `/m/07dfk`, วันที่, จำนวนจุดแวะ=0 (ไม่กรอง), …, flag ท้าย `[0,0,0,1]`] → ได้ 3 ใบ "ยอดนิยม" + 19 ใบ "อื่นๆ" + บอกว่ายังไม่ได้โหลดอีก 278 ใบ รวมทั้งตัวกรอง ข้อมูลเชิงลึกด้านราคา วันที่ที่ถูกกว่า ลิงก์สัมภาระ (โครงสร้างเดียวกับ `ds:1` ที่ฝังใน HTML ของ LAB 2) | req 485 · ข้อมูลจริง 105,824 · บนสาย 19,597 |
| `GetShoppingResults` #62 (กด "ดูเที่ยวบินเพิ่มเติม") | POST | คำขอเดียวกันแต่ flag ท้ายเป็น `[0,1,0,1]` (ตัวที่ 2 = 1 คือขอทั้งหมด) → ได้ **3 + 297 = 300 ใบ** ในครั้งเดียว ไม่มีการแบ่งหน้า | req 400 · ข้อมูลจริง 909,247 · บนสาย 55,862 |
| `GetShoppingResults` #92 (ตัวกรอง "บินตรงเท่านั้น") | POST | ค้นหาใหม่โดยเปลี่ยนช่องจำนวนจุดแวะใน `f.req` จาก 0 เป็น 1 → ได้ 4 + 14 = **18 ใบ** ยังไม่โหลด = 0 ช่วงราคาปกติเปลี่ยนเป็น ฿6,400–8,900 และไม่มี "วันที่ที่ถูกกว่า" | req 400 · ข้อมูลจริง 94,901 · บนสาย 17,990 |
| `GetBookingResults` #111 (กด "เลือกเที่ยวบิน") | POST | ส่ง token ของเที่ยวบินที่เลือก + `[["BKK","2026-11-15","NRT",null,"VZ","832"]]` → ได้รายละเอียดเที่ยวบินที่เลือก ลิงก์สัมภาระ ข้อมูลเชิงลึกด้านราคาของเที่ยวบินนี้ (฿8,100–11,500, ประวัติ 62 จุด) และ **ตัวเลือกการจอง 2 ราย**: ไทยเวียดเจ๊ทแอร์ ฿8,432 (+ค่าธรรมเนียม ฿81) / Gotogate ฿9,107 แต่ละรายมี token สำหรับคลิกไปผู้ขาย (`/travel/clk/f`) ซึ่งไม่ได้กด | req 634 · ข้อมูลจริง 14,029 · บนสาย ไม่รายงาน (body เติมจาก CDP ดูหมายเหตุ) |

## 2. หน้าเว็บ สคริปต์ และคำขอเสริมของแอป

| คำขอ | method | ทำหน้าที่อะไร | ขนาดข้อมูล |
|---|---|---|---|
| `www.google.com/travel/flights?q=…&hl=th&gl=TH&curr=THB` (1) | GET | หน้า HTML แรก ฝังผลค้นหา 22 ใบไว้ใน `AF_initDataCallback` (`ds:1`) — สิ่งที่ LAB 2 อ่าน | ข้อมูลจริง 2,888,927 · บนสาย 294,019 |
| `www.gstatic.com/_/mss/boq-travel/_/js/k=boq-travel.FlightsFrontendUi_desktop_ms.th…` (35) | GET | โค้ด JavaScript ของแอป Flights (โหลดเป็นโมดูลย่อยทีละส่วนเมื่อเปิดฟีเจอร์ใหม่ เช่น ตัวกรอง หน้าจอง) | ข้อมูลจริง 3,520,468 · บนสาย 1,014,747 |
| `www.gstatic.com/external_hosted/d3/v5/d3.min.js` (1) | GET | ไลบรารี d3 สำหรับวาดกราฟประวัติราคาในหน้าจอง | ข้อมูลจริง 240,821 · บนสาย 71,265 |
| `www.google.com/_/FlightsFrontendUi/browserinfo` (1) | POST | ส่งขนาดหน้าจอ/viewport (`[null,900,1366]`) และความสามารถของเบราว์เซอร์ให้ฝั่งเซิร์ฟเวอร์ ตอบกลับแค่สถานะ | req 117 · ข้อมูลจริง 90 · บนสาย 123 |
| `www.google.com/_/FlightsFrontendUi/bscframe` (1) | GET | iframe เล็กๆ ของแอป (เนื้อหา 15 ไบต์) ไม่รู้หน้าที่แน่ชัด | ข้อมูลจริง 15 · บนสาย 47 |
| `www.google.com/log` (31) | POST | ส่ง log การใช้งาน/ประสิทธิภาพ (body บีบอัดเป็นไบนารี อ่านไม่ได้) ถี่ที่สุดในเส้นทาง | req 33,157 · ข้อมูลจริง 4,061 · บนสาย 5,025 |
| `play.google.com/log` (2) | POST | log ของส่วนหัว Google (OneGoogle) | req 1,381 · ข้อมูลจริง 262 · บนสาย 585 |
| `ogads-pa.clients6.google.com/$rpc/…AsyncDataService/GetAsyncData` (1) | POST | ข้อมูลของแถบบัญชี/แอป Google มุมขวาบน (ไม่ได้ล็อกอินจึงได้ค่าว่าง) | req 1,880 · ข้อมูลจริง 53 · บนสาย 435 |
| `www.google.com/generate_204` (1) | GET | ตรวจการเชื่อมต่อ ตอบ 204 ว่าง | 0 · บนสาย 12 |

## 3. ไฟล์ภาพ ฟอนต์ และสไตล์

| คำขอ | method | ทำหน้าที่อะไร | ขนาดข้อมูล |
|---|---|---|---|
| `www.gstatic.com/flights/airline_logos/70px/<รหัส>.png` (24) | GET | โลโก้สายการบินตามแถวที่แสดง (SL, VZ, ZG, TG, NH, JL, CX, …, `multi.png` = หลายสายการบิน) โหลดเพิ่มเมื่อกด "ดูเที่ยวบินเพิ่มเติม" | ข้อมูลจริง 61,381 · บนสาย 62,153 |
| `www.gstatic.com/flights/partner_logos/70px/ETRAVELI_Gotogate.png` (1) | GET | โลโก้ผู้ขายในหน้าตัวเลือกการจอง | ข้อมูลจริง 1,799 |
| `www.gstatic.com/flights/app/…` (9) | GET | ไอคอนของแอป: ลูกศร, ราคาสูง/ปกติ, tip, และ GIF อธิบาย contrails (932,978 ไบต์ ใหญ่สุดในกลุ่ม โหลดตอนขยายรายละเอียด) | ข้อมูลจริง 941,036 · บนสาย 936,989 |
| `www.gstatic.com/images/branding/…` (5) | GET | โลโก้ Google และไอคอน Flights | ข้อมูลจริง 26,492 |
| `fonts.googleapis.com/css` + `fonts.gstatic.com/s/…woff2` (1 + 5) | GET | ฟอนต์ Google Sans / Roboto (URL นี้คือตัวที่มี `|` ทำให้ REA ไม่รับ HAR ดิบ) | ข้อมูลจริง 163,571 · บนสาย 145,496 |
| `www.gstatic.com/og/_/js…`, `…/og/_/ss…` (2) | GET | สคริปต์และสไตล์ของแถบด้านบน Google | ข้อมูลจริง 245,163 · บนสาย 84,773 |

**รวม 125 คำขอ** ข้อมูลจริง ≈ 9.2 MB บนสาย ≈ 2.7 MB ข้อมูลเที่ยวบินจริงอยู่ใน 4 คำขอ (ข้อ 1) รวม 1.12 MB ถ้าไม่บีบอัด หรือ ≈ 93 KB บนสาย

## หมายเหตุการบันทึก

- `GetShoppingResults`/`GetBookingResults` ส่งเป็น stream และหน้าเว็บสั่งยกเลิก (abort) เมื่อได้ข้อมูลครบ HAR ของเบราว์เซอร์จึงบันทึกเป็น `net::ERR_ABORTED` และไม่มี body ในรอบแรก จึงเปิด CDP `Network.streamResourceContent` ระหว่างบันทึก ซึ่งทำให้ Playwright เก็บ body ของ `GetShoppingResults` ได้ครบทั้ง 3 คำขอ ส่วน `GetBookingResults` นำ chunk ที่เก็บจาก CDP มาเติมลงใน HAR และระบุไว้ใน `_comment` ของรายการนั้น
- การป้องกันไม่ให้ออกนอก Google ทำโดย route เฉพาะ URL ที่ไม่ใช่โดเมน Google ถ้าเป็น navigation จะถูกยกเลิก ทุกคำขอใน HAR ไปที่โดเมนของ Google (google.com, gstatic.com, googleapis.com) เพราะไม่ได้กด "ดำเนินการต่อ"
- ลำดับ `#n` คือ ordinal ของ record ใน HAR/REA
