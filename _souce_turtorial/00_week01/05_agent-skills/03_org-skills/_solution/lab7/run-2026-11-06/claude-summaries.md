# LAB 7 รอบใหม่ 2026-11-06 · คำตอบของ Claude ทั้ง 2 โต๊ะ

รันพรอมต์กล่อง ⑪ · บริษัท 28 คน คลัง 12 plugin 28 skill

## คำตอบสุดท้ายของ Claude ตัวหลัก (ผู้ประสานงาน)

ทั้ง 2 โต๊ะรันจบโดยไม่มี error และ Claude ของทั้งคู่หยิบ `core:skill-finder` เองเป็นอย่างแรก

| โต๊ะ | skill ที่หยิบเอง (จาก log) | เวลา | คำตอบสั้น ๆ |
|---|---|---|---|
| `hr-fah` | `core:skill-finder` | 31 วินาที | มี `sales:sales-proposal` ของแผนก Sales ซึ่ง `sales-nida` ดูแล ต้องติดตั้ง plugin `sales` และ `finance` เพิ่ม ส่วน `core` เปิดอยู่แล้ว |
| `md-somchai` | `core:skill-finder` | 81 วินาที | ต้องแก้ 3 จุด: `notes/deal-rules.md`, `core:customer-data-policy` และ `exec:deal-approval` ให้ `@sales-nida` ตรวจ `sales-proposal` ด้วย ต้องแจ้ง `plat-may`, `@plat-ken`, `@exec-ploy`, `@sales-nida` |

- **เวลา:** นับตั้งแต่เริ่มจนจบคำสั่ง โดยทั้งสองโต๊ะเริ่มพร้อมกัน
- **ข้อห้าม:** ไม่พบ tool call ที่เปิดโฟลเดอร์โต๊ะคนอื่น, skill แผนกอื่น หรือ `_solution`
- **จุดที่ควรรู้:** `md-somchai` อ่าน `installed_plugins.json` ซึ่งแสดงชื่อโต๊ะอื่นและเวอร์ชัน plugin ไฟล์นี้ไม่อยู่ในข้อห้ามตรง ๆ และ Claude ของโต๊ะก็บอกเรื่องนี้ไว้ในคำตอบแล้ว
- **คำตอบเต็ม:** ผมคัดลอกจาก log โดยไม่แก้ไข และไม่ได้ตรวจเนื้อหาเทียบกับ skill จริง

Log อยู่ที่ `logs/lab7/hr-fah.jsonl` และ `logs/lab7/md-somchai.jsonl`

---

## คำตอบเต็ม: `hr-fah`

**มีครับ คือ `sales:sales-proposal` ของแผนก Sales แต่โต๊ะนี้ยังใช้ไม่ได้ เพราะเปิดไว้แค่ `core` กับ `hr`** ต้องเพิ่ม `sales` และ `finance`

skill นี้ร่าง proposal จาก TOR ให้ลูกค้าองค์กร โดยเฉพาะธนาคาร ใช้โครง 9 หัวข้อ คิดราคาจาก price-list เช็ก margin ส่วนลด และงบ แล้วตัดข้อมูลส่วนบุคคลออก

### ผู้ดูแล
- **แผนก:** Sales
- **เจ้าของ skill และผู้ดูแล plugin (CODEOWNER):** `sales-nida` คนเดียวกัน

### ต้องติดตั้งอะไรบ้าง

| Plugin | ใช้ทำอะไร | ผู้ดูแล | สถานะที่โต๊ะนี้ |
|---|---|---|---|
| `sales` | ตัว `sales-proposal` | `@sales-nida` | ยังไม่เปิด |
| `finance` | `pricing-calc` ที่ `sales-proposal` เรียกใช้ตอนคิดราคา | `@fin-joy` | ยังไม่เปิด |
| `core` | นโยบายที่ต้องทำตาม: `customer-data-policy`, `brand-guide`, `pricing-rules` | `@plat-ken` | เปิดแล้ว |

ส่วน `exec:deal-approval` และ `sa:req-to-spec` เป็นแค่งานถัดไปหลังจบ proposal จึงไม่ต้องติดตั้งเพื่อร่าง proposal

