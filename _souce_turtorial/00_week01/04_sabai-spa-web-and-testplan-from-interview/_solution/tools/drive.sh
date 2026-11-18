#!/usr/bin/env bash
# คุมเวลา: รัน LAB ตามลำดับ ถ้าเกินงบ ตัดแล้ว resume ให้สรุปผลเท่าที่มี (ไม่รันซ้ำ)
L=/c/t/spa04/logs; PR=/c/t/spa04/prompts
export CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 PYTHONIOENCODING=utf-8
result() { python - "$1" "$2" <<'PY'
import json,sys
last=None;cost=None
for l in open(sys.argv[1],encoding='utf-8',errors='replace'):
    try:o=json.loads(l)
    except: continue
    if o.get('type')=='result': last=o.get('result');cost=o.get('total_cost_usd')
open(sys.argv[2],'w',encoding='utf-8').write((last or '(no result)')+f"\n\n<!-- cost {cost} -->\n")
PY
}
sid() { python - "$1" <<'PY'
import json,sys
for l in open(sys.argv[1],encoding='utf-8',errors='replace'):
    try:o=json.loads(l)
    except: continue
    if o.get('session_id'): print(o['session_id']);break
PY
}
lab() { N=$1; M=$2; E=${3:-medium}; cd /c/t/spa04/sabai || exit 1
  S=$(date +%s); echo "START lab$N $(date +%T) งบ ${M}m" >> $L/_events.log
  timeout --signal=KILL ${M}m claude -p --dangerously-skip-permissions --strict-mcp-config --model opus --effort $E --output-format stream-json --verbose < $PR/lab$N.txt > $L/lab$N.jsonl 2> $L/lab$N.err; RC=$?
  if [ $RC -eq 137 ] || [ $RC -eq 124 ]; then
    echo "CUT lab$N $(date +%T)" >> $L/_events.log
    ID=$(sid $L/lab$N.jsonl)
    echo "หมดเวลาตามงบของ LAB นี้แล้ว ห้ามเริ่มงานใหม่ · subagent ที่ค้างถือว่าจบ ใช้ไฟล์ที่เขียนไว้แล้ว · ปิดเบราว์เซอร์ที่ค้างด้วย playwright-cli close-all · เขียนไฟล์ผลลัพธ์ของ LAB นี้ให้ครบหัวข้อจากสิ่งที่มี ส่วนที่ไม่ได้ทำให้จดว่ายังไม่ได้ทำ แล้วสรุปตามที่พรอมต์ขอ ภายใน 3 นาที" > $L/wrap$N.txt
    timeout --signal=KILL 5m claude -p --resume "$ID" --dangerously-skip-permissions --strict-mcp-config --model opus --effort medium --output-format stream-json --verbose < $L/wrap$N.txt > $L/lab$N.wrap.jsonl 2>> $L/lab$N.err
    result $L/lab$N.wrap.jsonl $L/lab$N.result.md
  else
    result $L/lab$N.jsonl $L/lab$N.result.md
  fi
  T=$(date +%s); echo "END lab$N rc=$RC $(( (T-S)/60 ))m$(( (T-S)%60 ))s $(date +%T)" >> $L/_events.log
}
until grep -q 'END lab6b' $L/_events.log; do sleep 5; done
lab 7 7; lab 8 15; lab 9 8; lab 10 11; lab 11 9; lab 12 30; lab 13 12
echo "ALL-LABS-DONE $(date +%T)" >> $L/_events.log
