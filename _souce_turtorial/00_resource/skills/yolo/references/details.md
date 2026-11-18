# yolo — รายละเอียด

## โครงสร้างบัญชี

- `BASE=/root/ai-accounts` · บัญชี Claude: `$BASE/.Claude/yoloN` (wrapper ตั้ง `CLAUDE_CONFIG_DIR` ให้) · ทุกบัญชีเป็น root คนเดียวกัน แยกกันที่ระดับโฟลเดอร์
- `yoloN` = `/usr/local/bin/yoloN` → `account-wrapper` ใส่ `--dangerously-skip-permissions` (+ `--mcp-config=<shared/mcp/mcp.json>` ถ้ามี) และ `IS_SANDBOX=1` เมื่อเป็น root
- `$BASE/.Claude/yoloN/skills` เป็น symlink ทั้งโฟลเดอร์ `../shared/skills` (volume เก่า) หรือโฟลเดอร์จริงที่มี symlink รายสกิล (volume ใหม่) wrapper เชื่อมสกิลใหม่ให้ทุกครั้งที่เรียก

## สคริปต์เรียกอย่างไร

`yolo.py run` เรียก `yoloN -p <prompt> --model M --effort E --output-format stream-json --verbose --no-session-persistence --strict-mcp-config` โดยปิด stdin
stream-json ให้ผลสุดท้ายเหมือน `--output-format json` (event `result`) และเพิ่ม:
- event `assistant` ที่มี `message.usage` → นับ tokens ระหว่างรัน (agent-team ใช้ตรวจงบหัวหน้าระหว่างรอบ)
- event `rate_limit_event.rate_limit_info.unifiedWindows.{five_hour,seven_day}.utilization` → เก็บเป็นโควตาล่าสุดใน `/workspace/.agent-team/.cache/quota.json`

ฟิลด์ของผลสุดท้าย: `result`, `is_error`, `subtype`, `duration_ms`, `total_cost_usd`, `num_turns`, `session_id`, `usage.{input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, output_tokens_details.thinking_tokens}`, `modelUsage.<รุ่นจริง เช่น claude-haiku-5-5>`, `structured_output` (เมื่อใช้ `--json-schema`)

## ledger (`/workspace/.agent-team/ledger.jsonl`)

ฟิลด์: `ts_start ts_end run_id node account cli model effort duration_s input_tokens cached_input_tokens cache_write_tokens output_tokens reasoning_tokens cost_usd status error prompt_chars result_chars` (+ `real_model`)
- Claude: `input_tokens`=usage.input_tokens (ไม่รวม cache) · `cached_input_tokens`=cache_read · `cache_write_tokens`=cache_creation · `reasoning_tokens`=thinking_tokens
- `status`: `ok` | `limit` | `auth_expired` | `not_logged_in` | `timeout` | `error` | `bad_output`
- ไม่เก็บข้อความ prompt/คำตอบ เก็บแค่จำนวนตัวอักษร

## ข้อผิดพลาดที่พบบ่อย

| อาการ | ความหมาย |
|---|---|
| `is_error: true`, result `Not logged in · Please run /login` | ไม่ได้ล็อกอิน (exit code ยังเป็น 0) |
| `Failed to authenticate: OAuth session expired and could not be refreshed` (~50 ms, tokens 0) | ล็อกอินแล้วแต่หมดอายุ ให้ผู้ใช้ล็อกอินใหม่เอง |
| prompt หาย / ได้คำตอบแปลก | prompt อยู่หลัง flag ที่รับหลายค่า |
| ค้างไม่จบ | ไม่ได้ปิด stdin หรือไม่มี `-p` |
| `/usage` ไม่มีบรรทัด `Current session` | ยังไม่มี session ในช่วง 5 ชม. นี้ → รายงาน "ไม่มีข้อมูล" |