### วิธีติดตั้ง
โต๊ะนี้ผูกกับคลัง `novatech-skills` อยู่แล้ว จึงรันแค่นี้:

```
claude plugin install sales@novatech-skills --scope project
claude plugin install finance@novatech-skills --scope project
```

จากนั้นเปิด session ใหม่ แล้วเรียกใช้ `/sales:sales-proposal` ได้เลย

catalog ไม่ได้ระบุคำสั่งติดตั้งหรือสิทธิ์ของแต่ละแผนก คำสั่งนี้เป็นวิธีมาตรฐานของ Claude Code และผมยังไม่ได้ลองรัน

### ก่อนติดตั้ง
- **ถามเจ้าของก่อน:** catalog ไม่ได้บอกว่าแผนกอื่นติดตั้งเองได้ไหม จึงควรถาม `@sales-nida` และ `@fin-joy` ก่อน
- **ข้อมูลราคา:** `pricing-calc` มีข้อมูลต้นทุนและ margin ภายใน เรื่องสิทธิ์นี้จึงควรถาม `@fin-joy` ด้วย
- **ถ้า HR แค่ต้องการ proposal สักฉบับ:** ส่ง TOR ให้ Sales ทำให้อาจง่ายกว่าติดตั้งเอง

ผมยังไม่ได้ติดตั้งหรือแก้ไขอะไร และไม่ได้เปิดไฟล์ของ skill `sales` กับ `finance` ข้อมูลทั้งหมดมาจาก catalog ของ `core:skill-finder` รายการ plugin ในเครื่อง และ `.claude/settings.json` ของโต๊ะนี้

---

## คำตอบเต็ม: `md-somchai`

**เปลี่ยนจริงแค่ 3 จุด แต่ควรแจ้งอย่างน้อย 4 คน และต้องปล่อยให้ตรงกัน** ถ้าปล่อยไม่พร้อมกัน Sales อาจเขียน 24 ชม. แต่ `deal-approval` ยังตรวจ 72 ชม. ผมยังไม่ได้แก้ไฟล์ใด

catalog อย่างเดียวตอบเรื่องนี้ไม่ได้ เพราะแถว `deal-approval` บอกว่ากระทบตรง 0 ตัว ทั้งที่ skill นี้มีเลข 72 ชม. อยู่ในไฟล์ของมันเอง

### จุดที่ต้องแก้
| จุด | ตำแหน่ง | เจ้าของ | ผู้รีวิว PR |
|---|---|---|---|
| ต้นฉบับกฎ | `notes/deal-rules.md:32` (เป็น v2026.3) | คุณ | – |
| ข้อความภาคผนวก | `core:customer-data-policy` 1.1.0, `references/bank-pdpa-annex.md:14` | `plat-may` | `@plat-ken` |
| เกณฑ์ตรวจของ MD | `exec:deal-approval`, `SKILL.md:27` และ `references/approval-rules.md:28` | คุณ | `@exec-ploy` |

- **ต้องให้เจ้าของตรวจ:** `sales:sales-proposal` 1.1.0 ระบุว่าใส่ภาคผนวกทุกครั้งที่ลูกค้าเป็นธนาคาร แต่ผมไม่ได้เปิดดูเพราะเป็น skill ของแผนกอื่น จึงไม่รู้ว่ามีเลข 72 อยู่ด้วยหรือไม่ ให้ `@sales-nida` เช็ก
- **เลขอ้างอิงเวอร์ชัน:** ถ้าออก `deal-rules` เวอร์ชันใหม่ ต้องแก้ที่อ้าง v2026.3 ใน `bank-pdpa-annex.md:3` และ `doc-type-rules.md:9` ด้วย
- **สำเนาเก่าบนโต๊ะคุณ:** `.claude/skills-archived/deal-approval/` ยังมีเลข 72 อยู่ ไม่ต้องแก้ แต่ไม่ควรหยิบมาใช้

