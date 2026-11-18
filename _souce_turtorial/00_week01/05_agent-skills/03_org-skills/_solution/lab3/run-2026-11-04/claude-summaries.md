# LAB 3 · ผลรันจริง 2026-11-04 (บริษัท 28 คน · คลังจาก LAB 2)

รันที่สำเนาแยก C:/t/org05p/novatech ด้วย claude -p (Opus 5.5) · คำตอบของ Claude ตอนจบแต่ละขั้น ตามจริง

## ขั้น ① ผู้ดูแลบอกที่อยู่คลัง (08:19:08–08:19:42)

ใส่ให้ครบ **28 โต๊ะ**: ทุกโฟลเดอร์ใน `desks/` ยกเว้น `_template`

**สิ่งที่ทำ**
- คัดลอก `desks/_template/.claude/settings.json` ไปเป็น `desks/<โต๊ะ>/.claude/settings.json` ทุกโต๊ะ ทำให้ทุกโต๊ะรู้จักคลัง `novatech-skills` (`http://localhost:3300/novatech/org-skills.git`) และเปิดใช้ plugin `core@novatech-skills`
- ก่อนเริ่มไม่มีโต๊ะไหนมี `settings.json` อยู่แล้ว จึงไม่ได้เขียนทับไฟล์ของใคร
- ไม่ได้แตะโฟลเดอร์ `.claude/skills/` เลย skill ส่วนตัวที่มีไฟล์ `SKILL.md` ยังอยู่ครบ 23 ตัวเท่าเดิม
- เทียบไฟล์แล้ว ทั้ง 28 โต๊ะมีเนื้อหาตรงกับแม่แบบทุกตัวอักษร

**ที่ควรรู้**
- `desks/README.md` บอกว่ามี **23 โต๊ะ** แต่ในโฟลเดอร์มีจริง **28 โต๊ะ** และทุกโต๊ะมี `.gitea-token` ผมจึงใส่ให้ครบทั้ง 28 ถ้าบางโต๊ะไม่ควรได้ บอกได้เลย ผมจะเอาออกให้
- มี 4 โต๊ะที่ไม่มี skill ส่วนตัวเลย คือ `dev-new`, `hr-namtan`, `plat-ken` และ `sales-mook` ตอนนี้ 4 โต๊ะนี้ได้แค่ plugin core
- ในโต๊ะ `md-somchai` มีโฟลเดอร์ skill `deal-approval` แต่ข้างในมีแค่โฟลเดอร์ `references` ที่ว่างเปล่า ไม่มี `SKILL.md` ผมปล่อยไว้ตามเดิม
- ยังไม่ได้ทดสอบเปิด Claude Code ที่โต๊ะไหนเพื่อดูว่าดึง marketplace ได้จริง เรื่องนี้ต้องให้ Gitea ที่ `localhost:3300` เปิดอยู่ด้วย

## ขั้น ② รอบแรก พรอมต์รุ่นแรก (08:19:43–08:29:06)

ติดตั้งครบทั้ง 28 โต๊ะแล้ว (ข้าม `_template`) ใช้ agent แยกโต๊ะละ 1 ตัว รันพร้อมกันไม่เกิน 4 ตัว ผมเปิดไฟล์ `desks/*/.claude/settings.json` ทุกโต๊ะดูอีกรอบ plugin ที่เปิดไว้ตรงกับที่ agent รายงานทุกโต๊ะ

แต่ยังไม่มีโต๊ะไหนเห็น skill ใหม่ในแชตจริง ต้องเปิด Claude Code ใหม่ที่โต๊ะนั้นแล้วกดยืนยันความเชื่อถือคลัง `novatech-skills` ก่อน skill ถึงจะโหลด ช่อง "skill ที่เห็น" ในตารางจึงเป็นรายชื่อที่อ่านจากคลัง

`core` (`customer-data-policy`, `brand-guide`, `pricing-rules`, `skill-finder`) เปิดไว้ทุกโต๊ะอยู่แล้วก่อนเริ่มงานนี้ ในตารางเลยแสดงเฉพาะ skill ที่ได้เพิ่มจากแพ็กของแผนก

