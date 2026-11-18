#!/usr/bin/env python3
"""setup.py - เตรียมชุดโจทย์ตัวอย่าง web-fixer ของสกิล skill-optimizer (รันใน container multi-account)

  python3 setup.py [--dest /workspace/suite/web-fixer] [--skills /workspace/skills/web-fixer] [--check]

ทำ 5 อย่าง (รันซ้ำได้ ของที่มีแล้วไม่ทำซ้ำ):
  1. /workspace/pw        ตัวรัน Playwright (ใช้ playwright ที่ติดตั้งมากับ container ไม่ดาวน์โหลดเบราว์เซอร์)
  2. /workspace/nm        node_modules ของเว็บ (npm ci ครั้งเดียว ใช้ร่วมกันทุก Trial ผ่าน symlink)
  3. <dest>               suite.json · grade.py · oracle/ · files/ · tasks/<id>/petshop (เว็บที่ฝัง Defect 3 รายการต่อ Task)
  4. <skills>/v0          สกิล web-fixer รุ่นแรก (ถ้ายังไม่มี)
  5. --check              Grader Validation: เว็บอ้างอิงต้องผ่าน fixed_* และ no_regression · เว็บที่ยังมี Defect ต้องไม่ผ่าน fixed_*
Python 3.8+ stdlib เท่านั้น
"""
import argparse, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PW, NM = "/workspace/pw", "/workspace/nm"
TASKS = [("t1", "train", ["A1", "B1", "C1"]), ("t2", "train", ["A2", "B2", "C2"]), ("t3", "train", ["A3", "B3", "C3"]),
         ("t4", "train", ["A1", "B2", "C3"]), ("v1", "val", ["A4", "B4", "C4"]), ("v2", "val", ["A5", "B5", "C5"])]
PROMPT = (
    "เว็บร้าน PawPantry ใน ./petshop มีบั๊กซ่อนอยู่ ไม่ทราบจำนวน · TEST-PLAN.md คือผลที่คาดหวัง (ห้ามแก้)\n"
    "งาน: หาบั๊กด้วย Playwright แก้โค้ด แล้วพิสูจน์ · ทำงานในโฟลเดอร์ปัจจุบันเท่านั้น ห้ามอ่านไฟล์นอกโฟลเดอร์นี้\n"
    "ส่งงาน 4 อย่าง:\n"
    "1. โค้ดที่แก้แล้วใน ./petshop\n"
    "2. e2e/*.spec.js ชื่อเทสต์ขึ้นต้นด้วยรหัส TC ของบั๊กที่พบ (ต้องล้มกับเว็บเดิม และผ่านกับเว็บที่แก้แล้ว)\n"
    "3. BUGS-FOUND.md ตาราง | TC | อาการ | คาดหวัง | ไฟล์ที่แก้ | เฉพาะบั๊กที่ยืนยันแล้ว 1 แถวต่อบั๊ก\n"
    "4. evidence/<TC>.png ภาพหน้าจอหลังแก้ของแต่ละบั๊ก\n"
    "เครื่องมือ: tools/start-web.sh (build + เปิดเว็บ URL อยู่ใน .web-url รันซ้ำหลังแก้โค้ด) · tools/run-e2e.sh (รัน Playwright) · tools/stop-web.sh\n"
    "ถ้ามีสกิลใน ./skills ให้อ่านและใช้")


def say(*a):
    print(*a, flush=True)


def ensure_pw():
    if os.path.isfile(PW + "/bin/playwright"):
        return say("1. Playwright พร้อมแล้ว:", PW)
    src = None
    for c in ("/usr/lib/node_modules/@playwright/mcp/node_modules", "/usr/local/lib/node_modules/@playwright/mcp/node_modules",
              "/usr/lib/node_modules", "/usr/local/lib/node_modules"):
        if os.path.isdir(c + "/playwright") and os.path.isdir(c + "/playwright-core"):
            src = c
            break
    if not src:
        sys.exit("ERROR ไม่พบแพ็กเกจ playwright ใน container (ต้องมี @playwright/mcp ติดตั้งแบบ global)")
    os.makedirs(PW + "/node_modules/@playwright/test", exist_ok=True)
    os.makedirs(PW + "/bin", exist_ok=True)
    for n in ("playwright", "playwright-core"):
        if not os.path.exists(PW + "/node_modules/" + n):
            os.symlink(src + "/" + n, PW + "/node_modules/" + n)
    open(PW + "/node_modules/@playwright/test/package.json", "w").write('{"name":"@playwright/test","version":"0.0.0","main":"index.js"}')
    open(PW + "/node_modules/@playwright/test/index.js", "w").write('module.exports = require("playwright/test");\n')
    open(PW + "/bin/playwright", "w").write('#!/bin/sh\nexport NODE_PATH=%s/node_modules\nexec node %s/node_modules/playwright/cli.js "$@"\n' % (PW, PW))
    os.chmod(PW + "/bin/playwright", 0o755)
    say("1. สร้างตัวรัน Playwright:", PW)


