# org-skills — คลัง skill กลางของโนวาเทค (marketplace `novatech-skills`)

รวม skill ที่เคยอยู่ใน `desks/*/.claude/skills/` ของแต่ละคน มาเป็น Claude Code plugin marketplace เดียว
**1 แผนก = 1 plugin** + `core` (ทุกคนต้องใช้) + `shared` (งานข้ามแผนก) · ผู้ดูแลคลัง: ทีมกลาง (`plat-ken`)

## ติดตั้ง

```
/plugin marketplace add http://localhost:3300/novatech/org-skills.git
/plugin install core@novatech-skills            # ทุกคน
/plugin install <แผนก>@novatech-skills          # เฉพาะแผนกตัวเอง เช่น dev, sales
/plugin install shared@novatech-skills          # ถ้าทำงานข้ามแผนก (เช่น จดบันทึกประชุม)
```

ไม่ติดแพ็กแผนกอื่น เพื่อไม่ให้ skill เยอะจนหยิบผิด (ตาม onboarding-notes) — อยากรู้ว่าแผนกอื่นทำอะไร ถาม `skill-finder`

## plugin และชั้น (layer)

| plugin | layer | แผนก | CODEOWNER | skill |
|---|---|---|---|---|
| `core` | core | ทีมกลาง | `plat-ken` (+ เจ้าของกติกา) | customer-data-policy, brand-guide, pricing-rules, skill-finder |
| `shared` | shared | ข้ามแผนก | `plat-ken` | meeting-minutes |
| `exec` | department | MD / ผู้บริหาร | `exec-ploy` | deal-approval, exec-deck |
| `sales` | department | Sales | `sales-nida` | sales-proposal, follow-up-email |
| `sa` | department | Presales / SA | `sa-ton` | req-to-spec, arch-template |
| `dev` | department | Dev | `dev-pond` | coding-standard, project-scaffold |
| `qa` | department | QA | `qa-mint` | test-from-plan, bug-report |
| `devops` | department | DevOps | `ops-art` | deploy-checklist, postmortem |
| `mlops` | department | ML / MLOps | `ml-jay` | mlflow-experiment, model-release |
| `hr` | department | HR | `hr-fah` | jd-writer, onboarding-pack |
| `finance` | department | บัญชี / ธุรการ | `fin-joy` | pricing-calc, invoice-check |

- **core** = กติกา/เครื่องมือที่ทุกคนต้องใช้ และกติกาที่เคยถูกคัดลอกซ้ำในหลาย skill — มีที่เดียว skill อื่นอ้างถึง ห้ามคัดลอก
- **shared** = งานที่หลายแผนกทำแบบเดียวกัน แต่ไม่ใช่กติกาบังคับ
- **department** = งานของแผนก เจ้าของ skill คือคนที่เขียน · หัวหน้าแผนกเป็น CODEOWNER ของ plugin

แค็ตตาล็อกเต็ม (ทำอะไร, ใครดูแล, ผลกระทบถ้าแก้) อยู่ที่ [`plugins/core/skills/skill-finder/references/catalog.md`](plugins/core/skills/skill-finder/references/catalog.md)

## หัวไฟล์ SKILL.md (แบบเดียวกันทั้งคลัง)

```yaml
---
name: <ชื่อ = ชื่อโฟลเดอร์>
description: <ทำอะไร + ใช้เมื่อผู้ใช้พิมพ์อะไร + ไม่ใช่งานของ skill ไหน>
metadata:
  owner: <user Gitea ของเจ้าของ skill>
  plugin: <plugin ที่อยู่>
  layer: core | shared | department     # ต้องตรงกับ plugin
  version: x.y.z
  uses: [...]      # skill ที่ skill นี้เรียกใช้ระหว่างทำงาน
  next: [...]      # งานถัดไปที่มักส่งต่อ
  follows: [...]   # นโยบายใน core ที่ต้องทำตาม (customer-data-policy, brand-guide, pricing-rules)
---
```

`follows` ชี้ได้เฉพาะ skill ใน `core` · ทุกชื่อใน `uses`/`next`/`follows` ต้องมีจริงในคลัง

## แก้ / เพิ่ม skill

1. แตก branch → แก้ใน `plugins/<plugin>/skills/<skill>/` (เพิ่ม `version` ทุกครั้งที่แก้)
2. `python scripts/build.py` — ตรวจหัวไฟล์ + สร้าง `marketplace.json`, `plugin.json`, `.gitea/CODEOWNERS`, แค็ตตาล็อก (ห้ามแก้ไฟล์เหล่านี้มือ)
3. `claude plugin validate .` และ `claude plugin validate plugins/<plugin>` ต้องผ่าน
4. เปิด PR เข้า `main` — push ตรงไม่ได้ ต้องได้ approve อย่างน้อย 1 คน · Gitea ขอรีวิวจาก CODEOWNER ของ path ที่แก้ให้อัตโนมัติ
5. เพิ่ม plugin/แผนก หรือเปลี่ยนหัวหน้า → แก้ `scripts/plugins.json` แล้วรันข้อ 2

ไม่แน่ใจว่าควรอยู่ชั้นไหน: ถ้าทุกแผนกต้องทำตาม หรือเห็นคนคัดลอกกติกาเดียวกันไปไว้ 2 skill ขึ้นไป → `core` · หลายแผนกใช้แต่ไม่บังคับ → `shared` · นอกนั้น → plugin ของแผนก
