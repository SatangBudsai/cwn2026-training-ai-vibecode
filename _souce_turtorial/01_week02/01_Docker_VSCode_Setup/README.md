# คู่มือเตรียมสภาพแวดล้อมทดลองด้วย Docker และ VS Code

> 📽️ **สไลด์ประกอบการสอน:** [Docker_VSCode_Devtools_Slides.html](Docker_VSCode_Devtools_Slides.html) (ฉบับ PDF: [Docker_VSCode_Devtools_Slides.pdf](Docker_VSCode_Devtools_Slides.pdf)) เล่าเนื้อหาทั้งบทเป็น 40 หน้า เริ่มจากปัญหาที่เจอจริงไปจนถึงลงมือสร้าง container เปิดด้วยเบราว์เซอร์บนเครื่อง (clone หรือดาวน์โหลดรีโปก่อน เพราะ GitHub ไม่แสดงไฟล์ HTML เป็นหน้าเว็บ) กด **← →** เปลี่ยนหน้า **F** เต็มจอ **O** ดูทุกหน้า

## ก่อนเริ่ม: ทำไมการเรียนครั้งนี้จึงใช้ Linux Container?

การเรียนครั้งนี้มีหลาย LAB ที่ต้องใช้เครื่องมือร่วมกัน และต้องทดลองปรับคำสั่ง ติดตั้งแพ็กเกจ หรือเชื่อมต่อบริการหลายแบบ เราจึงเตรียม **Linux container เป็นพื้นที่ทดลองกลาง** ให้ผู้เรียนเริ่มจากเครื่องมือพื้นฐานชุดเดียวกัน แล้วใช้ Windows และ VS Code ที่คุ้นเคยเข้ามาทำงานในพื้นที่นั้น

### ภาพรวมของการเรียนและการทดลอง

ตลอดการเรียน เราจะได้ทดลองใช้เครื่องมือพัฒนาซอฟต์แวร์ ทำงานร่วมกับ AI ออกแบบกระบวนการทำงาน และเชื่อมต่อเครื่องมือหรือบริการต่าง ๆ โดยเนื้อหาและความซับซ้อนจะค่อย ๆ เพิ่มขึ้นในบทเรียนถัดไป

Linux container จึงเป็นพื้นที่ทดลองพื้นฐานที่ใช้ต่อยอดได้หลายรูปแบบ ช่วยให้ผู้เรียนเริ่มจากชุดเครื่องมือร่วมกัน และเตรียมพร้อมสำหรับ LAB ใหม่ ๆ ที่จะเพิ่มเติมในอนาคต แต่ละบทเรียนอาจมีแพ็กเกจ บัญชี หรือการตั้งค่าเฉพาะที่ต้องเตรียมเพิ่มตามโจทย์

ภาพรวมคือ **เครื่องของเรา** จะเป็น Windows หรือ macOS ก็ได้ และจะทำงานผ่าน **VS Code**, **Claude Code** หรือ **ChatGPT / Codex** ก็ได้ ทุกทางสั่งงานเข้าไปที่ **Linux container** ซึ่งติดตั้งเครื่องมือที่ใช้เรียนไว้พร้อมแล้ว จึงเริ่มทำงานได้ทันที และเมื่อต้องการพลังประมวลผลมากขึ้น container เดียวกันนี้ก็เชื่อมต่อออกไปยัง **cloud ภายนอก** ได้ เช่น ส่งงานให้ AI model บน cloud (เช่น AWS Bedrock หรือ API ของโมเดล) หรือส่งงานหนักไปรันบน GPU server เครื่องอื่น แล้วรับผลลัพธ์กลับมาทดสอบต่อ จนถึงขั้น deploy ขึ้น cloud server

![ภาพอธิบายเครื่องของเรา Windows หรือ macOS ใช้ VS Code, Claude Code หรือ ChatGPT / Codex สั่งงานเข้า Linux container ที่ติดตั้งเครื่องมือไว้พร้อม แล้ว container เชื่อมต่อ AI model, GPU server และ cloud server สำหรับ deploy](assets/00-why-linux-container-v4.png)

*ภาพแนวคิด: สร้างด้วย Imagegen เพื่ออธิบายการเรียน ไม่ใช่ภาพหน้าจอจริง บริการ cloud ในภาพเป็นเพียงตัวอย่าง การเชื่อมต่อจริงต้องมีบัญชี สิทธิ์ใช้งาน และ API key ของบริการนั้นเอง*

ภาพเคลื่อนไหวด้านล่างแสดงลำดับการทำงานทีละขั้น: เครื่องของเรา → container → ส่งงานไป AI model / GPU server แล้วรับผลลัพธ์กลับ → deploy ขึ้น cloud

![ภาพเคลื่อนไหวแสดงลำดับ เครื่องของเรา เชื่อม container ส่งงานไป AI model และ GPU server รับผลลัพธ์กลับ แล้ว deploy ขึ้น cloud server](assets/00-why-linux-container-flow.gif)

*ภาพเคลื่อนไหวประกอบแนวคิด (ประมาณ 14 วินาที วนซ้ำ) วาดขึ้นเพื่ออธิบาย ไม่ใช่การบันทึกการทำงานจริง*

### 1) ใช้ Linux ให้สอดคล้องกับคำสั่งและเครื่องมือของชุดทดลอง

Windows ใช้พัฒนาซอฟต์แวร์ได้ แต่เมื่อ LAB ใช้ Bash, พาธแบบ Linux, สิทธิ์ไฟล์ และสคริปต์ติดตั้งสำหรับ Linux การใช้สภาพแวดล้อมเดียวกับตัวอย่างช่วยลดงานแปลงคำสั่งและการแก้ความต่างระหว่างระบบปฏิบัติการ ผู้เรียนจึงมีเวลาให้กับเนื้อหาและการทดลองมากขึ้น

