# agent-team — รายละเอียด

## ไฟล์ใน run directory (`/workspace/.agent-team/<run_id>/`)

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `graph.json` | งานทั้งหมดและความสัมพันธ์ (`lead` ต่อท้ายงานที่หัวหน้า dispatch) |
| `board.md` | กระดานความรู้กลาง ต่อท้ายเท่านั้น `- [เวลา · ผู้เขียน] ข้อความ` |
| `msgs/<จาก>__<ถึง>.md` | ข้อความส่งต่องาน (ระบบเขียนให้ทุกเส้น depends_on และทุกการย้ายงาน) · `msgs/<node>__progress.md` = ความคืบหน้าของงานยาว (ผู้รับงานต่ออ่านก่อน) |
| `out/<node>.md` | ผลของงาน (เก็บไว้แม้ผิดรูปแบบ) · review: `out/<id>.rN.work.md` `out/<id>.rN.review.md` · debate/best_of: `out/<id>.A.md` ... `out/<id>.judge.md` |
| `ledger.jsonl` | สถิติทุกครั้งที่เรียก + เหตุการณ์ (`event`: `worker_switch` `worker_stop` `lead_switch`) |
| `state.json` | สถานะงานแต่ละชิ้น (`status planned account value error`), บัญชี (`check stopped stop_reason unusable quota role`), หัวหน้าปัจจุบัน, `lead_history`, `switches`, `events` |
| `handoff.md` | checkpoint ของหัวหน้าแต่ละคน + สถานะอัตโนมัติที่ผู้ควบคุมเขียนทุกครั้งที่สลับหัวหน้า |
| `approve/<node>` | ไฟล์อนุมัติของ human gate (`team.py approve`) |
| `final/` | ที่วางผลรวม · `logs/` = log ของลูกทีมที่หัวหน้า dispatch |

สถานะงาน: `pending` → `waiting_approval` → `running` → `ok` | `failed` | `bad_output` | `blocked`

## ledger กลาง `/workspace/.agent-team/ledger.jsonl`

ทุกการเรียกผ่านสคริปต์ของสกิล (yolo.py / cyolo.py / team.py) เพิ่ม 1 แถว (และในแถว ledger ของ run ถ้ามี):
`ts_start ts_end run_id node account cli model effort duration_s input_tokens cached_input_tokens cache_write_tokens output_tokens reasoning_tokens cost_usd status error prompt_chars result_chars real_model` · ไม่เก็บข้อความ prompt หรือ secret
- `node` ของงานย่อย: `<id>#w1` `<id>#r1` (review) · `<id>#A` `<id>#judge` (debate/best_of) · `lead#<episode>` (หัวหน้า) · `check` (ตรวจความพร้อม)
- tokens ที่นับกับงบ = input (ไม่รวม cache read) + cache_write + output · Codex: input − cached_input

## การเลือกบัญชี

1. `account` เจาะจง → ใช้บัญชีนั้นเท่านั้น ถ้าไม่พร้อม/หยุดรับงาน/ล้ม → งานล้มพร้อมเหตุผล ไม่ย้ายเงียบ
2. ฝั่ง (`yolo`/`cyolo`) หรือ `any` → คะแนน = % โควตาที่ใช้ (ไม่รู้ = 50) + 15 × งานที่วางแผน/รันอยู่ + tokens ใน run/20000 เลือกต่ำสุด · `any` ใช้ router ตาม `kind` ก่อน
3. รายชื่อบัญชีที่ใช้ได้ = `--workers` ถ้ามี · ถ้าทุก node ระบุบัญชีเจาะจง = เฉพาะบัญชีในกราฟ · ไม่เช่นนั้น = ทุกบัญชีของฝั่งที่กราฟใช้
4. แผน (`planned`) ทำตอนรับงาน · บัญชีหยุดรับงาน → งานในคิวที่วางแผนไว้ย้ายทันที (`worker_switch`) · งานที่กำลังรันปล่อยให้จบ

## โควตา

