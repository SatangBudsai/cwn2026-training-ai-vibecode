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
4. `python scripts/check_headers.py --base origin/main` และ `python scripts/security_scan.py` ต้องผ่าน (CI รันซ้ำให้)
5. เปิด PR เข้า `main` — push ตรงไม่ได้ · ต้องผ่านทุกด่านด้านล่าง · **CODEOWNER ของทุก path ที่แก้ต้อง approve** (Gitea ขอรีวิวให้อัตโนมัติ · path ที่ CODEOWNER คือผู้เปิด PR เอง → ทีมกลาง approve แทน)
6. เพิ่ม plugin/แผนก หรือเปลี่ยนหัวหน้า → แก้ `scripts/plugins.json` แล้วรันข้อ 2

ไม่แน่ใจว่าควรอยู่ชั้นไหน: ถ้าทุกแผนกต้องทำตาม หรือเห็นคนคัดลอกกติกาเดียวกันไปไว้ 2 skill ขึ้นไป → `core` · หลายแผนกใช้แต่ไม่บังคับ → `shared` · นอกนั้น → plugin ของแผนก

## ด่านตรวจ PR (ต้องผ่านทั้งหมดก่อน merge)

| ด่าน | status บน PR | ใครรัน | ตรวจอะไร |
|---|---|---|---|
| 1 โครงสร้าง | `ci / 1-structure (pull_request_target)` | Gitea Actions | `claude plugin validate --strict` (marketplace + ทุก plugin), `build.py --check`, JSON/Python/Node parse ได้, ไม่มีไฟล์ขยะ/ไฟล์ลับ |
| 2 หัวไฟล์ | `ci / 2-headers (pull_request_target)` | Gitea Actions | `check_headers.py` — owner/layer/version ครบ, owner มีบัญชี Gitea, `uses`/`next`/`follows` ชี้ skill ที่มีจริง, แก้ skill แล้วต้องเพิ่ม version |
| 3 ความปลอดภัย | `ci / 3-security (pull_request_target)` | Gitea Actions | `security_scan.py` — ส่งข้อมูลออกนอกบริษัท, เข้าถึงไฟล์ลับ (env / token / credential), prompt injection, อักขระซ่อน, hook/MCP ที่รันเอง (`--list-rules` ดูกฎทั้งหมด) |
| eval | `skill-eval` | **ผู้รีวิว** บนเครื่องตัวเอง | `scripts/skill_eval.py <PR>` — `claude plugin eval` เทียบมี/ไม่มี skill ของ plugin ที่ PR แก้และมี `evals/` แล้วโพสต์ผลเป็น commit status + คอมเมนต์ |
| 4 รีวิว | `ci / 4-review (pull_request_target)` | Gitea Actions | `merge_gate.py --ci` — CODEOWNER ของทุก path approve บน head แล้ว · `skill-eval` โพสต์โดย CODEOWNER/ทีมกลางที่ไม่ใช่ผู้เปิด PR · ด่าน 1–3 เป็น task จริงของ Actions |

**ด่าน 1–4 ใช้ workflow และสคริปต์ตรวจของ `main` เสมอ** (`pull_request_target` + `git archive origin/main scripts`) แล้วตรวจ tree ของ PR —
แก้ `ci.yml`, สคริปต์ตรวจ หรือ `security-allowlist.json` ใน PR ไม่มีผลกับด่านของ PR นั้น (มีผลหลัง merge) · CI ไม่ใช้ AI ไม่มี token AI และไม่มี secret

ด่าน 4 fail จนกว่าจะได้ approve + skill-eval → ได้ครบแล้ว **กด Re-run ที่ job `ci / 4-review`** (Gitea 1.24 ไม่มี event รีวิวที่รัน workflow จาก main)

### ผู้รีวิว: รัน eval (จาก main เท่านั้น)

```
git switch main && git pull
python scripts/skill_eval.py <เลข PR> --token-file <ไฟล์ token Gitea ของคุณ>     # ต้องรอ ด่าน 1–3 เขียวก่อน
```