บน Windows สามารถใช้ Docker Desktop ผ่าน WSL 2 เพื่อรัน Linux containers ได้ โดย WSL 2 มี Linux kernel รองรับอยู่เบื้องหลัง เราจึงยังใช้ Windows เป็นเครื่องหลักและใช้ VS Code เป็นหน้าต่างทำงานได้ ตาม [เอกสาร Docker Desktop บน WSL 2](https://docs.docker.com/desktop/features/wsl/)

สำหรับงาน AI สิ่งที่ต้องเข้ากันได้คือ **เครื่องมือที่นำคำตอบหรือคำสั่งไปทำงานจริง** เช่น shell, runtime, ไลบรารี และบริการ ไม่ใช่ตัวข้อความ prompt เอง เป้าหมายของการเลือก Linux ในวิชานี้คือให้ workflow ใช้กับตัวอย่างได้สอดคล้องกัน ไม่ได้หมายความว่า Windows ใช้ AI ไม่ได้ หรือ Linux ทำให้โมเดลฉลาดขึ้นและได้ประสิทธิภาพสูงสุดทุกงาน

### 2) เริ่มจากเครื่องมือพื้นฐานชุดเดียวกัน

แทนที่จะให้ทุกคนไล่ติดตั้ง Python, Node.js, Git และเครื่องมือระบบบน Windows แยกกัน เราใช้ image ของวิชาเป็นต้นแบบ แล้วสร้าง container สำหรับทำ LAB ช่วยลดความต่างของเครื่องมือและทำให้ผู้สอนอธิบายหรือช่วยตรวจปัญหาได้ง่ายขึ้น แนวทางนี้สอดคล้องกับ [Docker ที่ใช้จัดสภาพแวดล้อมการพัฒนาให้เป็นมาตรฐาน](https://docs.docker.com/get-started/docker-overview/) และ [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)

**container `devtools` สร้างมาจากไหน?** ทั้งหมดเริ่มจากโฟลเดอร์ [`00_Devtool_Container`](https://github.com/Tuchsanai/Teaching_CWN2026/tree/main/01_week02/01_Docker_VSCode_Setup/00_Devtool_Container) ใน GitHub ของวิชา (อยู่ในรีโปนี้ที่ [00_Devtool_Container/](00_Devtool_Container/readme.md)) ซึ่งมีไฟล์สำคัญคือ **Dockerfile** ทำหน้าที่เป็น "สูตร" บอกทีละขั้นว่าให้เริ่มจาก Ubuntu 24.04 แล้วติดตั้ง Python, Node.js, Git, Docker-in-Docker, JupyterLab และ SSH ส่วน `start.sh` เป็นสคริปต์ที่เปิดบริการเหล่านี้ทุกครั้งที่ container เริ่มทำงาน

![หน้าโฟลเดอร์ 00_Devtool_Container บน GitHub มีไฟล์ Dockerfile start.sh docker-compose.yml และ jupyter_overrides.json](assets/00-github-devtool-folder.png)

*ภาพจริงจากหน้า GitHub ของวิชา กรอบแดงคือ Dockerfile (เบลออวาตาร์บัญชีไว้)*

ผู้สอนนำสูตรนี้ไป **build** เป็น image ชื่อ `tuchsanai/devtools:2569_1` แล้วเก็บไว้บน Docker Hub ผู้เรียนจึงไม่ต้อง build เอง แค่ **run** image นี้ก็ได้ container `devtools` ที่มีเครื่องมือครบ ตามขั้นตอนในหัวข้อ 3 ใครอยากลอง build เองก็ทำตาม [readme ของโฟลเดอร์](00_Devtool_Container/readme.md) ได้

![แผนภาพ โฟลเดอร์ 00_Devtool_Container มี Dockerfile ผ่าน docker build เป็น image tuchsanai/devtools:2569_1 แล้ว docker run เป็น container devtools](assets/00-dockerfile-to-devtools.png)

*ภาพแนวคิด: สร้างด้วย Imagegen โค้ดในกรอบด้านล่างเป็นตัวอย่างย่อของ Dockerfile จริง ดูฉบับเต็มได้ที่ [Dockerfile](00_Devtool_Container/Dockerfile)*

อย่างไรก็ตาม การติดตั้งเพิ่มภายหลังยังทำให้สภาพแวดล้อมต่างกันได้ หากต้องการทำซ้ำให้ใกล้เคียงเดิม ควรใช้ image รุ่นเดียวกัน บันทึกคำสั่งติดตั้ง และระบุเวอร์ชันแพ็กเกจของแต่ละ LAB

### 3) ทดลองผิดพลาดแล้วเริ่มใหม่ได้เป็นขั้นตอน

การเรียนต้องมีการลองผิดลองถูก หากติดตั้งแพ็กเกจหรือเปลี่ยนการตั้งค่าจนระบบทดลองมีปัญหา เราสามารถ **เก็บงานที่ต้องการ → ลบ container ที่มีปัญหา → สร้างใหม่จาก image → ทำขั้นตอนตั้งค่าเพิ่มเติมอีกครั้ง** ได้ โดยไม่ต้องเริ่มติดตั้งเครื่องมือทุกอย่างบน Windows ใหม่

Image เปรียบเหมือนต้นแบบ ส่วน container คือพื้นที่ทำงานที่สร้างจากต้นแบบนั้น การสร้างใหม่จะกลับไปสู่สถานะของ image ไม่ได้กู้คืนงานและแพ็กเกจที่เพิ่มไว้ใน container เดิมโดยอัตโนมัติ ไฟล์ใน writable layer จะหายเมื่อลบ container ส่วนข้อมูลใน volume หรือ bind mount มีวงจรชีวิตแยกต่างหาก ตาม [เอกสารการจัดเก็บข้อมูลของ Docker](https://docs.docker.com/engine/storage/)

### 4) แยกพื้นที่ทดลองให้จัดการง่ายขึ้น

Container แยกกระบวนการและระบบไฟล์ของงานออกเป็นขอบเขต ช่วยลดการปะปนของแพ็กเกจทดลองกับระบบหลัก ตาม [คำอธิบาย container ของ Docker](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/) แต่ไม่ได้รับประกันว่าจะไม่กระทบเครื่องหลักเลย โดยเฉพาะชุดนี้ที่ใช้ `--privileged` เพื่อรองรับ Docker-in-Docker รวมถึงกรณีที่เชื่อมโฟลเดอร์จากเครื่องหลักเข้า container

### 5) ต่อยอดไปยัง cloud และ deploy ได้จาก environment เดียวกัน

ระหว่างพัฒนา งานบางอย่างหนักเกินเครื่องของเรา เช่น เรียกใช้โมเดล AI ขนาดใหญ่ หรือรันงานที่ต้องใช้ GPU เราจึงให้ container ส่งงานออกไปประมวลผลที่ cloud ภายนอก แล้วรับผลลัพธ์กลับมาใช้ต่อใน container ได้เลย และเมื่อพร้อมใช้งานจริง server บน cloud ส่วนใหญ่ก็เป็น Linux เช่นกัน การพัฒนาใน Linux container ตั้งแต่ต้นจึงช่วยให้ environment ตอนพัฒนาใกล้เคียงกับตอน deploy ย้ายงานง่าย และควบคุมได้ง่ายขึ้น

**devtools เป็น "ศูนย์ควบคุม" ได้ด้วย** เมื่องานโตขึ้น ระบบจริงมักไม่ได้อยู่เครื่องเดียว เช่น มีเว็บ frontend, backend ที่เป็น AI chatbot ใช้โมเดลอย่าง Qwen บน GPU, database และโมเดลอื่น ๆ แยกกันอยู่คนละเครื่องแล้วคุยกันผ่านเครือข่าย เราไม่ต้องติดตั้งเครื่องมือดูแลทั้งหมดนี้บน Windows หรือ Mac แต่สั่งงานจาก Claude Code หรือ VS Code เข้าไปที่ container ซึ่งเป็น Linux แล้วให้ container รีโมทออกไป (เช่น ผ่าน SSH, API หรือคำสั่ง deploy) เพื่อสร้าง เชื่อมต่อ และดูแลเครื่องเหล่านั้นจากที่เดียว

![ภาพอธิบาย devtools เป็นศูนย์ควบคุม: เราสั่งงานจาก Claude Code หรือ VS Code เข้า Linux container แล้ว container รีโมทไปสร้างและดูแล Frontend, Backend AI Chatbot ที่ใช้โมเดล Qwen บน GPU, Database และโมเดลอื่นที่เชื่อมกันเป็นเครือข่าย](assets/00-devtools-control-hub.png)

*ภาพแนวคิด: สร้างด้วย Imagegen เครื่องและบริการในภาพเป็นตัวอย่างของระบบที่จะได้ลองใน LAB ถัด ๆ ไป ไม่ใช่สิ่งที่ติดตั้งมาพร้อม devtools*

ข้อควรรู้: container ไม่ได้ทำให้เชื่อมต่อ cloud ได้เองโดยอัตโนมัติ ทุกบริการต้องมีบัญชี สิทธิ์ใช้งาน และ API key ของตนเอง และมีค่าใช้จ่ายตามการใช้งาน รายละเอียดจะอยู่ใน LAB ที่เกี่ยวข้อง

**เป้าหมายของการเตรียมระบบครั้งนี้:** ให้ทุกคนมีพื้นที่ Linux สำหรับทำ LAB หลายชุด ใช้คำสั่งพื้นฐานร่วมกัน และเริ่มการทดลองใหม่ได้อย่างเป็นระบบ เมื่อเข้าใจเหตุผลแล้ว ขั้นตอนถัดไปคือเตรียม Docker บนเครื่องของเรา

---

## 1. ติดตั้ง Docker Desktop บน Windows

เริ่มจากดาวน์โหลดและติดตั้ง Docker Desktop บนเครื่องของผู้เรียนก่อนสร้าง container หากติดตั้งไว้แล้ว ให้ตรวจสถานะพร้อมใช้งานตามหัวข้อ 1.4

### 1.1 เปิดเว็บไซต์และเลือกไฟล์ดาวน์โหลด

1. เปิด [เว็บไซต์ Docker Desktop](https://www.docker.com/products/docker-desktop/)

![หน้าเว็บไซต์ Docker Desktop แบบเต็มหน้าจอก่อนเปิดเมนูดาวน์โหลด](assets/00-docker-website-overview.png)

*ภาพหน้าเว็บไซต์จริงก่อนคลิกดาวน์โหลด ภาพโปรแกรมที่ปรากฏบนเว็บเป็นตัวอย่างของ Docker*

2. คลิก **Download Docker Desktop** เพื่อเปิดรายการระบบปฏิบัติการ
3. สำหรับ Windows ที่ใช้ CPU Intel หรือ AMD ทั่วไป เลือก **Download for Windows – AMD64** (รองรับทั้ง Intel และ AMD) ส่วนเครื่อง Windows on Arm ให้เลือก **ARM64**
4. หากไม่ทราบชนิดเครื่อง ให้ดู **Settings → System → About → System type** ก่อนเลือก

![หน้าเว็บไซต์ Docker จริงและเมนูเลือกดาวน์โหลด](assets/00-docker-download-menu.png)

*ภาพจับจากเว็บไซต์ Docker จริงด้วย computer use แสดงตำแหน่งปุ่มและรายการดาวน์โหลด*

### 1.2 ไฟล์ที่ดาวน์โหลดอยู่ที่ไหน?

หลังเลือก Windows เบราว์เซอร์จะดาวน์โหลดไฟล์ **Docker Desktop Installer.exe** รอจนดาวน์โหลดเสร็จ หากมีหน้าต่างถามตำแหน่งจัดเก็บ ให้เลือกโฟลเดอร์ที่หาได้ง่าย เช่น **Downloads**

- เปิด File Explorer แล้วเลือก **Downloads** จากแถบด้านซ้าย โดยทั่วไปไฟล์จะอยู่ที่ `C:\Users\<ชื่อผู้ใช้>\Downloads` เว้นแต่ตั้งค่าเบราว์เซอร์ให้บันทึกไว้ที่อื่น
- อีกวิธีคือเปิดรายการดาวน์โหลดของ Chrome หรือ Edge ด้วย **Ctrl + J** แล้วเลือก **Show in folder / แสดงในโฟลเดอร์** ที่รายการ Docker Desktop Installer
- ถ้าเคยดาวน์โหลดซ้ำ ชื่อไฟล์อาจมีเลขต่อท้าย เช่น `Docker Desktop Installer (1).exe`

### 1.3 ติดตั้ง Docker Desktop

1. ดับเบิลคลิก **Docker Desktop Installer.exe** ที่ดาวน์โหลดไว้ แล้วทำตามขั้นตอนติดตั้ง โดยใช้ค่าเริ่มต้น และเลือก **Use WSL 2 instead of Hyper-V** หากมีตัวเลือกนี้
2. เมื่อติดตั้งเสร็จ กด **Close** และรีสตาร์ตเครื่องหากระบบร้องขอ
3. เปิด **Docker Desktop** อ่านและยอมรับข้อตกลงหากตกลง แล้วรอให้สถานะเป็น **Engine running** โดยใช้โหมด **Linux containers**

หากระบบแจ้งปัญหา WSL หรือข้อกำหนดเครื่อง ให้ดูวิธีแก้ใน [คู่มือติดตั้ง Docker Desktop สำหรับ Windows](https://docs.docker.com/desktop/setup/install/windows-install/)

### 1.4 เปิด Docker Desktop และตรวจด้วย PowerShell

ภาพเคลื่อนไหวด้านล่างแสดงขั้นตอนทั้งหมดหลังติดตั้งเสร็จ: ดับเบิลคลิกไอคอน **Docker Desktop** บนหน้าจอ → รอให้โปรแกรมเปิดขึ้นมาจนขึ้น **Engine running** → เปิด **PowerShell** แล้วพิมพ์ `docker --version` และ `docker info`

![ภาพเคลื่อนไหวจริง ดับเบิลคลิกไอคอน Docker Desktop รอ Engine running แล้วเปิด PowerShell พิมพ์ docker --version และ docker info](assets/01-docker-desktop-open-check.gif)

*อัดจากหน้าจอจริง (ประมาณ 32 วินาที วนซ้ำ) ช่วงรอโปรแกรมเปิดเร่งความเร็ว 2 เท่า พื้นหลังและไอคอนอื่นบนเดสก์ท็อปถูกแทนด้วยวอลเปเปอร์ที่สร้างด้วย Imagegen เพื่อซ่อนข้อมูลส่วนตัว และเบลออวาตาร์บัญชีกับบรรทัด ID ของ engine ไว้ ส่วนหน้าต่าง Docker Desktop และผลใน PowerShell เป็นของจริง*

**1) ดับเบิลคลิกไอคอน Docker Desktop** บนหน้าจอ หรือค้นหา **Docker Desktop** จาก Start menu แล้วรอให้หน้าต่างโปรแกรมเปิดขึ้นมา ครั้งแรกอาจใช้เวลาสักครู่

**2) ตรวจมุมล่างซ้ายของหน้าต่าง** ต้องขึ้น **Engine running** ถ้าเพิ่งติดตั้งใหม่ หน้า **Containers** จะว่าง และขึ้นข้อความ *Your running containers show up here* เพราะยังไม่ได้สร้าง container ใด ๆ ซึ่งถือว่าปกติ

![Docker Desktop หลังติดตั้ง หน้า Containers ว่าง และมุมล่างซ้ายขึ้น Engine running](assets/01-docker-desktop-empty.png)

*ภาพที่ 1: Docker Desktop จริงหลังเปิดโปรแกรม ยังไม่มี container ใด ๆ กรอบสีแดงคือสถานะ Engine running (เบลออวาตาร์บัญชีไว้) เมนูบางรายการอาจต่างกันตามเวอร์ชันและการตั้งค่า เช่น Kubernetes จะแสดงเฉพาะเมื่อเปิดใช้งาน*

**3) เปิด PowerShell บน Windows** (ค้นหา *PowerShell* จาก Start menu) แล้วพิมพ์ทีละคำสั่ง:

```powershell
docker --version
docker info
```

- `docker --version` ตรวจว่ามีโปรแกรม Docker CLI แล้ว จะได้ผลประมาณ `Docker version 29.x.x, build ...`
- `docker info` ต้องแสดงข้อมูลส่วน **Server** ได้ด้วย เช่น `Operating System: Docker Desktop`, `CPUs`, `Total Memory` แปลว่า CLI ติดต่อ Docker Engine ได้สำเร็จ

![ผลจริงของ docker info ใน PowerShell แสดงข้อมูลฝั่ง Server](assets/01-powershell-docker-info.png)

*ภาพที่ 2: ช่วงท้ายของผล `docker info` จริง ข้อมูลยาวจึงเลื่อนขึ้นไป ส่วนบนสุดคือ Client ส่วนที่เห็นคือข้อมูลฝั่ง Server (เบลอบรรทัด ID ไว้) ตัวเลขอย่าง CPUs, Memory และเวอร์ชันจะต่างกันตามเครื่อง*

หาก `docker info` ขึ้นข้อผิดพลาดว่าติดต่อ daemon ไม่ได้ (เช่น *error during connect* หรือ *Cannot connect to the Docker daemon*) แปลว่า engine ยังไม่พร้อม ให้รอจน Docker Desktop ขึ้น **Engine running** แล้วรันคำสั่งอีกครั้ง

## 2. เตรียม VS Code

**เปิดโปรแกรม VS Code**

เปิด **Visual Studio Code** จาก Start menu หรือไอคอนบนเครื่อง หากยังไม่มี ให้ติดตั้งจาก [เว็บไซต์ Visual Studio Code](https://code.visualstudio.com/) ก่อน

![หน้า VS Code ก่อนเปิดส่วนขยาย](assets/02-vscode-open.jpg)

**คลิก Extensions แล้วค้นหา Dev Containers**

คลิกไอคอน **Extensions** รูปสี่เหลี่ยมที่แถบด้านซ้าย หรือกด `Ctrl+Shift+X` แล้วพิมพ์ **Dev Containers** ในช่องค้นหา

![ค้นหา Dev Containers ใน Extensions](assets/02-vscode-search.jpg)

**เลือกของ Microsoft แล้วกด Install**

คลิก **Dev Containers** ของ **Microsoft** เพื่อเปิดรายละเอียด แล้วกด **Install** รอให้ติดตั้งเสร็จ

![หน้ารายละเอียด Dev Containers ของ Microsoft](assets/02-dev-containers.jpg)

*เครื่องตัวอย่างติดตั้งแล้วจึงแสดง Disable / Uninstall เครื่องที่ยังไม่มีส่วนขยายจะเห็น Install ในบริเวณเดียวกัน*

**ติดตั้ง Container Tools แล้วเปิดแถบ Containers**

เมื่อ Dev Containers ติดตั้งเสร็จ ปุ่มจะเปลี่ยนเป็น **Disable / Uninstall** จากนั้นค้นหา **Container Tools** ของ **Microsoft** ในช่องค้นหาเดิม แล้วกด **Install**

ติดตั้งเสร็จแล้ว ที่แถบด้านซ้ายจะมี **ไอคอนรูปกล่อง (Containers)** เพิ่มขึ้นมา คลิกไอคอนนี้ แถบด้านข้างจะแสดงหัวข้อ **Containers**, **Images**, **Registries** และ **Networks** แปลว่า VS Code มองเห็น Docker บนเครื่องแล้ว แถบนี้เป็นที่เดียวกับที่ใช้ตรวจ container `devtools` ในหัวข้อ 3.2 และ 5 และใช้ **Attach Visual Studio Code** ในหัวข้อ 6 ถ้ายังไม่เคยสร้าง container หัวข้อ Containers จะยังว่าง ซึ่งถือว่าปกติ

ภาพเคลื่อนไหวด้านล่างแสดงทั้งขั้นตอน ตั้งแต่เปิด Extensions จนแถบ Containers ขึ้นมา:

![ภาพเคลื่อนไหวจริง ติดตั้ง Dev Containers และ Container Tools แล้วคลิกไอคอนรูปกล่องจนแถบ Containers ขึ้นมา](assets/02-vscode-dev-containers-install.gif)

*อัดจากหน้าจอจริงด้วย VS Code โปรไฟล์ใหม่ที่ยังไม่มีส่วนขยาย (ประมาณ 46 วินาที วนซ้ำ) ช่วงรอหลังติดตั้งเร่งความเร็ว และครอปเฉพาะหน้าต่าง VS Code*

![แถบ Containers ของ Container Tools หลังติดตั้งเสร็จ](assets/02-container-tools-panel.png)

*ผลที่ต้องได้: ไอคอนรูปกล่องที่แถบซ้าย (กรอบแดงเล็ก) และแถบ Containers ที่เปิดขึ้นมา (กรอบแดงใหญ่) ในภาพและภาพเคลื่อนไหวลบรายการใต้ Images ของเครื่องตัวอย่างออก เพื่อให้เหมือนเครื่องที่เพิ่งติดตั้ง ถ้าเครื่องผู้เรียนเคย pull image ไว้แล้ว จะเห็นรายการ image ในหัวข้อนี้*

ติดตั้ง **Claude Code** ของ Anthropic ผ่าน Extensions แบบเดียวกัน เพื่อใช้รับพรอมป์ในหัวข้อ 4 แล้วเข้าสู่ระบบ Claude Code ด้วยบัญชีของตนเอง

## 3. สร้าง container devtools ผ่าน Claude Code Desktop

วิธีที่ง่ายที่สุดคือให้ **Claude Code Desktop** บน Windows สร้าง container ให้ เราไม่ต้องจำคำสั่ง Docker แค่บอกเป็นภาษาคนว่าอยากได้อะไร พรอมต์ด้านล่างระบุชื่อ image ให้ชัดคือ `tuchsanai/devtools:2569_1` เพื่อให้ใช้ได้ตั้งแต่ **ครั้งแรก** ที่ยังไม่มี container

- **ยังไม่มี container:** Claude จะสร้าง `devtools` ใหม่จาก image นี้ แบบ privileged พร้อมเปิด port SSH และ JupyterLab
- **มี container อยู่แล้ว:** ใช้ตัวเดิม ถ้าปิดอยู่ก็เปิดให้ และไม่ลบของเดิม
- **จากนั้น:** เข้าไปติดตั้ง Claude Code กับ Codex ข้างใน ตรวจเวอร์ชัน และลองรันไฟล์ทดสอบให้ดู

ก่อนเริ่ม Docker Desktop ต้องขึ้น **Engine running** ตามหัวข้อ 1.4

| บริการ | พอร์ตบนเครื่องผู้เรียน | พอร์ตใน container |
| --- | --- | --- |
| SSH | 2222 หรือเลขว่างถัดไป | 22 |
| Jupyter | 8885 หรือเลขว่างถัดไป | 8888 |

### 3.1 วางพรอมต์ใน Claude Code Desktop

**ขั้นตอน:** เปิด Claude Code Desktop → เริ่ม **New session** → คัดลอกพรอมต์ด้านล่างไปวางในช่องพิมพ์ (Ctrl+V) → กด Enter แล้วรอให้ทำงานเสร็จ (ครั้งแรกใช้เวลาหลายนาที เพราะต้องดาวน์โหลด image และติดตั้งเครื่องมือ)

![ภาพเคลื่อนไหว วางพรอมต์สร้าง container devtools ใน Claude Code Desktop ด้วย Ctrl+V แล้วกด Enter](assets/03-claude-desktop-paste.gif)

*ภาพเคลื่อนไหวจำลองขั้นตอนวางพรอมต์ (ประมาณ 7 วินาที วนซ้ำ) ข้อความพรอมต์ตรงกับด้านล่างทุกตัวอักษร*

💬 **พรอมต์**

![หน้าต่าง Claude Code Desktop วางพรอมต์สร้าง container devtools จาก image tuchsanai/devtools:2569_1](assets/03-claude-desktop-paste.png)

```text
ช่วยเตรียม container ชื่อ devtools ในเครื่องผม จาก image tuchsanai/devtools:2569_1

- ถ้ายังไม่มี ให้สร้างใหม่แบบ privileged (เพราะข้างในต้องใช้ Docker ได้)
  เปิด port 2222 → 22 สำหรับ SSH และ 8885 → 8888 สำหรับ JupyterLab ถ้า port ไหนชน ให้ใช้เลขว่างถัดไป
- ถ้ามีอยู่แล้ว ให้ใช้ตัวเดิม (ถ้าปิดอยู่ให้เปิด) ห้ามลบของเดิม

จากนั้นเข้าไปทำงานข้างใน container
1. ติดตั้ง Claude Code และ Codex ถ้ายังไม่มี และทำให้พิมพ์ claude ได้เลย
2. บอกว่าข้างในเป็น Linux อะไร มี Python, Node.js, Git, Claude Code และ Codex เวอร์ชันไหน
3. สร้างไฟล์ /workspace/hello.py ให้พิมพ์ว่า Hello from devtools แล้วลองรันให้ดู

สรุปผลเป็นตารางสั้น ๆ พร้อมบอก port ที่ใช้จริง
```

> ถ้ามี container ชื่อ `devtools` อยู่แล้ว พรอมต์นี้จะใช้ตัวเดิมและไม่ลบ ถ้าต้องการเริ่มใหม่จาก image จริง ๆ ให้สำรองงานก่อน แล้วใช้พรอมต์ในหัวข้อ 4 ซึ่งลบตัวเดิมก่อนสร้างใหม่

✅ **ผลจริง (รันครั้งแรก)** ตอนรันยังไม่มี container `devtools` ในเครื่อง Claude จึงสร้างใหม่จาก `tuchsanai/devtools:2569_1` แบบ privileged ได้ port **2222 → 22** (SSH) และ **8885 → 8888** (JupyterLab) ตามที่ขอ ติดตั้ง Claude Code 2.1.319 กับ codex-cli 0.167.0 ให้พิมพ์ `claude` ได้ทันที รายงานว่าข้างในเป็น Ubuntu 24.04.5 LTS มี Python 3.12.3, Node.js v22.23.2, Git 2.55.0 แล้วสร้าง `/workspace/hello.py` และรันได้ผล `Hello from devtools`

![ผลจริงจาก Claude: สร้าง container devtools ใหม่ ตาราง port และเวอร์ชันเครื่องมือ และผลรัน hello.py](assets/03-claude-desktop-result.png)

*ผลจริงจากการรันพรอมต์นี้ด้วย Claude Code (Opus) บน Windows เครื่องตัวอย่าง ตอนที่ยังไม่มี container จัดหน้าใหม่ให้อ่านง่าย ข้อความคำตอบไม่ได้แก้ เวอร์ชันที่ผู้เรียนได้อาจใหม่กว่า*

### 3.2 เช็กใน VS Code ว่า container ขึ้นมาแล้ว

เปิด VS Code แล้วคลิก **ไอคอนรูปกล่อง (Containers)** ที่แถบซ้ายซึ่งติดตั้งไว้ในหัวข้อ 2 ใต้ **Containers → Individual Containers** จะเห็น `tuchsanai/devtools:2569_1 · devtools` มีไอคอนสามเหลี่ยมสีเขียว แปลว่ากำลังรัน และใต้ **Images** จะเห็น `docker.io/tuchsanai/devtools` ที่ดาวน์โหลดมา ถ้ายังไม่เห็นให้กด **Refresh** ที่หัวแถบ

![แถบ Containers ใน VS Code แสดง container devtools จาก image tuchsanai/devtools:2569_1 กำลังรัน](assets/03-vscode-devtools-running.png)

*ภาพจริงจาก VS Code หลังรันพรอมต์ กรอบแดงคือ container ที่ Claude สร้างและไอคอนรูปกล่อง ส่วน Images ลบ image อื่นของเครื่องตัวอย่างออก ให้เหลือเฉพาะ devtools*

เท่านี้ก็มี container `devtools` พร้อมใช้แล้ว ไปต่อที่หัวข้อ 5 เพื่อตรวจความพร้อม และหัวข้อ 6 เพื่อ Attach VS Code เข้าไปทำงานข้างใน หัวข้อ 4 เป็นอีกวิธีสร้าง container เดียวกันจากใน VS Code ข้ามได้ถ้าทำหัวข้อนี้สำเร็จแล้ว

ข้อควรระวัง: พรอมต์นี้สั่งให้ Claude รันคำสั่งบนเครื่องจริง ถ้าไม่ได้ใช้โหมด Bypass permissions ระบบจะถามก่อนรันแต่ละคำสั่ง ให้อ่านคำสั่งก่อนกดอนุญาตทุกครั้ง

## 4. อีกวิธี: สร้าง container ผ่าน Claude Code ใน VS Code

วิธีนี้ให้ผลเหมือนหัวข้อ 3 แต่สั่งจาก Claude Code ใน VS Code แทน และ **ลบ container devtools ตัวเดิมก่อนสร้างใหม่** ใช้ image `tuchsanai/devtools:2569_1` ชื่อ `devtools` เริ่มตรวจพอร์ต SSH ที่ `2222` และ Jupyter ที่ `8885` หากชนให้ใช้เลขว่างถัดไป

| บริการ | พอร์ตบนเครื่องผู้เรียน | พอร์ตใน container |
| --- | --- | --- |
| SSH | 2222 หรือเลขว่างถัดไป | 22 |
| Jupyter | 8885 หรือเลขว่างถัดไป | 8888 |

### 4.1 พรอมป์สำหรับสร้าง container

คัดลอกพรอมป์ด้านล่างไปวางใน Claude Code ตามหัวข้อ 4.2 เพื่อให้ดำเนินการกับ Docker บนเครื่องผู้เรียน

> ขั้นตอนตามต้นฉบับจะลบ devtools ตัวเดิม หากมีงานอยู่ ให้สำรองก่อน เพราะไฟล์ใน writable layer จะหายเมื่อลบ container

```text
เตรียม container `devtools`:

1. ถ้ามี container `devtools` อยู่แล้ว ให้ลบด้วย `docker rm -f devtools`
2. ตรวจ port <SSH_PORT>=2222 และ <JUPYTER_PORT>=8885 ถ้าชน ให้ใช้ port ว่างถัดไป
3. รัน:

docker run -dit --name devtools --privileged \
  -p <SSH_PORT>:22 -p <JUPYTER_PORT>:8888 \
  tuchsanai/devtools:2569_1

docker exec -it devtools bash -c \
'curl -fsSL https://claude.ai/install.sh | bash && npm install -g @openai/codex'


4. ตรวจด้วย `claude --version` และ `codex --version` แล้วสรุป port ที่ใช้



```

### 4.2 เปิด Claude Code แล้ววางพรอมป์

ทำขั้นตอนนี้ใน **VS Code บนเครื่องที่เปิด Docker Desktop อยู่** ก่อน Attach เข้า container

1. คลิกไอคอน **Claude Code** รูปดาวแฉกที่แถบด้านซ้าย แล้วเลือก **New session**
2. คัดลอกพรอมป์ทั้งหมดในหัวข้อ **4.1** แล้ววางลงในช่อง **Ask Claude to edit…** ด้านล่างของหน้าต่าง Claude Code
3. กดปุ่มส่ง ให้ Claude Code ดำเนินการตามพรอมป์ หากมีคำขออนุญาตรันคำสั่ง ให้ตรวจคำสั่งแล้วอนุญาตตามขั้นตอน
4. รอให้ Claude Code สร้าง container ติดตั้งเครื่องมือ และสรุปผลพร้อมพอร์ตที่ใช้จริง

![วางพรอมป์จากหัวข้อ 4.1 ใน Claude Code จริง](assets/03-claude-pasted.jpg)

*ภาพจริงหลังวางพรอมป์จาก 4.1 ในช่องด้านล่าง จากนั้นผู้เรียนกดปุ่มส่งรูปลูกศรขึ้น และรอให้ทำงานสำเร็จก่อนตรวจ container ในภาพถัดไป*

การวางข้อความเพียงอย่างเดียวยังไม่เริ่มทำงาน ต้องกดส่งและรอให้คำสั่งสำเร็จ หาก Claude Code รายงานข้อผิดพลาด ให้แก้ตามผลที่แจ้งก่อนทำขั้นตอนถัดไป อ้างอิงการใช้งานจาก [คู่มือ Claude Code ใน VS Code](https://code.claude.com/docs/en/vs-code)

## 5. ตรวจว่า container พร้อมใช้งาน

เมื่อสร้างสำเร็จ (จากหัวข้อ 3 หรือ 4) ให้เปิดแถบ **Containers** ด้านซ้าย จะเห็น **devtools** ใต้ **Individual Containers** โดยรายการอัปเดตอัตโนมัติ หากยังไม่ปรากฏให้กด **Refresh**

![devtools รันอยู่ในแถบ Containers ของ VS Code](assets/03-container-devtools-only.png)

*ผลที่ต้องได้: devtools อยู่ในสถานะทำงาน พร้อมไป Attach VS Code ในหัวข้อ 6 ภาพปรับด้วย Imagegen เพื่อซ่อนรายการอื่นและจัด devtools ไว้ด้านบน*

ตรวจสรุปจาก Claude ว่าสร้าง container และตรวจเวอร์ชัน Claude Code/Codex สำเร็จ พร้อมจดพอร์ต SSH และ Jupyter ที่ใช้จริง ขั้นตอนติดตั้งเครื่องมืออยู่ในพรอมป์แล้ว ไม่ต้องรันชุดคำสั่งติดตั้งซ้ำเอง

## 6. เปิด VS Code เข้า container

1. เปิดแถบ **Containers** ด้านซ้าย
2. หา `devtools` ใต้ **Individual Containers**
3. คลิกขวาที่แถว container
4. เลือก **Attach Visual Studio Code**
5. รอหน้าต่างใหม่เชื่อมต่อและเตรียม VS Code Server

![เมนูจริง แสดง Attach Shell และ Attach Visual Studio Code](assets/04-attach-highlight.png)

*เลือก Attach Visual Studio Code เพื่อเข้า container ภาพปรับด้วย Imagegen ให้เหลือ devtools ด้านบนและซ่อนรายการใน Images พร้อมตัวชี้เมาส์และกรอบสีส้มเน้นเมนู Attach Visual Studio Code*

อีกวิธีคือกด `Ctrl+Shift+P` แล้วค้นหา:

```text
Dev Containers: Attach to Running Container...
```

เลือก `devtools` จากรายการ วิธีนี้ต้องมี Dev Containers และ Docker พร้อมใช้งาน ตาม [คู่มือ Attach ของ VS Code](https://code.visualstudio.com/docs/devcontainers/attach-container)

![VS Code เชื่อม devtools แล้ว มีสถานะ Container ที่มุมล่างซ้าย](assets/05-connected.jpg)

*ภาพที่ 5: ตรวจแถบล่างซ้ายว่าระบุ Container และ image ของวิชาก่อนทำ LAB*

### ตรวจเครื่องมือหลังเข้า container

เปิด **Terminal → New Terminal** ในหน้าต่าง VS Code ที่เชื่อมกับ container แล้วรันทีละคำสั่ง:

```bash
whoami
claude --version
codex --version
```

`whoami` ควรแสดง `root` และอีกสองคำสั่งต้องแสดงเวอร์ชัน หากไม่พบ `claude` ให้เปิด terminal ใหม่ หรือรัน `export PATH="$HOME/.local/bin:$PATH"` แล้วตรวจอีกครั้ง ถ้ายังไม่พบหลังแก้ PATH ให้ดูวิธีแยกสาเหตุในหัวข้อ 7.3

![ผลเวอร์ชันจริงของ Claude Code และ Codex ใน root shell ของ devtools](assets/05-vscode-cli-versions.jpg)

*ผลตรวจจริง: Claude Code 2.1.280 และ codex-cli 0.156.1 ภาพจริงจาก Integrated Terminal ของ VS Code ที่ Attach เข้า devtools แล้ว โดยรันคำสั่งตรวจในฐานะ root ภายใน container เวอร์ชันที่ผู้เรียนได้อาจใหม่กว่า การแสดงเวอร์ชันยืนยันว่ามีเครื่องมือแล้ว แต่ยังไม่ใช่การเข้าสู่ระบบ*

## 7. อีกวิธี: ใช้งานผ่าน JupyterLab

นอกจาก Terminal ใน VS Code เรายังใช้เครื่องมือชุดเดียวกันผ่าน Terminal ของ JupyterLab ภายใน devtools ได้

### 7.1 เปิด JupyterLab

1. ในหน้าต่าง VS Code บนเครื่อง เปิดแถบ **Containers** แล้วคลิกขวาที่ **devtools**
2. เลือก **Open in External Browser**
3. เลือก **8888 localhost:8885** คือพอร์ต **8888 ภายใน container** ที่แมปมายังพอร์ต **8885 บนเครื่อง**
4. เบราว์เซอร์จะเปิด [JupyterLab](http://localhost:8885/lab)

![เปิด External Browser และเลือกพอร์ต](assets/06-jupyter-open.png)

*ภาพจากหน้าจอจริง ปรับด้วย Imagegen เพื่อซ่อนรายการที่ไม่เกี่ยวข้องและเน้นจุดที่ต้องเลือก*

### 7.2 เปิด Terminal และใช้เครื่องมือ

ที่หน้า **Launcher** เลือก **Terminal** ในกลุ่ม **Other** หากไม่เห็น Launcher ให้กดปุ่ม **+**

![หน้า Launcher จริงของ JupyterLab](assets/06-jupyter-launcher.png)

ตรวจเครื่องมือ:

```bash
whoami
claude --version
codex --version
```

หากพบ `claude: command not found` ให้เพิ่มตำแหน่งติดตั้งใน PATH ของ Terminal ปัจจุบัน แล้วตรวจอีกครั้ง:

```bash
export PATH="$HOME/.local/bin:$PATH"
claude --version
```

![ผลตรวจเครื่องมือจริงใน JupyterLab Terminal](assets/06-jupyter-versions.png)

*ผลตรวจจริงหลังปรับ PATH: root, Claude Code 2.1.280 และ codex-cli 0.156.1 ภาพ Terminal เป็นภาพจริง ไม่ได้สร้างผลลัพธ์ด้วย AI*

### 7.3 แยกให้ออก: "ยังไม่ได้ติดตั้ง" กับ "ติดตั้งแล้วแต่ PATH ไม่เห็น"

ทั้งสองกรณีขึ้นข้อความเดียวกันคือ `claude: command not found` แต่แก้คนละแบบ ภาพด้านล่างรันต่อเนื่องในหน้าต่างเดียวเพื่อเทียบสามสถานะ

![เทียบสามสถานะของ claude --version ใน JupyterLab Terminal](assets/06-jupyter-path-vs-install.png)

1. **บรรทัดบน — ยังไม่ได้ติดตั้ง** เปิด Terminal ทันทีหลังสร้าง container โดยยังไม่รันคำสั่งติดตั้งในพรอมต์หัวข้อ 3 หรือ 4.1 ทั้ง `claude` และ `codex` จึงไม่พบ แก้ด้วยการรันขั้นตอนติดตั้งให้ครบ
2. **บรรทัดกลาง — ติดตั้งแล้วแต่ PATH ยังไม่มี** `claude` ถูกติดตั้งไว้ที่ `~/.local/bin` แล้ว แต่ Terminal ปัจจุบันยังไม่รู้จักตำแหน่งนั้น จึงยังขึ้น `command not found` เหมือนเดิม
3. **บรรทัดล่าง — หลัง `export PATH`** เห็นเวอร์ชันทั้งคู่ ยืนยันว่าติดตั้งสำเร็จมาตั้งแต่ข้อ 2 แล้ว

วิธีแยกอย่างเร็วคือตรวจว่าไฟล์มีอยู่จริงหรือไม่ ถ้าเจอไฟล์แต่เรียกไม่ได้ แปลว่าเป็นปัญหา PATH ไม่ใช่ปัญหาการติดตั้ง:

```bash
ls ~/.local/bin/claude
```

*ภาพถ่ายจากการทดสอบใน container ที่สร้างจาก image `tuchsanai/devtools:2569_1` ชุดเดียวกัน จึงเห็น hostname และเวอร์ชัน (2.1.281) ต่างจากภาพก่อนหน้าเล็กน้อย ผลลัพธ์ในภาพเป็นของจริงจาก Terminal ไม่ได้สร้างด้วย AI*

### 7.4 เริ่มใช้เครื่องมือ

เริ่ม Claude Code ด้วย:

```bash
claude
```

หรือเปิด Terminal อีกแท็บเพื่อใช้ Codex:

```bash
codex
```

ทำขั้นตอนเข้าสู่ระบบตามที่เครื่องมือแสดงเมื่อใช้ครั้งแรก ภาพในหัวข้อ 7.2 และ 7.3 ยืนยันการติดตั้งจากเวอร์ชัน ยังไม่ใช่ผลการเข้าสู่ระบบหรือส่งงานให้ AI

ทั้ง **VS Code → Terminal** และ **JupyterLab → Terminal** เป็นสองทางเข้าถึง shell ภายใน devtools เดียวกัน เลือกใช้ตามสะดวก
