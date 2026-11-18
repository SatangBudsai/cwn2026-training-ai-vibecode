# สรุปกฎกำไรและรายการราคา

> สรุปจาก `company-kit/margin-rules.md` v2026.1 (ผู้ดูแล `fin-joy`, มีผล 2026-01-01) และ `company-kit/price-list.csv`

## สูตร
```
ราคาขายรวม (ก่อน VAT) = Σ(จำนวน × unit_price) − ส่วนลด
ต้นทุนรวม             = Σ(จำนวน × cost)
กำไรขั้นต้น           = ราคาขายรวม − ต้นทุนรวม
Gross margin (%)      = กำไรขั้นต้น / ราคาขายรวม × 100
```
- คิด margin **หลังหักส่วนลด** เสมอ
- ราคาและต้นทุนทุกบรรทัดต้องมาจาก price-list · ของนอกรายการใช้ต้นทุนจริงจากใบเสนอราคาผู้ขาย + บวกอย่างน้อย 20% พร้อมหมายเหตุ
- งาน fixed-price ต้องบวก **risk buffer 10% ของ man-day ทุกบทบาท** รวมไว้ในจำนวน man-day (ไม่แยกบรรทัดให้ลูกค้าเห็น)

## เกณฑ์กำไร
| Gross margin | ผล | ผู้อนุมัติ |
|---|---|---|
| ≥ 25% | ผ่าน | หัวหน้าทีมขาย (`sales-nida`) |
| 15% – < 25% | ต้องให้ MD อนุมัติ พร้อมเหตุผลเชิงกลยุทธ์ (ลูกค้าใหม่ที่มีโอกาสต่อยอด, reference) | MD |
| < 15% | ปฏิเสธ ไม่ส่งลูกค้า ห้ามขอยกเว้น | — |

เป้า margin เฉลี่ยทั้งบริษัทปี 2026 = 30%

## ส่วนลด (คิด % จากราคาตาม price-list)
| ส่วนลด | ใครให้ได้ |
|---|---|
| ≤ 5% | เซลส์เจ้าของดีล |
| > 5% – 10% | หัวหน้าทีมขาย |
| > 10% | MD เท่านั้น และ margin หลังลดต้องยังไม่ต่ำกว่า 15% |

- ห้ามลด MA และ cloud hosting (ต้นทุนผูกกับผู้ให้บริการ)
- ส่วนลดต้องเป็นบรรทัดแยก "ส่วนลดพิเศษ" ห้ามแอบลดในราคาต่อหน่วย

## VAT
- price-list ไม่รวม VAT · VAT = รวมก่อน VAT × 0.07 ปัด 2 ตำแหน่ง
- เอกสารลูกค้าแสดง 3 บรรทัด: รวมก่อน VAT → VAT 7% → รวมทั้งสิ้น
- **ห้ามแสดงต้นทุนและ margin ในเอกสารที่ส่งลูกค้า**

## รายการราคา (บาท ไม่รวม VAT)
| code | รายการ | หน่วย | ราคาขาย | ต้นทุน |
|---|---|---|---|---|
| MD-SA | Solution Architect (SA) | man-day | 18,000 | 11,000 |
| MD-PM | Project Manager | man-day | 16,000 | 10,000 |
| MD-DEV-SR | Senior Developer / Tech Lead | man-day | 15,000 | 9,500 |
| MD-DEV | Developer | man-day | 11,000 | 7,000 |
| MD-UX | UX/UI Designer | man-day | 12,000 | 7,500 |
| MD-QA | QA Engineer | man-day | 9,000 | 5,800 |
| MD-DEVOPS | DevOps Engineer | man-day | 14,000 | 9,000 |
| MD-ML | ML Engineer / Data Scientist | man-day | 17,000 | 11,000 |
| CL-S | Cloud hosting Small (Thailand region) | month | 25,000 | 18,000 |
| CL-M | Cloud hosting Medium (Thailand region) | month | 45,000 | 32,000 |
| CL-L | Cloud hosting Large (Thailand region) | month | 85,000 | 62,000 |
| LIC-LINE | LINE OA Messaging API | month | 6,000 | 4,500 |
| LIC-APM | Monitoring / APM + log management | month | 8,000 | 5,500 |
| LIC-WAF | WAF + DDoS protection | month | 12,000 | 9,000 |
| MA-STD | Maintenance Standard 8x5 (ต่อระบบ) | year | 360,000 | 220,000 |
| MA-PREM | Maintenance Premium 24x7 (ต่อระบบ) | year | 720,000 | 450,000 |

## ตัวอย่างตรวจสอบ
SA 10 + Dev 40 + QA 15 วัน → ราคา 755,000 · ต้นทุน 477,000 · margin 36.8% (ผ่าน) · VAT 52,850 · รวมทั้งสิ้น 807,850
