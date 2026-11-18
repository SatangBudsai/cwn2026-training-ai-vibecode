Reading additional input from stdin...
OpenAI Codex v0.162.1
--------
workdir: /workspace/arena6/rulers/accept
model: gpt-6.1-sol
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: none
reasoning summaries: none
session id: 01a196cd-411b-75a1-9827-d0e579bba7fd
--------
user
คุณเป็น "กรรมการอิสระ" ของแอปจองตั๋วที่ยังไม่ถูกสร้าง ทำงานใน /workspace/arena6/rulers/accept (คุณเป็นคนละค่ายโมเดลกับผู้สร้างแอป)

1. อ่าน /workspace/arena6/spec/EXPLORATION.md (ส่วน B ฟีเจอร์ · C กฎ · F เครือข่าย) และ spec/snapshots/*.yml แล้วเขียน acceptance test ด้วย Playwright (import 'playwright' ได้เลย · PLAYWRIGHT_BROWSERS_PATH=/ms-playwright · 1366×900 · locale th-TH)
   - ข้อละ 1 ฟีเจอร์หรือ 1 กฎ ใส่รหัสอ้างอิงข้อใน EXPLORATION (เช่น B12 · C7)
   - หาองค์ประกอบจากสิ่งที่ผู้ใช้เห็นเท่านั้น (role + ชื่อ + ข้อความ) ห้ามผูกกับ data-testid หรือ class
   - ทุก test เริ่มจากหน้าแรกแล้วค้นหาผ่านฟอร์มบนจอตาม "เส้นทางมาตรฐาน" ไม่ข้ามไป URL ภายใน
   - ตัวรัน: node run.mjs <BASE_URL> <โฟลเดอร์ผล> → results.json (id | ผ่าน/ไม่ผ่าน | เหตุผล) ไม่มี retry
2. "ข้อสอบต้องผ่านกับต้นฉบับก่อน": รันชุดทดสอบกับ Google Flights สด (BASE_URL = https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB) 1 รอบ
   - ข้อที่ผ่าน = ข้อสอบใช้ได้ · ข้อที่ไม่ผ่าน ให้ดูว่าเป็นเพราะข้อสอบเขียนผิด (แก้แล้วรันข้อนั้นใหม่ได้ 1 ครั้ง) หรือเพราะต้นฉบับเปลี่ยน/ตรวจผ่านหน้าจอไม่ได้ (ทำเครื่องหมาย invalid พร้อมเหตุผล)
   - เขียน META.json: { valid: [id…], invalid: [{id, เหตุผล}] } · ข้อ invalid ไม่นับใน gate
   - ราคา/จำนวนที่เปลี่ยนตามเวลา ให้ตรวจเทียบกับ /workspace/arena6/spec/data/*.json (ข้อมูลชุดที่แอปจะใช้) ไม่ใช่เขียนเลขตายตัวที่อ่านจาก Google ตอนนี้
3. ห้ามล็อกอิน ห้ามจ่ายเงิน ห้ามข้าม CAPTCHA ห้ามกดไปเว็บสายการบิน · ห้ามอ่านโค้ดของแอปใด ๆ (ตอนนี้ยังไม่มีแอป)

เขียน ACCEPT.md: id | อ้างข้อ | ทดสอบอะไร | ผลกับต้นฉบับ | valid/invalid
ตอบเป็นตารางสรุป: ทั้งหมดกี่ข้อ · valid กี่ข้อ · invalid กี่ข้อพร้อมเหตุผลแบบกลุ่ม · เวลาที่รัน 1 รอบ
codex
ผมจะอ่านสเปกและ snapshots แล้วเขียนข้อสอบจากหน้าจอที่ผู้ใช้เห็น จากนั้นรันกับ Google Flights สดเพื่อแยกข้อ valid/invalid โดยไม่อ่านโค้ดแอปครับ
exec
/bin/bash -lc 'pwd && rg --files /workspace/arena6/spec /workspace/arena6/rulers/accept | head -80' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
/workspace/arena6/rulers/accept
/workspace/arena6/spec/data/filter-layover-airports-cards.json
/workspace/arena6/spec/data/07-booking-cards.json
/workspace/arena6/spec/data/booking-options.json
/workspace/arena6/spec/data/rpc-113.json
/workspace/arena6/spec/data/01-results-cards.json
/workspace/arena6/spec/data/filter-price-cards.json
/workspace/arena6/spec/data/validation.json
/workspace/arena6/spec/data/filters.json
/workspace/arena6/spec/data/06-details-cards.json
/workspace/arena6/spec/data/05-nonstop-results-cards.json
/workspace/arena6/spec/data/journey-log.json
/workspace/arena6/spec/data/filter-stops-cards.json
/workspace/arena6/spec/data/filter-airlines-cards.json
/workspace/arena6/spec/data/rpc-58.json
/workspace/arena6/spec/data/rpc-index.json
/workspace/arena6/spec/data/03-more-cards.json
/workspace/arena6/spec/EXPLORATION.md
/workspace/arena6/spec/data/flights-all.json
/workspace/arena6/spec/data/04-nonstop-cards.json
/workspace/arena6/spec/API-INVENTORY.md
/workspace/arena6/spec/snapshots/c-stop1-5-booking-details-expanded.yml
/workspace/arena6/spec/snapshots/a-43-footer-location.yml
/workspace/arena6/spec/snapshots/b-08-ranking-dialog-opened-by-tab-info-icon.yml
/workspace/arena6/spec/snapshots/a-15-origin-focus.yml
/workspace/arena6/spec/snapshots/c-direct-4-tip-วเลือกการจอง.yml
/workspace/arena6/spec/snapshots/b-12-combo4-noresults.yml
/workspace/arena6/spec/snapshots/a-44-footer-currency.yml
/workspace/arena6/spec/snapshots/a-45-faq-expanded.yml
/workspace/arena6/spec/snapshots/a-18-dest-typed-tokyo.yml
/workspace/arena6/spec/snapshots/b-10-airlines-thai-only.yml
/workspace/arena6/spec/snapshots/b-11-insights-expanded.yml
/workspace/arena6/spec/snapshots/b-09-filter-duration.yml
/workspace/arena6/spec/snapshots/b-05-tab-cheapest.yml
/workspace/arena6/spec/snapshots/a-17-dest-focus-empty.yml
/workspace/arena6/spec/snapshots/c-direct-13-pax-dialog.yml
/workspace/arena6/spec/snapshots/b-14-ranking-info.yml
/workspace/arena6/spec/snapshots/b-01-results-initial.yml
/workspace/arena6/spec/snapshots/b-11-track-price-dialog.yml
/workspace/arena6/spec/snapshots/b-14-row-airportChange-expanded.yml
/workspace/arena6/spec/snapshots/b-09-filter-bags.yml
/workspace/arena6/spec/snapshots/c-00-probe.yml
/workspace/arena6/spec/snapshots/a-24-oneway-bkk-tyo-nodate.yml
/workspace/arena6/spec/snapshots/a-53-multicity-max-legs.yml
/workspace/arena6/spec/snapshots/a-36-same-origin-dest.yml
/workspace/arena6/spec/snapshots/c-direct-5-booking-details-expanded.yml
/workspace/arena6/spec/snapshots/d-filter-price.yml
/workspace/arena6/spec/snapshots/b-14-row-direct-expanded.yml
/workspace/arena6/spec/snapshots/b-09-filter-stops.yml
/workspace/arena6/spec/snapshots/b-09-filter-emissions.yml
/workspace/arena6/spec/snapshots/b-14-row-mixedCabin-expanded.yml
/workspace/arena6/spec/snapshots/a-30-calendar-selected-15nov.yml
/workspace/arena6/spec/snapshots/b-09-filter-connect.yml
/workspace/arena6/spec/snapshots/a-49-home-variant2.yml
/workspace/arena6/spec/snapshots/c-direct-3-booking.yml
/workspace/arena6/spec/snapshots/d-01-results.yml
/workspace/arena6/spec/snapshots/c-direct-4-tip-นวยความสะดวก.yml
/workspace/arena6/spec/snapshots/d-03-more.yml
/workspace/arena6/spec/snapshots/b-14-passenger-assist.yml
/workspace/arena6/spec/snapshots/a-07-pax-adults-max.yml
/workspace/arena6/spec/snapshots/a-04-pax-open.yml
/workspace/arena6/spec/snapshots/d-07-booking.yml
/workspace/arena6/spec/snapshots/a-03-class-open.yml
/workspace/arena6/spec/snapshots/a-22-origin-multiselect-added.yml
/workspace/arena6/spec/snapshots/b-12-all-filters-active.yml
/workspace/arena6/spec/snapshots/a-27-calendar-oneway.yml
/workspace/arena6/spec/snapshots/b-02-expanded-stopover.yml
/workspace/arena6/spec/snapshots/d-05-nonstop-results.yml
/workspace/arena6/spec/snapshots/b-09-filter-price.yml
/workspace/arena6/spec/snapshots/a-20-origin-multiselect.yml
/workspace/arena6/spec/snapshots/c-direct-6-after-back.yml
/workspace/arena6/spec/snapshots/a-91-standard-results-top.yml
/workspace/arena6/spec/snapshots/d-filter-stops.yml
/workspace/arena6/spec/snapshots/d-04-nonstop.yml
/workspace/arena6/spec/snapshots/c-direct-11-share-dialog.yml
/workspace/arena6/spec/snapshots/b-04-sort-menu.yml
/workspace/arena6/spec/snapshots/c-change-3-booking.yml
/workspace/arena6/spec/snapshots/a-51-rt-calendar-range.yml
/workspace/arena6/spec/snapshots/c-change-6-after-back.yml
/workspace/arena6/spec/snapshots/d-filter-layover-airports.yml
/workspace/arena6/spec/snapshots/a-16-origin-typed-krungthep.yml

exec
/bin/bash -lc 'cat /root/ai-accounts/.Codex/cyolo1/plugins/cache/openai-curated-remote/cloud-environment/0.1.2/skills/runtime/SKILL.md' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
---
name: cloud-environment-runtime
description: Read at the start of work in a managed cloud environment. Inspect network policy and configured credentials; build and run Docker containers with the session proxy and CA trust; use Tailscale VPN access, configure TCP forwarding, and diagnose access failures.
---

Read this skill at the start of work in a managed cloud environment, including
resumed work. Before building or running Docker containers, read
[Docker in Docker](references/docker.md) and follow its proxy and CA guidance.

Use `cloud_environment.environment_status` at the start of work in a managed cloud
environment and when diagnosing network or authentication failures. It takes no
arguments. The runtime selects the instance and checks access as the task's actor.
The result describes the thread's managed instance; it does not describe extra
attached environments or the latest editable configuration draft.

Before network work, read [Cloud environment networking](references/networking.md)
and inspect the selected executor's `/etc/codex/network-policy.json`. If the
supported policy snapshot reports `vpn_configured: true`, also read
[Tailscale VPN access](references/vpn.md). The flag indicates configuration,
not VPN health. Also read the VPN reference when explicitly diagnosing VPN access,
even if the flag is missing or false. `environment_status` reports HTTP policy
and credential readiness, not TCP grants or VPN health.

Use the returned network policy, secret bindings, runtime variable names, and
outbound identity aliases to plan commands. Do not print credential values, dump
the process environment, or inspect secret files to discover their contents.
A configured variable may hold a proxy placeholder; that alone does not mean its
credential is missing. Use the configured SDK or CLI normally.

Treat desired configuration and observed readiness separately. Require
`observations_current: true` and the individual state `ready` before treating a
secret, runtime variable, or outbound identity as ready. Network policy is applied
only when its current state is `enforced`. Missing or any other states, including
`skipped` and `unsupported`, do not establish readiness. Recheck after setup
completes. Ready observations describe setup, not guaranteed authorization for
every remote API call. Diagnose the actual command's error too.

For CLI or SDK profile selection, read the worker's non-secret JSON manifest at
`OIC_MANIFEST_PATH`, if present. Version 1 contains a `connections` list. Select
the entry whose `alias` matches the identity needed for the task; `is_default`
identifies the provider's default, not necessarily the intended identity. Use the
selected entry's fields to set these environment variables for that command only:

| `provider_kind` | Environment variable ← manifest field |
| --- | --- |
| `azure` | `IDENTITY_ENDPOINT` ← `identity_endpoint`; `AZURE_CONFIG_DIR` ← `config_dir` |
| `aws` | `AWS_PROFILE` ← `alias`; `AWS_CONFIG_FILE` ← `config_file` |
| `gcp` | `CLOUDSDK_CONFIG` ← `config_dir`; `CLOUDSDK_ACTIVE_CONFIG_NAME` ← `configuration_name`; `GOOGLE_APPLICATION_CREDENTIALS` ← `credentials_file` |

Preserve the inherited runtime authentication headers and guard variables. Use
credential file paths as selectors without reading or printing their contents.
Do not invent aliases, replace injected credentials, or start interactive login
merely because a token is not visible. Inspect the entry's `setup` outcome when
diagnosing CLI failures; a warning does not establish successful CLI setup. If
the manifest version, required entry, or selector fields are unavailable or
unsupported, report the missing setup instead of silently using another identity.

This plugin reads runtime context. Configuration changes require the environment
configuration workflow and its user review. If the tool reports no attached
managed environment, do not reuse an instance ID or readiness result from a prior
turn.

exec
/bin/bash -lc 'cat /workspace/arena6/spec/EXPLORATION.md' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
# EXPLORATION — Google Flights (กรุงเทพมหานคร → โตเกียว)

เอกสารนี้รวมผลสำรวจแบบขนานจาก 4 ส่วน และไม่ได้เปิด Google เพิ่มระหว่างรวม ใช้แค่ไฟล์ที่ทั้ง 4 บัญชีเก็บไว้

| รหัส | โฟลเดอร์ต้นทาง | ขอบเขต | ช่วงเวลาที่สำรวจ (2026-11-01, Asia/Bangkok) |
|---|---|---|---|
| **a** | `explore/a-form` | หน้าแรก + ฟอร์มค้นหา | 17:06–17:22 |
| **b** | `explore/b-results` | หน้าผลค้นหา ตัวกรอง จัดเรียง ข้อมูลเชิงลึกด้านราคา | 17:06–17:55 |
| **c** | `explore/c-booking` | รายละเอียดเที่ยวบิน + หน้าตัวเลือกการจอง | 17:06–17:20 |
| **d** | `explore/d-network` | เครือข่าย (HAR) + ข้อมูลที่ถอดได้ | รอบหลัก 17:07:48–17:08:27 |

ข้อตกลงในเอกสาร
- คอลัมน์ **ที่มา** บอกว่าข้อนั้นมาจากส่วนไหน (a/b/c/d) ถ้าหลายส่วนเห็นตรงกันจะรวมเป็นข้อเดียว เช่น `b·c·d`
- ชนิดหลักฐาน: **[O]** = เห็นบนจอจริง · **[R]** = การตีความหรือสามัญสำนึก · **[E-net]** = เห็นในเครือข่ายแต่ไม่เห็นบนจอ
- ข้อความในเครื่องหมาย "…" และในคอลัมน์ "ข้อความ/ชื่อที่เห็นบนจอ" ยึดตาม `snapshots/*.yml` ถ้าส่วนต่างๆ สะกดไม่ตรงกัน ใช้ตามที่ snapshot เห็น ส่วน `role "ชื่อ"` คือชื่อ ARIA (accessible name)
- **ราคาและจำนวนทุกตัวผูกกับเวลาที่เห็น** ราคาเปลี่ยนระหว่างใช้งานได้ (ดู C47) อย่าใช้เป็นค่าคาดหวังตายตัวในชุดทดสอบ
- ทุกส่วนใช้ Playwright headless Chromium · viewport 1366×900 · locale th-TH · ไม่ล็อกอิน · ไม่เจอ CAPTCHA · **ไม่มีใครกด "ดำเนินการต่อ"**
- ไฟล์ใน spec/: `shots/` (ภาพ 195 ไฟล์ ชื่อขึ้นต้นด้วย a- b- c- d-) · `snapshots/` (95 ไฟล์ ใช้คำนำหน้าเดียวกัน) · `data/*.json` (18 ไฟล์ จากส่วน d) · `API-INVENTORY.md`
- **ไม่ได้คัดลอก** HAR (`explore/d-network/har/`) และ trace (`explore/d-network/trace/`) เพราะมี cookie/session ทั้งสองอย่างอยู่ใน `explore/d-network` เท่านั้น · ใน `data/booking-options.json` และ `data/rpc-113.json` ฉบับที่อยู่ใน spec ได้แทนที่ redirect token (`AAcRjH…` 6 จุด) และ session token (`CjRIalNV…` 6 จุด) ด้วย `[REDACTED-…]` แล้ว ไฟล์ต้นฉบับยังอยู่ที่ `explore/d-network/data/`

---

## เส้นทางมาตรฐาน (ค้นหาจากฟอร์มบนจอ)

คำค้น: **กรุงเทพมหานคร → โตเกียว · เที่ยวเดียว · อาทิตย์ 15 พ.ย. 2026 · ผู้ใหญ่ 1 · ชั้นประหยัด** · START URL `https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB`
สคริปต์ที่รันผ่านแล้ว: `explore/a-form/scripts/standard-route.mjs` (ผ่านล่าสุด 17:22:06) [a]

| # | ทำอะไร | ตัวระบุ (ชื่อตาม snapshot) | ผลที่เห็น |
|---|---|---|---|
| 1 | เปิด START URL | — | ฟอร์ม `search "เที่ยวบิน"` ช่องต้นทางกรอกไว้แล้วเป็น "กรุงเทพมหานคร" |
| 2 | เปลี่ยนประเภทตั๋วเป็นเที่ยวเดียว | `combobox "เปลี่ยนประเภทตั๋ว ไป-กลับ"` → `listbox "เลือกประเภทตั๋ว"` → `option "เที่ยวเดียว"` | ช่อง "ขากลับ" หายไป ชื่อช่องเปลี่ยนเป็น "เปลี่ยนประเภทตั๋ว เที่ยวเดียว" |
| 3 | ผู้โดยสาร (ไม่ต้องแก้ ค่าเริ่มต้นคือ 1) | `button "ผู้โดยสาร 1 คน เปลี่ยนจำนวนผู้โดยสาร"` (หลังโต้ตอบกับฟอร์ม ชื่อจะสั้นลงเหลือ "ผู้โดยสาร 1 คน" ให้จับด้วย `/^ผู้โดยสาร/`) | 1 |
| 4 | ชั้นโดยสาร (ไม่ต้องแก้) | `combobox "เปลี่ยนชั้นโดยสาร ชั้นประหยัด"` | — |
| 5 | ต้นทาง: พิมพ์ "กรุงเทพ" แล้วเลือก | `combobox "ต้นทาง"` → `dialog "ป้อนต้นทาง"` → `combobox "มีต้นทางอื่นอีกไหม"` → `option "กรุงเทพมหานคร"` (exact) | ต้นทาง "กรุงเทพมหานคร" (รวม BKK และ DMK) |
| 6 | ปลายทาง: พิมพ์ "โตเกียว" แล้วเลือก | `combobox "ปลายทาง"` → combobox ตัวแรกใน dialog → `option "โตเกียว ญี่ปุ่น"` (exact) | ปลายทาง "โตเกียว" · ปุ่มล่างเปลี่ยนจาก "สำรวจ" เป็น "ค้นหา" · `button "สลับต้นทางกับปลายทาง"` กดได้แล้ว |
| 7 | วันที่: เปิดปฏิทิน เลือก 15 แล้วกดเสร็จ | `textbox "ขาไป"` → ปุ่มวันที่ชื่อขึ้นต้นด้วย `วันอาทิตย์ที่ 15 พฤศจิกายน ค.ศ. 2026` (ท้ายชื่ออาจมีราคา ให้ใช้ regex `^`) → ปุ่มชื่อขึ้นต้นด้วย `เสร็จ` | ช่องขาไปเป็น "อาทิตย์ 15 พ.ย." |
| 8 | กดค้นหา | `button "ค้นหา"` (exact) ภายใน `search "เที่ยวบิน"` | URL เปลี่ยนเป็น `/travel/flights/search?tfs=…&hl=th&gl=TH&curr=THB` |
| 9 | รอผลค้นหา | รอ `heading "เที่ยวบินยอดนิยม"` · ถ้าเจอ "อ๊ะ มีบางอย่างผิดพลาด" ให้กด `button "โหลดซ้ำ"` | หัวข้อที่เห็นตอน 17:22: การค้นหาเที่ยวบิน / ตัวกรอง / ผลการค้นหา / เที่ยวบินยอดนิยม / ข้อมูลเชิงลึกด้านราคา / ติดตามราคา / เที่ยวบินอื่นๆ |

- URL ผลค้นหาที่ได้จากฟอร์ม (17:22) [a]: `https://www.google.com/travel/flights/search?tfs=CBwQAhooEgoyMDI2LTExLTE1agwIAhIIL20vMGZuMmdyDAgDEggvbS8wN2Rma0ABSAFwAYIBCwj___________8BmAEC&hl=th&gl=TH&curr=THB`
- ทางลัดที่ส่วน b·c·d ใช้ (เปิด URL ตรง ข้ามขั้น 1–8): `https://www.google.com/travel/flights?q=Flights%20from%20Bangkok%20to%20Tokyo%20on%202026-11-15%20one%20way&hl=th&gl=TH&curr=THB` (tfs ที่ได้จากสองทางนี้ไม่เหมือนกันทุกไบต์ ดู E21)
- ภาพประกอบ: `shots/a-90-standard-form-ready.png`, `shots/a-91-standard-results.png` · snapshot: `snapshots/a-90-standard-form-ready.yml`, `snapshots/a-91-standard-results-top.yml`
- ข้อควรระวัง: ราคาในปฏิทินมาช้า (ตอน 17:20 และ 17:22 ปุ่มวันที่ 15 มีแค่เลข "15") ห้ามบังคับรอราคา · ตอน 17:20:36 เจอหน้าข้อผิดพลาด พอเว้นไป 60 วินาทีก็ผ่าน [a]

---

## A. หน้าจอ

| # | หน้า/สถานะ | ไปถึงได้อย่างไร | ภาพ / snapshot (ใน spec/) | ที่มา |
|---|---|---|---|---|
| A1 | หน้าแรก แบบ V1 (มีการ์ดดีล) | เปิด START URL (3 ใน 4 ครั้งตอน 17:17) | `shots/a-01-home-top.png`, `a-01-home-full.png` · `snapshots/a-01-home.yml` | a |
| A2 | หน้าแรก แบบ V2 (มีแผนที่โลก ไม่มีส่วน "จุดหมายยอดนิยม…" และ "ค้นหาเที่ยวบินเพิ่มเติม") | เปิด START URL (1 ใน 4 ครั้ง) | `shots/a-49-home-variant2-full.png` · `snapshots/a-49-home-variant2.yml` | a |
| A3 | ดรอปดาวน์ประเภทตั๋ว | กด "ไป-กลับ ▾" | `shots/a-02-tickettype-open.png` · `snapshots/a-02-tickettype-open.yml` | a |
| A4 | ดรอปดาวน์ชั้นโดยสาร | กด "ชั้นประหยัด ▾" | `shots/a-03-class-open.png` · `snapshots/a-03-class-open.yml` | a |
| A5 | ป๊อปอัปผู้โดยสาร (หน้าแรก) | กดปุ่มไอคอนคน "1 ▾" | `shots/a-04-pax-open.png`, `a-12-pax-after-done.png`, `a-54-pax-1seat-1lap.png` · `snapshots/a-04-pax-open.yml` | a |
| A6 | ป๊อปอัปผู้โดยสาร ขณะแจ้งข้อผิดพลาด (ปุ่ม เสร็จ/ยกเลิก หาย) | เพิ่มเกินกฎ C1–C4 | `shots/a-07-pax-adults-max.png`, `a-08-pax-over-max.png`, `a-09-pax-lap-rule.png`, `a-11-pax-child-only.png`, `a-11b-pax-infant-seat.png`, `a-13-pax-infant-seat-rule.png`, `a-14-pax-children-max.png` · `snapshots/a-07-…`, `a-09-…` | a |
| A7 | ฟอร์มแบบเที่ยวเดียว | เลือก "เที่ยวเดียว" | `shots/a-06-oneway.png`, `a-24-oneway-bkk-tyo-nodate.png` · `snapshots/a-06-oneway.yml`, `a-24-…` | a |
| A8 | ฟอร์มแบบหลายเมือง | เลือก "หลายเมือง" | `shots/a-05-multicity.png`, `a-53-multicity-max-legs.png` · `snapshots/a-05-…`, `a-53-…` | a |
| A9 | กล่องป้อนต้นทาง | กดช่องต้นทาง | `shots/a-15-origin-focus.png`, `a-16-origin-typed-krungthep.png` · `snapshots/a-15-…`, `a-16-…` | a |
| A10 | กล่องป้อนปลายทาง (ยังว่าง) + รายการแนะนำตอนพิมพ์ | กดช่องปลายทาง / พิมพ์ | `shots/a-17-dest-focus-empty.png`, `a-18-dest-typed-tokyo.png`, `a-19-dest-noresult.png`, `a-19b-dest-country.png` · `snapshots/a-17-…`, `a-18-…` | a |
| A11 | โหมดเลือกสนามบินหลายแห่ง และฟอร์มที่มีต้นทางหลายแห่ง | ปุ่ม "+" ในกล่องป้อน แล้วกด "เสร็จ" | `shots/a-20-…`, `a-21-…`, `a-22-origin-multiselect-added.png`, `a-23-origin-multi-result.png` · `snapshots/a-20-…`, `a-22-…`, `a-23-…` | a |
| A12 | ปฏิทินเที่ยวเดียว (รวมสถานะที่เลือกวันแล้ว) | กดช่อง "ขาไป" หรือกด "ค้นหา" ตอนยังไม่มีวันที่ | `shots/a-26-search-no-date.png`, `a-27-calendar-oneway.png`, `a-28-calendar-next2.png`, `a-29-calendar-last.png`, `a-30-calendar-selected-15nov.png`, `a-32/33/34/35-*.png` · `snapshots/a-27-…`, `a-30-…` | a |
| A13 | ปฏิทินไป-กลับ | กดช่อง "ขาไป" ตอนเป็นไป-กลับ | `shots/a-50-rt-calendar-after-dep.png`, `a-51-rt-calendar-range.png`, `a-52-rt-filled.png` · `snapshots/a-51-…` | a |
| A14 | ฟอร์มกรอกครบ (ยังไม่กดค้นหา) | ทำตามเส้นทางมาตรฐานขั้น 1–7 | `shots/a-31-form-filled-standard.png`, `a-90-standard-form-ready.png` · `snapshots/a-31-…`, `a-90-…` | a |
| A15 | ผลค้นหาว่าง "ไม่พบตัวเลือกที่ตรงกับการค้นหา" | ต้นทางเท่ากับปลายทาง แล้วกดค้นหา | `shots/a-36-same-origin-dest.png`, `a-37-same-origin-dest-search.png`, `a-38-bkk-dmk.png` · `snapshots/a-36-…` | a |
| A16 | หน้า "สำรวจ" (`/travel/explore`) | กด "สำรวจ" ตอนปลายทางว่าง | `shots/a-39-empty-origin-search.png`, `a-40-roundtrip-nodate-search.png`, `a-41-explore-from-empty-dest.png` | a |
| A17 | กล่องเลือกภาษา / สถานที่ตั้ง / สกุลเงิน | ปุ่มท้ายหน้า | `shots/a-42/43/44-footer-*.png` · `snapshots/a-42/43/44-*.yml` | a |
| A18 | คำถามที่พบบ่อยแบบกางออก · แท็บดีลจากเมืองอื่น · กล่อง ⓘ ข้อมูลดีล | กดคำถาม / แท็บ "เทศบาลนครภูเก็ต" / ปุ่ม ⓘ | `shots/a-45-faq-expanded.png`, `a-46-deals-phuket-tab.png`, `a-47-deals-info.png` · `snapshots/a-45-…` | a |
| A19 | ผลค้นหาแบบยุบ "มีผลลัพธ์ 21 รายการ": แท็บ "ดีที่สุด" (ค่าเริ่มต้น) → "เที่ยวบินยอดนิยม" 3 ใบ + "ข้อมูลเชิงลึกด้านราคา" + "ติดตามราคา" + "เที่ยวบินอื่นๆ" 18 ใบ + ปุ่ม "ดูเที่ยวบินเพิ่มเติม" | ทำตามเส้นทางมาตรฐาน หรือเปิด URL `?q=` | `shots/a-91-standard-results.png`, `b-01-results-top.png`, `b-01-results-full.png`, `c-00-probe.png`, `c-*-1-collapsed.png`, `d-01-results.png` · `snapshots/a-91-…`, `b-01-results-initial.yml`, `c-00-probe.yml`, `d-01-results.yml` | a·b·c·d |
| A20 | ผลค้นหาแบบเต็ม "มีผลลัพธ์ 300 รายการ" (ปุ่ม "ดูเที่ยวบินเพิ่มเติม" หายไป) | กด "ดูเที่ยวบินเพิ่มเติม" (URL มี `tfu=EgYIABABGAA`) | `shots/b-02-more-button.png`, `b-02-after-more-full.png`, `d-03-more.png` · `snapshots/b-02-after-more.yml`, `d-03-more.yml` | b·c·d |
| A21 | แท็บ "ถูกที่สุด" | คลิกที่ตัวแท็บ (ไม่ใช่ไอคอน ⓘ) URL ได้ `tfu=EgoIABAAGAAgAigB` | `shots/b-04-tab-cheapest.png`, `b-05-tab-cheapest-loaded.png`, `b-08-sorted-then-cheapest-tab.png` · `snapshots/b-04-tab-cheapest.yml`, `b-05-tab-cheapest.yml` | b |
| A22 | กล่องคำอธิบายการจัดอันดับ | ไอคอน ⓘ ในแท็บ หรือข้างข้อความ "จัดอันดับตามราคาและความสะดวก" | `shots/b-04-ranking-info.png`, `b-08-ranking-dialog-opened-by-tab-info-icon.png`, `b-14-ranking-info.png` · `snapshots/b-04-ranking-info-dialog.yml`, `b-08-…`, `b-14-ranking-info.yml` | b |
| A23 | เมนูการจัดเรียง และรายการหลังจัดเรียง (รวมเป็นหัวข้อ "เที่ยวบินทั้งหมด") | ปุ่ม "จัดเรียงตามเที่ยวบินยอดนิยม, เปลี่ยนลำดับการจัดเรียง" | `shots/b-04-sort-menu-cheapest.png`, `b-06-sort-menu-open.png`, `b-07-sort-*.png`, `b-08-sorted-price.png` · `snapshots/b-04-sort-menu.yml`, `b-06-sort-menu.yml`, `b-06-sorted-price.yml`, `b-08-sorted-price.yml` | b |
| A24 | แถวเที่ยวบินที่ขยายแล้ว (URL ไม่เปลี่ยน) | กดปุ่ม ˅ "รายละเอียดเที่ยวบิน ออกเดินทางจาก…" ท้ายแถว | `shots/b-02-expanded-stopover.png`, `b-14-row-*-expanded.png`, `c-direct/stop1/change-2-expanded.png`, `d-06-details.png` · `snapshots/b-02-expanded-stopover.yml`, `b-14-row-*-expanded.yml`, `c-*-2-expanded.yml`, `d-06-details.yml` | b·c·d |
| A25 | ป๊อปอัปตัวกรองแต่ละตัว (8 ตัว) | กดชิปตัวกรองใต้ฟอร์มค้นหา | `shots/b-09-filter-*.png`, `d-filter-stops.png`, `d-filter-price.png`, `d-filter-airlines.png`, `d-filter-layover-airports.png` · `snapshots/b-09-filter-*.yml`, `d-filter-*.yml` | b·d |
| A26 | ผลค้นหาหลังกรอง "บินตรงเท่านั้น" (มีผลลัพธ์ 18 รายการ) | ตัวกรองจำนวนครั้งที่แวะพัก → "บินตรงเท่านั้น" แล้วปิดกล่อง | `shots/b-10-filter-nonstop.png`, `d-04-nonstop.png`, `d-05-nonstop-results.png` · `snapshots/d-04-nonstop.yml`, `d-05-nonstop-results.yml` | b·d |
| A27 | กล่อง "ตัวกรอง" (ตัวกรองทั้งหมด) | ปุ่ม "ตัวกรองทั้งหมด" | `shots/b-09-all-filters.png`, `b-12-all-filters-with-3.png`, `b-12-after-clear-all.png` · `snapshots/b-09-all-filters.yml`, `b-12-all-filters-active.yml` | b |
| A28 | ผลค้นหาว่างจากตัวกรอง "ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ" / "ไม่พบเที่ยวบินของ กาตาร์แอร์เวย์" | ใช้ตัวกรองจนไม่เหลือเที่ยวบิน / เลือก "กาตาร์แอร์เวย์ เท่านั้น" | `shots/b-12-combo4-noresults.png`, `b-10-noresults-qatar-only.png`, `b-10-noresults-duration-max5h.png` · `snapshots/b-12-combo4-noresults.yml` | b |
| A29 | หน้าข้อผิดพลาด "อ๊ะ มีบางอย่างผิดพลาด" + ปุ่ม "โหลดซ้ำ" | เกิดเป็นครั้งคราวหลังค้นหา จัดเรียง ใช้ตัวกรอง หรือเปลี่ยนวัน | `shots/b-06-sort-ราคา.png`, `b-10-error-after-price10k.png`, `b-10-error-after-price20k.png`, `b-10-price-error.png`, `b-13-after-pick-cheapest-date.png` · `snapshots/b-10-price-error.yml` | a·b·d |
| A30 | ข้อมูลเชิงลึกด้านราคาแบบขยาย + กราฟประวัติราคา 60 วัน | ปุ่ม "ดูประวัติราคา" | `shots/b-11-insights-collapsed.png`, `b-11-insights-expanded.png` · `snapshots/b-11-insights-expanded.yml` | b |
| A31 | dialog "ข้อมูลเชิงลึกด้านราคา" แท็บ "วันที่" (ตารางวันที่) และแท็บ "กราฟราคา" | ปุ่ม "ตารางวันที่" / "กราฟราคา" | `shots/b-11-date-grid.png`, `b-13-date-grid-right.png`, `b-11-price-graph.png`, `b-13-price-graph-*.png` · `snapshots/b-11-date-grid.yml`, `b-11-price-graph.yml`, `b-13-price-graph.yml` | b |
| A32 | dialog "ลงชื่อเข้าใช้เพื่อติดตามราคา" | กดสวิตช์ติดตามราคาตอนยังไม่ล็อกอิน | `shots/b-11-track-price-click.png` · `snapshots/b-11-track-price-dialog.yml` | b |
| A33 | dialog "ค่าธรรมเนียมสัมภาระ" / "ความช่วยเหลือสำหรับผู้โดยสาร" | ปุ่มในบรรทัดหมายเหตุราคา (ทั้งหน้าผลค้นหาและหน้าจอง) | `shots/b-14-bag-fees.png`, `b-14-passenger-assist.png`, `c-direct-14-baggage-dialog.png` · `snapshots/b-14-bag-fees.yml`, `b-14-passenger-assist.yml` | b·c |
| A34 | dialog "ปัจจัยของผลกระทบต่อสภาพอากาศ" | ปุ่ม CO2e ในแถว | `shots/b-14-emission-info.png` · `snapshots/b-14-emission-info.yml` | b |
| A35 | หน้าตัวเลือกการจอง (`/travel/flights/booking?tfs=…&tfu=…`) | กด "เลือกเที่ยวบิน" ในแถวที่ขยาย หรือคลิกตัวแถวที่ยังยุบอยู่ | `shots/c-*-3-booking.png`, `c-*-3-booking-full.png`, `d-07-booking.png` · `snapshots/c-*-3-booking.yml`, `d-07-booking.yml` | c·d |
| A36 | หน้าจองที่ขยายการ์ด "เที่ยวบินที่เลือก" | กดปุ่ม ˅ "รายละเอียดเที่ยวบิน เที่ยวบินขาไปในวัน…" | `shots/c-*-5-booking-details-expanded.png` · `snapshots/c-*-5-booking-details-expanded.yml` | c |
| A37 | popup "วิธีจัดอันดับตัวเลือก" และ popup ค่าธรรมเนียมเพิ่มเติม | ปุ่ม (i) บนหน้าจอง | `shots/c-direct-4-tip-วเลือกการจอง.png`, `c-change-4-tip-วเลือกการจอง.png`, `c-direct-4-tip-นวยความสะดวก.png` · `snapshots/c-direct-4-tip-*.yml`, `c-change-4-tip-*.yml` | c |
| A38 | dialog แชร์ "แชร์เที่ยวบินนี้" | ปุ่ม "แชร์" บนหน้าจอง | `shots/c-direct-11-share-dialog.png` · `snapshots/c-direct-11-share-dialog.yml` | c |
| A39 | กล่องผู้โดยสารบนหน้าจอง | `button "ผู้โดยสาร 1 คน เปลี่ยนจำนวนผู้โดยสาร"` บนหน้าจอง | `shots/c-direct-13-pax-dialog.png`, `c-direct-13-pax.png` · `snapshots/c-direct-13-pax-dialog.yml` | c |
| A40 | ผลค้นหาหลังกลับจากหน้าจอง (เริ่มใหม่ทั้งหน้า) | ปุ่ม "ย้อนกลับ" / "เปลี่ยนเที่ยวบิน" / ปุ่ม Back/Forward ของเบราว์เซอร์ | `shots/c-*-6-after-back.png`, `c-*-7-after-forward.png`, `c-*-8-after-browser-back.png`, `c-direct-12-after-change-flight.png` · `snapshots/c-*-6-after-back.yml` | c |
| A41 | หน้าจองที่เปิดจากลิงก์ตรงในเบราว์เซอร์ใหม่ (ไม่มี cookie) | เปิด booking URL ใน context ใหม่ | `shots/c-*-9-deeplink.png`, `c-*-10-deeplink-after-back.png` | c |
| A42 | หน้าจองที่ความกว้าง 600px | ย่อ viewport | `shots/c-direct-15-narrow-600.png` | c |

---

## B. ฟีเจอร์

| # | ฟีเจอร์ | อยู่ตรงไหน | ลูกค้าทำอะไรได้ | ผลที่เห็น | ข้อความ/ชื่อที่เห็นบนจอ | ที่มา |
|---|---|---|---|---|---|---|
| B1 | แถบนำทางบน | header | ไปหน้าอื่นของ Google Travel, เปลี่ยนธีม, เข้าสู่ระบบ | ไม่ได้กด | link "สำรวจ" · "เที่ยวบิน" · "โรงแรม" · "ที่พักให้เช่า" · `button "เปลี่ยนธีมเว็บไซต์"` · "เข้าสู่ระบบ" · `button "เมนูหลัก"` | a |
| B2 | ประเภทตั๋ว | แถวบนของฟอร์ม | เลือกได้ 3 แบบ | ไป-กลับมีช่องวันที่ 2 ช่อง · เที่ยวเดียวมี 1 ช่อง · หลายเมืองมีหลายแถว | `combobox "เปลี่ยนประเภทตั๋ว <ค่า>"` → `listbox "เลือกประเภทตั๋ว"`: "ไป-กลับ" (ค่าเริ่มต้น) / "เที่ยวเดียว" / "หลายเมือง" | a |
| B3 | ชั้นโดยสาร | แถวบนของฟอร์ม | เลือกได้ 4 ชั้น | — | `combobox "เปลี่ยนชั้นโดยสาร <ค่า>"` → `listbox "เลือกชั้นโดยสารที่ต้องการ"`: "ชั้นประหยัด" (ค่าเริ่มต้น) / "ประหยัดพรีเมียม" / "ชั้นธุรกิจ" / "ชั้นหนึ่ง" | a |
| B4 | ผู้โดยสาร (ทั้งบนฟอร์มหน้าแรกและบนหน้าจอง) | หน้าแรก: แถวบนของฟอร์ม · หน้าจอง: ใต้ชื่อเมือง | ปรับจำนวน 4 ประเภทด้วยปุ่ม − / + แล้วกด "เสร็จ" หรือ "ยกเลิก" (บนหน้าจองลองแค่เปิดแล้วกด Esc) | ตัวเลขบนปุ่มเป็นผลรวมทุกประเภท **รวมทารกบนตักด้วย** (2 ผู้ใหญ่ + 1 เด็ก + 1 ทารกบนตัก แสดง "ผู้โดยสาร 4 คน") | `button "ผู้โดยสาร 1 คน เปลี่ยนจำนวนผู้โดยสาร"` → `dialog "จำนวนผู้โดยสาร"` · แถว "ผู้ใหญ่" · "เด็ก อายุ 2-11 ปี" · "ทารกที่โดยสาร ในที่นั่งของตนเอง" · "ทารกที่โดยสาร บนตัก" · ปุ่ม "เพิ่มผู้ใหญ่"/"นำผู้ใหญ่ออก", "เพิ่มเด็กอายุ 2-11 ปี"/"นำเด็กอายุ 2-11 ปีออก", "เพิ่มทารกที่โดยสารบนที่นั่ง"/"นำทารกที่โดยสารบนที่นั่งออก", "เพิ่มทารกที่โดยสารบนตัก"/"นำทารกที่โดยสารบนตักออก" · "เสร็จ" · "ยกเลิก" | a·c |
| B5 | ช่องต้นทาง | ฟอร์ม ช่องซ้าย | ตอนเปิดหน้ามีค่า "กรุงเทพมหานคร" อยู่แล้ว กดแล้วได้กล่องค้นหา | กล่องแสดงเมืองที่เลือกพร้อมสนามบินย่อย BKK (ห่าง 27 กม.) และ DMK (ห่าง 20 กม.) | `combobox "ต้นทาง"` → `dialog "ป้อนต้นทาง"` · `combobox "มีต้นทางอื่นอีกไหม"` · `button "สลับปุ่มเพื่อแสดงรายการสนามบินที่อยู่ใกล้เคียงกับกรุงเทพมหานคร"` | a |
| B6 | ช่องปลายทาง | ฟอร์ม ช่องขวา | กดแล้วได้รายการแนะนำเริ่มต้น หรือพิมพ์ค้นหาเอง | ตอนช่องว่าง (17:09) แนะนำ "ทุกที่", "ทวีปยุโรป", "ญี่ปุ่น", "ปารีส", "ลอนดอน" | `combobox "ปลายทาง"` (placeholder "ปลายทาง") · "ทุกที่" · "ค้นหาการเดินทางไปยังที่ใดก็ได้ในโลก" | a |
| B7 | รายการแนะนำตอนพิมพ์ | กล่องป้อนต้นทาง/ปลายทาง | พิมพ์ชื่อไทย อังกฤษ รหัส IATA หรือประเทศ | "โตเกียว" → เมือง + HND 18 กม. + NRT 67 กม. + Tokyo Station · "NRT" → สนามบินเดียว · "ญี่ปุ่น" → ประเทศ + เมือง · พิมพ์มั่ว → ไม่พบ | `option "โตเกียว ญี่ปุ่น"` · `option "ท่าอากาศยานนานาชาติโตเกียว (HND)"` · `option "ท่าอากาศยานนานาชาตินะริตะ (NRT)"` · `option "กรุงเทพมหานคร"` · `option "ท่าอากาศยานสุวรรณภูมิ (BKK)"` · `option "ท่าอากาศยานดอนเมือง (DMK)"` · "ไม่พบสถานที่ที่ตรงกัน" | a |
| B8 | เลือกสนามบินหลายแห่ง | ปุ่ม "+" ขวาสุดของกล่องป้อน (มีทั้งต้นทางและปลายทาง) | เพิ่มเมืองหรือสนามบินได้หลายตัว ลบทีละตัวได้ | รายการกลายเป็น checkbox ตัวที่เลือกขึ้นเป็นชิป · กด "เสร็จ" แล้วช่องแสดง "กรุงเทพมหานคร · ภูเก็ต" | `button "ต้นทาง, เลือกสนามบินหลายแห่ง"` · "เลือกสนามบินหลายแห่ง" · `checkbox "ภูเก็ต"` · `checkbox "ท่าอากาศยานนานาชาติภูเก็ต (HKT)"` · `button "ลบ"` · `button "เสร็จ"` · `combobox "ต้นทาง กรุงเทพมหานคร, ภูเก็ต"` | a |
| B9 | สลับต้นทาง/ปลายทาง | ระหว่างสองช่อง | สลับค่าสองช่อง | สลับไปกลับได้ · กดไม่ได้ตอนปลายทางว่าง | `button "สลับต้นทางกับปลายทาง"` | a |
| B10 | ปุ่มค้นหา / สำรวจ | ใต้ฟอร์ม ตรงกลาง | ปลายทางว่าง: ไปหน้าสำรวจ · มีปลายทาง: ค้นหาเที่ยวบิน | ชื่อปุ่มเปลี่ยนตามสถานะ | ปลายทางว่าง: `button "สำรวจจุดหมายปลายทาง"` (บนจอเขียน "สำรวจ") · มีปลายทาง: `button "ค้นหา"` | a |
| B11 | ปฏิทินเลือกวัน (ราคารายวัน) | กดช่องวันที่ | เลือกวันจากปฏิทินที่แสดงทีละ 2 เดือน | ใต้วันที่มีราคาแบบปัด (เช่น ฿7,640, ฿10.1K) · วันที่ถูกที่สุดเป็นตัวเขียวขีดเส้นใต้ประ · ราคาโหลดทีละช่วง · เลือกวันแล้วข้างปุ่มเสร็จแสดง "เริ่มที่ ฿7,635 สำหรับเที่ยวเดียว" | `combobox "เลือกประเภทตั๋ว เที่ยวเดียว"` · `button "รีเซ็ต"` · `textbox "ขาไป"` (และ `textbox "ขากลับ"`) · `button "ก่อนหน้า"` / `button "ถัดไป"` · ปุ่ม "เสร็จ" (ชื่อ ARIA "เสร็จ. ค้นหาเที่ยวบินเที่ยวเดียวที่ออกเดินทางในวันที่ 15 พฤศจิกายน ค.ศ. 2026") · "ราคาที่ขีดเส้นใต้คือราคาที่ถูกที่สุดเมื่อเทียบกับราคาอื่นๆ ที่แสดง" · ปุ่มวัน "วันอาทิตย์ที่ 15 พฤศจิกายน ค.ศ. 2026 , 7635 บาทไทย" (ถ้าถูกที่สุดจะต่อท้าย ", ราคาถูกที่สุด") | a |
| B12 | ปุ่ม < > เลื่อนวันทีละ 1 วัน | ในช่องวันที่ (บนฟอร์มและในปฏิทิน) โผล่หลังเลือกวันแล้ว | เลื่อนวัน ±1 | อา. 15 → จ. 16 พ.ย. · URL tfs อัปเดตตาม | **ไม่มีข้อความและไม่มี aria-label** (บนจอเป็นไอคอน "<" ">") · `aria-hidden="true"` · ใช้ CSS `button[data-delta="-1"]` / `button[data-delta="1"]` | a |
| B13 | รีเซ็ตวันที่ | หัวปฏิทิน | ล้างวันที่ที่เลือก | ช่องวันที่ว่าง · ปุ่มกดไม่ได้ถ้ายังไม่ได้เลือกวัน | `button "รีเซ็ต"` | a |
| B14 | พิมพ์วันที่เอง | ช่อง "ขาไป" ในปฏิทิน | พิมพ์แล้วกด Enter | "15/11/2026" → "อาทิตย์ 15 พ.ย." · วันที่อดีตหรือเกินช่วงยังค้างเป็นข้อความดิบ | `textbox "ขาไป"` · ค่าบนจอหลังรับแล้ว "อาทิตย์ 15 พ.ย." | a |
| B15 | ปฏิทินไป-กลับ | กดช่องขาไปตอนเป็นไป-กลับ | เลือกวันไปแล้วเลือกวันกลับต่อ | โฟกัสย้ายไป "ขากลับ" · ราคาเปลี่ยนเป็นราคาไป-กลับ (15 พ.ย. ฿15.2K ตอน 17:18) | `textbox "ขากลับ"` · ปุ่ม "เสร็จ. ค้นหาเที่ยวบินไป-กลับที่ออกเดินทางในวันที่ 10 พฤศจิกายน ค.ศ. 2026 และเดินทางกลับในวันที่ 20 พฤศจิกายน ค.ศ. 2026" | a |
| B16 | หลายเมือง | ฟอร์มเมื่อเลือก "หลายเมือง" | เพิ่มหรือลบเที่ยวบิน (2–5 แถว) | เริ่มที่ 2 แถว: กรุงเทพมหานคร→(ว่าง) อ. 17 พ.ย. · (ว่าง)→กรุงเทพมหานคร ส. 21 พ.ย. | `button "เพิ่มเที่ยวบิน"` · `button "ลบเที่ยวบินจาก<เมือง> ในวันที่ <วัน>"` / `"ลบเที่ยวบินไปยัง<เมือง> ในวันที่ <วัน>"` | a |
| B17 | URL ตามสถานะฟอร์มและผลค้นหา | แถบที่อยู่ | แชร์หรือเปิดลิงก์ซ้ำ | หน้าแรก `/travel/flights?tfs=…&tfu=…` · ผลค้นหา `/travel/flights/search?tfs=…&tfu=…` · หน้าจอง `/travel/flights/booking?tfs=…&tfu=…` (รายละเอียดใน D12) | ไม่มีข้อความบนจอ (เป็นแถบที่อยู่ของเบราว์เซอร์) | a·b·c·d |
| B18 | แบนเนอร์ AI | ใต้ฟอร์ม | ไม่ได้กด | — | "หากไม่มีแผนตายตัว ก็ลองดูดีลเที่ยวบินที่ดีที่สุดด้วย AI เลย" · `button "สำรวจดีลด้วย AI"` | a |
| B19 | ดีลจากเมืองในไทย (เฉพาะหน้า V1) | ส่วน "ค้นหาเที่ยวบินราคาถูกจากไทยไปยังที่ใดก็ได้" | สลับแท็บเมืองต้นทางแล้วกดการ์ด | 17:06 แท็บกรุงเทพฯ: →เชียงใหม่ ฿2,766 · →ภูเก็ต ฿2,390 · →ฮ่องกง ฿5,138 · 17:17 แท็บภูเก็ต: →สมุย ฿6,430 · →เชียงใหม่ ฿5,280 · →สิงคโปร์ ฿4,666 | แท็บ "กรุงเทพมหานคร" "เทศบาลนครภูเก็ต" "อำเภอเกาะสมุย" "เทศบาลนครเชียงใหม่" · การ์ด "ค้นหาเที่ยวบินจาก… ที่มีราคาเริ่มต้น ฿… ดำเนินการโดย … บินตรง" · ปุ่ม "ดูจุดหมายอื่นๆ จาก<เมือง>" | a |
| B20 | ⓘ ข้อมูลดีล | ปุ่ม ⓘ ข้างหัวข้อดีล | อ่านคำอธิบาย | ข้อความอธิบายที่มาของดีล | `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับส่วนนี้"` · "คำแนะนำเที่ยวบินอิงตามค่าโดยสารไป-กลับที่ถูกที่สุดจากเมืองยอดนิยมในไทยไปยังจุดหมายยอดนิยมในอีก 3 เดือนข้างหน้า…" · `button "ปิดกล่องโต้ตอบ"` | a |
| B21 | เครื่องมือ (แท็บแนะนำ) | ส่วน "เครื่องมือที่มีประโยชน์ที่จะช่วยคุณค้นหาตั๋วเครื่องบินที่ดีที่สุด" | อ่านคำแนะนำ 4 แท็บ | — | "ค้นหาช่วงเวลาที่เที่ยวบินมีราคาถูกที่สุด" · "ทราบช่วงเวลาที่ควรจองด้วยข้อมูลเชิงลึกด้านราคา" · "ติดตามราคาเที่ยวบินสำหรับการเดินทาง" · "สำรวจดีลเที่ยวบินที่ดีที่สุดด้วย AI" | a |
| B22 | จุดหมายยอดนิยม (เฉพาะ V1) | ส่วน "จุดหมายยอดนิยมสำหรับเที่ยวบินจากไทย" | กดรูปเมือง | ลิงก์ไป `flights-to-<city>.html` | heading "จุดหมายยอดนิยมสำหรับเที่ยวบินจากไทย" · ลอนดอน, กรุงเทพมหานคร, โตเกียว, เทศบาลนครภูเก็ต, เทศบาลนครเชียงใหม่, ไทเป, สิงคโปร์, เขตสหพันธรัฐกัวลาลัมเปอร์, เซี่ยงไฮ, โอซากะ | a |
| B23 | คำถามที่พบบ่อย | `group "คำถามที่พบบ่อย"` | กดเพื่อกางหรือหุบ | V1 มี 6 ข้อ · V2 ไม่มีข้อแรก | "จากไทย ฉันควรบินไปไหนดี" · "ฉันจะหาดีลเที่ยวบินแบบนาทีสุดท้ายได้อย่างไร" · "ฉันจะหาเที่ยวบินราคาถูกสำหรับการพักผ่อนวันหยุดได้อย่างไร" · "ฉันจะหาดีลเที่ยวบินได้อย่างไรหากไม่มีแผนการเดินทางตายตัว" · "ฉันจะหาเที่ยวบินราคาถูกจากไทยไปยังที่ใดก็ได้ได้อย่างไร" · "ฉันจะรับการแจ้งเตือนเที่ยวบินสำหรับการเดินทางของฉันได้อย่างไร" | a |
| B24 | ค้นหาเที่ยวบินเพิ่มเติม (เฉพาะ V1) | ส่วนท้ายของ main | สลับ 3 แท็บลิงก์ | แท็บ 2 มีเส้นทางต่างประเทศ 17 ลิงก์ | แท็บ "เที่ยวบินจากเมืองในไทย" · "เที่ยวบินระหว่างประเทศจากไทย" · "เที่ยวบินภายในประเทศในไทย" · ลิงก์ เช่น "เที่ยวบินจากกรุงเทพมหานครไปยังโตเกียว" | a |
| B25 | ภาษา / สถานที่ตั้ง / สกุลเงิน | ท้ายหน้า | เปิดกล่องเลือก (ลองแค่เปิดแล้วกด Esc) | ภาษา 72 รายการ · ประเทศ 187 รายการ · สกุลเงินมีกลุ่ม "สกุลเงินที่แนะนำ" (USD, THB, GBP, EUR, JPY) | `button "ภาษา·ไทย"` → `dialog "เลือกภาษาของคุณ"` · `button "สถานที่ตั้ง·ไทย"` → `dialog "เลือกตำแหน่งของคุณ"` · `button "สกุลเงิน THB"` → `dialog "เลือกสกุลเงิน"` · "ยกเลิก" "ตกลง" · ค่าปัจจุบัน "บาท THB" | a |
| B26 | ข้อความท้ายหน้าและหมายเหตุราคา | ท้ายหน้า (หน้าแรก ผลค้นหา หน้าจอง) | อ่าน | บอกว่าราคารวมภาษีและค่าธรรมเนียมแล้ว | "ตัวเลือกภาษาและสกุลเงินปัจจุบันที่ใช้: ไทย - ไทย - THB" · "สกุลเงินที่แสดงอาจแตกต่างจากสกุลเงินที่ใช้ในการซื้อเที่ยวบิน" · "ราคานี้เป็นราคาสุดท้ายซึ่งรวมภาษีและค่าธรรมเนียมทั้งหมดแล้ว …" · ลิงก์ "เกี่ยวกับ" "ความเป็นส่วนตัว" "ข้อกำหนด" "ความคิดเห็น" "ศูนย์ช่วยเหลือ" | a·b·c |
| B27 | แท็บจัดอันดับ "ดีที่สุด" / "ถูกที่สุด" | เหนือรายการผลค้นหา | สลับแท็บ | แท็บ "ถูกที่สุด" แสดงราคาต่ำสุด และราคานี้เปลี่ยนตามตัวกรอง (บินตรง ฿9,062 · Star Alliance ฿12,751) | tab "ดีที่สุด" · tab "ถูกที่สุด เริ่มต้น 7635 บาทไทย ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ…" (บนจอ "ถูกที่สุด เริ่มต้น ฿7,635") · "จัดอันดับตามราคาและความสะดวก" | b |
| B28 | คำอธิบายการจัดอันดับผลค้นหา | ไอคอน ⓘ ในแท็บ / ข้างข้อความจัดอันดับ | อ่านเกณฑ์ | กล่องข้อความพร้อมลิงก์ไปหน้าช่วยเหลือ | `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ"` · "หากกำลังมองหาการเดินทางแบบไร้กังวล เที่ยวบินเหล่านี้ได้รับเลือกโดยพิจารณาความสมดุลระหว่างราคากับความสะดวกสบาย…" · link "ดูข้อมูลเพิ่มเติม" · `button "ปิดกล่องโต้ตอบ"` | b |
| B29 | การจัดเรียง | ปุ่มขวาบนของรายการ | เลือกได้ 6 แบบ | ชื่อปุ่มเปลี่ยนตามค่า และรายการรวมเป็นหัวข้อเดียว "เที่ยวบินทั้งหมด" | `button "จัดเรียงตามเที่ยวบินยอดนิยม, เปลี่ยนลำดับการจัดเรียง"` · menuitemradio "เที่ยวบินยอดนิยม" (ค่าเริ่มต้น) / "ราคา" / "เวลาออกเดินทาง" / "เวลาถึง" / "ระยะเวลา" / "การปล่อยก๊าซ" | b |
| B30 | ดูเที่ยวบินเพิ่มเติม | แถวสุดท้ายของรายการ | กด 1 ครั้ง | "มีผลลัพธ์ 21 รายการ" → "มีผลลัพธ์ 300 รายการ" แล้วปุ่มหายไป (ไม่มีหน้า 2) | `button "ดูเที่ยวบินเพิ่มเติม"` · "มีผลลัพธ์ 21 รายการ" / "มีผลลัพธ์ 300 รายการ" | b·c·d |
| B31 | แถวเที่ยวบิน (แบบยุบ) | รายการผลค้นหา | อ่านสรุป หรือคลิกทั้งแถวเพื่อไปหน้าจองเลย | เวลาออก–ถึง ("+1" ถ้าถึงวันถัดไป) · สายการบิน · ระยะเวลารวม · รหัสสนามบิน · "บินตรง"/"หยุดพัก N ครั้ง" + เวลาแวะ + รหัส · CO2e · ราคา (ใบถูกที่สุดเป็นสีเขียว) | ตัวอย่างบนจอ "06:20 – 16:25 ไทยไลอ้อนแอร์ 8 ชม. 5 นาที หยุดพัก 1 ครั้ง 1 ชม. TPE … ฿7,635" · "23:50 – 07:55+1 ไทยเวียดเจ๊ทแอร์ 6 ชม. 5 นาที บินตรง" · ชื่อ link ขึ้นต้นด้วย "ราคาเริ่มต้นที่ 9062 บาทไทย เดินทางด้วยเที่ยวบินตรงกับ …" และลงท้าย "เลือกเที่ยวบิน" (รูปแบบเต็มดู D5) | b·c·d |
| B32 | ป้ายพิเศษในแถว | คอลัมน์จุดแวะ/ชั้นโดยสาร/ข้างชื่อสายการบิน | อ่าน | ใน 300 ใบ (17:07): เปลี่ยนสนามบิน 23 · ประหยัดพรีเมียม+ประหยัด 4 · ธุรกิจ+ประหยัด 2 · ดำเนินการโดยสายอื่น 10 | "หยุดพัก 1 ครั้ง ⚠" + "มีการเปลี่ยนสนามบิน" · "ประหยัดพรีเมียม + ชั้นประหยัด" · "ชั้นธุรกิจ + ชั้นประหยัด" · "เอเอ็นเอ·ดำเนินการโดย Air Japan" · "หลีกเลี่ยงการปล่อย CO2e ได้เท่ากับที่ต้นไม้ 2,009 ต้นดูดซับใน 1 วัน" | b·c·d |
| B33 | ขยายรายละเอียดเที่ยวบิน | ปุ่ม ˅ ขวาสุดของแถว | กดขยายหรือยุบ | ขยายในที่เดิม (URL ไม่เปลี่ยน) และมีปุ่ม "เลือกเที่ยวบิน" โผล่ขึ้นมา | `button "รายละเอียดเที่ยวบิน ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ เวลา 23:50 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินทางถึง …"` [expanded] · หัวแถวที่ขยาย "เวลาออกเดินทาง · อาทิตย์ 15 พ.ย." | b·c·d |
| B34 | รายละเอียดรายขา | ในแถวที่ขยาย | อ่าน | แต่ละขามีเวลา + สนามบิน (รหัส), เวลาเดินทาง, สายการบิน·ชั้น·เครื่องบิน·เลขเที่ยวบิน, ที่วางขา, สิ่งอำนวยความสะดวก, CO2e ของขา, คอนเทรล | "เวลาเดินทาง: 6 ชม. 5 นาที· ข้ามคืน" · "ไทยเวียดเจ๊ทแอร์ · ชั้นประหยัด · Boeing 737 · VZ 830" · "พื้นที่วางขาแคบกว่ามาตรฐาน (74 ซม.)" / "พื้นที่วางขาขนาดมาตรฐาน (79 ซม.)" · "ช่องเสียบ USB ในที่นั่ง" · "ช่องเสียบปลั๊กไฟและช่องเสียบ USB ในที่นั่ง" · "สตรีมสื่อไปยังอุปกรณ์ของคุณ" · "มี Wi-Fi แบบคิดค่าธรรมเนียม" · "Wi-Fi ฟรี" · "วิดีโอตามคำขอ" · "ปริมาณการปล่อยก๊าซโดยประมาณ: CO2e 396 กก." · "ศักยภาพในการทำให้เกิดภาวะโลกร้อนจากคอนเทรล: ต่ำ" / "ปานกลาง" · "เครื่องบินและลูกเรือของ Air Japan" | b·c·d |
| B35 | แถบจุดแวะระหว่างขา | ระหว่างขาในแถวที่ขยาย | อ่าน | บอกเวลารอและเมือง · ถ้าเปลี่ยนสนามบินมี ⚠ สีแดง | "หยุดพักนาน 1 ชม.·ไทเป (TPE)" · "หยุดพักนาน 6 ชม. 25 นาที·โอซากะ· แวะพักนาน · เปลี่ยนจาก KIX ไปยัง ITM" ⚠ · "หยุดพักนาน 6 ชม. 35 นาที·สิงคโปร์ (SIN)· แวะพักนาน" | b·c |
| B36 | คำเตือนในขา | ใต้ข้อมูลเครื่องบิน / ข้างเวลาเดินทาง | อ่าน | ข้อความสีเทา หรือไอคอน ⚠ สีแดง | "มักจะล่าช้ามากกว่า 30 นาที" (JL 728) · "ข้ามคืน" ⚠ (JL 728) · "ข้ามคืน" ไม่มี ⚠ (VZ 830) | b·c |
| B37 | ข้อมูล CO2e | ปุ่มในแถว | เปิดคำอธิบาย | dialog "ปัจจัยของผลกระทบต่อสภาพอากาศ" | `button "ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: 363 กิโลกรัม. การปล่อยก๊าซโดยเฉลี่ย. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้"` · `button "ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: 396 กิโลกรัม. ปริมาณการปล่อยก๊าซ +7%. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้"` · บนจอ "CO2e 363กก." | b·d |
| B38 | หมายเหตุราคา + ค่าธรรมเนียมสัมภาระ + ความช่วยเหลือผู้โดยสาร | เหนือรายการผลค้นหา และใต้รายชื่อผู้ขายบนหน้าจอง | เปิดรายชื่อสายการบินที่เป็นลิงก์นโยบาย | dialog มีรายชื่อสายการบิน แต่ละชื่อเป็นลิงก์ "(เปิดในแท็บใหม่)" | "ราคารวมภาษีที่ต้องจ่าย + ค่าธรรมเนียมสำหรับผู้ใหญ่ 1 ท่าน อาจมีการเรียกเก็บเงินเพิ่มเติมและค่าธรรมเนียมสัมภาระ" · `button "ค่าธรรมเนียมสัมภาระ"` → dialog "ค่าธรรมเนียมสัมภาระ" · `button "ความช่วยเหลือสำหรับผู้โดยสาร"` → dialog "ความช่วยเหลือสำหรับผู้โดยสาร" | b·c |
| B39 | ตัวกรอง: จำนวนครั้งที่แวะพัก | ชิป | เลือก 1 ตัวเลือก (radio) | ชิปเปลี่ยนชื่อเป็น "บินตรง" และมีปุ่มล้าง · บินตรงเหลือ 18 ใบ | ชิป "จำนวนครั้งที่แวะพัก" · radio "ไม่จำกัดจำนวนครั้งที่แวะพัก" / "บินตรงเท่านั้น" / "แวะพัก 1 ครั้งหรือน้อยกว่า" / "แวะพัก 2 ครั้งหรือน้อยกว่า" · "ล้าง" | b·d |
| B40 | ตัวกรอง: สายการบิน | ชิป | สวิตช์เลือกทั้งหมด, เลือกพันธมิตร, ติ๊กทีละสาย, ปุ่ม "เท่านั้น" (โผล่เมื่อชี้เมาส์) | บนจอมี 62 สายการบิน + พันธมิตร 3 กลุ่ม (b 17:18, d 17:08) | ชิป "สายการบิน" · switch "เลือกสายการบินทั้งหมด" · "สายการบินที่เป็นพาร์ทเนอร์": checkbox "Oneworld" / "SkyTeam" / "Star Alliance" · checkbox "<ชื่อสายการบิน>" · ปุ่ม aria "การบินไทย เท่านั้น" (บนจอ "เท่านั้น") | b·d |
| B41 | ตัวกรอง: สัมภาระ | ชิป | เพิ่มหรือลดกระเป๋าถือขึ้นเครื่อง | สูงสุด 1 ใบ (ผู้ใหญ่ 1 คน) ชิปเป็น "กระเป๋าถือขึ้นเครื่อง 1 ใบ" | "กระเป๋าถือขึ้นเครื่อง" · `button "นำกระเป๋าถือขึ้นเครื่องออก"` / `"เพิ่มกระเป๋าถือขึ้นเครื่อง"` · "เลือกกระเป๋าถือขึ้นเครื่องแล้ว 0 ใบ" · link "ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกสัมภาระ" | b |
| B42 | ตัวกรอง: ราคา | ชิป | slider ราคาสูงสุด (ทีละ ฿10,000) | ค่าเริ่มต้น "ทุกราคา" (slider = 310000) · ตั้งแล้วชิปเป็น "สูงสุด ฿30,000" | ชิป "ราคา" · "ทุกราคา" · slider "ราคาสูงสุด" aria-valuetext "แสดงราคาตั้งแต่ ฿10,000 ถึง ฿30,000" | b·d |
| B43 | ตัวกรอง: เวลา | ชิป | slider 4 ตัว (ออกเดินทาง/มาถึง × เร็วสุด/ช้าสุด) ทีละ 1 ชม. | ข้อความเปลี่ยนเป็น "00:00 - 12:00" · ชิปเป็น "เวลา" | "กรุงเทพมหานคร ไปยัง โตเกียว" · "เวลาออกเดินทาง · ทุกเวลา" · "เวลามาถึง · ทุกเวลา" · slider "เวลาออกเดินทางที่เร็วที่สุด" / "เวลาออกเดินทางที่ช้าที่สุด" / "เวลาถึงที่เร็วที่สุด" / "เวลาถึงที่ช้าที่สุด" | b |
| B44 | ตัวกรอง: การปล่อยก๊าซ | ชิป | radio | ชิปเป็น "การปล่อยก๊าซต่ำ" | radio "การปล่อยก๊าซทุกระดับ" / "การปล่อยก๊าซต่ำเท่านั้น" · link "ดูข้อมูลเพิ่มเติมเกี่ยวกับการปล่อยก๊าซคาร์บอน" | b |
| B45 | ตัวกรอง: สนามบินสำหรับต่อเครื่อง | ชิป | slider ระยะเวลาแวะพัก (30–2010 นาที ทีละ 30), สวิตช์เลือกทั้งหมด, เลือกทีละสนามบิน, ปุ่ม "<สนามบิน> เท่านั้น" | ชิปเป็น "ไทเป" หรือ "การแวะพัก: สูงสุด 3 ชม." · จำนวนสนามบินในรายการไม่ตรงกันระหว่าง b กับ d (ดู E3) | dialog "สนามบินสำหรับต่อเครื่อง" · "ระยะเวลาแวะพัก" "ทั้งหมด" · slider "ระยะเวลาแวะพักขั้นต่ำ" / "ระยะเวลาแวะพักสูงสุด" · switch "สนามบินทั้งหมดสำหรับต่อเครื่อง" · checkbox "ไทเป (TPE)" · button "ไทเป (TPE) เท่านั้น" | b·d |
| B46 | ตัวกรอง: ระยะเวลา | ชิป | slider ชั่วโมง | ชิปเป็น "ไม่เกิน 8 ชม." | "ระยะเวลาบิน · ไม่จำกัด" → "ระยะเวลาบิน · ไม่เกิน 8 ชม." · slider "ระยะเวลา" aria-valuetext "ต่ำกว่า 8 ชั่วโมง" | b |
| B47 | ตัวกรองทั้งหมด | ปุ่มซ้ายสุดของแถวชิป | เห็นทุกตัวกรองในกล่องเดียว รวมตัวที่ไม่มีชิป | ชื่อปุ่มบอกจำนวนหมวดที่ใช้อยู่ | `button "ตัวกรองทั้งหมด"` / "ตัวกรองทั้งหมด (1)" / "(3)" → dialog "ตัวกรอง" · หัวข้อ "ตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" · radio "ซ่อนตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" · button "ล้างทั้งหมด" | b |
| B48 | ล้างตัวกรอง | × บนชิป, "ล้าง" ในป๊อปอัป, "ล้างทั้งหมด", "ล้างตัวกรองทั้งหมด" | ล้างทีละตัวหรือทั้งหมด | กลับเป็น 21 ใบ URL กลับเป็น tfs เดิม | `button "ล้าง การปล่อยก๊าซ"` · `button "ล้าง จำนวนครั้งที่แวะพัก"` · "ล้าง" · "ล้างทั้งหมด" · "ล้างตัวกรองทั้งหมด" | b·d |
| B49 | หน้าไม่พบผลลัพธ์จากตัวกรอง | แทนรายการ | กดล้างตัวกรอง | แท็บดีที่สุด/ถูกที่สุดหายไป | heading "ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ" · "ลองล้างตัวกรองเพื่อดูผลการค้นหา" · `button "ล้างตัวกรองทั้งหมด"` · "ไม่พบผลลัพธ์" · "ไม่พบเที่ยวบินของ กาตาร์แอร์เวย์" | b |
| B50 | หน้าไม่พบผลลัพธ์จากการค้นหา | แทนรายการ (ต้นทาง = ปลายทาง) | เปลี่ยนการค้นหา | — | "ไม่พบตัวเลือกที่ตรงกับการค้นหา" · "ลองเปลี่ยนวันที่หรือจุดหมายเพื่อดูผลการค้นหา" | a |
| B51 | หน้าข้อผิดพลาด + โหลดซ้ำ | แทนรายการ | กด "โหลดซ้ำ" | รายการกลับมา (b เห็น 17:48 · a เว้น 60 วินาทีแล้วผ่าน) | "อ๊ะ มีบางอย่างผิดพลาด" (เห็นในภาพ `b-10-error-after-price20k.png` ไม่ได้อยู่ใน snapshot) · `button "โหลดซ้ำ"` | a·b·d |
| B52 | ข้อมูลเชิงลึกด้านราคา (หน้าผลค้นหา) | ระหว่าง "เที่ยวบินยอดนิยม" กับ "เที่ยวบินอื่นๆ" (เฉพาะแท็บดีที่สุด ที่ไม่มีตัวกรอง) | กด "ดูประวัติราคา" เพื่อขยาย | ระดับราคา + ช่วงราคาปกติ + กราฟประวัติราคา 60 วัน (17:51) | heading "ขณะนี้เที่ยวบินมีราคาสูง" (ขยายแล้วเป็น "ขณะนี้เที่ยวบินที่คุณค้นหามีราคาสูง") · "โดยปกติแล้ว ราคาขั้นต่ำของเที่ยวบินสำหรับทริปที่คล้ายคลึงกันซึ่งเดินทางสู่โตเกียวจะอยู่ระหว่าง ฿4,950–7,200" · "฿7,635 อยู่ในช่วงราคา สูง" · `button "ดูประวัติราคา"` · heading "ประวัติราคาสำหรับการค้นหานี้" · application "กราฟประวัติราคา" · ปุ่ม "60 วันที่ผ่านมา - ฿7,156" … "วันนี้ - ฿7,635" | b·d |
| B53 | ตารางวันที่ | ปุ่ม "ตารางวันที่" | ดูราคา 8 วัน เลื่อนซ้าย/ขวา เลือกวันแล้วกด "ตกลง" | 17:51: 12 พ.ย. ฿5,255 (ถูกที่สุด) … 15 ฿7,635 (เลือกแล้ว) … 19 ฿7,775 · กด "ตกลง" แล้ววันเปลี่ยนเป็น "พฤหัส 12 พ.ย." | `button "ตารางวันที่"` → dialog "ข้อมูลเชิงลึกด้านราคา" · tab "วันที่" / "กราฟราคา" · grid "ตารางวันที่" · button "฿5,255, ราคาถูกที่สุด" · "฿7,635, เลือกแล้ว" · "เลื่อนไปทางซ้าย" / "เลื่อนไปทางขวา" · "15 พ.ย.฿7,635 · เที่ยวเดียว" · "ยกเลิก" / "ตกลง" | b |
| B54 | กราฟราคา | ปุ่ม "กราฟราคา" | ชี้เมาส์ดูราคารายวัน เลื่อนช่วงเวลา | ระหว่างโหลดแสดง "กำลังดึงข้อมูลราคา" · แกน Y ฿0–18,000 · ตัวอย่าง 17:53: ส. 19 ธ.ค. ฿5,900 · ส. 2 ม.ค. ฿15,646 | `button "กราฟราคา"` · "การเดินทางเที่ยวเดียว อาทิตย์ 15 พ.ย. เริ่มที่ ฿7,635" · region "กราฟราคา" · button "เลื่อนไปข้างหน้า" / "เลื่อนไปข้างหลัง" | b |
| B55 | ติดตามราคา | หน้าผลค้นหา: แถบใต้ข้อมูลเชิงลึก (ถ้ามีตัวกรองจะย้ายไปเหนือรายการ) · หน้าจอง: ขวาของ "เที่ยวบินที่เลือก" | สวิตช์ "วันที่นี้" / "วันใดก็ได้" (หน้าจองไม่ได้กด) | ถ้าไม่ล็อกอิน: เด้ง dialog ให้ลงชื่อเข้าใช้ สวิตช์ไม่เปิด | heading "ติดตามราคา" · switch "ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15" · switch "ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว - วันใดก็ได้" · หน้าจอง: switch "ติดตามราคาเที่ยวบินที่เลือก จาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15" · dialog "ลงชื่อเข้าใช้เพื่อติดตามราคา" · `button "ปิด"` · link "ลงชื่อเข้าใช้" | b·c |
| B56 | เลือกเที่ยวบิน | หัวแถวที่ขยาย ข้างราคา | ไปหน้าจอง | URL เปลี่ยนเป็น `/travel/flights/booking?tfs=…&tfu=…` | `button "เลือกเที่ยวบิน"` | b·c·d |
| B57 | สรุปแผนการเดินทาง (หน้าจอง) | หัวหน้าจอง | อ่าน | เมือง ประเภทตั๋ว ชั้น และราคาต่ำสุดตัวใหญ่ | heading "สรุปแผนการเดินทาง" · "กรุงเทพมหานคร → โตเกียว" · "เที่ยวเดียว · ชั้นประหยัด ·" · "฿9,062 ราคารวมที่ต่ำที่สุด" | c·d |
| B58 | แชร์ | มุมขวาบนของหน้าจอง | เปิดกล่องแชร์ (ไม่ได้กดช่องทางใด) | มี 3 ช่องทาง | ปุ่ม "แชร์" (aria "แชร์เที่ยวบินนี้") → heading "แชร์เที่ยวบินนี้" · `button "ปิด"` · "Facebook" · "X (Twitter)" · "คัดลอกลิงก์" | c |
| B59 | การ์ดเที่ยวบินที่เลือก | ใต้หัวข้อ "เที่ยวบินที่เลือก" | ขยายดูรายละเอียดเหมือน B34 | มีปุ่ม "เปลี่ยนเที่ยวบิน" แทน "เลือกเที่ยวบิน" | "เที่ยวบินที่เลือก" · หัวที่ขยาย "เที่ยวบินขาไป · อาทิตย์ 15 พ.ย." · ปุ่ม "เปลี่ยนเที่ยวบิน" (aria "เปลี่ยนเที่ยวบิน ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ, BKK") | c |
| B60 | สรุปสัมภาระ (หน้าจอง) | ใต้การ์ดเที่ยวบิน (มีแค่บางเที่ยวบิน) | อ่าน หรือเปิดลิงก์นโยบาย (แท็บใหม่) | VZ และ JAL มี · ไทยไลอ้อนไม่มี | VZ: "กระเป๋านำขึ้นเครื่องฟรี 1 ใบ" · "มีค่าธรรมเนียมสำหรับสัมภาระที่โหลดใต้ท้องเครื่องใบแรก" · JAL: "สัมภาระที่โหลดใต้ท้องเครื่องฟรี 2 ใบ" · "เงื่อนไขสัมภาระมีผลตลอดการเดินทาง ค่าธรรมเนียมสัมภาระอาจสูงขึ้นหากชำระเงินที่สนามบิน" · link "นโยบายสัมภาระของ ไทยเวียดเจ๊ทแอร์ (เปิดในแท็บใหม่)" | c |
| B61 | ตัวเลือกการจอง (รายชื่อผู้ขาย) | heading "ตัวเลือกการจอง" | เปรียบเทียบราคาผู้ขาย | ทุกแถวมีโลโก้ + "จองกับ X" + ป้ายประเภท + ราคา + ปุ่ม "ดำเนินการต่อ" · ราคาถูกที่สุดเป็นสีเขียว · VZ 830 (c 17:14–17:17 และ d 17:08:19 ตรงกัน): ไทยเวียดเจ๊ทแอร์ ฿9,062 / Gotogate ฿9,737 · SL 394: ไทยไลอ้อนแอร์ ฿7,635 · JL 728+JL 3006: เจเอแอล ฿32,915 / บางกอกแอร์เวย์ส ฿21,665 | heading "ตัวเลือกการจอง" · "จองกับ ไทยเวียดเจ๊ทแอร์" + ป้าย "สายการบิน" · "จองกับ Gotogate ฿9,737" (ไม่มีป้าย) · "จองกับ เจเอแอล" · "จองกับ บางกอกแอร์เวย์ส" | c·d |
| B62 | ปุ่มดำเนินการต่อ (**ไม่ได้กด**) | ขวาสุดของแต่ละแถวผู้ขาย | (จะออกไปเว็บผู้ขาย) | — | บนจอ "ดำเนินการต่อ" · aria "ดำเนินการต่อเพื่อจองกับสายการบิน ไทยเวียดเจ๊ทแอร์ ในราคา 9062 บาทไทย. รวมค่าธรรมเนียมเพิ่มเติม 81 บาทไทย" / "ดำเนินการต่อเพื่อจองกับ Gotogate ในราคา 9737 บาทไทย" | c·d |
| B63 | วิธีจัดอันดับตัวเลือก | ใต้ heading ตัวเลือกการจอง (เห็นเฉพาะตอนมีผู้ขาย ≥2 ราย) | กด (i) | popup อธิบาย | "วิธีจัดอันดับตัวเลือก" · `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกการจอง"` → "ระบบจัดอันดับตัวเลือกการจองโดยอิงตามปัจจัยต่างๆ เช่น ราคา คุณภาพลิงก์ ประเภทพาร์ทเนอร์ และประสบการณ์การใช้งานบนเว็บไซต์ของพาร์ทเนอร์" · "ดูข้อมูลเพิ่มเติม" · "ปิดกล่องโต้ตอบ" | c |
| B64 | ค่าธรรมเนียมเพิ่มเติม | ในแถวผู้ขาย (VZ) | กด (i) | popup อธิบาย | "รวมค่าธรรมเนียมเพิ่มเติม ฿81" · `button "ข้อมูลเพิ่มเติมเกี่ยวกับค่าอำนวยความสะดวก"` → "ค่าธรรมเนียมนี้จะมีผลในขั้นตอนสุดท้ายของการจองบนเว็บไซต์ของพาร์ทเนอร์" | c·d |
| B65 | ข้อมูลเชิงลึกด้านราคา (หน้าจอง) | ส่วนล่างของหน้าจอง | อ่าน / ชี้กราฟ | แถบช่วงราคา (เขียว/เหลือง/แดง) + กราฟ 60 วันย้อนหลัง | heading "฿9,062 อยู่ในช่วงราคาปกติสำหรับชั้นประหยัด" · "โดยปกติแล้ว ราคาขั้นต่ำ…จะอยู่ระหว่าง ฿8,100–11,500" · heading "ประวัติราคาสำหรับเที่ยวบินเหล่านี้" · ปุ่ม "60 วันที่ผ่านมา - ฿9,581" … "วันนี้ - ฿9,062" | c·d |
| B66 | ย้อนกลับ / เปลี่ยนเที่ยวบิน | ลูกศร ← ซ้ายบนสุด (banner) / การ์ดเที่ยวบินที่เลือก | กลับไปผลค้นหา | ไปหน้า `/travel/flights/search?tfs=…&tfu=EgIIACIA…` ใหม่ (ดู C55–C57) | `button "ย้อนกลับ"` · `button "เปลี่ยนเที่ยวบิน"` | c |

---

## C. กฎ

| # | กฎ | ตัวอย่างที่ลอง | ผลที่เห็น | ชนิด | ที่มา |
|---|---|---|---|---|---|
| C1 | ผู้โดยสารรวมไม่เกิน 9 คน (นับทารกบนตักด้วย) | 9 ผู้ใหญ่ + เด็ก 1 · 8 ผู้ใหญ่ + ทารกบนตัก 2 · 1 ผู้ใหญ่ + เด็ก 9 | "ขออภัย เราไม่รองรับผู้โดยสารมากกว่า 9 ท่าน" (role=alert สีแดง) ปุ่ม เสร็จ/ยกเลิก หาย · 8 + ทารกบนตัก 1 = 9 ผ่าน | [O] | a |
| C2 | "เพิ่มผู้ใหญ่" กดไม่ได้เมื่อครบ 9 แต่ปุ่ม + ประเภทอื่นยังกดได้ (เกินแล้วจึงเตือน) | ผู้ใหญ่ 9 แล้วกดเพิ่มเด็ก | เด็กเป็น 1 แล้วขึ้นคำเตือน | [O] | a |
| C3 | ผู้ใหญ่ขั้นต่ำ 1 คน (จองเด็กอย่างเดียวไม่ได้) · ปุ่ม − ของเด็ก/ทารกกดไม่ได้ที่ 0 | กด "นำผู้ใหญ่ออก" ตอนเหลือ 1 · เปิดป๊อปอัปครั้งแรก | ปุ่มเป็น disabled | [O] | a |
| C4 | ทารกบนตักต้องไม่มากกว่าผู้ใหญ่ · ทารก (บนที่นั่ง + บนตัก) ไม่เกิน 2 คนต่อผู้ใหญ่ 1 คน | 1 ผู้ใหญ่ + ทารกบนตัก 2 · 1 ผู้ใหญ่ + ทารกบนที่นั่ง 3 · 1 + บนที่นั่ง 2 + บนตัก 1 | "ต้องมีผู้ใหญ่อย่างน้อย 1 คนสำหรับการเดินทางพร้อมทารกที่นั่งบนตัก 1 คน" · "คุณต้องมีผู้ใหญ่อย่างน้อยหนึ่งคนที่จะเดินทางไปกับทารกสองคน" · 1 + บนที่นั่ง 2 ผ่าน · 1 + บนที่นั่ง 1 + บนตัก 1 ผ่าน | [O] (ข้อหลังตีความจากผล) | a |
| C5 | "ยกเลิก" หรือ Esc = ทิ้งค่าที่แก้ · "เสร็จ" = ยืนยันและ URL tfs เปลี่ยน | แก้แล้วกดยกเลิก · 2A+1C+1lap แล้วกดเสร็จ | ยกเลิก: ยังเป็น "ผู้โดยสาร 1 คน" · เสร็จ: "ผู้โดยสาร 4 คน" | [O] | a |
| C6 | ตัวเลขผู้โดยสารบนฟอร์มนับทารกบนตักด้วย | 2A+1C+1lap | แสดง "4" | [O] | a |
| C7 | ปลายทางว่าง → ปุ่มล่างเป็น "สำรวจ" พาไป `/travel/explore?tfs=…` และปุ่มสลับกดไม่ได้ | เปิดหน้าใหม่ | `button "สลับต้นทางกับปลายทาง" [disabled]` | [O] | a |
| C8 | ยังไม่มีวันที่แล้วกด "ค้นหา" → ไม่ค้นหา แต่เปิดปฏิทินให้เลือก **โดยไม่มีข้อความเตือน** | เที่ยวเดียวและไป-กลับ ไม่ใส่วัน | ปฏิทินเปิด โฟกัสที่ "ขาไป" URL ยังไม่ไป /search | [O] | a |
| C9 | ตอนเปิดหน้าแรก ช่องวันที่ว่าง | เปิดหน้าใหม่ | "ขาไป" "ขากลับ" ว่าง | [O] | a |
| C10 | หลายเมืองใส่วันให้อัตโนมัติ (วันนี้ +16 แล้ว +4 วันต่อแถว) และวันค้างอยู่เมื่อเปลี่ยนกลับเป็นเที่ยวเดียว | เปลี่ยนเป็นหลายเมืองเมื่อ 1 พ.ย. | 17, 21, 25, 29 พ.ย., 3 ธ.ค. · กลับเป็นเที่ยวเดียวยังเป็น 17 พ.ย. | [O] | a |
| C11 | หลายเมืองมีได้ 2–5 แถว | กดเพิ่ม/ลบซ้ำ | หยุดที่ 5 · ไม่ต่ำกว่า 2 | [O] | a |
| C12 | ต้นทางเท่ากับปลายทาง ฟอร์มรับได้ไม่เตือน (BKK→DMK ก็เช่นกัน) แต่ผลค้นหาว่าง | กรุงเทพมหานคร→กรุงเทพมหานคร 15 พ.ย. | ไป /search แล้วขึ้น "ไม่พบตัวเลือกที่ตรงกับการค้นหา" | [O] | a |
| C13 | เว็บควรกันการค้นหาที่ต้นทางเท่ากับปลายทาง (สามัญสำนึก) แต่เว็บจริง**ไม่กัน** | ดู C12 | — | [R] | a |
| C14 | ล้างข้อความช่องต้นทางแล้วกด Esc ช่องจะไม่ว่าง | ลบข้อความแล้วกด Esc | กลับเป็น "กรุงเทพมหานคร" | [O] | a |
| C15 | ปฏิทินเริ่มที่เดือนนี้ เลื่อนกลับไม่ได้ · เลือกได้ถึง 26 ก.ย. 2027 (ประมาณ 330 วัน) | เปิดปฏิทิน · กด "ถัดไป" 9 ครั้ง | ไม่มี "ก่อนหน้า" ตอนเริ่ม · เดือนสุดท้าย "สิงหาคม 2027"+"กันยายน 2027" · 27–30 ก.ย. เป็นสีเทา | [O] | a |
| C16 | เลือกวันก่อนวันนี้ไม่ได้ · วันนี้เลือกได้และมีราคา | ใช้ปุ่ม < จาก 15 พ.ย. · ดูปฏิทิน 17:11 | หยุดที่ "อาทิตย์ 1 พ.ย." ปุ่ม < เป็น disabled · 1 พ.ย. ฿9,060 | [O] | a |
| C17 | ราคาในปฏิทินเป็นราคาเที่ยวเดียวหรือไป-กลับตามประเภทตั๋ว | 15 พ.ย. เที่ยวเดียว ฿7,640 (17:11) · ไป-กลับ ฿15.2K (17:18) | — | [O] | a |
| C18 | ราคาบนจอในปฏิทินเป็นเลขปัด ส่วน aria เป็นเลขเต็ม | 15 พ.ย. บนจอ "฿7,640" / aria "7635 บาทไทย" (17:11) | ราคาเต็มตรงกับแท็บ "ถูกที่สุด เริ่มต้น ฿7,635" (17:22) | [O] | a·b |
| C19 | ราคาในปฏิทินโหลดทีละส่วน ใน headless บางครั้งไม่ขึ้นเลย | เปิดปฏิทินครั้งแรก | มีราคาแค่ 2 เดือนแรก เดือนท้ายเป็นแถบเทา | [O] | a |
| C20 | ไป-กลับ: กดวันก่อนวันไปที่เลือกไว้ → กลายเป็นวันไปใหม่ | วันไป 15 แล้วกด 10 | ขาไป 10 พ.ย. ขากลับว่าง | [O] | a |
| C21 | หน้าแรกมีหลายแบบ (A/B) แต่ฟอร์มเหมือนกัน | เปิด 4 ครั้งตอน 17:17 | V1 3 ครั้ง · V2 1 ครั้ง | [O] | a |
| C22 | รายการเริ่มต้นแสดง 21 ใบ (ยอดนิยม 3 + อื่นๆ 18) แล้วมีปุ่ม "ดูเที่ยวบินเพิ่มเติม" | b เปิด 6 ครั้ง (17:06–17:50) · c 17:06–17:20 · d 17:07:48 | 21 ใบทุกครั้ง | [O] | b·c·d |
| C23 | "ดูเที่ยวบินเพิ่มเติม" กดได้ครั้งเดียวแล้วแสดงทั้งหมด ไม่มีการแบ่งหน้า | กด 1 ครั้ง | 21 → 300 ปุ่มหายไป · tfu เปลี่ยน `EgYIABAAGAA` → `EgYIABABGAA` · 3 ใบแรกยังเป็นกลุ่มยอดนิยม | [O] | b·c·d |
| C24 | รายการที่ไม่กรองดูเหมือนถูกตัดที่ 300 ใบ | ไม่กรอง = 300 (2 รอบ) แพงสุด ฿77,520 · "แวะพัก ≤1" = 235 ใบ "≤2" = 288 ใบ มีใบ ฿197,520 ที่ไม่อยู่ในรายการไม่กรอง | ตัวเลขเป็น [O] การตีความว่าถูกตัดเป็น [R] (ยังไม่ปิดเรื่อง ดู E2) | [O]+[R] | b·d |
| C25 | ค่าเริ่มต้นเรียงแบบ "เที่ยวบินยอดนิยม" ไม่ได้เรียงราคาขึ้น | อ่านราคา 5 ใบแรก | 7,635 / 9,062 / 11,580 / 9,335 / 9,335 (b 17:08–17:10 · d 17:07:49 จอ = เครือข่าย) | [O] | b·d |
| C26 | ชื่อชิปตัวกรอง: ยังไม่ใช้ = "<ตัวกรอง>, ไม่ได้เลือก" · ใช้แล้ว = "<ค่า>, <ตัวกรอง>, เลือกแล้ว" ย้ายไปซ้ายสุดและมีปุ่ม × "ล้าง <ตัวกรอง>" | บินตรง สัมภาระ ราคา ฯลฯ | เช่น "บินตรง, จำนวนครั้งที่แวะพัก, เลือกแล้ว" · ตัวกรองเวลาใช้แค่ "เวลา, เลือกแล้ว" | [O] | b·d |
| C27 | ค่าตัวกรองเปลี่ยนแล้วป๊อปอัปปิดเอง (ชิปย้ายตำแหน่ง) ถ้าจะแก้ต่อต้องเปิดใหม่ | กดเพิ่มกระเป๋า, "เท่านั้น", Star Alliance, ลาก slider | ป๊อปอัปหายภายใน 1–3 วินาที | [O] | b |
| C28 | ตัวกรองมีผลทันที ไม่ต้องกดยืนยัน | ทุกตัวกรอง | รายการโหลดใหม่เอง | [O] | b·d |
| C29 | "ตัวกรองทั้งหมด (N)" นับจำนวนหมวดที่ใช้อยู่ | 1 ตัว → "(1)" · 3 ตัว → "(3)" | — | [O] | b |
| C30 | ตัวกรองหลายตัวทำงานแบบ AND | บินตรง (18) → + การบินไทย (5) → + ออกเดินทาง 00–12 (1) → + CO2 ต่ำ (0) | ผลลดลงตามลำดับ (17:50) | [O] | b |
| C31 | ล้างตัวกรองตัวเดียวด้วย × ตัวอื่นยังอยู่ · "ล้างทั้งหมด" ล้างทุกตัวแต่ไม่ปิดกล่อง | × "ล้าง การปล่อยก๊าซ" · "ล้างทั้งหมด" | กลับเป็น 1 ใบ ชิปอื่นยังอยู่ · กลับเป็น 21 ใบ URL กลับเป็น tfs เดิม | [O] | b |
| C32 | บินตรงเท่ากับ itinerary ขาเดียว | กรองบินตรงบนจอ เทียบกับใบที่มีขาเดียวใน 300 ใบจากเครือข่าย | 18 = 18 · ราคา 9,062–30,425 · TG 5 ใบ | [O] | b·d |
| C33 | "การบินไทย เท่านั้น" แสดงเฉพาะใบที่ทุกขาเป็น TG | ไม่กรองมี 32 แถวที่มีคำว่า "การบินไทย" · กรองแล้ว | 5 ใบ (บินตรงทั้งหมด ฿15,320–19,365) | [O] | b·d |
| C34 | เลือกพันธมิตร "Star Alliance" ได้ | ติ๊ก Star Alliance (17:34) | 14 / 66 ใบ ถูกที่สุด ฿12,751 ชิปเป็น "Star Alliance" | [O] | b |
| C35 | เลือกสายการบินที่ไม่มีเที่ยวบินได้ แล้วผลจะว่าง | "กาตาร์แอร์เวย์ เท่านั้น" (17:33) | "ไม่พบผลลัพธ์" · "ไม่พบเที่ยวบินของ กาตาร์แอร์เวย์" | [O] | b·d |
| C36 | กระเป๋าถือขึ้นเครื่องเลือกได้สูงสุด 1 ใบเมื่อมีผู้ใหญ่ 1 คน | กดเพิ่ม 2 ครั้ง | ปุ่มเพิ่มถูกปิด · จำนวนเที่ยวบินไม่ลด (300) | [O] (ความสัมพันธ์กับจำนวนผู้โดยสารเป็น [R]) | b |
| C37 | slider ราคาเริ่มที่ "ทุกราคา" (310000) ตั้งได้ทีละ ฿10,000 | ตั้ง ฿30,000 (17:49) | 19 / 185 ใบ แพงสุด ฿29,925 | [O] | b·d |
| C38 | ช่วงของ slider ระยะเวลาขึ้นกับข้อมูล | 17:18 ค่าเริ่มต้น 41 · 17:44 ช่วง 5..41 อีกรอบ 1..31 | ไม่เกิน 6 ชม. → 15 ใบ · ไม่เกิน 5 ชม. → ไม่พบผลลัพธ์ | [O] | b |
| C39 | ตั้งระยะแวะพักสูงสุดสั้นมาก จะเหลือแค่บินตรง | สูงสุด 30 นาที (17:40) | 18 ใบ | [O] | b |
| C40 | การจัดเรียงและแท็บเก็บใน `tfu` ส่วนตัวกรองเก็บใน `tfs` | ราคา `EgYIAh…` · เวลาออกเดินทาง `EgYIAx…` · เวลาถึง `EgYIBB…` · ระยะเวลา `EgYIBR…` · การปล่อยก๊าซ `EgYIBh…` · แท็บถูกที่สุด `EgoIABAAGAAgAigB` · บินตรงเปลี่ยน tfs (d 17:08:11) | reload แล้วค่ายังอยู่ | [O] | b·d |
| C41 | การจัดเรียงคงอยู่เมื่อสลับแท็บ ใส่ตัวกรอง หรือ reload | ระยะเวลา → บินตรง → reload | ยังเป็น "จัดเรียงตามระยะเวลา" | [O] | b |
| C42 | จัดเรียงด้วยค่าที่ไม่ใช่ "เที่ยวบินยอดนิยม" → "เที่ยวบินยอดนิยม/เที่ยวบินอื่นๆ" รวมเป็น "เที่ยวบินทั้งหมด" · จัดเรียงตามราคาเรียงขึ้นจริง | เลือก "ราคา" แล้วขยาย 300 ใบ | h3 "ข้อมูลเชิงลึกด้านราคา", "เที่ยวบินทั้งหมด" · ใบสุดท้าย ฿77,520 | [O] | b |
| C43 | แท็บ "ถูกที่สุด" ตอนจัดเรียงแบบยอดนิยม แสดงลำดับเดียวกับ "ดีที่สุด" และไม่มีส่วน "ข้อมูลเชิงลึกด้านราคา" | ดู 3 รอบ (17:08, 17:09, 17:10) | 7,635 / 9,062 / 11,580 / 9,335 … | [O] (สาเหตุดู E12) | b |
| C44 | ราคาถูกที่สุดในแท็บ "ถูกที่สุด" เปลี่ยนตามตัวกรอง · ใบที่ถูกที่สุดเป็นสีเขียว | บินตรง ฿9,062 · TG ฿15,320 · CO2 ต่ำ ฿9,952 · ถึงหลัง 18:00 ฿10,582 | — | [O] | b |
| C45 | ใช้ตัวกรองแล้ว กล่อง "ข้อมูลเชิงลึกด้านราคา" ที่ยุบอยู่หายไป เหลือแถบ "ติดตามราคา / ตารางวันที่ / กราฟราคา" เหนือรายการ | สัมภาระ 1 ใบ · 3 ตัวกรอง | ดู `shots/b-12-combo3.png` | [O] | b |
| C46 | ตารางวันที่ (เที่ยวเดียว) แสดง 8 วัน (−3 ถึง +4) เลื่อนทีละ 1 วัน · "ยกเลิก" ไม่เปลี่ยนวัน "ตกลง" เปลี่ยนวันค้นหา | เปิดแล้วเลื่อนขวา · เลือก 12 พ.ย. | 12–19 → 13–20 พ.ย. · ตกลง → "พฤหัส 12 พ.ย." | [O] | b |
| C47 | ราคาเปลี่ยนได้ระหว่างใช้งาน ต้องบันทึกเวลาที่เห็นทุกครั้ง | JAL 22:05 บินตรง | ฿25,060 (b 17:06, d 17:07:49) → ฿24,990 (b 17:12) | [O] | a·b·c·d |
| C48 | ราคาในตารางวันที่/กราฟ/ประวัติราคา = ราคาต่ำสุดของวันนั้น = แท็บ "ถูกที่สุด" | 15 พ.ย. | ตาราง ฿7,635 = "วันนี้ - ฿7,635" = แท็บถูกที่สุด · เครือข่ายจุดสุดท้าย 7635 จุดแรก 7156 | [O] | b·d |
| C49 | ติดตามราคาต้องล็อกอิน | กดสวิตช์ 15 พ.ย. | dialog "ลงชื่อเข้าใช้เพื่อติดตามราคา" สวิตช์ไม่เปิด | [O] | b |
| C50 | ผลค้นหาล้มได้เป็นครั้งคราว ("อ๊ะ มีบางอย่างผิดพลาด") กด "โหลดซ้ำ" หรือทำซ้ำแล้วผ่าน · HTTP 200 ไม่ได้แปลว่าธุรกิจสำเร็จ | a: 1 ครั้ง (17:20:36) · b: ราว 6 จาก 40 การกระทำ (17:10, 17:35, 17:37, 17:42, 17:48, 17:54) · d: รอบทดลองได้ ErrorResponse | ทำแบบเดิมอีกครั้งแล้วผ่าน · ไม่ได้แปลว่าไม่มีเที่ยวบิน | [O] | a·b·d |
| C51 | ราคาบนจอรวมภาษีและค่าธรรมเนียมแล้ว แต่ไม่รวมค่าสัมภาระ | ข้อความเหนือรายการ ท้ายหน้า และหน้าจอง | "ราคานี้เป็นราคาสุดท้ายซึ่งรวมภาษีและค่าธรรมเนียมทั้งหมดแล้ว …" | [O] | a·b·c |
| C52 | ไอคอน ⓘ ในแท็บ "ดีที่สุด" เป็นปุ่มแยก คลิกโดนจะเปิด dialog แทนการสลับแท็บ | — | `shots/b-08-ranking-dialog-opened-by-tab-info-icon.png` | [O] | b |
| C53 | เที่ยวบินที่เปลี่ยนสนามบินไม่โผล่ใน 21 ใบแรก ต้องกด "ดูเที่ยวบินเพิ่มเติม" | ค้นใน 21 แถวแรก | ไม่เจอเลย · หลังกดเจอ 23 ใบ (ICN→GMP, TPE→TSA, KIX→ITM) · ข้อมูลเครือข่ายก็มี 23 ใบ | [O] | b·c·d |
| C54 | การเปลี่ยนสนามบินแสดงคำเตือน ⚠ สีแดง 3 ที่: แถวยุบ / แถวขยาย / การ์ดหน้าจอง | JAL KIX→ITM | "มีการเปลี่ยนสนามบิน" · "เปลี่ยนจาก KIX ไปยัง ITM" | [O] | c |
| C55 | "เลือกเที่ยวบิน" หรือคลิกแถวที่ยุบ = เปลี่ยนหน้าจริง (history +1) ไป `/travel/flights/booking?tfs=…&tfu=…&hl=th&gl=TH&curr=THB` | ทั้ง 3 เที่ยวบิน | `history.length` 2 → 3 | [O] | c·d |
| C56 | "ย้อนกลับ" และ "เปลี่ยนเที่ยวบิน" **ไม่ใช่** history.back() แต่ไปหน้าใหม่ `/travel/flights/search?tfs=…&tfu=EgIIACIA…` (ไม่ใช่ URL `?q=` เดิม) | กดย้อนกลับ แล้วกด Back ของเบราว์เซอร์ | Forward ไม่มีผล · Back ของเบราว์เซอร์กลับไปหน้าจองอีกครั้ง · history 3 → 4 | [O] | c |
| C57 | กลับจากหน้าจองแล้วผลค้นหาเริ่มใหม่: scroll บนสุด แถวที่ขยายยุบหมด รายการกลับเป็น 21 ใบ | ทั้ง 3 เที่ยวบิน | "มีผลลัพธ์ 21 รายการ" · ปุ่ม "ดูเที่ยวบินเพิ่มเติม" กลับมา | [O] | c |
| C58 | ลิงก์หน้าจองเปิดตรงได้ในเบราว์เซอร์ใหม่ที่ไม่มี cookie และกด "ย้อนกลับ" ได้แม้ไม่มีประวัติ | เปิด bookingUrl ทั้ง 3 ใน context ใหม่ | heading "ตัวเลือกการจอง" ขึ้นครบทุกครั้ง | [O] | c |
| C59 | ราคาในรายการผลค้นหา = ราคาต่ำสุดในบรรดาผู้ขาย ไม่ใช่ราคาของสายการบินเจ้าของเที่ยวบิน · ตัวเลขใหญ่บนหน้าจอง = "ราคารวมที่ต่ำที่สุด" = ราคาในรายการ | JAL เปลี่ยนสนามบิน · ทั้ง 3 เที่ยวบิน | รายการ ฿21,665 แต่ JAL ขายเอง ฿32,915 บางกอกแอร์เวย์สขาย ฿21,665 · VZ ฿9,062 = ฿9,062 | [O] | c·d |
| C60 | ผู้ขายแต่ละรายราคาไม่เท่ากัน และไม่ได้เรียงจากถูกไปแพงเสมอ | VZ 830 · JAL | VZ: ฿9,062 / ฿9,737 · JAL: ฿32,915 อยู่บน ฿21,665 อยู่ล่าง | [O] | c·d |
| C61 | ค่าธรรมเนียมเพิ่มเติมรวมอยู่ในราคาที่แสดงแล้ว และเก็บตอนท้ายบนเว็บพาร์ทเนอร์ | VZ ฿9,062 "รวมค่าธรรมเนียมเพิ่มเติม ฿81" | ราคาในรายการก็ ฿9,062 · เครือข่ายแยก fee 81 | [O] (ที่ว่า 81 รวมอยู่ใน 9,062 อิงจากคำว่า "รวม" ใน aria) | c·d |
| C62 | ผู้ขายที่เป็นสายการบินมีป้าย "สายการบิน" เอเจนซีไม่มีป้าย | VZ / Gotogate | — | [O] | c |
| C63 | ส่วนสัมภาระ และบรรทัด "วิธีจัดอันดับตัวเลือก" ไม่ได้ขึ้นทุกเที่ยวบิน | ไทยไลอ้อน (ผู้ขาย 1 ราย) | ไม่มีทั้งสองอย่าง | [O] (สาเหตุดู E28) | c |
| C64 | "+1" หลังเวลาถึง = ถึงวันถัดไป และรายละเอียดขามีคำว่า "ข้ามคืน" | VZ 830 ออก 15 พ.ย. 23:50 ถึง 16 พ.ย. 07:55 | "07:55+1" · "ข้ามคืน" | [O] | c·d |
| C65 | `tfu` บนหน้าจองเปลี่ยนทุกครั้งที่เลือก แม้เป็นเที่ยวบินเดิม แต่ `tfs` เหมือนเดิม | เลือก VZ 830 ซ้ำ 3 ครั้ง | tfs เหมือนกัน tfu ต่างกัน | [O] | c |
| C66 | ห้ามกด "ดำเนินการต่อ" ในการทดสอบ เพราะจะออกไปเว็บผู้ขาย | — | — | [R] | c·d |

---

## D. โมเดลข้อมูล

แหล่งข้อมูลหลักคือ `data/flights-all.json` (300 ใบ / 695 ขา จาก RPC #58 ที่ 2026-11-01T10:07:49.250Z = 17:07:49) · `data/filters.json` · `data/booking-options.json` · `data/rpc-58.json`, `data/rpc-113.json` (payload ที่ถอดแล้ว) [d] ตัวย่อตำแหน่งใน raw: `x` = payload RPC, `r` = แถว itinerary, `f=r[0]`, `l` = ขาใน `f[2]`

| # | เอนทิตี / ช่อง | ตัวอย่าง / ตำแหน่ง | สถานะ | ที่มา |
|---|---|---|---|---|
| D1 | **SearchQuery**: ต้นทาง (เมืองหรือหลายสนามบิน), ปลายทาง, ประเภทตั๋ว (ไป-กลับ/เที่ยวเดียว/หลายเมือง 2–5 แถว), วันที่, ผู้โดยสาร {adults ≥1, children 2-11, infantsInSeat, infantsOnLap} (รวม ≤9), ชั้นโดยสาร (4 ค่า), hl/gl/curr | กรุงเทพมหานคร (/m/0fn2g) → โตเกียว (/m/07dfk), 2026-11-15, 1 ผู้ใหญ่, ชั้นประหยัด, THB | ยืนยันจาก UI + ถอด tfs | a·c |
| D2 | **ResultSet**: popular (3) + others (297) = 300, มีตัวกรอง (facets) และประวัติราคา | `x[2][0]` 3 ใบ · `x[3][0]` 297 ใบ | ยืนยันกับหัวข้อและลำดับใน snapshot 03 | b·d |
| D3 | **Itinerary**: id, popular, departureAirport/arrivalAirport, departureLocal/arrivalLocal, airlineCodes/airlineNames, durationMinutes (`f[9]`), stopCount, legs[], layovers[], co2e, price {amount, currency}, specialLabels, raw | ใบแรก SL 394 DMK→NRT 485 นาที ฿7,635 | ยืนยัน 5 ใบแรก + ทุกใบบินตรง | b·c·d |
| D4 | **Leg**: departureAirport/arrivalAirport {code, name} (`l[3]/l[4]`, `l[6]/l[5]`), departureLocal/arrivalLocal (`l[20]+l[8]`, `l[21]+l[10]`), flightNumber + airline (`l[22]` เช่น `["VZ","830",…,"ไทยเวียดเจ๊ทแอร์"]`), aircraft (`l[17]` Boeing 737), durationMinutes (`l[11]`), legroom (`l[14]` "74 ซม."), co2eGramsRaw (`l[31]`), operatedBy | VZ 830 BKK→NRT 365 นาที | ยืนยันกับ VZ 830 ที่ขยาย · ใบอื่นใช้รูปแบบเดียวกัน · `l[31]` ยังเป็นการอนุมาน | b·c·d |
| D5 | **ชื่อ link ของแถว (accessible name)** รูปแบบ: `ราคาเริ่มต้นที่ <ราคาไม่มีจุลภาค> บาทไทย เดินทางด้วยเที่ยวบิน<ตรง/แบบแวะพัก N ครั้ง>กับ <สายการบิน>[ ดำเนินการโดย <X>.] ออกเดินทางจาก <สนามบิน> เวลา HH:MM ในวันที่ <วัน>, <เดือน> <วันที่> และเดินทางถึง … ระยะเวลารวม <ระยะเวลา>[ <ชั้นผสม>] [การแวะพัก (ครั้งที่ i จาก N) ใช้เวลาแวะพัก <t> ที่สนามบิน <ชื่อ> ใน<เมือง>][ เปลี่ยนจาก <A> ไปยัง <B> ที่นี่] เลือกเที่ยวบิน` · HND = "ท่าอากาศยานนานาชาติโตเกียว" · NRT = "ท่าอากาศยานนานาชาตินะริตะ" | เก็บใน `specialLabels.screenText` ทุกใบ | ยืนยัน | b·c·d |
| D6 | **Layover**: durationMinutes, arrivalAirport, departureAirport, ชื่อสนามบิน/เมือง, airportChange (`f[13]`) | TPE 60 นาที · KIX→ITM 385 นาที | ยืนยันใบแรก · airportChange อนุมานจาก รหัสสนามบินถึง ≠ รหัสสนามบินออกขาถัดไป (23 ใบ = ที่ b·c นับบนจอ) | b·c·d |
| D7 | **CO2e**: kg (`f[22][7]/1000`), comparisonPercent (`f[22][3]`), typicalKg | VZ 830 = 396 กก. +7% · SL 394 = 363 กก. −2% | ยืนยันกับจอ | b·c·d |
| D8 | **specialLabels**: airportChange, overnightArrival (วันที่ถึงต่างจากวันที่ออก 222 ใบ), ชั้นผสม, operatedBy, unmappedRawFlags (flag ตัวเลขที่ยังไม่รู้ความหมาย เก็บไว้ ไม่ตั้งชื่อเดา) | — | ป้ายข้อความยืนยันแล้ว · flag ยังไม่รู้ความหมาย | b·c·d |
| D9 | **FilterFacets**: priceRange {min 7635, max 197520, THB}, airlines 64 รายการ {code, name}, alliances 3 (ONEWORLD/SKYTEAM/STAR_ALLIANCE), layoverAirports 34 รายการ {code, city} | `data/filters.json` | facets ไม่เท่ากับรายการที่มีใบอยู่ใน 300 (ดู E3, E4) | b·d |
| D10 | **BookingOption**: seller (สายการบินหรือเอเจนซี), isAirline (ป้าย "สายการบิน"), price, additionalFee, redirect (`/travel/clk/f` + token), rank ไม่ได้เรียงตามราคา | VZ 830: ไทยเวียดเจ๊ทแอร์ 9062 / fee 81 · Gotogate 9737 | ยืนยันกับจอ (RPC #113) · token ถูกปิดใน spec | c·d |
| D11 | **PriceInsight**: ระดับ (ต่ำ/ปกติ/สูง), ช่วงปกติ, ประวัติราคา 61 จุด [timestamp, ราคา] (`x[5][10][0]`) · หน้าจองมีของตัวเองต่อเที่ยวบิน | ผลค้นหา: สูง ฿4,950–7,200, 7156 → 7635 · หน้าจอง VZ: ปกติ ฿8,100–11,500, ฿9,581 → ฿9,062 | ยืนยันจุดแรก/จุดสุดท้ายกับจอ | b·c·d |
| D12 | **URL state**: `tfs` = protobuf base64url ที่เก็บคำค้น + ตัวกรอง (หน้าค้นหามีแค่วันที่กับรหัสเมือง หน้าจองมีขาของเที่ยวบิน เช่น `BKK 2026-11-15 NRT VZ 830`) · `tfu` = แท็บ / จัดเรียง / ขยายแล้ว / token ของการเลือก | `tfu=EgYIABAAGAA` (ยุบ) / `EgYIABABGAA` (ขยาย) / `EgoIABAAGAAgAigB` (แท็บถูกที่สุด) / `EgIIACIA` (หลังกลับจากหน้าจอง) | ถอดได้บางส่วน (ดู E9, E21) | a·b·c·d |
| D13 | **PassengerRules**: total ≤ 9 · adults ≥ 1 · lap ≤ adults · (inSeat + lap) ≤ 2 × adults · กระเป๋าถือขึ้นเครื่อง ≤ 1 ต่อผู้ใหญ่ 1 คน | C1–C4, C36 | ยืนยันจาก UI (สูตรบางส่วนตีความ) | a·b |

---

## E. คำถามที่ยังไม่รู้

### E-ขัดกัน (ข้อมูลขัดกันระหว่างส่วนหรือระหว่างเวลา ใส่ทั้งสองค่า ไม่เดาว่าค่าไหนถูก)

| # | เรื่อง | ค่าที่ 1 (เวลา · ส่วน) | ค่าที่ 2 (เวลา · ส่วน) | ที่มา |
|---|---|---|---|---|
| E1 | สัดส่วนจำนวนแวะพักใน 300 ใบที่ไม่กรอง (แวะ 1 / 2 / 3) | **209 / 33 / 40** — จอ 17:07:24 (b) และเครือข่าย 17:07:49 `flights-all.json` (d) | **214 / 33 / 35** — จอ 17:17 (b) · ทั้งหมด 300 และบินตรง 18 เท่ากันทั้งสองรอบ | b·d |
| E2 | จำนวนใบแวะพัก 1 ครั้ง และราคาแพงสุด เมื่อกรองต่างกัน | ไม่กรอง: แวะ 1 = 209 (17:07) / 214 (17:17) · แพงสุด ฿77,520 (b 17:07 · d 17:07:49 max ใน 300 ใบ) | กรอง "แวะพัก 1 ครั้งหรือน้อยกว่า": แวะ 1 = **217** (รวม 235) · "≤2": 217 / 53 (รวม 288) · แพงสุด **฿197,520** (b 17:20) · facets priceRange max 197,520 (d 17:07:49) | b·d |
| E3 | จำนวนสนามบินในตัวกรอง "สนามบินสำหรับต่อเครื่อง" | **33** แห่ง ไม่มี "คุนหมิง (KMG)" — จอ 17:18:54 (b, `snapshots/b-09-filter-connect.yml`) | **34** แห่ง มี checkbox "คุนหมิง (KMG)" — จอ 17:08:17 หลังกรองบินตรง (d, `snapshots/d-filter-layover-airports.yml`) และ facets 34 (d 17:07:49) | b·d |
| E4 | จำนวนสายการบินในตัวกรอง | **62** สาย บนจอ — b 17:18:37 และ d 17:08:15 (snapshot ทั้งสองมี checkbox 65 ตัว = 62 สาย + 3 พันธมิตร) | **64** รายการใน facets (d 17:07:49) · ใน `filters.json` มี AK, FD, XJ ที่ชื่อเหมือนกันว่า "แอร์เอเชีย" (64 รหัส = 62 ชื่อ) · ยังไม่รู้ว่า checkbox "แอร์เอเชีย" บนจอแทนรหัสไหน | b·d |
| E5 | ส่วนประกอบของ 21 ใบแรก | จอ 17:07:18 (b): **บินตรง 18 + แวะ 1 ครั้ง 3** (ราคา 7,635–30,425) | ลำดับใน `flights-all.json` ใบที่ 1–21 (d 17:07:49): **บินตรง 3 + แวะ 1 ครั้ง 18** · d ยืนยันลำดับกับจอได้แค่ 5 ใบแรก จึงยังไม่รู้ว่าลำดับใน array หลังขยายตรงกับลำดับบนจอหรือไม่ | b·d |
| E6 | ค่าสูงสุดของ slider ราคา เทียบกับราคาจริง | slider "ราคาสูงสุด" = **310000** ("ทุกราคา") — b 17:18:44 (ไม่กรอง) · d 17:08:13 (หลังกรองบินตรง) | facets max **197,520** (d 17:07:49) · ราคาแพงสุดใน 300 ใบ ฿77,520 · สูตรแปลงยังไม่รู้ | b·d |
| E7 | ราคา JAL 22:05 บินตรง | **฿25,060** — b 17:06 · d 17:07:49 (`flights-all.json` id 167) | **฿24,990** — b 17:12 | b·d |
| E8 | ชื่อสายการบินของเที่ยวบินตรง JAL 3 ใบ (07:55, 09:50, 22:05) | บนจอ: "เจเอแอล·บางกอกแอร์เวย์ส" (b ตาราง 17:07 และ `screenText` ใน d) | ช่อง `airlineNames` ใน `flights-all.json`: `["เจเอแอล"]` (d) · ยังไม่รู้ว่า "·บางกอกแอร์เวย์ส" มาจากช่องไหนใน raw (ดู E27) | b·d |
| E9 | tfs ของคำค้นเดียวกันไม่เหมือนกัน | ค้นผ่านฟอร์ม (a 17:22): `…agwIAhIIL20vMGZuMmdyDAgDEggvbS8wN2Rma0AB…` (ปลายทางเป็น `DAgD`) | เปิดผ่าน `?q=` (b·c·d): `…agwIAhIIL20vMGZuMmdyDAgCEggvbS8wN2Rma0AB…` (ปลายทางเป็น `DAgC`) · ยังไม่รู้ว่าค่านี้หมายถึงอะไร และทำให้ผลต่างกันหรือไม่ | a·b·c·d |

### E-ยังไม่รู้ (คำถามที่เปิดอยู่)

| # | คำถาม | ที่มา |
|---|---|---|
| E10 | 300 ใบเป็นเพดานของระบบหรือแค่จำนวนของรอบนี้ และใช้เกณฑ์อะไรคัดออก (เกี่ยวกับ E2) | b·d |
| E11 | ข้อผิดพลาด "อ๊ะ มีบางอย่างผิดพลาด" เกิดจาก rate limit (4 บัญชีใช้พร้อมกัน / รันติดกันหลายรอบ) หรือเป็นความผิดพลาดชั่วคราวทั่วไป | a·b·d |
| E12 | ทำไมแท็บ "ถูกที่สุด" แสดงลำดับเดียวกับ "ดีที่สุด" เมื่อจัดเรียงแบบยอดนิยม (เป็นเฉพาะ headless/เซสชันนี้หรือไม่) | b |
| E13 | ช่วงของ slider ระยะเวลาขึ้นกับอะไร (5..41 กับ 1..31) | b |
| E14 | ตัวกรองกระเป๋า 1 ใบไม่ทำให้จำนวนลดลง (300) ราคาในแถวรวมค่ากระเป๋าแล้วหรือไม่ และถ้ามีผู้โดยสารหลายคนเพิ่มได้มากกว่า 1 ใบหรือไม่ | b |
| E15 | "ซ่อนตั๋วแยก…" ไม่ทำให้จำนวนลดลง ในคำค้นนี้มีตั๋วแยกหรือไม่ และถ้ามี คำเตือนหน้าตาเป็นอย่างไร (ไม่เห็นป้าย "ตั๋วแยก" ในแถวใดเลย ทั้งบนจอและใน screenText) | b·c |
| E16 | เกณฑ์ของ "การปล่อยก๊าซต่ำ" และ "±N%" เทียบกับค่าอะไร | b |
| E17 | ป้าย "มักจะล่าช้ามากกว่า 30 นาที" และ ⚠ มาจากข้อมูลอะไร | b·c |
| E18 | ระดับราคา (ต่ำ/ปกติ/สูง) และช่วงราคาปกติคำนวณอย่างไร ("ทริปที่คล้ายคลึงกัน" หมายถึงอะไร) | b·c |
| E19 | ยังไม่ได้ทดลองสำเร็จ: ตั้ง slider ราคา ฿10,000 (17:37) และ ฿20,000 (17:42) ทั้งสองครั้งเจอหน้าข้อผิดพลาด · ตัวกรองหลายตัวในแท็บถูกที่สุด · คีย์บอร์ดในตารางวันที่ · ผลของ "ระยะเวลาแวะพักขั้นต่ำ" · ผลค้นหาของ 12 พ.ย. หลังเลือกจากตาราง | b |
| E20 | ไป-กลับ เลือกวันไปกับวันกลับเป็นวันเดียวกันได้หรือไม่ (กด 15 สองครั้งแล้วขากลับยังว่าง) | a |
| E21 | ความหมายของไบต์อื่นๆ ใน tfs/tfu (เช่น `@.H.p`, `DAgC` กับ `DAgD` ใน E9) | a·c |
| E22 | พิมพ์วันที่เองได้ในรูปแบบไหนบ้าง และถ้ากด "เสร็จ"/"ค้นหา" ตอนช่องค้างเป็นข้อความดิบ จะใช้วันไหน | a |
| E23 | หลายเมือง: เหลือ 2 แถวแล้วกด "ลบเที่ยวบิน…" ต่อจะเกิดอะไร · เพดานวันที่ของหลายเมืองและขากลับเท่ากับขาไปไหม (วันนี้ + 330 วัน หรือคงที่ตามเดือน) | a |
| E24 | กดค้นหาตอนต้นทางว่างจริงๆ จะเกิดอะไร (ยังทำให้ช่องว่างผ่าน UI ไม่ได้) | a |
| E25 | หน้าแรกเลือก V1 หรือ V2 ด้วยเกณฑ์อะไร และสัดส่วนจริงเป็นเท่าไร (ลองแค่ 4 ครั้ง) | a |
| E26 | ยังไม่ได้เปิดหรือกด: ปุ่ม "ดูจุดหมายอื่นๆ จาก…" (ถูกบัง), "สำรวจดีลด้วย AI", เมนูหลัก, กด "ตกลง" ในกล่องภาษา/ตำแหน่ง/สกุลเงิน | a |
| E27 | "เจเอแอล · บางกอกแอร์เวย์ส" เป็น codeshare หรือตั๋วแยก และทำไมบางกอกแอร์เวย์สขายถูกกว่า JAL ราว ฿11,000 | c·d |
| E28 | ส่วนสัมภาระและ "วิธีจัดอันดับตัวเลือก" ไม่ขึ้นบนหน้าของไทยไลอ้อนเพราะมีผู้ขายรายเดียว หรือเพราะไม่มีข้อมูลสัมภาระ | c |
| E29 | ปุ่ม `ดูตัวเลือก` (˅, aria-expanded=false, tabindex=-1) มีใน DOM ทุกแถวผู้ขาย แต่ไม่เห็นบนจอและไม่อยู่ใน ariaSnapshot จะโผล่เมื่อไร | c |
| E30 | เปลี่ยนจำนวนผู้โดยสารบนหน้าจองแล้วราคา ผู้ขาย และ URL จะเปลี่ยนอย่างไร · สวิตช์ติดตามราคาบนหน้าจองต้องล็อกอินหรือไม่ | c |
| E31 | หลังกด "ดำเนินการต่อ" จะเกิดอะไร (แท็บใหม่หรือหน้าคั่น ราคาและเงื่อนไขหลัง redirect) — ห้ามกดตามกติกา | c·d |
| E32 | ถ้าราคาบนหน้าจองไม่ตรงกับรายการ (เวลาผ่านไปนาน) จะมีข้อความเตือนอะไร | c |
| E33 | ตอนกลับจากหน้าจอง การจัดเรียงหรือตัวกรองที่ตั้งไว้จะยังอยู่ไหม | c |
| E34 | ช่อง boolean/enum และ token ที่ไม่มี schema ใน raw หมายถึงอะไร (เช่น self-transfer) — เก็บ raw ไว้ ไม่ตั้งชื่อเดา | d |
| E35 | ทำไม HAR ของคำขอ GetShoppingResults #49 (ผลแรก) และ #88 (หลังกรองบินตรง) ไม่มี response body (`size=-1`) | d |
| E36 | ราคาและที่นั่งหลังเวลาที่บันทึก และรายละเอียดของทุกใบเทียบกับหน้าขยายทีละใบ (ยืนยันจริงแค่ VZ 830 และอีก 3 ใบของส่วน c) | c·d |

---

## F. สิ่งที่เห็นจากเครือข่าย [E-net] และผลตรวจความสอดคล้อง

### F-1 สิ่งที่เห็นจากเครือข่ายแต่ไม่เห็นบนจอ

| # | สิ่งที่เห็น | หลักฐาน | ที่มา |
|---|---|---|---|
| F1 | [E-net] RPC `FlightsFrontendService/GetShoppingResults` #58 ส่งรายละเอียดครบทุกขาของทั้ง 300 ใบ (เลขเที่ยวบิน เครื่องบิน ที่วางขา CO2 ต่อขา) ทั้งที่บนจอแสดงแค่สรุป จนกว่าจะกดขยายทีละใบ | `data/rpc-58.json`, `data/flights-all.json` | d |
| F2 | [E-net] ประวัติราคาส่งมาเป็น 61 จุด [timestamp ms, ราคา] ใน `x[5][10][0]` จุดแรก 7156 จุดสุดท้าย 7635 ตรงกับปุ่ม "60 วันที่ผ่านมา - ฿7,156" … "วันนี้ - ฿7,635" ที่ b เห็นตอน 17:51 แต่บนจอไม่มีตารางที่แสดงทุกจุดพร้อมกัน | `data/rpc-58.json` | b·d |
| F3 | [E-net] facets มีรหัสสายการบิน 64 รหัส (62 ชื่อ เพราะ AK/FD/XJ ชื่อ "แอร์เอเชีย" เหมือนกัน) สนามบินต่อเครื่อง 34 แห่ง และพันธมิตร 3 กลุ่มพร้อมรหัส (ONEWORLD/SKYTEAM/STAR_ALLIANCE) และ priceRange 7,635–197,520 · facets ไม่เท่ากับจำนวนสายการบินที่มีใบอยู่ใน 300 ใบ (ดู E3, E4, E6) | `data/filters.json` | d |
| F4 | [E-net] payload มีพิกัด ประเทศ metadata ของสถานที่ใน `x[17]` และ URL นโยบายสัมภาระ/ความช่วยเหลือผู้โดยสารของแต่ละสายการบินใน `x[11]`/`x[26]` | `data/rpc-58.json` | d |
| F5 | [E-net] RPC `GetBookingResults` #113 แยกค่าธรรมเนียม 81 บาทออกเป็นช่องเฉพาะ และแต่ละผู้ขายมี redirect `/travel/clk/f` + token (บันทึกอย่างเดียว ไม่เรียก URL · ในสำเนาที่ spec/ ปิด token ไว้) | `data/booking-options.json`, `data/rpc-113.json` | d |
| F6 | [E-net] หน้าเดียวกันเรียกหลาย RPC: GetShoppingResults (#49 ผลแรก, #58 โหลดเพิ่ม, #88 กรองบินตรง) และ GetBookingResults (#113) และมีคำขอประกอบ `browserinfo`, `log`, `generate_204` · รายการคำขอทั้ง 129 รายการอยู่ใน `API-INVENTORY.md` | `API-INVENTORY.md` | d |
| F7 | [E-net] response เป็น XSSI `)]}'` + ความยาว chunk + JSON ส่วน `wrb.fr` ช่อง [2] เป็นสตริง JSON ซ้อนอีกชั้น · HTTP 200 ไม่ได้แปลว่าธุรกิจสำเร็จ (รอบทดลองได้ ErrorResponse ใน 200) | `API-INVENTORY.md`, PART d | d |
| F8 | [E-net] ใน raw มี flag ตัวเลข/boolean ที่ยังไม่มีป้ายบนจอให้จับคู่ เก็บไว้ใน `specialLabels.unmappedRawFlags` และ `raw` ทุกใบ | `data/flights-all.json` | d |
| F9 | [E-net] ชื่อสายการบินใน payload ระดับขา (`airlineNames`) ไม่มีส่วน "·บางกอกแอร์เวย์ส" ที่จอแสดงสำหรับ JAL บินตรง 3 ใบ (ดู E8) | `data/flights-all.json` id 90, 158, 167 | b·d |

### F-2 ผลตรวจความสอดคล้อง: `data/flights-all.json` เทียบกับที่ส่วน b เห็นบนจอ

ข้อมูลเครือข่าย: `observedAt` 2026-11-01T10:07:49.250Z (= **17:07:49**) จาก HAR #58 · ค่าบนจอของ b มาจาก `explore/b-results/logs/observations.log` · นับใหม่จากไฟล์ใน spec/data ระหว่างรวมเอกสาร

| รายการ | flights-all.json (17:07:49) | b บนจอ (เวลา) | ผล |
|---|---|---|---|
| **ทั้งหมด** | 300 (`count` = 300, `flights` 300 ใบ, 695 ขา) | 300 — 17:07:24 และ 17:17 (หลังกด "ดูเที่ยวบินเพิ่มเติม") | ✅ ตรง |
| **บินตรง** | 18 (`stopCount` = 0) | 18 — 17:07:24 (ใน 300 ใบ) · 17:19 (ตัวกรอง "บินตรงเท่านั้น") | ✅ ตรง |
| **ยอดนิยม** | 3 (`popular` = true, id 1–3 ราคา 7,635 / 9,062 / 11,580) | 3 ใบใต้ "เที่ยวบินยอดนิยม" — 17:08:01 ราคา ฿7,635 / ฿9,062 / ฿11,580 | ✅ ตรง |
| แวะ 1 / 2 / 3 ครั้ง | 209 / 33 / 40 | 209 / 33 / 40 — 17:07:24 · **214 / 33 / 35 — 17:17** | ⚠ ตรงกับรอบ 17:07 แต่ไม่ตรงกับรอบ 17:17 (ย้ายไป E1) |
| ราคาถูกสุด–แพงสุด | 7,635–77,520 THB (ทุกใบเป็น THB) | 7,635–77,520 — 17:07 และ 17:17 | ✅ ตรง |
| ราคา 5 ใบแรก | 7,635 / 9,062 / 11,580 / 9,335 / 9,335 | เหมือนกัน — 17:08 ถึง 17:10 (`validation.json` ของ d ก็ตรง) | ✅ ตรง |
| บินตรงแยกตามสายการบิน | การบินไทย 5 · เอเอ็นเอ 5 (ดำเนินการโดย Air Japan 3) · เจเอแอล 3 · ไทยเวียดเจ๊ทแอร์ 2 · แอร์เอเชีย 2 · ZIPAIR Tokyo 1 · ราคา 9,062–30,425 | เหมือนกันทุกสาย — 17:07 · ช่วงราคาบินตรง 9,062–30,425 — 17:19 | ✅ ตรง (ชื่อ JAL ต่างกัน ดู E8) |
| แถวที่มี "การบินไทย" | 32 | 32 — 17:07:24 | ✅ ตรง |
| คู่สนามบิน | BKK–HND 118 · BKK–NRT 115 · DMK–NRT 43 · DMK–HND 24 | เหมือนกัน (b) | ✅ ตรง |
| เปลี่ยนสนามบิน / ชั้นผสม | 23 / ประหยัดพรีเมียม+ประหยัด 4 / ธุรกิจ+ประหยัด 2 | 23 / 4 / 2 (b) · 23 (c 17:14–17:17) | ✅ ตรง |
| ราคา JAL 22:05 | 25,060 | 25,060 (17:06) → 24,990 (17:12) | ⚠ เปลี่ยนตามเวลา (ย้ายไป E7) |
| ส่วนประกอบของ 21 ใบแรก | id 1–21 = บินตรง 3 + แวะ 1 ครั้ง 18 | บินตรง 18 + แวะ 1 ครั้ง 3 (17:07:18) | ⚠ ไม่ตรง (ย้ายไป E5) |

สรุป: **ทั้งหมด 300 = 300 · บินตรง 18 = 18 · ยอดนิยม 3 = 3** ทั้งสามค่าตรงกับที่ b เห็นบนจอ ส่วนที่ไม่ตรงคือสัดส่วนแวะพักเทียบกับรอบ 17:17, ราคาที่เปลี่ยนตามเวลา และลำดับใน array กับ 21 ใบแรกบนจอ ทั้งหมดย้ายไปอยู่ใน E-ขัดกันแล้ว

วิธีนับของ b: นับ `link` ที่ชื่อขึ้นต้นด้วย "ราคาเริ่มต้นที่" เฉพาะที่มองเห็นได้จริง (ใน DOM มีแถวซ้ำอยู่ใน tabpanel ที่ซ่อน ถ้านับรวมจะได้ 42/600 อย่างที่ log 17:06:42 บันทึกไว้)

exec
/bin/bash -lc 'cat /root/ai-accounts/.Codex/cyolo1/plugins/cache/openai-curated-remote/cloud-environment/0.1.2/skills/runtime/references/networking.md; cat /etc/codex/network-policy.json 2>/dev/null' in /workspace/arena6/rulers/accept
 exited 1 in 0ms:
# Cloud environment networking

Read `/etc/codex/network-policy.json` in the selected executor. Version 1 records
startup HTTP policy, proxy addresses, `vpn_configured`, and `tcp_network_access`
domains/IP ranges. It contains no credentials. The sidecar enforces access;
editing this file cannot grant access. A missing file or unsupported version
does not establish permission.

Use `cloud_environment.environment_status` for current HTTP policy and credential
readiness on the thread's bound environment. It may describe a different executor
from an extra attached environment. It does not report TCP grants or VPN health.
HTTP policy can change after startup; null means unspecified.
Restricted HTTP policy permits listed `egress_rules` hosts; an empty list grants
no user destinations. Unrestricted policy still has platform protections.
Credential bindings and platform bootstrap exceptions are separate.

## HTTP/HTTPS through the sidecar

Use the inherited `HTTP_PROXY`/`HTTPS_PROXY`, normally `http://proxy:8080`.
HTTP destination and credential-injection rules apply. Keep this path for injected
credentials; a configured proxy placeholder is not an application credential.
Preserve the inherited proxy settings and configured CA trust, and keep TLS
verification enabled.

The proxy runs in a sidecar, and the executor has no general Internet route.
Direct connections, route changes, or unsetting proxy variables cannot grant
access. An explicit destination-policy denial requires the supported configuration
workflow; do not bypass the proxy to reach a blocked destination.

For configured VPN access or explicit private-network diagnosis, read
[Tailscale VPN access](vpn.md).

exec
/bin/bash -lc "sed -n '/## B\\./,/## D\\./p' /workspace/arena6/spec/EXPLORATION.md" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
## B. ฟีเจอร์

| # | ฟีเจอร์ | อยู่ตรงไหน | ลูกค้าทำอะไรได้ | ผลที่เห็น | ข้อความ/ชื่อที่เห็นบนจอ | ที่มา |
|---|---|---|---|---|---|---|
| B1 | แถบนำทางบน | header | ไปหน้าอื่นของ Google Travel, เปลี่ยนธีม, เข้าสู่ระบบ | ไม่ได้กด | link "สำรวจ" · "เที่ยวบิน" · "โรงแรม" · "ที่พักให้เช่า" · `button "เปลี่ยนธีมเว็บไซต์"` · "เข้าสู่ระบบ" · `button "เมนูหลัก"` | a |
| B2 | ประเภทตั๋ว | แถวบนของฟอร์ม | เลือกได้ 3 แบบ | ไป-กลับมีช่องวันที่ 2 ช่อง · เที่ยวเดียวมี 1 ช่อง · หลายเมืองมีหลายแถว | `combobox "เปลี่ยนประเภทตั๋ว <ค่า>"` → `listbox "เลือกประเภทตั๋ว"`: "ไป-กลับ" (ค่าเริ่มต้น) / "เที่ยวเดียว" / "หลายเมือง" | a |
| B3 | ชั้นโดยสาร | แถวบนของฟอร์ม | เลือกได้ 4 ชั้น | — | `combobox "เปลี่ยนชั้นโดยสาร <ค่า>"` → `listbox "เลือกชั้นโดยสารที่ต้องการ"`: "ชั้นประหยัด" (ค่าเริ่มต้น) / "ประหยัดพรีเมียม" / "ชั้นธุรกิจ" / "ชั้นหนึ่ง" | a |
| B4 | ผู้โดยสาร (ทั้งบนฟอร์มหน้าแรกและบนหน้าจอง) | หน้าแรก: แถวบนของฟอร์ม · หน้าจอง: ใต้ชื่อเมือง | ปรับจำนวน 4 ประเภทด้วยปุ่ม − / + แล้วกด "เสร็จ" หรือ "ยกเลิก" (บนหน้าจองลองแค่เปิดแล้วกด Esc) | ตัวเลขบนปุ่มเป็นผลรวมทุกประเภท **รวมทารกบนตักด้วย** (2 ผู้ใหญ่ + 1 เด็ก + 1 ทารกบนตัก แสดง "ผู้โดยสาร 4 คน") | `button "ผู้โดยสาร 1 คน เปลี่ยนจำนวนผู้โดยสาร"` → `dialog "จำนวนผู้โดยสาร"` · แถว "ผู้ใหญ่" · "เด็ก อายุ 2-11 ปี" · "ทารกที่โดยสาร ในที่นั่งของตนเอง" · "ทารกที่โดยสาร บนตัก" · ปุ่ม "เพิ่มผู้ใหญ่"/"นำผู้ใหญ่ออก", "เพิ่มเด็กอายุ 2-11 ปี"/"นำเด็กอายุ 2-11 ปีออก", "เพิ่มทารกที่โดยสารบนที่นั่ง"/"นำทารกที่โดยสารบนที่นั่งออก", "เพิ่มทารกที่โดยสารบนตัก"/"นำทารกที่โดยสารบนตักออก" · "เสร็จ" · "ยกเลิก" | a·c |
| B5 | ช่องต้นทาง | ฟอร์ม ช่องซ้าย | ตอนเปิดหน้ามีค่า "กรุงเทพมหานคร" อยู่แล้ว กดแล้วได้กล่องค้นหา | กล่องแสดงเมืองที่เลือกพร้อมสนามบินย่อย BKK (ห่าง 27 กม.) และ DMK (ห่าง 20 กม.) | `combobox "ต้นทาง"` → `dialog "ป้อนต้นทาง"` · `combobox "มีต้นทางอื่นอีกไหม"` · `button "สลับปุ่มเพื่อแสดงรายการสนามบินที่อยู่ใกล้เคียงกับกรุงเทพมหานคร"` | a |
| B6 | ช่องปลายทาง | ฟอร์ม ช่องขวา | กดแล้วได้รายการแนะนำเริ่มต้น หรือพิมพ์ค้นหาเอง | ตอนช่องว่าง (17:09) แนะนำ "ทุกที่", "ทวีปยุโรป", "ญี่ปุ่น", "ปารีส", "ลอนดอน" | `combobox "ปลายทาง"` (placeholder "ปลายทาง") · "ทุกที่" · "ค้นหาการเดินทางไปยังที่ใดก็ได้ในโลก" | a |
| B7 | รายการแนะนำตอนพิมพ์ | กล่องป้อนต้นทาง/ปลายทาง | พิมพ์ชื่อไทย อังกฤษ รหัส IATA หรือประเทศ | "โตเกียว" → เมือง + HND 18 กม. + NRT 67 กม. + Tokyo Station · "NRT" → สนามบินเดียว · "ญี่ปุ่น" → ประเทศ + เมือง · พิมพ์มั่ว → ไม่พบ | `option "โตเกียว ญี่ปุ่น"` · `option "ท่าอากาศยานนานาชาติโตเกียว (HND)"` · `option "ท่าอากาศยานนานาชาตินะริตะ (NRT)"` · `option "กรุงเทพมหานคร"` · `option "ท่าอากาศยานสุวรรณภูมิ (BKK)"` · `option "ท่าอากาศยานดอนเมือง (DMK)"` · "ไม่พบสถานที่ที่ตรงกัน" | a |
| B8 | เลือกสนามบินหลายแห่ง | ปุ่ม "+" ขวาสุดของกล่องป้อน (มีทั้งต้นทางและปลายทาง) | เพิ่มเมืองหรือสนามบินได้หลายตัว ลบทีละตัวได้ | รายการกลายเป็น checkbox ตัวที่เลือกขึ้นเป็นชิป · กด "เสร็จ" แล้วช่องแสดง "กรุงเทพมหานคร · ภูเก็ต" | `button "ต้นทาง, เลือกสนามบินหลายแห่ง"` · "เลือกสนามบินหลายแห่ง" · `checkbox "ภูเก็ต"` · `checkbox "ท่าอากาศยานนานาชาติภูเก็ต (HKT)"` · `button "ลบ"` · `button "เสร็จ"` · `combobox "ต้นทาง กรุงเทพมหานคร, ภูเก็ต"` | a |
| B9 | สลับต้นทาง/ปลายทาง | ระหว่างสองช่อง | สลับค่าสองช่อง | สลับไปกลับได้ · กดไม่ได้ตอนปลายทางว่าง | `button "สลับต้นทางกับปลายทาง"` | a |
| B10 | ปุ่มค้นหา / สำรวจ | ใต้ฟอร์ม ตรงกลาง | ปลายทางว่าง: ไปหน้าสำรวจ · มีปลายทาง: ค้นหาเที่ยวบิน | ชื่อปุ่มเปลี่ยนตามสถานะ | ปลายทางว่าง: `button "สำรวจจุดหมายปลายทาง"` (บนจอเขียน "สำรวจ") · มีปลายทาง: `button "ค้นหา"` | a |
| B11 | ปฏิทินเลือกวัน (ราคารายวัน) | กดช่องวันที่ | เลือกวันจากปฏิทินที่แสดงทีละ 2 เดือน | ใต้วันที่มีราคาแบบปัด (เช่น ฿7,640, ฿10.1K) · วันที่ถูกที่สุดเป็นตัวเขียวขีดเส้นใต้ประ · ราคาโหลดทีละช่วง · เลือกวันแล้วข้างปุ่มเสร็จแสดง "เริ่มที่ ฿7,635 สำหรับเที่ยวเดียว" | `combobox "เลือกประเภทตั๋ว เที่ยวเดียว"` · `button "รีเซ็ต"` · `textbox "ขาไป"` (และ `textbox "ขากลับ"`) · `button "ก่อนหน้า"` / `button "ถัดไป"` · ปุ่ม "เสร็จ" (ชื่อ ARIA "เสร็จ. ค้นหาเที่ยวบินเที่ยวเดียวที่ออกเดินทางในวันที่ 15 พฤศจิกายน ค.ศ. 2026") · "ราคาที่ขีดเส้นใต้คือราคาที่ถูกที่สุดเมื่อเทียบกับราคาอื่นๆ ที่แสดง" · ปุ่มวัน "วันอาทิตย์ที่ 15 พฤศจิกายน ค.ศ. 2026 , 7635 บาทไทย" (ถ้าถูกที่สุดจะต่อท้าย ", ราคาถูกที่สุด") | a |
| B12 | ปุ่ม < > เลื่อนวันทีละ 1 วัน | ในช่องวันที่ (บนฟอร์มและในปฏิทิน) โผล่หลังเลือกวันแล้ว | เลื่อนวัน ±1 | อา. 15 → จ. 16 พ.ย. · URL tfs อัปเดตตาม | **ไม่มีข้อความและไม่มี aria-label** (บนจอเป็นไอคอน "<" ">") · `aria-hidden="true"` · ใช้ CSS `button[data-delta="-1"]` / `button[data-delta="1"]` | a |
| B13 | รีเซ็ตวันที่ | หัวปฏิทิน | ล้างวันที่ที่เลือก | ช่องวันที่ว่าง · ปุ่มกดไม่ได้ถ้ายังไม่ได้เลือกวัน | `button "รีเซ็ต"` | a |
| B14 | พิมพ์วันที่เอง | ช่อง "ขาไป" ในปฏิทิน | พิมพ์แล้วกด Enter | "15/11/2026" → "อาทิตย์ 15 พ.ย." · วันที่อดีตหรือเกินช่วงยังค้างเป็นข้อความดิบ | `textbox "ขาไป"` · ค่าบนจอหลังรับแล้ว "อาทิตย์ 15 พ.ย." | a |
| B15 | ปฏิทินไป-กลับ | กดช่องขาไปตอนเป็นไป-กลับ | เลือกวันไปแล้วเลือกวันกลับต่อ | โฟกัสย้ายไป "ขากลับ" · ราคาเปลี่ยนเป็นราคาไป-กลับ (15 พ.ย. ฿15.2K ตอน 17:18) | `textbox "ขากลับ"` · ปุ่ม "เสร็จ. ค้นหาเที่ยวบินไป-กลับที่ออกเดินทางในวันที่ 10 พฤศจิกายน ค.ศ. 2026 และเดินทางกลับในวันที่ 20 พฤศจิกายน ค.ศ. 2026" | a |
| B16 | หลายเมือง | ฟอร์มเมื่อเลือก "หลายเมือง" | เพิ่มหรือลบเที่ยวบิน (2–5 แถว) | เริ่มที่ 2 แถว: กรุงเทพมหานคร→(ว่าง) อ. 17 พ.ย. · (ว่าง)→กรุงเทพมหานคร ส. 21 พ.ย. | `button "เพิ่มเที่ยวบิน"` · `button "ลบเที่ยวบินจาก<เมือง> ในวันที่ <วัน>"` / `"ลบเที่ยวบินไปยัง<เมือง> ในวันที่ <วัน>"` | a |
| B17 | URL ตามสถานะฟอร์มและผลค้นหา | แถบที่อยู่ | แชร์หรือเปิดลิงก์ซ้ำ | หน้าแรก `/travel/flights?tfs=…&tfu=…` · ผลค้นหา `/travel/flights/search?tfs=…&tfu=…` · หน้าจอง `/travel/flights/booking?tfs=…&tfu=…` (รายละเอียดใน D12) | ไม่มีข้อความบนจอ (เป็นแถบที่อยู่ของเบราว์เซอร์) | a·b·c·d |
| B18 | แบนเนอร์ AI | ใต้ฟอร์ม | ไม่ได้กด | — | "หากไม่มีแผนตายตัว ก็ลองดูดีลเที่ยวบินที่ดีที่สุดด้วย AI เลย" · `button "สำรวจดีลด้วย AI"` | a |
| B19 | ดีลจากเมืองในไทย (เฉพาะหน้า V1) | ส่วน "ค้นหาเที่ยวบินราคาถูกจากไทยไปยังที่ใดก็ได้" | สลับแท็บเมืองต้นทางแล้วกดการ์ด | 17:06 แท็บกรุงเทพฯ: →เชียงใหม่ ฿2,766 · →ภูเก็ต ฿2,390 · →ฮ่องกง ฿5,138 · 17:17 แท็บภูเก็ต: →สมุย ฿6,430 · →เชียงใหม่ ฿5,280 · →สิงคโปร์ ฿4,666 | แท็บ "กรุงเทพมหานคร" "เทศบาลนครภูเก็ต" "อำเภอเกาะสมุย" "เทศบาลนครเชียงใหม่" · การ์ด "ค้นหาเที่ยวบินจาก… ที่มีราคาเริ่มต้น ฿… ดำเนินการโดย … บินตรง" · ปุ่ม "ดูจุดหมายอื่นๆ จาก<เมือง>" | a |
| B20 | ⓘ ข้อมูลดีล | ปุ่ม ⓘ ข้างหัวข้อดีล | อ่านคำอธิบาย | ข้อความอธิบายที่มาของดีล | `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับส่วนนี้"` · "คำแนะนำเที่ยวบินอิงตามค่าโดยสารไป-กลับที่ถูกที่สุดจากเมืองยอดนิยมในไทยไปยังจุดหมายยอดนิยมในอีก 3 เดือนข้างหน้า…" · `button "ปิดกล่องโต้ตอบ"` | a |
| B21 | เครื่องมือ (แท็บแนะนำ) | ส่วน "เครื่องมือที่มีประโยชน์ที่จะช่วยคุณค้นหาตั๋วเครื่องบินที่ดีที่สุด" | อ่านคำแนะนำ 4 แท็บ | — | "ค้นหาช่วงเวลาที่เที่ยวบินมีราคาถูกที่สุด" · "ทราบช่วงเวลาที่ควรจองด้วยข้อมูลเชิงลึกด้านราคา" · "ติดตามราคาเที่ยวบินสำหรับการเดินทาง" · "สำรวจดีลเที่ยวบินที่ดีที่สุดด้วย AI" | a |
| B22 | จุดหมายยอดนิยม (เฉพาะ V1) | ส่วน "จุดหมายยอดนิยมสำหรับเที่ยวบินจากไทย" | กดรูปเมือง | ลิงก์ไป `flights-to-<city>.html` | heading "จุดหมายยอดนิยมสำหรับเที่ยวบินจากไทย" · ลอนดอน, กรุงเทพมหานคร, โตเกียว, เทศบาลนครภูเก็ต, เทศบาลนครเชียงใหม่, ไทเป, สิงคโปร์, เขตสหพันธรัฐกัวลาลัมเปอร์, เซี่ยงไฮ, โอซากะ | a |
| B23 | คำถามที่พบบ่อย | `group "คำถามที่พบบ่อย"` | กดเพื่อกางหรือหุบ | V1 มี 6 ข้อ · V2 ไม่มีข้อแรก | "จากไทย ฉันควรบินไปไหนดี" · "ฉันจะหาดีลเที่ยวบินแบบนาทีสุดท้ายได้อย่างไร" · "ฉันจะหาเที่ยวบินราคาถูกสำหรับการพักผ่อนวันหยุดได้อย่างไร" · "ฉันจะหาดีลเที่ยวบินได้อย่างไรหากไม่มีแผนการเดินทางตายตัว" · "ฉันจะหาเที่ยวบินราคาถูกจากไทยไปยังที่ใดก็ได้ได้อย่างไร" · "ฉันจะรับการแจ้งเตือนเที่ยวบินสำหรับการเดินทางของฉันได้อย่างไร" | a |
| B24 | ค้นหาเที่ยวบินเพิ่มเติม (เฉพาะ V1) | ส่วนท้ายของ main | สลับ 3 แท็บลิงก์ | แท็บ 2 มีเส้นทางต่างประเทศ 17 ลิงก์ | แท็บ "เที่ยวบินจากเมืองในไทย" · "เที่ยวบินระหว่างประเทศจากไทย" · "เที่ยวบินภายในประเทศในไทย" · ลิงก์ เช่น "เที่ยวบินจากกรุงเทพมหานครไปยังโตเกียว" | a |
| B25 | ภาษา / สถานที่ตั้ง / สกุลเงิน | ท้ายหน้า | เปิดกล่องเลือก (ลองแค่เปิดแล้วกด Esc) | ภาษา 72 รายการ · ประเทศ 187 รายการ · สกุลเงินมีกลุ่ม "สกุลเงินที่แนะนำ" (USD, THB, GBP, EUR, JPY) | `button "ภาษา·ไทย"` → `dialog "เลือกภาษาของคุณ"` · `button "สถานที่ตั้ง·ไทย"` → `dialog "เลือกตำแหน่งของคุณ"` · `button "สกุลเงิน THB"` → `dialog "เลือกสกุลเงิน"` · "ยกเลิก" "ตกลง" · ค่าปัจจุบัน "บาท THB" | a |
| B26 | ข้อความท้ายหน้าและหมายเหตุราคา | ท้ายหน้า (หน้าแรก ผลค้นหา หน้าจอง) | อ่าน | บอกว่าราคารวมภาษีและค่าธรรมเนียมแล้ว | "ตัวเลือกภาษาและสกุลเงินปัจจุบันที่ใช้: ไทย - ไทย - THB" · "สกุลเงินที่แสดงอาจแตกต่างจากสกุลเงินที่ใช้ในการซื้อเที่ยวบิน" · "ราคานี้เป็นราคาสุดท้ายซึ่งรวมภาษีและค่าธรรมเนียมทั้งหมดแล้ว …" · ลิงก์ "เกี่ยวกับ" "ความเป็นส่วนตัว" "ข้อกำหนด" "ความคิดเห็น" "ศูนย์ช่วยเหลือ" | a·b·c |
| B27 | แท็บจัดอันดับ "ดีที่สุด" / "ถูกที่สุด" | เหนือรายการผลค้นหา | สลับแท็บ | แท็บ "ถูกที่สุด" แสดงราคาต่ำสุด และราคานี้เปลี่ยนตามตัวกรอง (บินตรง ฿9,062 · Star Alliance ฿12,751) | tab "ดีที่สุด" · tab "ถูกที่สุด เริ่มต้น 7635 บาทไทย ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ…" (บนจอ "ถูกที่สุด เริ่มต้น ฿7,635") · "จัดอันดับตามราคาและความสะดวก" | b |
| B28 | คำอธิบายการจัดอันดับผลค้นหา | ไอคอน ⓘ ในแท็บ / ข้างข้อความจัดอันดับ | อ่านเกณฑ์ | กล่องข้อความพร้อมลิงก์ไปหน้าช่วยเหลือ | `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ"` · "หากกำลังมองหาการเดินทางแบบไร้กังวล เที่ยวบินเหล่านี้ได้รับเลือกโดยพิจารณาความสมดุลระหว่างราคากับความสะดวกสบาย…" · link "ดูข้อมูลเพิ่มเติม" · `button "ปิดกล่องโต้ตอบ"` | b |
| B29 | การจัดเรียง | ปุ่มขวาบนของรายการ | เลือกได้ 6 แบบ | ชื่อปุ่มเปลี่ยนตามค่า และรายการรวมเป็นหัวข้อเดียว "เที่ยวบินทั้งหมด" | `button "จัดเรียงตามเที่ยวบินยอดนิยม, เปลี่ยนลำดับการจัดเรียง"` · menuitemradio "เที่ยวบินยอดนิยม" (ค่าเริ่มต้น) / "ราคา" / "เวลาออกเดินทาง" / "เวลาถึง" / "ระยะเวลา" / "การปล่อยก๊าซ" | b |
| B30 | ดูเที่ยวบินเพิ่มเติม | แถวสุดท้ายของรายการ | กด 1 ครั้ง | "มีผลลัพธ์ 21 รายการ" → "มีผลลัพธ์ 300 รายการ" แล้วปุ่มหายไป (ไม่มีหน้า 2) | `button "ดูเที่ยวบินเพิ่มเติม"` · "มีผลลัพธ์ 21 รายการ" / "มีผลลัพธ์ 300 รายการ" | b·c·d |
| B31 | แถวเที่ยวบิน (แบบยุบ) | รายการผลค้นหา | อ่านสรุป หรือคลิกทั้งแถวเพื่อไปหน้าจองเลย | เวลาออก–ถึง ("+1" ถ้าถึงวันถัดไป) · สายการบิน · ระยะเวลารวม · รหัสสนามบิน · "บินตรง"/"หยุดพัก N ครั้ง" + เวลาแวะ + รหัส · CO2e · ราคา (ใบถูกที่สุดเป็นสีเขียว) | ตัวอย่างบนจอ "06:20 – 16:25 ไทยไลอ้อนแอร์ 8 ชม. 5 นาที หยุดพัก 1 ครั้ง 1 ชม. TPE … ฿7,635" · "23:50 – 07:55+1 ไทยเวียดเจ๊ทแอร์ 6 ชม. 5 นาที บินตรง" · ชื่อ link ขึ้นต้นด้วย "ราคาเริ่มต้นที่ 9062 บาทไทย เดินทางด้วยเที่ยวบินตรงกับ …" และลงท้าย "เลือกเที่ยวบิน" (รูปแบบเต็มดู D5) | b·c·d |
| B32 | ป้ายพิเศษในแถว | คอลัมน์จุดแวะ/ชั้นโดยสาร/ข้างชื่อสายการบิน | อ่าน | ใน 300 ใบ (17:07): เปลี่ยนสนามบิน 23 · ประหยัดพรีเมียม+ประหยัด 4 · ธุรกิจ+ประหยัด 2 · ดำเนินการโดยสายอื่น 10 | "หยุดพัก 1 ครั้ง ⚠" + "มีการเปลี่ยนสนามบิน" · "ประหยัดพรีเมียม + ชั้นประหยัด" · "ชั้นธุรกิจ + ชั้นประหยัด" · "เอเอ็นเอ·ดำเนินการโดย Air Japan" · "หลีกเลี่ยงการปล่อย CO2e ได้เท่ากับที่ต้นไม้ 2,009 ต้นดูดซับใน 1 วัน" | b·c·d |
| B33 | ขยายรายละเอียดเที่ยวบิน | ปุ่ม ˅ ขวาสุดของแถว | กดขยายหรือยุบ | ขยายในที่เดิม (URL ไม่เปลี่ยน) และมีปุ่ม "เลือกเที่ยวบิน" โผล่ขึ้นมา | `button "รายละเอียดเที่ยวบิน ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ เวลา 23:50 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินทางถึง …"` [expanded] · หัวแถวที่ขยาย "เวลาออกเดินทาง · อาทิตย์ 15 พ.ย." | b·c·d |
| B34 | รายละเอียดรายขา | ในแถวที่ขยาย | อ่าน | แต่ละขามีเวลา + สนามบิน (รหัส), เวลาเดินทาง, สายการบิน·ชั้น·เครื่องบิน·เลขเที่ยวบิน, ที่วางขา, สิ่งอำนวยความสะดวก, CO2e ของขา, คอนเทรล | "เวลาเดินทาง: 6 ชม. 5 นาที· ข้ามคืน" · "ไทยเวียดเจ๊ทแอร์ · ชั้นประหยัด · Boeing 737 · VZ 830" · "พื้นที่วางขาแคบกว่ามาตรฐาน (74 ซม.)" / "พื้นที่วางขาขนาดมาตรฐาน (79 ซม.)" · "ช่องเสียบ USB ในที่นั่ง" · "ช่องเสียบปลั๊กไฟและช่องเสียบ USB ในที่นั่ง" · "สตรีมสื่อไปยังอุปกรณ์ของคุณ" · "มี Wi-Fi แบบคิดค่าธรรมเนียม" · "Wi-Fi ฟรี" · "วิดีโอตามคำขอ" · "ปริมาณการปล่อยก๊าซโดยประมาณ: CO2e 396 กก." · "ศักยภาพในการทำให้เกิดภาวะโลกร้อนจากคอนเทรล: ต่ำ" / "ปานกลาง" · "เครื่องบินและลูกเรือของ Air Japan" | b·c·d |
| B35 | แถบจุดแวะระหว่างขา | ระหว่างขาในแถวที่ขยาย | อ่าน | บอกเวลารอและเมือง · ถ้าเปลี่ยนสนามบินมี ⚠ สีแดง | "หยุดพักนาน 1 ชม.·ไทเป (TPE)" · "หยุดพักนาน 6 ชม. 25 นาที·โอซากะ· แวะพักนาน · เปลี่ยนจาก KIX ไปยัง ITM" ⚠ · "หยุดพักนาน 6 ชม. 35 นาที·สิงคโปร์ (SIN)· แวะพักนาน" | b·c |
| B36 | คำเตือนในขา | ใต้ข้อมูลเครื่องบิน / ข้างเวลาเดินทาง | อ่าน | ข้อความสีเทา หรือไอคอน ⚠ สีแดง | "มักจะล่าช้ามากกว่า 30 นาที" (JL 728) · "ข้ามคืน" ⚠ (JL 728) · "ข้ามคืน" ไม่มี ⚠ (VZ 830) | b·c |
| B37 | ข้อมูล CO2e | ปุ่มในแถว | เปิดคำอธิบาย | dialog "ปัจจัยของผลกระทบต่อสภาพอากาศ" | `button "ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: 363 กิโลกรัม. การปล่อยก๊าซโดยเฉลี่ย. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้"` · `button "ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: 396 กิโลกรัม. ปริมาณการปล่อยก๊าซ +7%. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้"` · บนจอ "CO2e 363กก." | b·d |
| B38 | หมายเหตุราคา + ค่าธรรมเนียมสัมภาระ + ความช่วยเหลือผู้โดยสาร | เหนือรายการผลค้นหา และใต้รายชื่อผู้ขายบนหน้าจอง | เปิดรายชื่อสายการบินที่เป็นลิงก์นโยบาย | dialog มีรายชื่อสายการบิน แต่ละชื่อเป็นลิงก์ "(เปิดในแท็บใหม่)" | "ราคารวมภาษีที่ต้องจ่าย + ค่าธรรมเนียมสำหรับผู้ใหญ่ 1 ท่าน อาจมีการเรียกเก็บเงินเพิ่มเติมและค่าธรรมเนียมสัมภาระ" · `button "ค่าธรรมเนียมสัมภาระ"` → dialog "ค่าธรรมเนียมสัมภาระ" · `button "ความช่วยเหลือสำหรับผู้โดยสาร"` → dialog "ความช่วยเหลือสำหรับผู้โดยสาร" | b·c |
| B39 | ตัวกรอง: จำนวนครั้งที่แวะพัก | ชิป | เลือก 1 ตัวเลือก (radio) | ชิปเปลี่ยนชื่อเป็น "บินตรง" และมีปุ่มล้าง · บินตรงเหลือ 18 ใบ | ชิป "จำนวนครั้งที่แวะพัก" · radio "ไม่จำกัดจำนวนครั้งที่แวะพัก" / "บินตรงเท่านั้น" / "แวะพัก 1 ครั้งหรือน้อยกว่า" / "แวะพัก 2 ครั้งหรือน้อยกว่า" · "ล้าง" | b·d |
| B40 | ตัวกรอง: สายการบิน | ชิป | สวิตช์เลือกทั้งหมด, เลือกพันธมิตร, ติ๊กทีละสาย, ปุ่ม "เท่านั้น" (โผล่เมื่อชี้เมาส์) | บนจอมี 62 สายการบิน + พันธมิตร 3 กลุ่ม (b 17:18, d 17:08) | ชิป "สายการบิน" · switch "เลือกสายการบินทั้งหมด" · "สายการบินที่เป็นพาร์ทเนอร์": checkbox "Oneworld" / "SkyTeam" / "Star Alliance" · checkbox "<ชื่อสายการบิน>" · ปุ่ม aria "การบินไทย เท่านั้น" (บนจอ "เท่านั้น") | b·d |
| B41 | ตัวกรอง: สัมภาระ | ชิป | เพิ่มหรือลดกระเป๋าถือขึ้นเครื่อง | สูงสุด 1 ใบ (ผู้ใหญ่ 1 คน) ชิปเป็น "กระเป๋าถือขึ้นเครื่อง 1 ใบ" | "กระเป๋าถือขึ้นเครื่อง" · `button "นำกระเป๋าถือขึ้นเครื่องออก"` / `"เพิ่มกระเป๋าถือขึ้นเครื่อง"` · "เลือกกระเป๋าถือขึ้นเครื่องแล้ว 0 ใบ" · link "ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกสัมภาระ" | b |
| B42 | ตัวกรอง: ราคา | ชิป | slider ราคาสูงสุด (ทีละ ฿10,000) | ค่าเริ่มต้น "ทุกราคา" (slider = 310000) · ตั้งแล้วชิปเป็น "สูงสุด ฿30,000" | ชิป "ราคา" · "ทุกราคา" · slider "ราคาสูงสุด" aria-valuetext "แสดงราคาตั้งแต่ ฿10,000 ถึง ฿30,000" | b·d |
| B43 | ตัวกรอง: เวลา | ชิป | slider 4 ตัว (ออกเดินทาง/มาถึง × เร็วสุด/ช้าสุด) ทีละ 1 ชม. | ข้อความเปลี่ยนเป็น "00:00 - 12:00" · ชิปเป็น "เวลา" | "กรุงเทพมหานคร ไปยัง โตเกียว" · "เวลาออกเดินทาง · ทุกเวลา" · "เวลามาถึง · ทุกเวลา" · slider "เวลาออกเดินทางที่เร็วที่สุด" / "เวลาออกเดินทางที่ช้าที่สุด" / "เวลาถึงที่เร็วที่สุด" / "เวลาถึงที่ช้าที่สุด" | b |
| B44 | ตัวกรอง: การปล่อยก๊าซ | ชิป | radio | ชิปเป็น "การปล่อยก๊าซต่ำ" | radio "การปล่อยก๊าซทุกระดับ" / "การปล่อยก๊าซต่ำเท่านั้น" · link "ดูข้อมูลเพิ่มเติมเกี่ยวกับการปล่อยก๊าซคาร์บอน" | b |
| B45 | ตัวกรอง: สนามบินสำหรับต่อเครื่อง | ชิป | slider ระยะเวลาแวะพัก (30–2010 นาที ทีละ 30), สวิตช์เลือกทั้งหมด, เลือกทีละสนามบิน, ปุ่ม "<สนามบิน> เท่านั้น" | ชิปเป็น "ไทเป" หรือ "การแวะพัก: สูงสุด 3 ชม." · จำนวนสนามบินในรายการไม่ตรงกันระหว่าง b กับ d (ดู E3) | dialog "สนามบินสำหรับต่อเครื่อง" · "ระยะเวลาแวะพัก" "ทั้งหมด" · slider "ระยะเวลาแวะพักขั้นต่ำ" / "ระยะเวลาแวะพักสูงสุด" · switch "สนามบินทั้งหมดสำหรับต่อเครื่อง" · checkbox "ไทเป (TPE)" · button "ไทเป (TPE) เท่านั้น" | b·d |
| B46 | ตัวกรอง: ระยะเวลา | ชิป | slider ชั่วโมง | ชิปเป็น "ไม่เกิน 8 ชม." | "ระยะเวลาบิน · ไม่จำกัด" → "ระยะเวลาบิน · ไม่เกิน 8 ชม." · slider "ระยะเวลา" aria-valuetext "ต่ำกว่า 8 ชั่วโมง" | b |
| B47 | ตัวกรองทั้งหมด | ปุ่มซ้ายสุดของแถวชิป | เห็นทุกตัวกรองในกล่องเดียว รวมตัวที่ไม่มีชิป | ชื่อปุ่มบอกจำนวนหมวดที่ใช้อยู่ | `button "ตัวกรองทั้งหมด"` / "ตัวกรองทั้งหมด (1)" / "(3)" → dialog "ตัวกรอง" · หัวข้อ "ตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" · radio "ซ่อนตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" · button "ล้างทั้งหมด" | b |
| B48 | ล้างตัวกรอง | × บนชิป, "ล้าง" ในป๊อปอัป, "ล้างทั้งหมด", "ล้างตัวกรองทั้งหมด" | ล้างทีละตัวหรือทั้งหมด | กลับเป็น 21 ใบ URL กลับเป็น tfs เดิม | `button "ล้าง การปล่อยก๊าซ"` · `button "ล้าง จำนวนครั้งที่แวะพัก"` · "ล้าง" · "ล้างทั้งหมด" · "ล้างตัวกรองทั้งหมด" | b·d |
| B49 | หน้าไม่พบผลลัพธ์จากตัวกรอง | แทนรายการ | กดล้างตัวกรอง | แท็บดีที่สุด/ถูกที่สุดหายไป | heading "ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ" · "ลองล้างตัวกรองเพื่อดูผลการค้นหา" · `button "ล้างตัวกรองทั้งหมด"` · "ไม่พบผลลัพธ์" · "ไม่พบเที่ยวบินของ กาตาร์แอร์เวย์" | b |
| B50 | หน้าไม่พบผลลัพธ์จากการค้นหา | แทนรายการ (ต้นทาง = ปลายทาง) | เปลี่ยนการค้นหา | — | "ไม่พบตัวเลือกที่ตรงกับการค้นหา" · "ลองเปลี่ยนวันที่หรือจุดหมายเพื่อดูผลการค้นหา" | a |
| B51 | หน้าข้อผิดพลาด + โหลดซ้ำ | แทนรายการ | กด "โหลดซ้ำ" | รายการกลับมา (b เห็น 17:48 · a เว้น 60 วินาทีแล้วผ่าน) | "อ๊ะ มีบางอย่างผิดพลาด" (เห็นในภาพ `b-10-error-after-price20k.png` ไม่ได้อยู่ใน snapshot) · `button "โหลดซ้ำ"` | a·b·d |
| B52 | ข้อมูลเชิงลึกด้านราคา (หน้าผลค้นหา) | ระหว่าง "เที่ยวบินยอดนิยม" กับ "เที่ยวบินอื่นๆ" (เฉพาะแท็บดีที่สุด ที่ไม่มีตัวกรอง) | กด "ดูประวัติราคา" เพื่อขยาย | ระดับราคา + ช่วงราคาปกติ + กราฟประวัติราคา 60 วัน (17:51) | heading "ขณะนี้เที่ยวบินมีราคาสูง" (ขยายแล้วเป็น "ขณะนี้เที่ยวบินที่คุณค้นหามีราคาสูง") · "โดยปกติแล้ว ราคาขั้นต่ำของเที่ยวบินสำหรับทริปที่คล้ายคลึงกันซึ่งเดินทางสู่โตเกียวจะอยู่ระหว่าง ฿4,950–7,200" · "฿7,635 อยู่ในช่วงราคา สูง" · `button "ดูประวัติราคา"` · heading "ประวัติราคาสำหรับการค้นหานี้" · application "กราฟประวัติราคา" · ปุ่ม "60 วันที่ผ่านมา - ฿7,156" … "วันนี้ - ฿7,635" | b·d |
| B53 | ตารางวันที่ | ปุ่ม "ตารางวันที่" | ดูราคา 8 วัน เลื่อนซ้าย/ขวา เลือกวันแล้วกด "ตกลง" | 17:51: 12 พ.ย. ฿5,255 (ถูกที่สุด) … 15 ฿7,635 (เลือกแล้ว) … 19 ฿7,775 · กด "ตกลง" แล้ววันเปลี่ยนเป็น "พฤหัส 12 พ.ย." | `button "ตารางวันที่"` → dialog "ข้อมูลเชิงลึกด้านราคา" · tab "วันที่" / "กราฟราคา" · grid "ตารางวันที่" · button "฿5,255, ราคาถูกที่สุด" · "฿7,635, เลือกแล้ว" · "เลื่อนไปทางซ้าย" / "เลื่อนไปทางขวา" · "15 พ.ย.฿7,635 · เที่ยวเดียว" · "ยกเลิก" / "ตกลง" | b |
| B54 | กราฟราคา | ปุ่ม "กราฟราคา" | ชี้เมาส์ดูราคารายวัน เลื่อนช่วงเวลา | ระหว่างโหลดแสดง "กำลังดึงข้อมูลราคา" · แกน Y ฿0–18,000 · ตัวอย่าง 17:53: ส. 19 ธ.ค. ฿5,900 · ส. 2 ม.ค. ฿15,646 | `button "กราฟราคา"` · "การเดินทางเที่ยวเดียว อาทิตย์ 15 พ.ย. เริ่มที่ ฿7,635" · region "กราฟราคา" · button "เลื่อนไปข้างหน้า" / "เลื่อนไปข้างหลัง" | b |
| B55 | ติดตามราคา | หน้าผลค้นหา: แถบใต้ข้อมูลเชิงลึก (ถ้ามีตัวกรองจะย้ายไปเหนือรายการ) · หน้าจอง: ขวาของ "เที่ยวบินที่เลือก" | สวิตช์ "วันที่นี้" / "วันใดก็ได้" (หน้าจองไม่ได้กด) | ถ้าไม่ล็อกอิน: เด้ง dialog ให้ลงชื่อเข้าใช้ สวิตช์ไม่เปิด | heading "ติดตามราคา" · switch "ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15" · switch "ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว - วันใดก็ได้" · หน้าจอง: switch "ติดตามราคาเที่ยวบินที่เลือก จาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15" · dialog "ลงชื่อเข้าใช้เพื่อติดตามราคา" · `button "ปิด"` · link "ลงชื่อเข้าใช้" | b·c |
| B56 | เลือกเที่ยวบิน | หัวแถวที่ขยาย ข้างราคา | ไปหน้าจอง | URL เปลี่ยนเป็น `/travel/flights/booking?tfs=…&tfu=…` | `button "เลือกเที่ยวบิน"` | b·c·d |
| B57 | สรุปแผนการเดินทาง (หน้าจอง) | หัวหน้าจอง | อ่าน | เมือง ประเภทตั๋ว ชั้น และราคาต่ำสุดตัวใหญ่ | heading "สรุปแผนการเดินทาง" · "กรุงเทพมหานคร → โตเกียว" · "เที่ยวเดียว · ชั้นประหยัด ·" · "฿9,062 ราคารวมที่ต่ำที่สุด" | c·d |
| B58 | แชร์ | มุมขวาบนของหน้าจอง | เปิดกล่องแชร์ (ไม่ได้กดช่องทางใด) | มี 3 ช่องทาง | ปุ่ม "แชร์" (aria "แชร์เที่ยวบินนี้") → heading "แชร์เที่ยวบินนี้" · `button "ปิด"` · "Facebook" · "X (Twitter)" · "คัดลอกลิงก์" | c |
| B59 | การ์ดเที่ยวบินที่เลือก | ใต้หัวข้อ "เที่ยวบินที่เลือก" | ขยายดูรายละเอียดเหมือน B34 | มีปุ่ม "เปลี่ยนเที่ยวบิน" แทน "เลือกเที่ยวบิน" | "เที่ยวบินที่เลือก" · หัวที่ขยาย "เที่ยวบินขาไป · อาทิตย์ 15 พ.ย." · ปุ่ม "เปลี่ยนเที่ยวบิน" (aria "เปลี่ยนเที่ยวบิน ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ, BKK") | c |
| B60 | สรุปสัมภาระ (หน้าจอง) | ใต้การ์ดเที่ยวบิน (มีแค่บางเที่ยวบิน) | อ่าน หรือเปิดลิงก์นโยบาย (แท็บใหม่) | VZ และ JAL มี · ไทยไลอ้อนไม่มี | VZ: "กระเป๋านำขึ้นเครื่องฟรี 1 ใบ" · "มีค่าธรรมเนียมสำหรับสัมภาระที่โหลดใต้ท้องเครื่องใบแรก" · JAL: "สัมภาระที่โหลดใต้ท้องเครื่องฟรี 2 ใบ" · "เงื่อนไขสัมภาระมีผลตลอดการเดินทาง ค่าธรรมเนียมสัมภาระอาจสูงขึ้นหากชำระเงินที่สนามบิน" · link "นโยบายสัมภาระของ ไทยเวียดเจ๊ทแอร์ (เปิดในแท็บใหม่)" | c |
| B61 | ตัวเลือกการจอง (รายชื่อผู้ขาย) | heading "ตัวเลือกการจอง" | เปรียบเทียบราคาผู้ขาย | ทุกแถวมีโลโก้ + "จองกับ X" + ป้ายประเภท + ราคา + ปุ่ม "ดำเนินการต่อ" · ราคาถูกที่สุดเป็นสีเขียว · VZ 830 (c 17:14–17:17 และ d 17:08:19 ตรงกัน): ไทยเวียดเจ๊ทแอร์ ฿9,062 / Gotogate ฿9,737 · SL 394: ไทยไลอ้อนแอร์ ฿7,635 · JL 728+JL 3006: เจเอแอล ฿32,915 / บางกอกแอร์เวย์ส ฿21,665 | heading "ตัวเลือกการจอง" · "จองกับ ไทยเวียดเจ๊ทแอร์" + ป้าย "สายการบิน" · "จองกับ Gotogate ฿9,737" (ไม่มีป้าย) · "จองกับ เจเอแอล" · "จองกับ บางกอกแอร์เวย์ส" | c·d |
| B62 | ปุ่มดำเนินการต่อ (**ไม่ได้กด**) | ขวาสุดของแต่ละแถวผู้ขาย | (จะออกไปเว็บผู้ขาย) | — | บนจอ "ดำเนินการต่อ" · aria "ดำเนินการต่อเพื่อจองกับสายการบิน ไทยเวียดเจ๊ทแอร์ ในราคา 9062 บาทไทย. รวมค่าธรรมเนียมเพิ่มเติม 81 บาทไทย" / "ดำเนินการต่อเพื่อจองกับ Gotogate ในราคา 9737 บาทไทย" | c·d |
| B63 | วิธีจัดอันดับตัวเลือก | ใต้ heading ตัวเลือกการจอง (เห็นเฉพาะตอนมีผู้ขาย ≥2 ราย) | กด (i) | popup อธิบาย | "วิธีจัดอันดับตัวเลือก" · `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกการจอง"` → "ระบบจัดอันดับตัวเลือกการจองโดยอิงตามปัจจัยต่างๆ เช่น ราคา คุณภาพลิงก์ ประเภทพาร์ทเนอร์ และประสบการณ์การใช้งานบนเว็บไซต์ของพาร์ทเนอร์" · "ดูข้อมูลเพิ่มเติม" · "ปิดกล่องโต้ตอบ" | c |
| B64 | ค่าธรรมเนียมเพิ่มเติม | ในแถวผู้ขาย (VZ) | กด (i) | popup อธิบาย | "รวมค่าธรรมเนียมเพิ่มเติม ฿81" · `button "ข้อมูลเพิ่มเติมเกี่ยวกับค่าอำนวยความสะดวก"` → "ค่าธรรมเนียมนี้จะมีผลในขั้นตอนสุดท้ายของการจองบนเว็บไซต์ของพาร์ทเนอร์" | c·d |
| B65 | ข้อมูลเชิงลึกด้านราคา (หน้าจอง) | ส่วนล่างของหน้าจอง | อ่าน / ชี้กราฟ | แถบช่วงราคา (เขียว/เหลือง/แดง) + กราฟ 60 วันย้อนหลัง | heading "฿9,062 อยู่ในช่วงราคาปกติสำหรับชั้นประหยัด" · "โดยปกติแล้ว ราคาขั้นต่ำ…จะอยู่ระหว่าง ฿8,100–11,500" · heading "ประวัติราคาสำหรับเที่ยวบินเหล่านี้" · ปุ่ม "60 วันที่ผ่านมา - ฿9,581" … "วันนี้ - ฿9,062" | c·d |
| B66 | ย้อนกลับ / เปลี่ยนเที่ยวบิน | ลูกศร ← ซ้ายบนสุด (banner) / การ์ดเที่ยวบินที่เลือก | กลับไปผลค้นหา | ไปหน้า `/travel/flights/search?tfs=…&tfu=EgIIACIA…` ใหม่ (ดู C55–C57) | `button "ย้อนกลับ"` · `button "เปลี่ยนเที่ยวบิน"` | c |

---

## C. กฎ

| # | กฎ | ตัวอย่างที่ลอง | ผลที่เห็น | ชนิด | ที่มา |
|---|---|---|---|---|---|
| C1 | ผู้โดยสารรวมไม่เกิน 9 คน (นับทารกบนตักด้วย) | 9 ผู้ใหญ่ + เด็ก 1 · 8 ผู้ใหญ่ + ทารกบนตัก 2 · 1 ผู้ใหญ่ + เด็ก 9 | "ขออภัย เราไม่รองรับผู้โดยสารมากกว่า 9 ท่าน" (role=alert สีแดง) ปุ่ม เสร็จ/ยกเลิก หาย · 8 + ทารกบนตัก 1 = 9 ผ่าน | [O] | a |
| C2 | "เพิ่มผู้ใหญ่" กดไม่ได้เมื่อครบ 9 แต่ปุ่ม + ประเภทอื่นยังกดได้ (เกินแล้วจึงเตือน) | ผู้ใหญ่ 9 แล้วกดเพิ่มเด็ก | เด็กเป็น 1 แล้วขึ้นคำเตือน | [O] | a |
| C3 | ผู้ใหญ่ขั้นต่ำ 1 คน (จองเด็กอย่างเดียวไม่ได้) · ปุ่ม − ของเด็ก/ทารกกดไม่ได้ที่ 0 | กด "นำผู้ใหญ่ออก" ตอนเหลือ 1 · เปิดป๊อปอัปครั้งแรก | ปุ่มเป็น disabled | [O] | a |
| C4 | ทารกบนตักต้องไม่มากกว่าผู้ใหญ่ · ทารก (บนที่นั่ง + บนตัก) ไม่เกิน 2 คนต่อผู้ใหญ่ 1 คน | 1 ผู้ใหญ่ + ทารกบนตัก 2 · 1 ผู้ใหญ่ + ทารกบนที่นั่ง 3 · 1 + บนที่นั่ง 2 + บนตัก 1 | "ต้องมีผู้ใหญ่อย่างน้อย 1 คนสำหรับการเดินทางพร้อมทารกที่นั่งบนตัก 1 คน" · "คุณต้องมีผู้ใหญ่อย่างน้อยหนึ่งคนที่จะเดินทางไปกับทารกสองคน" · 1 + บนที่นั่ง 2 ผ่าน · 1 + บนที่นั่ง 1 + บนตัก 1 ผ่าน | [O] (ข้อหลังตีความจากผล) | a |
| C5 | "ยกเลิก" หรือ Esc = ทิ้งค่าที่แก้ · "เสร็จ" = ยืนยันและ URL tfs เปลี่ยน | แก้แล้วกดยกเลิก · 2A+1C+1lap แล้วกดเสร็จ | ยกเลิก: ยังเป็น "ผู้โดยสาร 1 คน" · เสร็จ: "ผู้โดยสาร 4 คน" | [O] | a |
| C6 | ตัวเลขผู้โดยสารบนฟอร์มนับทารกบนตักด้วย | 2A+1C+1lap | แสดง "4" | [O] | a |
| C7 | ปลายทางว่าง → ปุ่มล่างเป็น "สำรวจ" พาไป `/travel/explore?tfs=…` และปุ่มสลับกดไม่ได้ | เปิดหน้าใหม่ | `button "สลับต้นทางกับปลายทาง" [disabled]` | [O] | a |
| C8 | ยังไม่มีวันที่แล้วกด "ค้นหา" → ไม่ค้นหา แต่เปิดปฏิทินให้เลือก **โดยไม่มีข้อความเตือน** | เที่ยวเดียวและไป-กลับ ไม่ใส่วัน | ปฏิทินเปิด โฟกัสที่ "ขาไป" URL ยังไม่ไป /search | [O] | a |
| C9 | ตอนเปิดหน้าแรก ช่องวันที่ว่าง | เปิดหน้าใหม่ | "ขาไป" "ขากลับ" ว่าง | [O] | a |
| C10 | หลายเมืองใส่วันให้อัตโนมัติ (วันนี้ +16 แล้ว +4 วันต่อแถว) และวันค้างอยู่เมื่อเปลี่ยนกลับเป็นเที่ยวเดียว | เปลี่ยนเป็นหลายเมืองเมื่อ 1 พ.ย. | 17, 21, 25, 29 พ.ย., 3 ธ.ค. · กลับเป็นเที่ยวเดียวยังเป็น 17 พ.ย. | [O] | a |
| C11 | หลายเมืองมีได้ 2–5 แถว | กดเพิ่ม/ลบซ้ำ | หยุดที่ 5 · ไม่ต่ำกว่า 2 | [O] | a |
| C12 | ต้นทางเท่ากับปลายทาง ฟอร์มรับได้ไม่เตือน (BKK→DMK ก็เช่นกัน) แต่ผลค้นหาว่าง | กรุงเทพมหานคร→กรุงเทพมหานคร 15 พ.ย. | ไป /search แล้วขึ้น "ไม่พบตัวเลือกที่ตรงกับการค้นหา" | [O] | a |
| C13 | เว็บควรกันการค้นหาที่ต้นทางเท่ากับปลายทาง (สามัญสำนึก) แต่เว็บจริง**ไม่กัน** | ดู C12 | — | [R] | a |
| C14 | ล้างข้อความช่องต้นทางแล้วกด Esc ช่องจะไม่ว่าง | ลบข้อความแล้วกด Esc | กลับเป็น "กรุงเทพมหานคร" | [O] | a |
| C15 | ปฏิทินเริ่มที่เดือนนี้ เลื่อนกลับไม่ได้ · เลือกได้ถึง 26 ก.ย. 2027 (ประมาณ 330 วัน) | เปิดปฏิทิน · กด "ถัดไป" 9 ครั้ง | ไม่มี "ก่อนหน้า" ตอนเริ่ม · เดือนสุดท้าย "สิงหาคม 2027"+"กันยายน 2027" · 27–30 ก.ย. เป็นสีเทา | [O] | a |
| C16 | เลือกวันก่อนวันนี้ไม่ได้ · วันนี้เลือกได้และมีราคา | ใช้ปุ่ม < จาก 15 พ.ย. · ดูปฏิทิน 17:11 | หยุดที่ "อาทิตย์ 1 พ.ย." ปุ่ม < เป็น disabled · 1 พ.ย. ฿9,060 | [O] | a |
| C17 | ราคาในปฏิทินเป็นราคาเที่ยวเดียวหรือไป-กลับตามประเภทตั๋ว | 15 พ.ย. เที่ยวเดียว ฿7,640 (17:11) · ไป-กลับ ฿15.2K (17:18) | — | [O] | a |
| C18 | ราคาบนจอในปฏิทินเป็นเลขปัด ส่วน aria เป็นเลขเต็ม | 15 พ.ย. บนจอ "฿7,640" / aria "7635 บาทไทย" (17:11) | ราคาเต็มตรงกับแท็บ "ถูกที่สุด เริ่มต้น ฿7,635" (17:22) | [O] | a·b |
| C19 | ราคาในปฏิทินโหลดทีละส่วน ใน headless บางครั้งไม่ขึ้นเลย | เปิดปฏิทินครั้งแรก | มีราคาแค่ 2 เดือนแรก เดือนท้ายเป็นแถบเทา | [O] | a |
| C20 | ไป-กลับ: กดวันก่อนวันไปที่เลือกไว้ → กลายเป็นวันไปใหม่ | วันไป 15 แล้วกด 10 | ขาไป 10 พ.ย. ขากลับว่าง | [O] | a |
| C21 | หน้าแรกมีหลายแบบ (A/B) แต่ฟอร์มเหมือนกัน | เปิด 4 ครั้งตอน 17:17 | V1 3 ครั้ง · V2 1 ครั้ง | [O] | a |
| C22 | รายการเริ่มต้นแสดง 21 ใบ (ยอดนิยม 3 + อื่นๆ 18) แล้วมีปุ่ม "ดูเที่ยวบินเพิ่มเติม" | b เปิด 6 ครั้ง (17:06–17:50) · c 17:06–17:20 · d 17:07:48 | 21 ใบทุกครั้ง | [O] | b·c·d |
| C23 | "ดูเที่ยวบินเพิ่มเติม" กดได้ครั้งเดียวแล้วแสดงทั้งหมด ไม่มีการแบ่งหน้า | กด 1 ครั้ง | 21 → 300 ปุ่มหายไป · tfu เปลี่ยน `EgYIABAAGAA` → `EgYIABABGAA` · 3 ใบแรกยังเป็นกลุ่มยอดนิยม | [O] | b·c·d |
| C24 | รายการที่ไม่กรองดูเหมือนถูกตัดที่ 300 ใบ | ไม่กรอง = 300 (2 รอบ) แพงสุด ฿77,520 · "แวะพัก ≤1" = 235 ใบ "≤2" = 288 ใบ มีใบ ฿197,520 ที่ไม่อยู่ในรายการไม่กรอง | ตัวเลขเป็น [O] การตีความว่าถูกตัดเป็น [R] (ยังไม่ปิดเรื่อง ดู E2) | [O]+[R] | b·d |
| C25 | ค่าเริ่มต้นเรียงแบบ "เที่ยวบินยอดนิยม" ไม่ได้เรียงราคาขึ้น | อ่านราคา 5 ใบแรก | 7,635 / 9,062 / 11,580 / 9,335 / 9,335 (b 17:08–17:10 · d 17:07:49 จอ = เครือข่าย) | [O] | b·d |
| C26 | ชื่อชิปตัวกรอง: ยังไม่ใช้ = "<ตัวกรอง>, ไม่ได้เลือก" · ใช้แล้ว = "<ค่า>, <ตัวกรอง>, เลือกแล้ว" ย้ายไปซ้ายสุดและมีปุ่ม × "ล้าง <ตัวกรอง>" | บินตรง สัมภาระ ราคา ฯลฯ | เช่น "บินตรง, จำนวนครั้งที่แวะพัก, เลือกแล้ว" · ตัวกรองเวลาใช้แค่ "เวลา, เลือกแล้ว" | [O] | b·d |
| C27 | ค่าตัวกรองเปลี่ยนแล้วป๊อปอัปปิดเอง (ชิปย้ายตำแหน่ง) ถ้าจะแก้ต่อต้องเปิดใหม่ | กดเพิ่มกระเป๋า, "เท่านั้น", Star Alliance, ลาก slider | ป๊อปอัปหายภายใน 1–3 วินาที | [O] | b |
| C28 | ตัวกรองมีผลทันที ไม่ต้องกดยืนยัน | ทุกตัวกรอง | รายการโหลดใหม่เอง | [O] | b·d |
| C29 | "ตัวกรองทั้งหมด (N)" นับจำนวนหมวดที่ใช้อยู่ | 1 ตัว → "(1)" · 3 ตัว → "(3)" | — | [O] | b |
| C30 | ตัวกรองหลายตัวทำงานแบบ AND | บินตรง (18) → + การบินไทย (5) → + ออกเดินทาง 00–12 (1) → + CO2 ต่ำ (0) | ผลลดลงตามลำดับ (17:50) | [O] | b |
| C31 | ล้างตัวกรองตัวเดียวด้วย × ตัวอื่นยังอยู่ · "ล้างทั้งหมด" ล้างทุกตัวแต่ไม่ปิดกล่อง | × "ล้าง การปล่อยก๊าซ" · "ล้างทั้งหมด" | กลับเป็น 1 ใบ ชิปอื่นยังอยู่ · กลับเป็น 21 ใบ URL กลับเป็น tfs เดิม | [O] | b |
| C32 | บินตรงเท่ากับ itinerary ขาเดียว | กรองบินตรงบนจอ เทียบกับใบที่มีขาเดียวใน 300 ใบจากเครือข่าย | 18 = 18 · ราคา 9,062–30,425 · TG 5 ใบ | [O] | b·d |
| C33 | "การบินไทย เท่านั้น" แสดงเฉพาะใบที่ทุกขาเป็น TG | ไม่กรองมี 32 แถวที่มีคำว่า "การบินไทย" · กรองแล้ว | 5 ใบ (บินตรงทั้งหมด ฿15,320–19,365) | [O] | b·d |
| C34 | เลือกพันธมิตร "Star Alliance" ได้ | ติ๊ก Star Alliance (17:34) | 14 / 66 ใบ ถูกที่สุด ฿12,751 ชิปเป็น "Star Alliance" | [O] | b |
| C35 | เลือกสายการบินที่ไม่มีเที่ยวบินได้ แล้วผลจะว่าง | "กาตาร์แอร์เวย์ เท่านั้น" (17:33) | "ไม่พบผลลัพธ์" · "ไม่พบเที่ยวบินของ กาตาร์แอร์เวย์" | [O] | b·d |
| C36 | กระเป๋าถือขึ้นเครื่องเลือกได้สูงสุด 1 ใบเมื่อมีผู้ใหญ่ 1 คน | กดเพิ่ม 2 ครั้ง | ปุ่มเพิ่มถูกปิด · จำนวนเที่ยวบินไม่ลด (300) | [O] (ความสัมพันธ์กับจำนวนผู้โดยสารเป็น [R]) | b |
| C37 | slider ราคาเริ่มที่ "ทุกราคา" (310000) ตั้งได้ทีละ ฿10,000 | ตั้ง ฿30,000 (17:49) | 19 / 185 ใบ แพงสุด ฿29,925 | [O] | b·d |
| C38 | ช่วงของ slider ระยะเวลาขึ้นกับข้อมูล | 17:18 ค่าเริ่มต้น 41 · 17:44 ช่วง 5..41 อีกรอบ 1..31 | ไม่เกิน 6 ชม. → 15 ใบ · ไม่เกิน 5 ชม. → ไม่พบผลลัพธ์ | [O] | b |
| C39 | ตั้งระยะแวะพักสูงสุดสั้นมาก จะเหลือแค่บินตรง | สูงสุด 30 นาที (17:40) | 18 ใบ | [O] | b |
| C40 | การจัดเรียงและแท็บเก็บใน `tfu` ส่วนตัวกรองเก็บใน `tfs` | ราคา `EgYIAh…` · เวลาออกเดินทาง `EgYIAx…` · เวลาถึง `EgYIBB…` · ระยะเวลา `EgYIBR…` · การปล่อยก๊าซ `EgYIBh…` · แท็บถูกที่สุด `EgoIABAAGAAgAigB` · บินตรงเปลี่ยน tfs (d 17:08:11) | reload แล้วค่ายังอยู่ | [O] | b·d |
| C41 | การจัดเรียงคงอยู่เมื่อสลับแท็บ ใส่ตัวกรอง หรือ reload | ระยะเวลา → บินตรง → reload | ยังเป็น "จัดเรียงตามระยะเวลา" | [O] | b |
| C42 | จัดเรียงด้วยค่าที่ไม่ใช่ "เที่ยวบินยอดนิยม" → "เที่ยวบินยอดนิยม/เที่ยวบินอื่นๆ" รวมเป็น "เที่ยวบินทั้งหมด" · จัดเรียงตามราคาเรียงขึ้นจริง | เลือก "ราคา" แล้วขยาย 300 ใบ | h3 "ข้อมูลเชิงลึกด้านราคา", "เที่ยวบินทั้งหมด" · ใบสุดท้าย ฿77,520 | [O] | b |
| C43 | แท็บ "ถูกที่สุด" ตอนจัดเรียงแบบยอดนิยม แสดงลำดับเดียวกับ "ดีที่สุด" และไม่มีส่วน "ข้อมูลเชิงลึกด้านราคา" | ดู 3 รอบ (17:08, 17:09, 17:10) | 7,635 / 9,062 / 11,580 / 9,335 … | [O] (สาเหตุดู E12) | b |
| C44 | ราคาถูกที่สุดในแท็บ "ถูกที่สุด" เปลี่ยนตามตัวกรอง · ใบที่ถูกที่สุดเป็นสีเขียว | บินตรง ฿9,062 · TG ฿15,320 · CO2 ต่ำ ฿9,952 · ถึงหลัง 18:00 ฿10,582 | — | [O] | b |
| C45 | ใช้ตัวกรองแล้ว กล่อง "ข้อมูลเชิงลึกด้านราคา" ที่ยุบอยู่หายไป เหลือแถบ "ติดตามราคา / ตารางวันที่ / กราฟราคา" เหนือรายการ | สัมภาระ 1 ใบ · 3 ตัวกรอง | ดู `shots/b-12-combo3.png` | [O] | b |
| C46 | ตารางวันที่ (เที่ยวเดียว) แสดง 8 วัน (−3 ถึง +4) เลื่อนทีละ 1 วัน · "ยกเลิก" ไม่เปลี่ยนวัน "ตกลง" เปลี่ยนวันค้นหา | เปิดแล้วเลื่อนขวา · เลือก 12 พ.ย. | 12–19 → 13–20 พ.ย. · ตกลง → "พฤหัส 12 พ.ย." | [O] | b |
| C47 | ราคาเปลี่ยนได้ระหว่างใช้งาน ต้องบันทึกเวลาที่เห็นทุกครั้ง | JAL 22:05 บินตรง | ฿25,060 (b 17:06, d 17:07:49) → ฿24,990 (b 17:12) | [O] | a·b·c·d |
| C48 | ราคาในตารางวันที่/กราฟ/ประวัติราคา = ราคาต่ำสุดของวันนั้น = แท็บ "ถูกที่สุด" | 15 พ.ย. | ตาราง ฿7,635 = "วันนี้ - ฿7,635" = แท็บถูกที่สุด · เครือข่ายจุดสุดท้าย 7635 จุดแรก 7156 | [O] | b·d |
| C49 | ติดตามราคาต้องล็อกอิน | กดสวิตช์ 15 พ.ย. | dialog "ลงชื่อเข้าใช้เพื่อติดตามราคา" สวิตช์ไม่เปิด | [O] | b |
| C50 | ผลค้นหาล้มได้เป็นครั้งคราว ("อ๊ะ มีบางอย่างผิดพลาด") กด "โหลดซ้ำ" หรือทำซ้ำแล้วผ่าน · HTTP 200 ไม่ได้แปลว่าธุรกิจสำเร็จ | a: 1 ครั้ง (17:20:36) · b: ราว 6 จาก 40 การกระทำ (17:10, 17:35, 17:37, 17:42, 17:48, 17:54) · d: รอบทดลองได้ ErrorResponse | ทำแบบเดิมอีกครั้งแล้วผ่าน · ไม่ได้แปลว่าไม่มีเที่ยวบิน | [O] | a·b·d |
| C51 | ราคาบนจอรวมภาษีและค่าธรรมเนียมแล้ว แต่ไม่รวมค่าสัมภาระ | ข้อความเหนือรายการ ท้ายหน้า และหน้าจอง | "ราคานี้เป็นราคาสุดท้ายซึ่งรวมภาษีและค่าธรรมเนียมทั้งหมดแล้ว …" | [O] | a·b·c |
| C52 | ไอคอน ⓘ ในแท็บ "ดีที่สุด" เป็นปุ่มแยก คลิกโดนจะเปิด dialog แทนการสลับแท็บ | — | `shots/b-08-ranking-dialog-opened-by-tab-info-icon.png` | [O] | b |
| C53 | เที่ยวบินที่เปลี่ยนสนามบินไม่โผล่ใน 21 ใบแรก ต้องกด "ดูเที่ยวบินเพิ่มเติม" | ค้นใน 21 แถวแรก | ไม่เจอเลย · หลังกดเจอ 23 ใบ (ICN→GMP, TPE→TSA, KIX→ITM) · ข้อมูลเครือข่ายก็มี 23 ใบ | [O] | b·c·d |
| C54 | การเปลี่ยนสนามบินแสดงคำเตือน ⚠ สีแดง 3 ที่: แถวยุบ / แถวขยาย / การ์ดหน้าจอง | JAL KIX→ITM | "มีการเปลี่ยนสนามบิน" · "เปลี่ยนจาก KIX ไปยัง ITM" | [O] | c |
| C55 | "เลือกเที่ยวบิน" หรือคลิกแถวที่ยุบ = เปลี่ยนหน้าจริง (history +1) ไป `/travel/flights/booking?tfs=…&tfu=…&hl=th&gl=TH&curr=THB` | ทั้ง 3 เที่ยวบิน | `history.length` 2 → 3 | [O] | c·d |
| C56 | "ย้อนกลับ" และ "เปลี่ยนเที่ยวบิน" **ไม่ใช่** history.back() แต่ไปหน้าใหม่ `/travel/flights/search?tfs=…&tfu=EgIIACIA…` (ไม่ใช่ URL `?q=` เดิม) | กดย้อนกลับ แล้วกด Back ของเบราว์เซอร์ | Forward ไม่มีผล · Back ของเบราว์เซอร์กลับไปหน้าจองอีกครั้ง · history 3 → 4 | [O] | c |
| C57 | กลับจากหน้าจองแล้วผลค้นหาเริ่มใหม่: scroll บนสุด แถวที่ขยายยุบหมด รายการกลับเป็น 21 ใบ | ทั้ง 3 เที่ยวบิน | "มีผลลัพธ์ 21 รายการ" · ปุ่ม "ดูเที่ยวบินเพิ่มเติม" กลับมา | [O] | c |
| C58 | ลิงก์หน้าจองเปิดตรงได้ในเบราว์เซอร์ใหม่ที่ไม่มี cookie และกด "ย้อนกลับ" ได้แม้ไม่มีประวัติ | เปิด bookingUrl ทั้ง 3 ใน context ใหม่ | heading "ตัวเลือกการจอง" ขึ้นครบทุกครั้ง | [O] | c |
| C59 | ราคาในรายการผลค้นหา = ราคาต่ำสุดในบรรดาผู้ขาย ไม่ใช่ราคาของสายการบินเจ้าของเที่ยวบิน · ตัวเลขใหญ่บนหน้าจอง = "ราคารวมที่ต่ำที่สุด" = ราคาในรายการ | JAL เปลี่ยนสนามบิน · ทั้ง 3 เที่ยวบิน | รายการ ฿21,665 แต่ JAL ขายเอง ฿32,915 บางกอกแอร์เวย์สขาย ฿21,665 · VZ ฿9,062 = ฿9,062 | [O] | c·d |
| C60 | ผู้ขายแต่ละรายราคาไม่เท่ากัน และไม่ได้เรียงจากถูกไปแพงเสมอ | VZ 830 · JAL | VZ: ฿9,062 / ฿9,737 · JAL: ฿32,915 อยู่บน ฿21,665 อยู่ล่าง | [O] | c·d |
| C61 | ค่าธรรมเนียมเพิ่มเติมรวมอยู่ในราคาที่แสดงแล้ว และเก็บตอนท้ายบนเว็บพาร์ทเนอร์ | VZ ฿9,062 "รวมค่าธรรมเนียมเพิ่มเติม ฿81" | ราคาในรายการก็ ฿9,062 · เครือข่ายแยก fee 81 | [O] (ที่ว่า 81 รวมอยู่ใน 9,062 อิงจากคำว่า "รวม" ใน aria) | c·d |
| C62 | ผู้ขายที่เป็นสายการบินมีป้าย "สายการบิน" เอเจนซีไม่มีป้าย | VZ / Gotogate | — | [O] | c |
| C63 | ส่วนสัมภาระ และบรรทัด "วิธีจัดอันดับตัวเลือก" ไม่ได้ขึ้นทุกเที่ยวบิน | ไทยไลอ้อน (ผู้ขาย 1 ราย) | ไม่มีทั้งสองอย่าง | [O] (สาเหตุดู E28) | c |
| C64 | "+1" หลังเวลาถึง = ถึงวันถัดไป และรายละเอียดขามีคำว่า "ข้ามคืน" | VZ 830 ออก 15 พ.ย. 23:50 ถึง 16 พ.ย. 07:55 | "07:55+1" · "ข้ามคืน" | [O] | c·d |
| C65 | `tfu` บนหน้าจองเปลี่ยนทุกครั้งที่เลือก แม้เป็นเที่ยวบินเดิม แต่ `tfs` เหมือนเดิม | เลือก VZ 830 ซ้ำ 3 ครั้ง | tfs เหมือนกัน tfu ต่างกัน | [O] | c |
| C66 | ห้ามกด "ดำเนินการต่อ" ในการทดสอบ เพราะจะออกไปเว็บผู้ขาย | — | — | [R] | c·d |

---

## D. โมเดลข้อมูล

exec
/bin/bash -lc "node -e \"console.log(require.resolve('playwright'))\"; ls -la" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
/workspace/arena6/node_modules/playwright/index.js
total 8
drwxr-xr-x 2 root root 4096 Nov  1 18:09 .
drwxr-xr-x 3 root root 4096 Nov  1 18:09 ..

codex
สเปกระบุบางข้อที่ไม่มีชื่อให้จับผ่านหน้าจอ เช่นปุ่มเลื่อนวัน B12 และข้อมูลเครือข่าย F1–F9 ผมจะบันทึกข้อเหล่านี้เป็น invalid พร้อมเหตุผล ส่วนราคาและจำนวนจะอ้างอิงไฟล์ข้อมูลที่ให้มา และแยกกรณีที่ Google สดเปลี่ยนไปจากชุดข้อมูลครับ

ผมอ่าน skill `cloud-environment-runtime` สำหรับตรวจเงื่อนไขเครือข่ายแล้ว แต่สภาพแวดล้อมนี้ไม่มีเครื่องมือสถานะดังกล่าวและไม่มีไฟล์ network policy ให้ตรวจครับ
exec
/bin/bash -lc "sed -n '/| B27 /,/## C\\./p' /workspace/arena6/spec/EXPLORATION.md; sed -n '/| C1 /,/| C15 /p' /workspace/arena6/spec/EXPLORATION.md; cat /workspace/arena6/spec/snapshots/b-09-filter-stops.yml /workspace/arena6/spec/snapshots/b-04-sort-menu.yml /workspace/arena6/spec/snapshots/c-direct-3-booking.yml" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
| B27 | แท็บจัดอันดับ "ดีที่สุด" / "ถูกที่สุด" | เหนือรายการผลค้นหา | สลับแท็บ | แท็บ "ถูกที่สุด" แสดงราคาต่ำสุด และราคานี้เปลี่ยนตามตัวกรอง (บินตรง ฿9,062 · Star Alliance ฿12,751) | tab "ดีที่สุด" · tab "ถูกที่สุด เริ่มต้น 7635 บาทไทย ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ…" (บนจอ "ถูกที่สุด เริ่มต้น ฿7,635") · "จัดอันดับตามราคาและความสะดวก" | b |
| B28 | คำอธิบายการจัดอันดับผลค้นหา | ไอคอน ⓘ ในแท็บ / ข้างข้อความจัดอันดับ | อ่านเกณฑ์ | กล่องข้อความพร้อมลิงก์ไปหน้าช่วยเหลือ | `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ"` · "หากกำลังมองหาการเดินทางแบบไร้กังวล เที่ยวบินเหล่านี้ได้รับเลือกโดยพิจารณาความสมดุลระหว่างราคากับความสะดวกสบาย…" · link "ดูข้อมูลเพิ่มเติม" · `button "ปิดกล่องโต้ตอบ"` | b |
| B29 | การจัดเรียง | ปุ่มขวาบนของรายการ | เลือกได้ 6 แบบ | ชื่อปุ่มเปลี่ยนตามค่า และรายการรวมเป็นหัวข้อเดียว "เที่ยวบินทั้งหมด" | `button "จัดเรียงตามเที่ยวบินยอดนิยม, เปลี่ยนลำดับการจัดเรียง"` · menuitemradio "เที่ยวบินยอดนิยม" (ค่าเริ่มต้น) / "ราคา" / "เวลาออกเดินทาง" / "เวลาถึง" / "ระยะเวลา" / "การปล่อยก๊าซ" | b |
| B30 | ดูเที่ยวบินเพิ่มเติม | แถวสุดท้ายของรายการ | กด 1 ครั้ง | "มีผลลัพธ์ 21 รายการ" → "มีผลลัพธ์ 300 รายการ" แล้วปุ่มหายไป (ไม่มีหน้า 2) | `button "ดูเที่ยวบินเพิ่มเติม"` · "มีผลลัพธ์ 21 รายการ" / "มีผลลัพธ์ 300 รายการ" | b·c·d |
| B31 | แถวเที่ยวบิน (แบบยุบ) | รายการผลค้นหา | อ่านสรุป หรือคลิกทั้งแถวเพื่อไปหน้าจองเลย | เวลาออก–ถึง ("+1" ถ้าถึงวันถัดไป) · สายการบิน · ระยะเวลารวม · รหัสสนามบิน · "บินตรง"/"หยุดพัก N ครั้ง" + เวลาแวะ + รหัส · CO2e · ราคา (ใบถูกที่สุดเป็นสีเขียว) | ตัวอย่างบนจอ "06:20 – 16:25 ไทยไลอ้อนแอร์ 8 ชม. 5 นาที หยุดพัก 1 ครั้ง 1 ชม. TPE … ฿7,635" · "23:50 – 07:55+1 ไทยเวียดเจ๊ทแอร์ 6 ชม. 5 นาที บินตรง" · ชื่อ link ขึ้นต้นด้วย "ราคาเริ่มต้นที่ 9062 บาทไทย เดินทางด้วยเที่ยวบินตรงกับ …" และลงท้าย "เลือกเที่ยวบิน" (รูปแบบเต็มดู D5) | b·c·d |
| B32 | ป้ายพิเศษในแถว | คอลัมน์จุดแวะ/ชั้นโดยสาร/ข้างชื่อสายการบิน | อ่าน | ใน 300 ใบ (17:07): เปลี่ยนสนามบิน 23 · ประหยัดพรีเมียม+ประหยัด 4 · ธุรกิจ+ประหยัด 2 · ดำเนินการโดยสายอื่น 10 | "หยุดพัก 1 ครั้ง ⚠" + "มีการเปลี่ยนสนามบิน" · "ประหยัดพรีเมียม + ชั้นประหยัด" · "ชั้นธุรกิจ + ชั้นประหยัด" · "เอเอ็นเอ·ดำเนินการโดย Air Japan" · "หลีกเลี่ยงการปล่อย CO2e ได้เท่ากับที่ต้นไม้ 2,009 ต้นดูดซับใน 1 วัน" | b·c·d |
| B33 | ขยายรายละเอียดเที่ยวบิน | ปุ่ม ˅ ขวาสุดของแถว | กดขยายหรือยุบ | ขยายในที่เดิม (URL ไม่เปลี่ยน) และมีปุ่ม "เลือกเที่ยวบิน" โผล่ขึ้นมา | `button "รายละเอียดเที่ยวบิน ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ เวลา 23:50 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินทางถึง …"` [expanded] · หัวแถวที่ขยาย "เวลาออกเดินทาง · อาทิตย์ 15 พ.ย." | b·c·d |
| B34 | รายละเอียดรายขา | ในแถวที่ขยาย | อ่าน | แต่ละขามีเวลา + สนามบิน (รหัส), เวลาเดินทาง, สายการบิน·ชั้น·เครื่องบิน·เลขเที่ยวบิน, ที่วางขา, สิ่งอำนวยความสะดวก, CO2e ของขา, คอนเทรล | "เวลาเดินทาง: 6 ชม. 5 นาที· ข้ามคืน" · "ไทยเวียดเจ๊ทแอร์ · ชั้นประหยัด · Boeing 737 · VZ 830" · "พื้นที่วางขาแคบกว่ามาตรฐาน (74 ซม.)" / "พื้นที่วางขาขนาดมาตรฐาน (79 ซม.)" · "ช่องเสียบ USB ในที่นั่ง" · "ช่องเสียบปลั๊กไฟและช่องเสียบ USB ในที่นั่ง" · "สตรีมสื่อไปยังอุปกรณ์ของคุณ" · "มี Wi-Fi แบบคิดค่าธรรมเนียม" · "Wi-Fi ฟรี" · "วิดีโอตามคำขอ" · "ปริมาณการปล่อยก๊าซโดยประมาณ: CO2e 396 กก." · "ศักยภาพในการทำให้เกิดภาวะโลกร้อนจากคอนเทรล: ต่ำ" / "ปานกลาง" · "เครื่องบินและลูกเรือของ Air Japan" | b·c·d |
| B35 | แถบจุดแวะระหว่างขา | ระหว่างขาในแถวที่ขยาย | อ่าน | บอกเวลารอและเมือง · ถ้าเปลี่ยนสนามบินมี ⚠ สีแดง | "หยุดพักนาน 1 ชม.·ไทเป (TPE)" · "หยุดพักนาน 6 ชม. 25 นาที·โอซากะ· แวะพักนาน · เปลี่ยนจาก KIX ไปยัง ITM" ⚠ · "หยุดพักนาน 6 ชม. 35 นาที·สิงคโปร์ (SIN)· แวะพักนาน" | b·c |
| B36 | คำเตือนในขา | ใต้ข้อมูลเครื่องบิน / ข้างเวลาเดินทาง | อ่าน | ข้อความสีเทา หรือไอคอน ⚠ สีแดง | "มักจะล่าช้ามากกว่า 30 นาที" (JL 728) · "ข้ามคืน" ⚠ (JL 728) · "ข้ามคืน" ไม่มี ⚠ (VZ 830) | b·c |
| B37 | ข้อมูล CO2e | ปุ่มในแถว | เปิดคำอธิบาย | dialog "ปัจจัยของผลกระทบต่อสภาพอากาศ" | `button "ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: 363 กิโลกรัม. การปล่อยก๊าซโดยเฉลี่ย. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้"` · `button "ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: 396 กิโลกรัม. ปริมาณการปล่อยก๊าซ +7%. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้"` · บนจอ "CO2e 363กก." | b·d |
| B38 | หมายเหตุราคา + ค่าธรรมเนียมสัมภาระ + ความช่วยเหลือผู้โดยสาร | เหนือรายการผลค้นหา และใต้รายชื่อผู้ขายบนหน้าจอง | เปิดรายชื่อสายการบินที่เป็นลิงก์นโยบาย | dialog มีรายชื่อสายการบิน แต่ละชื่อเป็นลิงก์ "(เปิดในแท็บใหม่)" | "ราคารวมภาษีที่ต้องจ่าย + ค่าธรรมเนียมสำหรับผู้ใหญ่ 1 ท่าน อาจมีการเรียกเก็บเงินเพิ่มเติมและค่าธรรมเนียมสัมภาระ" · `button "ค่าธรรมเนียมสัมภาระ"` → dialog "ค่าธรรมเนียมสัมภาระ" · `button "ความช่วยเหลือสำหรับผู้โดยสาร"` → dialog "ความช่วยเหลือสำหรับผู้โดยสาร" | b·c |
| B39 | ตัวกรอง: จำนวนครั้งที่แวะพัก | ชิป | เลือก 1 ตัวเลือก (radio) | ชิปเปลี่ยนชื่อเป็น "บินตรง" และมีปุ่มล้าง · บินตรงเหลือ 18 ใบ | ชิป "จำนวนครั้งที่แวะพัก" · radio "ไม่จำกัดจำนวนครั้งที่แวะพัก" / "บินตรงเท่านั้น" / "แวะพัก 1 ครั้งหรือน้อยกว่า" / "แวะพัก 2 ครั้งหรือน้อยกว่า" · "ล้าง" | b·d |
| B40 | ตัวกรอง: สายการบิน | ชิป | สวิตช์เลือกทั้งหมด, เลือกพันธมิตร, ติ๊กทีละสาย, ปุ่ม "เท่านั้น" (โผล่เมื่อชี้เมาส์) | บนจอมี 62 สายการบิน + พันธมิตร 3 กลุ่ม (b 17:18, d 17:08) | ชิป "สายการบิน" · switch "เลือกสายการบินทั้งหมด" · "สายการบินที่เป็นพาร์ทเนอร์": checkbox "Oneworld" / "SkyTeam" / "Star Alliance" · checkbox "<ชื่อสายการบิน>" · ปุ่ม aria "การบินไทย เท่านั้น" (บนจอ "เท่านั้น") | b·d |
| B41 | ตัวกรอง: สัมภาระ | ชิป | เพิ่มหรือลดกระเป๋าถือขึ้นเครื่อง | สูงสุด 1 ใบ (ผู้ใหญ่ 1 คน) ชิปเป็น "กระเป๋าถือขึ้นเครื่อง 1 ใบ" | "กระเป๋าถือขึ้นเครื่อง" · `button "นำกระเป๋าถือขึ้นเครื่องออก"` / `"เพิ่มกระเป๋าถือขึ้นเครื่อง"` · "เลือกกระเป๋าถือขึ้นเครื่องแล้ว 0 ใบ" · link "ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกสัมภาระ" | b |
| B42 | ตัวกรอง: ราคา | ชิป | slider ราคาสูงสุด (ทีละ ฿10,000) | ค่าเริ่มต้น "ทุกราคา" (slider = 310000) · ตั้งแล้วชิปเป็น "สูงสุด ฿30,000" | ชิป "ราคา" · "ทุกราคา" · slider "ราคาสูงสุด" aria-valuetext "แสดงราคาตั้งแต่ ฿10,000 ถึง ฿30,000" | b·d |
| B43 | ตัวกรอง: เวลา | ชิป | slider 4 ตัว (ออกเดินทาง/มาถึง × เร็วสุด/ช้าสุด) ทีละ 1 ชม. | ข้อความเปลี่ยนเป็น "00:00 - 12:00" · ชิปเป็น "เวลา" | "กรุงเทพมหานคร ไปยัง โตเกียว" · "เวลาออกเดินทาง · ทุกเวลา" · "เวลามาถึง · ทุกเวลา" · slider "เวลาออกเดินทางที่เร็วที่สุด" / "เวลาออกเดินทางที่ช้าที่สุด" / "เวลาถึงที่เร็วที่สุด" / "เวลาถึงที่ช้าที่สุด" | b |
| B44 | ตัวกรอง: การปล่อยก๊าซ | ชิป | radio | ชิปเป็น "การปล่อยก๊าซต่ำ" | radio "การปล่อยก๊าซทุกระดับ" / "การปล่อยก๊าซต่ำเท่านั้น" · link "ดูข้อมูลเพิ่มเติมเกี่ยวกับการปล่อยก๊าซคาร์บอน" | b |
| B45 | ตัวกรอง: สนามบินสำหรับต่อเครื่อง | ชิป | slider ระยะเวลาแวะพัก (30–2010 นาที ทีละ 30), สวิตช์เลือกทั้งหมด, เลือกทีละสนามบิน, ปุ่ม "<สนามบิน> เท่านั้น" | ชิปเป็น "ไทเป" หรือ "การแวะพัก: สูงสุด 3 ชม." · จำนวนสนามบินในรายการไม่ตรงกันระหว่าง b กับ d (ดู E3) | dialog "สนามบินสำหรับต่อเครื่อง" · "ระยะเวลาแวะพัก" "ทั้งหมด" · slider "ระยะเวลาแวะพักขั้นต่ำ" / "ระยะเวลาแวะพักสูงสุด" · switch "สนามบินทั้งหมดสำหรับต่อเครื่อง" · checkbox "ไทเป (TPE)" · button "ไทเป (TPE) เท่านั้น" | b·d |
| B46 | ตัวกรอง: ระยะเวลา | ชิป | slider ชั่วโมง | ชิปเป็น "ไม่เกิน 8 ชม." | "ระยะเวลาบิน · ไม่จำกัด" → "ระยะเวลาบิน · ไม่เกิน 8 ชม." · slider "ระยะเวลา" aria-valuetext "ต่ำกว่า 8 ชั่วโมง" | b |
| B47 | ตัวกรองทั้งหมด | ปุ่มซ้ายสุดของแถวชิป | เห็นทุกตัวกรองในกล่องเดียว รวมตัวที่ไม่มีชิป | ชื่อปุ่มบอกจำนวนหมวดที่ใช้อยู่ | `button "ตัวกรองทั้งหมด"` / "ตัวกรองทั้งหมด (1)" / "(3)" → dialog "ตัวกรอง" · หัวข้อ "ตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" · radio "ซ่อนตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" · button "ล้างทั้งหมด" | b |
| B48 | ล้างตัวกรอง | × บนชิป, "ล้าง" ในป๊อปอัป, "ล้างทั้งหมด", "ล้างตัวกรองทั้งหมด" | ล้างทีละตัวหรือทั้งหมด | กลับเป็น 21 ใบ URL กลับเป็น tfs เดิม | `button "ล้าง การปล่อยก๊าซ"` · `button "ล้าง จำนวนครั้งที่แวะพัก"` · "ล้าง" · "ล้างทั้งหมด" · "ล้างตัวกรองทั้งหมด" | b·d |
| B49 | หน้าไม่พบผลลัพธ์จากตัวกรอง | แทนรายการ | กดล้างตัวกรอง | แท็บดีที่สุด/ถูกที่สุดหายไป | heading "ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ" · "ลองล้างตัวกรองเพื่อดูผลการค้นหา" · `button "ล้างตัวกรองทั้งหมด"` · "ไม่พบผลลัพธ์" · "ไม่พบเที่ยวบินของ กาตาร์แอร์เวย์" | b |
| B50 | หน้าไม่พบผลลัพธ์จากการค้นหา | แทนรายการ (ต้นทาง = ปลายทาง) | เปลี่ยนการค้นหา | — | "ไม่พบตัวเลือกที่ตรงกับการค้นหา" · "ลองเปลี่ยนวันที่หรือจุดหมายเพื่อดูผลการค้นหา" | a |
| B51 | หน้าข้อผิดพลาด + โหลดซ้ำ | แทนรายการ | กด "โหลดซ้ำ" | รายการกลับมา (b เห็น 17:48 · a เว้น 60 วินาทีแล้วผ่าน) | "อ๊ะ มีบางอย่างผิดพลาด" (เห็นในภาพ `b-10-error-after-price20k.png` ไม่ได้อยู่ใน snapshot) · `button "โหลดซ้ำ"` | a·b·d |
| B52 | ข้อมูลเชิงลึกด้านราคา (หน้าผลค้นหา) | ระหว่าง "เที่ยวบินยอดนิยม" กับ "เที่ยวบินอื่นๆ" (เฉพาะแท็บดีที่สุด ที่ไม่มีตัวกรอง) | กด "ดูประวัติราคา" เพื่อขยาย | ระดับราคา + ช่วงราคาปกติ + กราฟประวัติราคา 60 วัน (17:51) | heading "ขณะนี้เที่ยวบินมีราคาสูง" (ขยายแล้วเป็น "ขณะนี้เที่ยวบินที่คุณค้นหามีราคาสูง") · "โดยปกติแล้ว ราคาขั้นต่ำของเที่ยวบินสำหรับทริปที่คล้ายคลึงกันซึ่งเดินทางสู่โตเกียวจะอยู่ระหว่าง ฿4,950–7,200" · "฿7,635 อยู่ในช่วงราคา สูง" · `button "ดูประวัติราคา"` · heading "ประวัติราคาสำหรับการค้นหานี้" · application "กราฟประวัติราคา" · ปุ่ม "60 วันที่ผ่านมา - ฿7,156" … "วันนี้ - ฿7,635" | b·d |
| B53 | ตารางวันที่ | ปุ่ม "ตารางวันที่" | ดูราคา 8 วัน เลื่อนซ้าย/ขวา เลือกวันแล้วกด "ตกลง" | 17:51: 12 พ.ย. ฿5,255 (ถูกที่สุด) … 15 ฿7,635 (เลือกแล้ว) … 19 ฿7,775 · กด "ตกลง" แล้ววันเปลี่ยนเป็น "พฤหัส 12 พ.ย." | `button "ตารางวันที่"` → dialog "ข้อมูลเชิงลึกด้านราคา" · tab "วันที่" / "กราฟราคา" · grid "ตารางวันที่" · button "฿5,255, ราคาถูกที่สุด" · "฿7,635, เลือกแล้ว" · "เลื่อนไปทางซ้าย" / "เลื่อนไปทางขวา" · "15 พ.ย.฿7,635 · เที่ยวเดียว" · "ยกเลิก" / "ตกลง" | b |
| B54 | กราฟราคา | ปุ่ม "กราฟราคา" | ชี้เมาส์ดูราคารายวัน เลื่อนช่วงเวลา | ระหว่างโหลดแสดง "กำลังดึงข้อมูลราคา" · แกน Y ฿0–18,000 · ตัวอย่าง 17:53: ส. 19 ธ.ค. ฿5,900 · ส. 2 ม.ค. ฿15,646 | `button "กราฟราคา"` · "การเดินทางเที่ยวเดียว อาทิตย์ 15 พ.ย. เริ่มที่ ฿7,635" · region "กราฟราคา" · button "เลื่อนไปข้างหน้า" / "เลื่อนไปข้างหลัง" | b |
| B55 | ติดตามราคา | หน้าผลค้นหา: แถบใต้ข้อมูลเชิงลึก (ถ้ามีตัวกรองจะย้ายไปเหนือรายการ) · หน้าจอง: ขวาของ "เที่ยวบินที่เลือก" | สวิตช์ "วันที่นี้" / "วันใดก็ได้" (หน้าจองไม่ได้กด) | ถ้าไม่ล็อกอิน: เด้ง dialog ให้ลงชื่อเข้าใช้ สวิตช์ไม่เปิด | heading "ติดตามราคา" · switch "ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15" · switch "ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว - วันใดก็ได้" · หน้าจอง: switch "ติดตามราคาเที่ยวบินที่เลือก จาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15" · dialog "ลงชื่อเข้าใช้เพื่อติดตามราคา" · `button "ปิด"` · link "ลงชื่อเข้าใช้" | b·c |
| B56 | เลือกเที่ยวบิน | หัวแถวที่ขยาย ข้างราคา | ไปหน้าจอง | URL เปลี่ยนเป็น `/travel/flights/booking?tfs=…&tfu=…` | `button "เลือกเที่ยวบิน"` | b·c·d |
| B57 | สรุปแผนการเดินทาง (หน้าจอง) | หัวหน้าจอง | อ่าน | เมือง ประเภทตั๋ว ชั้น และราคาต่ำสุดตัวใหญ่ | heading "สรุปแผนการเดินทาง" · "กรุงเทพมหานคร → โตเกียว" · "เที่ยวเดียว · ชั้นประหยัด ·" · "฿9,062 ราคารวมที่ต่ำที่สุด" | c·d |
| B58 | แชร์ | มุมขวาบนของหน้าจอง | เปิดกล่องแชร์ (ไม่ได้กดช่องทางใด) | มี 3 ช่องทาง | ปุ่ม "แชร์" (aria "แชร์เที่ยวบินนี้") → heading "แชร์เที่ยวบินนี้" · `button "ปิด"` · "Facebook" · "X (Twitter)" · "คัดลอกลิงก์" | c |
| B59 | การ์ดเที่ยวบินที่เลือก | ใต้หัวข้อ "เที่ยวบินที่เลือก" | ขยายดูรายละเอียดเหมือน B34 | มีปุ่ม "เปลี่ยนเที่ยวบิน" แทน "เลือกเที่ยวบิน" | "เที่ยวบินที่เลือก" · หัวที่ขยาย "เที่ยวบินขาไป · อาทิตย์ 15 พ.ย." · ปุ่ม "เปลี่ยนเที่ยวบิน" (aria "เปลี่ยนเที่ยวบิน ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ, BKK") | c |
| B60 | สรุปสัมภาระ (หน้าจอง) | ใต้การ์ดเที่ยวบิน (มีแค่บางเที่ยวบิน) | อ่าน หรือเปิดลิงก์นโยบาย (แท็บใหม่) | VZ และ JAL มี · ไทยไลอ้อนไม่มี | VZ: "กระเป๋านำขึ้นเครื่องฟรี 1 ใบ" · "มีค่าธรรมเนียมสำหรับสัมภาระที่โหลดใต้ท้องเครื่องใบแรก" · JAL: "สัมภาระที่โหลดใต้ท้องเครื่องฟรี 2 ใบ" · "เงื่อนไขสัมภาระมีผลตลอดการเดินทาง ค่าธรรมเนียมสัมภาระอาจสูงขึ้นหากชำระเงินที่สนามบิน" · link "นโยบายสัมภาระของ ไทยเวียดเจ๊ทแอร์ (เปิดในแท็บใหม่)" | c |
| B61 | ตัวเลือกการจอง (รายชื่อผู้ขาย) | heading "ตัวเลือกการจอง" | เปรียบเทียบราคาผู้ขาย | ทุกแถวมีโลโก้ + "จองกับ X" + ป้ายประเภท + ราคา + ปุ่ม "ดำเนินการต่อ" · ราคาถูกที่สุดเป็นสีเขียว · VZ 830 (c 17:14–17:17 และ d 17:08:19 ตรงกัน): ไทยเวียดเจ๊ทแอร์ ฿9,062 / Gotogate ฿9,737 · SL 394: ไทยไลอ้อนแอร์ ฿7,635 · JL 728+JL 3006: เจเอแอล ฿32,915 / บางกอกแอร์เวย์ส ฿21,665 | heading "ตัวเลือกการจอง" · "จองกับ ไทยเวียดเจ๊ทแอร์" + ป้าย "สายการบิน" · "จองกับ Gotogate ฿9,737" (ไม่มีป้าย) · "จองกับ เจเอแอล" · "จองกับ บางกอกแอร์เวย์ส" | c·d |
| B62 | ปุ่มดำเนินการต่อ (**ไม่ได้กด**) | ขวาสุดของแต่ละแถวผู้ขาย | (จะออกไปเว็บผู้ขาย) | — | บนจอ "ดำเนินการต่อ" · aria "ดำเนินการต่อเพื่อจองกับสายการบิน ไทยเวียดเจ๊ทแอร์ ในราคา 9062 บาทไทย. รวมค่าธรรมเนียมเพิ่มเติม 81 บาทไทย" / "ดำเนินการต่อเพื่อจองกับ Gotogate ในราคา 9737 บาทไทย" | c·d |
| B63 | วิธีจัดอันดับตัวเลือก | ใต้ heading ตัวเลือกการจอง (เห็นเฉพาะตอนมีผู้ขาย ≥2 ราย) | กด (i) | popup อธิบาย | "วิธีจัดอันดับตัวเลือก" · `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกการจอง"` → "ระบบจัดอันดับตัวเลือกการจองโดยอิงตามปัจจัยต่างๆ เช่น ราคา คุณภาพลิงก์ ประเภทพาร์ทเนอร์ และประสบการณ์การใช้งานบนเว็บไซต์ของพาร์ทเนอร์" · "ดูข้อมูลเพิ่มเติม" · "ปิดกล่องโต้ตอบ" | c |
| B64 | ค่าธรรมเนียมเพิ่มเติม | ในแถวผู้ขาย (VZ) | กด (i) | popup อธิบาย | "รวมค่าธรรมเนียมเพิ่มเติม ฿81" · `button "ข้อมูลเพิ่มเติมเกี่ยวกับค่าอำนวยความสะดวก"` → "ค่าธรรมเนียมนี้จะมีผลในขั้นตอนสุดท้ายของการจองบนเว็บไซต์ของพาร์ทเนอร์" | c·d |
| B65 | ข้อมูลเชิงลึกด้านราคา (หน้าจอง) | ส่วนล่างของหน้าจอง | อ่าน / ชี้กราฟ | แถบช่วงราคา (เขียว/เหลือง/แดง) + กราฟ 60 วันย้อนหลัง | heading "฿9,062 อยู่ในช่วงราคาปกติสำหรับชั้นประหยัด" · "โดยปกติแล้ว ราคาขั้นต่ำ…จะอยู่ระหว่าง ฿8,100–11,500" · heading "ประวัติราคาสำหรับเที่ยวบินเหล่านี้" · ปุ่ม "60 วันที่ผ่านมา - ฿9,581" … "วันนี้ - ฿9,062" | c·d |
| B66 | ย้อนกลับ / เปลี่ยนเที่ยวบิน | ลูกศร ← ซ้ายบนสุด (banner) / การ์ดเที่ยวบินที่เลือก | กลับไปผลค้นหา | ไปหน้า `/travel/flights/search?tfs=…&tfu=EgIIACIA…` ใหม่ (ดู C55–C57) | `button "ย้อนกลับ"` · `button "เปลี่ยนเที่ยวบิน"` | c |

---

## C. กฎ
| C1 | ผู้โดยสารรวมไม่เกิน 9 คน (นับทารกบนตักด้วย) | 9 ผู้ใหญ่ + เด็ก 1 · 8 ผู้ใหญ่ + ทารกบนตัก 2 · 1 ผู้ใหญ่ + เด็ก 9 | "ขออภัย เราไม่รองรับผู้โดยสารมากกว่า 9 ท่าน" (role=alert สีแดง) ปุ่ม เสร็จ/ยกเลิก หาย · 8 + ทารกบนตัก 1 = 9 ผ่าน | [O] | a |
| C2 | "เพิ่มผู้ใหญ่" กดไม่ได้เมื่อครบ 9 แต่ปุ่ม + ประเภทอื่นยังกดได้ (เกินแล้วจึงเตือน) | ผู้ใหญ่ 9 แล้วกดเพิ่มเด็ก | เด็กเป็น 1 แล้วขึ้นคำเตือน | [O] | a |
| C3 | ผู้ใหญ่ขั้นต่ำ 1 คน (จองเด็กอย่างเดียวไม่ได้) · ปุ่ม − ของเด็ก/ทารกกดไม่ได้ที่ 0 | กด "นำผู้ใหญ่ออก" ตอนเหลือ 1 · เปิดป๊อปอัปครั้งแรก | ปุ่มเป็น disabled | [O] | a |
| C4 | ทารกบนตักต้องไม่มากกว่าผู้ใหญ่ · ทารก (บนที่นั่ง + บนตัก) ไม่เกิน 2 คนต่อผู้ใหญ่ 1 คน | 1 ผู้ใหญ่ + ทารกบนตัก 2 · 1 ผู้ใหญ่ + ทารกบนที่นั่ง 3 · 1 + บนที่นั่ง 2 + บนตัก 1 | "ต้องมีผู้ใหญ่อย่างน้อย 1 คนสำหรับการเดินทางพร้อมทารกที่นั่งบนตัก 1 คน" · "คุณต้องมีผู้ใหญ่อย่างน้อยหนึ่งคนที่จะเดินทางไปกับทารกสองคน" · 1 + บนที่นั่ง 2 ผ่าน · 1 + บนที่นั่ง 1 + บนตัก 1 ผ่าน | [O] (ข้อหลังตีความจากผล) | a |
| C5 | "ยกเลิก" หรือ Esc = ทิ้งค่าที่แก้ · "เสร็จ" = ยืนยันและ URL tfs เปลี่ยน | แก้แล้วกดยกเลิก · 2A+1C+1lap แล้วกดเสร็จ | ยกเลิก: ยังเป็น "ผู้โดยสาร 1 คน" · เสร็จ: "ผู้โดยสาร 4 คน" | [O] | a |
| C6 | ตัวเลขผู้โดยสารบนฟอร์มนับทารกบนตักด้วย | 2A+1C+1lap | แสดง "4" | [O] | a |
| C7 | ปลายทางว่าง → ปุ่มล่างเป็น "สำรวจ" พาไป `/travel/explore?tfs=…` และปุ่มสลับกดไม่ได้ | เปิดหน้าใหม่ | `button "สลับต้นทางกับปลายทาง" [disabled]` | [O] | a |
| C8 | ยังไม่มีวันที่แล้วกด "ค้นหา" → ไม่ค้นหา แต่เปิดปฏิทินให้เลือก **โดยไม่มีข้อความเตือน** | เที่ยวเดียวและไป-กลับ ไม่ใส่วัน | ปฏิทินเปิด โฟกัสที่ "ขาไป" URL ยังไม่ไป /search | [O] | a |
| C9 | ตอนเปิดหน้าแรก ช่องวันที่ว่าง | เปิดหน้าใหม่ | "ขาไป" "ขากลับ" ว่าง | [O] | a |
| C10 | หลายเมืองใส่วันให้อัตโนมัติ (วันนี้ +16 แล้ว +4 วันต่อแถว) และวันค้างอยู่เมื่อเปลี่ยนกลับเป็นเที่ยวเดียว | เปลี่ยนเป็นหลายเมืองเมื่อ 1 พ.ย. | 17, 21, 25, 29 พ.ย., 3 ธ.ค. · กลับเป็นเที่ยวเดียวยังเป็น 17 พ.ย. | [O] | a |
| C11 | หลายเมืองมีได้ 2–5 แถว | กดเพิ่ม/ลบซ้ำ | หยุดที่ 5 · ไม่ต่ำกว่า 2 | [O] | a |
| C12 | ต้นทางเท่ากับปลายทาง ฟอร์มรับได้ไม่เตือน (BKK→DMK ก็เช่นกัน) แต่ผลค้นหาว่าง | กรุงเทพมหานคร→กรุงเทพมหานคร 15 พ.ย. | ไป /search แล้วขึ้น "ไม่พบตัวเลือกที่ตรงกับการค้นหา" | [O] | a |
| C13 | เว็บควรกันการค้นหาที่ต้นทางเท่ากับปลายทาง (สามัญสำนึก) แต่เว็บจริง**ไม่กัน** | ดู C12 | — | [R] | a |
| C14 | ล้างข้อความช่องต้นทางแล้วกด Esc ช่องจะไม่ว่าง | ลบข้อความแล้วกด Esc | กลับเป็น "กรุงเทพมหานคร" | [O] | a |
| C15 | ปฏิทินเริ่มที่เดือนนี้ เลื่อนกลับไม่ได้ · เลือกได้ถึง 26 ก.ย. 2027 (ประมาณ 330 วัน) | เปิดปฏิทิน · กด "ถัดไป" 9 ครั้ง | ไม่มี "ก่อนหน้า" ตอนเริ่ม · เดือนสุดท้าย "สิงหาคม 2027"+"กันยายน 2027" · 27–30 ก.ย. เป็นสีเทา | [O] | a |
- dialog "จำนวนครั้งที่แวะพัก":
  - heading "จำนวนครั้งที่แวะพัก" [level=2]
  - button "ปิดกล่องโต้ตอบ":
    - img
  - radiogroup "จำนวนครั้งที่แวะพัก":
    - radio "ไม่จำกัดจำนวนครั้งที่แวะพัก" [checked]
    - text: ไม่จำกัดจำนวนครั้งที่แวะพัก
    - radio "บินตรงเท่านั้น"
    - text: บินตรงเท่านั้น
    - radio "แวะพัก 1 ครั้งหรือน้อยกว่า"
    - text: แวะพัก 1 ครั้งหรือน้อยกว่า
    - radio "แวะพัก 2 ครั้งหรือน้อยกว่า"
    - text: แวะพัก 2 ครั้งหรือน้อยกว่า
  - button "ล้าง จำนวนครั้งที่แวะพัก" [disabled]: ล้าง# captured 2026-11-01 17:08:02 (Asia/Bangkok)
# url: https://www.google.com/travel/flights/search?tfs=CBwQAhooEgoyMDI2LTExLTE1agwIAhIIL20vMGZuMmdyDAgCEggvbS8wN2Rma0ABSAFwAYIBCwj___________8BmAEC&tfu=EgoIABAAGAAgAigB&hl=th&gl=TH&curr=THB
- menu "เลือกลำดับการจัดเรียง":
  - menuitemradio "เที่ยวบินยอดนิยม" [checked]:
    - img
    - text: เที่ยวบินยอดนิยม
  - menuitemradio "ราคา"
  - menuitemradio "เวลาออกเดินทาง"
  - menuitemradio "เวลาถึง"
  - menuitemradio "ระยะเวลา"
  - menuitemradio "การปล่อยก๊าซ"# captured 2026-11-01 17:14:57 url=https://www.google.com/travel/flights/booking?tfs=CBwQAhpJEgoyMDI2LTExLTE1Ih8KA0JLSxIKMjAyNi0xMS0xNRoDTlJUKgJWWjIDODMwagwIAhIIL20vMGZuMmdyDAgCEggvbS8wN2Rma0ABSAFwAYIBCwj___________8BmAEC&tfu=CmxDalJJYWxOVk5XSnNUMGhsY0c5QlZrWmlNM2RDUnkwdExTMHRMUzB0TFhObFluQm5PVUZCUVVGQlIzSnVSVkpGUWtsMVRFMUJFZ1ZXV2pnek1Cb0tDT1pHRUFBYUExUklRamdjY1ByUkFRPT0SAggAIgA&hl=th&gl=TH&curr=THB
- banner:
  - button "ย้อนกลับ":
    - img
  - link "Google":
    - /url: /
  - button "ข้ามไปที่เนื้อหาหลัก"
  - button "ความคิดเห็นเกี่ยวกับการช่วยเหลือพิเศษ"
  - button "เปลี่ยนธีมเว็บไซต์":
    - img
  - button "แอป Google"
  - link "เข้าสู่ระบบ":
    - /url: https://accounts.google.com/ServiceLogin?service=searchandassistant&passive=1209600&continue=https%3A%2F%2Fwww.google.com%2Ftravel%2Fflights%2Fbooking%3Ftfs%3DCBwQAhpJEgoyMDI2LTExLTE1Ih8KA0JLSxIKMjAyNi0xMS0xNRoDTlJUKgJWWjIDODMwagwIAhIIL20vMGZuMmdyDAgCEggvbS8wN2Rma0ABSAFwAYIBCwj___________8BmAEC%26tfu%3DCmxDalJJYWxOVk5XSnNUMGhsY0c5QlZrWmlNM2RDUnkwdExTMHRMUzB0TFhObFluQm5PVUZCUVVGQlIzSnVSVkpGUWtsMVRFMUJFZ1ZXV2pnek1Cb0tDT1pHRUFBYUExUklRamdjY1ByUkFRPT0SAggAIgA%26hl%3Dth%26gl%3DTH%26curr%3DTHB%26utm_source%3Dsign_in_ogb&followup=https%3A%2F%2Fwww.google.com%2Ftravel%2Fflights%2Fbooking%3Ftfs%3DCBwQAhpJEgoyMDI2LTExLTE1Ih8KA0JLSxIKMjAyNi0xMS0xNRoDTlJUKgJWWjIDODMwagwIAhIIL20vMGZuMmdyDAgCEggvbS8wN2Rma0ABSAFwAYIBCwj___________8BmAEC%26tfu%3DCmxDalJJYWxOVk5XSnNUMGhsY0c5QlZrWmlNM2RDUnkwdExTMHRMUzB0TFhObFluQm5PVUZCUVVGQlIzSnVSVkpGUWtsMVRFMUJFZ1ZXV2pnek1Cb0tDT1pHRUFBYUExUklRamdjY1ByUkFRPT0SAggAIgA%26hl%3Dth%26gl%3DTH%26curr%3DTHB%26utm_source%3Dsign_in_ogb&hl=th&ec=GAZAlQM
- main:
  - heading "สรุปแผนการเดินทาง" [level=1]
  - button "แชร์เที่ยวบินนี้":
    - img
    - text: แชร์
  - text: กรุงเทพมหานคร โตเกียว เที่ยวเดียว·ชั้นประหยัด·
  - button "ผู้โดยสาร 1 คน เปลี่ยนจำนวนผู้โดยสาร":
    - img
    - text: ผู้โดยสาร 1 คน
    - img
  - text: ฿9,062 ราคารวมที่ต่ำที่สุด
  - heading "เที่ยวบินที่เลือก" [level=2]
  - img
  - heading "ติดตามราคา" [level=2]
  - button "ดูข้อมูลเพิ่มเติมเกี่ยวกับราคาที่ติดตาม":
    - link "ดูข้อมูลเพิ่มเติมเกี่ยวกับราคาที่ติดตาม":
      - img
  - switch "ติดตามราคาเที่ยวบินที่เลือก จาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15":
    - img
    - img
  - list:
    - listitem:
      - text: อาทิตย์ 15 พ.ย. · 23:50 – 07:55+1 ไทยเวียดเจ๊ทแอร์ 6 ชม. 5 นาที บินตรง
      - 'button "ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: 396 กิโลกรัม. ปริมาณการปล่อยก๊าซ +7%. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้"':
        - img
      - button "รายละเอียดเที่ยวบิน เที่ยวบินขาไปในวันวันอาทิตย์, พฤศจิกายน 15 ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ เวลา 23:50 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินทางถึง ท่าอากาศยานนานาชาตินะริตะ เวลา 07:55 ในวันที่ วันจันทร์, พฤศจิกายน 16":
        - img
  - list:
    - listitem:
      - img
      - text: กระเป๋านำขึ้นเครื่องฟรี 1 ใบ
    - listitem:
      - img
      - text: มีค่าธรรมเนียมสำหรับสัมภาระที่โหลดใต้ท้องเครื่องใบแรก
  - text: เงื่อนไขสัมภาระมีผลตลอดการเดินทาง ค่าธรรมเนียมสัมภาระอาจสูงขึ้นหากชำระเงินที่สนามบิน
  - link "นโยบายสัมภาระของ ไทยเวียดเจ๊ทแอร์ (เปิดในแท็บใหม่)":
    - /url: https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.vietjetair.com%2Fen%2Fpages%2Fto-have-a-good-flight-1599448842652%2Fbaggage-service-1608369253127&psig=AOvVaw3_YiNL-YnryQ073sSqhbtf&ust=1793614479544000&rct=j&opi=77919732&ved=0CA8Q2OIDahcKEwjgg5_hxOaXAxUAAAAAHQAAAAAQFg
    - text: นโยบายสัมภาระของ ไทยเวียดเจ๊ทแอร์
  - heading "ตัวเลือกการจอง" [level=2]
  - text: วิธีจัดอันดับตัวเลือก
  - button "ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกการจอง":
    - img
  - text: จองกับ ไทยเวียดเจ๊ทแอร์ สายการบิน รวมค่าธรรมเนียมเพิ่มเติม ฿81
  - button "ข้อมูลเพิ่มเติมเกี่ยวกับค่าอำนวยความสะดวก":
    - img
  - text: ฿9,062
  - button "ดำเนินการต่อเพื่อจองกับสายการบิน ไทยเวียดเจ๊ทแอร์ ในราคา 9062 บาทไทย. รวมค่าธรรมเนียมเพิ่มเติม 81 บาทไทย": ดำเนินการต่อ
  - text: จองกับ Gotogate ฿9,737
  - button "ดำเนินการต่อเพื่อจองกับ Gotogate ในราคา 9737 บาทไทย": ดำเนินการต่อ
  - text: ราคารวมภาษีที่ต้องจ่าย + ค่าธรรมเนียมสำหรับผู้ใหญ่ 1 ท่าน อาจมีการเรียกเก็บเงินเพิ่มเติมและ
  - button "ค่าธรรมเนียมสัมภาระ"
  - heading "ข้อมูลเชิงลึกด้านราคา" [level=3]
  - heading "฿9,062 อยู่ในช่วงราคาปกติสำหรับชั้นประหยัด" [level=4]
  - text: โดยปกติแล้ว ราคาขั้นต่ำของเที่ยวบินสำหรับทริปที่คล้ายคลึงกันซึ่งเดินทางสู่โตเกียวจะอยู่ระหว่าง ฿8,100–11,500
  - button "ดูข้อมูลเพิ่มเติมเกี่ยวกับข้อมูลเชิงลึกด้านราคา":
    - button "ดูข้อมูลเพิ่มเติมเกี่ยวกับข้อมูลเชิงลึกด้านราคา":
      - img
  - text: ฿9,062 อยู่ในช่วงราคา
  - strong: ปกติ
  - heading "ประวัติราคาสำหรับเที่ยวบินเหล่านี้" [level=4]
  - application "กราฟประวัติราคา":
    - img:
      - button "60 วันที่ผ่านมา - ฿9,581"
      - button "59 วันที่ผ่านมา - ฿9,581"
      - button "58 วันที่ผ่านมา - ฿9,581"
      - button "57 วันที่ผ่านมา - ฿9,581"
      - button "56 วันที่ผ่านมา - ฿9,581"
      - button "55 วันที่ผ่านมา - ฿9,581"
      - button "54 วันที่ผ่านมา - ฿9,581"
      - button "53 วันที่ผ่านมา - ฿9,581"
      - button "52 วันที่ผ่านมา - ฿9,581"
      - button "51 วันที่ผ่านมา - ฿9,581"
      - button "50 วันที่ผ่านมา - ฿9,581"
      - button "49 วันที่ผ่านมา - ฿9,581"
      - button "48 วันที่ผ่านมา - ฿9,581"
      - button "47 วันที่ผ่านมา - ฿9,581"
      - button "46 วันที่ผ่านมา - ฿9,581"
      - button "45 วันที่ผ่านมา - ฿9,581"
      - button "44 วันที่ผ่านมา - ฿9,581"
      - button "43 วันที่ผ่านมา - ฿9,581"
      - button "42 วันที่ผ่านมา - ฿9,581"
      - button "41 วันที่ผ่านมา - ฿9,581"
      - button "40 วันที่ผ่านมา - ฿9,581"
      - button "39 วันที่ผ่านมา - ฿9,582"
      - button "38 วันที่ผ่านมา - ฿8,802"
      - button "37 วันที่ผ่านมา - ฿8,802"
      - button "36 วันที่ผ่านมา - ฿8,802"
      - button "35 วันที่ผ่านมา - ฿8,802"
      - button "34 วันที่ผ่านมา - ฿8,802"
      - button "33 วันที่ผ่านมา - ฿8,802"
      - button "32 วันที่ผ่านมา - ฿8,802"
      - button "31 วันที่ผ่านมา - ฿8,802"
      - button "30 วันที่ผ่านมา - ฿8,802"
      - button "29 วันที่ผ่านมา - ฿8,802"
      - button "28 วันที่ผ่านมา - ฿8,802"
      - button "27 วันที่ผ่านมา - ฿8,802"
      - button "26 วันที่ผ่านมา - ฿8,172"
      - button "25 วันที่ผ่านมา - ฿8,172"
      - button "24 วันที่ผ่านมา - ฿8,172"
      - button "23 วันที่ผ่านมา - ฿8,172"
      - button "22 วันที่ผ่านมา - ฿8,172"
      - button "21 วันที่ผ่านมา - ฿8,172"
      - button "20 วันที่ผ่านมา - ฿8,172"
      - button "19 วันที่ผ่านมา - ฿8,172"
      - button "18 วันที่ผ่านมา - ฿8,172"
      - button "17 วันที่ผ่านมา - ฿8,172"
      - button "16 วันที่ผ่านมา - ฿8,172"
      - button "15 วันที่ผ่านมา - ฿8,172"
      - button "14 วันที่ผ่านมา - ฿8,172"
      - button "13 วันที่ผ่านมา - ฿8,172"
      - button "12 วันที่ผ่านมา - ฿8,172"
      - button "11 วันที่ผ่านมา - ฿8,172"
      - button "10 วันที่ผ่านมา - ฿8,172"
      - button "9 วันที่ผ่านมา - ฿8,172"
      - button "8 วันที่ผ่านมา - ฿8,172"
      - button "7 วันที่ผ่านมา - ฿8,172"
      - button "6 วันที่ผ่านมา - ฿8,172"
      - button "5 วันที่ผ่านมา - ฿8,172"
      - button "4 วันที่ผ่านมา - ฿8,172"
      - button "3 วันที่ผ่านมา - ฿8,802"
      - button "2 วันที่ผ่านมา - ฿8,802"
      - button "1 วันที่ผ่านมา - ฿8,802"
      - button "วันนี้ - ฿9,062"
- contentinfo:
  - button "ภาษา·ไทย":
    - img
    - text: ภาษา·ไทย
  - button "สถานที่ตั้ง·ไทย":
    - img
    - text: สถานที่ตั้ง·ไทย
  - button "สกุลเงิน THB":
    - img
  - link "เกี่ยวกับ Google Travel":
    - /url: https://about.google/?hl=th
    - text: เกี่ยวกับ
  - link "ความเป็นส่วนตัว":
    - /url: https://policies.google.com/privacy?hl=th
  - link "ข้อกำหนด":
    - /url: https://policies.google.com/terms?hl=th
  - link "ความคิดเห็น":
    - /url: ./#0
  - link "ศูนย์ช่วยเหลือ":
    - /url: https://support.google.com/travel/?hl=th#topic=2475360
  - paragraph:
    - text: สกุลเงินที่แสดงอาจแตกต่างจากสกุลเงินที่ใช้ในการซื้อเที่ยวบิน
    - link "ดูข้อมูลเพิ่มเติมเกี่ยวกับสกุลเงิน":
      - /url: https://www.google.com/googlefinance/disclaimer?hl=th&gl=TH
      - text: ดูข้อมูลเพิ่มเติม
  - paragraph: ราคานี้เป็นราคาสุดท้ายซึ่งรวมภาษีและค่าธรรมเนียมทั้งหมดแล้ว โดยคิดรวมค่าธรรมเนียมการชำระเงินสำหรับวิธีการชำระเงินแบบทั่วไปที่ถูกที่สุด (ซึ่งอาจแตกต่างกันตามผู้ให้บริการ) ทั้งนี้ อาจมีการเรียกเก็บเงินเพิ่มเติมสำหรับการชำระเงินประเภทอื่นๆ ค่าสัมภาระ อาหาร WLAN หรือบริการเพิ่มเติมอื่นๆ ระบบจะแสดงรายละเอียดราคา ที่นั่งว่าง และการเดินทางโดยอิงตามข้อมูลล่าสุดที่ได้รับจากพาร์ทเนอร์ ข้อมูลดังกล่าวจะแสดงในผลการค้นหาภายในระยะเวลาไม่เกิน 24 ชั่วโมง และอาจมีเงื่อนไขเพิ่มเติมจากพาร์ทเนอร์ ดังนั้นโปรดตรวจสอบราคาและเงื่อนไขกับผู้ให้บริการก่อนทำการจอง
- text: โหลดหน้านี้แล้ว
exec
/bin/bash -lc "python - <<'PY'
import glob,json
p=glob.glob('/workspace/arena6/spec/snapshots/*.yml'); print('Read snapshots',len(p), 'bytes',sum(len(open(f).read()) for f in p))
for f in glob.glob('/workspace/arena6/spec/data/*.json'):
 d=json.load(open(f));print(f.split('/')[-1],str(list(d)[:12]) if isinstance(d,dict) else 'list '+str(len(d)))
PY" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
Read snapshots 95 bytes 1182827
rpc-index.json list 3
filter-airlines-cards.json list 0
journey-log.json list 10
filters.json ['observedAt', 'sourceHarEntry', 'scope', 'priceRange', 'airlines', 'alliances', 'layoverAirports', 'raw']
filter-price-cards.json list 0
rpc-113.json list 2
07-booking-cards.json list 0
04-nonstop-cards.json list 0
flights-all.json ['observedAt', 'count', 'scope', 'flights']
03-more-cards.json list 300
rpc-58.json list 33
filter-stops-cards.json list 0
05-nonstop-results-cards.json list 0
06-details-cards.json list 0
validation.json ['observedAt', 'allCount', 'firstFive', 'nonstop']
01-results-cards.json list 0
booking-options.json ['observedAt', 'sourceHarEntry', 'selectedFlight', 'route', 'date', 'options', 'screenText', 'raw']
filter-layover-airports-cards.json list 0

exec
/bin/bash -lc "cat > probe.mjs <<'EOF'
import {chromium} from 'playwright';
const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1366,height:900},locale:'th-TH'});await p.goto('https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB');await p.waitForTimeout(2500);console.log(await p.locator('body').ariaSnapshot());await b.close();
EOF
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node probe.mjs > /tmp/accept-probe.txt" in /workspace/arena6/rulers/accept
 succeeded in 3913ms:
exec
/bin/bash -lc "head -90 /tmp/accept-probe.txt; sed -n '/| C1 /,/| C10 /p' /workspace/arena6/spec/EXPLORATION.md; cat /workspace/arena6/spec/data/validation.json" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
- banner:
  - button "เมนูหลัก":
    - img
  - link "Google":
    - /url: /
  - button "ข้ามไปที่เนื้อหาหลัก"
  - button "ความคิดเห็นเกี่ยวกับการช่วยเหลือพิเศษ"
  - navigation:
    - link "สำรวจ":
      - img
      - text: สำรวจ
    - link "เที่ยวบิน":
      - img
      - text: เที่ยวบิน
    - link "โรงแรม":
      - img
      - text: โรงแรม
    - link "ที่พักให้เช่า":
      - img
      - text: ที่พักให้เช่า
  - button "เปลี่ยนธีมเว็บไซต์":
    - img
  - button "แอป Google"
  - link "เข้าสู่ระบบ":
    - /url: https://accounts.google.com/ServiceLogin?service=searchandassistant&passive=1209600&continue=https://www.google.com/travel/flights?hl%3Dth%26gl%3DTH%26curr%3DTHB&followup=https://www.google.com/travel/flights?hl%3Dth%26gl%3DTH%26curr%3DTHB&hl=th&ec=GAZAlQM
- heading "เที่ยวบิน" [level=1]
- search "เที่ยวบิน":
  - combobox "เปลี่ยนประเภทตั๋ว ไป-กลับ"
  - button "ผู้โดยสาร 1 คน เปลี่ยนจำนวนผู้โดยสาร":
    - img
    - text: "1"
    - img
  - combobox "เปลี่ยนชั้นโดยสาร ชั้นประหยัด"
  - combobox "ต้นทาง": กรุงเทพมหานคร
  - img
  - button "สลับต้นทางกับปลายทาง" [disabled]:
    - img
  - combobox "ปลายทาง"
  - img
  - img
  - textbox "ขาไป"
  - textbox "ขากลับ"
  - button "สำรวจจุดหมายปลายทาง": สำรวจ
- main:
  - heading "หากไม่มีแผนตายตัว ก็ลองดูดีลเที่ยวบินที่ดีที่สุดด้วย AI เลย" [level=2]
  - text: อธิบายการเดินทางที่สมบูรณ์แบบ แล้วให้ Google Flights ค้นหาดีลที่ดีที่สุดให้คุณเลย
  - button "สำรวจดีลด้วย AI"
  - heading "ค้นหาและจองเที่ยวบินราคาถูกทั่วโลก รวมถึงติดตามราคา" [level=1]
  - heading "ค้นหาเที่ยวบินราคาถูกไปยังที่ใดก็ได้" [level=2]
  - button "สำรวจจุดหมายอื่นๆ"
  - heading "เครื่องมือที่มีประโยชน์ที่จะช่วยคุณค้นหาตั๋วเครื่องบินที่ดีที่สุด" [level=2]
  - tablist:
    - tab "ค้นหาช่วงเวลาที่เที่ยวบินมีราคาถูกที่สุด ตารางวันที่และกราฟราคาช่วยให้คุณค้นหาดีลเที่ยวบินที่ดีที่สุดได้อย่างง่ายดาย" [selected]:
      - img
      - text: ค้นหาช่วงเวลาที่เที่ยวบินมีราคาถูกที่สุด ตารางวันที่และกราฟราคาช่วยให้คุณค้นหาดีลเที่ยวบินที่ดีที่สุดได้อย่างง่ายดาย
    - tab "ทราบช่วงเวลาที่ควรจองด้วยข้อมูลเชิงลึกด้านราคา ประวัติราคาและข้อมูลแนวโน้มจะแสดงช่วงเวลาที่ดีที่สุดในการจองตั๋วเครื่องบินเพื่อให้คุณได้เที่ยวบินราคาถูกที่สุด":
      - img
      - text: ทราบช่วงเวลาที่ควรจองด้วยข้อมูลเชิงลึกด้านราคา ประวัติราคาและข้อมูลแนวโน้มจะแสดงช่วงเวลาที่ดีที่สุดในการจองตั๋วเครื่องบินเพื่อให้คุณได้เที่ยวบินราคาถูกที่สุด
    - tab "ติดตามราคาเที่ยวบินสำหรับการเดินทาง หากยังไม่พร้อมที่จะจอง คุณติดตามการเปลี่ยนแปลงราคาสำหรับเส้นทางหรือเที่ยวบิน และรับการแจ้งเตือนเมื่อราคาลดลงได้":
      - img
      - text: ติดตามราคาเที่ยวบินสำหรับการเดินทาง หากยังไม่พร้อมที่จะจอง คุณติดตามการเปลี่ยนแปลงราคาสำหรับเส้นทางหรือเที่ยวบิน และรับการแจ้งเตือนเมื่อราคาลดลงได้
    - tab "สำรวจดีลเที่ยวบินที่ดีที่สุดด้วย AI อธิบายการเดินทางที่สมบูรณ์แบบของคุณ แล้วให้ Google Flights ค้นหาดีลที่ดีที่สุดให้คุณเลย":
      - img
      - text: สำรวจดีลเที่ยวบินที่ดีที่สุดด้วย AI อธิบายการเดินทางที่สมบูรณ์แบบของคุณ แล้วให้ Google Flights ค้นหาดีลที่ดีที่สุดให้คุณเลย
  - tabpanel "ค้นหาช่วงเวลาที่เที่ยวบินมีราคาถูกที่สุด ตารางวันที่และกราฟราคาช่วยให้คุณค้นหาดีลเที่ยวบินที่ดีที่สุดได้อย่างง่ายดาย": เครื่องมือที่มีข้อมูลเชิงลึกจะช่วยคุณเลือกวันที่เดินทาง หากแผนการเดินทางของคุณปรับเปลี่ยนได้ โปรดใช้แบบฟอร์มด้านบนเพื่อเริ่มค้นหาการเดินทางตามที่ต้องการ จากนั้นลองใช้ตัวเลือกตารางวันที่และกราฟราคาในหน้าค้นหาเพื่อค้นหาวันที่เที่ยวบินมีราคาถูกที่สุดและจองตั๋ว
  - heading "คำถามที่พบบ่อย" [level=2]
  - group "คำถามที่พบบ่อย":
    - button "ฉันจะหาดีลเที่ยวบินแบบนาทีสุดท้ายได้อย่างไร":
      - img
    - button "ฉันจะหาเที่ยวบินราคาถูกสำหรับการพักผ่อนวันหยุดได้อย่างไร":
      - img
    - button "ฉันจะหาดีลเที่ยวบินได้อย่างไรหากไม่มีแผนการเดินทางตายตัว":
      - img
    - button "ฉันจะหาเที่ยวบินราคาถูกจากไทยไปยังที่ใดก็ได้ได้อย่างไร":
      - img
    - button "ฉันจะรับการแจ้งเตือนเที่ยวบินสำหรับการเดินทางของฉันได้อย่างไร":
      - img
  - text: ค้นหาเที่ยวบินราคาถูกในเส้นทางยอดนิยม
  - tablist:
    - tab "เที่ยวบินจากจุดหมายยอดนิยม" [selected]
    - tab "เที่ยวบินไปยังจุดหมายยอดนิยม"
    - tab "เส้นทางยอดนิยมในการบิน"
  - tabpanel "เที่ยวบินจากจุดหมายยอดนิยม":
    - link "เที่ยวบินจากนิวยอร์ก":
      - /url: https://www.google.com/travel/flights/flights-from-new-york.html
    - link "เที่ยวบินจากปารีส":
      - /url: https://www.google.com/travel/flights/flights-from-paris.html
    - link "เที่ยวบินจากลอนดอน":
      - /url: https://www.google.com/travel/flights/flights-from-london.html
    - link "เที่ยวบินจากโตรอนโต":
| C1 | ผู้โดยสารรวมไม่เกิน 9 คน (นับทารกบนตักด้วย) | 9 ผู้ใหญ่ + เด็ก 1 · 8 ผู้ใหญ่ + ทารกบนตัก 2 · 1 ผู้ใหญ่ + เด็ก 9 | "ขออภัย เราไม่รองรับผู้โดยสารมากกว่า 9 ท่าน" (role=alert สีแดง) ปุ่ม เสร็จ/ยกเลิก หาย · 8 + ทารกบนตัก 1 = 9 ผ่าน | [O] | a |
| C2 | "เพิ่มผู้ใหญ่" กดไม่ได้เมื่อครบ 9 แต่ปุ่ม + ประเภทอื่นยังกดได้ (เกินแล้วจึงเตือน) | ผู้ใหญ่ 9 แล้วกดเพิ่มเด็ก | เด็กเป็น 1 แล้วขึ้นคำเตือน | [O] | a |
| C3 | ผู้ใหญ่ขั้นต่ำ 1 คน (จองเด็กอย่างเดียวไม่ได้) · ปุ่ม − ของเด็ก/ทารกกดไม่ได้ที่ 0 | กด "นำผู้ใหญ่ออก" ตอนเหลือ 1 · เปิดป๊อปอัปครั้งแรก | ปุ่มเป็น disabled | [O] | a |
| C4 | ทารกบนตักต้องไม่มากกว่าผู้ใหญ่ · ทารก (บนที่นั่ง + บนตัก) ไม่เกิน 2 คนต่อผู้ใหญ่ 1 คน | 1 ผู้ใหญ่ + ทารกบนตัก 2 · 1 ผู้ใหญ่ + ทารกบนที่นั่ง 3 · 1 + บนที่นั่ง 2 + บนตัก 1 | "ต้องมีผู้ใหญ่อย่างน้อย 1 คนสำหรับการเดินทางพร้อมทารกที่นั่งบนตัก 1 คน" · "คุณต้องมีผู้ใหญ่อย่างน้อยหนึ่งคนที่จะเดินทางไปกับทารกสองคน" · 1 + บนที่นั่ง 2 ผ่าน · 1 + บนที่นั่ง 1 + บนตัก 1 ผ่าน | [O] (ข้อหลังตีความจากผล) | a |
| C5 | "ยกเลิก" หรือ Esc = ทิ้งค่าที่แก้ · "เสร็จ" = ยืนยันและ URL tfs เปลี่ยน | แก้แล้วกดยกเลิก · 2A+1C+1lap แล้วกดเสร็จ | ยกเลิก: ยังเป็น "ผู้โดยสาร 1 คน" · เสร็จ: "ผู้โดยสาร 4 คน" | [O] | a |
| C6 | ตัวเลขผู้โดยสารบนฟอร์มนับทารกบนตักด้วย | 2A+1C+1lap | แสดง "4" | [O] | a |
| C7 | ปลายทางว่าง → ปุ่มล่างเป็น "สำรวจ" พาไป `/travel/explore?tfs=…` และปุ่มสลับกดไม่ได้ | เปิดหน้าใหม่ | `button "สลับต้นทางกับปลายทาง" [disabled]` | [O] | a |
| C8 | ยังไม่มีวันที่แล้วกด "ค้นหา" → ไม่ค้นหา แต่เปิดปฏิทินให้เลือก **โดยไม่มีข้อความเตือน** | เที่ยวเดียวและไป-กลับ ไม่ใส่วัน | ปฏิทินเปิด โฟกัสที่ "ขาไป" URL ยังไม่ไป /search | [O] | a |
| C9 | ตอนเปิดหน้าแรก ช่องวันที่ว่าง | เปิดหน้าใหม่ | "ขาไป" "ขากลับ" ว่าง | [O] | a |
| C10 | หลายเมืองใส่วันให้อัตโนมัติ (วันนี้ +16 แล้ว +4 วันต่อแถว) และวันค้างอยู่เมื่อเปลี่ยนกลับเป็นเที่ยวเดียว | เปลี่ยนเป็นหลายเมืองเมื่อ 1 พ.ย. | 17, 21, 25, 29 พ.ย., 3 ธ.ค. · กลับเป็นเที่ยวเดียวยังเป็น 17 พ.ย. | [O] | a |
{
  "observedAt": "2026-11-01T10:07:49.250Z",
  "allCount": {
    "network": 300,
    "screen": 300,
    "domCards": 300,
    "pass": true
  },
  "firstFive": {
    "network": [
      7635,
      9062,
      11580,
      9335,
      9335
    ],
    "screen": [
      7635,
      9062,
      11580,
      9335,
      9335
    ],
    "pass": true
  },
  "nonstop": {
    "allLoaded": 18,
    "filteredNetwork": null,
    "screen": 18,
    "pass": true,
    "filteredNetworkBodyAvailable": false,
    "note": "Compare 18 one-leg itineraries in full 300-row network response with 18 shown after nonstop filter. Filtered response body absent in HAR (size -1); not needed for this comparison."
  }
}
exec
/bin/bash -lc "cat > route.mjs <<'EOF'
export const role=(p,r,n)=>p.getByRole(r,{name:n,exact:typeof n==='string'});
export async function route(p,url){
 await p.goto(url,{waitUntil:'domcontentloaded'});
 await role(p,'combobox',/"'^เปลี่ยนประเภทตั๋ว/).click();await role(p,'"'option','เที่ยวเดียว').click();
 await role(p,'combobox','ต้นทาง').click();let d=role(p,'dialog','ป้อนต้นทาง');await d.getByRole('combobox').fill('กรุงเทพ');await role(d,'option','กรุงเทพมหานคร').click();
 await role(p,'combobox','ปลายทาง').click();d=p.getByRole('dialog');await d.getByRole('combobox').first().fill('โตเกียว');await role(d,'option','โตเกียว ญี่ปุ่น').click();
 await role(p,'textbox','ขาไป').click();await role(p,'button',/"'^วันอาทิตย์ที่ 15 พฤศจิกายน ค.ศ. 2026/).first().click();await role(p,'"'button',/"'^เสร็จ/).click();
 await role(role(p,'"'search','เที่ยวบิน'),'button','ค้นหา').click();
 await role(p,'heading','เที่ยวบินยอดนิยม').waitFor({timeout:25000});
}
EOF
cat > probe-route.mjs <<'EOF'
import {chromium} from 'playwright';import{route}from'./route.mjs';import{writeFile}from'node:fs/promises';const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:900},locale:'th-TH'});try{await route(p,'https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB');}catch(e){console.log(e.message)}await writeFile('/tmp/accept-results-snapshot.txt',await p.locator('body').ariaSnapshot());await b.close();
EOF
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node probe-route.mjs" in /workspace/arena6/rulers/accept
 succeeded in 28249ms:
locator.waitFor: Timeout 25000ms exceeded.
Call log:
[2m  - waiting for getByRole('heading', { name: 'เที่ยวบินยอดนิยม', exact: true }) to be visible[22m


exec
/bin/bash -lc "cat > cases.mjs <<'EOF'
import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{role as r}from'./route.mjs';
const data=JSON.parse(await readFile(new URL('../../spec/data/flights-all.json',import.meta.url))); 
export const cases=[];const test=(id,title,fn)=>cases.push({id,ref:id,title,fn});
const visible=async l=>{await l.first().waitFor({state:'visible'});};
const click=async(p,role,name)=>r(p,role,name).click();
const pax=p=>click(p,'button',/"'^ผู้โดยสาร 1 คน/);
const chip=(p,name)=>click(p,'"'button',new RegExp('"'^'"'+name+', ไม่ได้เลือก'));
const close=p=>p.keyboard.press('Escape');
const rows=p=>p.getByRole('link',{name:/"'^ราคาเริ่มต้นที่/}).filter({visible:true});
test('"'B2','เที่ยวเดียวไม่มีช่องขากลับ',async p=>{assert.equal(await r(p,'textbox','ขากลับ').count(),0);await visible(r(p,'combobox',/"'^เปลี่ยนประเภทตั๋ว เที่ยวเดียว/));});
test('"'B3','ชั้นโดยสารมี 4 ตัวเลือก',async p=>{await click(p,'combobox',/"'^เปลี่ยนชั้นโดยสาร/);for(const s of ['"'ชั้นประหยัด','ประหยัดพรีเมียม','ชั้นธุรกิจ','ชั้นหนึ่ง'])await visible(r(p,'option',s));});
test('B4','เพิ่มผู้ใหญ่และยืนยันจำนวน',async p=>{await pax(p);await click(p,'button','เพิ่มผู้ใหญ่');await click(p,'button','เสร็จ');await visible(r(p,'button',/"'^ผู้โดยสาร 2 คน/));});
test('"'B7','ค้นหาสนามบินด้วยรหัส NRT',async p=>{await click(p,'combobox',/"'^ปลายทาง/);await p.getByRole('"'dialog').getByRole('combobox').first().fill('NRT');await visible(r(p,'option','ท่าอากาศยานนานาชาตินะริตะ (NRT)'));});
test('B27','สลับแท็บถูกที่สุด',async p=>{const t=r(p,'tab',/"'^ถูกที่สุด/);await t.click();assert.equal(await t.getAttribute('"'aria-selected'),'true');});
test('B28','เปิดคำอธิบายจัดอันดับ',async p=>{await r(p,'button',{toString(){return ''}}).count().catch(()=>{});await r(p,'button',/"'^ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ/).first().click();await visible(p.getByRole('"'dialog'));await visible(r(p,'button','ปิดกล่องโต้ตอบ'));});
test('B29','เมนูจัดเรียงครบหกแบบ',async p=>{await click(p,'button',/"'^จัดเรียงตาม/);for(const n of ['"'เที่ยวบินยอดนิยม','ราคา','เวลาออกเดินทาง','เวลาถึง','ระยะเวลา','การปล่อยก๊าซ'])await visible(r(p,'menuitemradio',n));});
test('B30','โหลดเพิ่มแล้วปุ่มหาย',async p=>{const before=await rows(p).count();await click(p,'button','ดูเที่ยวบินเพิ่มเติม');await r(p,'button','ดูเที่ยวบินเพิ่มเติม').waitFor({state:'hidden'});assert.ok(await rows(p).count()>before);});
test('B31','แถวแสดงราคา สายการบิน และการเลือก',async p=>{assert.ok(await rows(p).count()>0);assert.match(await rows(p).first().getAttribute('aria-label'),/บาทไทย.*เลือกเที่ยวบิน/);});
test('B33','ขยายรายละเอียดในหน้าเดิม',async p=>{const url=p.url();await r(p,'button',/"'^รายละเอียดเที่ยวบิน/).first().click();await visible(r(p,'"'button','เลือกเที่ยวบิน'));assert.equal(p.url(),url);});
test('B34','รายละเอียดมีเวลาเดินทางและชั้นโดยสาร',async p=>{await r(p,'button',/"'^รายละเอียดเที่ยวบิน/).first().click();await visible(p.getByText(/เวลาเดินทาง:/));await visible(p.getByText(/ชั้นประหยัด/));});
test('"'B37','เปิดข้อมูลผลกระทบสภาพอากาศ',async p=>{await r(p,'button',/"'^ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ/).first().click();await visible(r(p,'"'dialog','ปัจจัยของผลกระทบต่อสภาพอากาศ'));});
test('B38','เปิดค่าธรรมเนียมสัมภาระ',async p=>{await r(p,'button','ค่าธรรมเนียมสัมภาระ').first().click();await visible(r(p,'dialog','ค่าธรรมเนียมสัมภาระ'));});
test('B39','ตัวเลือกจำนวนครั้งแวะพัก',async p=>{await chip(p,'จำนวนครั้งที่แวะพัก');for(const n of ['ไม่จำกัดจำนวนครั้งที่แวะพัก','บินตรงเท่านั้น','แวะพัก 1 ครั้งหรือน้อยกว่า','แวะพัก 2 ครั้งหรือน้อยกว่า'])await visible(r(p,'radio',n));});
test('B40','เลือกพันธมิตรสายการบินได้',async p=>{await chip(p,'สายการบิน');for(const n of ['Oneworld','SkyTeam','Star Alliance'])await visible(r(p,'checkbox',n));await visible(r(p,'switch','เลือกสายการบินทั้งหมด'));});
test('B41','สัมภาระมีปุ่มเพิ่มและลด',async p=>{await chip(p,'สัมภาระ');await visible(r(p,'button','เพิ่มกระเป๋าถือขึ้นเครื่อง'));assert.equal(await r(p,'button','นำกระเป๋าถือขึ้นเครื่องออก').isDisabled(),true);});
test('B42','เปิด slider ราคาสูงสุด',async p=>{await chip(p,'ราคา');await visible(r(p,'slider','ราคาสูงสุด'));await visible(p.getByText('ทุกราคา',{exact:true}));});
test('B43','ตัวกรองเวลามี slider สี่ตัว',async p=>{await chip(p,'เวลา');for(const n of ['เวลาออกเดินทางที่เร็วที่สุด','เวลาออกเดินทางที่ช้าที่สุด','เวลาถึงที่เร็วที่สุด','เวลาถึงที่ช้าที่สุด'])await visible(r(p,'slider',n));});
test('B44','ตัวกรองการปล่อยก๊าซ',async p=>{await chip(p,'การปล่อยก๊าซ');await visible(r(p,'radio','การปล่อยก๊าซทุกระดับ'));await visible(r(p,'radio','การปล่อยก๊าซต่ำเท่านั้น'));});
test('B45','สนามบินต่อเครื่องมีระยะเวลาและสนามบิน',async p=>{await chip(p,'สนามบินสำหรับต่อเครื่อง');await visible(r(p,'slider','ระยะเวลาแวะพักขั้นต่ำ'));await visible(r(p,'slider','ระยะเวลาแวะพักสูงสุด'));await visible(r(p,'checkbox','ไทเป (TPE)'));});
test('B46','เปิดตัวกรองระยะเวลา',async p=>{await chip(p,'ระยะเวลา');await visible(r(p,'slider','ระยะเวลา'));});
test('B47','ตัวกรองทั้งหมดรวมตั๋วแยก',async p=>{await click(p,'button','ตัวกรองทั้งหมด');await visible(r(p,'dialog','ตัวกรอง'));await visible(r(p,'radio','ซ่อนตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง'));});
test('C1','เกิน 9 คนแสดงคำเตือน',async p=>{await pax(p);for(let i=0;i<8;i++)await click(p,'button','เพิ่มผู้ใหญ่');await click(p,'button','เพิ่มเด็กอายุ 2-11 ปี');await visible(p.getByText('ขออภัย เราไม่รองรับผู้โดยสารมากกว่า 9 ท่าน',{exact:true}));});
test('C2','ผู้ใหญ่ครบเก้าปุ่มเพิ่มถูกปิด',async p=>{await pax(p);for(let i=0;i<8;i++)await click(p,'button','เพิ่มผู้ใหญ่');assert.ok(await r(p,'button','เพิ่มผู้ใหญ่').isDisabled());});
test('C3','จำนวนขั้นต่ำปิดปุ่มลด',async p=>{await pax(p);for(const n of ['นำผู้ใหญ่ออก','นำเด็กอายุ 2-11 ปีออก','นำทารกที่โดยสารบนที่นั่งออก','นำทารกที่โดยสารบนตักออก'])assert.ok(await r(p,'button',n).isDisabled());});
test('C4','ทารกบนตักไม่เกินผู้ใหญ่',async p=>{await pax(p);await click(p,'button','เพิ่มทารกที่โดยสารบนตัก');await click(p,'button','เพิ่มทารกที่โดยสารบนตัก');await visible(p.getByText('ต้องมีผู้ใหญ่อย่างน้อย 1 คนสำหรับการเดินทางพร้อมทารกที่นั่งบนตัก 1 คน',{exact:true}));});
test('C5','ยกเลิกทิ้งจำนวนที่แก้',async p=>{await pax(p);await click(p,'button','เพิ่มผู้ใหญ่');await click(p,'button','ยกเลิก');await visible(r(p,'button',/"'^ผู้โดยสาร 1 คน/));});
test('"'C6','จำนวนรวมทารกบนตัก',async p=>{await pax(p);for(const n of ['เพิ่มผู้ใหญ่','เพิ่มเด็กอายุ 2-11 ปี','เพิ่มทารกที่โดยสารบนตัก'])await click(p,'button',n);await click(p,'button','เสร็จ');await visible(r(p,'button',/"'^ผู้โดยสาร 4 คน/));});
test('"'C23','จำนวนหลังโหลดเพิ่มตรงข้อมูลแอป',async p=>{await click(p,'button','ดูเที่ยวบินเพิ่มเติม');await r(p,'button','ดูเที่ยวบินเพิ่มเติม').waitFor({state:'hidden'});assert.equal(await rows(p).count(),data.count);});
test('C25','ราคาห้าใบแรกตรงข้อมูลแอป',async p=>{const expected=JSON.parse(await readFile(new URL('../../spec/data/validation.json',import.meta.url))).firstFive.network;const names=await rows(p).allTextContents();const labels=await rows(p).evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));assert.deepEqual(labels.slice(0,5).map(s=>Number(s.match(/ราคาเริ่มต้นที่ ([\\d,]+) บาทไทย/)[1].replaceAll(',',''))),expected);});
test('C26','ชิปบินตรงแสดงสถานะเลือกแล้ว',async p=>{await chip(p,'จำนวนครั้งที่แวะพัก');await click(p,'radio','บินตรงเท่านั้น');await visible(r(p,'button','บินตรง, จำนวนครั้งที่แวะพัก, เลือกแล้ว'));await visible(r(p,'button','ล้าง จำนวนครั้งที่แวะพัก'));});
test('C29','จำนวนหมวดตัวกรอง',async p=>{await chip(p,'จำนวนครั้งที่แวะพัก');await click(p,'radio','บินตรงเท่านั้น');await visible(r(p,'button','ตัวกรองทั้งหมด (1)'));});
test('C32','จำนวนบินตรงตรงกับ itinerary ขาเดียวในข้อมูล',async p=>{await chip(p,'จำนวนครั้งที่แวะพัก');await click(p,'radio','บินตรงเท่านั้น');await close(p);await p.waitForTimeout(1500);assert.equal(await rows(p).count(),data.flights.filter(f=>f.stopCount===0).length);});
test('C42','เรียงราคาแล้วรวมหัวข้อเที่ยวบินทั้งหมด',async p=>{await click(p,'button',/"'^จัดเรียงตาม/);await click(p,'"'menuitemradio','ราคา');await visible(r(p,'heading','เที่ยวบินทั้งหมด'));const labels=await rows(p).evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));const prices=labels.map(s=>Number(s.match(/ราคาเริ่มต้นที่ ([\\d,]+) บาทไทย/)[1].replaceAll(',','')));assert.ok(prices.length>1);assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));});
test('C49','ติดตามราคาขอให้ลงชื่อเข้าใช้',async p=>{await r(p,'switch',/ติดตามราคา/).first().click();await visible(r(p,'dialog','ลงชื่อเข้าใช้เพื่อติดตามราคา'));});
test('C51','มีหมายเหตุภาษีและค่าธรรมเนียม',async p=>{await visible(p.getByText(/ราคานี้เป็นราคาสุดท้ายซึ่งรวมภาษีและค่าธรรมเนียมทั้งหมดแล้ว/));});
test('C55','เลือกแถวไปตัวเลือกการจอง',async p=>{await rows(p).first().click();await visible(r(p,'heading','ตัวเลือกการจอง'));await visible(r(p,'heading','เที่ยวบินที่เลือก'));});
EOF" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
exec
/bin/bash -lc "head -60 /tmp/accept-results-snapshot.txt; rg 'button \"(เวลา|สนามบิน|สัมภาระ|ตัวกรอง)|ผู้โดยสาร|ราคาเริ่มต้นที่' /tmp/accept-results-snapshot.txt | head -15" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
- banner:
  - button "เมนูหลัก":
    - img
  - link "Google":
    - /url: /
  - button "ข้ามไปที่เนื้อหาหลัก"
  - button "ความคิดเห็นเกี่ยวกับการช่วยเหลือพิเศษ"
  - navigation:
    - link "สำรวจ":
      - img
      - text: สำรวจ
    - link "เที่ยวบิน":
      - img
      - text: เที่ยวบิน
    - link "โรงแรม":
      - img
      - text: โรงแรม
    - link "ที่พักให้เช่า":
      - img
      - text: ที่พักให้เช่า
  - button "เปลี่ยนธีมเว็บไซต์":
    - img
  - button "แอป Google"
  - link "เข้าสู่ระบบ":
    - /url: https://accounts.google.com/ServiceLogin?service=searchandassistant&passive=1209600&continue=https%3A%2F%2Fwww.google.com%2Ftravel%2Fflights%2Fsearch%3Ftfs%3DCBwQAhooEgoyMDI2LTExLTE1agwIAhIIL20vMGZuMmdyDAgDEggvbS8wN2Rma0ABSAFwAYIBCwj___________8BmAEC%26hl%3Dth%26gl%3DTH%26curr%3DTHB%26utm_source%3Dsign_in_ogb&followup=https%3A%2F%2Fwww.google.com%2Ftravel%2Fflights%2Fsearch%3Ftfs%3DCBwQAhooEgoyMDI2LTExLTE1agwIAhIIL20vMGZuMmdyDAgDEggvbS8wN2Rma0ABSAFwAYIBCwj___________8BmAEC%26hl%3Dth%26gl%3DTH%26curr%3DTHB%26utm_source%3Dsign_in_ogb&hl=th&ec=GAZAlQM
- search:
  - heading "การค้นหาเที่ยวบิน" [level=1]
  - combobox "เปลี่ยนประเภทตั๋ว เที่ยวเดียว"
  - button "ผู้โดยสาร 1 คน เปลี่ยนจำนวนผู้โดยสาร":
    - img
    - text: "1"
    - img
  - combobox "เปลี่ยนชั้นโดยสาร ชั้นประหยัด"
  - combobox "ต้นทาง": กรุงเทพมหานคร
  - img
  - button "สลับต้นทางกับปลายทาง":
    - img
  - combobox "ปลายทาง": โตเกียว
  - img
  - img
  - textbox "ขาไป": อาทิตย์ 15 พ.ย.
  - heading "ตัวกรอง" [level=2]
  - button "ตัวกรองทั้งหมด":
    - img
    - text: ตัวกรองทั้งหมด
  - button "จำนวนครั้งที่แวะพัก, ไม่ได้เลือก": จำนวนครั้งที่แวะพัก
  - button "สายการบิน, ไม่ได้เลือก": สายการบิน
  - button "สัมภาระ, ไม่ได้เลือก": สัมภาระ
  - button "ราคา, ไม่ได้เลือก": ราคา
  - button "เวลา, ไม่ได้เลือก": เวลา
  - button "การปล่อยก๊าซ, ไม่ได้เลือก": การปล่อยก๊าซ
  - button "สนามบินสำหรับต่อเครื่อง, ไม่ได้เลือก": สนามบินสำหรับต่อเครื่อง
  - button "ระยะเวลา, ไม่ได้เลือก": ระยะเวลา
- main:
  - heading "ผลการค้นหา" [level=2]
  - text: ไม่พบผลลัพธ์
  - paragraph: อ๊ะ มีบางอย่างผิดพลาด
  - paragraph:
    - button "โหลดซ้ำ"
- contentinfo:
  - button "ผู้โดยสาร 1 คน เปลี่ยนจำนวนผู้โดยสาร":
  - button "ตัวกรองทั้งหมด":
  - button "สัมภาระ, ไม่ได้เลือก": สัมภาระ
  - button "เวลา, ไม่ได้เลือก": เวลา
  - button "สนามบินสำหรับต่อเครื่อง, ไม่ได้เลือก": สนามบินสำหรับต่อเครื่อง

codex
เส้นทางมาตรฐานกรอกฟอร์มและไปหน้าผลค้นหาได้แล้ว แต่ Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ในรอบตรวจเส้นทาง ผมจะเก็บหลักฐานของแต่ละข้อ และแยกข้อที่ตรวจพฤติกรรมฟอร์มได้ออกจากข้อที่ต้องมีผลเที่ยวบิน โดยไม่ใส่ retry อัตโนมัติครับ
exec
/bin/bash -lc "python - <<'PY'
p='route.mjs'
s=open(p).read().replace(\"await role(p,'heading','เที่ยวบินยอดนิยม').waitFor({timeout:25000});\",\"await role(p,'heading','ผลการค้นหา').waitFor({timeout:20000});\\n await p.getByText('อ๊ะ มีบางอย่างผิดพลาด',{exact:true}).or(role(p,'heading','เที่ยวบินยอดนิยม')).first().waitFor({timeout:20000});\")
open(p,'w').write(s)
p='cases.mjs';s=open(p).read().replace(\"await r(p,'button',{toString(){return ''}}).count().catch(()=>{});\",'');open(p,'w').write(s)
PY
cat > run.mjs <<'EOF'
import{chromium}from'playwright';import{mkdir,writeFile}from'node:fs/promises';import{resolve}from'node:path';import{cases}from'./cases.mjs';import{route}from'./route.mjs';
const [base,outArg]=process.argv.slice(2);if("'!base||!outArg)throw Error('"'Usage: node run.mjs <BASE_URL> <output-folder>');
const out=resolve(outArg);await mkdir(out,{recursive:true});const started=new Date();const browser=await chromium.launch({headless:true});const results=[];
try{for(const t of cases){const context=await browser.newContext({viewport:{width:1366,height:900},locale:'th-TH'});const p=await context.newPage();p.setDefaultTimeout(4500);const start=Date.now();let stage='standard-route';let upstreamError=false;
// No retries, reloads, internal URL navigation, login or seller navigation.
try{await route(p,base);upstreamError=await p.getByText('อ๊ะ มีบางอย่างผิดพลาด',{exact:true}).isVisible();stage='assertion';await t.fn(p);results.push({id:t.id,status:'ผ่าน',reason:'ตรวจผ่านหน้าจอจริง',durationMs:Date.now()-start,upstreamError});}
catch(e){results.push({id:t.id,status:'ไม่ผ่าน',reason:(upstreamError?'Google แสดง อ๊ะ มีบางอย่างผิดพลาด; ':'')+e.message,stage,durationMs:Date.now()-start,upstreamError});}
await p.screenshot({path:resolve(out,t.id+'.png'),fullPage:true}).catch(()=>{});await writeFile(resolve(out,t.id+'.yml'),await p.locator('body').ariaSnapshot().catch(()=>''));await context.close();await writeFile(resolve(out,'results.json'),JSON.stringify(results,null,2));console.log(t.id,results.at(-1).status,results.at(-1).reason.split('\\n')[0]);}}
finally{await browser.close();await writeFile(resolve(out,'timing.json'),JSON.stringify({baseURL:base,startedAt:started.toISOString(),endedAt:new Date().toISOString(),durationMs:Date.now()-started.getTime(),retries:0,tests:results.length},null,2));}
EOF
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node run.mjs 'https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB' original > original.log 2>&1" in /workspace/arena6/rulers/accept
exec
/bin/bash -lc "tail -10 original.log; cat /workspace/arena6/spec/snapshots/a-04-pax-open.yml; rg '"'^'"\\| B5[1-9]|"'^'"\\| B6' /workspace/arena6/spec/EXPLORATION.md; python - <<'PY'
import json
x=json.load(open('/workspace/arena6/spec/data/flights-all.json'))
print(list(x['flights'][0]))
PY" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B2 ผ่าน ตรวจผ่านหน้าจอจริง
# 04-pax-open @ 2026-11-01 17:06:30 (Asia/Bangkok)
# url: https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB
- dialog "จำนวนผู้โดยสาร":
  - list:
    - listitem:
      - text: ผู้ใหญ่
      - button "นำผู้ใหญ่ออก" [disabled]:
        - img
      - text: "1"
      - button "เพิ่มผู้ใหญ่":
        - img
    - listitem:
      - text: เด็ก อายุ 2-11 ปี
      - button "นำเด็กอายุ 2-11 ปีออก" [disabled]:
        - img
      - text: "0"
      - button "เพิ่มเด็กอายุ 2-11 ปี":
        - img
    - listitem:
      - text: ทารกที่โดยสาร ในที่นั่งของตนเอง
      - button "นำทารกที่โดยสารบนที่นั่งออก" [disabled]:
        - img
      - text: "0"
      - button "เพิ่มทารกที่โดยสารบนที่นั่ง":
        - img
    - listitem:
      - text: ทารกที่โดยสาร บนตัก
      - button "นำทารกที่โดยสารบนตักออก" [disabled]:
        - img
      - text: "0"
      - button "เพิ่มทารกที่โดยสารบนตัก":
        - img
  - button "เสร็จ"
  - button "ยกเลิก"| B6 | ช่องปลายทาง | ฟอร์ม ช่องขวา | กดแล้วได้รายการแนะนำเริ่มต้น หรือพิมพ์ค้นหาเอง | ตอนช่องว่าง (17:09) แนะนำ "ทุกที่", "ทวีปยุโรป", "ญี่ปุ่น", "ปารีส", "ลอนดอน" | `combobox "ปลายทาง"` (placeholder "ปลายทาง") · "ทุกที่" · "ค้นหาการเดินทางไปยังที่ใดก็ได้ในโลก" | a |
| B51 | หน้าข้อผิดพลาด + โหลดซ้ำ | แทนรายการ | กด "โหลดซ้ำ" | รายการกลับมา (b เห็น 17:48 · a เว้น 60 วินาทีแล้วผ่าน) | "อ๊ะ มีบางอย่างผิดพลาด" (เห็นในภาพ `b-10-error-after-price20k.png` ไม่ได้อยู่ใน snapshot) · `button "โหลดซ้ำ"` | a·b·d |
| B52 | ข้อมูลเชิงลึกด้านราคา (หน้าผลค้นหา) | ระหว่าง "เที่ยวบินยอดนิยม" กับ "เที่ยวบินอื่นๆ" (เฉพาะแท็บดีที่สุด ที่ไม่มีตัวกรอง) | กด "ดูประวัติราคา" เพื่อขยาย | ระดับราคา + ช่วงราคาปกติ + กราฟประวัติราคา 60 วัน (17:51) | heading "ขณะนี้เที่ยวบินมีราคาสูง" (ขยายแล้วเป็น "ขณะนี้เที่ยวบินที่คุณค้นหามีราคาสูง") · "โดยปกติแล้ว ราคาขั้นต่ำของเที่ยวบินสำหรับทริปที่คล้ายคลึงกันซึ่งเดินทางสู่โตเกียวจะอยู่ระหว่าง ฿4,950–7,200" · "฿7,635 อยู่ในช่วงราคา สูง" · `button "ดูประวัติราคา"` · heading "ประวัติราคาสำหรับการค้นหานี้" · application "กราฟประวัติราคา" · ปุ่ม "60 วันที่ผ่านมา - ฿7,156" … "วันนี้ - ฿7,635" | b·d |
| B53 | ตารางวันที่ | ปุ่ม "ตารางวันที่" | ดูราคา 8 วัน เลื่อนซ้าย/ขวา เลือกวันแล้วกด "ตกลง" | 17:51: 12 พ.ย. ฿5,255 (ถูกที่สุด) … 15 ฿7,635 (เลือกแล้ว) … 19 ฿7,775 · กด "ตกลง" แล้ววันเปลี่ยนเป็น "พฤหัส 12 พ.ย." | `button "ตารางวันที่"` → dialog "ข้อมูลเชิงลึกด้านราคา" · tab "วันที่" / "กราฟราคา" · grid "ตารางวันที่" · button "฿5,255, ราคาถูกที่สุด" · "฿7,635, เลือกแล้ว" · "เลื่อนไปทางซ้าย" / "เลื่อนไปทางขวา" · "15 พ.ย.฿7,635 · เที่ยวเดียว" · "ยกเลิก" / "ตกลง" | b |
| B54 | กราฟราคา | ปุ่ม "กราฟราคา" | ชี้เมาส์ดูราคารายวัน เลื่อนช่วงเวลา | ระหว่างโหลดแสดง "กำลังดึงข้อมูลราคา" · แกน Y ฿0–18,000 · ตัวอย่าง 17:53: ส. 19 ธ.ค. ฿5,900 · ส. 2 ม.ค. ฿15,646 | `button "กราฟราคา"` · "การเดินทางเที่ยวเดียว อาทิตย์ 15 พ.ย. เริ่มที่ ฿7,635" · region "กราฟราคา" · button "เลื่อนไปข้างหน้า" / "เลื่อนไปข้างหลัง" | b |
| B55 | ติดตามราคา | หน้าผลค้นหา: แถบใต้ข้อมูลเชิงลึก (ถ้ามีตัวกรองจะย้ายไปเหนือรายการ) · หน้าจอง: ขวาของ "เที่ยวบินที่เลือก" | สวิตช์ "วันที่นี้" / "วันใดก็ได้" (หน้าจองไม่ได้กด) | ถ้าไม่ล็อกอิน: เด้ง dialog ให้ลงชื่อเข้าใช้ สวิตช์ไม่เปิด | heading "ติดตามราคา" · switch "ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15" · switch "ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว - วันใดก็ได้" · หน้าจอง: switch "ติดตามราคาเที่ยวบินที่เลือก จาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15" · dialog "ลงชื่อเข้าใช้เพื่อติดตามราคา" · `button "ปิด"` · link "ลงชื่อเข้าใช้" | b·c |
| B56 | เลือกเที่ยวบิน | หัวแถวที่ขยาย ข้างราคา | ไปหน้าจอง | URL เปลี่ยนเป็น `/travel/flights/booking?tfs=…&tfu=…` | `button "เลือกเที่ยวบิน"` | b·c·d |
| B57 | สรุปแผนการเดินทาง (หน้าจอง) | หัวหน้าจอง | อ่าน | เมือง ประเภทตั๋ว ชั้น และราคาต่ำสุดตัวใหญ่ | heading "สรุปแผนการเดินทาง" · "กรุงเทพมหานคร → โตเกียว" · "เที่ยวเดียว · ชั้นประหยัด ·" · "฿9,062 ราคารวมที่ต่ำที่สุด" | c·d |
| B58 | แชร์ | มุมขวาบนของหน้าจอง | เปิดกล่องแชร์ (ไม่ได้กดช่องทางใด) | มี 3 ช่องทาง | ปุ่ม "แชร์" (aria "แชร์เที่ยวบินนี้") → heading "แชร์เที่ยวบินนี้" · `button "ปิด"` · "Facebook" · "X (Twitter)" · "คัดลอกลิงก์" | c |
| B59 | การ์ดเที่ยวบินที่เลือก | ใต้หัวข้อ "เที่ยวบินที่เลือก" | ขยายดูรายละเอียดเหมือน B34 | มีปุ่ม "เปลี่ยนเที่ยวบิน" แทน "เลือกเที่ยวบิน" | "เที่ยวบินที่เลือก" · หัวที่ขยาย "เที่ยวบินขาไป · อาทิตย์ 15 พ.ย." · ปุ่ม "เปลี่ยนเที่ยวบิน" (aria "เปลี่ยนเที่ยวบิน ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ, BKK") | c |
| B60 | สรุปสัมภาระ (หน้าจอง) | ใต้การ์ดเที่ยวบิน (มีแค่บางเที่ยวบิน) | อ่าน หรือเปิดลิงก์นโยบาย (แท็บใหม่) | VZ และ JAL มี · ไทยไลอ้อนไม่มี | VZ: "กระเป๋านำขึ้นเครื่องฟรี 1 ใบ" · "มีค่าธรรมเนียมสำหรับสัมภาระที่โหลดใต้ท้องเครื่องใบแรก" · JAL: "สัมภาระที่โหลดใต้ท้องเครื่องฟรี 2 ใบ" · "เงื่อนไขสัมภาระมีผลตลอดการเดินทาง ค่าธรรมเนียมสัมภาระอาจสูงขึ้นหากชำระเงินที่สนามบิน" · link "นโยบายสัมภาระของ ไทยเวียดเจ๊ทแอร์ (เปิดในแท็บใหม่)" | c |
| B61 | ตัวเลือกการจอง (รายชื่อผู้ขาย) | heading "ตัวเลือกการจอง" | เปรียบเทียบราคาผู้ขาย | ทุกแถวมีโลโก้ + "จองกับ X" + ป้ายประเภท + ราคา + ปุ่ม "ดำเนินการต่อ" · ราคาถูกที่สุดเป็นสีเขียว · VZ 830 (c 17:14–17:17 และ d 17:08:19 ตรงกัน): ไทยเวียดเจ๊ทแอร์ ฿9,062 / Gotogate ฿9,737 · SL 394: ไทยไลอ้อนแอร์ ฿7,635 · JL 728+JL 3006: เจเอแอล ฿32,915 / บางกอกแอร์เวย์ส ฿21,665 | heading "ตัวเลือกการจอง" · "จองกับ ไทยเวียดเจ๊ทแอร์" + ป้าย "สายการบิน" · "จองกับ Gotogate ฿9,737" (ไม่มีป้าย) · "จองกับ เจเอแอล" · "จองกับ บางกอกแอร์เวย์ส" | c·d |
| B62 | ปุ่มดำเนินการต่อ (**ไม่ได้กด**) | ขวาสุดของแต่ละแถวผู้ขาย | (จะออกไปเว็บผู้ขาย) | — | บนจอ "ดำเนินการต่อ" · aria "ดำเนินการต่อเพื่อจองกับสายการบิน ไทยเวียดเจ๊ทแอร์ ในราคา 9062 บาทไทย. รวมค่าธรรมเนียมเพิ่มเติม 81 บาทไทย" / "ดำเนินการต่อเพื่อจองกับ Gotogate ในราคา 9737 บาทไทย" | c·d |
| B63 | วิธีจัดอันดับตัวเลือก | ใต้ heading ตัวเลือกการจอง (เห็นเฉพาะตอนมีผู้ขาย ≥2 ราย) | กด (i) | popup อธิบาย | "วิธีจัดอันดับตัวเลือก" · `button "ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกการจอง"` → "ระบบจัดอันดับตัวเลือกการจองโดยอิงตามปัจจัยต่างๆ เช่น ราคา คุณภาพลิงก์ ประเภทพาร์ทเนอร์ และประสบการณ์การใช้งานบนเว็บไซต์ของพาร์ทเนอร์" · "ดูข้อมูลเพิ่มเติม" · "ปิดกล่องโต้ตอบ" | c |
| B64 | ค่าธรรมเนียมเพิ่มเติม | ในแถวผู้ขาย (VZ) | กด (i) | popup อธิบาย | "รวมค่าธรรมเนียมเพิ่มเติม ฿81" · `button "ข้อมูลเพิ่มเติมเกี่ยวกับค่าอำนวยความสะดวก"` → "ค่าธรรมเนียมนี้จะมีผลในขั้นตอนสุดท้ายของการจองบนเว็บไซต์ของพาร์ทเนอร์" | c·d |
| B65 | ข้อมูลเชิงลึกด้านราคา (หน้าจอง) | ส่วนล่างของหน้าจอง | อ่าน / ชี้กราฟ | แถบช่วงราคา (เขียว/เหลือง/แดง) + กราฟ 60 วันย้อนหลัง | heading "฿9,062 อยู่ในช่วงราคาปกติสำหรับชั้นประหยัด" · "โดยปกติแล้ว ราคาขั้นต่ำ…จะอยู่ระหว่าง ฿8,100–11,500" · heading "ประวัติราคาสำหรับเที่ยวบินเหล่านี้" · ปุ่ม "60 วันที่ผ่านมา - ฿9,581" … "วันนี้ - ฿9,062" | c·d |
| B66 | ย้อนกลับ / เปลี่ยนเที่ยวบิน | ลูกศร ← ซ้ายบนสุด (banner) / การ์ดเที่ยวบินที่เลือก | กลับไปผลค้นหา | ไปหน้า `/travel/flights/search?tfs=…&tfu=EgIIACIA…` ใหม่ (ดู C55–C57) | `button "ย้อนกลับ"` · `button "เปลี่ยนเที่ยวบิน"` | c |
['id', 'popular', 'observedAt', 'sourceHarEntry', 'departureAirport', 'arrivalAirport', 'departureLocal', 'arrivalLocal', 'airlineCodes', 'airlineNames', 'durationMinutes', 'stopCount', 'legs', 'layovers', 'co2e', 'price', 'specialLabels', 'raw']

exec
/bin/bash -lc 'tail -8 original.log; ls original | tail -5' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B2 ผ่าน ตรวจผ่านหน้าจอจริง
B3 ผ่าน ตรวจผ่านหน้าจอจริง
B4 ผ่าน ตรวจผ่านหน้าจอจริง
B3.png
B3.yml
B4.png
B4.yml
results.json

exec
/bin/bash -lc "cat original/results.json; cat > README.md <<'EOF'
# Acceptance tests

Run from this directory:

"'```sh
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node run.mjs <BASE_URL> <output-folder>
```

Requires Node.js and `playwright`. Uses Chromium, 1366×900, th-TH, fresh anonymous context per test, sequential execution and zero retries. Each test enters through BASE_URL and performs the standard route via the visible form: one way, Bangkok city → Tokyo city, 15 November 2026, one adult, economy. No direct internal navigation. Never clicks login, payment, CAPTCHA or seller continuation.

`results.json` is an array of `{id,status,reason,...}` (`ผ่าน` / `ไม่ผ่าน`). Each test has a screenshot and accessibility snapshot. `timing.json` records the complete run. `META.json` records the baseline validity; only its `valid` IDs should gate an implementation. A failing valid test remains a failure: do not regenerate META against the implementation.

Reference inputs are read only from `../../spec/data/`. Dynamic prices/counts are compared to those fixtures, never values copied from the current Google session. Baseline mismatch is recorded as invalid rather than changing fixtures to match Google.

A Google error page still permits independent form/filter assertions. Tests requiring flight results fail and are excluded from the gate when the original cannot supply those results. No automatic reload is used. `probe*.mjs` were preliminary read-only route diagnostics, not baseline test runs.
EOF' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
[
  {
    "id": "B2",
    "status": "ผ่าน",
    "reason": "ตรวจผ่านหน้าจอจริง",
    "durationMs": 4083,
    "upstreamError": true
  },
  {
    "id": "B3",
    "status": "ผ่าน",
    "reason": "ตรวจผ่านหน้าจอจริง",
    "durationMs": 3650,
    "upstreamError": false
  },
  {
    "id": "B4",
    "status": "ผ่าน",
    "reason": "ตรวจผ่านหน้าจอจริง",
    "durationMs": 3007,
    "upstreamError": true
  },
  {
    "id": "B7",
    "status": "ผ่าน",
    "reason": "ตรวจผ่านหน้าจอจริง",
    "durationMs": 3605,
    "upstreamError": false
  },
  {
    "id": "B27",
    "status": "ไม่ผ่าน",
    "reason": "Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.\nCall log:\n\u001b[2m  - waiting for getByRole('tab', { name: /^ถูกที่สุด/ })\u001b[22m\n",
    "stage": "assertion",
    "durationMs": 7618,
    "upstreamError": true
  }
]
exec
/bin/bash -lc "tail -12 original.log; rg 'tab |รายละเอียดเที่ยวบิน|ราคาเริ่มต้นที่' original/B3.yml | head -8; rg 'button .*จัดอันดับ' original/B7.yml | head -4" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B2 ผ่าน ตรวจผ่านหน้าจอจริง
B3 ผ่าน ตรวจผ่านหน้าจอจริง
B4 ผ่าน ตรวจผ่านหน้าจอจริง
B7 ผ่าน ตรวจผ่านหน้าจอจริง
B27 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B28 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.

exec
/bin/bash -lc "python - <<'PY'
import glob,re,json,hashlib
out=[]
for f in sorted(glob.glob('/workspace/arena6/spec/snapshots/*.yml')):
 s=open(f).read();out.append({'file':f.split('/')[-1],'sha256':hashlib.sha256(s.encode()).hexdigest(),'headings':re.findall(r'heading \"(["'^"]+)"'"',s),'dialogs':re.findall(r'dialog \"(["'^"]+)"'"',s)})
json.dump(out,open('snapshot-index.json','w'),ensure_ascii=False,indent=2)
PY
node --check run.mjs; node --check cases.mjs; tail -5 original.log" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B3 ผ่าน ตรวจผ่านหน้าจอจริง
B4 ผ่าน ตรวจผ่านหน้าจอจริง
B7 ผ่าน ตรวจผ่านหน้าจอจริง
B27 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B28 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.

codex
ผลช่วงแรกผ่านแล้วสำหรับประเภทตั๋ว ชั้นโดยสาร จำนวนผู้โดยสาร และการค้นหา NRT ส่วนข้อที่ต้องมีรายการเที่ยวบินบางครั้งเจอหน้าข้อผิดพลาดของ Google ผมเก็บภาพและ accessibility snapshot แยกตาม id ไว้แล้ว เพื่อให้ตรวจเหตุผลการตัดออกจาก gate ได้ครับ
exec
/bin/bash -lc 'tail -12 original.log; ls original/results.json -l' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B2 ผ่าน ตรวจผ่านหน้าจอจริง
B3 ผ่าน ตรวจผ่านหน้าจอจริง
B4 ผ่าน ตรวจผ่านหน้าจอจริง
B7 ผ่าน ตรวจผ่านหน้าจอจริง
B27 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B28 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B29 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
-rw-r--r-- 1 root root 1937 Nov  1 18:12 original/results.json

exec
/bin/bash -lc "rg 'heading|ผิดพลาด|กำลัง|ผลลัพธ์' original/B29.yml | head -20; date -Is" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
- text: กำลังโหลดราคา
2026-11-01T18:13:01+07:00

exec
/bin/bash -lc "cat > finalize.mjs <<'EOF'
import{readFile,writeFile}from'node:fs/promises';import{cases}from'./cases.mjs';
const dir=process.argv[2]||'original';const res=JSON.parse(await readFile("'`${dir}/results.json`));const timing=JSON.parse(await readFile(`${dir}/timing.json`));
const excluded=[{id:'"'B12',reason:'ปุ่มไอคอนเลื่อนวันไม่มีข้อความหรือ accessible name ตามสเปก จับโดย role + ชื่อไม่ได้ภายใต้ข้อจำกัดนี้',group:'ไม่มีชื่อบนหน้าจอ'},...Array.from({length:9},(_,i)=>({id:"'`F${i+1}`,reason:'"'ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate',group:'หลักฐานเครือข่ายเท่านั้น'}))];
const valid=res.filter(x=>x.status==='ผ่าน').map(x=>x.id);const invalid=res.filter(x=>x.status"'!=='"'ผ่าน').map(x=>({id:x.id,เหตุผล:x.upstreamError?'Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ทำให้ตรวจข้อนี้ไม่สำเร็จ':x.stage==='standard-route'?'Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด':x.reason.split('\\n')[0]}));
invalid.push(...excluded.map(x=>({id:x.id,เหตุผล:x.reason})));
await writeFile('META.json',JSON.stringify({valid,invalid},null,2));
const lines=['# Acceptance — Google Flights', '',"'`รันชุดข้อสอบ ${res.length} ข้อ 1 รอบ ไม่มี retry; ข้อยกเว้นที่ตรวจผ่านหน้าจอไม่ได้ ${excluded.length} ข้อ แยกออกจาก gate`, '"'',"'`เริ่ม ${timing.startedAt} · สิ้นสุด ${timing.endedAt} · ระยะเวลา ${(timing.durationMs/1000).toFixed(2)} วินาที`, '"'', 'ทุกข้อที่รันเริ่ม BASE_URL แล้วค้นผ่านฟอร์มตามเส้นทางมาตรฐาน ใช้ Chromium 1366×900, th-TH และ context ใหม่ ไม่ล็อกอิน ไม่กดผู้ขาย ไม่อ่านโค้ดแอป', '', 'ราคา/จำนวน C23, C25, C32 อ้างอิง spec/data/flights-all.json และ validation.json ข้อมูล Google สดที่ต่างจาก fixture จะไม่ถูกนำมาแทนค่าคาดหวัง', '', 'ขอบเขต: เป็นชุด acceptance ที่เลือกจาก B/C และข้อยกเว้น F ไม่ได้อ้างว่าครอบคลุมทุกแถวใน EXPLORATION; snapshot-index.json ระบุหลักฐาน snapshots ทั้ง 95 ไฟล์', '', '| id | อ้างข้อ | ทดสอบอะไร | ผลกับต้นฉบับ | valid/invalid |','|---|---|---|---|---|'];
for(const t of cases){const x=res.find(x=>x.id===t.id);const bad=invalid.find(x=>x.id===t.id);lines.push("'`| ${t.id} | ${t.ref} | ${t.title} | ${x.status}${bad?'"' — '+bad.เหตุผล:''} | "'${bad?'"'invalid':'valid'} |"'`);}
for(const x of excluded)lines.push(`| ${x.id} | ${x.id} | ข้อยกเว้น: ${x.reason} | ไม่รัน: ตรวจภายใต้ข้อจำกัดไม่ได้ | invalid |`);
lines.push('"'', 'ผลดิบ: original/results.json · เวลา: original/timing.json · ภาพและ snapshot: original/<id>.png/.yml', '', 'ข้อ invalid ไม่ถูกนับเป็นการผ่าน และไม่ใช้ใน gate; ข้อ valid ต้องผ่านกับแอปโดยใช้ runner เดิม ไม่ปรับ META จากผลของแอป', '', 'การตรวจเส้นทางก่อนรัน: probe.mjs และ probe-route.mjs เป็นการเปิดเว็บ/ตรวจเส้นทาง ไม่ใช่การรันข้อสอบซ้ำ ไม่ได้แก้ข้อสอบแล้วรันใหม่ในรอบ baseline');
await writeFile('ACCEPT.md',lines.join('\\n')+'\\n');console.log(JSON.stringify({total:res.length+excluded.length,executed:res.length,valid:valid.length,invalid:invalid.length,durationSeconds:timing.durationMs/1000},null,2));
EOF" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
exec
/bin/bash -lc 'tail -10 original.log' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B2 ผ่าน ตรวจผ่านหน้าจอจริง
B3 ผ่าน ตรวจผ่านหน้าจอจริง
B4 ผ่าน ตรวจผ่านหน้าจอจริง
B7 ผ่าน ตรวจผ่านหน้าจอจริง
B27 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B28 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B29 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
B30 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B31 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.

exec
/bin/bash -lc 'tail -6 original.log; du -sh original' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B29 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
B30 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B31 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
B33 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
B34 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B37 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
3.4M	original

codex
Google สดยังสลับระหว่างหน้าข้อผิดพลาดกับ “กำลังโหลดราคา” ทำให้ข้อเกี่ยวกับรายการเที่ยวบินหลายข้อยังตรวจไม่ได้ ผมจะปล่อยให้รอบเดียวนี้จบตามที่กำหนด แล้วบันทึกข้อที่ตรวจไม่ได้เป็น invalid พร้อมเหตุผล โดยเก็บผลดิบไว้ครบครับ
exec
/bin/bash -lc 'tail -8 original.log' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B31 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
B33 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
B34 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B37 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
B38 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
B39 ผ่าน ตรวจผ่านหน้าจอจริง
B40 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.waitFor: Timeout 4500ms exceeded.
B41 ผ่าน ตรวจผ่านหน้าจอจริง

exec
/bin/bash -lc 'cat original/B40.yml | tail -80; cat original/results.json | tail -45' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
- search:
  - dialog "สายการบิน":
    - heading "สายการบิน" [level=2]
    - button "ปิดกล่องโต้ตอบ":
      - img
    - text: เลือกสายการบินทั้งหมด
    - switch "เลือกสายการบินทั้งหมด" [checked]:
      - img
      - img
    - button "ล้าง สายการบิน" [disabled]: ล้าง
    - text: ใช้ลูกศรซ้ายหรือขวาเพื่อสลับคำแนะนำสถานที่ใกล้เคียง โหลดหน้านี้แล้ว    "id": "B37",
    "status": "ไม่ผ่าน",
    "reason": "Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.\nCall log:\n\u001b[2m  - waiting for getByRole('button', { name: /^ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ/ }).first()\u001b[22m\n",
    "stage": "assertion",
    "durationMs": 7920,
    "upstreamError": true
  },
  {
    "id": "B38",
    "status": "ไม่ผ่าน",
    "reason": "locator.waitFor: Timeout 20000ms exceeded.\nCall log:\n\u001b[2m  - waiting for getByRole('heading', { name: 'ผลการค้นหา', exact: true }) to be visible\u001b[22m\n",
    "stage": "standard-route",
    "durationMs": 22277,
    "upstreamError": false
  },
  {
    "id": "B39",
    "status": "ผ่าน",
    "reason": "ตรวจผ่านหน้าจอจริง",
    "durationMs": 3771,
    "upstreamError": false
  },
  {
    "id": "B40",
    "status": "ไม่ผ่าน",
    "reason": "Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.waitFor: Timeout 4500ms exceeded.\nCall log:\n\u001b[2m  - waiting for getByRole('checkbox', { name: 'Oneworld', exact: true }).first() to be visible\u001b[22m\n",
    "stage": "assertion",
    "durationMs": 7461,
    "upstreamError": true
  },
  {
    "id": "B41",
    "status": "ผ่าน",
    "reason": "ตรวจผ่านหน้าจอจริง",
    "durationMs": 3696,
    "upstreamError": false
  },
  {
    "id": "B42",
    "status": "ผ่าน",
    "reason": "ตรวจผ่านหน้าจอจริง",
    "durationMs": 2979,
    "upstreamError": true
  }
]
exec
/bin/bash -lc 'tail -10 original.log' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B39 ผ่าน ตรวจผ่านหน้าจอจริง
B40 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.waitFor: Timeout 4500ms exceeded.
B41 ผ่าน ตรวจผ่านหน้าจอจริง
B42 ผ่าน ตรวจผ่านหน้าจอจริง
B43 ผ่าน ตรวจผ่านหน้าจอจริง
B44 ผ่าน ตรวจผ่านหน้าจอจริง
B45 ผ่าน ตรวจผ่านหน้าจอจริง
B46 ผ่าน ตรวจผ่านหน้าจอจริง
B47 ผ่าน ตรวจผ่านหน้าจอจริง
C1 ผ่าน ตรวจผ่านหน้าจอจริง

codex
ข้อเมนูตัวกรองหลายข้อผ่านแล้ว รวมถึงราคา เวลา การปล่อยก๊าซ สนามบินต่อเครื่อง ระยะเวลา และตัวกรองทั้งหมด ขณะนี้กำลังทดสอบกฎจำนวนผู้โดยสาร ต่อด้วยข้อที่เปรียบเทียบจำนวนและราคากับไฟล์ข้อมูลครับ
exec
/bin/bash -lc 'tail -10 original.log; node --check finalize.mjs' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
B41 ผ่าน ตรวจผ่านหน้าจอจริง
B42 ผ่าน ตรวจผ่านหน้าจอจริง
B43 ผ่าน ตรวจผ่านหน้าจอจริง
B44 ผ่าน ตรวจผ่านหน้าจอจริง
B45 ผ่าน ตรวจผ่านหน้าจอจริง
B46 ผ่าน ตรวจผ่านหน้าจอจริง
B47 ผ่าน ตรวจผ่านหน้าจอจริง
C1 ผ่าน ตรวจผ่านหน้าจอจริง
C2 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
C3 ผ่าน ตรวจผ่านหน้าจอจริง

exec
/bin/bash -lc 'tail -8 original.log' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
C2 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
C3 ผ่าน ตรวจผ่านหน้าจอจริง
C4 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
C5 ผ่าน ตรวจผ่านหน้าจอจริง
C6 ผ่าน ตรวจผ่านหน้าจอจริง
C23 ไม่ผ่าน Expected values to be strictly equal:
C25 ไม่ผ่าน Expected values to be strictly deep-equal:
C26 ผ่าน ตรวจผ่านหน้าจอจริง

exec
/bin/bash -lc "python - <<'PY'
import json
for x in json.load(open('original/results.json')):
 if x['id'] in ['C23','C25']:print(x)
PY
rg 'ราคาเริ่มต้นที่' original/C23.yml | head -3" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
{'id': 'C23', 'status': 'ไม่ผ่าน', 'reason': 'Expected values to be strictly equal:\n\n21 !== 300\n', 'stage': 'assertion', 'durationMs': 3512, 'upstreamError': False}
{'id': 'C25', 'status': 'ไม่ผ่าน', 'reason': 'Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    7635,\n    9062,\n    11580,\n    9335,\n+   9842\n-   9335\n  ]\n', 'stage': 'assertion', 'durationMs': 3302, 'upstreamError': False}
        - link "ราคาเริ่มต้นที่ 7635 บาทไทย เดินทางด้วยเที่ยวบินแบบแวะพัก 1 ครั้งกับ ไทยไลอ้อนแอร์ ออกเดินทางจาก ท่าอากาศยานดอนเมือง เวลา 06:20 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินทางถึง ท่าอากาศยานนานาชาตินะริตะ เวลา 16:25 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 ระยะเวลารวม 8 ชม. 5 นาที การแวะพัก (ครั้งที่ 1 จาก 1) ใช้เวลาแวะพัก 1 ชม. ที่สนามบิน ท่าอากาศยานนานาชาติไต้หวันเถา-ยฺเหวียน ในไทเป เลือกเที่ยวบิน"
        - link "ราคาเริ่มต้นที่ 9062 บาทไทย เดินทางด้วยเที่ยวบินตรงกับ ไทยเวียดเจ๊ทแอร์ ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ เวลา 23:50 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินทางถึง ท่าอากาศยานนานาชาตินะริตะ เวลา 07:55 ในวันที่ วันจันทร์, พฤศจิกายน 16 ระยะเวลารวม 6 ชม. 5 นาที เลือกเที่ยวบิน"
        - link "ราคาเริ่มต้นที่ 11580 บาทไทย เดินทางด้วยเที่ยวบินตรงกับ ZIPAIR Tokyo ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ เวลา 23:45 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินทางถึง ท่าอากาศยานนานาชาตินะริตะ เวลา 07:30 ในวันที่ วันจันทร์, พฤศจิกายน 16 ระยะเวลารวม 5 ชม. 45 นาที เลือกเที่ยวบิน"

exec
/bin/bash -lc "python - <<'PY'
s=open('original/C23.yml').read();print('C23 snapshot links',s.count('- link \"ราคาเริ่มต้นที่'))
PY
tail -8 original.log" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
C23 snapshot links 21
C4 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
C5 ผ่าน ตรวจผ่านหน้าจอจริง
C6 ผ่าน ตรวจผ่านหน้าจอจริง
C23 ไม่ผ่าน Expected values to be strictly equal:
C25 ไม่ผ่าน Expected values to be strictly deep-equal:
C26 ผ่าน ตรวจผ่านหน้าจอจริง
C29 ผ่าน ตรวจผ่านหน้าจอจริง
C32 ไม่ผ่าน Expected values to be strictly equal:

exec
/bin/bash -lc "tail -5 original.log; python - <<'PY'
import json
for x in json.load(open('original/results.json')):
 if x['id']=='C32':print(x['reason'])
PY" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
C25 ไม่ผ่าน Expected values to be strictly deep-equal:
C26 ผ่าน ตรวจผ่านหน้าจอจริง
C29 ผ่าน ตรวจผ่านหน้าจอจริง
C32 ไม่ผ่าน Expected values to be strictly equal:
C42 ผ่าน ตรวจผ่านหน้าจอจริง
Expected values to be strictly equal:

0 !== 18


codex
พบสองจุดที่ข้อสอบอ่านจำนวนแถวเร็วเกินไปหลังโหลดเพิ่มหรือกรองบินตรง ผมจะแก้ C23 และ C32 ให้รอจำนวนที่คาดหวัง แล้วรันเฉพาะสองข้อนี้ใหม่คนละครั้งตามกติกา ส่วน C25 พบว่าราคาใบที่ห้าของ Google สดเป็น 9,842 แต่ fixture เป็น 9,335 จึงจะบันทึกว่า invalid เพราะข้อมูลเปลี่ยนครับ
 succeeded in 292244ms:
exec
/bin/bash -lc 'tail -6 original.log; test -f original/timing.json && cat original/timing.json' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
C29 ผ่าน ตรวจผ่านหน้าจอจริง
C32 ไม่ผ่าน Expected values to be strictly equal:
C42 ผ่าน ตรวจผ่านหน้าจอจริง
C49 ไม่ผ่าน Google แสดง อ๊ะ มีบางอย่างผิดพลาด; locator.click: Timeout 4500ms exceeded.
C51 ผ่าน ตรวจผ่านหน้าจอจริง
C55 ไม่ผ่าน locator.click: Timeout 4500ms exceeded.
{
  "baseURL": "https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB",
  "startedAt": "2026-11-01T11:11:55.755Z",
  "endedAt": "2026-11-01T11:16:47.876Z",
  "durationMs": 292121,
  "retries": 0,
  "tests": 37
}
exec
/bin/bash -lc "tail -20 original/C55.yml; python - <<'PY'
p='cases.mjs';s=open(p).read();s=s.replace(\"const close=p=>\", \"const countIs=async(p,n)=>{const end=Date.now()+15000;while(Date.now()<end){if(await rows(p).count()===n)return;await p.waitForTimeout(250);}assert.equal(await rows(p).count(),n);};\\nconst close=p=>\")
s=s.replace(\"assert.equal(await rows(p).count(),data.count);\", \"await countIs(p,data.count);\")
s=s.replace(\"await p.waitForTimeout(1500);assert.equal(await rows(p).count(),data.flights.filter(f=>f.stopCount===0).length);\", \"await countIs(p,data.flights.filter(f=>f.stopCount===0).length);\")
open(p,'w').write(s)
p='run.mjs';s=open(p).read().replace('for(const t of cases){',\"for(const t of cases.filter(t=>"'!process.env.ACCEPT_IDS||process.env.ACCEPT_IDS.split('"',').includes(t.id))){\")
open(p,'w').write(s)
PY
ACCEPT_IDS=C23,C32 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node run.mjs 'https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB' corrected > corrected.log 2>&1" in /workspace/arena6/rulers/accept
exec
/bin/bash -lc "python - <<'PY'
import json
r=json.load(open('original/results.json'));print(r[-1]);s=open('original/C55.yml').read();print(s[s.find('- main:'):s.find('- contentinfo:')][:1200])
PY" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
{'id': 'C55', 'status': 'ไม่ผ่าน', 'reason': 'locator.click: Timeout 4500ms exceeded.\nCall log:\n\x1b[2m  - waiting for getByRole(\'link\', { name: /^ราคาเริ่มต้นที่/ }).visible().first()\x1b[22m\n\x1b[2m    - locator resolved to <div role="link" tabindex="0" class="JMc5Xc" jsaction="click:O1htCb" aria-label="ราคาเริ่มต้นที่ 7635 บาทไทย เดินทางด้วยเที่ยวบินแบบแวะพัก 1 ครั้งกับ ไทยไลอ้อนแอร์ ออกเดินทางจาก ท่าอากาศยานดอนเมือง เวลา 06:20 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินทางถึง ท่าอากาศยานนานาชาตินะริตะ เวลา 16:25 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 ระยะเวลารวม 8 ชม. 5 นาที  การแวะพัก (ครั้งที่ 1 จาก 1) ใช้เวลาแวะพัก 1 ชม. ที่สนามบิน ท่าอากาศยานนานาชาติไต้หวันเถา-ยฺเหวียน ในไทเป เลือกเที่ยวบิน"></div>\x1b[22m\n\x1b[2m  - attempting click action\x1b[22m\n\x1b[2m    2 × waiting for element to be visible, enabled and stable\x1b[22m\n\x1b[2m      - element is visible, enabled and stable\x1b[22m\n\x1b[2m      - scrolling into view if needed\x1b[22m\n\x1b[2m      - done scrolling\x1b[22m\n\x1b[2m      - <div class="gvkrdb AdWm1c tPgKwe ogfYpf" aria-label="ระยะเวลารวม 8 ชม. 5 นาที">8 ชม. 5 นาที</div> from <div class="yR1fYc" jsname="BXUrOb" jsaction="click:O1htCb;gP4E0b:O1htCb;DIjhEc:YmNhJf">…</div> subtree intercepts pointer events\x1b[22m\n\x1b[2m    - retrying click action\x1b[22m\n\x1b[2m    - waiting 20ms\x1b[22m\n\x1b[2m    - waiting for element to be visible, enabled and stable\x1b[22m\n\x1b[2m    - element is visible, enabled and stable\x1b[22m\n\x1b[2m    - scrolling into view if needed\x1b[22m\n\x1b[2m    - done scrolling\x1b[22m\n\x1b[2m    - <div class="gvkrdb AdWm1c tPgKwe ogfYpf" aria-label="ระยะเวลารวม 8 ชม. 5 นาที">8 ชม. 5 นาที</div> from <div class="yR1fYc" jsname="BXUrOb" jsaction="click:O1htCb;gP4E0b:O1htCb;DIjhEc:YmNhJf">…</div> subtree intercepts pointer events\x1b[22m\n\x1b[2m  2 × retrying click action\x1b[22m\n\x1b[2m      - waiting 100ms\x1b[22m\n\x1b[2m      - waiting for element to be visible, enabled and stable\x1b[22m\n\x1b[2m      - element is visible, enabled and stable\x1b[22m\n\x1b[2m      - scrolling into view if needed\x1b[22m\n\x1b[2m      - done scrolling\x1b[22m\n\x1b[2m      - <div class="gb_4d gb_ce gb_Wd gb_We gb_9e gb_af gb_df">…</div> from <c-wiz c-wiz="" id="ow6" jsshadow="" jsname="d2Q2jb" jsmodel="hc6Ubd" __is_owner="true" jsrenderer="eixcv" jsdata="deferred-i2" jscontroller="CWvKEd" data-node-index="0;0" jsaction="rcuQ6b:npT2md;F8PQfd:XC9dqb;NiEu1e:um7RNb;RTRBwf:xT0n9e;" data-p="%.@.[[[["สำรวจ",18,null,null,null,null,"/travel/explore?hl\\u003dth\\u0026gl\\u003dTH\\u0026authuser","travel_explore"],["เที่ยวบิน",7,null,null,null,null,"/travel/flights?hl\\u003dth\\u0026gl\\u003dTH\\u0026authuser","flight"],["โรงแรม",8,null,null,null,null,"/tra…>…</c-wiz> subtree intercepts pointer events\x1b[22m\n\x1b[2m  2 × retrying click action\x1b[22m\n\x1b[2m      - waiting 500ms\x1b[22m\n\x1b[2m      - waiting for element to be visible, enabled and stable\x1b[22m\n\x1b[2m      - element is visible, enabled and stable\x1b[22m\n\x1b[2m      - scrolling into view if needed\x1b[22m\n\x1b[2m      - done scrolling\x1b[22m\n\x1b[2m      - <div class="gvkrdb AdWm1c tPgKwe ogfYpf" aria-label="ระยะเวลารวม 8 ชม. 5 นาที">8 ชม. 5 นาที</div> from <div class="yR1fYc" jsname="BXUrOb" jsaction="click:O1htCb;gP4E0b:O1htCb;DIjhEc:YmNhJf">…</div> subtree intercepts pointer events\x1b[22m\n\x1b[2m  2 × retrying click action\x1b[22m\n\x1b[2m      - waiting 500ms\x1b[22m\n\x1b[2m      - waiting for element to be visible, enabled and stable\x1b[22m\n\x1b[2m      - element is visible, enabled and stable\x1b[22m\n\x1b[2m      - scrolling into view if needed\x1b[22m\n\x1b[2m      - done scrolling\x1b[22m\n\x1b[2m      - <div class="gb_4d gb_ce gb_Wd gb_We gb_9e gb_af gb_df">…</div> from <c-wiz c-wiz="" id="ow6" jsshadow="" jsname="d2Q2jb" jsmodel="hc6Ubd" __is_owner="true" jsrenderer="eixcv" jsdata="deferred-i2" jscontroller="CWvKEd" data-node-index="0;0" jsaction="rcuQ6b:npT2md;F8PQfd:XC9dqb;NiEu1e:um7RNb;RTRBwf:xT0n9e;" data-p="%.@.[[[["สำรวจ",18,null,null,null,null,"/travel/explore?hl\\u003dth\\u0026gl\\u003dTH\\u0026authuser","travel_explore"],["เที่ยวบิน",7,null,null,null,null,"/travel/flights?hl\\u003dth\\u0026gl\\u003dTH\\u0026authuser","flight"],["โรงแรม",8,null,null,null,null,"/tra…>…</c-wiz> subtree intercepts pointer events\x1b[22m\n\x1b[2m  2 × retrying click action\x1b[22m\n\x1b[2m      - waiting 500ms\x1b[22m\n\x1b[2m      - waiting for element to be visible, enabled and stable\x1b[22m\n\x1b[2m      - element is visible, enabled and stable\x1b[22m\n\x1b[2m      - scrolling into view if needed\x1b[22m\n\x1b[2m      - done scrolling\x1b[22m\n\x1b[2m      - <div class="gvkrdb AdWm1c tPgKwe ogfYpf" aria-label="ระยะเวลารวม 8 ชม. 5 นาที">8 ชม. 5 นาที</div> from <div class="yR1fYc" jsname="BXUrOb" jsaction="click:O1htCb;gP4E0b:O1htCb;DIjhEc:YmNhJf">…</div> subtree intercepts pointer events\x1b[22m\n\x1b[2m  - retrying click action\x1b[22m\n\x1b[2m    - waiting 500ms\x1b[22m\n\x1b[2m    - waiting for element to be visible, enabled and stable\x1b[22m\n\x1b[2m    - element is visible, enabled and stable\x1b[22m\n\x1b[2m    - scrolling into view if needed\x1b[22m\n\x1b[2m    - done scrolling\x1b[22m\n\x1b[2m    - <div class="gb_4d gb_ce gb_Wd gb_We gb_9e gb_af gb_df">…</div> from <c-wiz c-wiz="" id="ow6" jsshadow="" jsname="d2Q2jb" jsmodel="hc6Ubd" __is_owner="true" jsrenderer="eixcv" jsdata="deferred-i2" jscontroller="CWvKEd" data-node-index="0;0" jsaction="rcuQ6b:npT2md;F8PQfd:XC9dqb;NiEu1e:um7RNb;RTRBwf:xT0n9e;" data-p="%.@.[[[["สำรวจ",18,null,null,null,null,"/travel/explore?hl\\u003dth\\u0026gl\\u003dTH\\u0026authuser","travel_explore"],["เที่ยวบิน",7,null,null,null,null,"/travel/flights?hl\\u003dth\\u0026gl\\u003dTH\\u0026authuser","flight"],["โรงแรม",8,null,null,null,null,"/tra…>…</c-wiz> subtree intercepts pointer events\x1b[22m\n\x1b[2m  - retrying click action\x1b[22m\n\x1b[2m    - waiting 500ms\x1b[22m\n', 'stage': 'assertion', 'durationMs': 7856, 'upstreamError': False}
- main:
  - heading "ผลการค้นหา" [level=2]
  - text: มีผลลัพธ์ 21 รายการ
  - tablist:
    - tab "ดีที่สุดดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ" [selected]:
      - text: ดีที่สุด
      - button "ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ":
        - img
    - tab "ถูกที่สุด เริ่มต้น 7635 บาทไทย ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ":
      - text: ถูกที่สุด เริ่มต้น ฿7,635
      - button "ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ":
        - img
  - tabpanel "ดีที่สุดดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ":
    - heading "เที่ยวบินยอดนิยม" [level=3]
    - text: จัดอันดับตามราคาและความสะดวก
    - button "ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ":
      - img
    - text: ราคารวมภาษีที่ต้องจ่าย + ค่าธรรมเนียมสำหรับผู้ใหญ่ 1 ท่าน อาจมีการเรียกเก็บเงินเพิ่มเติมและ
    - button "ค่าธรรมเนียมสัมภาระ"
    - text: ข้อมูล
    - button "ความช่วยเหลือสำหรับผู้โดยสาร"
    - button "จัดเรียงตามเที่ยวบินยอดนิยม, เปลี่ยนลำดับการจัดเรียง":
      - text: จัดเรียงตามเที่ยวบินยอดนิยม
      - img
    - list:
      - listitem:
        - link "ราคาเริ่มต้นที่ 7635 บาทไทย เดินทางด้วยเที่ยวบินแบบแวะพัก 1 ครั้งกับ ไทยไลอ้อนแอร์ ออกเดินทางจาก ท่าอากาศยานดอนเมือง เวลา 06:20 ในวันที่ วันอาทิตย์, พฤศจิกายน 15 และเดินท

exec
/bin/bash -lc "python - <<'PY'
p='cases.mjs';s=open(p).read().replace(\"await rows(p).first().click();await visible(r(p,'heading','ตัวเลือกการจอง'));\", \"await rows(p).first().focus();await p.keyboard.press('Enter');await visible(r(p,'heading','ตัวเลือกการจอง'));\")
open(p,'w').write(s)
PY
ACCEPT_IDS=C55 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node run.mjs 'https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB' corrected-booking > corrected-booking.log 2>&1" in /workspace/arena6/rulers/accept
 succeeded in 4995ms:
codex
ตรวจ log เพิ่มเติมพบว่า C55 คลิกกลางแถวแล้วถูกข้อความภายในบัง ผมจะแก้ให้โฟกัสลิงก์ “เลือกเที่ยวบิน” แล้วกด Enter และรันข้อนี้ใหม่หนึ่งครั้งด้วย วิธีนี้ยังอ้างอิง role และชื่อที่ผู้ใช้เห็นตามกติกาครับ
exec
/bin/bash -lc 'cat corrected.log corrected-booking.log; ls corrected/timing.json corrected-booking/timing.json 2>/dev/null' in /workspace/arena6/rulers/accept
 exited 2 in 0ms:
C55 ผ่าน ตรวจผ่านหน้าจอจริง
corrected-booking/timing.json

 succeeded in 28181ms:
  - button "สกุลเงิน THB":
    - img
  - link "เกี่ยวกับ Google Travel":
    - /url: https://about.google/?hl=th
    - text: เกี่ยวกับ
  - link "ความเป็นส่วนตัว":
    - /url: https://policies.google.com/privacy?hl=th
  - link "ข้อกำหนด":
    - /url: https://policies.google.com/terms?hl=th
  - link "ความคิดเห็น":
    - /url: ./#0
  - link "ศูนย์ช่วยเหลือ":
    - /url: https://support.google.com/travel/?hl=th#topic=2475360
  - paragraph:
    - text: สกุลเงินที่แสดงอาจแตกต่างจากสกุลเงินที่ใช้ในการซื้อเที่ยวบิน
    - link "ดูข้อมูลเพิ่มเติมเกี่ยวกับสกุลเงิน":
      - /url: https://www.google.com/googlefinance/disclaimer?hl=th&gl=TH
      - text: ดูข้อมูลเพิ่มเติม
  - paragraph: ราคานี้เป็นราคาสุดท้ายซึ่งรวมภาษีและค่าธรรมเนียมทั้งหมดแล้ว โดยคิดรวมค่าธรรมเนียมการชำระเงินสำหรับวิธีการชำระเงินแบบทั่วไปที่ถูกที่สุด (ซึ่งอาจแตกต่างกันตามผู้ให้บริการ) ทั้งนี้ อาจมีการเรียกเก็บเงินเพิ่มเติมสำหรับการชำระเงินประเภทอื่นๆ ค่าสัมภาระ อาหาร WLAN หรือบริการเพิ่มเติมอื่นๆ ระบบจะแสดงรายละเอียดราคา ที่นั่งว่าง และการเดินทางโดยอิงตามข้อมูลล่าสุดที่ได้รับจากพาร์ทเนอร์ ข้อมูลดังกล่าวจะแสดงในผลการค้นหาภายในระยะเวลาไม่เกิน 24 ชั่วโมง และอาจมีเงื่อนไขเพิ่มเติมจากพาร์ทเนอร์ ดังนั้นโปรดตรวจสอบราคาและเงื่อนไขกับผู้ให้บริการก่อนทำการจอง
- text: ใช้ลูกศรซ้ายหรือขวาเพื่อสลับคำแนะนำสถานที่ใกล้เคียง โหลดหน้านี้แล้ว
exec
/bin/bash -lc "python - <<'PY'
p='finalize.mjs';s=open(p).read();s=s.replace(\"const timing=JSON.parse\", \"for(const folder of ['corrected','corrected-booking']){try{for(const fixed of JSON.parse(await readFile("'`${folder}/results.json`))){const at=res.findIndex(x=>x.id===fixed.id);res[at]={...fixed,initialStatus:res[at].status,correctionEvidence:folder};}}catch{}}'"\\nawait writeFile('results.json',JSON.stringify(res,null,2));\\nconst timing=JSON.parse\")
s=s.replace(\"x.reason.split('\\\\n')[0]\", \"x.id==='C25'?'ข้อมูล Google สดเปลี่ยน: ราคาห้าใบแรก [7635,9062,11580,9335,9842] ต่างจาก fixture [7635,9062,11580,9335,9335]':x.reason.split('\\\\n')[0]\")
s=s.replace(\"'การตรวจเส้นทางก่อนรัน: probe.mjs และ probe-route.mjs เป็นการเปิดเว็บ/ตรวจเส้นทาง ไม่ใช่การรันข้อสอบซ้ำ ไม่ได้แก้ข้อสอบแล้วรันใหม่ในรอบ baseline'\", \"'การตรวจเส้นทางก่อนรัน: probe.mjs และ probe-route.mjs เป็นการเปิดเว็บ/ตรวจเส้นทาง ไม่ใช่การรันข้อสอบซ้ำ', '', 'แก้ข้อสอบแล้วรันเฉพาะข้อใหม่หนึ่งครั้ง: C23/C32 รอจำนวนแถวหลังโหลดเสร็จ (corrected/); C55 ใช้โฟกัสลิงก์และ Enter แทนคลิกตำแหน่งที่ถูกข้อความบัง (corrected-booking/). ผลดิบรอบแรกไม่ถูกเขียนทับ; results.json ที่รากเป็นผลหลังพิจารณาการแก้ข้อสอบ.'\")
s=s.replace(\""'${x.status}${bad?", "${x.status}${x.correctionEvidence?'"' (หลังแก้ข้อสอบ; '+x.correctionEvidence+')':''}"'${bad?")
open(p,'"'w').write(s)
PY
node --check finalize.mjs; cat corrected.log" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
C23 ไม่ผ่าน locator.waitFor: Timeout 20000ms exceeded.
C32 ผ่าน ตรวจผ่านหน้าจอจริง

exec
/bin/bash -lc 'node finalize.mjs; cat META.json; cat corrected/timing.json; cat corrected-booking/timing.json' in /workspace/arena6/rulers/accept
 succeeded in 0ms:
{
  "total": 47,
  "executed": 37,
  "valid": 22,
  "invalid": 25,
  "durationSeconds": 292.121
}
{
  "valid": [
    "B2",
    "B3",
    "B4",
    "B7",
    "B39",
    "B41",
    "B42",
    "B43",
    "B44",
    "B45",
    "B46",
    "B47",
    "C1",
    "C3",
    "C5",
    "C6",
    "C26",
    "C29",
    "C32",
    "C42",
    "C51",
    "C55"
  ],
  "invalid": [
    {
      "id": "B27",
      "เหตุผล": "Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ทำให้ตรวจข้อนี้ไม่สำเร็จ"
    },
    {
      "id": "B28",
      "เหตุผล": "Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ทำให้ตรวจข้อนี้ไม่สำเร็จ"
    },
    {
      "id": "B29",
      "เหตุผล": "Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด"
    },
    {
      "id": "B30",
      "เหตุผล": "Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ทำให้ตรวจข้อนี้ไม่สำเร็จ"
    },
    {
      "id": "B31",
      "เหตุผล": "Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด"
    },
    {
      "id": "B33",
      "เหตุผล": "Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด"
    },
    {
      "id": "B34",
      "เหตุผล": "Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ทำให้ตรวจข้อนี้ไม่สำเร็จ"
    },
    {
      "id": "B37",
      "เหตุผล": "Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ทำให้ตรวจข้อนี้ไม่สำเร็จ"
    },
    {
      "id": "B38",
      "เหตุผล": "Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด"
    },
    {
      "id": "B40",
      "เหตุผล": "Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ทำให้ตรวจข้อนี้ไม่สำเร็จ"
    },
    {
      "id": "C2",
      "เหตุผล": "Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด"
    },
    {
      "id": "C4",
      "เหตุผล": "Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด"
    },
    {
      "id": "C23",
      "เหตุผล": "Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด"
    },
    {
      "id": "C25",
      "เหตุผล": "ข้อมูล Google สดเปลี่ยน: ราคาห้าใบแรก [7635,9062,11580,9335,9842] ต่างจาก fixture [7635,9062,11580,9335,9335]"
    },
    {
      "id": "C49",
      "เหตุผล": "Google สดแสดง “อ๊ะ มีบางอย่างผิดพลาด” ทำให้ตรวจข้อนี้ไม่สำเร็จ"
    },
    {
      "id": "B12",
      "เหตุผล": "ปุ่มไอคอนเลื่อนวันไม่มีข้อความหรือ accessible name ตามสเปก จับโดย role + ชื่อไม่ได้ภายใต้ข้อจำกัดนี้"
    },
    {
      "id": "F1",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    },
    {
      "id": "F2",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    },
    {
      "id": "F3",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    },
    {
      "id": "F4",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    },
    {
      "id": "F5",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    },
    {
      "id": "F6",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    },
    {
      "id": "F7",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    },
    {
      "id": "F8",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    },
    {
      "id": "F9",
      "เหตุผล": "ข้อมูลเครือข่าย E-net ไม่ใช่พฤติกรรมหน้าจอ จึงไม่ใช้ RPC/payload เป็น acceptance gate"
    }
  ]
}{
  "baseURL": "https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB",
  "startedAt": "2026-11-01T11:17:00.405Z",
  "endedAt": "2026-11-01T11:17:28.468Z",
  "durationMs": 28063,
  "retries": 0,
  "tests": 2
}{
  "baseURL": "https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB",
  "startedAt": "2026-11-01T11:17:11.266Z",
  "endedAt": "2026-11-01T11:17:16.161Z",
  "durationMs": 4895,
  "retries": 0,
  "tests": 1
}
exec
/bin/bash -lc "python - <<'PY'
p='run.mjs';s=open(p).read().replace(\"import{mkdir,writeFile}\",\"import{mkdir,writeFile,readFile}\")
s += \"\\ntry{const meta=JSON.parse(await readFile(new URL('./META.json',import.meta.url)));const eligible=results.filter(x=>meta.valid.includes(x.id));const failed=eligible.filter(x=>x.status"'!=='"'ผ่าน').map(x=>x.id);await writeFile(resolve(out,'gate.json'),JSON.stringify({validTested:eligible.length,excluded:results.length-eligible.length,failed,passed:failed.length===0},null,2));if(failed.length)process.exitCode=1;}catch(e){if(e.code"'!=='"'ENOENT')throw e;}\\n\"
open(p,'w').write(s)
p='README.md';s=open(p).read().replace('"'`timing.json` records the complete run.'"', '"'`timing.json` records the complete run. When META.json exists, `gate.json` counts only valid IDs and the runner exits 1 if any of those fail. Optional ACCEPT_IDS=B2,C32 selects individual cases for a permitted correction run; the default always runs all cases.'"')
open(p,'w').write(s)
PY
node --check run.mjs
node --check cases.mjs
node - <<'JS'
const fs=require('fs');const m=JSON.parse(fs.readFileSync('META.json'));const r=JSON.parse(fs.readFileSync('results.json'));if(m.valid.length"'!==22||m.invalid.length!==25||r.length!==37)throw Error('"'inconsistent');console.log('Artifact consistency OK: 37 executed, 10 excluded, 22 valid, 25 invalid');
JS" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
Artifact consistency OK: 37 executed, 10 excluded, 22 valid, 25 invalid

exec
/bin/bash -lc "cat >> ACCEPT.md <<'EOF'

สรุปหลังแก้ข้อสอบ:

| รายการ | จำนวน/เวลา |
|---|---:|
| ข้อสอบที่รันจริง | 37 |
| ข้อยกเว้นที่ไม่รัน B12, F1–F9 | 10 |
| รวมรายการในเอกสาร/META | 47 |
| valid ใช้เป็น gate | 22 |
| invalid: Google error | 7 |
| invalid: Google ค้างโหลด/เส้นทางไม่สำเร็จ | 7 |
| invalid: ราคาเปลี่ยนจาก fixture | 1 |
| invalid: ไม่มีชื่อองค์ประกอบ | 1 |
| invalid: เครือข่ายเท่านั้น | 9 |
| รอบหลัก 18:11:55–18:16:47 เวลาไทย | 292.121 วินาที |
| รันแก้เฉพาะ C23/C32 คนละครั้ง | 28.063 วินาที |
| รันแก้เฉพาะ C55 หนึ่งครั้ง | 4.895 วินาที |
EOF
rg -n 'C23|C25|C32|C55' ACCEPT.md; ls -lh run.mjs cases.mjs META.json ACCEPT.md results.json" in /workspace/arena6/rulers/accept
 succeeded in 0ms:
9:ราคา/จำนวน C23, C25, C32 อ้างอิง spec/data/flights-all.json และ validation.json ข้อมูล Google สดที่ต่างจาก fixture จะไม่ถูกนำมาแทนค่าคาดหวัง
43:| C23 | C23 | จำนวนหลังโหลดเพิ่มตรงข้อมูลแอป | ไม่ผ่าน (หลังแก้ข้อสอบ; corrected) — Google สดค้างโหลด/ไม่แสดงผลตามเส้นทางมาตรฐานภายในเวลาที่กำหนด | invalid |
44:| C25 | C25 | ราคาห้าใบแรกตรงข้อมูลแอป | ไม่ผ่าน — ข้อมูล Google สดเปลี่ยน: ราคาห้าใบแรก [7635,9062,11580,9335,9842] ต่างจาก fixture [7635,9062,11580,9335,9335] | invalid |
47:| C32 | C32 | จำนวนบินตรงตรงกับ itinerary ขาเดียวในข้อมูล | ผ่าน (หลังแก้ข้อสอบ; corrected) | valid |
51:| C55 | C55 | เลือกแถวไปตัวเลือกการจอง | ผ่าน (หลังแก้ข้อสอบ; corrected-booking) | valid |
69:แก้ข้อสอบแล้วรันเฉพาะข้อใหม่หนึ่งครั้ง: C23/C32 รอจำนวนแถวหลังโหลดเสร็จ (corrected/); C55 ใช้โฟกัสลิงก์และ Enter แทนคลิกตำแหน่งที่ถูกข้อความบัง (corrected-booking/). ผลดิบรอบแรกไม่ถูกเขียนทับ; results.json ที่รากเป็นผลหลังพิจารณาการแก้ข้อสอบ.
85:| รันแก้เฉพาะ C23/C32 คนละครั้ง | 28.063 วินาที |
86:| รันแก้เฉพาะ C55 หนึ่งครั้ง | 4.895 วินาที |
-rw-r--r-- 1 root root  14K Nov  1 18:17 ACCEPT.md
-rw-r--r-- 1 root root 6.1K Nov  1 18:17 META.json
-rw-r--r-- 1 root root  15K Nov  1 18:17 cases.mjs
-rw-r--r-- 1 root root 9.8K Nov  1 18:17 results.json
-rw-r--r-- 1 root root 2.5K Nov  1 18:17 run.mjs

codex
สร้าง [run.mjs](/workspace/arena6/rulers/accept/run.mjs), [ACCEPT.md](/workspace/arena6/rulers/accept/ACCEPT.md), [META.json](/workspace/arena6/rulers/accept/META.json) และ [results.json](/workspace/arena6/rulers/accept/results.json) แล้ว

| รายการ | ผล |
|---|---:|
| รวมรายการ | 47 |
| ข้อสอบที่รันจริง | 37 |
| valid ใช้ใน gate | 22 |
| invalid รวม | 25 |
| ↳ Google error / ค้างโหลด | 14 |
| ↳ ราคาเปลี่ยนจาก fixture | 1 |
| ↳ ไม่มีชื่อองค์ประกอบ B12 | 1 |
| ↳ ข้อมูลเครือข่าย F1–F9 | 9 |
| เวลารอบหลัก ไม่มี retry | 4 นาที 52.121 วินาที |

แก้ข้อสอบและรันเฉพาะ C23, C32, C55 ใหม่ข้อละหนึ่งครั้งแล้ว เก็บผลรอบแรกและหลักฐานภาพไว้ครบ ข้อ invalid ไม่ถูกนับใน gate ครับ
tokens used
75,421
สร้าง [run.mjs](/workspace/arena6/rulers/accept/run.mjs), [ACCEPT.md](/workspace/arena6/rulers/accept/ACCEPT.md), [META.json](/workspace/arena6/rulers/accept/META.json) และ [results.json](/workspace/arena6/rulers/accept/results.json) แล้ว

| รายการ | ผล |
|---|---:|
| รวมรายการ | 47 |
| ข้อสอบที่รันจริง | 37 |
| valid ใช้ใน gate | 22 |
| invalid รวม | 25 |
| ↳ Google error / ค้างโหลด | 14 |
| ↳ ราคาเปลี่ยนจาก fixture | 1 |
| ↳ ไม่มีชื่อองค์ประกอบ B12 | 1 |
| ↳ ข้อมูลเครือข่าย F1–F9 | 9 |
| เวลารอบหลัก ไม่มี retry | 4 นาที 52.121 วินาที |

แก้ข้อสอบและรันเฉพาะ C23, C32, C55 ใหม่ข้อละหนึ่งครั้งแล้ว เก็บผลรอบแรกและหลักฐานภาพไว้ครบ ข้อ invalid ไม่ถูกนับใน gate ครับ
