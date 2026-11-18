# ชุด eval ของ plugin `shared` (meeting-minutes)

รันโดยผู้รีวิว PR บนเครื่องตัวเอง ผ่าน `python scripts/skill_eval.py <PR>` (ใช้ credential Claude ของผู้รีวิวเอง — ไม่มี token AI ใน CI)
หรือรันตรง: `claude plugin eval plugins/shared --ablation with-without --trust-plugin`

| case | ตรวจอะไร | กติกาใน SKILL.md |
|---|---|---|
| `action-items` | ใช้โครงของบริษัท (สรุป 3 บรรทัด), action item มีเจ้าของ 1 คน + วันที่จริงพร้อมชื่อวัน, ไม่เดา (`[...]`), ติด ⚠️ คำมั่นเกินหลักฐาน | ขั้น 1, 3 |
| `decided-vs-pending` | แยก ตัดสินแล้ว / รับปาก / คำถามค้าง — "น่าจะ" ไม่ใช่การตัดสิน | ขั้น 2 |
| `external-copy` | ฉบับส่งคนนอกตัดเบอร์มือถือ ความเห็นภายใน คู่แข่ง (ตัดสินจากตัวเอกสาร ไม่ใช่ข้อความอธิบาย) | ขั้น 5, ห้าม |

ทุก case มี grader `tool_used: Skill` (ตัวบอกว่า skill ถูกเรียกจริง — ไม่นับคะแนนตอนเทียบมี/ไม่มี skill)
แก้ SKILL.md ของ meeting-minutes แล้วกติกาเปลี่ยน → แก้ case ที่เกี่ยวข้องใน PR เดียวกัน
ผลรันอยู่ที่ `evals/results/` (ไม่ commit)