def ensure_nm():
    if os.path.isdir(NM + "/node_modules/next"):
        return say("2. node_modules พร้อมแล้ว:", NM + "/node_modules")
    if os.path.islink(NM + "/node_modules"):
        os.remove(NM + "/node_modules")
    os.makedirs(NM + "/src", exist_ok=True)
    for f in ("package.json", "package-lock.json"):
        shutil.copy(os.path.join(HERE, "clean", f), NM + "/src")
    say("2. npm ci (ครั้งเดียว ประมาณ 15 วินาที) …")
    r = subprocess.run(["npm", "ci", "--no-audit", "--no-fund"], cwd=NM + "/src", capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("ERROR npm ci ล้ม:\n" + r.stderr[-800:])
    os.symlink(NM + "/src/node_modules", NM + "/node_modules")


def build_suite(dest):
    for keep in ("runs", "results.json"):
        if os.path.exists(os.path.join(dest, keep)):
            say("   (เก็บ %s เดิมไว้)" % keep)
    os.makedirs(dest, exist_ok=True)
    for name in ("files", "oracle", "tasks", "grade.py", "serve.sh", "suite.json"):
        p = os.path.join(dest, name)
        shutil.rmtree(p) if os.path.isdir(p) else (os.path.exists(p) and os.remove(p))
    for name in ("files", "oracle"):
        shutil.copytree(os.path.join(HERE, name), os.path.join(dest, name))
    for name in ("grade.py", "serve.sh"):
        shutil.copy(os.path.join(HERE, name), dest)
    tasks = []
    for tid, split, bugs in TASKS:
        subprocess.run([sys.executable, os.path.join(HERE, "apply_bugs.py"), os.path.join(HERE, "clean"),
                        "%s/tasks/%s/petshop" % (dest, tid)] + bugs, check=True, capture_output=True,
                       env=dict(os.environ, NM=NM + "/node_modules", BUGS_DIR=os.path.join(HERE, "bugs")))
        tasks.append({"id": tid, "split": split, "bugs": [
            {"id": b, "tc": json.load(open(os.path.join(HERE, "bugs", b, "meta.json"), encoding="utf-8"))["tc"]} for b in bugs]})
    suite = {"name": "web-fixer", "skill_name": "web-fixer", "timeout": 1800, "grader": "grade.py",
             "files": ["files/TEST-PLAN.md", "files/tools", "files/e2e", "tasks/{id}/petshop"], "prompt": PROMPT, "tasks": tasks}
    json.dump(suite, open(dest + "/suite.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    say("3. ชุดโจทย์: %s · Training %d Task · Validation %d Task" % (
        dest, sum(1 for t in tasks if t["split"] == "train"), sum(1 for t in tasks if t["split"] == "val")))


def ensure_skill(skills):
    v0 = os.path.join(skills, "v0")
    if os.path.isfile(v0 + "/SKILL.md"):
        return say("4. สกิล web-fixer v0 มีอยู่แล้ว:", v0)
    shutil.copytree(os.path.join(HERE, "skill-v0"), v0)
    say("4. วางสกิล web-fixer v0:", v0)


def check(dest):
    say("5. Grader Validation (ประมาณ 1 นาที) …")
    task = json.load(open(dest + "/suite.json", encoding="utf-8"))["tasks"][0]
    json.dump(task, open("/tmp/skillopt-check-task.json", "w"))
    ok = True
    for label, bugs, want in (("เว็บอ้างอิง", [], True), ("เว็บที่ยังมี Defect", [b["id"] for b in task["bugs"]], False)):
        sb = "/tmp/skillopt-check"
        shutil.rmtree(sb, ignore_errors=True)
        os.makedirs(sb)
        subprocess.run([sys.executable, os.path.join(HERE, "apply_bugs.py"), os.path.join(HERE, "clean"), sb + "/petshop"] + bugs,
                       check=True, capture_output=True, env=dict(os.environ, NM=NM + "/node_modules", BUGS_DIR=os.path.join(HERE, "bugs")))
        shutil.copy(dest + "/files/TEST-PLAN.md", sb)
        r = subprocess.run([sys.executable, dest + "/grade.py", sb, "/tmp/skillopt-check-task.json"], capture_output=True, text=True)
        g = {c["id"]: c["pass"] for c in json.loads(r.stdout)["checks"]}
        fixed = [g[k] for k in g if k.startswith("fixed_")]
        good = (all(fixed) and g["no_regression"]) if want else (not any(fixed) and g["no_regression"])
        ok &= good
        say("   %s %s: fixed_* %s · no_regression %s" % ("✅" if good else "❌", label, fixed, g["no_regression"]))
    say("   Grader ใช้ได้" if ok else "   ERROR Grader ให้ผลไม่ตรงที่คาด ห้ามใช้วัดจนกว่าจะแก้")
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dest", default="/workspace/suite/web-fixer")
    ap.add_argument("--skills", default="/workspace/skills/web-fixer")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    ensure_pw()
    ensure_nm()
    build_suite(a.dest)
    ensure_skill(a.skills)
    ok = check(a.dest) if a.check else True
    say("พร้อม: python3 <skillopt.py> run %s --skill %s/v0 --label v0 --reps 2" % (a.dest, a.skills))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
