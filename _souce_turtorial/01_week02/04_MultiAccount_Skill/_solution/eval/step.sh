#!/bin/bash
# step.sh <install|lead> : รันขั้นที่ 2 (ติดตั้งสกิล) หรือขั้นที่ 4 (สลับหัวหน้าทีม) ด้วย Claude Code แทน Claude Code app
set -u
name=$1
EV=$(cd "$(dirname "$0")" && pwd); OUT=${OUT:-$EV/runs}; APP=${APP:-/tmp/ma-app}; C=multi-account; R=$OUT/$name; SH=/root/ai-accounts
rm -rf "$R" "$APP"; mkdir -p "$R" "$APP"
docker exec $C sh -c "rm -rf /workspace/* /workspace/.agent-team /tmp/*.json 2>/dev/null"
if [ "$name" = install ]; then
  cp -r "$EV/../skills" "$APP/skills"
  docker exec $C sh -c "for d in .Claude .Codex; do rm -rf $SH/\$d/shared/skills/yolo $SH/\$d/shared/skills/cyolo $SH/\$d/shared/skills/agent-team; done"
fi
cd "$APP"; s=$(date +%s.%N)
env -u CLAUDECODE -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_EFFORT -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PID \
 timeout 2400 claude -p "$(cat "$EV/prompt-$name.txt")" --model opus --effort medium --permission-mode acceptEdits --disable-slash-commands --strict-mcp-config \
  --allowedTools "Bash(docker:*)" "Read" "Write" "Edit" "Glob" "Grep" \
  --output-format stream-json --verbose < /dev/null > "$R/app.jsonl" 2> "$R/app.err"
e=$(date +%s.%N)
python3 "$EV/metrics.py" "$R/app.jsonl" $s $e > "$R/metrics.json"
docker cp $C:/workspace/demo "$R/demo" >/dev/null 2>&1
docker cp $C:/workspace/.agent-team "$R/agent-team" >/dev/null 2>&1
python3 -c "import json;m=json.load(open('$R/metrics.json'));print('$name',m['wall_s'],m['tool_calls'],m['tool_errors'],m['cost_usd'])"
