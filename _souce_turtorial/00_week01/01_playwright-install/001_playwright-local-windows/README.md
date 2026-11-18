# ติดตั้ง Playwright บน Windows ด้วยพรอมต์ (Copy & Paste)

บทนี้ **ไม่ต้องพิมพ์คำสั่งเอง** แค่คัดลอกพรอมต์ไปวางใน Claude Code แล้วให้ AI ตรวจ ติดตั้ง และทดสอบให้
หน้าที่ของเราคือ **อ่านผล และกดยืนยัน**

## Playwright คืออะไร?

![Playwright คือหุ่นยนต์ผู้ช่วยที่ใช้เว็บแทนเรา เปิดเว็บ คลิกปุ่ม พิมพ์ข้อความ และตรวจว่าถูกไหม](img/intro-01-what-is-playwright.png)

## ทำไมต้องใช้ Playwright?

![เปรียบเทียบ ทดสอบเว็บเองทีละเบราว์เซอร์ใช้เวลาหลายชั่วโมงและพลาดได้ กับให้ Playwright ตรวจพร้อมกันหลายเบราว์เซอร์ในไม่กี่วินาที และให้ AI ใช้เว็บแทนเราได้](img/intro-02-why-playwright.png)

## ติดตั้งบน Windows ต้องลงอะไรบ้าง?

![5 ขั้นติดตั้งบน Windows: Node.js เครื่องยนต์, Playwright ตัวหุ่นยนต์, เบราว์เซอร์ทดสอบ, Playwright MCP สายเชื่อมกับ Claude, Playwright Extension ปลั๊กอินใน Chrome](img/intro-03-install-on-windows.png)

## เรียนบทนี้ยังไง?

![Copy พรอมต์ แล้ว Paste ใน Claude Code จากนั้น Claude ตรวจและถามก่อนติดตั้ง สุดท้ายได้ผลพร้อมภาพหน้าจอ](img/intro-04-copy-paste-flow.png)

**ต้องมี:** เครื่อง Windows 10/11 ที่ติดตั้ง Claude Code แล้ว · เปิด `claude` ในโฟลเดอร์ของบทนี้

**เลือกเรียนได้ 2 แบบ:** วาง **LAB 1** พรอมต์เดียวจบทั้งบท หรือทำ **ทีละขั้น** ตั้งแต่ LAB 2 → LAB 5
แต่ละ LAB มี 💬 พรอมต์ให้คัดลอก · ✅ ผลจริงที่ได้ · 👀 สิ่งที่ควรสังเกต

---

## LAB 1 · พรอมต์รวม: ตรวจและอัปเดตเครื่องมือ

![หน้าต่าง Claude Code เซสชันใหม่ วางพรอมต์ของ LAB 1 ไว้ในช่องข้อความ กรอบสีแดง](img/lab1-paste.png)

🎯 สั่ง Claude Code ให้ทำงานทั้งบทด้วยพรอมต์เดียว แล้วดูว่า AI ทำอะไรในแต่ละขั้น

💬 **คัดลอกพรอมต์นี้** (กดปุ่ม Copy มุมขวาของกรอบ)

