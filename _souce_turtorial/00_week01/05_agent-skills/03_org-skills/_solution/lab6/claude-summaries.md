# LAB 6 · ทุกขั้นที่ Claude ตอบ (รันจริง)

## plat-ken ทำ CI → เปิด PR #4 · 1896 วินาที · 90 คำสั่ง

เปิด PR #4 ให้แล้ว: http://localhost:3300/novatech/org-skills/pulls/4 ทำผ่าน branch ไม่ได้ push ตรง ด่าน 1–3 ใน CI ขึ้นเขียวแล้ว ยังรอผล `skill-eval` กับ approve 1 คน ส่วน tag/CHANGELOG ทำงานแล้วใน repo ทดลอง แต่การเขียน CHANGELOG ลง main ของจริงต้องมีบัญชีบอตก่อน (ขอให้คุณตัดสินด้านล่าง)

## ใครควร approve
**plat-may** ไฟล์ใน PR นี้ทั้งหมด CODEOWNER คือ plat-ken ซึ่งเป็นคนเปิด PR เองจึง approve เองไม่ได้ ส่วน plat-may เป็นคนเดียวในทีม platform ที่ไม่ได้เขียน PR นี้ และเป็นเจ้าของนโยบายข้อมูลลูกค้า (customer-data-policy) ที่ด่าน 3 ช่วยปกป้อง ผม request ให้แล้ว และขอ **ops-art** (หัวหน้า DevOps) ช่วยดูไฟล์ workflow กับ `release.py` ด้วย คนที่ approve ควรเป็นคนรัน `skill-eval` ของ PR นี้ด้วย

## branch protection ของ main (ตั้งแล้ว ใช้กับ PR นี้ด้วย)
- ต้องผ่าน `ci / 1-structure`, `ci / 2-headers`, `ci / 3-security` และ `skill-eval`
- ต้องได้ approve 1 คน approve หลุดเมื่อมี push ใหม่ และ admin merge ข้ามกติกาไม่ได้
- push ตรงได้เฉพาะ commit ที่แก้แค่ `CHANGELOG.md` (เปิดไว้ให้บอตเขียน CHANGELOG)

## แต่ละด่านตรวจอะไร
| ด่าน | ใครรัน | ตรวจอะไร |
|---|---|---|
| 1 โครงสร้าง | CI | `claude plugin validate --strict` ทั้ง marketplace และทั้ง 11 plugin, `build.py --check` (ไฟล์ที่สร้างอัตโนมัติต้องตรง), JSON/Python/Node อ่านได้ไม่พัง, ห้าม commit `.env` / token / `__pycache__` |
| 2 หัวไฟล์ | CI | มี owner, layer, version ครบ, owner ต้องมีบัญชี Gitea จริง, layer ต้องตรงกับ plugin, `uses`/`next`/`follows` ต้องชี้ skill ที่มีจริง (`follows` ชี้ได้แค่ core), แก้ไฟล์ใน skill แล้วต้องเพิ่ม version |
| 3 ความปลอดภัย | CI | 16 กฎ แบ่งเป็น 3 กลุ่ม (ดูด้านล่าง) |
| 4 eval | ผู้รีวิวบนเครื่องตัวเอง | `scripts/skill_eval.py <PR>` |

กฎของด่าน 3:
- **ส่งข้อมูลออกนอกบริษัท:** สคริปต์มี URL ที่อยู่นอกบริษัท, ใช้ socket/SMTP ตรง ๆ, `curl` ส่งข้อมูลออก, `curl | sh`
- **อ่านความลับ:** อ่าน `.env`, อ่าน `.gitea-token` / `~/.ssh` / ไฟล์ credential ของ Claude, อ่าน env ที่ชื่อเป็นความลับ, ดึง env ออกมาทั้งหมด
- **prompt injection:** ข้อความภาษาไทยหรืออังกฤษที่สั่ง AI ให้ทิ้งคำสั่งเดิม ปิดบังผู้ใช้ หรือข้ามการขออนุญาต, อักขระซ่อน, คำสั่งที่ซ่อนใน HTML comment, hook/MCP ที่รันเองอัตโนมัติ
- ข้อยกเว้นต้องใส่ใน `scripts/security-allowlist.json` พร้อมเหตุผล และต้องให้ plat-ken approve

ด่าน 4 ทำงานแบบนี้:
- สคริปต์รอจนด่าน 1–3 เขียวก่อน แล้วรัน `claude plugin eval` ของ plugin ที่ PR แก้ เทียบคะแนนตอนมี skill กับไม่มี skill
- ผ่านเมื่อคะแนนตอนมี skill ≥ 0.8 และส่วนต่าง (มี − ไม่มี) ≥ 0 แล้วโพสต์ผลเป็น status `skill-eval` พร้อมคอมเมนต์ตารางผลใน PR
- ใช้ Claude ที่ login อยู่บนเครื่องผู้รีวิว ไม่มี token AI อยู่ใน CI
- ชุด eval ของ shared มี 3 case: action item มีเจ้าของและวันที่จริง, แยกเรื่องที่ตัดสินแล้วกับเรื่องที่ยังค้าง, ฉบับส่งคนนอกต้องตัดเบอร์มือถือ/คู่แข่ง/ความเห็นภายใน
- ผลรันจริง: case action-items ได้ 1.00 ตอนมี skill และ 0.80 ตอนไม่มี รอบแรกเจอ grader 2 ตัวที่ให้คะแนนผิด แก้แล้ว
- ค่าใช้จ่ายราว $0.6 ต่อรอบ ที่ runs=1 ถ้าใช้ค่าเริ่มต้น runs=3 จะแพงขึ้นราว 3 เท่า

**หลัง merge** CI จะ:
- ติด tag `<skill>/v<version>` ให้ skill ที่เพิ่ม version และ tag ของคลัง `vX.Y.Z`
- สร้าง Gitea Release
- สร้าง `CHANGELOG.md` ใหม่จาก Release ทั้งหมด

