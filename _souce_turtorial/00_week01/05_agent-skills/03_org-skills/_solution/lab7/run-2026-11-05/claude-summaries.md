# LAB 7 · ผลรันจริงแบบวางพรอมต์ครั้งเดียว (2026-11-05)

รันที่สำเนาแยก `C:/t/org05p/novatech` ต่อจาก LAB 6 ด้วย `claude -p` ที่โฟลเดอร์ `novatech/` · พรอมต์ = [`prompt.txt`](prompt.txt) ทุกตัวอักษร · รวม 2 นาที 2 วินาที (23:12:47 → 23:14:49)

## คำตอบสุดท้ายของ Claude ตัวหลัก (ผู้ประสานงาน)

ส่งคำถามให้ทั้ง 2 โต๊ะพร้อมกันแล้ว ทั้งคู่รันจบโดยไม่มี error ผมแค่ส่งคำถาม ไม่ได้ตอบแทน log อยู่ที่ `logs/lab7/hr-fah.jsonl` และ `logs/lab7/md-somchai.jsonl`

| โต๊ะ | skill ที่ Claude หยิบเอง (ดูจาก log) | เวลา | คำตอบสั้น ๆ |
|---|---|---|---|
| hr-fah | `core:skill-finder` แล้วอ่าน `catalog.md` ของมัน (ใช้ 2 tool call) | 27 วินาที (ราว 30 วินาทีเมื่อนับเวลาเปิดโปรแกรม) | มี skill ชื่อ `sales-proposal` ของแผนก Sales ซึ่ง sales-nida เป็นเจ้าของและเป็น CODEOWNER ถ้าจะใช้ ให้เพิ่ม marketplace แล้ว `/plugin install sales@novatech-skills` ส่วน core ติดตั้งไว้แล้ว แต่แนะนำให้ส่งงานให้ Sales มากกว่าติดตั้งเอง |
| md-somchai | `core:skill-finder` แล้วอ่าน catalog จากนั้นรัน grep 3 ครั้ง ค้นแค่โต๊ะตัวเอง, `core` และ `exec` | 46 วินาที (ราว 49 วินาที) | กฎ 72 ชม. อยู่ใน `exec:deal-approval` และ `notes/deal-rules.md` ไม่ได้อยู่ใน core skill ที่โดนผลกระทบคือ `sales-proposal` (มากที่สุด), `pricing-calc` และ `exec-deck` (น้อย) ต้องแจ้ง exec-ploy ให้ approve PR, sales-nida ให้แก้ proposal, fin-joy และ plat-may ให้ทราบ |

ทั้งสองโต๊ะทำตามข้อห้าม ไม่ได้เปิดโต๊ะของคนอื่น ไม่ได้เปิด `_solution/` และไม่ได้เปิดไฟล์ skill ของแผนกอื่น ข้อมูลของแผนกอื่นมาจาก catalog ของ skill-finder อย่างเดียว ที่ md-somchai เข้าไปใกล้ที่สุดคือรัน `ls` ดูรายชื่อโฟลเดอร์ใน plugins แต่ไม่ได้เปิดไฟล์ข้างใน

---

### คำตอบเต็ม: hr-fah

มีครับ skill ที่ใช้ทำ proposal ให้ลูกค้าคือ **`sales-proposal`** ของแผนก Sales ข้อมูลนี้ผมดูจากแค็ตตาล็อกของ `core:skill-finder` อย่างเดียว ไม่ได้เปิดโฟลเดอร์ของแผนกอื่น

| หัวข้อ | รายละเอียด |
|---|---|
| skill | `sales-proposal`: ร่าง proposal ให้ลูกค้าองค์กรจาก TOR (เหมาะกับลูกค้าธนาคารเป็นพิเศษ) |
| plugin / แผนก | `sales` (แผนก Sales) |
| เจ้าของ skill | `sales-nida` |
| CODEOWNER (คนอนุมัติ PR) | `sales-nida` (หัวหน้าแผนก Sales) |
| กติกาที่ skill นี้ต้องทำตาม | `pricing-rules`, `brand-guide`, `customer-data-policy` (ทั้งสามตัวอยู่ใน `core` ที่เครื่องคุณติดตั้งไว้แล้ว) |
| งานก่อนหน้า | `req-to-spec` (SA), `arch-template` (SA), `pricing-calc` (Finance), `follow-up-email` (Sales) |
| งานถัดไป | `deal-approval` (MD), `follow-up-email`, `req-to-spec` |

