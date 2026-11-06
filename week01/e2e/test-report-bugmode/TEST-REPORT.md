# รายงานผลการทดสอบ PawPantry

## 1. ข้อมูลรอบทดสอบ
| | |
|---|---|
| วันที่ | 2026-11-06 |
| เว็บ | http://localhost:3000 (Docker, BUG_MODE=0) |
| เบราว์เซอร์ | Chromium (Playwright 1.61.1) |
| จำนวน test | 40 |

## 2. สรุปผล
| ระดับ | ทั้งหมด | ผ่าน | ล้ม | อัตราผ่าน |
|---|---|---|---|---|
| P1 | 15 | 15 | 0 | 100.0% |
| P2 | 20 | 19 | 1 | 95.0% |
| P3 | 5 | 5 | 0 | 100.0% |
| **รวม** | **40** | **39** | **1** | **97.5%** |

## 3. ผลตามโมดูล
| โมดูล | ทั้งหมด | ผ่าน | ล้ม |
|---|---|---|---|
| API | 3 | 3 | 0 |
| สมาชิก | 6 | 5 | 1 |
| ตะกร้า | 4 | 4 | 0 |
| ค้นหา | 6 | 6 | 0 |
| สั่งซื้อ | 4 | 4 | 0 |
| คูปอง | 3 | 3 | 0 |
| หน้าแรก | 2 | 2 | 0 |
| มือถือ | 1 | 1 | 0 |
| หน้าสินค้า | 4 | 4 | 0 |
| แนะนำ | 4 | 4 | 0 |
| รายการโปรด | 3 | 3 | 0 |

