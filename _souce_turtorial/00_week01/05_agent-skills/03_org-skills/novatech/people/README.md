# 🪪 พนักงานโนวาเทค 28 คน

แต่ละคน **เก่งคนละเรื่อง** และความเก่งนั้นยังอยู่ในหัวของเขาคนเดียว (หัวข้อ 18.2) · 👑 = หัวหน้า / ผู้ดูแล skill ของแผนก
ข้อมูลต้นทาง: [seed/people.json](../seed/people.json) · การ์ดแยกโฟลเดอร์ตามแผนก: `people/<แผนก>/<user>.md` (ชื่อโฟลเดอร์ = ชื่อทีมใน Gitea)

## ผังองค์กร: ใครรายงานต่อใคร (4 ชั้น)

[![ผังองค์กรโนวาเทค 4 ชั้น 28 คน ภาพเดียว: ชั้น 1 MD สมชาย (md-somchai) มีผู้ช่วยผู้บริหารพลอยไพลิน (exec-ploy) ขึ้นตรง → ชั้น 2 ผู้บริหาร 3 สาย สายธุรกิจ วิทย์ (cco-wit) ดูแล Sales (sales-nida 👑, sales-krit, sales-mook 🆕) SA (sa-ton 👑, sa-ice) Product (pm-beam 👑, pm-gift) · สายเทคโนโลยี ณัฐ (cto-nat) ดูแล Dev (dev-pond 👑, dev-mew, dev-new 🆕) QA (qa-mint 👑, qa-bank) DevOps (ops-art 👑, ops-fon) ML (ml-jay 👑, ml-pim) ทีมกลาง (plat-ken 👑, plat-may) · สายบริหารและการเงิน หญิง (cfo-ying) ดูแล HR (hr-fah 👑, hr-oat, hr-namtan 🆕) บัญชี (fin-joy 👑, fin-nok) · กล่องบนสุดของแต่ละคอลัมน์คือหัวหน้าแผนก (ชั้น 3) ที่เหลือคือพนักงาน (ชั้น 4) · แต่ละกล่องมีชื่อ user บทบาท และ skill](../../img/org-chart.png)](../../img/org-chart.png)

| ชั้น | ใคร | สั่งงานใคร |
|---|---|---|
| 1 · MD | `md-somchai` | ผู้บริหารสาย 3 คน + ผู้ช่วยผู้บริหาร |
| 2 · ผู้บริหารสาย | `cco-wit` สายธุรกิจ · `cto-nat` สายเทคโนโลยี · `cfo-ying` สายบริหารและการเงิน | หัวหน้าแผนกในสายของตัวเอง |
| 2 · สำนัก MD | `exec-ploy` ผู้ช่วยผู้บริหาร 👑 | — (ช่วยงาน MD และดูแล skill ฝั่งผู้บริหาร) |
| 3 · หัวหน้าแผนก 👑 | 10 คน | ลูกทีมในแผนกตัวเอง |
| 4 · พนักงาน | ที่เหลือ รวมน้องใหม่ | — |

| สายงาน | ผู้บริหาร | แผนกในสาย |
|---|---|---|
| สายธุรกิจ | `cco-wit` | Sales · Presales / SA · Product |
| สายเทคโนโลยี | `cto-nat` | Dev · QA · DevOps · ML / MLOps · ทีมกลาง (platform) |
| สายบริหารและการเงิน | `cfo-ying` | HR · บัญชี / ธุรการ |

> 🏛️ **ทีมกลาง (platform)** ไม่ใช่ทีมดูแลระบบลูกค้า แต่เป็นทีมภายในที่ดูแลเครื่องมือกลางและ **คลัง skill ของทั้งบริษัท** (repo, CI, กติกาหัวไฟล์) อยู่ในสายเทคโนโลยี

## รายชื่อตามแผนก

### 👔 MD / ผู้บริหาร · `exec/` · 5 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`md-somchai`](exec/md-somchai.md) | สมชาย วงศ์ประเสริฐ | MD (กรรมการผู้จัดการ) | — | `deal-approval` |
| [`exec-ploy`](exec/exec-ploy.md) | พลอยไพลิน ศรีสุข | ผู้ช่วยผู้บริหาร 👑 | `md-somchai` | `exec-deck` |
| [`cco-wit`](exec/cco-wit.md) | วิทย์ ประภาสกุล | ผู้อำนวยการสายธุรกิจ (CCO) ดูแล Sales · SA · Product | `md-somchai` | `pipeline-review` |
| [`cto-nat`](exec/cto-nat.md) | ณัฐ ธนวัฒน์ | ผู้อำนวยการสายเทคโนโลยี (CTO) ดูแล Dev · QA · DevOps · ML · ทีมกลาง | `md-somchai` | `tech-risk-review` |
| [`cfo-ying`](exec/cfo-ying.md) | หญิง ศรีพัฒนา | ผู้อำนวยการสายบริหารและการเงิน (CFO) ดูแล HR · บัญชี | `md-somchai` | `cost-headcount-review` |