| user | แผนก | plugin ที่ติดตั้ง | skill ที่เห็น (นอกจาก core) | skill ส่วนตัวที่ชื่อซ้ำกับคลัง |
|---|---|---|---|---|
| cco-wit | MD / ผู้บริหาร | exec | deal-approval, exec-deck | – |
| cfo-ying | MD / ผู้บริหาร | exec | deal-approval, exec-deck | – |
| cto-nat | MD / ผู้บริหาร | exec | deal-approval, exec-deck | – |
| exec-ploy | MD / ผู้บริหาร | exec | deal-approval, exec-deck | exec-deck (ตัวส่วนตัว v1.0.0 ใหม่กว่าคลัง v0.2.0) |
| md-somchai | MD / ผู้บริหาร | exec | deal-approval, exec-deck | – (มีโฟลเดอร์ deal-approval ว่างเหลืออยู่) |
| dev-mew | Dev | dev | coding-standard, project-scaffold | project-scaffold |
| dev-new | Dev | dev | coding-standard, project-scaffold | – |
| dev-pond | Dev | dev | coding-standard, project-scaffold | coding-standard |
| fin-joy | บัญชี / ธุรการ | finance | pricing-calc, invoice-check | pricing-calc |
| fin-nok | บัญชี / ธุรการ | finance | pricing-calc, invoice-check | invoice-check (ตัวส่วนตัว v1.0.0 ใหม่กว่าคลัง v0.2.0) |
| hr-fah | HR | hr | jd-writer, onboarding-pack | jd-writer |
| hr-namtan | HR | hr | jd-writer, onboarding-pack | – |
| hr-oat | HR | hr ⚠️ | jd-writer, onboarding-pack | onboarding-pack |
| ml-jay | ML / MLOps | mlops ⚠️ | mlflow-experiment, model-release | mlflow-experiment |
| ml-pim | ML / MLOps | mlops | mlflow-experiment, model-release | model-release |
| ops-art | DevOps | devops | deploy-checklist, postmortem | deploy-checklist |
| ops-fon | DevOps | devops | deploy-checklist, postmortem | postmortem |
| plat-ken | ทีมกลาง (platform) | shared ✱ | meeting-minutes | – |
| plat-may | ทีมกลาง (platform) | – (มีแค่ core) ✱ | – | customer-data-policy |
| pm-beam | Product | – (คลังไม่มีแพ็ก product) | – | – |
| pm-gift | Product | – (คลังไม่มีแพ็ก product) | – | – |
| qa-bank | QA | qa | test-from-plan, bug-report | bug-report |
| qa-mint | QA | qa | test-from-plan, bug-report | test-from-plan |
| sa-ice | Presales / SA | sa | arch-template, req-to-spec | arch-template |
| sa-ton | Presales / SA | sa | arch-template, req-to-spec | req-to-spec |
| sales-krit | Sales | sales | sales-proposal, follow-up-email | follow-up-email |
| sales-mook | Sales | sales | sales-proposal, follow-up-email | – |
| sales-nida | Sales | sales | sales-proposal, follow-up-email | sales-proposal |

**เรื่องที่ต้องตัดสินใจหรือจัดการต่อ**

