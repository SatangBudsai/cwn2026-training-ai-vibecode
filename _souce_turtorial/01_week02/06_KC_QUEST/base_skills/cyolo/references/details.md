# cyolo — รายละเอียด

## โครงสร้างบัญชี

- บัญชี Codex: `/root/ai-accounts/.Codex/cyoloN` (wrapper ตั้ง `CODEX_HOME`) · wrapper ใส่ `--dangerously-bypass-approvals-and-sandbox -c cli_auth_credentials_store="file"` และ MCP จาก `shared/mcp/mcp.json`
- `$CODEX_HOME/skills` เป็นโฟลเดอร์จริง มี symlink รายสกิลไป `../../shared/skills/<สกิล>` และ Codex เขียน `skills/.system` เอง → ห้าม symlink ทั้งโฟลเดอร์ · wrapper สร้างลิงก์ของสกิลใหม่ทุกครั้งที่เรียก (`link_shared_skills`)

## JSONL จาก `exec --json`

| event | ใช้ทำอะไร |
|---|---|
| `thread.started.thread_id` | id ของรอบ |
| `item.completed.item` (`agent_message`, `command_execution`, ...) | ความคืบหน้า |
| `error.message` | ข้อความ retry (`Reconnecting... 401 Unauthorized` = ไม่ได้ล็อกอิน/หมดอายุ) |
| `turn.completed.usage.{input_tokens, cached_input_tokens, cache_write_input_tokens, output_tokens, reasoning_output_tokens}` | tokens · `input_tokens` รวม cached แล้ว |
| `turn.failed.error.message` | ล้ม |

ledger: `input_tokens`=input_tokens (รวม cached) · `cached_input_tokens` · `cache_write_tokens`=cache_write_input_tokens · `reasoning_tokens`=reasoning_output_tokens · `cost_usd`=null (Codex ไม่รายงานราคา)

## โควตา

อ่านจาก rollout ล่าสุดที่ไม่ใช่ ephemeral: `$CODEX_HOME/sessions/YYYY/MM/DD/*.jsonl` event `token_count` → `payload.rate_limits.{primary,secondary}.{used_percent, window_minutes, resets_at}` (+ `plan_type`)
- window สั้นกว่า 7 วัน → แสดงเป็น session · window ยาวที่สุด → week
- เวลาของข้อมูล = `timestamp` ของ event นั้น (อาจเก่า เพราะ `--ephemeral` ไม่เขียน sessions) · `quota --refresh` เรียก "ตอบ OK" แบบไม่ ephemeral หนึ่งครั้งเพื่อให้ข้อมูลใหม่ (ใช้ tokens เล็กน้อย)

## models_cache.json

`$CODEX_HOME/models_cache.json` → `models[]`: `slug`, `visibility` (`list`/`hide`), `priority`, `default_reasoning_level`, `supported_reasoning_levels[].effort`
- รุ่นค่าเริ่มต้นของสกิล = `visibility: list` ที่ `priority` ต่ำสุด
- effort ที่รุ่นไม่รองรับ (เช่น `ultra`) → ลดเป็นระดับสูงสุดที่รองรับ และบันทึก `note` ว่าลดจากอะไร
- ลำดับ effort: minimal < low < medium < high < xhigh < max < ultra

## สร้างภาพ

prompt: "สร้างภาพ (image generation) ... บันทึกเป็น PNG ที่ <absolute path>" · effort `low` (สูงกว่านี้ภาพไม่ดีขึ้น) · Codex ใช้ skill `.system/imagegen` แล้วคัดลอกไฟล์จาก `$CODEX_HOME/generated_images/` ไปที่ path · สคริปต์ตรวจ 8 ไบต์แรก `\x89PNG\r\n\x1a\n`
