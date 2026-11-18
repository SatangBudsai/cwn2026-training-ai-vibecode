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
5. เปิด PR ผู้ดูแลตาม `CODEOWNERS` จะถูกขอรีวิว และต้องผ่านด่านด้านล่างจึงจะ merge ได้

กติกาที่ทุกแผนกใช้ร่วมกันให้แก้ที่ core ที่เดียว อย่าคัดลอกลง skill ของแผนก ถ้าจะแก้ skill ใน core ให้ถาม `core:skill-finder` ก่อนว่ากระทบใคร

## ด่านของ PR

`main` จะ merge ได้เมื่อผ่านครบทุก status และได้ approve อย่างน้อย 1 คนจากคนที่ไม่ใช่ผู้เปิด PR push ใหม่แล้ว approve เดิมจะถูกยกเลิก ต้องขอรีวิวใหม่

| status | ตรวจอะไร | รันเองก่อนเปิด PR |
|---|---|---|
| `ci / structure (pull_request)` | `claude plugin validate` ทั้งคลังและรายตัว, catalog ตรงกับหัวไฟล์ | `claude plugin validate .` และ `python scripts/build-catalog.py --check` |
| `ci / frontmatter (pull_request)` | owner, layer, version ครบ, uses/next/follows ชี้ skill ที่มีจริง, plugin ที่แก้ต้องขึ้น version | `python scripts/check-frontmatter.py --base origin/main` |
| `ci / security (pull_request)` | การส่งข้อมูลออกนอกบริษัท, การอ่าน .env หรือ token, prompt injection, อักขระล่องหน | `python scripts/security-scan.py` |
| `skill-eval` | ผู้รีวิวรัน eval เทียบมี/ไม่มี skill บนเครื่องตัวเอง | ดูหัวข้อถัดไป |

ถ้าสแกนเจอจุดที่ตรวจแล้วว่าปลอดภัย ให้เพิ่มใน `.gitea/security-allowlist.txt` พร้อมเหตุผล

CI ไม่ใช้ AI และไม่เก็บ token ของ AI · เมื่อ merge แล้ว `release` จะออก tag `vX.Y.Z` และเขียน `CHANGELOG.md` เอง `main` ยอมให้ push ตรงเฉพาะ commit ที่แก้ `CHANGELOG.md` อย่างเดียวเพื่องานนี้

## กุญแจของ release

`release` push ด้วย deploy key ที่เขียนได้ (`release-ci`) ซึ่งเก็บ private key ไว้ใน Actions secret `RELEASE_DEPLOY_KEY` ของคลัง เพราะ token อัตโนมัติของ Actions push เข้า branch ที่ป้องกันไม่ได้ นี่เป็น secret เดียวที่ CI ใช้ และไม่ใช่ token ของ AI

- deploy key ใช้ได้เฉพาะทาง SSH จึงต้องเปิด SSH ของ Gitea และ runner ต้องต่อ `gitea:22` ได้
- สิทธิ์ของกุญแจเท่ากับคนที่เขียนคลังได้: push branch ที่ไม่ป้องกันและ tag ได้ ส่วน `main` ได้เฉพาะ commit ที่แก้ `CHANGELOG.md` อย่างเดียว
- workflow ใน PR จาก branch ของคลังนี้อ่าน secret ได้ จึงต้องรีวิว `.gitea/workflows/` ทุกครั้ง และหมุนกุญแจเมื่อคนที่มีสิทธิ์เขียนออกจากทีมหรือสงสัยว่ากุญแจรั่ว
- ห้ามเก็บ private key ไว้ในคลังหรือบนโต๊ะ และห้ามพิมพ์ลง log

หมุนกุญแจ (ต้องเป็น admin ของคลัง): สร้างกุญแจใหม่ด้วย `ssh-keygen -t ed25519` เพิ่มที่ Settings → Deploy Keys แล้วติ๊ก Enable Write Access วาง private key ทับที่ Settings → Actions → Secrets → `RELEASE_DEPLOY_KEY` ลบ deploy key เดิม แล้วลบไฟล์กุญแจในเครื่องทันที

## รัน skill-eval (สำหรับผู้รีวิว)

อ่าน diff ของ PR ก่อน เพราะ eval จะรันเนื้อหาของ PR ด้วยสิทธิ์ของคุณ แล้วสั่งจากคลังนี้บนเครื่องตัวเอง

```
python scripts/skill-eval.py --pr <เลข PR>
```

สคริปต์ดึง commit หัวของ PR มาเป็น worktree ชั่วคราว รัน eval ของ plugin ที่ PR แก้และ plugin ที่พึ่งพามัน โพสต์ตารางผลใน PR และตั้ง status `skill-eval` บน commit นั้น ค่าใช้จ่ายเป็นของบัญชี Claude ของผู้รีวิว (ชุด `shared` ประมาณ 2 USD ต่อครั้งที่ `--runs 3`)

- ผ่านเมื่อทุก case ได้คะแนนถึงเกณฑ์ (`--threshold` 0.75) และคะแนนเฉลี่ยสูงกว่าตอนไม่มี skill (`--min-delta` 0.1)
- ผู้เปิด PR ส่งผลให้งานตัวเองไม่ได้ ใช้ `--no-post` เพื่อลองดูผลเองได้
- push ใหม่แล้วต้องรันใหม่ เพราะ status ผูกกับ commit
- token ของ Gitea อ่านจาก `GITEA_TOKEN` หรือไฟล์ `.gitea-token` ต้องมีสิทธิ์ `write:repository` และ `write:issue` สคริปต์ไม่ส่ง `GITEA_TOKEN` ต่อให้ process ที่รัน eval
- plugin ที่ยังไม่มีชุด eval จะผ่านโดยระบุใน status ว่าไม่ได้วัด

ชุด eval ของแต่ละ plugin อยู่ที่ `plugins/<plugin>/evals/<case>/` (`prompt.md` + `graders/*.md`) ถ้า plugin พึ่ง plugin อื่น ให้ระบุทั้ง dependency และตัวเองใน `prompt.md` เช่น `plugins: ["../../.eval-deps/core", "../../.eval-deps/shared"]` สคริปต์จะคัดลอกจาก commit เดียวกันมาให้ ดูตัวอย่างใน `plugins/shared/evals/`

## โครงคลัง

```
.claude-plugin/marketplace.json   รายชื่อ plugin
.gitea/workflows/                 CI ของ PR และการออกเวอร์ชันหลัง merge
.gitea/security-allowlist.txt     ข้อยกเว้นของด่านสแกนความปลอดภัย
CHANGELOG.md                      สร้างอัตโนมัติเมื่อ merge
CODEOWNERS                        ผู้รีวิวของแต่ละ plugin
scripts/build-catalog.py          ตรวจหัวไฟล์ และสร้าง catalog.md
scripts/check-frontmatter.py      ด่านหัวไฟล์
scripts/security-scan.py          ด่านสแกนความปลอดภัย
scripts/skill-eval.py             ด่าน eval ที่ผู้รีวิวรันบนเครื่องตัวเอง
scripts/release.py                ออก tag และเขียน CHANGELOG
plugins/<plugin>/skills/<skill>/  ตัว skill
plugins/<plugin>/evals/<case>/    ชุด eval ของ plugin
```
