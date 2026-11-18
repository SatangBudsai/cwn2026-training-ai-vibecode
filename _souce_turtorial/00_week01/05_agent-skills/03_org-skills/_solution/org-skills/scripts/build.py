#!/usr/bin/env python3
"""สร้างไฟล์ที่ได้จาก header ของ SKILL.md และ scripts/plugins.json แล้วตรวจกติกาหัวไฟล์ทั้งคลัง

    python scripts/build.py           # เขียนไฟล์ที่สร้างได้ทั้งหมด + ตรวจ
    python scripts/build.py --check   # ตรวจอย่างเดียว (ใช้ใน CI / ก่อนเปิด PR) — exit 1 ถ้าไม่ผ่านหรือไฟล์ที่สร้างไม่ตรง

ไฟล์ที่สร้าง (ห้ามแก้มือ):
    .claude-plugin/marketplace.json
    plugins/<plugin>/.claude-plugin/plugin.json
    .gitea/CODEOWNERS
    plugins/core/skills/skill-finder/references/catalog.md
stdlib ล้วน
"""
import json, os, re, sys
from pathlib import Path

# ORG_SKILLS_ROOT = tree ที่จะตรวจ (CI ใช้สคริปต์จาก main ตรวจ tree ของ PR) · ไม่ตั้ง = คลังที่สคริปต์นี้อยู่
ROOT = Path(os.environ.get("ORG_SKILLS_ROOT") or Path(__file__).resolve().parent.parent).resolve()
CFG = json.loads((ROOT / "scripts/plugins.json").read_text(encoding="utf-8"))
META_KEYS = ["owner", "plugin", "layer", "version", "uses", "next", "follows"]
LAYERS = {"core", "shared", "department"}
# ชื่อไฟล์ที่บอกว่าเป็นสำเนากติกากลาง — ต้องอยู่ใน core เท่านั้น
POLICY_COPY = re.compile(r"(price-list\.csv|margin-rules|pricing-rules|pdpa|data-policy|customer-data-rules|brand)", re.I)


