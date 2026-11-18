# REPORT — LAB 7: วัดว่า "หา skill เจอไหม"

รันเมื่อ 2026-11-03 บนคลัง `novatech/org-skills` (commit `bcaa672`, clone ไว้ที่ `repo/`)

## ตัวเลขหลัก

- **skill:** 23 ตัว จาก 11 plugin
- **คำค้น:** 60 ข้อ จากพนักงาน 20 คน (ข้าม `dev-new` เพราะ `skill: null`)
- **วิธีค้น:** BM25 (k1=1.2, b=0.75) โดยตัดภาษาไทยเป็น character trigram และตัดคำอังกฤษด้วยช่องว่างหรือขีด

| ชุด | ข้อมูลที่ใช้ค้น | hit@1 | hit@5 |
|---|---|---|---|
| A | `cards-header.json` (name + description) | 59/60 (98.3%) | 59/60 (98.3%) |
| B | `cards-full.json` (+ summary ≤600 ตัวอักษร) | 58/60 (96.7%) | 60/60 (100%) |
| C | B + skill ที่ต้องใช้คู่กัน (uses/follows) | 58/60 (96.7%) | 60/60 (100%) |

**ผลคู่ skill ของชุด C:** skill ที่ถูกของแต่ละคำค้นต้องใช้คู่กับ skill อื่นรวม 93 คู่ (นับจาก uses/follows)
- top-5 ของ B มีคู่ครบเพียง **24/93** คู่
- C มีครบ **93/93** คู่ ทุกคำค้นที่ต้องมีคู่ (54/54) ได้ทั้ง skill และคู่ครบ
- hit@k ของ C นับว่าเจอเมื่อ skill ที่ถูกอยู่ใน top-k ของ B หรือเป็นคู่ของ skill ใน top-k นั้น

## ข้อควรระวัง: ตัวเลขสูงเกินจริง

**58 จาก 60 คำค้นอยู่ใน description แบบคำต่อคำ** คนเขียน skill ใส่ข้อความ "ใช้เมื่อผู้ใช้พิมพ์ …" ไว้ใน description และหยิบคำมาจากรายการ phrases ของพนักงานชุดเดียวกัน ชุดทดสอบนี้จึงเป็นข้อสอบที่เห็นเฉลยมาก่อน ตัวเลขเกือบ 100% ไม่ได้บอกว่าระบบหาเจอเมื่อพนักงานพิมพ์คำใหม่ที่ไม่เคยถูกเขียนไว้ ถ้าจะวัดจริงควรเก็บคำค้นชุดใหม่ที่ไม่ได้ใส่ไว้ใน description

## คำค้นที่หาไม่เจอหรือได้อันดับต่ำ

| คำค้น | ผู้พิมพ์ | ที่ถูก | A | B | เหตุผล |
|---|---|---|---|---|---|
| ทำสไลด์ตามแบรนด์บริษัท | plat-may | core:customer-data-policy | 6 | 4 | ข้อมูลตั้งต้นผิดเอง: คำค้นนี้เป็นเรื่องแบรนด์ แต่ผูกไว้กับ skill ของเจ้าของ (plat-may เป็นเจ้าของทั้ง brand-guide และ customer-data-policy) ผลอันดับ 1 คือ `exec-deck` หรือ `brand-guide` ซึ่งถูกต้องในทางปฏิบัติ ควรแก้ expect ใน people.json เป็น `core:brand-guide` |
| ดูแผนทดสอบแล้วบอกว่าพร้อมรันไหม | qa-mint | qa:test-from-plan | 1 | 3 | เป็นคำค้นที่ไม่อยู่ใน description คำต่อคำ (1 ใน 2 ข้อ) summary ใน B ทำให้ `req-to-spec` (พูดถึงแผนทดสอบ) และ `mlflow-experiment` (พูดถึงแผนและการรัน) แย่งคะแนนจาก trigram ทั่วไปอย่าง "แผน", "ทดสอบ", "รัน" summary ช่วยเพิ่ม recall แต่ทำให้ความแม่นอันดับ 1 ลดลง |

ดูรายข้อทั้งหมดได้ใน `eval-result.md` และ `eval-result.json` (ไฟล์ json มีคะแนน top-5 ของ A และ B ด้วย)

## Impact: ถ้าแก้ `customer-data-policy` (owner: plat-may)

ผลจาก `node graph.mjs impact customer-data-policy`:

- กระทบ **19 skill** ทั้งหมดเป็นทางตรงผ่าน `follows` ไม่มีทางอ้อม เพราะ customer-data-policy อยู่ชั้น core และไม่มีใครใช้ skill ที่ follows มันต่ออีกทอดผ่าน uses/follows
- ต้องแจ้ง **เจ้าของ 19 คน:** dev-mew, dev-pond, exec-ploy, fin-joy, fin-nok, hr-fah, hr-oat, md-somchai, ml-jay, ml-pim, ops-art, ops-fon, plat-ken, qa-bank, qa-mint, sa-ice, sa-ton, sales-krit, sales-nida
- skill ที่ไม่กระทบ: brand-guide, pricing-rules, skill-finder (อยู่ชั้น core เหมือนกัน)

**graph.json:** 43 nodes (23 skill + 20 owner) และ 92 edges ได้แก่ next 36, follows 31, owned_by 23, uses 2

## ไฟล์และวิธีรันซ้ำ

```
node build-cards.mjs      # → cards-header.json, cards-full.json
node make-queries.mjs     # → queries.json
node eval.mjs             # → eval-result.json, eval-result.md
node graph.mjs            # → graph.json
node graph.mjs impact customer-data-policy
node search.mjs cards-full.json "เช็ก PDPA ให้หน่อย"
```

ไม่ใช้ npm package ใด ๆ และทดสอบด้วย Node v26.7.0 (brief ระบุ Node 22 สคริปต์ใช้เฉพาะ API มาตรฐาน)
