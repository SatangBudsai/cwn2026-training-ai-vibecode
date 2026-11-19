# INTERFACES · สัญญาระหว่างบล็อก (B01 เป็นเจ้าของ ห้ามบล็อกอื่นแก้ server.js / src/store.js / src/time.js / src/stubs.js)

## ความเป็นเจ้าของไฟล์

| บล็อก | ไฟล์ที่เขียน | หน้าที่ | เขียนทับ stub |
|---|---|---|---|
| B01 | `server.js` `src/store.js` `src/time.js` `src/stubs.js` `package.json` Dockerfile compose | โครง, router, ctx, test hooks, health, static/pages | – |
| B02 | `src/mod-auth.js` | `/api/auth/*`, `/api/me`, OTP/ล็อก | `ctx.session` `ctx.requireRole` |
| B03 | `src/mod-drafts.js` | ร่าง ไฟล์ ชำระเงิน QR สร้างเลขคำขอ | `ctx.testHooks.pay` |
| B04 | `src/mod-sla.js` | SLA วันทำการ ระดับเตือน แจ้งเตือน | `ctx.sla` `ctx.notify` (+ `ctx.onRequest` ประเมินแจ้งเตือน) |
| B05 | `src/mod-cases.js` | คำขอ/workflow/เอกสาร/verify, seed คำขอ | `ctx.testHooks.tamper` `ctx.pageHooks` |
| B06 | `src/mod-vault.js` | เข้ารหัส/ปิดบัง/blind index | `ctx.vault` |
| B07 | `src/mod-reports.js` | dashboard, export, audit API, admin (services/holidays/users) | – (ใช้ `ctx.audit`) |
| หน้าเว็บ | `public/*.html` `public/*.css` `public/*.js` | ดูตารางหน้าด้านล่าง | – |

ลำดับโหลดโมดูล (server.js): `mod-vault, mod-sla, mod-auth, mod-drafts, mod-cases, mod-reports` แล้วค่อยไฟล์ `mod-*.js` อื่นเรียงชื่อ · ไม่มีไฟล์ = ข้าม · **ผู้ให้บริการโหลดก่อนผู้ใช้** จึงเขียนทับ `ctx.xxx` ใน `register()` ได้ปลอดภัย
กติกา: ในโมดูลให้อ้าง `ctx.sla` / `ctx.vault` / `ctx.session` ฯลฯ **ตอนเรียกใช้** (เช่น `ctx.vault.mask(x)`) ห้าม destructure ตอน register เพราะบล็อกอื่นอาจเขียนทับภายหลัง

## โมดูล

```js
// src/mod-xxx.js
exports.register = function register(router, ctx) { router.add('GET', '/api/...', handler); };
```

## router.add(method, pattern, handler)

- `method`: `'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'*'` · `pattern`: เช่น `/api/cases/:caseNo`, `/api/files/:fileId`, ท้ายสุด `*` ได้ (`req.params['*']`)
- `handler(req, res)` (sync/async; throw `{status, code, message}` ได้ -> ตอบ error JSON · อย่างอื่น 500)
- `req.params` (ถอด URL แล้ว) · `req.query` (object) · `req.body` (JSON ที่ parse แล้ว มิฉะนั้น `{}`) · `req.raw` (Buffer ทั้งก้อน รับได้ 12 MB) · `req.headers` · `req.user` (= `ctx.session.current(req)` คำนวณก่อนเรียก handler; `null` ถ้าไม่ล็อกอิน) · `req.pathname`
- path `/api/*` ที่ไม่มี route -> 404 `NOT_FOUND` · path ตรงแต่ method ไม่ตรง -> 405 `METHOD_NOT_ALLOWED` อัตโนมัติ (B07 ยังต้อง `add` `PUT/PATCH/DELETE /api/audit` และ `/api/audit/:id` เองเพื่อให้ได้ 405 แม้ id ไม่มีจริง: ใช้ `'*'`)
- `/api/*` ทุกตัวยกเว้น `/api/test/*` จะเรียก `ctx.onRequest` fns ก่อนเข้า handler (CONTRACT ข้อ 7)

## ctx (อ่านจาก `ctx.<name>`)