- Claude: `/usage` ตอนเริ่ม + `rate_limit_event` จากทุกการเรียก (five_hour = session, seven_day = week)
- Codex: `rate_limits` จาก rollout ล่าสุด (เวลาของข้อมูลอาจเก่า)
- สถานะใน `status`: พร้อม / ใกล้หมด (≥ เกณฑ์−20%) / หยุดรับงาน / ใช้ไม่ได้

## หัวหน้าทีม (lead)

ผู้ควบคุม (`team.py lead`) วนรอบ:
1. เลือกหัวหน้า: `--leader` หรือบัญชี Claude ที่พร้อมตัวแรก · ผู้สืบทอด: `--succession` ตามลำดับ หรืออัตโนมัติ (พร้อม → ฝั่งเดียวกันก่อน → โควตาเหลือมาก → ข้ามฝั่ง)
2. รันหัวหน้าหนึ่ง episode ด้วย env `MA_TEAM_RUN`, `MA_TEAM_ROLE=leader` · นับ tokens สดจาก stream-json
3. คำสั่งของหัวหน้า (รู้ run จาก env):
   - `team.py dispatch --id X --difficulty N [--account any] [--depends a,b] [--expect number] [--type image --path /abs.png] --prompt "..."`
   - `team.py wait --ids a,b` (สูงสุด 300 วินาที/ครั้ง) · `team.py status`
   - `team.py checkpoint --done "..." --next "..." [--running "..."] [--decision "..."]`
   - `team.py finish --output /abs/final.md --summary "..."`
4. หลังทุก `dispatch` / `checkpoint` / `wait` ตรวจงบหัวหน้า (`--lead-token-budget`) ถ้าเกิน คำสั่งพิมพ์ `STOP` → หัวหน้า checkpoint แล้วผู้ควบคุมจบรอบ → สลับเชิงรุก
5. หัวหน้าล้ม (โควตา/ล็อกอิน/timeout/heartbeat > `--heartbeat-timeout`) หรือ `--simulate-crash` → ผู้ควบคุมเขียนสถานะอัตโนมัติลง `handoff.md` แล้วเริ่มหัวหน้าคนใหม่ → สลับเชิงรับ
6. ทุกการสลับบันทึกใน `state.json.lead_history`, `board.md`, ledger (`event: lead_switch`)

`--demo`: หัวหน้าคนที่ 1 ล้มหลัง dispatch ครั้งแรก · หัวหน้าคนที่ 2 มีงบ 1 token (STOP หลัง dispatch แรก) · การเรียกลูกทีมครั้งแรกจำลองโควตาหมด (ย้ายงาน) · ลูกทีมที่ทำงานแรกสำเร็จถูกตั้งงบ 1 (หยุดรับงาน) · ลูกทีมพร้อมกัน 1 งานต่อบัญชี · ไม่ใส่ `--goal` = งานตัวอย่างคำนวณ 4 ข้อแล้วรวมเป็นตาราง

## ตัวจำลองสำหรับทดสอบ (ไม่เผาโควตาจริง)

- `MA_SIMULATE_LIMIT=yolo1,cyolo2` (env) หรือ `--simulate-limit` → การเรียกบัญชีนั้นล้มทันทีเหมือนโควตาหมด (tokens 0)
- `--worker-token-budget yolo1=1` → yolo1 หยุดรับงานหลังงานแรก
- `--lead-token-budget 1` → หัวหน้าทุกคนเกินงบหลังคำสั่งแรก

## ข้อควรระวัง

- ห้าม `eval` หรือรันผลลัพธ์ของ agent เป็นคำสั่ง shell · ส่งข้อมูลยาวด้วย `{{file:id}}`
- `{{id}}` ที่ยาวเกิน 2000 ตัวอักษรถูกแทนด้วยข้อความให้อ่านไฟล์แทน
- human gate รอสูงสุด `--gate-timeout` (ค่าเริ่มต้น 1800 วินาที) แล้วหยุด รันต่อด้วย `--resume`