### ต้องแจ้งใคร
| คน | เหตุผล | ระดับ |
|---|---|---|
| `plat-may` | เจ้าของ `customer-data-policy` และไฟล์ภาคผนวก | ต้องแจ้ง |
| `@plat-ken` | รีวิว PR ฝั่ง `core` | ต้องแจ้ง |
| `@exec-ploy` | รีวิว PR ฝั่ง `exec` | ต้องแจ้ง |
| `@sales-nida` | เจ้าของ `sales-proposal` และ Sales เป็นคนเขียนภาคผนวก | ต้องแจ้ง |
| `@fin-joy` | `deal-rules` ระบุว่าบัญชีเป็นคนเตรียมดีลส่ง MD | ควรแจ้ง |
| `@ops-art` | ทีมที่น่าจะต้องทำให้แจ้งเหตุทัน 24 ชม. ได้จริง | ควรแจ้ง (ผมประเมินเอง) |
| ฝ่ายกฎหมาย | เป็นคำมั่นต่อลูกค้าที่เข้มขึ้น | ควรแจ้ง (ผมประเมินเอง) |

### ผลกระทบตาม catalog
ถ้าถือเป็นการแก้ `customer-data-policy` ตามตาราง catalog จะได้ผลดังนี้:
- **กระทบตรง 23 skill จาก 11 ผู้ดูแล:** `@dev-pond` `@exec-ploy` `@fin-joy` `@hr-fah` `@ml-jay` `@ops-art` `@plat-ken` `@pm-beam` `@qa-mint` `@sa-ton` `@sales-nida`
- **กระทบต่อเนื่อง:** ไม่มีตัวใหม่ เพราะตัวที่ไล่ต่อได้ (`sales-proposal`, `project-scaffold`, `req-to-spec`) อยู่ใน 23 ตัวนี้แล้ว
- **รับงานต่อ (`next`):** `invoice-check`, `follow-up-email`, `sales-proposal` ซึ่งก็อยู่ใน 23 ตัวนี้เช่นกัน

ตัวเลขนี้คือขอบเขตสูงสุด เพราะ `follows` หมายถึงทำตามนโยบายทั้งฉบับ ไม่ได้แปลว่าใช้กฎข้อนี้ เช่น `jd-writer` น่าจะไม่เกี่ยว ดังนั้น 11 ผู้ดูแลนี้ส่งแค่ประกาศแจ้งให้ทราบครั้งเดียวก็พอ

### เรื่องที่ควรจัดการก่อนแก้
1. **เครื่องส่วนใหญ่ยังไม่มีไฟล์ภาคผนวก:** `core` 1.0.0 ไม่มี `bank-pdpa-annex.md` และรายการติดตั้งยังเป็น 1.0.0 อยู่ 28 จาก 29 รายการ รวมถึงโต๊ะคุณ ส่วน `sales` เป็น 1.1.0 แค่ 1 จาก 3 รายการ (`sales-krit`) ดังนั้นแก้ที่ต้นทางแล้วต้องให้ทุกคนอัปเดตด้วย
2. **`deal-approval` เก็บเลขซ้ำ:** `bank-pdpa-annex.md` บอกว่าเป็นต้นฉบับเดียวและห้ามเก็บสำเนา แต่ `deal-approval` ยังมีเลข 72 อยู่ แนะนำให้เปลี่ยนไปชี้ไฟล์นี้แทน รอบหน้าจะได้ไม่ต้องไล่แก้หลายที่
3. **ต้องทำได้จริงก่อนประกาศ:** ไฟล์ภาคผนวกห้ามแก้ข้อความเองถ้ายังยืนยันไม่ได้ว่าทำตามได้ ให้ `plat-may` กับ MD ตัดสินร่วมกัน จึงควรให้ `@ops-art` ยืนยันเรื่อง 24 ชม. ก่อน
4. **ต้องกำหนดวันมีผล:** กฎเดิมมีวันมีผลชัดเจน รอบนี้ก็ต้องระบุว่าใช้กับ proposal ที่ยื่นตั้งแต่วันไหน และจะทำอย่างไรกับดีลที่ส่งไปแล้วหรือสัญญาที่เซ็นด้วยเงื่อนไข 72 ชม.

### ขอบเขตที่ผมเปิดดู
- **เปิดดู:** โต๊ะคุณ, plugin `core` และ `exec` และรายการติดตั้ง `installed_plugins.json`
- **ไม่ได้เปิด:** โต๊ะคนอื่น, skill แผนกอื่น และ `_solution`
- **ข้อควรทราบ:** รายการติดตั้งแสดงชื่อโต๊ะอื่นและเวอร์ชันที่ติดตั้ง ผมใช้แค่นับเวอร์ชันและไม่ได้เข้าไปในโฟลเดอร์เหล่านั้น ผลกระทบของแผนกอื่นจึงมาจาก catalog และต้องให้เจ้าของแต่ละ skill ยืนยัน