1. **⚠️ 2 agent เขียนไฟล์นอกโต๊ะ:** agent ของ hr-oat กับ ml-jay รัน `claude plugin install` ไปเอง คำสั่งนี้เขียนไฟล์ใน `~/.claude/plugins/` คือ `installed_plugins.json` (มีรายการ hr และ core ผูกกับโต๊ะ hr-oat และ mlops ผูกกับโต๊ะ ml-jay) และ `known_marketplaces.json` ทุกรายการเป็นระดับโต๊ะ ไม่ได้เปิดให้ทั้งเครื่อง หลังจากนั้นผมเพิ่มข้อห้ามคำสั่งนี้ไว้ในคำสั่งของ agent ตั้งแต่ ml-pim เป็นต้นไป ไม่มีตัวไหนทำอีก จะลบรายการพวกนี้ทิ้งก็ได้หรือเก็บไว้ก็ได้
2. **โฟลเดอร์ชั่วคราวที่ยังค้าง:** มีโฟลเดอร์ `C:\Users\oishi\AppData\Local\Temp\tmp.*` 7 โฟลเดอร์ บางโฟลเดอร์อาจเป็นที่ agent clone คลังมาตรวจ และบางชุดอาจมี token อยู่ใน URL ของ git remote นอกจากนี้ยังมีที่ agent clone ไว้ใน scratchpad `C:\Users\oishi\AppData\Local\Temp\claude\C--t-org05p-novatech\4d74b329-b5ea-4e47-bf6f-53ec9358751c\scratchpad` ผมยังไม่ได้ลบอะไร ถ้าต้องการให้ล้าง บอกได้เลย
3. **skill ส่วนตัวที่ชื่อซ้ำกับคลัง (16 โต๊ะ):** ถ้าเก็บไว้ทั้งสองตัว Claude อาจหยิบผิดตัว agent ไม่ได้ลบให้ เพราะเป็นไฟล์ของเจ้าของโต๊ะ มี 2 โต๊ะที่ต้องระวังเป็นพิเศษ คือ exec-ploy (`exec-deck`) กับ fin-nok (`invoice-check`) เพราะตัวส่วนตัวมีเลขรุ่นใหม่กว่าตัวในคลัง ควรเปิด PR อัปเดตคลังก่อนลบตัวส่วนตัว
4. **คลังไม่มีแพ็ก `product`:** pm-beam กับ pm-gift จึงใช้ได้แค่ core ถ้าจะเพิ่มแพ็กนี้ต้องแก้ `scripts/plugins.json` แล้วเปิด PR ให้ plat-ken รีวิว
5. **✱ ทีมกลางได้ไม่เหมือนกัน:** คลังไม่มีแพ็ก `platform` ทีมกลางดูแล core กับ shared โต๊ะ plat-ken ได้ `shared` เพิ่ม แต่โต๊ะ plat-may ได้แค่ core ควรเลือกให้เหมือนกัน
6. **skill ที่เรียกต่อกันข้ามแพ็ก:** บาง skill ส่งงานต่อให้ skill ในแพ็กของแผนกอื่นที่โต๊ะนั้นไม่ได้ติดตั้ง เช่น `sales-proposal` ส่งต่อไปที่ `deal-approval` และ `req-to-spec` ส่วน `project-scaffold` ส่งต่อไปที่ `test-from-plan`, `deploy-checklist` และ `arch-template` README ของคลังกำหนดให้ติดเฉพาะแพ็กของแผนกตัวเอง จึงเป็นไปตามนโยบาย แต่ช่วงที่ต้องส่งงานต่อจะใช้ไม่ได้

## ขั้น ③ รอบแรก ตรวจเฉพาะ core (08:29:06–08:31:05)

Core is now installed and enabled on all 28 desks. Before this, all 28 had `core@novatech-skills: true` in `settings.json`, but it was only actually installed on `hr-oat`. I also moved 19 personal skills that are already in the central library into `skills-archived/`, so there's now only one copy of each.

I checked this against the install records in `~/.claude/plugins/installed_plugins.json`, not the settings files. I ran `claude plugin install core@novatech-skills --scope project` on each desk. After that, the records list core for all 28 desks, and core's skill files are present on disk.

## 1. Plugin core

| Before | Desks |
|---|---|
| ✅ Already installed (1) | `hr-oat` |
| ❌ Only in settings, not installed (27) → **now installed** | `cco-wit` `cfo-ying` `cto-nat` `md-somchai` `exec-ploy` · `dev-mew` `dev-new` `dev-pond` · `fin-joy` `fin-nok` · `hr-fah` `hr-namtan` · `ml-jay` `ml-pim` · `ops-art` `ops-fon` · `plat-ken` `plat-may` · `pm-beam` `pm-gift` · `qa-bank` `qa-mint` · `sa-ice` `sa-ton` · `sales-krit` `sales-mook` `sales-nida` |