def parse_skill(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None, ["ไม่มี frontmatter"]
    fm, errs = {}, []
    lines = m.group(1).split("\n")
    i, keys = 0, []
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("name:"):
            fm["name"] = ln[5:].strip(); keys.append("name")
        elif ln.startswith("description:"):
            v = ln[12:].strip(); keys.append("description")
            if v == "|":
                block = []
                while i + 1 < len(lines) and lines[i + 1].startswith("  "):
                    block.append(lines[i + 1].strip()); i += 1
                v = " ".join(block)
            fm["description"] = v
        elif ln.startswith("metadata:"):
            keys.append("metadata"); meta, order = {}, []
            while i + 1 < len(lines) and lines[i + 1].startswith("  "):
                i += 1
                k, _, v = lines[i].strip().partition(":")
                v = v.strip()
                if v.startswith("[") and v.endswith("]"):
                    v = [x.strip() for x in v[1:-1].split(",") if x.strip()]
                meta[k] = v; order.append(k)
            fm["metadata"] = meta
            if order != META_KEYS:
                errs.append(f"metadata ต้องมีคีย์ตามลำดับ {META_KEYS} (ได้ {order})")
        elif ln.strip():
            errs.append(f"คีย์ที่ไม่รู้จักในหัวไฟล์: {ln.split(':')[0]}")
        i += 1
    if keys != ["name", "description", "metadata"]:
        errs.append(f"หัวไฟล์ต้องเรียง name, description, metadata (ได้ {keys})")
    return fm, errs


def load():
    plugins = {p["name"]: p for p in CFG["plugins"]}
    skills, errors = {}, []
    for pdir in sorted((ROOT / "plugins").iterdir()):
        if pdir.name not in plugins:
            errors.append(f"plugins/{pdir.name}: ไม่มีใน scripts/plugins.json")
            continue
        for sdir in sorted((pdir / "skills").iterdir()):
            rel = sdir.relative_to(ROOT).as_posix()
            fm, errs = parse_skill(sdir / "SKILL.md")
            errors += [f"{rel}: {e}" for e in errs]
            if not fm:
                continue
            meta = fm.get("metadata", {})
            if fm.get("name") != sdir.name:
                errors.append(f"{rel}: name '{fm.get('name')}' ต้องตรงชื่อโฟลเดอร์")
            if meta.get("plugin") != pdir.name:
                errors.append(f"{rel}: plugin '{meta.get('plugin')}' ต้องเป็น '{pdir.name}'")
            if meta.get("layer") not in LAYERS or meta.get("layer") != plugins[pdir.name]["layer"]:
                errors.append(f"{rel}: layer '{meta.get('layer')}' ต้องเป็น '{plugins[pdir.name]['layer']}'")
            if not re.fullmatch(r"\d+\.\d+\.\d+", str(meta.get("version", ""))):
                errors.append(f"{rel}: version ต้องเป็น x.y.z")
            if not re.fullmatch(r"[a-z]+-[a-z]+", str(meta.get("owner", ""))):
                errors.append(f"{rel}: owner ต้องเป็น user Gitea เช่น plat-may")
            for k in ("uses", "next", "follows"):
                if not isinstance(meta.get(k), list):
                    errors.append(f"{rel}: {k} ต้องเป็นรายการ [..]")
            if len(fm.get("description", "")) > 1024:
                errors.append(f"{rel}: description ยาวเกิน 1024 ตัวอักษร")
            for f in sdir.rglob("*"):
                if f.is_file() and pdir.name != "core" and POLICY_COPY.search(f.name):
                    errors.append(f"{f.relative_to(ROOT).as_posix()}: ดูเหมือนสำเนากติกากลาง — ให้อ้าง skill ใน core แทน")
            if sdir.name in skills:
                errors.append(f"{rel}: ชื่อ skill ซ้ำกับ plugins/{skills[sdir.name]['plugin']}")
            skills[sdir.name] = {"plugin": pdir.name, "description": fm.get("description", ""), **meta}
    for name, s in skills.items():
        for k in ("uses", "next", "follows"):
            for ref in s.get(k) or []:
                if ref not in skills:
                    errors.append(f"{name}: {k} อ้าง '{ref}' ที่ไม่มีในคลัง")
                elif k == "follows" and skills[ref]["layer"] != "core":
                    errors.append(f"{name}: follows ใช้ได้เฉพาะนโยบายใน core ('{ref}' อยู่ {skills[ref]['plugin']})")
                elif ref == name:
                    errors.append(f"{name}: {k} อ้างตัวเอง")
    return plugins, skills, errors


def gen_marketplace(plugins, skills):
    return {
        "name": CFG["marketplace"],
        "owner": {"name": "ทีมกลาง โนวาเทค (plat-ken)", "email": "plat-ken@novatech.test"},
        "metadata": {"description": "คลัง skill กลางของโนวาเทค — core ทุกคนติดตั้ง + แพ็กของแผนกตัวเอง", "version": "1.0.0"},
        "plugins": [
            {"name": p["name"], "source": f"./plugins/{p['name']}", "description": p["description"],
             "version": PLUGIN_VERSION, "author": {"name": p["codeowner"]},
             "category": p["layer"], "keywords": [p["layer"], p["team"]]}
            for p in CFG["plugins"]
        ],
    }


PLUGIN_VERSION = CFG.get("version", "1.0.0")


def gen_plugin_json(p, skills):
    return {
        "name": p["name"], "version": PLUGIN_VERSION,
        "description": p["description"],
        "author": {"name": p["codeowner"]},
        "keywords": [p["layer"], p["team"]] + sorted(n for n, s in skills.items() if s["plugin"] == p["name"]),
    }


def gen_codeowners():
    out = ["# สร้างโดย scripts/build.py จาก scripts/plugins.json — ห้ามแก้มือ",
           "# Gitea: pattern เป็น regexp ของ path · ทุกบรรทัดที่ตรงจะถูกขอรีวิว (สะสม ไม่ใช่บรรทัดสุดท้ายชนะ)",
           "# หัวหน้าแผนก = CODEOWNER ของ plugin แผนกตัวเอง · ทีมกลางดูแล core / shared / ไฟล์กลางของคลัง", ""]
    out.append(f"\\.claude-plugin/.* @{CFG['maintainer']}")
    out.append(f"scripts/.* @{CFG['maintainer']}")
    out.append(f"\\.gitea/.* @{CFG['maintainer']}")
    out.append(f"README\\.md @{CFG['maintainer']}")
    out.append("")
    for p in CFG["plugins"]:
        out.append(f"plugins/{p['name']}/.* @{p['codeowner']}")
    out.append("")
    for path, owners in CFG["extra_owners"].items():
        out.append(path.replace(".", "\\.") + ".* " + " ".join("@" + o for o in owners))
    return "\n".join(out) + "\n"


def short(desc, n=110):
    d = re.split(r"\s—\s|\sใช้เมื่อ", desc)[0].strip()
    return d if len(d) <= n else d[: n - 1] + "…"


def gen_catalog(plugins, skills):
    L = ["# แค็ตตาล็อก skill ของโนวาเทค (novatech-skills)", "",
         "> สร้างโดย `scripts/build.py` จาก header ของทุก SKILL.md — ห้ามแก้มือ · `uses` = skill ที่เรียกใช้ · `next` = งานถัดไป · `follows` = นโยบายใน core ที่ต้องทำตาม", "",
         "ติดตั้ง: `/plugin marketplace add http://localhost:3300/novatech/org-skills.git` แล้ว `/plugin install core@novatech-skills` + `/plugin install <แผนก>@novatech-skills`", ""]
    for p in CFG["plugins"]:
        L += [f"## {p['name']} — {p['department']} (layer `{p['layer']}`, CODEOWNER `{p['codeowner']}`)", "", p["description"], "",
              "| skill | เจ้าของ | ทำอะไร | uses | next | follows |", "|---|---|---|---|---|---|"]
        for n, s in sorted(skills.items()):
            if s["plugin"] == p["name"]:
                L.append(f"| `{n}` | {s['owner']} | {short(s['description'])} | {', '.join(s['uses']) or '—'} | {', '.join(s['next']) or '—'} | {', '.join(s['follows']) or '—'} |")
        L.append("")
    L += ["## ผลกระทบ: ถ้าแก้ skill นี้ ใครโดนบ้าง", "",
          "| skill | plugin | ถูกเรียกใช้โดย (uses) | เป็นนโยบายของ (follows) | รับงานต่อจาก (มีอยู่ใน next ของ) |", "|---|---|---|---|---|"]
    for n, s in sorted(skills.items(), key=lambda kv: (kv[1]["plugin"], kv[0])):
        by = lambda k: ", ".join(sorted(m for m, t in skills.items() if n in t[k])) or "—"
        L.append(f"| `{n}` | {s['plugin']} | {by('uses')} | {by('follows')} | {by('next')} |")
    return "\n".join(L) + "\n"


def main():
    check = "--check" in sys.argv
    sys.stdout.reconfigure(encoding="utf-8")
    plugins, skills, errors = load()
    outputs = {ROOT / ".claude-plugin/marketplace.json": json.dumps(gen_marketplace(plugins, skills), ensure_ascii=False, indent=2) + "\n",
               ROOT / ".gitea/CODEOWNERS": gen_codeowners(),
               ROOT / "plugins/core/skills/skill-finder/references/catalog.md": gen_catalog(plugins, skills)}
    for p in CFG["plugins"]:
        outputs[ROOT / f"plugins/{p['name']}/.claude-plugin/plugin.json"] = json.dumps(gen_plugin_json(p, skills), ensure_ascii=False, indent=2) + "\n"
    for path, content in outputs.items():
        rel = path.relative_to(ROOT).as_posix()
        old = path.read_text(encoding="utf-8") if path.exists() else None
        if old != content:
            if check:
                errors.append(f"{rel}: ไม่ตรงกับที่สร้างได้ — รัน python scripts/build.py แล้ว commit")
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8", newline="\n")
                print(f"เขียน {rel}")
    by_layer = {}
    for s in skills.values():
        by_layer[s["layer"]] = by_layer.get(s["layer"], 0) + 1
    print(f"{len(plugins)} plugin · {len(skills)} skill · " + " · ".join(f"{k} {v}" for k, v in sorted(by_layer.items())))
    if errors:
        print("❌ ไม่ผ่าน:")
        print("\n".join("  - " + e for e in errors))
        sys.exit(1)
    print("✅ หัวไฟล์ทุก skill ผ่านกติกา")


if __name__ == "__main__":
    main()
