#!/bin/bash
# export.sh : collect real results into /tmp/lab-export (run inside the container)
set -e
S=/workspace/suite/web-fixer; X=/tmp/lab-export; SO=/root/ai-accounts/.Claude/shared/skills/skill-optimizer/scripts/skillopt.py
rm -rf $X; mkdir -p $X/results $X/skill-web-fixer $X/webs $X/dag
cd /workspace/suite
python3 $SO report web-fixer --labels noskill,v0,v1,v2 > $X/results/report.md
cp $S/results.json $X/results/results.json
for l in noskill v0 v1 v2; do python3 $SO null web-fixer --label $l > $X/results/null-$l.txt; done
g() { python3 $SO gate web-fixer --base $1 --cand $2 --cost-metric context_tokens > $X/results/gate-$1-$2.txt 2>&1; echo "exit=$?" >> $X/results/gate-$1-$2.txt; }
g noskill v0; g v0 v1; g v1 v2; g noskill v1; g noskill v2
for l in v0 v1 v2; do python3 $SO failures web-fixer --label $l | sed "s#$S/##" > $X/results/failures-$l.txt; done
cat run-noskill.log run-v0.log run-v1.log run-v2.log > $X/results/trials.log
python3 $SO lint /workspace/skills/web-fixer/v0 > $X/results/lint-v0.json; python3 $SO lint /workspace/skills/web-fixer/v1 > $X/results/lint-v1.json; python3 $SO lint /workspace/skills/web-fixer/v2 > $X/results/lint-v2.json
for l in noskill v0 v1 v2; do for d in $S/runs/$l/*/; do t=$(basename $d); mkdir -p $X/results/runs/$l/$t; cp $d/grade.json $d/metrics.json $X/results/runs/$l/$t/; done; done
cp -a /workspace/skills/web-fixer/v0 /workspace/skills/web-fixer/v1 /workspace/skills/web-fixer/v2 $X/skill-web-fixer/
find $X/skill-web-fixer -name "__pycache__" | xargs rm -rf
# webs fixed by each version (source only: app components lib + deliverables) and the diff against the original task web
web() { # web <label> <task> <rep>
  src=$S/runs/$1/$2-r$3/sandbox; dst=$X/webs/$2/$1-r$3; mkdir -p $dst/petshop
  for d in app components lib; do cp -a $src/petshop/$d $dst/petshop/; done
  cp -a $src/e2e $dst/ 2>/dev/null || true; rm -f $dst/e2e/playwright.config.js $dst/e2e/global-setup.js
  cp $src/BUGS-FOUND.md $dst/ 2>/dev/null || true
  mkdir -p $dst/evidence; for f in $src/evidence/*.png; do [ -f "$f" ] && python3 - "$f" "$dst/evidence/$(basename "${f%.png}").jpg" <<'EOF'
import sys, subprocess
try:
    from PIL import Image
    im = Image.open(sys.argv[1]).convert("RGB"); w = 900
    im = im.resize((w, int(im.height * w / im.width))); im.crop((0, 0, w, min(im.height, 1400))).save(sys.argv[2], quality=70)
except ImportError:
    subprocess.run(["cp", sys.argv[1], sys.argv[2].replace(".jpg", ".png")])
EOF
  done
  (cd $S/tasks/$2 && diff -ruN -x node_modules -x .next -x public petshop $src/petshop | sed "s#$src/##" > $dst/FIX.diff) || true
  cp $S/runs/$1/$2-r$3/grade.json $dst/grade.json
}
for t in t2 t4; do mkdir -p $X/webs/$t/original/petshop; for d in app components lib; do cp -a $S/tasks/$t/petshop/$d $X/webs/$t/original/petshop/; done; done
web noskill t4 2; web v0 t4 1; web v1 t4 1; web v2 t4 1
web noskill t2 1; web v0 t2 2; web v1 t2 1; web v2 t2 1
cd /workspace/plans/webfix && cp blocks.json dag.png gantt-plan.png gantt-actual.png compare.png REPORT.md PLAN.md $X/dag/
cp /workspace/.agent-team/webfix-20261111-053513/out/B06.md $X/dag/decision-cost-metric.md
du -sh $X $X/*; find $X -type f | wc -l