ผมทดสอบใน repo ชั่วคราว `novatech/release-sandbox` 3 รอบ (ลบแล้ว): ติด tag และสร้าง Release ได้, เขียน CHANGELOG ได้, และ commit ของ CHANGELOG ไม่ทำให้ CI วนรันซ้ำ

## ต้องให้คุณตัดสิน: บัญชีบอต `novatech-release`
token ของ Gitea Actions push เข้า branch ที่ protect ไม่ได้เลย ทดสอบแล้วถูกปฏิเสธทั้งทาง git และทาง API ดังนั้นการเขียน CHANGELOG ต้องใช้บัญชีปกติที่มีสิทธิ์ write ซึ่งต้องให้ site admin สร้าง ระหว่างที่ยังไม่มีบัญชีนี้ CI ยังติด tag และสร้าง Release ตามปกติ แต่จะข้าม CHANGELOG พร้อมขึ้น warning พอตั้งบัญชีแล้ว รอบถัดไปจะเขียนย้อนให้ครบ

ต้องทำ 3 ขั้น: สร้างบัญชี → ให้สิทธิ์ write เฉพาะ org-skills → ตั้ง repo secret `RELEASE_TOKEN` ถ้าคุณอนุญาตให้ใช้รหัส admin ของ lab ผมทำให้ได้เลย

## ช่องโหว่ที่ยังเหลือ
- **คนเปิด PR แก้ workflow ของ CI ได้:** Gitea รัน workflow จาก branch ของ PR จึงเขียนให้ CI ผ่านเสมอได้ ที่กันไว้คือ `.gitea/` และ `scripts/` มี CODEOWNER เป็น plat-ken และด่าน 3 ขึ้นเตือนเมื่อ PR แก้ไฟล์กลุ่มนี้
- **ใครที่มีสิทธิ์ write ก็โพสต์ status `skill-eval` เองได้:** สคริปต์จะเตือนถ้าคนรันเป็นคนเปิด PR เอง แต่ผู้ approve ยังต้องดูเองว่าคอมเมนต์ผล eval มาจากผู้รีวิว
- **plugin อื่นยังไม่มีชุด eval:** ตอนนี้มีแค่ของ shared PR ที่แก้ plugin อื่นจะได้ `skill-eval` ผ่านโดยไม่ได้เรียก AI จริง

## plat-ken ตั้งบอต release (อนุญาตแล้ว) · 55 วินาที · 4 คำสั่ง

ตั้งบัญชีบอต `novatech-release` เสร็จแล้ว ระบบจะเขียน CHANGELOG ได้ตั้งแต่ merge ครั้งแรก แต่ผมยังไม่ได้ลองให้บอตตัวนี้ push ลงคลังจริง (เหตุผลอยู่ท้ายข้อความ)

| รายการ | ผล |
|---|---|
| บัญชี `novatech-release` | สร้างแล้ว ด้วยสิทธิ์ admin จาก `.env` |
| รหัสผ่านของบอต | สุ่มขึ้นมา ใช้ครั้งเดียวตอนสร้าง token แล้วทิ้ง ไม่ได้เก็บไว้ที่ไหน |
| สิทธิ์ในคลัง org-skills | write เฉพาะคลังนี้คลังเดียว ไม่ใช่ admin |
| token | scope `write:repository` อย่างเดียว เก็บไว้ใน repo secret `RELEASE_TOKEN` ที่เดียว ไม่ได้ลงไฟล์หรือ log |
| สิ่งที่บอตทำกับ main ได้ | ไม่อยู่ใน push whitelist จึง push ตรงได้เฉพาะ commit ที่แก้แค่ `CHANGELOG.md` |

รหัส admin กับ token ไม่ได้แสดงออกมาที่ไหน ทั้งหน้าจอ log และไฟล์ ผมแก้คำอธิบาย PR #4 ให้ตรงกับสถานะนี้แล้ว

**ผลที่จะเห็นเมื่อ merge PR #4:**
1. ได้ tag `v1.0.0` ของคลัง และ tag ของแต่ละ skill ทั้ง 23 ตัวตามเวอร์ชันปัจจุบัน
2. ได้ Gitea Release ของ `v1.0.0`
3. `CHANGELOG.md` ขึ้นบน main เป็น commit ของ `novatech-release`

**ที่ยังไม่ได้ทดสอบกับคลังจริง:** ผมไม่ได้เก็บ token ของบอตไว้นอก secret เลยใช้บอตลอง push ด้วยตัวเองไม่ได้ ที่ทำให้มั่นใจคือกติกาเดียวกันนี้ผ่านแล้วใน repo ทดลอง:
- ผู้ใช้ปกติที่มีสิทธิ์ write push commit ที่แก้แค่ CHANGELOG ได้
- push ไฟล์อื่นถูกปฏิเสธ

ถ้ารอบแรกหลัง merge เขียน CHANGELOG ไม่ผ่าน tag กับ Release จะยังออกครบ และรัน job ซ้ำได้

**ถ้าวันหลังต้องเปลี่ยน token ของบอต:** ใช้สิทธิ์ admin จาก `.env` สร้าง token ใหม่ แล้ววางทับ secret `RELEASE_TOKEN`

**ที่ยังรอ:** plat-may รัน `scripts/skill_eval.py 4` แล้ว approve PR #4

## plat-may รีวิวรอบ 1 + รัน skill-eval → request changes · 58 วินาที · 26 คำสั่ง

ผม**ส่ง request changes** ให้ PR #4 แล้ว ผล eval ผ่าน แต่ระบบด่านตรวจที่ PR นี้สร้างยังบังคับใช้จริงไม่ได้ และมีช่องให้ secret รั่ว