```text
ช่วยตรวจสอบและอัปเดตเครื่องมือสำหรับใช้ Playwright MCP ทดสอบเว็บ บน Windows ตามขั้นตอนนี้
ทุกค่าที่รายงานต้องมาจากคำสั่งที่รันจริง ห้ามตอบจากความจำ

ขั้นที่ 1: ตรวจเวอร์ชันที่ติดตั้งอยู่ เทียบกับเวอร์ชันล่าสุด (อ่านอย่างเดียว ห้ามติดตั้งหรือแก้อะไร)
ตรวจทีละรายการ ดังนี้

1. Node.js
   * ที่ติดตั้งอยู่: node -v และ winget list --id OpenJS.NodeJS (ดูว่า id เป็น OpenJS.NodeJS.LTS หรือ OpenJS.NodeJS)
   * ล่าสุด: https://nodejs.org/dist/index.json เทียบกับ "สายเดียวกับที่ติดตั้งอยู่"
     (LTS เทียบกับ LTS ล่าสุด, Current เทียบกับ Current ล่าสุด) และแจ้ง LTS ล่าสุดไว้ด้วย
2. npm
   * ที่ติดตั้งอยู่: npm -v
   * ล่าสุด: npm view npm version
3. Playwright MCP (@playwright/mcp)
   * ที่ติดตั้งอยู่: npm ls -g @playwright/mcp และเวอร์ชันใน %LocalAppData%\npm-cache\_npx\*\node_modules\@playwright\mcp\package.json
     (ไม่มีแบบ global ไม่ใช่ปัญหา ถ้า config เรียกผ่าน npx)
   * ล่าสุด: npm view @playwright/mcp version
4. Playwright และเบราว์เซอร์ของ Playwright
   * ที่ติดตั้งอยู่: npx playwright --version และ npx playwright install --list (รันในโฟลเดอร์ที่มี package.json)
   * ล่าสุด: npm view playwright version
5. Google Chrome
   * ที่ติดตั้งอยู่: reg query "HKCU\Software\Google\Chrome\BLBeacon" /v version
   * ล่าสุด: https://versionhistory.googleapis.com/v1/chrome/platforms/win64/channels/stable/versions
   * ตรวจด้วยว่า winget รู้จัก Chrome หรือไม่: winget list --id Google.Chrome
6. Microsoft Edge
   * ที่ติดตั้งอยู่: reg query "HKCU\Software\Microsoft\Edge\BLBeacon" /v version
   * ล่าสุด: winget upgrade --id Microsoft.Edge (ดูว่ามีรุ่นใหม่หรือไม่)
7. Claude Code
   * ที่ติดตั้งอยู่: claude --version
   * ล่าสุด: npm view @anthropic-ai/claude-code version
8. ถ้าในโฟลเดอร์ปัจจุบันมี package.json ให้ตรวจ @playwright/test ด้วย npm outdated

ขั้นที่ 2: สรุปผลเป็นตาราง
คอลัมน์: รายการ | เวอร์ชันที่ติดตั้ง | เวอร์ชันล่าสุด | สถานะ (ล่าสุดแล้ว / ต้องอัปเดต / ยังไม่ได้ติดตั้ง) | หมายเหตุ
แสดงตารางให้ดูก่อน บอกว่ารายการไหนอัปเดตได้เอง รายการไหนต้องให้ผมทำ แล้วถามยืนยันก่อนเริ่มอัปเดต

ขั้นที่ 3: อัปเดตเฉพาะรายการที่ผมยืนยัน และไม่ใช่เวอร์ชันล่าสุด
* Node.js: winget upgrade --id <id ที่ติดตั้งอยู่จริงจากขั้นที่ 1> (ห้ามใช้ id อีกสาย เพราะจะได้ Node ติดตั้งซ้อน 2 ตัว)
  ถ้า winget ตอบ "No available upgrade found" ให้หยุด แล้วบอกให้ผมติดตั้ง MSI จาก nodejs.org เอง
* npm: npm install -g npm@latest
* @playwright/mcp: ถ้าเรียกผ่าน npx ให้ล้าง %LocalAppData%\npm-cache\_npx (ต้องปิด Claude Code ก่อน ให้บอกผม)
  ถ้าติดตั้ง global ให้ npm install -g @playwright/mcp@latest
* @playwright/test ในโปรเจกต์: npm install -D @playwright/test@latest แล้วรัน npx playwright install
* เบราว์เซอร์ของ Playwright: npx playwright install
  ถ้าขึ้น "Download failure" หรือ "timed out after 30000ms" ให้วินิจฉัยก่อนด้วย
  curl.exe -4 และ curl.exe -6 ไปที่ https://cdn.playwright.dev ถ้า IPv4 ได้แต่ IPv6 timeout
  ให้บังคับ Node ใช้ IPv4 (เช่น preload สคริปต์ให้ dns.lookup ใช้ family 4 ผ่าน NODE_OPTIONS) แล้วลองใหม่
  และลบ NODE_OPTIONS ออกหลังใช้
* Chrome: winget upgrade --id Google.Chrome
  ถ้า winget ไม่รู้จัก Chrome ให้แจ้งผมให้เปิด chrome://settings/help เอง
* Edge: winget upgrade --id Microsoft.Edge
* Claude Code: claude update
ถ้าคำสั่งใดต้องใช้สิทธิ์ Administrator หรือรันไม่ผ่าน ให้หยุดแล้วบอกคำสั่งที่ผมต้องรันเอง ห้ามข้าม และห้ามแก้ไฟล์ config ระบบเอง

ขั้นที่ 4: ตรวจปลั๊กอินและการตั้งค่าที่เกี่ยวข้อง
* รัน claude mcp list แล้วดูว่า playwright ขึ้น Connected หรือไม่
  (Connected แปลว่า server เริ่มได้เท่านั้น ยังไม่ได้แปลว่าเปิดเบราว์เซอร์ได้ ต้องทดสอบในขั้นที่ 5)
* หา config ของ playwright ให้ครบทุกที่: ~/.claude.json (user scope), .mcp.json ในโปรเจกต์ และ claude_desktop_config.json
  ตรวจว่า args ใช้ @playwright/mcp@latest และ --browser ตรงกับเบราว์เซอร์ที่ติดตั้งไว้
* ถ้าใช้โหมด --extension ให้ตรวจว่า Chrome extension "Playwright Extension"
  (id mmlmfjhmonkocbjadbfplnigmagldckm) ติดตั้งจริงในโปรไฟล์ Default โดยดูโฟลเดอร์
  %LocalAppData%\Google\Chrome\User Data\Default\Extensions\mmlmfjhmonkocbjadbfplnigmagldckm
  และอ่านเวอร์ชันจาก manifest.json (อย่าเชื่อแค่ว่า "กดติดตั้งแล้ว")
* ถ้าผมบอกว่ารีสตาร์ท Chrome แล้ว ให้ตรวจเวลาเริ่มของ process หลักของ chrome.exe (ตัวที่ไม่มี --type=)
  ว่าเริ่มหลังรีสตาร์ทจริง ถ้ายังเป็นตัวเดิม ให้บอกผม
* ดูว่ามี MCP หรือปลั๊กอินอื่นที่ใช้งานเบราว์เซอร์ซ้ำซ้อนกันอยู่หรือไม่ ถ้ามีให้แจ้ง

ขั้นที่ 5: ทดสอบหลังอัปเดต
* รันขั้นที่ 1 ซ้ำ แล้วแสดงตารางเทียบ ก่อน/หลัง อัปเดต
* ใช้ Playwright MCP เปิด https://www.google.co.th ใน "แท็บใหม่" (browser_tabs new) ค้นหาคำว่า Playwright MCP
  แล้วจับภาพหน้าผลการค้นหา เพื่อยืนยันว่าใช้งานได้ ถ้าเจอ CAPTCHA ให้หยุดแล้วบอกผม ห้ามพยายามผ่าน
  ถ้าใช้โหมด --extension ห้ามใช้หรืออ่านแท็บเดิมที่ผมเปิดไว้ (อาจเป็นอีเมลหรือบัญชีส่วนตัว)
  และก่อนเก็บภาพลงโปรเจกต์ ให้เบลอข้อมูลส่วนตัว เช่น รูปโปรไฟล์ / ชื่อบัญชี
  ถ้า MCP ใน Claude ใช้ไม่ได้ ให้ทดสอบ @playwright/mcp แยกจาก Claude (รัน server เองแล้วสั่งเปิดเว็บ) เพื่อดูว่าเสียที่ server หรือที่ config/extension
  ถ้ามี console error ให้ดูว่ามาจาก chrome-extension:// (ส่วนขยายอื่น) หรือจากหน้าเว็บจริง
* สรุปว่ารายการไหนอัปเดตสำเร็จ รายการไหนล้มเหลว (แนบ error จริงมาด้วย)
  และสิ่งที่ผมต้องทำเอง เช่น รีสตาร์ท Claude หรือรีสตาร์ทเบราว์เซอร์
```