| ชื่อ | ใครให้ | รายละเอียด |
|---|---|---|
| `ctx.store` | B01 | `store.db` (SQLite เฉพาะ users) · `store.mem` = `{cases:Map, drafts:Map, payments:Map, files:Map, documents:Map, audit:[], notifications:[], counters, services:{SV-01:{id,fee,feePerSqm,feeBase,sla},...}, holidays:[{date,name}], otp:Map}` (ล้างทุก reset แล้ว seed services/holidays ตาม TEST-DATA) · `store.nextId(name)` / `setCounter(name,n)` / `peekCounter(name)` · `store.users.{list,get(username),findByIdNo(idNo),pii(username)->{idNo,mobile,email},verifyPassword(u,p),createCitizen({name,idNo,mobile,email,registered}),register(username,{mobile,email}),setRole(username,role,dept)}` · user object = `{username,name,role,dept,registered}` (citizen username = `cit-<12 hex>`) |
| `ctx.clock` | B01 | แช่แข็ง ค่าเริ่มต้น `2026-12-01T09:00:00+07:00` · `nowMs() now() nowISO() set(ms) reset() toISO(ms) parts(ms)->{y,m,d,h,mi,s,dow} dateStr(ms) parseISO(str)->ms\|null` · ทุกกฎเวลาต้องอ่านจากนี้เท่านั้น |
| `ctx.bug(id)` | B01 | `ctx.bug('B03')` -> boolean จาก `BUG_MODE` (อ่านสด) |
| `ctx.json(res,status,obj,headers?)` `ctx.err(res,status,code,message,extra?)` `ctx.send(res,status,body,contentType,headers?)` `ctx.redirect(res,loc)` | B01 | err -> `{"code","message",...extra}` |
| `ctx.cookies(req)` `ctx.parseMultipart(req)` | B01 | multipart -> `{fields:{}, files:[{field,filename,contentType,buffer}]}` |
| `ctx.onReset(fn)` | B01 | `fn()` ถูกเรียกท้าย `POST /api/test/reset` (หลัง `store.reset()` และ `session.clearAll()`) ตามลำดับโหลด -> ใช้ seed ข้อมูลของบล็อกตน |
| `ctx.onRequest(fn)` | B01 | `fn(req)` ก่อน handler ของ `/api/*` (ไม่รวม `/api/test/*`) |
| `ctx.landing(user)` | B01 | path หน้าตั้งต้นของบทบาท |
| `ctx.session` | stub B01 -> **B02 เขียนทับ** | `current(req)->user\|null` (ต้องมี `username,name,role,dept,registered`) · `create(res,user)` (ตั้ง cookie HttpOnly) · `destroy(req,res)` · `clearAll()` (เรียกตอน reset) |
| `ctx.requireRole(req,res,roles)` | stub B01 -> **B02 เขียนทับ** | คืน user ถ้าผ่าน มิฉะนั้นตอบ 401 `UNAUTHENTICATED`/403 `FORBIDDEN` แล้วคืน `null` (`roles` = array หรือ string; ไม่ส่ง = แค่ล็อกอิน) · ใช้: `const u = ctx.requireRole(req,res,['officer']); if(!u) return;` |
| `ctx.audit.add(e)` | **B01 ทำจริงแล้ว** | `e={username,role,event,caseNo,fromStatus,toStatus,detail}` -> เติม `id`, `time` (ISO+07:00), `timeMs` ลง `store.mem.audit` · `ctx.audit.all()` · (B07 อ่าน/กรองเอง ห้ามมีแก้/ลบ) |
| `ctx.notify` | stub B01 -> **B04 เขียนทับ** | `emit({username,caseNo,level:'near'\|'overdue'})->rec{id,username,caseNo,level,text,createdAt}` · `listFor(username)->[]` (B04 เป็นผู้เขียน `GET /api/notifications` ด้วย) |
| `ctx.sla` | stub B01 -> **B04 เขียนทับ** | `dueAt(fromMs, workdays)->ms` · `level(caseObj{status,dueAtMs}, nowMs?)->'normal'\|'near'\|'overdue'\|'paused'\|'closed'` · `isWorkday(ms)` · `evaluate()` (B04 เรียกผ่าน `ctx.onRequest`) |
| `ctx.vault` | stub B01 (AES-GCM จริง) -> **B06 เขียนทับ** | `encrypt(plain)->string` · `decrypt(token)` · `mask(idNo)->'X-XXXX-XXXXX-65-9'` · `format(idNo)->'3-1006-00987-65-9'` · `blindIndex(plain)->hex` (ใช้ค้นเลขบัตร) · ต้องรักษา `encrypt/decrypt/blindIndex` ให้ใช้กับข้อมูลใน `users` ได้ (seed รันหลังโหลดโมดูลครบ จึงใช้ของ B06 ทั้งหมด) |
| `ctx.testHooks.pay(ref, body)` | stub (404) -> **B03** | คืน `{status, body}` ตาม CONTRACT 8 (`PAID`/`duplicate`/410/422/404) · server.js ห่อเป็น `POST /api/test/payments/:ref/pay` |
| `ctx.testHooks.tamper(docNo)` | stub (404) -> **B05** | คืน `{status, body}` |
| `ctx.pageHooks.caseVisible(user, caseNo)` | stub (true) -> **B05** | หน้า `/citizen/cases/:no` `/officer/cases/:no` ถ้า false -> 404 `not-found-msg` (citizen ต้องเป็นเจ้าของ) |
| `ctx.pageHooks.verifyStatus(code)` | stub (200) -> **B05** | คืน `200` หรือ `404` สำหรับหน้า `/verify/:code` |

