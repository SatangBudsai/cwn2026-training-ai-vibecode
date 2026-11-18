#!/usr/bin/env bash
# รอบหนึ่ง: build+restart แล้ววัดด้วย kit/measure.sh → out/pipe1-r<N>
set -uo pipefail
N=$1; cd "$(dirname "$0")/.."
docker compose up -d --build >/tmp/p1build-$N.log 2>&1 || { tail -30 /tmp/p1build-$N.log; exit 3; }
for i in $(seq 60); do curl -fsS localhost:5091/api/health >/dev/null 2>&1 && break; sleep 2; done
/workspace/arena/kit/measure.sh http://localhost:5091 /workspace/arena/out/pipe1-r$N | tail -9
python3 - "$N" <<'PY'
import json,sys
d=json.load(open(f"/workspace/arena/out/pipe1-r{sys.argv[1]}/report.json"));s=d['scores'];st=d['issues']['structure']
print("ROW", s['structure']['pct'], s['visual']['diffPct'], s['acceptance']['pass'], s['differential']['pass'], s['flights']['total'], d['score'], d['gate']['pass'])
print("missing:", [t['token'] for t in st['tokensMissing']]); print("extra:", [t['token'] for t in st['tokensExtra']])
PY