💡 **พรอมต์ที่ดีมี 4 อย่าง** (ใช้ได้กับทุกงาน)

1. 📋 **บอกให้ชัดว่าจะตรวจอะไร** → AI ไม่ต้องเดา
2. ✋ **ให้ถามก่อนลงมือ** → เราเป็นคนตัดสินใจ
3. 🛑 **ทำไม่ได้ ให้หยุดแล้วบอก** → ไม่แอบข้าม ไม่ลองมั่ว
4. ✅ **ขอหลักฐาน** → ตารางก่อน/หลัง และภาพหน้าจอ


---

## LAB 2 · ตรวจเวอร์ชัน

![หน้าต่าง Claude Code เซสชันใหม่ วางพรอมต์ของ LAB 2 ไว้ในช่องข้อความ กรอบสีแดง](img/lab2-paste.png)

💬 **คัดลอกพรอมต์นี้** (กดปุ่ม Copy มุมขวาของกรอบ)

```text
ตรวจเวอร์ชันเครื่องมือสำหรับ Playwright บนเครื่องนี้ (อ่านอย่างเดียว ห้ามติดตั้งหรือแก้อะไร)
ตรวจ Node.js, npm, Playwright MCP, Playwright, Google Chrome, Microsoft Edge และ Claude Code
เทียบกับเวอร์ชันล่าสุดจากแหล่งจริง (npm view, nodejs.org, หน้าเวอร์ชันของ Chrome) ห้ามตอบจากความจำ
แล้วสรุปเป็นตาราง: รายการ | ที่ติดตั้ง | ล่าสุด | สถานะ
อธิบายสั้น ๆ ด้วยภาษาง่าย ๆ ว่ารายการไหนต้องอัปเดต และทำไม
```