## 2. Personal skills moved to `desks/<person>/.claude/skills-archived/`

| Person | Skill | Where it lives in the library |
|---|---|---|
| dev-mew | project-scaffold | dev |
| dev-pond | coding-standard | dev |
| exec-ploy | exec-deck | exec |
| md-somchai | deal-approval ⚠️ | exec |
| fin-joy | pricing-calc | finance |
| fin-nok | invoice-check | finance |
| hr-fah | jd-writer | hr |
| hr-oat | onboarding-pack | hr |
| ml-jay | mlflow-experiment | mlops |
| ml-pim | model-release | mlops |
| ops-art | deploy-checklist | devops |
| ops-fon | postmortem | devops |
| plat-may | customer-data-policy | core |
| qa-mint | test-from-plan | qa |
| qa-bank | bug-report | qa |
| sa-ton | req-to-spec | sa |
| sa-ice | arch-template | sa |
| sales-nida | sales-proposal | sales |
| sales-krit | follow-up-email | sales |

Each of these desks had only one personal skill, so its `.claude/skills/` folder was left empty and I removed it.

**Kept, because they aren't in the library yet (5):** `cco-wit/pipeline-review`, `cfo-ying/cost-headcount-review`, `cto-nat/tech-risk-review`, `pm-beam/prd-writer`, `pm-gift/product-sunset`.

## Things to know
- **The personal copies don't exactly match the library.** None of the 19 are file-for-file identical to the library copy. The library copies are the edited department versions (they're labelled as department skills instead of personal, and their descriptions and steps were rewritten). I archived them by skill name. If you want to check whether anything from the personal copies didn't make it into the library, the originals are all in `skills-archived/`.
- ⚠️ **`md-somchai/deal-approval` was already empty.** It only contained an empty `references/` folder, with no `SKILL.md`. I archived it anyway.
- **Department plugins are still mostly not installed.** Only `hr@hr-oat` and `mlops@ml-jay` are actually installed. Everything else is in settings only, the same problem core had. Each desk can install its own with `claude plugin install <dept>@novatech-skills --scope project`, or I can do them all for you.
- **The Product team has no plugin of its own.** `pm-beam`, `pm-gift` and `plat-may` have only core enabled.

## ขั้น ② รอบสอง พรอมต์ที่แก้แล้ว (08:32:07–08:40:07)

ติดตั้งครบทั้ง 28 โต๊ะแล้ว (ไม่รวม `_template`) แต่ละโต๊ะใช้ agent ของตัวเอง 1 ตัว และรันพร้อมกันไม่เกิน 4 ตัว ทุกตัวติดตั้งด้วย `claude plugin install … --scope project` ในโฟลเดอร์ `desks/<user>/` ผมเช็กผลซ้ำเองจาก `~/.claude/plugins/installed_plugins.json` แล้ว ทุกโต๊ะมีรายการผูกกับโฟลเดอร์ของตัวเองครบ และตรงกับที่ agent รายงานทุกแถว

ทุกโต๊ะได้ **core ซึ่งมี 4 skill** คือ `brand-guide`, `customer-data-policy`, `pricing-rules`, `skill-finder` ตารางด้านล่างแสดงเฉพาะ skill ที่ได้เพิ่มจาก plugin แผนก ทุก plugin เป็นเวอร์ชัน 1.0.0 จาก commit `0bcdf14`