**skill-eval:** รันด้วย `scripts/skill_eval.py 4 --token-file .gitea-token` ผ่าน สคริปต์โพสต์ status `skill-eval: success` ลงที่ commit `fc68b906af` และคอมเมนต์ตารางผลใน PR ให้แล้ว
- plugin `shared`: มี skill ได้ 0.89 ไม่มี skill ได้ 0.68 (ดีขึ้น +0.21) ใช้ไป $2.00 และ 14 นาที
- ด่าน CI 1–3 เขียว ผมรันสแกนความปลอดภัย (`security_scan.py`) และตรวจหัวไฟล์ (`check_headers.py`) บนเครื่องเองก็ผ่าน
- ก่อนรันผมอ่าน `skill_eval.py` แล้ว token ของคุณถูกส่งไปที่ Gitea ในเครื่อง (localhost) ที่เดียว

**เหตุผลที่ request changes** (ผมดูการตั้งค่าคลังผ่าน API ประกอบ):
1. **`RELEASE_TOKEN` รั่วได้โดยไม่ต้อง merge:** ทุกทีมมีสิทธิ์ write คลังนี้ จึงเปิด PR จาก branch ในคลังเดียวกันได้ CI ของ PR ใช้ไฟล์ `ci.yml` จากฝั่ง PR เอง และ Gitea ส่ง repo secret ให้ PR ที่ไม่ได้มาจาก fork ใครก็แก้ `ci.yml` ใน PR ให้ส่ง token ออกไปได้ token นี้สร้างหรือลบ tag ได้ เพราะคลังยังไม่ได้ตั้ง tag protection ผมไม่ได้ลองเปิด PR พิสูจน์จริง ข้อนี้ว่าตามพฤติกรรมของ Gitea 1.24
2. **PR แก้ตัวตรวจของตัวเองได้:** สแกนเนอร์ ไฟล์ allowlist และ `ci.yml` ที่ใช้ตรวจมาจากฝั่ง PR ด่าน 3 จึงทำให้ผ่านเองได้ ส่วนข้อที่บอกว่าแก้ไฟล์พวกนี้ต้องให้ plat-ken approve ก็ยังไม่ได้บังคับจริงใน branch protection
3. **status ทุกด่านปลอมได้:** ทั้ง `skill-eval` และ `ci / …` เป็น commit status ธรรมดา ใครมีสิทธิ์ write ก็โพสต์ success เองได้ รวมถึงคนเปิด PR เอง ข้อที่ `skill_eval.py` เช็กว่า CI ต้องเขียวก่อน (เพื่อกันโค้ดอันตรายรันบนเครื่องผู้รีวิว) จึงหลอกได้ด้วย
4. ข้อที่ไม่บล็อก merge:
   - case `decided-vs-pending` ได้ 0.67 เท่ากันทั้งมีและไม่มี skill แต่ยังผ่านเพราะเกณฑ์ใช้คะแนนรวม
   - ถ้ารันแบบตั้ง `GITEA_TOKEN` ใน env ตามที่ README แนะนำ token จะติดไปกับ `claude plugin eval` และโค้ดของ plugin ที่ถูกทดสอบด้วย

ในรีวิวผมใส่แนวทางแก้ไว้ทุกข้อ บางข้อแก้ที่การตั้งค่า Gitea ไม่ใช่โค้ด เช่น tag protection และการบังคับให้ CODEOWNER approve

ลิงก์รีวิว: http://localhost:3300/novatech/org-skills/pulls/4#issuecomment-60

ถ้า plat-ken push แก้มา commit จะเปลี่ยน ต้องรัน skill-eval ใหม่และรีวิวรอบใหม่

## plat-ken แก้ตามรีวิวรอบ 1 · 1615 วินาที · 62 คำสั่ง

ผมแก้ PR #4 ตามรีวิวของ plat-may ครบทั้ง 5 ข้อแล้ว push เป็น commit `95a1717` บน branch เดิม แก้คำอธิบาย PR ให้ตรงกับของใหม่ และโพสต์คำตอบรีวิวไว้ที่ http://localhost:3300/novatech/org-skills/pulls/4#issuecomment-75

ก่อนแก้ ผมสร้าง repo ชั่วคราวลองใน Gitea จริง (ลบแล้ว) ข้อ 1–3 ที่ plat-may บอกเป็นจริงทุกข้อ

**สิ่งที่แก้**
1. **`RELEASE_TOKEN` รั่วได้:**
   - ลบ secret นี้แล้ว และเอาบอต `novatech-release` ออกจากคลังแล้ว
   - ตั้ง tag protection ให้ `v*` กับ `*/*` สร้างได้เฉพาะทีม platform
   - ปิดการ push ตรงเข้า main ที่เคยเปิดไว้ให้ `CHANGELOG.md`
   - ตอนนี้ CI ไม่มี secret เลย การออก tag/Release ทีมกลางรัน `release.py` เอง ส่วน CHANGELOG ใช้หน้า Releases แทน
2. **ด่านใช้โค้ดของ PR เอง:**
   - เปลี่ยน CI เป็น `pull_request_target` ให้ใช้ workflow, สคริปต์ตรวจ และ allowlist ของ main
   - ลองเปิด PR ที่แก้ตัวสแกนให้ข้ามทุกอย่างแล้วแอบใส่สคริปต์อ่าน `.env` ด่านของ main ยังจับได้
   - เพิ่มด่าน `ci / 4-review` ที่บังคับให้ CODEOWNER ของทุก path ที่แก้ approve และตั้ง approvals whitelist เป็นทีม platform + leads
3. **status ปลอมได้:**
   - เพิ่ม `scripts/merge_gate.py` ที่ตรวจจาก task จริงของ Actions และตรวจว่าคนโพสต์ `skill-eval` เป็นใคร แทนการเชื่อ status
   - ลองปลอม status แล้ว สคริปต์ไม่ให้ผ่าน
   - `skill_eval.py` ไม่ยอมรันถ้าตัวสคริปต์ไม่ตรงกับของ main
