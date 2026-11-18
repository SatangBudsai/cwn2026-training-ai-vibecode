#!/bin/bash
# usage: run-desk.sh <lab> <user> <promptfile> [extra claude args...]
lab=$1; u=$2; pf=$3; shift 3
log=C:/t/org05/logs/$lab; mkdir -p $log
echo "START $u $(date +%T)" >> $log/_events.log
cd C:/t/org05/novatech/desks/$u || exit 1
claude -p "$(cat $pf)" --dangerously-skip-permissions --strict-mcp-config --model opus \
  --output-format stream-json --verbose "$@" > $log/$u.jsonl 2> $log/$u.err
echo "END $u $(date +%T) rc=$?" >> $log/_events.log