✅ **ผลจริง**

| รายการ | ที่ติดตั้ง | ล่าสุด | สถานะ |
|---|---|---|---|
| Node.js | v26.7.0 | v26.10.0 | ต้องอัปเดต |
| npm | 12.2.0 | 12.2.0 | ล่าสุดแล้ว |
| Playwright MCP | 0.0.83 | 0.0.83 | ล่าสุดแล้ว |
| Playwright Test (lab) | – | 1.63.0 | ยังไม่ได้ติดตั้ง |
| เบราว์เซอร์ของ Playwright | Chromium | – | ยังไม่มี Firefox / WebKit |
| Google Chrome | 154.0.8037.98 | 155.0.8059.40 | ต้องอัปเดต |
| Microsoft Edge | 154.0.4258.62 | 154.0.4258.62 | ล่าสุดแล้ว |
| Claude Code | 2.1.292 | 2.1.292 | ล่าสุดแล้ว |

👀 **สังเกต**
- LAB นี้ **ดูอย่างเดียว** ยังไม่มีอะไรถูกติดตั้ง
- Node.js มี 2 สาย (LTS กับ Current) Claude ต้องเทียบกับสายที่เราใช้อยู่ ไม่ใช่สายไหนก็ได้

📝 **รายการที่ต้องอัปเดต ทำเอง**
1. Chrome: เปิด `chrome://settings/help` **ใน Chrome ตัวจริง** แล้วกด Relaunch
2. Node.js: รอ winget มีรุ่นใหม่ หรือติดตั้งจาก nodejs.org เอง (ต้องใช้สิทธิ์ Administrator)

---

## LAB 3 · ติดตั้ง Playwright และเบราว์เซอร์ทดสอบ

🤔 **ทำไมต้องติดตั้งเบราว์เซอร์ทดสอบ ในเมื่อเครื่องมี Chrome อยู่แล้ว?**

![ทำไมต้องติดตั้งเบราว์เซอร์ทดสอบ: ครบ 3 ค่าย, รุ่นตรงกับ Playwright, แยกจาก Chrome ของเรา และ npm install ไม่ได้โหลดเบราว์เซอร์มาให้](img/lab3-why-test-browsers.png)

1. **ครบ 3 ค่าย** ผู้ใช้จริงเปิดเว็บด้วย Chrome/Edge, Firefox และ Safari ซึ่งใช้เครื่องยนต์คนละตัว เว็บที่ใช้ได้บนตัวหนึ่งอาจพังบนอีกตัว ส่วน Safari ลงบน Windows ไม่ได้ จึงต้องใช้ WebKit ของ Playwright แทน
2. **รุ่นตรงกับ Playwright** Playwright แต่ละรุ่นผูกกับเบราว์เซอร์รุ่นที่ทดสอบมาแล้ว ทุกเครื่องในห้องจึงได้ผลเหมือนกัน ไม่ขึ้นกับว่าใครอัปเดต Chrome ไปถึงรุ่นไหน
3. **แยกจาก Chrome ของเรา** เบราว์เซอร์ทดสอบเปิดแบบสะอาดทุกครั้ง ไม่มีบัญชี คุกกี้ หรือส่วนขยายของเรามาปน
4. **`npm install` ไม่ได้โหลดเบราว์เซอร์มาให้** ต้องรัน `npx playwright install` แยกอีกครั้ง บทถัดไป (ทดสอบเว็บร้านอาหารสัตว์) จะใช้เบราว์เซอร์ชุดนี้