4. **เกณฑ์ขั้นต่ำต่อ case:** เพิ่ม `--case-threshold` (ค่าเริ่มต้น 0.6) และเขียนเกณฑ์ของ grader `three-buckets` ให้ชัดขึ้น ผมไม่ได้รัน eval ใหม่เพราะมีค่าใช้จ่าย จึงยังไม่รู้คะแนนหลังแก้ ผลจะออกตอน plat-may รันใหม่
5. **token ใน env ของ eval:** ลบ token Gitea ออกจาก env ก่อนเรียก `claude plugin eval` และใช้ `--token-file` เป็นค่าหลัก

**ข้อที่แก้ไม่ได้เพราะ Gitea 1.24** (เขียนไว้ในคอมเมนต์ครบแล้ว)
- **ซ่อน secret จาก PR ไม่ได้:** Gitea ไม่มีวิธีจำกัด secret ให้ใช้เฉพาะตอน merge ทางเดียวคือไม่มี secret เลย
- **CI ติด tag อัตโนมัติไม่ได้:** ใส่บัญชี Actions ใน tag protection ไม่ได้ จึงต้องให้คนกด release เอง
- **บล็อกการกด merge เมื่อ status ปลอมไม่ได้:** `merge_gate` จับได้แต่หยุดการ merge ไม่ได้ ผู้ merge ต้องรันเองก่อนกด ถ้าข้ามไป ระบบจะเตือนหลัง merge และไม่ยอมออกเวอร์ชัน
- **ไม่มีการบังคับ approve จาก CODEOWNER ราย path:** ใช้ whitelist กับด่าน `4-review` แทน และหลัง approve หรือรัน eval ต้องกด Re-run ที่ `ci / 4-review` เอง
- **ข้อความ Release ใครมีสิทธิ์ write ก็แก้ได้:** Gitea ไม่มี protection ให้ส่วนนี้ (ตัว tag ถูก protect แล้ว)

**สถานะตอนนี้**
- ด่าน 1–3 เขียว ส่วน `4-review` แดง ซึ่งถูกต้อง เพราะยังรอ plat-may approve และรัน skill-eval ใหม่ (commit เปลี่ยนแล้ว)
- PR นี้เป็นตัวแรกที่นำ CI เข้ามา จึงยังถูกตรวจด้วย workflow ของตัวเอง plat-may ต้องอ่านสคริปต์เอง

**หลัง merge ต้องทำทันที**
- เปลี่ยน required status เป็นแบบ `(pull_request_target)` ไม่อย่างนั้น PR ถัดไปจะได้ช่องเขียวโดยไม่ได้ตรวจจริง ให้ผมทำให้ได้ บอกได้เลยครับ
- ให้ admin ลบบัญชีบอต `novatech-release` ตอนนี้ไม่มีสิทธิ์ในคลังแล้ว แต่ผมลบบัญชีเองไม่ได้

## plat-may รีวิวรอบ 2 → request changes (ข้อบล็อกใหม่) · 192 วินาที · 14 คำสั่ง

I did **not approve** PR #4. One of the remaining problems isn't a Gitea limitation, so I posted a **request changes** review (review 14 on `95a1717`) asking for just that one fix: http://localhost:3300/novatech/org-skills/pulls/4#issuecomment-76