| user | แผนก | plugin ที่ติดตั้งจริง | skill ที่เห็น (นอกจาก core 4 ตัว) |
|---|---|---|---|
| cco-wit | ผู้บริหาร | core, exec | deal-approval, exec-deck |
| cfo-ying | ผู้บริหาร | core, exec | deal-approval, exec-deck |
| cto-nat | ผู้บริหาร | core, exec | deal-approval, exec-deck |
| exec-ploy | ผู้บริหาร | core, exec | deal-approval, exec-deck |
| md-somchai | ผู้บริหาร | core, exec | deal-approval, exec-deck |
| dev-mew | Dev | core, dev | coding-standard, project-scaffold |
| dev-new | Dev | core, dev | coding-standard, project-scaffold |
| dev-pond | Dev | core, dev | coding-standard, project-scaffold |
| fin-joy | บัญชี/ธุรการ | core, finance | invoice-check, pricing-calc |
| fin-nok | บัญชี/ธุรการ | core, finance | invoice-check, pricing-calc |
| hr-fah | HR | core, hr | jd-writer, onboarding-pack |
| hr-namtan | HR | core, hr | jd-writer, onboarding-pack |
| hr-oat | HR | core, hr | jd-writer, onboarding-pack |
| ml-jay | ML/MLOps | core, mlops | mlflow-experiment, model-release |
| ml-pim | ML/MLOps | core, mlops | mlflow-experiment, model-release |
| ops-art | DevOps | core, devops | deploy-checklist, postmortem |
| ops-fon | DevOps | core, devops | deploy-checklist, postmortem |
| plat-ken | ทีมกลาง (platform) | core, **shared** | meeting-minutes |
| plat-may | ทีมกลาง (platform) | core | (มีแค่ core) |
| pm-beam | Product | core | ⚠️ ไม่มี plugin `product` ในคลัง |
| pm-gift | Product | core | ⚠️ ไม่มี plugin `product` ในคลัง |
| qa-bank | QA | core, qa | bug-report, test-from-plan |
| qa-mint | QA | core, qa | bug-report, test-from-plan |
| sa-ice | Presales/SA | core, sa | arch-template, req-to-spec |
| sa-ton | Presales/SA | core, sa | arch-template, req-to-spec |
| sales-krit | Sales | core, sales | follow-up-email, sales-proposal |
| sales-mook | Sales | core, sales | follow-up-email, sales-proposal |
| sales-nida | Sales | core, sales | follow-up-email, sales-proposal |

**เรื่องที่ต้องให้คุณตัดสินใจ**
1. **Product (pm-beam, pm-gift):** คำสั่ง `install product@novatech-skills` ล้มเพราะหา plugin ไม่เจอ agent เช็กแล้วว่าคลังในเครื่องตรงกับเวอร์ชันล่าสุดบนเซิร์ฟเวอร์ ในคลังมี plugin 11 ตัว และไม่มี `product` ถ้าจะให้แผนกนี้มี plugin ต้องเพิ่มเข้าคลังก่อน แล้วค่อยติดตั้งให้ 2 โต๊ะนี้ใหม่
2. **ทีมกลางยังติดตั้งไม่เหมือนกัน:** คลังไม่มี plugin ชื่อ `platform` และ agent 2 ตัวตีความ README ของคลังไม่ตรงกัน plat-ken ติดตั้ง `shared` เพิ่ม ส่วน plat-may ติดแค่ `core` ถ้าจะให้เหมือนกัน มีสองทาง คือติดตั้ง `shared` ให้ plat-may เพิ่ม หรือถอนออกจาก plat-ken
3. **skill ที่อ้างถึงกัน:** `sales-proposal` และ `follow-up-email` เรียกใช้ `pricing-calc` ซึ่งอยู่ใน plugin finance ฝั่ง Sales จึงยังใช้ส่วนนี้ไม่ได้