**ต้องติดตั้งอะไร**
1. เพิ่ม marketplace ถ้ายังไม่มี: `/plugin marketplace add http://localhost:3300/novatech/org-skills.git`
2. `core@novatech-skills` ติดตั้งไว้แล้ว ไม่ต้องทำอะไรเพิ่ม
3. แพ็ก Sales: `/plugin install sales@novatech-skills`

ใช้งานได้ด้วยประโยคอย่าง "ร่าง proposal จาก TOR นี้ให้หน่อย"

**ข้อควรรู้:** เครื่องนี้เป็นของฝ่าย HR (`hr-fah`) และบริษัทให้แต่ละคนติดตั้งแค่ `core` กับแพ็กของแผนกตัวเอง เพื่อไม่ให้มี skill มากจนหยิบผิดตัว ถ้าคุณแค่อยากรู้ว่า Sales ทำ proposal ยังไง ก็ไม่ต้องติดตั้ง แต่ถ้าต้องทำ proposal เองจริง ๆ ผมแนะนำให้ส่งงานให้ทีม Sales หรือคุยกับ `sales-nida` ก่อนติดตั้ง

ส่วนงานที่ใกล้กับ proposal และทำได้ด้วยแพ็กที่มีอยู่แล้ว คือ `core:brand-guide` สำหรับตรวจน้ำเสียงและแบรนด์ของเอกสารที่ส่งออกนอกบริษัท และ `core:customer-data-policy` สำหรับเช็ก PDPA ก่อนส่ง

---

### คำตอบเต็ม: md-somchai

คำตอบสั้น ๆ คือ กฎ 72 ชั่วโมงเป็นกฎของ skill `exec:deal-approval` ซึ่งคุณดูแลเอง ไม่ได้อยู่ในนโยบาย PDPA ของ core ถ้าจะเปลี่ยน ต้องแก้ใน skill นั้น และต้องแจ้ง Sales เป็นอันดับแรก

ผมดูจากโต๊ะของคุณ (`notes/`), skill ใน core, skill ของแผนก exec และแค็ตตาล็อกของ `skill-finder` เท่านั้น ไม่ได้เปิด skill ของแผนกอื่น

**กฎนี้เขียนไว้ที่ไหน**

| ที่ | สิ่งที่ต้องแก้ |
|---|---|
| `exec/deal-approval/SKILL.md` บรรทัด 27 | "แจ้งเหตุ 72 ชม." |
| `exec/deal-approval/references/approval-rules.md` บรรทัด 28 | "Breach notification — แจ้งภายใน 72 ชั่วโมง" |
| `notes/deal-rules.md` ข้อ 3.3 (ต้นฉบับกติกาของคุณ v2026.3) | แก้ตัวเลข ขึ้นเลขเวอร์ชัน และใส่วันที่มีผล |

`core:customer-data-policy` (`doc-type-rules.md`) ไม่ได้เขียนตัวเลข 72 ไว้ มีแค่ประโยคที่ชี้กลับมาว่า "ภาคผนวก PDPA ลูกค้าธนาคารเป็นกติกาของ MD (ดู `deal-approval`)" จึงไม่ต้องแก้

**skill ที่โดนผลกระทบ**

ข้อมูลจากตารางผลกระทบในแค็ตตาล็อก ไม่มี skill ไหนเรียกใช้ `deal-approval` ตรง ๆ ส่วนนี้คือ skill ที่ส่งงานเข้ามาให้ `deal-approval`:

