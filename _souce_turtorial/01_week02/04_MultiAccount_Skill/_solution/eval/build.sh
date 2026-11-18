#!/bin/bash
# build.sh : ขั้นที่ 1 ให้ Claude Code (แทน Claude Code app) สร้างสกิลจากสเปกอย่างเดียวในโฟลเดอร์ว่าง
set -u
EV=$(cd "$(dirname "$0")" && pwd); OUT=${OUT:-$EV/runs}; D=${BUILD:-/tmp/ma-build}; C=multi-account
rm -rf "$D"; mkdir -p "$D" "$OUT/build"; cp "$EV/../../prompt_skill_spec.md" "$D/"
docker exec $C sh -c 'rm -rf /workspace/* /workspace/.agent-team; for d in .Claude .Codex; do rm -rf /root/ai-accounts/$d/shared/skills/yolo /root/ai-accounts/$d/shared/skills/cyolo /root/ai-accounts/$d/shared/skills/agent-team; done'
cd "$D"; s=$(date +%s.%N)
env -u CLAUDECODE -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_EFFORT -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PID \
 timeout 5400 claude -p "$(cat "$EV/prompt-build.txt")" --model opus --effort medium --permission-mode acceptEdits --disable-slash-commands --strict-mcp-config \
  --allowedTools "Bash" "Read" "Write" "Edit" "Glob" "Grep" \
  --output-format stream-json --verbose < /dev/null > "$OUT/build/app.jsonl" 2> "$OUT/build/app.err"
e=$(date +%s.%N)
python3 "$EV/metrics.py" "$OUT/build/app.jsonl" $s $e > "$OUT/build/metrics.json"
python3 -c "import json;m=json.load(open('$OUT/build/metrics.json'));print('build',m['wall_s'],m['tool_calls'],m['tool_errors'],m['cost_usd'])"