**ข้อสังเกตอื่น**
- เกือบทุกโต๊ะมี `core` ติดตั้งไว้ก่อนแล้วตั้งแต่ราว 01:30 UTC คำสั่ง install จึงตอบว่า "already installed" ส่วน plugin แผนกเพิ่งติดตั้งจริงรอบนี้ ทั้งที่ในหลายโต๊ะมีชื่อเขียนไว้ใน settings.json อยู่แล้ว
- hr-oat เป็นข้อยกเว้น ทั้ง core และ hr ถูกติดตั้งไว้ก่อน agent เริ่มทำงาน
- ไม่มี agent ตัวไหนแก้ไฟล์นอกโต๊ะของตัวเอง และไม่มีคำสั่งชนกันหรือติด lock
- hr-fah รายงานว่าได้อัปเดตคลังใน `~/.claude/plugins/` ด้วย ซึ่งอยู่ในขอบเขตที่คุณอนุญาต
- คำสั่ง `claude plugin list` แสดงรายการของทุกโต๊ะปนกัน agent จึงยืนยันผลจาก `installed_plugins.json` โดยกรองตามโฟลเดอร์ของโต๊ะแทน
- หลายโต๊ะยังมีสำเนา skill เก่าเก็บไว้ใน `.claude/skills-archived/` แต่ Claude Code ไม่โหลดจากโฟลเดอร์นี้ จึงไม่ซ้ำกับตัวใน plugin
- บางโต๊ะมี skill ส่วนตัวใน `.claude/skills/` ซึ่งไม่ได้มาจากคลังบริษัท ได้แก่ cco-wit, cfo-ying, cto-nat, pm-beam, pm-gift

## ขั้น ③ รอบสอง ตรวจ core + แผนก (08:40:07–08:41:14)

I checked every desk and changed nothing. No desk was missing a plugin I could install, and no personal skill was a copy of one already in the central repo.

**What I checked**
- **Plugin registry:** I read Claude Code's install register (`~/.claude/plugins/installed_plugins.json`) desk by desk. I compared each desk against `seed/people.json` to see which department plugin the person should have, and confirmed each plugin's files exist in the cache. For one desk (hr-oat) I also ran `claude plugin list`, which showed `core` and `hr` installed and enabled.
- **Central repo:** I ran `git ls-remote` on `org-skills`. The remote is still at commit `0bcdf14`, the same version installed locally, so there is nothing newer to pull.

## Plugins

| Desk | Department | Plugins needed | Before | What I did |
|---|---|---|---|---|
| 21 desks: md-somchai, exec-ploy, cco-wit, cto-nat, cfo-ying, sales-nida/krit/mook, sa-ton/ice, dev-pond/mew/new, qa-mint/bank, ops-art/fon, ml-jay/pim, hr-fah/oat/namtan | own department | core + own department | ✅ complete | none needed |
| plat-ken | platform | core (platform's department plugin is core) | ✅ core (plus extra `shared`) | none needed |
| plat-may | platform | core | ✅ complete | none needed |
| **pm-beam** | product | core + **product** | ❌ **product missing** | ⚠️ **can't install** |
| **pm-gift** | product | core + **product** | ❌ **product missing** | ⚠️ **can't install** |

The `product` plugin doesn't exist in the `novatech-skills` marketplace yet. The marketplace has only 11 plugins: core, shared, exec, sales, sa, dev, qa, devops, mlops, hr and finance. `people.json` still assigns the product team a plugin called `product`. Someone on the platform team (plat-ken) needs to create it in `org-skills` and push it before pm-beam and pm-gift can install it.

## Personal skills

| Person | Skill still in `.claude/skills/` | In the central repo? | What I did |
|---|---|---|---|
| cco-wit | pipeline-review | ❌ no (exec has only deal-approval and exec-deck) | not moved |
| cfo-ying | cost-headcount-review | ❌ no | not moved |
| cto-nat | tech-risk-review | ❌ no | not moved |
| pm-beam | prd-writer | ❌ no (there is no product plugin) | not moved |
| pm-gift | product-sunset | ❌ no | not moved |

The other 18 people with personal skills already have them in `skills-archived/`, and those skills are in the central repo. So no skill exists in two copies. The 5 skills above are the only copies anywhere, so moving them would leave those people without them.

## A problem to check
`desks/md-somchai/.claude/skills-archived/deal-approval/` holds only an empty `references/` folder with no `SKILL.md`. The archived copy was probably not fully saved when it was moved. The skill itself is in the central repo (`exec/deal-approval`), so md-somchai can still use it. But if you want to keep the original personal version, you'll need to recover it from somewhere else.

**Decision for you:** should I take the 5 remaining skills (including prd-writer and product-sunset) and write them into the central repo, adding a new `product` plugin? This changes the shared repo, so I'll wait for you to say go.
