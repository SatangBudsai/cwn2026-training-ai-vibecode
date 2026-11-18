#!/usr/bin/env bash
# รันเต็มชุด 1 รอบ (ใช้โดยผู้ประสานงาน)
cd "$(dirname "$0")"
date -Iseconds > test-report/run.started
npx playwright test > test-report/run.log 2>&1
echo "EXIT=$?" > test-report/run.exit
date -Iseconds >> test-report/run.exit
