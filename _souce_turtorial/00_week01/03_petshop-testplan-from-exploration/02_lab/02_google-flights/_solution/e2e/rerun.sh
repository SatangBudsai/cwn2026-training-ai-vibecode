#!/usr/bin/env bash
# รันซ้ำ 1 ครั้งเฉพาะข้อที่จำแนกเป็น "test เขียนผิด" (แบ่ง 2 รอบเพื่อให้ P1 รันก่อนตามลำดับการตัดงบในแผน 6.3)
cd "$(dirname "$0")"
PW_OUTPUT_DIR=./test-results-rerun1 PW_JSON_OUT=./test-report/results-rerun1.json npx playwright test --grep "TC-BKG-01 |TC-LOC-01 |TC-LOC-02 |TC-LOC-03 " > test-report/rerun1.log 2>&1
echo "EXIT1=$?" > test-report/rerun1.exit
if [ ! -f .state/STOP.json ]; then
PW_OUTPUT_DIR=./test-results-rerun2 PW_JSON_OUT=./test-report/results-rerun2.json npx playwright test --grep "TC-FLT-03 |TC-FLT-05 |TC-FLT-06 |TC-PRC-02 |TC-PRC-04 |TC-LOC-04 " > test-report/rerun2.log 2>&1
echo "EXIT2=$?" > test-report/rerun2.exit
fi
date -Iseconds > test-report/rerun.done
