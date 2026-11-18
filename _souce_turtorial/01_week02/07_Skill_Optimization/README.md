# บท 07 · Skill Optimization: ปรับ Agent Skill ด้วยผลการวัด

> สกิลที่ "ใช้ได้" ยังไม่ใช่สกิลที่ "ดี" · บทนี้ใช้สกิล `skill-optimizer` วัด แก้ และตัดสินสกิลทีละรุ่น
> ตัวอย่างจริง: สกิล `web-fixer` ตรวจเว็บร้านอาหารแมวด้วย Playwright → แก้ Defect → พิสูจน์

![แนวคิดหลัก: สกิล v0 → แก้ไม่เกิน 3 จุด → สกิล v1 → ผลต่างเกิน threshold หรือไม่ → ACCEPT หรือ REJECT](01_theory/img/d26-one-idea.png)

| ลำดับ | เปิดไฟล์ | ได้อะไร |
|---|---|---|
| 1 | [`01_theory/`](01_theory/README.md) | ทฤษฎี 5 ส่วน: แนวคิด · กระบวนการ · ตัวอย่างจริง 1 รอบเต็ม · ใช้กับเว็บ · เครื่องมือ |
| 2 | [`02_lab/`](02_lab/README.md) | LAB 6 ขั้นแบบ Copy & Paste พร้อมผลจริง เว็บที่แต่ละรุ่นแก้ และ GIF |
| 3 | [`Skill_Optimization_Slides.html`](Skill_Optimization_Slides.html) | สไลด์ 53 หน้า (ทฤษฎี + LAB) เปิดด้วยเบราว์เซอร์ |
| – | [`skills/skill-optimizer/`](skills/skill-optimizer/SKILL.md) | สกิลที่ใช้ในบทนี้ (ฉบับเดียวกับใน container) |

## ผลจริงของบทนี้ (11 พ.ย. 2026)

![เส้นทางการปรับสกิลจริง v0 → v1 → v2](01_theory/img/r05-path.png)

| รุ่น | Training | Validation | รวม | Gate |
|---|---|---|---|---|
| ไม่มีสกิล | 87.5% | 100.0% | 91.7% | – |
| `v0` | 86.6% | 82.2% | 85.1% | REJECT (เทียบไม่มีสกิล) |
| `v1` | 96.4% | 98.2% | **97.0%** | **ACCEPT** (เทียบ `v0`) |
| `v2` | 100.0% | 96.5% | 98.8% | REJECT (เทียบ `v1`) |

6 Task × 2 Replicate ต่อรุ่น · โมเดล sonnet / effort medium · ผลดิบ 48 Trial: [`02_lab/results/`](02_lab/results/)

## ก่อนเริ่ม

- container `multi-account` รันอยู่ และมีสกิลใน `/root/ai-accounts/.Claude/shared/skills` (บท [03](../03_MultiAccount_Container/) · [04](../04_MultiAccount_Skill/))
- บัญชี `yolo` ล็อกอินแล้วอย่างน้อย 1 บัญชี
- ไม่ต้องคัดลอกไฟล์เข้า container: ชุดโจทย์อยู่ในสกิลแล้ว (`examples/web-fixer`)
