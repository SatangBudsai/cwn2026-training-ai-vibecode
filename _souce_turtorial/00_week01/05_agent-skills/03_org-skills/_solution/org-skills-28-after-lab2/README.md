# org-skills: คลัง skill กลางของโนวาเทค

marketplace ของ Claude Code ชื่อ `novatech-skills` รวม skill ของทุกแผนก 1 แผนก = 1 plugin

## ติดตั้ง

วางใน `.claude/settings.json` ของโต๊ะ แล้วเปลี่ยน `<แผนก>` เป็น plugin ของแผนกตัวเอง

```json
{
  "extraKnownMarketplaces": {
    "novatech-skills": {
      "source": { "source": "git", "url": "http://localhost:3300/novatech/org-skills.git" }
    }
  },
  "enabledPlugins": {
    "core@novatech-skills": true,
    "<แผนก>@novatech-skills": true
  }
}
```

หรือสั่ง `claude plugin marketplace add http://localhost:3300/novatech/org-skills.git` แล้ว `claude plugin install <แผนก>@novatech-skills` (plugin แผนกจะดึง `core` มาให้เอง)

## ชั้นของ skill

| layer | คืออะไร | อยู่ที่ |
|---|---|---|
| `core` | ของที่ทุกคนต้องใช้ เป็นต้นฉบับเดียวของกติกาที่หลายแผนกใช้ร่วมกัน | `plugins/core` |
| `department` | งานของแผนกเดียว | `plugins/<แผนก>` |
| `shared` | งานข้ามแผนกที่ไม่มีแผนกไหนเป็นเจ้าของ | `plugins/shared` |

## หัวไฟล์ SKILL.md

ทุก skill ใช้รูปแบบเดียวกัน

```yaml
---
name: ชื่อเดียวกับโฟลเดอร์
description: |
  ทำอะไร และใช้เมื่อผู้ใช้พูดว่าอะไร
metadata:
  owner: user เจ้าของ skill
  layer: core | department | shared
  version: 1.0.0
  uses: [skill ที่เรียกใช้]
  next: [งานถัดไป]
  follows: [นโยบายที่ต้องทำตาม]
---
```

## การแก้ไข

1. แตก branch แล้วแก้ skill ห้าม push ตรงเข้า `main`
2. ถ้าแก้หัวไฟล์ เพิ่ม หรือย้าย skill ให้รัน `python scripts/build-catalog.py` แล้ว commit `catalog.md` ไปด้วย
3. ตรวจด้วย `python scripts/build-catalog.py --check` และ `claude plugin validate .`
4. ขึ้นเลข `version` ใน `plugin.json` ของ plugin ที่แก้ เพื่อให้เครื่องอื่นได้รับรุ่นใหม่
5. เปิด PR ผู้ดูแลตาม `CODEOWNERS` จะถูกขอรีวิว และต้องได้ approve อย่างน้อย 1 คน

กติกาที่ทุกแผนกใช้ร่วมกันให้แก้ที่ core ที่เดียว อย่าคัดลอกลง skill ของแผนก ถ้าจะแก้ skill ใน core ให้ถาม `core:skill-finder` ก่อนว่ากระทบใคร

## โครงคลัง

```
.claude-plugin/marketplace.json   รายชื่อ plugin
CODEOWNERS                        ผู้รีวิวของแต่ละ plugin
scripts/build-catalog.py          ตรวจหัวไฟล์ และสร้าง catalog.md
plugins/<plugin>/skills/<skill>/  ตัว skill
```