- สคริปต์ไม่ยอมรันถ้า `skill_eval.py` / `merge_gate.py` ที่ใช้ไม่ตรงกับ `origin/main` (กัน PR แก้สคริปต์ให้ทำอะไรบนเครื่องผู้รีวิว)
- ดูว่า CI ผ่านจาก task ของ Actions จริง ไม่ใช่ commit status · token Gitea ถูกตัดออกจาก env ก่อนเรียก `claude plugin eval`
- ผ่านเมื่อ คะแนนตอนมี skill ≥ 0.8, Δ (มี − ไม่มี skill) ≥ 0 และ **ทุก case** ≥ 0.6 (`--threshold`, `--min-delta`, `--case-threshold`) · case ที่ Δ ≤ 0 ถูกระบุในคอมเมนต์
- push commit ใหม่ = sha ใหม่ = ต้องรันใหม่ · PR ที่ไม่แตะ plugin ที่มีชุด eval ก็ต้องรัน (จะได้ success ทันทีโดยไม่เรียก AI)
- ชุด eval อยู่ที่ `plugins/<plugin>/evals/<case>/` (prompt.md + graders/) — ตอนนี้มีของ `shared` · เจ้าของ plugin อื่นเพิ่มของตัวเองได้
- ข้อยกเว้นของด่าน 3 อยู่ใน `scripts/security-allowlist.json` (ต้องมีเหตุผล, CODEOWNER = plat-ken)

### ผู้ merge: ตรวจก่อนกด merge

```
python scripts/merge_gate.py <เลข PR> --token-file <ไฟล์ token Gitea ของคุณ>     # จาก main
```

Gitea 1.24 ให้ใครมีสิทธิ์ write (รวมถึง token ของ Actions ใน job ของ PR) โพสต์ commit status ชื่อไหนก็ได้ และ required status
ผูกกับผู้โพสต์ไม่ได้ ช่องเขียวบน PR จึงปลอมได้ — `merge_gate.py` ตรวจของจริง: ด่าน CI ต้องเป็น task ของ `ci.yml` event `pull_request_target`
ของ PR นี้และ sha นี้, approve ของ CODEOWNER บน head, ผู้โพสต์ `skill-eval` · หลัง merge `release.yml` ตรวจซ้ำย้อนหลังทุกครั้ง

## ออกเวอร์ชัน (ทีมกลางกดเอง)

หลัง merge `release.yml` (ไม่มี secret) รัน `release.py --plan --comment`: ตรวจย้อนหลังด้วย `merge_gate` แล้วคอมเมนต์แผน tag ใน PR
(ตรวจไม่ผ่าน = job แดง + คอมเมนต์เตือน) · ทีมกลาง (`plat-ken` / `plat-may`) ออกเวอร์ชันจาก main:

```
git switch main && git pull
python scripts/release.py --dry-run                                  # ดูแผน
python scripts/release.py --token-file <ไฟล์ token Gitea ของคุณ>       # ตรวจย้อนหลัง + tag + Release
```

tag ต่อ skill `<skill>/v<version>` ให้ skill ที่เพิ่ม version · tag ของคลัง `vX.Y.Z` (skill major → major, skill ใหม่/minor → minor, นอกนั้น patch) ·
Gitea Release ของ tag คลัง = CHANGELOG ของคลัง (หน้า [Releases](http://localhost:3300/novatech/org-skills/releases))

- tag `v*` และ `*/*` ถูก protect ให้ทีม `platform` เท่านั้น — Gitea 1.24 ใส่บัญชี Actions ใน allowlist ของ tag ไม่ได้ CI จึงติด tag เองไม่ได้
- ไม่มีบัญชีบอตหรือ secret สำหรับ release: Gitea ส่ง repo secret ให้ workflow `pull_request` จาก branch ในคลังเดียวกัน ใครเปิด PR ก็อ่านได้
- main ไม่มีไฟล์ที่ push ตรงได้แล้ว (ทุกอย่างผ่าน PR)
- คลังเปิดแค่ merge commit + squash (ปิด rebase / rebase-explicit / fast-forward-only) · `release.py` หา PR ของแต่ละ commit บน main จาก Gitea
  (`GET /repos/{repo}/commits/{sha}/pull` ต้องได้ PR ที่ `merge_commit_sha` ตรงกัน) ไม่เชื่อ `(#N)` ใน subject — commit ไหนไม่ได้มาจาก PR = ไม่ออกเวอร์ชัน