| skill | แผนก | เจ้าของ / CODEOWNER | โดนแค่ไหน |
|---|---|---|---|
| `sales-proposal` | sales | sales-nida / sales-nida | **สูงสุด** เพราะเป็นตัวร่างภาคผนวก PDPA ใน proposal ธนาคาร ถ้ายังเขียน 72 ชม. proposal จะถูกตีกลับทุกฉบับตามข้อ 5 |
| `pricing-calc` | finance | fin-joy / fin-joy | ต่ำ ส่งดีลเข้ามา แต่ไม่ได้เกี่ยวกับตัวภาคผนวก |
| `exec-deck` | exec | exec-ploy / exec-ploy | ต่ำ ถ้าสไลด์เดือนถัดไปมีดีลที่โดนตีกลับเพราะกฎใหม่ ควรบอกเหตุผลไว้ |

ผมไม่ได้เปิด `sales-proposal` เพราะเป็น skill ของแผนกอื่น จึงยืนยันไม่ได้ว่าในนั้นมีเลข 72 อยู่จริงหรือเปล่า ต้องให้ sales-nida ตรวจเอง

มีอีกเรื่องที่เกี่ยวข้อง ใน `won-proposals/` มี proposal ที่ได้งานก่อน 1 ก.ค. 2026 ซึ่งยังไม่มีภาคผนวกนี้ คนที่หยิบมาเป็นแบบต้องใส่ภาคผนวกที่เป็นตัวเลขใหม่

**ต้องแจ้งใคร**
1. **exec-ploy** (CODEOWNER ของ exec) ต้อง approve PR ที่แก้ `deal-approval` ในคลัง org-skills ถึงคุณจะเป็นเจ้าของ skill ก็ approve เองไม่ได้
2. **sales-nida** (หัวหน้า Sales) ให้แก้ `sales-proposal` ให้ตรงกับกฎใหม่ แล้วปล่อยพร้อมกันหรือก่อน `deal-approval` ไม่อย่างนั้นดีลธนาคารที่อยู่ระหว่างทางจะโดนตีกลับกันหมด และควรบอกทีม Sales (เช่น sales-krit) ถึงดีลธนาคารที่ส่ง proposal ไปแล้วด้วย
3. **fin-joy** (บัญชี) แค่แจ้งให้ทราบ เพราะในไฟล์กติกาเขียนไว้ว่าใช้กับ "Sales, บัญชี"
4. **plat-may** (เจ้าของ `customer-data-policy`) แจ้งให้ทราบ ถ้าอยากให้ core ระบุตัวเลขใหม่ไว้ด้วย ต้องเปิด PR ไปที่ core ซึ่ง CODEOWNER คือ plat-ken

เรื่องลำดับและวันมีผล เลข 24 ชั่วโมงเข้มกว่าเดิม จึงควรประกาศวันที่มีผลไว้ล่วงหน้า แบบที่เคยทำกับกฎ 1 ก.ค. 2026 แล้วรวม PR ของ `sales-proposal` ก่อนหรือพร้อมกับ `deal-approval` แค็ตตาล็อกไม่ต้องแก้มือ เพราะสร้างใหม่จาก header ของ SKILL.md เอง

ถ้าต้องการ ผมร่างข้อความแก้ใน `notes/deal-rules.md` (v2026.4) และร่างข้อความแจ้ง sales-nida กับ exec-ploy ให้ได้

---

ใน `logs/lab7/` มีไฟล์ที่ผมสร้างเพิ่มด้วย คือ `<user>.err` ที่เก็บ stderr (ว่างทั้งคู่) และ `<user>.jsonl.result.md` ที่เก็บคำตอบสุดท้ายเป็น UTF-8 เพราะหน้าจอ console แสดงภาษาไทยเพี้ยน ถ้าไม่ต้องการก็ลบสองไฟล์นี้ได้

## โต๊ะ `hr-fah` · 27 วินาที · 4 รอบ

skill ที่หยิบเอง: `core:skill-finder`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | core:skill-finder |
| 2 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.0.0\skills\skill-finder\references\catalog.md |

**คำตอบของโต๊ะนี้**

มีครับ skill ที่ใช้ทำ proposal ให้ลูกค้าคือ **`sales-proposal`** ของแผนก Sales ข้อมูลนี้ผมดูจากแค็ตตาล็อกของ `core:skill-finder` อย่างเดียว ไม่ได้เปิดโฟลเดอร์ของแผนกอื่น

