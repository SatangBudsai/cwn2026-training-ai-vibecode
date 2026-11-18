`spec/EXPLORATION.md` is written and `spec/` now holds everything you asked for. All four exploration folders are merged into one document. Nothing new was fetched from Google, and no HAR or trace file was copied. Item numbers run in order in every section, every B row has its "ข้อความ/ชื่อที่เห็นบนจอ" column filled, and every file path the document cites exists.

| ส่วน | จำนวนข้อ | จาก a | จาก b | จาก c | จาก d |
|---|---:|---:|---:|---:|---:|
| A หน้าจอ | 42 | 20 | 16 | 12 | 7 |
| B ฟีเจอร์ | 66 | 28 | 31 | 23 | 20 |
| C กฎ | 66 | 24 | 33 | 18 | 21 |
| D โมเดลข้อมูล | 13 | 3 | 11 | 10 | 11 |
| E คำถามที่ยังไม่รู้ | 36 (ขัดกัน 9 + ยังไม่รู้ 27) | 9 | 19 | 13 | 16 |
| F เครือข่าย [E-net] | 9 (+ ตารางตรวจความสอดคล้อง) | 0 | 2 | 0 | 9 |

When several parts saw the same thing, I merged them into one item and counted that item once for each part. That's why the a/b/c/d columns add up to more than the item count.

**ผลตรวจความสอดคล้อง (ส่วน F-2):** I compared `flights-all.json` (seen 17:07:49) with what part b saw on screen. All three counts match:
- ทั้งหมด 300 = 300
- บินตรง 18 = 18
- ยอดนิยม 3 = 3

The price range (7,635–77,520), the first five prices, the nonstop count per airline, the 32 rows with การบินไทย, the airport pairs, and the 23 airport changes also match.

**ข้อที่ขัดกันทั้งหมด** (both values are in E with their times, no guessing):

| # | เรื่อง | ค่าที่ 1 | ค่าที่ 2 |
|---|---|---|---|
| E1 | จำนวนแวะพัก 1/2/3 ครั้ง ใน 300 ใบ | 209/33/40 (b 17:07, d 17:07:49) | 214/33/35 (b 17:17) |
| E2 | แวะพัก 1 ครั้ง และราคาแพงสุด | ไม่กรอง: 209 หรือ 214 ใบ, แพงสุด ฿77,520 | กรอง "แวะพัก 1 ครั้งหรือน้อยกว่า": 217 ใบ, แพงสุด ฿197,520 (b 17:20) |
| E3 | สนามบินในตัวกรองต่อเครื่อง | 33 แห่ง (b 17:18:54) | 34 แห่ง มี "คุนหมิง (KMG)" (d 17:08:17) |
| E4 | จำนวนสายการบินในตัวกรอง | 62 สายบนจอ (b, d) | 64 รายการในข้อมูลเครือข่าย (AK, FD, XJ ใช้ชื่อ "แอร์เอเชีย" เหมือนกัน) |
| E5 | 21 ใบแรก | บนจอ: บินตรง 18 + แวะพัก 3 (b 17:07:18) | ใบที่ 1–21 ใน array: บินตรง 3 + แวะพัก 18 (d) |
| E6 | slider ราคา | ค่าสูงสุด 310000 | ข้อมูลเครือข่ายบอกแพงสุด 197,520 |
| E7 | ราคา JAL 22:05 | ฿25,060 (17:06, 17:07:49) | ฿24,990 (17:12) |
| E8 | ชื่อสายการบิน JAL บินตรง | บนจอ "เจเอแอล·บางกอกแอร์เวย์ส" | ในข้อมูล `["เจเอแอล"]` |
| E9 | tfs ของคำค้นเดียวกัน | ค้นผ่านฟอร์ม ได้ `DAgD` (a) | เปิดผ่าน `?q=` ได้ `DAgC` (b·c·d) |

Three things I decided that you should know about:
- **Tokens removed from two data files.** In the spec copies of `booking-options.json` and `rpc-113.json`, I replaced the redirect and session tokens with `[REDACTED-…]`. Part d had said these must stay only in its own folder. The originals are untouched in `explore/d-network/data/`.
- **Snapshots got prefixes too.** I gave `snapshots/` the same a-/b-/c-/d- prefixes as the screenshots, because some file names clashed between parts (for example `01-results`).
- **Small text fixes from the snapshots.** I used the snapshot spelling where parts differed. For example, the CO2 button reads "การปล่อยก๊าซโดยเฉลี่ย", not "การปล่อยก๊าซเฉลี่ย". The text "อ๊ะ มีบางอย่างผิดพลาด" appears only in screenshots, not in any snapshot, and the document says so.

Files are in `/workspace/arena6/spec/`:
- `EXPLORATION.md`
- `API-INVENTORY.md`
- `data/` (18 files)
- `shots/` (195 files)
- `snapshots/` (95 files)
