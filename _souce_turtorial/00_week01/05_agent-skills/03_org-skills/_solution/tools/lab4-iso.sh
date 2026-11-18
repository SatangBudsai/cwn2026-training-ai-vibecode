# รัน 1 ขั้นของ LAB 4 แบบแยกเครื่อง: เหลือแค่โต๊ะของคนนั้น + plugin core กับแผนกของเขา แล้วคืนทุกอย่างกลับ
# bash iso.sh <step> <user> <plugin>
step=$1; u=$2; dep=$3
P=C:/t/org05p/novatech; H=C:/t/lab4hold; C=~/.claude/plugins/cache/novatech-skills; M=~/.claude/plugins/marketplaces/novatech-skills/plugins
mkdir -p $H/desks $H/cache $H/mkt
restore() { for d in $H/desks/*/; do [ -d "$d" ] && mv "$d" $P/desks/; done; for d in $H/cache/*/; do [ -d "$d" ] && mv "$d" $C/; done; for d in $H/mkt/*/; do [ -d "$d" ] && mv "$d" $M/; done; }
trap restore EXIT
for d in $P/desks/*/; do n=$(basename $d); [ "$n" = "$u" ] || mv "$d" $H/desks/; done
for d in $C/*/; do n=$(basename $d); [ "$n" = core ] || [ "$n" = "$dep" ] || mv "$d" $H/cache/; done
for d in $M/*/; do n=$(basename $d); [ "$n" = core ] || [ "$n" = "$dep" ] || mv "$d" $H/mkt/; done
left=$(ls -d $P/desks/*/ | wc -l); if [ "$left" != "1" ]; then echo "ABORT $step desks-left=$left $(date +%T)" >> C:/t/lab4run/events.log; exit 1; fi
other=$(powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \"Name='claude.exe'\" | ? { \$_.ExecutablePath -match 'local' }).Count"); if [ "$other" != "0" ] && [ -n "$other" ]; then echo "ABORT $step other-claude=$other $(date +%T)" >> C:/t/lab4run/events.log; exit 1; fi
cd $P/desks/$u
echo "START $step $(date +%T)" >> C:/t/lab4run/events.log
CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude -p --dangerously-skip-permissions --strict-mcp-config --model opus --output-format stream-json --verbose < C:/t/lab4run/$step.txt > C:/t/lab4run/$step.jsonl 2> C:/t/lab4run/$step.err
echo "END $step exit=$? $(date +%T)" >> C:/t/lab4run/events.log
