#!/bin/bash
# run.sh <noskill|skill> <รอบ>  : รัน Claude Code บน host แทน Claude Code app แล้วเก็บผลและตรวจกับชุดซ่อน
# ต้องมี container multi-account รันอยู่ · ผลอยู่ใน $OUT/<arm>-r<รอบ>/
set -u
arm=$1; rnd=$2
EV=$(cd "$(dirname "$0")" && pwd); SK=${SKILLS:-$EV/../skills}
OUT=${OUT:-$EV/runs}; APP=${APP:-/tmp/ma-app}; C=multi-account; R=$OUT/$arm-r$rnd
rm -rf "$R" "$APP"; mkdir -p "$R" "$APP/baseline"; cp "$EV/../../baseline/tickets.csv" "$APP/baseline/"
SH=/root/ai-accounts
docker exec $C sh -c "rm -rf /workspace/* /workspace/.agent-team /tmp/eval /tmp/*.json /tmp/ma* /tmp/team* /tmp/yolo* /tmp/cyolo* 2>/dev/null; for d in .Claude .Codex; do rm -rf $SH/\$d/shared/skills/yolo $SH/\$d/shared/skills/cyolo $SH/\$d/shared/skills/agent-team; done"
if [ "$arm" = skill ]; then
  for d in .Claude .Codex; do for s in yolo cyolo agent-team; do docker cp "$SK/$s" $C:$SH/$d/shared/skills/ >/dev/null; done; done
fi
docker exec $C bash -lc 'yolo1 --version; yolo2 --version; cyolo1 --version; touch /tmp/start-marker' >/dev/null 2>&1
cd "$APP"; s=$(date +%s.%N)
env -u CLAUDECODE -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_EFFORT -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PID \
 timeout 2400 claude -p "$(cat "$EV/prompt.txt")" --model opus --effort medium --permission-mode acceptEdits --disable-slash-commands --strict-mcp-config \
  --allowedTools "Bash(docker:*)" "Read" "Write" "Edit" "Glob" "Grep" \
  --output-format stream-json --verbose < /dev/null > "$R/app.jsonl" 2> "$R/app.err"
e=$(date +%s.%N)
python3 "$EV/metrics.py" "$R/app.jsonl" $s $e > "$R/metrics.json"
# เก็บผลงานของทีม + ตรวจกับชุดซ่อน (ทีมไม่เคยเห็นไฟล์นี้)
docker cp $C:/workspace/team-demo "$R/team-demo" >/dev/null 2>&1
docker cp $C:/workspace/.agent-team "$R/agent-team" >/dev/null 2>&1
docker exec $C mkdir -p /tmp/eval; docker cp "$EV/hidden.csv" $C:/tmp/eval/hidden.csv >/dev/null
for f in tickets hidden; do
  src=/tmp/eval/hidden.csv; [ $f = tickets ] && src=data/tickets.csv
  t0=$(date +%s.%N)
  docker exec -w /workspace/team-demo $C timeout 60 python3 clean.py $src > "$R/pred-$f.json" 2> "$R/pred-$f.err"
  python3 -c "import time;print('$f',round(time.time()-$t0,2))" >> "$R/runtime.txt"
done
python3 "$EV/grade.py" "$R/pred-hidden.json" "$EV/hidden_truth.json" > "$R/score-hidden.json"
python3 "$EV/grade.py" "$R/pred-tickets.json" "$EV/train_truth.json" > "$R/score-train.json"
# transcript ของ 3 บัญชี (ไว้นับ token ของรอบที่ไม่มี ledger) ไม่มีไฟล์ credential
docker exec $C sh -c "cd $SH && find .Claude/yolo1/projects .Claude/yolo2/projects .Codex/cyolo1/sessions -type f -newer /tmp/start-marker -name '*.jsonl' 2>/dev/null | tar cf /tmp/transcripts.tar -T - 2>/dev/null"
docker cp $C:/tmp/transcripts.tar "$R/transcripts.tar" >/dev/null 2>&1
echo "$arm r$rnd: $(cat "$R/score-hidden.json") wall=$(python3 -c "import json;m=json.load(open('$R/metrics.json'));print(m['wall_s'],m['tool_calls'],m['tool_errors'],m['cost_usd'])")"
