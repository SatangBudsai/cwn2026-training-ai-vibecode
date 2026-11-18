# Week 03 · Reverse Engineer ANYTHING (REA)

ให้ AI "สืบ" เว็บที่มีอยู่จริง (Google Flights: กรุงเทพ → ญี่ปุ่น) แล้วสร้างแอปจองตั๋วของเราเอง (Next.js + PostgreSQL ใน Docker) ทุกอย่างรันใน container `multi-account-devtool` (`yolo1–3` · `cyolo1–2` · REA MCP · Playwright) ผู้เรียนแค่ copy พรอมต์ไปวางใน Claude Code Desktop

แต่ละบทเพิ่มเครื่องมือ แล้ว **วัดผลด้วย Playwright** ว่าแอปที่ได้ดีขึ้นจริงไหม

| บท | หัวข้อ | เครื่องมือที่เพิ่ม | แอปที่ได้ | ผลวัดจริง |
|---|---|---|---|---|
| [00_REA_Theory_Setup](00_REA_Theory_Setup/README.md) | ทฤษฎี REA ทีละขั้น (T1–T15) + ติดตั้ง REA ใน container | REA (ติดตั้ง) | — | `yolo1` เห็น REA 207 tools |
| [01_REA_Basics_Flight](01_REA_Basics_Flight/README.md) | ใช้ REA สืบ Google Flights แล้วสร้างแอป + วัดผล 5 ไม้บรรทัด | REA อย่างเดียว | **SkyThai Mini** (v1) · :5081 | playlist ผ่าน 5/5 · วัดด้วยไม้บรรทัด 5 อัน (LAB 6) |
| [02_REA_Playwright_Exploration](02_REA_Playwright_Exploration/README.md) | สำรวจเว็บแบบ EXPLORATION (A–E) | + Playwright MCP | **SkyThai Plus** (v2) · :5082 | ชุดเทียบของบท: v1 4/35 (11.4%) → v2 33/35 (94.3%) |
| [03_REA_Toolchain_Loop](03_REA_Toolchain_Loop/README.md) | ปิดวงจรโคลน | + HAR · trace/GIF · กรรมการอิสระ (Codex) · วนแก้ · visual diff | **SkyThai Pro** (v3) · :5083 | กรรมการ 82 ข้อ: v1 0 · v2 51 (62%) · v3 74 (90%) · เที่ยวบิน 22 → 300 |
| [04_REA_Differential_Oracle](04_REA_Differential_Oracle/README.md) | ใช้ต้นฉบับเป็นเฉลย | + ต้นฉบับแช่แข็งจาก HAR · differential testing · เทียบโครงสร้าง (ariaSnapshot) · mutation testing · แก้แบบรุม (swarm) | **SkyThai Max** (v4) · :5084 | differential v3 4/8 → **v4 8/8** · โครงสร้าง 70.5% → **78.6%** · visual diff 8.32% → **5.13%** |
| [05_REA_Two_Stage_Pipeline](05_REA_Two_Stage_Pipeline/README.md) | ต่อยอด v4 ด้วยอัลกอริทึม 2 ขั้น | + structure compiler · coordinate descent · ตัวล็อกโครงสร้าง · ตัวกันอ่านไม่ออก | **SkyThai v5** · :5092 | โครงสร้าง 78.6% → **96.3%** · visual diff 5.04% → **4.12%** · Score 73.56 → **92.18** · ผ่านตัวกันอ่านไม่ออก |
| [06_REA_Two_Stage_Loop_Scratch](06_REA_Two_Stage_Loop_Scratch/README.md) | ทั้งระบบใหม่จาก URL: Parallel Exploration + two-stage loop | + สำรวจพร้อมกัน 4 บัญชี · ไม้บรรทัดใหม่ (ข้อสอบต้องผ่านกับต้นฉบับก่อน) · แช่แข็งพิกเซล · loop โครงสร้าง ≤ 2 · loop พิกเซล ≤ 2 · ตัวกันช่องโหว่ | **SkyThai Zero** (v6) · :5096 | ไม้บรรทัดชุดใหม่: gate 27/31 → **31/31** · โครงสร้าง 92.28% → **94.67%** · visual diff 5.24% → **4.77%** · Score **89.90** |

### ภาพรวมผลวัดทุกเวอร์ชัน (รันจริง · ชุดทดสอบเดียวกัน)

| เวอร์ชัน | acceptance 82 ข้อ (กรรมการ cyolo1) | differential 8 สถานการณ์ (เทียบต้นฉบับแช่แข็ง) | โครงสร้างหน้า (ariaSnapshot) | visual diff (ต่ำ = ใกล้) | เที่ยวบิน |
|---|---:|---:|---:|---:|---:|
| v1 Mini · REA | 0/82 | 0/8 | 3.8% | 27.88% | 22 |
| v2 Plus · + Playwright | 51/82 | 3/8 | 55.8% | 8.19% | 22 |
| v3 Pro · + HAR · กรรมการ · วนแก้ | 74/82 | 4/8 | 70.5% | 8.32% | 300 |
| v4 Max · + ต้นฉบับแช่แข็ง · differential · swarm | 74/82 | 8/8 | 78.6% | 5.13% | 300 |
| v5 · + two-stage pipeline | 74/82 | **8/8** | **96.3%** | **4.12%** | 300 |

**visual diff คำนวณยังไง:** เทียบภาพหน้าผลค้นหา $1366 \times 900$ ทีละพิกเซลด้วย pixelmatch ($t = 0.1$) พิกเซลนับว่าต่างเมื่อ $\delta = 0.5053Y^2 + 0.299I^2 + 0.1957Q^2 > 352.15$ แล้ว

$$\text{visual diff} = \frac{\text{จำนวนพิกเซลที่ต่าง}}{1{,}229{,}400} \times 100\% \qquad \text{เช่น v4} = \frac{63{,}012}{1{,}229{,}400} \times 100 = 5.13\%$$

(บทที่ 6 สร้างไม้บรรทัดชุดใหม่จากต้นฉบับสด จึงไม่อยู่ในตารางนี้ · ดูผลใน [บทที่ 6](06_REA_Two_Stage_Loop_Scratch/README.md))

(อธิบายทีละขั้นใน [บทที่ 3 · T7](03_REA_Toolchain_Loop/README.md))

**ต้องมีก่อน:** [LAB 03 container](../01_week02/03_MultiAccount_Container/) (เปิดด้วย `/maccount`) · [LAB 04 shared skills](../01_week02/04_Skill_Setup/00_Setup_Skill/readme.md) · Docker Desktop · Claude Code Desktop

> ⚠️ เราสืบเว็บของคนอื่นเพื่อ **เรียนรู้แนวคิด** เท่านั้น: ไม่ล็อกอิน ไม่จ่ายเงิน ไม่ข้าม CAPTCHA ไม่ลอกโลโก้/โค้ด/แบรนด์ ไฟล์ HAR/trace มี cookie ห้ามนำออกนอก container · ราคาในแอปเป็นข้อมูลจำลอง ณ 31 ต.ค. 2569