## 4. ผลราย test case
| รหัส | ระดับ | ผล | GIF |
|---|---|---|---|
| TC-API-01 | P2 | ✅ ผ่าน | - (test API ไม่มีวิดีโอ) |
| TC-API-02 | P1 | ✅ ผ่าน | - (test API ไม่มีวิดีโอ) |
| TC-API-03 | P3 | ✅ ผ่าน | - (test API ไม่มีวิดีโอ) |
| TC-AUTH-01 | P1 | ✅ ผ่าน | [gifs/TC-AUTH-01.gif](gifs/TC-AUTH-01.gif) |
| TC-AUTH-02 | P2 | ❌ ล้ม | [gifs/TC-AUTH-02.gif](gifs/TC-AUTH-02.gif) |
| TC-AUTH-03 | P2 | ✅ ผ่าน | [gifs/TC-AUTH-03.gif](gifs/TC-AUTH-03.gif) |
| TC-AUTH-04 | P2 | ✅ ผ่าน | [gifs/TC-AUTH-04.gif](gifs/TC-AUTH-04.gif) |
| TC-AUTH-05 | P1 | ✅ ผ่าน | [gifs/TC-AUTH-05.gif](gifs/TC-AUTH-05.gif) |
| TC-AUTH-06 | P1 | ✅ ผ่าน | [gifs/TC-AUTH-06.gif](gifs/TC-AUTH-06.gif) |
| TC-CART-01 | P1 | ✅ ผ่าน | [gifs/TC-CART-01.gif](gifs/TC-CART-01.gif) |
| TC-CART-02 | P1 | ✅ ผ่าน | [gifs/TC-CART-02.gif](gifs/TC-CART-02.gif) |
| TC-CART-03 | P2 | ✅ ผ่าน | [gifs/TC-CART-03.gif](gifs/TC-CART-03.gif) |
| TC-CART-04 | P2 | ✅ ผ่าน | [gifs/TC-CART-04.gif](gifs/TC-CART-04.gif) |
| TC-CAT-01 | P1 | ✅ ผ่าน | [gifs/TC-CAT-01.gif](gifs/TC-CAT-01.gif) |
| TC-CAT-02 | P1 | ✅ ผ่าน | [gifs/TC-CAT-02.gif](gifs/TC-CAT-02.gif) |
| TC-CAT-03 | P2 | ✅ ผ่าน | [gifs/TC-CAT-03.gif](gifs/TC-CAT-03.gif) |
| TC-CAT-04 | P3 | ✅ ผ่าน | [gifs/TC-CAT-04.gif](gifs/TC-CAT-04.gif) |
| TC-CAT-05 | P3 | ✅ ผ่าน | [gifs/TC-CAT-05.gif](gifs/TC-CAT-05.gif) |
| TC-CAT-06 | P2 | ✅ ผ่าน | [gifs/TC-CAT-06.gif](gifs/TC-CAT-06.gif) |
| TC-CHK-01 | P1 | ✅ ผ่าน | [gifs/TC-CHK-01.gif](gifs/TC-CHK-01.gif) |
| TC-CHK-02 | P1 | ✅ ผ่าน | [gifs/TC-CHK-02.gif](gifs/TC-CHK-02.gif) |
| TC-CHK-03 | P1 | ✅ ผ่าน | [gifs/TC-CHK-03.gif](gifs/TC-CHK-03.gif) |
| TC-CHK-04 | P2 | ✅ ผ่าน | [gifs/TC-CHK-04.gif](gifs/TC-CHK-04.gif) |
| TC-CPN-01 | P1 | ✅ ผ่าน | [gifs/TC-CPN-01.gif](gifs/TC-CPN-01.gif) |
| TC-CPN-02 | P2 | ✅ ผ่าน | [gifs/TC-CPN-02.gif](gifs/TC-CPN-02.gif) |
| TC-CPN-03 | P2 | ✅ ผ่าน | [gifs/TC-CPN-03.gif](gifs/TC-CPN-03.gif) |
| TC-HOME-01 | P2 | ✅ ผ่าน | [gifs/TC-HOME-01.gif](gifs/TC-HOME-01.gif) |
| TC-HOME-02 | P2 | ✅ ผ่าน | [gifs/TC-HOME-02.gif](gifs/TC-HOME-02.gif) |
| TC-MOB-01 | P3 | ✅ ผ่าน | [gifs/TC-MOB-01.gif](gifs/TC-MOB-01.gif) |
| TC-PRD-01 | P1 | ✅ ผ่าน | [gifs/TC-PRD-01.gif](gifs/TC-PRD-01.gif) |
| TC-PRD-02 | P1 | ✅ ผ่าน | [gifs/TC-PRD-02.gif](gifs/TC-PRD-02.gif) |
| TC-PRD-03 | P2 | ✅ ผ่าน | [gifs/TC-PRD-03.gif](gifs/TC-PRD-03.gif) |
| TC-PRD-04 | P3 | ✅ ผ่าน | [gifs/TC-PRD-04.gif](gifs/TC-PRD-04.gif) |
| TC-REC-01 | P1 | ✅ ผ่าน | [gifs/TC-REC-01.gif](gifs/TC-REC-01.gif) |
| TC-REC-02 | P2 | ✅ ผ่าน | [gifs/TC-REC-02.gif](gifs/TC-REC-02.gif) |
| TC-REC-03 | P2 | ✅ ผ่าน | [gifs/TC-REC-03.gif](gifs/TC-REC-03.gif) |
| TC-REC-04 | P2 | ✅ ผ่าน | [gifs/TC-REC-04.gif](gifs/TC-REC-04.gif) |
| TC-WISH-01 | P2 | ✅ ผ่าน | [gifs/TC-WISH-01.gif](gifs/TC-WISH-01.gif) |
| TC-WISH-02 | P2 | ✅ ผ่าน | [gifs/TC-WISH-02.gif](gifs/TC-WISH-02.gif) |
| TC-WISH-03 | P2 | ✅ ผ่าน | [gifs/TC-WISH-03.gif](gifs/TC-WISH-03.gif) |

## 5. ข้อบกพร่อง
| รหัสบั๊ก | test | ความรุนแรง | อาการ | หลักฐาน |
|---|---|---|---|---|
| BUG-01 | TC-AUTH-02 | ปานกลาง (P2) | Error: expect(locator).toBeVisible() failed  Locator: getByTestId('error-confirm') | [gifs/TC-AUTH-02.gif](gifs/TC-AUTH-02.gif) |

## 6. การตัดสิน
| เกณฑ์ (หัวข้อ 6) | ผลจริง | |
|---|---|---|
| P1 ผ่านทั้งหมด | 15 / 15 | ✅ |
| อัตราผ่านรวม ≥ 95% | 39 / 40 = 97.5% | ✅ |

**สรุป: ปล่อยได้** — ผ่านเกณฑ์ทั้ง 2 ข้อ แต่ต้องบันทึกบั๊กที่ล้มไว้แก้รอบถัดไป