| หัวข้อ | รายละเอียด |
|---|---|
| skill | `sales-proposal`: ร่าง proposal ให้ลูกค้าองค์กรจาก TOR (เหมาะกับลูกค้าธนาคารเป็นพิเศษ) |
| plugin / แผนก | `sales` (แผนก Sales) |
| เจ้าของ skill | `sales-nida` |
| CODEOWNER (คนอนุมัติ PR) | `sales-nida` (หัวหน้าแผนก Sales) |
| กติกาที่ skill นี้ต้องทำตาม | `pricing-rules`, `brand-guide`, `customer-data-policy` (ทั้งสามตัวอยู่ใน `core` ที่เครื่องคุณติดตั้งไว้แล้ว) |
| งานก่อนหน้า | `req-to-spec` (SA), `arch-template` (SA), `pricing-calc` (Finance), `follow-up-email` (Sales) |
| งานถัดไป | `deal-approval` (MD), `follow-up-email`, `req-to-spec` |

**ต้องติดตั้งอะไร**
1. เพิ่ม marketplace ถ้ายังไม่มี: `/plugin marketplace add http://localhost:3300/novatech/org-skills.git`
2. `core@novatech-skills` ติดตั้งไว้แล้ว ไม่ต้องทำอะไรเพิ่ม
3. แพ็ก Sales: `/plugin install sales@novatech-skills`

ใช้งานได้ด้วยประโยคอย่าง "ร่าง proposal จาก TOR นี้ให้หน่อย"

**ข้อควรรู้:** เครื่องนี้เป็นของฝ่าย HR (`hr-fah`) และบริษัทให้แต่ละคนติดตั้งแค่ `core` กับแพ็กของแผนกตัวเอง เพื่อไม่ให้มี skill มากจนหยิบผิดตัว ถ้าคุณแค่อยากรู้ว่า Sales ทำ proposal ยังไง ก็ไม่ต้องติดตั้ง แต่ถ้าต้องทำ proposal เองจริง ๆ ผมแนะนำให้ส่งงานให้ทีม Sales หรือคุยกับ `sales-nida` ก่อนติดตั้ง

ส่วนงานที่ใกล้กับ proposal และทำได้ด้วยแพ็กที่มีอยู่แล้ว คือ `core:brand-guide` สำหรับตรวจน้ำเสียงและแบรนด์ของเอกสารที่ส่งออกนอกบริษัท และ `core:customer-data-policy` สำหรับเช็ก PDPA ก่อนส่ง

## โต๊ะ `md-somchai` · 46 วินาที · 7 รอบ

skill ที่หยิบเอง: `core:skill-finder`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | core:skill-finder |
| 2 | Bash | Read the skill catalog |
| 3 | Bash | Search my desk and core/exec skills for the 72-hour rule |
| 4 | Bash | Read my deal-rules notes and find the PDPA annex references |
| 5 | Bash | Check local settings and archived skills for stale copies |

**คำตอบของโต๊ะนี้**

คำตอบสั้น ๆ คือ กฎ 72 ชั่วโมงเป็นกฎของ skill `exec:deal-approval` ซึ่งคุณดูแลเอง ไม่ได้อยู่ในนโยบาย PDPA ของ core ถ้าจะเปลี่ยน ต้องแก้ใน skill นั้น และต้องแจ้ง Sales เป็นอันดับแรก

ผมดูจากโต๊ะของคุณ (`notes/`), skill ใน core, skill ของแผนก exec และแค็ตตาล็อกของ `skill-finder` เท่านั้น ไม่ได้เปิด skill ของแผนกอื่น

## กฎนี้เขียนไว้ที่ไหน

| ที่ | สิ่งที่ต้องแก้ |
|---|---|
| `exec/deal-approval/SKILL.md` บรรทัด 27 | "แจ้งเหตุ 72 ชม." |
| `exec/deal-approval/references/approval-rules.md` บรรทัด 28 | "Breach notification — แจ้งภายใน 72 ชั่วโมง" |
| `notes/deal-rules.md` ข้อ 3.3 (ต้นฉบับกติกาของคุณ v2026.3) | แก้ตัวเลข ขึ้นเลขเวอร์ชัน และใส่วันที่มีผล |