### 💼 Sales · `sales/` · 3 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`sales-nida`](sales/sales-nida.md) | นิดา แก้วมณี | หัวหน้าทีมขาย 👑 | `cco-wit` | `sales-proposal` |
| [`sales-krit`](sales/sales-krit.md) | กฤต ธนากร | เซลส์ | `sales-nida` | `follow-up-email` |
| [`sales-mook`](sales/sales-mook.md) | มุก จิตรดี | เซลส์น้องใหม่ (เดือนแรก) | `sales-nida` | — (น้องใหม่) |

### 🧩 Presales / SA · `sa/` · 2 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`sa-ton`](sa/sa-ton.md) | ต้นตระกูล มีชัย | SA อาวุโส 👑 | `cco-wit` | `req-to-spec` |
| [`sa-ice`](sa/sa-ice.md) | ไอศวรรย์ บุญมา | SA | `sa-ton` | `arch-template` |

### 📦 Product · `product/` · 2 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`pm-beam`](product/pm-beam.md) | บีม ศิริวัฒน์ | หัวหน้าฝ่ายผลิตภัณฑ์ (Head of Product) 👑 | `cco-wit` | `prd-writer` |
| [`pm-gift`](product/pm-gift.md) | กิ๊ฟ วรรณศิริ | Product Manager (ดูแลวงจรชีวิตผลิตภัณฑ์) | `pm-beam` | `product-sunset` |

### 💻 Dev · `dev/` · 3 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`dev-pond`](dev/dev-pond.md) | ปอนด์ เจริญกิจ | tech lead 👑 | `cto-nat` | `coding-standard` |
| [`dev-mew`](dev/dev-mew.md) | มิว อินทรสุวรรณ | Dev | `dev-pond` | `project-scaffold` |
| [`dev-new`](dev/dev-new.md) | นิว สมบูรณ์ดี | Dev คนใหม่ (วันแรก) | `dev-pond` | — (น้องใหม่) |

### 🧪 QA · `qa/` · 2 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`qa-mint`](qa/qa-mint.md) | มินท์ รัตนพงศ์ | QA lead 👑 | `cto-nat` | `test-from-plan` |
| [`qa-bank`](qa/qa-bank.md) | แบงค์ ศักดิ์ดี | QA | `qa-mint` | `bug-report` |

### ⚙️ DevOps · `devops/` · 2 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`ops-art`](devops/ops-art.md) | อาร์ต พงษ์ไพบูลย์ | DevOps lead 👑 | `cto-nat` | `deploy-checklist` |
| [`ops-fon`](devops/ops-fon.md) | ฝน จันทร์เพ็ญ | DevOps | `ops-art` | `postmortem` |

### 🤖 ML / MLOps · `mlops/` · 2 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`ml-jay`](mlops/ml-jay.md) | เจ วรวุฒิ | MLOps lead 👑 | `cto-nat` | `mlflow-experiment` |
| [`ml-pim`](mlops/ml-pim.md) | พิมพ์ชนก ทองดี | ML engineer | `ml-jay` | `model-release` |

### 🤝 HR · `hr/` · 3 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`hr-fah`](hr/hr-fah.md) | ฟ้า ประเสริฐวงศ์ | HR BP 👑 | `cfo-ying` | `jd-writer` |
| [`hr-oat`](hr/hr-oat.md) | โอ๊ต สุขสวัสดิ์ | HR | `hr-fah` | `onboarding-pack` |
| [`hr-namtan`](hr/hr-namtan.md) | น้ำตาล ใจงาม | HR น้องใหม่ (เดือนแรก) | `hr-fah` | — (น้องใหม่) |

### 🧾 บัญชี / ธุรการ · `finance/` · 2 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`fin-joy`](finance/fin-joy.md) | จอย พัฒนสิน | หัวหน้าบัญชี 👑 | `cfo-ying` | `pricing-calc` |
| [`fin-nok`](finance/fin-nok.md) | นก ศรีอำไพ | บัญชี | `fin-joy` | `invoice-check` |

### 🏛️ ทีมกลาง (platform) · `platform/` · 2 คน

| user | ชื่อ | บทบาท | รายงานต่อ | skill |
|---|---|---|---|---|
| [`plat-ken`](platform/plat-ken.md) | เคน ภักดีวงศ์ | หัวหน้าทีมกลาง (platform) 👑 | `cto-nat` | `skill-finder` |
| [`plat-may`](platform/plat-may.md) | เมย์ อรุณรัตน์ | ทีมกลาง (platform) | `plat-ken` | `customer-data-policy` |