ถ้าต้องการ ผมร่างข้อความแจ้งทีมและแก้ `notes/deal-rules.md` ให้ได้ ขอแค่วันมีผลที่คุณต้องการ

## โต๊ะ `hr-fah` · 28 วินาที · 7 รอบ

skill ที่หยิบเอง: `core:skill-finder`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | core:skill-finder |
| 2 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.0.0\skills\skill-finder\references\catalog.md |
| 3 | PowerShell | List installed plugins and configured marketplaces |
| 4 | Glob | * |
| 5 | Read | C:\t\org05l2\novatech\desks\hr-fah\.claude\settings.json |

**คำตอบของโต๊ะนี้**

**มีครับ คือ `sales:sales-proposal` ของแผนก Sales แต่โต๊ะนี้ยังใช้ไม่ได้ เพราะเปิดไว้แค่ `core` กับ `hr`** ต้องเพิ่ม `sales` และ `finance`

skill นี้ร่าง proposal จาก TOR ให้ลูกค้าองค์กร โดยเฉพาะธนาคาร ใช้โครง 9 หัวข้อ คิดราคาจาก price-list เช็ก margin ส่วนลด และงบ แล้วตัดข้อมูลส่วนบุคคลออก

## ผู้ดูแล
- **แผนก:** Sales
- **เจ้าของ skill และผู้ดูแล plugin (CODEOWNER):** `sales-nida` คนเดียวกัน

## ต้องติดตั้งอะไรบ้าง

| Plugin | ใช้ทำอะไร | ผู้ดูแล | สถานะที่โต๊ะนี้ |
|---|---|---|---|
| `sales` | ตัว `sales-proposal` | `@sales-nida` | ยังไม่เปิด |
| `finance` | `pricing-calc` ที่ `sales-proposal` เรียกใช้ตอนคิดราคา | `@fin-joy` | ยังไม่เปิด |
| `core` | นโยบายที่ต้องทำตาม: `customer-data-policy`, `brand-guide`, `pricing-rules` | `@plat-ken` | เปิดแล้ว |

ส่วน `exec:deal-approval` และ `sa:req-to-spec` เป็นแค่งานถัดไปหลังจบ proposal จึงไม่ต้องติดตั้งเพื่อร่าง proposal

## วิธีติดตั้ง
โต๊ะนี้ผูกกับคลัง `novatech-skills` อยู่แล้ว จึงรันแค่นี้:

```
claude plugin install sales@novatech-skills --scope project
claude plugin install finance@novatech-skills --scope project
```

จากนั้นเปิด session ใหม่ แล้วเรียกใช้ `/sales:sales-proposal` ได้เลย

catalog ไม่ได้ระบุคำสั่งติดตั้งหรือสิทธิ์ของแต่ละแผนก คำสั่งนี้เป็นวิธีมาตรฐานของ Claude Code และผมยังไม่ได้ลองรัน

## ก่อนติดตั้ง
- **ถามเจ้าของก่อน:** catalog ไม่ได้บอกว่าแผนกอื่นติดตั้งเองได้ไหม จึงควรถาม `@sales-nida` และ `@fin-joy` ก่อน
- **ข้อมูลราคา:** `pricing-calc` มีข้อมูลต้นทุนและ margin ภายใน เรื่องสิทธิ์นี้จึงควรถาม `@fin-joy` ด้วย
- **ถ้า HR แค่ต้องการ proposal สักฉบับ:** ส่ง TOR ให้ Sales ทำให้อาจง่ายกว่าติดตั้งเอง

ผมยังไม่ได้ติดตั้งหรือแก้ไขอะไร และไม่ได้เปิดไฟล์ของ skill `sales` กับ `finance` ข้อมูลทั้งหมดมาจาก catalog ของ `core:skill-finder` รายการ plugin ในเครื่อง และ `.claude/settings.json` ของโต๊ะนี้

## โต๊ะ `md-somchai` · 78 วินาที · 13 รอบ