`core:customer-data-policy` (`doc-type-rules.md`) ไม่ได้เขียนตัวเลข 72 ไว้ มีแค่ประโยคที่ชี้กลับมาว่า "ภาคผนวก PDPA ลูกค้าธนาคารเป็นกติกาของ MD (ดู `deal-approval`)" จึงไม่ต้องแก้

## skill ที่โดนผลกระทบ

ข้อมูลจากตารางผลกระทบในแค็ตตาล็อก ไม่มี skill ไหนเรียกใช้ `deal-approval` ตรง ๆ ส่วนนี้คือ skill ที่ส่งงานเข้ามาให้ `deal-approval`:

| skill | แผนก | เจ้าของ / CODEOWNER | โดนแค่ไหน |
|---|---|---|---|
| `sales-proposal` | sales | sales-nida / sales-nida | **สูงสุด** เพราะเป็นตัวร่างภาคผนวก PDPA ใน proposal ธนาคาร ถ้ายังเขียน 72 ชม. proposal จะถูกตีกลับทุกฉบับตามข้อ 5 |
| `pricing-calc` | finance | fin-joy / fin-joy | ต่ำ ส่งดีลเข้ามา แต่ไม่ได้เกี่ยวกับตัวภาคผนวก |
| `exec-deck` | exec | exec-ploy / exec-ploy | ต่ำ ถ้าสไลด์เดือนถัดไปมีดีลที่โดนตีกลับเพราะกฎใหม่ ควรบอกเหตุผลไว้ |

ผมไม่ได้เปิด `sales-proposal` เพราะเป็น skill ของแผนกอื่น จึงยืนยันไม่ได้ว่าในนั้นมีเลข 72 อยู่จริงหรือเปล่า ต้องให้ sales-nida ตรวจเอง

มีอีกเรื่องที่เกี่ยวข้อง ใน `won-proposals/` มี proposal ที่ได้งานก่อน 1 ก.ค. 2026 ซึ่งยังไม่มีภาคผนวกนี้ คนที่หยิบมาเป็นแบบต้องใส่ภาคผนวกที่เป็นตัวเลขใหม่

## ต้องแจ้งใคร

1. **exec-ploy** (CODEOWNER ของ exec) ต้อง approve PR ที่แก้ `deal-approval` ในคลัง org-skills ถึงคุณจะเป็นเจ้าของ skill ก็ approve เองไม่ได้
2. **sales-nida** (หัวหน้า Sales) ให้แก้ `sales-proposal` ให้ตรงกับกฎใหม่ แล้วปล่อยพร้อมกันหรือก่อน `deal-approval` ไม่อย่างนั้นดีลธนาคารที่อยู่ระหว่างทางจะโดนตีกลับกันหมด และควรบอกทีม Sales (เช่น sales-krit) ถึงดีลธนาคารที่ส่ง proposal ไปแล้วด้วย
3. **fin-joy** (บัญชี) แค่แจ้งให้ทราบ เพราะในไฟล์กติกาเขียนไว้ว่าใช้กับ "Sales, บัญชี"
4. **plat-may** (เจ้าของ `customer-data-policy`) แจ้งให้ทราบ ถ้าอยากให้ core ระบุตัวเลขใหม่ไว้ด้วย ต้องเปิด PR ไปที่ core ซึ่ง CODEOWNER คือ plat-ken

เรื่องลำดับและวันมีผล เลข 24 ชั่วโมงเข้มกว่าเดิม จึงควรประกาศวันที่มีผลไว้ล่วงหน้า แบบที่เคยทำกับกฎ 1 ก.ค. 2026 แล้วรวม PR ของ `sales-proposal` ก่อนหรือพร้อมกับ `deal-approval` แค็ตตาล็อกไม่ต้องแก้มือ เพราะสร้างใหม่จาก header ของ SKILL.md เอง

ถ้าต้องการ ผมร่างข้อความแก้ใน `notes/deal-rules.md` (v2026.4) และร่างข้อความแจ้ง sales-nida กับ exec-ploy ให้ได้

