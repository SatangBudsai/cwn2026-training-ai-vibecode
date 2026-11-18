#!/usr/bin/env bash
# ใช้: bash run-lab.sh <ชื่อ> [ไฟล์พรอมต์]  รัน 1 LAB เป็นเซสชันใหม่ใน sabai/
N="$1"; P="${2:-/c/t/spa04/prompts/lab$N.txt}"
L=/c/t/spa04/logs; mkdir -p "$L"
cd /c/t/spa04/sabai || exit 1
S=$(date +%s); echo "START lab$N $(date +%T)" >> "$L/_events.log"
CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude -p --dangerously-skip-permissions --strict-mcp-config \
  --model opus --effort ${EFFORT:-high} --output-format stream-json --verbose < "$P" > "$L/lab$N.jsonl" 2> "$L/lab$N.err"
RC=$?; E=$(date +%s)
python - "$L/lab$N.jsonl" "$L/lab$N.result.md" <<'PY'
import json,sys
last=None;cost=None
for l in open(sys.argv[1],encoding='utf-8',errors='replace'):
    try:o=json.loads(l)
    except: continue
    if o.get('type')=='result': last=o.get('result');cost=o.get('total_cost_usd')
open(sys.argv[2],'w',encoding='utf-8').write((last or '(no result)')+f"\n\n<!-- cost {cost} -->\n")
PY
echo "END lab$N rc=$RC $(( (E-S)/60 ))m$(( (E-S)%60 ))s $(date +%T)" >> "$L/_events.log"
echo "lab$N rc=$RC $(( (E-S)/60 ))m$(( (E-S)%60 ))s"