skill ที่หยิบเอง: `core:skill-finder`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | core:skill-finder |
| 2 | Glob | **/* |
| 3 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.0.0\skills\skill-finder\references\catalog.md |
| 4 | Read | C:\t\org05l2\novatech\desks\md-somchai\notes\deal-rules.md |
| 5 | Grep | PDPA\|72\|ธนาคาร |
| 6 | Grep | 72\|ภาคผนวก PDPA\|breach\|แจ้งเหตุ |
| 7 | Grep | 72 ?(ชั่วโมง\|ชม)\|ภาคผนวก PDPA\|breach\|แจ้งเหตุ |
| 8 | Read | C:\t\org05l2\novatech\desks\md-somchai\.claude\settings.json |
| 9 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.1.0\skills\customer-data-policy\references\bank-pdpa-annex.m |
| 10 | Bash | Compare the two cached core versions and show installed plugin versions |
| 11 | Grep | bank-pdpa-annex\|deal-rules\|deal-approval\|sales-proposal\|แจ้ง\|CODEOWNER\|เจ้าของ\|owner |

**คำตอบของโต๊ะนี้**

**เปลี่ยนจริงแค่ 3 จุด แต่ควรแจ้งอย่างน้อย 4 คน และต้องปล่อยให้ตรงกัน** ถ้าปล่อยไม่พร้อมกัน Sales อาจเขียน 24 ชม. แต่ `deal-approval` ยังตรวจ 72 ชม. ผมยังไม่ได้แก้ไฟล์ใด

catalog อย่างเดียวตอบเรื่องนี้ไม่ได้ เพราะแถว `deal-approval` บอกว่ากระทบตรง 0 ตัว ทั้งที่ skill นี้มีเลข 72 ชม. อยู่ในไฟล์ของมันเอง

## จุดที่ต้องแก้
| จุด | ตำแหน่ง | เจ้าของ | ผู้รีวิว PR |
|---|---|---|---|
| ต้นฉบับกฎ | `notes/deal-rules.md:32` (เป็น v2026.3) | คุณ | – |
| ข้อความภาคผนวก | `core:customer-data-policy` 1.1.0, `references/bank-pdpa-annex.md:14` | `plat-may` | `@plat-ken` |
| เกณฑ์ตรวจของ MD | `exec:deal-approval`, `SKILL.md:27` และ `references/approval-rules.md:28` | คุณ | `@exec-ploy` |

- **ต้องให้เจ้าของตรวจ:** `sales:sales-proposal` 1.1.0 ระบุว่าใส่ภาคผนวกทุกครั้งที่ลูกค้าเป็นธนาคาร แต่ผมไม่ได้เปิดดูเพราะเป็น skill ของแผนกอื่น จึงไม่รู้ว่ามีเลข 72 อยู่ด้วยหรือไม่ ให้ `@sales-nida` เช็ก
- **เลขอ้างอิงเวอร์ชัน:** ถ้าออก `deal-rules` เวอร์ชันใหม่ ต้องแก้ที่อ้าง v2026.3 ใน `bank-pdpa-annex.md:3` และ `doc-type-rules.md:9` ด้วย
- **สำเนาเก่าบนโต๊ะคุณ:** `.claude/skills-archived/deal-approval/` ยังมีเลข 72 อยู่ ไม่ต้องแก้ แต่ไม่ควรหยิบมาใช้

## ต้องแจ้งใคร
| คน | เหตุผล | ระดับ |
|---|---|---|
| `plat-may` | เจ้าของ `customer-data-policy` และไฟล์ภาคผนวก | ต้องแจ้ง |
| `@plat-ken` | รีวิว PR ฝั่ง `core` | ต้องแจ้ง |
| `@exec-ploy` | รีวิว PR ฝั่ง `exec` | ต้องแจ้ง |
| `@sales-nida` | เจ้าของ `sales-proposal` และ Sales เป็นคนเขียนภาคผนวก | ต้องแจ้ง |
| `@fin-joy` | `deal-rules` ระบุว่าบัญชีเป็นคนเตรียมดีลส่ง MD | ควรแจ้ง |
| `@ops-art` | ทีมที่น่าจะต้องทำให้แจ้งเหตุทัน 24 ชม. ได้จริง | ควรแจ้ง (ผมประเมินเอง) |
| ฝ่ายกฎหมาย | เป็นคำมั่นต่อลูกค้าที่เข้มขึ้น | ควรแจ้ง (ผมประเมินเอง) |

## ผลกระทบตาม catalog
ถ้าถือเป็นการแก้ `customer-data-policy` ตามตาราง catalog จะได้ผลดังนี้:
- **กระทบตรง 23 skill จาก 11 ผู้ดูแล:** `@dev-pond` `@exec-ploy` `@fin-joy` `@hr-fah` `@ml-jay` `@ops-art` `@plat-ken` `@pm-beam` `@qa-mint` `@sa-ton` `@sales-nida`
- **กระทบต่อเนื่อง:** ไม่มีตัวใหม่ เพราะตัวที่ไล่ต่อได้ (`sales-proposal`, `project-scaffold`, `req-to-spec`) อยู่ใน 23 ตัวนี้แล้ว
- **รับงานต่อ (`next`):** `invoice-check`, `follow-up-email`, `sales-proposal` ซึ่งก็อยู่ใน 23 ตัวนี้เช่นกัน

ตัวเลขนี้คือขอบเขตสูงสุด เพราะ `follows` หมายถึงทำตามนโยบายทั้งฉบับ ไม่ได้แปลว่าใช้กฎข้อนี้ เช่น `jd-writer` น่าจะไม่เกี่ยว ดังนั้น 11 ผู้ดูแลนี้ส่งแค่ประกาศแจ้งให้ทราบครั้งเดียวก็พอ

## เรื่องที่ควรจัดการก่อนแก้
1. **เครื่องส่วนใหญ่ยังไม่มีไฟล์ภาคผนวก:** `core` 1.0.0 ไม่มี `bank-pdpa-annex.md` และรายการติดตั้งยังเป็น 1.0.0 อยู่ 28 จาก 29 รายการ รวมถึงโต๊ะคุณ ส่วน `sales` เป็น 1.1.0 แค่ 1 จาก 3 รายการ (`sales-krit`) ดังนั้นแก้ที่ต้นทางแล้วต้องให้ทุกคนอัปเดตด้วย
2. **`deal-approval` เก็บเลขซ้ำ:** `bank-pdpa-annex.md` บอกว่าเป็นต้นฉบับเดียวและห้ามเก็บสำเนา แต่ `deal-approval` ยังมีเลข 72 อยู่ แนะนำให้เปลี่ยนไปชี้ไฟล์นี้แทน รอบหน้าจะได้ไม่ต้องไล่แก้หลายที่
3. **ต้องทำได้จริงก่อนประกาศ:** ไฟล์ภาคผนวกห้ามแก้ข้อความเองถ้ายังยืนยันไม่ได้ว่าทำตามได้ ให้ `plat-may` กับ MD ตัดสินร่วมกัน จึงควรให้ `@ops-art` ยืนยันเรื่อง 24 ชม. ก่อน
4. **ต้องกำหนดวันมีผล:** กฎเดิมมีวันมีผลชัดเจน รอบนี้ก็ต้องระบุว่าใช้กับ proposal ที่ยื่นตั้งแต่วันไหน และจะทำอย่างไรกับดีลที่ส่งไปแล้วหรือสัญญาที่เซ็นด้วยเงื่อนไข 72 ชม.

## ขอบเขตที่ผมเปิดดู
- **เปิดดู:** โต๊ะคุณ, plugin `core` และ `exec` และรายการติดตั้ง `installed_plugins.json`
- **ไม่ได้เปิด:** โต๊ะคนอื่น, skill แผนกอื่น และ `_solution`
- **ข้อควรทราบ:** รายการติดตั้งแสดงชื่อโต๊ะอื่นและเวอร์ชันที่ติดตั้ง ผมใช้แค่นับเวอร์ชันและไม่ได้เข้าไปในโฟลเดอร์เหล่านั้น ผลกระทบของแผนกอื่นจึงมาจาก catalog และต้องให้เจ้าของแต่ละ skill ยืนยัน

ถ้าต้องการ ผมร่างข้อความแจ้งทีมและแก้ `notes/deal-rules.md` ให้ได้ ขอแค่วันมีผลที่คุณต้องการ