## ข้อมูลที่ใครเป็นเจ้าของ (กันแย่ง)

- `store.mem.drafts/payments/files` = B03 · `cases/documents` = B05 (B05 อ่าน `files` ของ B03 ผ่าน `store.mem.files`) · `notifications` = B04 · `audit` = ผ่าน `ctx.audit.add` เท่านั้น · `services/holidays` = อ่านโดย B03/B04, เขียนโดย B07 · `otp` = B02
- seed: B03 seed ร่าง/ชำระ, B05 seed คำขอ (ตั้ง `store.setCounter('case', 31)` ฯลฯ ตามต้องการ), ทุกตัวผ่าน `ctx.onReset`
- ผู้ใช้ seed (7 บทบาท + ประชาชน 4 คน) B01 seed ให้แล้วใน `store.reset()`

## หน้าเว็บ (server.js เสิร์ฟจาก `public/`; ยังไม่มีไฟล์ = placeholder)

| Route | ไฟล์ | บทบาท |
|---|---|---|
| `/login` | `login.html` | ทุกคน |
| `/register` | `register.html` | citizen ที่ยังไม่ลงทะเบียน (ลงทะเบียนแล้ว -> `/citizen`) |
| `/citizen` · `/citizen/new/:service` · `/citizen/cases/:caseNo` | `citizen.html` `citizen-new.html` `citizen-case.html` | citizen |
| `/officer/queue` · `/officer/cases/:caseNo` | `officer-queue.html` `officer-case.html` | officer, head |
| `/head/approvals` | `head-approvals.html` | head |
| `/dashboard` · `/audit` | `dashboard.html` `audit.html` | executive · auditor |
| `/admin/services` `/admin/holidays` `/admin/users` | `admin-services.html` `admin-holidays.html` `admin-users.html` | admin |
| `/notifications` | `notifications.html` | officer, head |
| `/verify/:code` | `verify.html` | ไม่ต้องล็อกอิน |
| `/` | redirect | – |

ไม่ล็อกอิน -> 302 `/login` · บทบาทไม่ตรง -> 403 + `forbidden-msg` (ใช้ `public/403.html` ถ้ามี) · `public/404.html` ใช้กับ `not-found-msg` · ไฟล์อื่นใน `public/` เสิร์ฟเป็น static (เช่น `/app.js`, `/style.css`)

## env

`PORT` (3100) · `TEST_MODE=1` เปิด `/api/test/*` (ไม่ตั้ง -> 404 `NOT_FOUND`) · `BUG_MODE=B03,B07` · `DB_PATH` (ค่าเริ่มต้น `data/app.db`)

## test hooks (B01 ทำแล้ว)

`POST /api/test/reset` · `GET|PUT /api/test/clock` (400 `INVALID_TIME`) · `POST /api/test/payments/:ref/pay` -> `ctx.testHooks.pay` · `POST /api/test/documents/:docNo/tamper` -> `ctx.testHooks.tamper` · `GET /api/health` -> `{"status":"ok"}`