![หน้าต่าง Claude Code เซสชันใหม่ วางพรอมต์ของ LAB 3 ไว้ในช่องข้อความ กรอบสีแดง](img/lab3-paste.png)

💬 **คัดลอกพรอมต์นี้** (กดปุ่ม Copy มุมขวาของกรอบ)

```text
สร้างโฟลเดอร์ lab แล้วติดตั้ง Playwright Test ในนั้นให้หน่อย
1. ติดตั้ง @playwright/test เวอร์ชันล่าสุด
2. ติดตั้งเบราว์เซอร์ทดสอบด้วย npx playwright install
ถ้าดาวน์โหลดเบราว์เซอร์ไม่ผ่าน ให้หาสาเหตุก่อน (ลอง curl.exe -4 และ curl.exe -6 ไปที่ https://cdn.playwright.dev)
ถ้า IPv6 ใช้ไม่ได้ ให้บังคับ Node ใช้ IPv4 แล้วลองใหม่
แล้วเปิดโฟลเดอร์ที่เก็บเบราว์เซอร์ทดสอบให้ผมดูใน File Explorer
```

✅ **ผลจริง** เบราว์เซอร์ทดสอบ 3 ตัว (วงสีแดง) อยู่ในโฟลเดอร์ `ms-playwright` ของเครื่อง

![File Explorer เปิดโฟลเดอร์ ms-playwright มีโฟลเดอร์ chromium-1243 firefox-1543 webkit-2359 วงสีแดงไว้](img/lab3-browsers-folder.png)

👀 **สังเกต**
- ครั้งแรก Firefox / WebKit **ดาวน์โหลดไม่ผ่าน** Claude ตรวจแล้วพบว่าเน็ตทาง IPv6 ของเครื่องนี้ใช้ไม่ได้ จึงบังคับใช้ IPv4 แล้วโหลดเสร็จใน 20 วินาที
- เบราว์เซอร์ทดสอบเก็บไว้ที่เดียว ทุกโปรเจกต์ในเครื่องใช้ร่วมกันได้

---

## LAB 4 · ติดตั้งปลั๊กอิน Playwright ใน Chrome

![หน้าต่าง Claude Code เซสชันใหม่ วางพรอมต์ของ LAB 4 ไว้ในช่องข้อความ กรอบสีแดง](img/lab4-paste.png)

🎯 ปลั๊กอินนี้ทำให้ Claude **ใช้ Chrome ตัวจริงของเรา** ได้ ขั้นนี้ **เรากดติดตั้งเอง** ด้วยมือ แล้วค่อยให้ Claude ตรวจ

💬 **คัดลอกพรอมต์นี้** (กดปุ่ม Copy มุมขวาของกรอบ)

```text
เปิดหน้า Playwright Extension ใน Chrome Web Store ให้หน่อย
https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm
```

**① กดปุ่ม "เพิ่มใน Chrome"** (Add to Chrome)

![หน้า Chrome Web Store ของ Playwright Extension วงปุ่มสีน้ำเงิน เพิ่มใน Chrome](img/lab4-step-1-store.png)

**② หน้าต่างยืนยันจะเด้งขึ้นมุมบน กด "เพิ่มส่วนขยาย"** (Add extension)

**③ ปุ่มเปลี่ยนเป็น "นำออกจาก Chrome"** (Remove from Chrome) = ติดตั้งสำเร็จแล้ว

![หน้า Chrome Web Store หลังติดตั้ง ปุ่มเปลี่ยนเป็น นำออกจาก Chrome วงสีแดงไว้](img/lab4-step-3-installed.png)

**④ ให้ Claude ตรวจซ้ำ**

