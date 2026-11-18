#!/bin/bash
# feature.sh <token|basic|advanced> : รันการทดลองของส่วนที่ 2 ด้วย Claude Code แทน Claude Code app
# เตรียม /workspace/team-demo ให้เหมือนเพิ่งทำส่วนที่ 1 เสร็จ (ข้อมูล + โค้ดของรอบ skill-r1)
set -u
name=$1
EV=$(cd "$(dirname "$0")" && pwd); OUT=${OUT:-$EV/runs}; APP=${APP:-/tmp/ma-app}; C=multi-account; R=$OUT/$name
rm -rf "$R" "$APP"; mkdir -p "$R" "$APP"
docker exec $C sh -c "rm -rf /workspace/* /workspace/.agent-team /tmp/*.json 2>/dev/null; mkdir -p /workspace/team-demo/data"
docker cp "$EV/../../baseline/tickets.csv" $C:/workspace/team-demo/data/tickets.csv
for f in clean.py clean_time.py clean_order.py clean_code.py; do docker cp "$EV/../results/skill-r1/$f" $C:/workspace/team-demo/$f; done
cd "$APP"; s=$(date +%s.%N)
env -u CLAUDECODE -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_EFFORT -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PID \
 timeout 1500 claude -p "$(cat "$EV/prompt-$name.txt")" --model opus --effort medium --permission-mode acceptEdits --disable-slash-commands --strict-mcp-config \
  --allowedTools "Bash(docker:*)" "Read" "Write" "Edit" "Glob" "Grep" \
  --output-format stream-json --verbose < /dev/null > "$R/app.jsonl" 2> "$R/app.err"
e=$(date +%s.%N)
python3 "$EV/metrics.py" "$R/app.jsonl" $s $e > "$R/metrics.json"
for d in patterns-demo advanced-demo .agent-team; do docker cp $C:/workspace/$d "$R/$d" >/dev/null 2>&1; done
python3 -c "import json;m=json.load(open('$R/metrics.json'));print('$name',m['wall_s'],m['tool_calls'],m['tool_errors'],m['cost_usd'])"
