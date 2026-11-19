#!/bin/bash
# รัน: bash e2e/run-bugs.sh "" B01 B02 ... (ค่าว่าง = ปกติ)
cd "$(dirname "$0")/.."
for b in "$@"; do
  TEST_MODE=1 BUG_MODE="$b" docker compose up -d --force-recreate >/dev/null 2>&1
  for i in $(seq 40); do curl -sf localhost:3100/api/health >/dev/null 2>&1 || curl -sf localhost:3100/ >/dev/null 2>&1 && break; sleep 1; done
  (cd e2e; DB_DUMP_CMD="docker exec app-web-1 sh -c 'cat /data/app.db*'" npx playwright test --reporter=list > bug-results/${b:-normal}.txt 2>&1)
  echo "$b: $(grep -cE '^\s+✓|^\s+ok ' e2e/bug-results/${b:-normal}.txt) pass; $(grep -E '^\s+[0-9]+ (passed|failed)' e2e/bug-results/${b:-normal}.txt | tr '\n' ' ')"
done
