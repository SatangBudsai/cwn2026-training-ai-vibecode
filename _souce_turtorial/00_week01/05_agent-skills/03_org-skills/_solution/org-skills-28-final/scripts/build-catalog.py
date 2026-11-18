#!/usr/bin/env python3
"""สร้าง catalog.md ของ skill-finder จากหัวไฟล์ SKILL.md ทุกตัวในคลัง และตรวจว่าหัวไฟล์ถูกกติกา

ใช้:  python scripts/build-catalog.py          # ตรวจหัวไฟล์ แล้วเขียน catalog.md ใหม่
      python scripts/build-catalog.py --check  # ตรวจอย่างเดียว ถ้า catalog.md ไม่ตรงกับหัวไฟล์จะ exit 1
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "plugins/core/skills/skill-finder/references/catalog.md"
LIST_FIELDS = ("uses", "next", "follows")
REQUIRED = ("owner", "layer", "version") + LIST_FIELDS


def parse_skill(path):
    """หัวไฟล์ในคลังนี้มีรูปแบบเดียว: name, description (block) และ metadata (ค่าบรรทัดเดียว)"""
    text = path.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        raise ValueError("ไม่มีหัวไฟล์")
    head = m.group(1)
    name = re.search(r"^name: (\S+)$", head, re.M)
    desc = re.search(r"^description: \|\n((?:  .*\n)+)", head + "\n", re.M)
    if not name or not desc:
        raise ValueError("ไม่มี name หรือ description แบบ block")
    meta = {}
    for key in REQUIRED:
        found = re.search(rf"^  {key}: (.*)$", head, re.M)
        if not found:
            raise ValueError(f"ไม่มี metadata.{key}")
        value = found.group(1).strip()
        if key in LIST_FIELDS:
            if not (value.startswith("[") and value.endswith("]")):
                raise ValueError(f"metadata.{key} ต้องเป็นรายการ [a, b]")
            value = [v.strip() for v in value[1:-1].split(",") if v.strip()]
        meta[key] = value
    return {"name": name.group(1), "description": " ".join(desc.group(1).split()), **meta}


def expected_layer(plugin):
    return plugin if plugin in ("core", "shared") else "department"


def load():
    marketplace = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text(encoding="utf-8"))
    owners = {}
    for line in (ROOT / "CODEOWNERS").read_text(encoding="utf-8").splitlines():
        m = re.match(r"\^plugins/([^/]+)/\.\* +(.+)$", line)
        if m:
            owners[m.group(1)] = m.group(2).split()
    plugins, skills, errors = [], [], []
    for entry in marketplace["plugins"]:
        pname = entry["name"]
        pdir = ROOT / entry["source"]
        if pname not in owners:
            errors.append(f"{pname}: ไม่มีใน CODEOWNERS")
        plugins.append({"name": pname, "description": entry["description"], "leads": owners.get(pname, [])})
        files = sorted(pdir.glob("skills/*/SKILL.md"))
        if not files:
            errors.append(f"{pname}: ไม่มี skill")
        for f in files:
            try:
                s = parse_skill(f)
            except ValueError as e:
                errors.append(f"{f.relative_to(ROOT)}: {e}")
                continue
            s["plugin"] = pname
            if s["name"] != f.parent.name:
                errors.append(f"{s['name']}: ชื่อไม่ตรงกับโฟลเดอร์ {f.parent.name}")
            if s["layer"] != expected_layer(pname):
                errors.append(f"{s['name']}: layer {s['layer']} ควรเป็น {expected_layer(pname)}")
            skills.append(s)
    names = {s["name"] for s in skills}
    if len(names) != len(skills):
        errors.append("มีชื่อ skill ซ้ำกันในคลัง")
    for s in skills:
        for field in LIST_FIELDS:
            for ref in s[field]:
                if ref not in names:
                    errors.append(f"{s['name']}: {field} อ้าง {ref} ซึ่งไม่มีในคลัง")
    return plugins, skills, errors


def codes(items):
    return " ".join(f"`{i}`" for i in items) or "—"


def render(plugins, skills):
    by_plugin = {p["name"]: [s for s in skills if s["plugin"] == p["name"]] for p in plugins}
    lead = {p["name"]: p["leads"] for p in plugins}
    out = [
        "# catalog: คลัง skill novatech-skills",
        "",
        "> สร้างจากหัวไฟล์ SKILL.md ด้วย `scripts/build-catalog.py` ห้ามแก้ไฟล์นี้เอง",
        "",
        f"มี {len(plugins)} plugin · {len(skills)} skill",
        "",
        "## plugin และผู้ดูแล",
        "",
        "| plugin | ผู้ดูแล (CODEOWNER) | จำนวน skill | ขอบเขต |",
        "|---|---|---:|---|",
    ]
    for p in plugins:
        out.append(f"| `{p['name']}` | {codes(p['leads'])} | {len(by_plugin[p['name']])} | {p['description']} |")
    out += ["", "## skill ทั้งหมด", ""]
    for p in plugins:
        out += [f"### {p['name']}", ""]
        for s in by_plugin[p["name"]]:
            out += [
                f"#### `{s['name']}`",
                f"- เรียกใช้เป็น: `{p['name']}:{s['name']}` · ชั้น: {s['layer']} · เวอร์ชัน: {s['version']}",
                f"- เจ้าของ skill: `{s['owner']}` · ผู้ดูแล plugin: {codes(lead[p['name']])}",
                f"- ทำอะไร: {s['description']}",
                f"- uses: {codes(s['uses'])} · next: {codes(s['next'])} · follows: {codes(s['follows'])}",
                "",
            ]
    out += [
        "## แก้ตัวไหนกระทบใคร",
        "",
        "ผลกระทบตรง = skill ที่ `uses` หรือ `follows` ตัวนี้ ต้องตรวจซ้ำเมื่อแก้ · รับงานต่อจาก = skill ที่ `next` ชี้มาตัวนี้ ต้องตรวจเมื่อเปลี่ยน input ที่รับ · แผนกที่ต้องแจ้ง = ผู้ดูแล plugin ของ skill ที่กระทบตรง",
        "",
        "| skill | ผลกระทบตรง | จำนวน | แผนกที่ต้องแจ้ง | รับงานต่อจาก |",
        "|---|---|---:|---|---|",
    ]
    for s in sorted(skills, key=lambda x: x["name"]):
        direct = sorted(o["name"] for o in skills if s["name"] in o["uses"] + o["follows"])
        upstream = sorted(o["name"] for o in skills if s["name"] in o["next"])
        notify = sorted({l for o in skills if o["name"] in direct for l in lead[o["plugin"]]})
        out.append(f"| `{s['name']}` | {codes(direct)} | {len(direct)} | {codes(notify)} | {codes(upstream)} |")
    return "\n".join(out) + "\n"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    plugins, skills, errors = load()
    if errors:
        print("หัวไฟล์ไม่ผ่าน:", *errors, sep="\n- ", file=sys.stderr)
        return 1
    content = render(plugins, skills)
    if "--check" in sys.argv[1:]:
        current = CATALOG.read_text(encoding="utf-8") if CATALOG.exists() else ""
        if current != content:
            print("catalog.md ไม่ตรงกับหัวไฟล์ ให้รัน python scripts/build-catalog.py", file=sys.stderr)
            return 1
        print(f"ผ่าน: {len(plugins)} plugin · {len(skills)} skill")
        return 0
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(content, encoding="utf-8", newline="\n")
    print(f"เขียน {CATALOG.relative_to(ROOT)}: {len(plugins)} plugin · {len(skills)} skill")
    return 0


if __name__ == "__main__":
    sys.exit(main())