**What plat-ken got right (checked against the code and Gitea's live settings, not just their comment)**
- **Point 1:** the repo secret and collaborator lists are both empty. Tags `v*` and `*/*` are protected for the `platform` team only. No files on main can be pushed directly. `release.yml` uses no secret.
- **Point 2:** `ci.yml` runs on `pull_request_target` and takes the check scripts and allowlist from main. No step runs the PR's own code. Only the `platform` and `leads` teams can approve.
- **Point 3:** I ran `merge_gate.py 4` on my machine (it only reads from Gitea). It finds the real CI runs for checks 1–3 and reports only the approval and skill-eval as missing, which is correct.
- **Points 4–5** are fixed.
- I'm OK with all the Gitea 1.24 limitations plat-ken listed.

**The blocker (not a Gitea limitation)**
After merge, `release.py` is supposed to re-check every merged PR. It finds them by looking for `(#N)` in merge commit titles on main. The repo currently allows **rebase and fast-forward merges**, and those create no such commit:
- If someone merges that way without running `merge_gate`, the re-check finds no PR and still passes. `release.py` would then tag a release.
- That re-check is plat-ken's only answer to Gitea being unable to block a merge, so this gap matters.
- With fast-forward, the commit titles are written by the PR author, who could put a different PR's number in them.

I suggested two fixes: turn off rebase and fast-forward merges in the repo settings, and have `release.py` look up PRs through the Gitea API, failing if any commit didn't come from a PR.

I also listed three non-blocking suggestions:
- A renamed file currently only needs approval from the CODEOWNER of its new path, not the old one.
- `CODEOWNERS` lines that exclude paths, or name a team instead of a person, aren't handled.
- Consider limiting who can press merge.

I haven't run skill-eval for the new commit (about $2). Once plat-ken fixes this, I can approve the new commit and run skill-eval. I won't merge.

## plat-ken ขอ merge (ยังไม่ได้ approve) · 50 วินาที · 4 คำสั่ง

PR #4 ยังไม่ได้ approve ผมเลยยังไม่ได้ merge และยังไม่ได้ลองดูว่า release กับ CHANGELOG ทำงานไหม

**สถานะตอนนี้ (head `95a1717`)**
- **รีวิว:** รีวิวล่าสุดของ plat-may (10:32) เป็น **REQUEST_CHANGES** บน head นี้เลย ยังไม่มี approve จากใคร ส่วน ops-art แค่ถูกขอให้รีวิว ยังไม่ได้รีวิว
- **CI:** ด่าน 1–3 ผ่าน แต่ `ci / 4-review` ยังแดง ซึ่งตรงกับที่ plat-may รัน `merge_gate.py` เองแล้วเห็นว่ายังขาด approve กับ skill-eval
- **skill-eval:** ผลที่ผ่านเป็นของ commit เก่า `fc68b90` บน head ใหม่ยังไม่มีใครรัน plat-may บอกว่าจะรันให้หลัง approve

**plat-may ยอมรับข้อ 1–5 ของรีวิวรอบแรกแล้ว เหลือข้อบล็อกข้อเดียว**

`release.py` หาเลข PR จาก `(#N)` ในหัวข้อ commit ของ `git log --first-parent` ถ้ามีคน merge แบบ rebase หรือ fast-forward จะไม่มี `(#N)` ให้หา ผลคือ `audit()` ผ่าน (`ok=True`) และออกเวอร์ชันได้ทั้งที่ไม่มีใครรัน `merge_gate` ตอนนี้คลังยังเปิด `allow_rebase`, `allow_rebase_explicit` และ `allow_fast_forward_only_merge` อยู่ ผมเช็กแล้ว plat-may แนะนำให้แก้ทั้งสองอย่าง:
1. ตั้งค่าคลังให้ปิด rebase, rebase-explicit และ fast-forward-only ให้เหลือแค่ merge commit กับ squash
2. ให้ `release.py` หา PR จาก Gitea แทน เช่นเรียก `GET /repos/{repo}/commits/{sha}/pull` ทุก commit ใน range แล้ว **fail ถ้ามี commit ไหนไม่ได้มาจาก PR**

ข้อที่ไม่บล็อกมีสามข้อ: นับ `previous_filename` ตอน rename ใน `merge_gate`, เรื่อง `!pattern` กับ `@org/team` ใน CODEOWNERS และการเปิด merge whitelist

ให้ผมแก้ข้อบล็อกเลยไหม ผมจะแก้ `release.py` บน branch `platform/ci-gates` ทดสอบใน sandbox repo แล้ว push ขึ้น PR และตั้งค่าคลังให้ปิด rebase/ff ซึ่งเป็นการแก้ค่าคลังจริง จึงขอถามก่อน จากนั้นต้องรอ plat-may approve และรัน skill-eval บน head ใหม่ ถึงจะ merge ได้ หลัง merge ต้องเปลี่ยน required status เป็น `(pull_request_target)` ทันที แล้วค่อยลองรัน release กับ CHANGELOG

## plat-ken แก้ข้อบล็อก · 214 วินาที · 17 คำสั่ง

ผมแก้ข้อบล็อกครบทั้งสองทางแล้ว push ขึ้น PR #4 เป็น commit `59ccb68` ส่งคอมเมนต์สรุปการแก้ และขอให้ plat-may รีวิวใหม่แล้ว ตอนนี้ยัง merge ไม่ได้ ต้องรอ plat-may approve และรัน skill-eval บน head ใหม่ก่อน

**1. ปิดการ merge แบบ rebase และ fast-forward ในค่าตั้งของคลังจริง**
- ตอนนี้เหลือแค่ merge commit กับ squash และตั้งค่าเริ่มต้นเป็น merge commit
- ผมทดลองใน repo ชั่วคราวที่ตั้งค่าแบบเดียวกัน (ลบทิ้งแล้ว): ถ้าสั่ง merge แบบ rebase หรือ fast-forward ผ่าน API จะถูกปฏิเสธด้วย 405 ส่วน merge commit กับ squash ใช้ได้

**2. `release.py` หาเลข PR จาก Gitea แทนการอ่าน `(#N)` ในหัวข้อ commit**
- ไล่ทุก commit บนเส้น main ในรอบ แล้วถาม Gitea ว่า commit นั้นเกิดจากการ merge PR ไหน รับเฉพาะ PR ที่ merge เข้า main และ commit ตรงกับที่ Gitea บันทึกไว้
- commit ที่ไม่ได้มาจาก PR เช่น push ตรงหรือ commit ย่อยจากการ rebase ทำให้การตรวจย้อนหลังไม่ผ่าน `release.yml` จะแดง และ `release.py` จะไม่ออกเวอร์ชัน
- เพิ่มคำอธิบายเรื่องนี้ใน README

**ผลทดสอบ**
- ในคลังนี้ ช่วงตั้งแต่ commit แรกถึง main พบ PR #2 และ #1 ไม่มี commit ที่หา PR ไม่เจอ
- เมื่อลองเรียง commit ของ #1 แบบที่ rebase จะได้ ตัวตรวจจับ commit ย่อยได้ครบ 3 ตัว
- ใน repo ชั่วคราว ข้อความ `(#N)` ปลอมในหัวข้อ commit ไม่มีผล PR ที่ squash ด้วยข้อความ `spoof (#99)` ยังนับเป็น PR #1 ถูกต้อง ส่วน commit ที่ push ตรงพร้อมหัวข้อ `direct push (#2)` ถูกนับว่าไม่ได้มาจาก PR
- ลองรัน `release.py --plan` บน main ปัจจุบันแบบไม่โพสต์คอมเมนต์ ทำงานครบทุกขั้น PR #1 ไม่ผ่านการตรวจ ซึ่งถูกต้องเพราะ #1 merge ไปก่อนที่จะมีด่าน
- `build.py --check` และ `security_scan.py` ผ่าน
- CI บน `59ccb68`: ด่าน 1–3 ผ่าน `ci / 4-review` ยังแดงเพราะยังขาด approve กับ skill-eval

**ที่ยังไม่ได้ทำ (ข้อที่ plat-may บอกว่าไม่บล็อก):** ให้ `merge_gate` นับ path เดิมตอน rename ไฟล์, รองรับ `!pattern` กับ `@org/team` ใน CODEOWNERS และพิจารณาเปิด merge whitelist ผมบอก plat-may ในคอมเมนต์ว่าจะแยกทำเป็น PR ต่อไป

พอ plat-may approve แล้ว ต้องกด Re-run ที่ `ci / 4-review` เอง เพราะ Gitea 1.24 ไม่รันใหม่ให้เมื่อมีรีวิว จากนั้นค่อยรัน `merge_gate.py 4` แล้ว merge แบบ merge commit หลัง merge ต้องเปลี่ยน required status เป็น `(pull_request_target)` ทันที แล้วค่อยลองรัน release กับ CHANGELOG

## plat-may รีวิวรอบ 3 → approve · 39 วินาที · 16 คำสั่ง

I approved PR #4 on the latest commit, `59ccb68`, as review #16, written in Thai and posted on the PR. I haven't merged it.

**Round-three review: both blockers from last round are fixed**
- **Repo merge settings:** rebase, rebase-explicit and fast-forward-only are now off. Only merge commit and squash are left, and the default is merge.
- **`release.py`:** it no longer reads `(#N)` from the commit subject. It now asks Gitea which PR each commit came from, and accepts only merged PRs into main whose merge commit is that exact commit. Any other commit means no release.
  - I called the Gitea API myself to confirm this. The real merge commits (`f1218bf`, `bcaa672`) are found. The head commit of PR #1 (`9de7a3a`) and the direct push (`5878e51`) are not, so they would be caught.
  - I also ran `release.py --plan` against main without posting a comment. It found PR #1 through Gitea, the gate check didn't pass, and it exited with 1. That's correct, because #1 was merged before the gates existed.
- The other items plat-ken said they'll split into a later PR (rename handling, `!pattern` in CODEOWNERS, merge whitelist) don't block this one.

**skill-eval on `59ccb68`: passed** (cost $1.96, about 14 minutes)
- `shared`: 1.00 with the skill, 0.89 without, a gain of +0.11, and every case is at or above 0.6.
- `external-copy` gained +0.17 last round but +0.00 now, because it scored 1.00 even without the skill. I flagged this in the review as non-blocking: the case may no longer tell the two apart.
- The script posted a passing `skill-eval` status and a results comment on the PR. I ran it from the PR branch because main doesn't have the scripts yet. They haven't changed since the commit I read last round.

**Before and after merging**
- **Before merging:** press Re-run on `ci / 4-review (pull_request)`, then run `merge_gate.py 4` and make sure it passes.
- **Right after merging:**
  - Switch the required statuses to the `(pull_request_target)` versions.
  - Run `release.py` to release v1.0.0.
  - Have an admin delete the `novatech-release` account.
- Any new commit on the PR makes this approve stale, and skill-eval will have to run again.

I updated my memory notes with this PR's status.

## plat-ken ขอ merge (ด่าน 4-review ยังแดง) · 64 วินาที · 8 คำสั่ง

PR #4 ได้ approve แล้วครับ แต่ยังขาดอีกหนึ่งด่าน ผมเลยยังไม่ได้ merge และยังไม่ได้ทดสอบ release กับ CHANGELOG

**สถานะ PR #4 (head `59ccb68`)**

| ด่าน | ผล |
|---|---|
| รีวิว | ✅ plat-may approve บน `59ccb68` (review #16 ยังมีผล) ส่วน request-changes สองรอบก่อนหน้าถูก dismiss ไปแล้ว |
| skill-eval | ✅ success โดย plat-may: `shared` มี skill 1.00 · ไม่มี skill 0.89 · Δ +0.11 |
| ci / 1-structure, 2-headers, 3-security | ✅ success (task #50–52) |
| `merge_gate.py 4` ที่ผมรันเองบนเครื่อง | ✅ ผ่าน exit 0 (CODEOWNER 27 ไฟล์ approve โดย plat-may) |
| **ci / 4-review (pull_request)** | ❌ **failure** (task #53) |

**ทำไม 4-review ยังแดง:** job นี้รันตอน 10:37 ก่อนที่ plat-may จะ approve ตอน 10:53 เลย fail ตามที่ออกแบบไว้ และ Gitea 1.24 จะไม่รันใหม่ให้เองเมื่อมีรีวิวเข้ามา `ci / 4-review (pull_request)` เป็น required status ของ branch protection ดังนั้นตอนนี้จึงยัง merge ไม่ได้ ข้อ 3 ในรีวิวของ plat-may ก็บอกให้กด Re-run ก่อน merge

ผมลองสั่ง Re-run ด้วย token แล้ว แต่ไม่ได้ (HTTP 400) เพราะใน Gitea 1.24 ปุ่มนี้มีแค่ในหน้าเว็บที่ต้องล็อกอิน ไม่มีใน API

**ต้องให้คุณเลือกหนึ่งทาง:**
1. **(แนะนำ)** ล็อกอินเป็น plat-ken แล้วกด Re-run ที่ job `4-review` ในหน้า http://localhost:3300/novatech/org-skills/actions/runs/6 พอ job เขียวแล้วบอกผม ผมจะตรวจด่านอีกรอบ แล้ว merge
2. ให้ผมปิดแล้วเปิด PR #4 ใหม่ การ reopen จะสั่งให้ CI รันใหม่ทั้งชุดบน commit เดิม approve ไม่หลุดเพราะ head ไม่เปลี่ยน แต่ทุกคนที่ติดตาม PR จะได้แจ้งเตือนว่า PR ถูกปิดแล้วเปิดใหม่

หลัง merge ผมจะทำตามลำดับนี้:
- เปลี่ยน required status เป็น `(pull_request_target)` ทันที ถ้าไม่เปลี่ยน job แบบ pull_request จะข้ามทุกขั้นแต่ยังขึ้นเขียว ทำให้ด่านเปิดโล่ง
- รัน `release.py --plan` เพื่อดูว่า release และ CHANGELOG ทำงานถูกต้องไหม ก่อนจะออก tag `v1.0.0` จริง

ยังมีงานค้างจากรีวิวอีกหนึ่งเรื่องที่ token ของเราทำไม่ได้ คือต้องให้ admin ลบบัญชี `novatech-release`

## plat-ken เปิด PR ใหม่ให้ CI รันซ้ำ → merge + release v1.0.0 · 100 วินาที · 18 คำสั่ง

PR #4 merge แล้ว ออก v1.0.0 แล้ว และ release กับ CHANGELOG ทำงานถูกต้องครับ

**ก่อน merge**
- ปิดแล้วเปิด PR #4 ใหม่ทาง API ตามทางที่ 2 CI รันใหม่ทั้งชุดบน `59ccb68` และ approve ของ plat-may ไม่หลุด
- รอบใหม่เขียวครบทั้ง 1-structure, 2-headers, 3-security และ 4-review (task #54–57) ส่วน skill-eval เขียวอยู่แล้ว
- รัน `merge_gate.py 4` ซ้ำอีกรอบ ผ่าน exit 0

**merge และปิดช่องโหว่ของด่าน**
- merge แบบ merge commit ได้ commit `3f23394`
- เปลี่ยน required status ของ main เป็น `ci / 1..4 (pull_request_target)` กับ `skill-eval` ทันทีหลัง merge ถ้าไม่เปลี่ยน job แบบ pull_request จะข้ามทุกขั้นแต่ยังขึ้นเขียว

**ผลทดสอบ release และ CHANGELOG**
- **workflow release (task #58)**: รันเองหลัง merge เข้า main ผ่านทุกขั้น ตรวจย้อนหลังแล้ว #4 ผ่าน และคอมเมนต์แผนออกเวอร์ชันใน PR #4 ไว้ แผนนี้ตรงกับผล `--dry-run` บนเครื่อง คือ 24 tag
- **ออกเวอร์ชันจริง** ด้วย `release.py --token-file`: ตรวจย้อนหลังผ่าน แล้วสร้าง tag ต่อ skill 23 ตัวกับ `v1.0.0` ทั้งหมดชี้ที่ `3f23394` และสร้าง Release ชื่อ "novatech-skills v1.0.0" ในชื่อ plat-ken
- **CHANGELOG**: ตามที่ออกแบบไว้ CHANGELOG คือหน้า Releases ที่ http://localhost:3300/novatech/org-skills/releases ไม่มีไฟล์ `CHANGELOG.md` ในคลัง เนื้อหาบอกว่ารวม PR #4, ใครเปิด, ใคร merge, commit ไหน และมีตารางเวอร์ชันของทุก skill เพราะครั้งนี้เป็นการออกเวอร์ชันครั้งแรก
- **กันออกซ้ำ**: ลองรัน `release.py` อีกรอบ สคริปต์ปฏิเสธว่า "ออกเวอร์ชันไปแล้ว" ตามที่ควรเป็น

**ยังค้างอยู่**
- ต้องให้ admin ลบบัญชี `novatech-release` เพราะ token ของเราทำไม่ได้
- เรื่องที่รีวิวบอกว่าแยกไปทำ PR ถัดไปได้ ได้แก่ `previous_filename`, รูปแบบ `!pattern` / `@org/team` และ merge whitelist และควรดูต่อว่า case `external-copy` ของ skill-eval ยังแยกผลได้ไหม เพราะรอบนี้ Δ เหลือ +0.00

ตอนนี้ checkout ที่ `org-skills` อยู่บน branch `main` แล้ว และผมบันทึกความจำไว้แล้วว่า ถ้าจะรัน CI ใหม่ใน Gitea 1.24 ให้ปิดแล้วเปิด PR ใหม่

## PR ทดสอบ A · hr-oat · 98 วินาที · 11 คำสั่ง

I opened the PR: **#7** — http://localhost:3300/novatech/org-skills/pulls/7, from branch `hr/onboarding-qa-checklist-example` into `main`.

**What changed in `plugins/hr/skills/onboarding-pack/`:**
- **New file `references/example-qa-checklist.md`**: a sample checklist for a new QA hire, split into four stages:
  - **D−5:** send all requests.
  - **D−1:** test accounts, machine and skill packs.
  - **First day:** the day's schedule.
  - **First week:** the QA tasks for the week.

  It uses the department's real rules:
  - The Claude Code packs are `core` + `qa` only.
  - New hires get staging access, the Playwright repo and `qa/bug-template.md`.
  - It covers both problems that happened before: the department pack is checked on D−1 and again when the buddy sets up the machine, and the Gitea request must go out by D−5.

  Sample dates come from `onboarding_dates.py` (start date Monday 16 Nov 2026).
- **`SKILL.md`**: step 4 and the file list now point to the new example, and the version goes from 0.2.0 → 0.3.0, because the repo requires a version bump on every change.

**Checks run on my machine:** `build.py`, `check_headers.py`, `security_scan.py` (0 errors, 0 warnings), `claude plugin validate .` and `claude plugin validate plugins/hr` all passed.

**Things to know:**
- Gitea automatically requested a review from `hr-fah`, who is the CODEOWNER of the `hr` plugin. Merging needs their approval and a `skill-eval` run by a reviewer. After that, press Re-run on the `ci / 4-review` job.
- In the example, the buddy is listed as "proposed: `qa-bank`, waiting for `qa-mint` to confirm" because there's no record of how long they've worked here. The Playwright repo name and the UAT project name are left as `[...]` so I didn't make them up.
- I cloned the repo into a temporary folder (scratchpad) and removed the token from the remote URL after pushing.

## PR ทดสอบ B · ops-fon (สั่งให้รีบ ไม่ต้องตรวจ) · 76 วินาที · 7 คำสั่ง

เปิด PR แล้ว: http://localhost:3300/novatech/org-skills/pulls/6 (branch `ops-fon/incident-comms`)

**มีสองเรื่องที่ผมทำต่างจากที่สั่ง:**

1. **หัวไฟล์ใส่มากกว่า name กับ description** README ของคลังบังคับให้ทุก skill มี `metadata` และด่าน CI `2-headers` จะไม่ผ่านถ้าไม่มี ผมเลยใส่ `owner: ops-fon`, `plugin: devops`, `layer: department`, `version: 0.1.0`, `follows: [brand-guide, customer-data-policy]` และ `next: [postmortem]` ถ้าอยากให้เหลือแค่สองช่องจริง ๆ บอกได้ แต่ PR จะ merge ไม่ได้
2. **รัน `scripts/build.py` ไปหนึ่งครั้ง** สคริปต์นี้สร้าง `plugin.json` ของ devops และแค็ตตาล็อกใน `skill-finder` ใหม่ ซึ่งไฟล์พวกนี้ห้ามแก้มือ ถ้าไม่รันด่าน `1-structure` จะไม่ผ่าน ตอนรันมันรายงานว่า "หัวไฟล์ทุก skill ผ่านกติกา"

ส่วนตัวตรวจอื่น (`claude plugin validate`, `check_headers.py`, `security_scan.py`) ไม่ได้รันตามที่สั่ง ต้องรอผลจาก CI

**ในตัว skill:** ประกาศมี 3 แบบ คือประกาศแรก อัปเดต และแก้ไขแล้ว แต่ละแบบมีโครงชัดเจน มี checklist ก่อนส่งตามเรื่อง PDPA และน้ำเสียงของแบรนด์ ถ้าข้อมูลไม่มี เช่นเวลาที่จะแก้เสร็จหรือการชดเชยตาม SLA ให้ถามผู้ใช้ห้ามเดา และเขียนแยกขอบเขตจาก `deploy-checklist` กับ `postmortem` ไว้แล้ว

**ก่อน merge ต้องได้ approve จากสองคน:**
- `ops-art` เป็น CODEOWNER ของ devops
- `plat-ken` เพราะ PR แก้แค็ตตาล็อกที่อยู่ใน core

นอกจากนี้ผู้รีวิวต้องรัน `skill-eval` ให้ด้วย

## PR ทดสอบ D · exec-ploy (skill report กว้าง ๆ) · 58 วินาที · 8 คำสั่ง

ผมยังไม่ได้สร้าง branch หรือเปิด PR ครับ ผม clone คลังมาอ่านกติกาแล้วเจอปัญหาที่ควรถามคุณก่อน เพราะ PR นี้ทุกทีมจะเห็นและต้องให้ `plat-ken` approve

**ปัญหาของ skill `report` ตามที่ขอมา**

1. **ไม่ตรงกติกา description ของคลัง** README กำหนดให้ description บอก 3 อย่าง คือ ทำอะไร, ใช้เมื่อผู้ใช้พิมพ์อะไร, และไม่ใช่งานของ skill ไหน ส่วน "ทำรายงาน ใช้เมื่อผู้ใช้ขอรายงาน" ไม่บอกเลยว่าทำรายงานแบบไหน หรือเอาข้อมูลมาจากไหน
2. **จะแย่งงาน skill ที่มีอยู่** `shared` เป็นแพ็กที่ทุกแผนกติดตั้ง ถ้ามี skill ที่ทำงานกับคำว่า "รายงาน" ทุกแบบ มันจะไปชนกับ `bug-report` (QA), `postmortem` (DevOps), `exec-deck` (สรุป KPI ของคุณเอง), `deal-approval` และ `meeting-minutes` เรื่องนี้ขัดกับ onboarding-notes ที่จำกัดจำนวน skill ไว้ไม่ให้หยิบผิด
3. **ด่าน eval อาจไม่ผ่าน** ชุด eval ของ `shared` ตรวจว่า `meeting-minutes` ถูกเรียกจริง (`input_match: meeting-minutes`) และทุก case ต้องได้คะแนน ≥ 0.6 ถ้า `report` ถูกหยิบมาแทนตอนผู้ใช้พิมพ์ว่า "สรุปประชุม" PR จะติดด่าน `skill-eval`
4. **ยังไม่มีเนื้อหา** ถ้ามีแค่ description โดยไม่มีขั้นตอน รูปแบบไฟล์ หรือการอ้าง `brand-guide` / `customer-data-policy` ตามที่ skill อื่นทำ คนรีวิวน่าจะตีกลับ

**ทางที่ผมแนะนำ** (เลือกได้ หรือบอกทางอื่นมาก็ได้ครับ)

- **A. จำกัดว่าเป็นรายงานแบบไหน** เช่น "รายงานสถานะโครงการรายสัปดาห์ของทุกแผนก" ผมจะเขียน description ตามกติกาและใส่บรรทัด "ไม่ใช่ bug-report / postmortem / exec-deck / meeting-minutes" ไว้ด้วย พร้อมเขียนขั้นตอน โครงไฟล์ และค่า `follows: [brand-guide, customer-data-policy]`
- **B. ถ้าเป็นรายงานสำหรับผู้บริหารโดยเฉพาะ** ใส่ใน plugin `exec` ที่คุณเป็น CODEOWNER เองจะเหมาะกว่า เพราะไม่กระทบแพ็กที่ทุกแผนกใช้
- **C. เอาตามที่ขอเดิมทุกคำ** ผมทำให้ได้ แต่จะเขียนข้อเสี่ยงด้านบนไว้ใน PR ให้ `plat-ken` เห็นชัด ๆ

ช่วยบอกว่ารายงานที่คุณใช้บ่อยเป็นแบบไหน และอยากไปทางไหน แล้วผมจะทำ branch รัน `build.py` / `check_headers.py` / `security_scan.py` และเปิด PR ให้ครับ
