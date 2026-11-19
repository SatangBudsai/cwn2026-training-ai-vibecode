#!/bin/bash
# รัน BUG_MODE B01-B12 ใน Docker ทีละตัว แล้วรัน Playwright ชุดเต็ม (ยกเว้น NFR-04)
cd "$(dirname "$0")/../app"
OUT=../bughunt-docker
MSYS_NO_PATHCONV=1 docker rm -f egov-nohook >/dev/null 2>&1
MSYS_NO_PATHCONV=1 docker run -d --name egov-nohook -p 3101:3100 -e PORT=3100 --tmpfs /data -e DB_PATH=/data/egov.db app-web >/dev/null
for b in ${BUGS:-B01 B02 B03 B04 B05 B06 B07 B08 B09 B10 B11 B12}; do
  BUG_MODE=$b docker compose up -d --force-recreate >/dev/null 2>&1
  for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost:3100/api/health && break; sleep 1; done
  docker compose exec -T web printenv BUG_MODE > $OUT/$b.env
  start=$(date +%s)
  (cd ../e2e && E2E_NOHOOK_URL=http://localhost:3101 BASE_URL=http://localhost:3100 npx playwright test --retries=0 --timeout=30000 --grep-invert "NFR-04" --reporter=line 2>&1 | sed 's/\x1b\[[0-9;]*m//g') > $OUT/$b.log
  echo "$b $(( $(date +%s)-start ))s $(grep -E '^\s+[0-9]+ (failed|passed|flaky|skipped)' $OUT/$b.log | tr -s ' ' | tr '\n' ' ')" >> $OUT/summary.txt
done
docker rm -f egov-nohook >/dev/null
docker compose up -d --force-recreate >/dev/null 2>&1
[ -z "$BUGS" ] && echo DONE >> $OUT/summary.txt