```text
ผมติดตั้ง Playwright Extension แล้ว ช่วยตรวจว่าติดตั้งจริงใน Chrome โปรไฟล์ Default หรือยัง
(ดูโฟลเดอร์ Extensions\mmlmfjhmonkocbjadbfplnigmagldckm บนดิสก์) และบอกเวอร์ชัน
```

✅ **ผลจริง:** `installed: Playwright Extension v0.4.0`

⚠️ **ระวัง 2 เรื่อง** (เจอจริงตอนทำบทนี้)
- ต้องติดตั้งใน **Chrome ตัวจริง** ไม่ใช่แผงเบราว์เซอร์ในแอป Claude (หน้าตาเหมือน Chrome แต่เป็นคนละตัว)
- ถ้าต้องรีสตาร์ท Chrome ให้ **ปิดให้หมดจริง ๆ** (กดขวาไอคอน Chrome มุมขวาล่าง → ออก) แค่กด ✕ ปิดหน้าต่าง Chrome ยังทำงานอยู่เบื้องหลัง

---

## LAB 5 · ให้ AI ใช้เว็บจริง: ค้นหาใน Google

![หน้าต่าง Claude Code เซสชันใหม่ วางพรอมต์ของ LAB 5 ไว้ในช่องข้อความ กรอบสีแดง](img/lab5-paste.png)

💬 **คัดลอกพรอมต์นี้** (กดปุ่ม Copy มุมขวาของกรอบ)

```text
ใช้ Playwright MCP เปิด https://www.google.co.th ในแท็บใหม่ ค้นหาคำว่า "Playwright MCP"
แล้วจับภาพหน้าผลการค้นหา ห้ามใช้หรืออ่านแท็บเดิมที่ผมเปิดไว้
ถ้าเจอ CAPTCHA ให้หยุดแล้วบอกผม และก่อนเก็บภาพให้เบลอรูปโปรไฟล์ / ชื่อบัญชี
```

✅ **ผลจริง**

![หน้าผลค้นหา Google คำว่า Playwright MCP รูปโปรไฟล์มุมขวาบนเบลอแล้ว](img/mcp-extension-google-search.png)

👀 **สังเกต**
- ครั้งแรก Claude ไปโผล่ที่ **แท็บ Gmail** ของเรา (ปลั๊กอินใช้แท็บจริงที่เราแชร์ให้) Claude จึงหยุด ไม่อ่าน ไม่จับภาพ แล้วเปิดแท็บใหม่แทน → พรอมต์ต้องสั่ง **"แท็บใหม่"** เสมอ
- AI เห็นชื่อและอีเมลบัญชี Google ของเราได้ ภาพที่จะแชร์ต้องเบลอก่อน

---

## ถ้าเจอปัญหา: คัดลอกพรอมต์นี้

| อาการ | 💬 พรอมต์ |
|---|---|
| ดาวน์โหลดเบราว์เซอร์ไม่ผ่าน | `npx playwright install ดาวน์โหลดไม่ผ่าน ช่วยหาสาเหตุด้วย curl.exe -4 และ -6 ไปที่ cdn.playwright.dev ถ้า IPv6 ใช้ไม่ได้ให้บังคับ Node ใช้ IPv4 แล้วลองใหม่` |
| Connected แต่เปิดเว็บไม่ได้ | `Playwright MCP ขึ้น Connected แต่เปิดเว็บไม่ได้ ช่วยทดสอบ Playwright MCP แยกจาก Claude แล้วบอกว่าเสียที่ MCP หรือที่ปลั๊กอิน` |
| ติดตั้งปลั๊กอินแล้วยังหาไม่เจอ | `ผมติดตั้ง Playwright Extension และรีสตาร์ท Chrome แล้ว ช่วยตรวจโฟลเดอร์ปลั๊กอินบนดิสก์ และเวลาเริ่มของ Chrome ว่ารีสตาร์ทจริงหรือยัง` |
| อัปเดต Chrome แล้วเลขไม่เปลี่ยน | `ผมอัปเดต Chrome แล้ว ช่วยตรวจเวอร์ชันจาก registry และไฟล์ chrome.exe และดูว่า Google Updater ตรวจอัปเดตล่าสุดเมื่อไร` |

### ไฟล์ในบทนี้

```text
01_playwright-local-windows/
├─ README.md     # บทเรียน + พรอมต์ทุก LAB
└─ img/          # ภาพประกอบ
```
