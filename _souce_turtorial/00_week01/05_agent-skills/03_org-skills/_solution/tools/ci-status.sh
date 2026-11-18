#!/bin/bash
for n in "$@"; do sha=$(curl -s http://localhost:3300/api/v1/repos/novatech/org-skills/pulls/$n | PYTHONIOENCODING=utf-8 python -c "import sys,json;print(json.load(sys.stdin)['head']['sha'])"); echo "== PR $n ${sha:0:7}"; curl -s "http://localhost:3300/api/v1/repos/novatech/org-skills/commits/$sha/statuses?limit=50" | PYTHONIOENCODING=utf-8 python -c "
import sys,json
seen={}
for s in json.load(sys.stdin): seen.setdefault(s['context'],s['status'])
for k,v in sorted(seen.items()): print('  ',k,v)"; done
