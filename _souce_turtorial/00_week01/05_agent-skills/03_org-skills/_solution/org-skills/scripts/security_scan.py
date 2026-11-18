#!/usr/bin/env python3
"""ด่าน 3 ของ CI — สแกนความปลอดภัยของ skill (กฎตายตัว ไม่ใช้ AI)

    python scripts/security_scan.py            # สแกนทุกไฟล์ใน git (exit 1 ถ้ามี ERROR)
    python scripts/security_scan.py --list-rules

หา 3 กลุ่ม:
  EXF-*  ส่งข้อมูลออกนอกบริษัท — URL ปลายทางนอก allowlist ในสคริปต์/คำสั่ง, socket/SMTP/FTP ดิบ,
         curl/wget ส่งข้อมูลออก, ดาวน์โหลดแล้วรันทันที (curl | sh)
  SEC-*  อ่านความลับ — ไฟล์ .env, token/credential (.gitea-token, ~/.ssh, ~/.claude/.credentials ...),
         ตัวแปร env ที่ชื่อเป็นความลับ, dump env ทั้งก้อน
  INJ-*  prompt injection — ข้อความสั่ง AI ให้ทิ้งคำสั่งเดิม/ปิดบังผู้ใช้/ข้ามสิทธิ์, อักขระซ่อน
         (zero-width, bidi, Unicode tag), คอมเมนต์ HTML ที่ซ่อนคำสั่ง, hook/MCP ที่รันเองอัตโนมัติ

ข้อยกเว้นที่ทีมกลางรีวิวแล้วอยู่ใน scripts/security-allowlist.json (CODEOWNER = plat-ken)
stdlib ล้วน
"""
import fnmatch, json, os, re, subprocess, sys
from pathlib import Path
from urllib.parse import urlparse

# ORG_SKILLS_ROOT = tree ที่จะตรวจ (CI ใช้สคริปต์จาก main ตรวจ tree ของ PR) · ไม่ตั้ง = คลังที่สคริปต์นี้อยู่
ROOT = Path(os.environ.get("ORG_SKILLS_ROOT") or Path(__file__).resolve().parent.parent).resolve()
# allowlist ต้องมาคู่กับตัวสแกน (CI = ของ main) — PR แก้ allowlist ของตัวเองแล้วไม่มีผลจนกว่าจะ merge
ALLOWLIST_FILE = Path(__file__).resolve().parent / "security-allowlist.json"
SELF = {"scripts/security_scan.py", "scripts/security-allowlist.json"}

CODE_EXT = {".py", ".mjs", ".js", ".cjs", ".ts", ".tsx", ".sh", ".bash", ".ps1", ".rb", ".pl"}
TEXT_EXT = CODE_EXT | {".md", ".txt", ".json", ".yaml", ".yml", ".csv", ".html", ".toml", ".ini", ".example", ".prisma", ""}

# โดเมนภายใน / ที่ใช้เป็นตัวอย่าง — ไม่ถือว่า "นอกบริษัท"
INTERNAL_HOST = re.compile(
    r"^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|gitea|[a-z0-9-]+"  # ชื่อ host ไม่มีจุด = service ภายใน
    r"|(.+\.)?novatech\.(test|local|internal)|(.+\.)?example(\.(com|org|net))?|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)$", re.I)

URL = re.compile(r"https?://[^\s'\"`)<>\]}]+", re.I)

RULES = {
    # --- ส่งข้อมูลออก
    "EXF-URL": "สคริปต์ชี้ URL นอกบริษัท",
    "EXF-SOCKET": "ใช้ socket/SMTP/FTP/DNS ดิบ (ช่องทางส่งข้อมูลออกที่ไม่ผ่าน HTTP)",
    "EXF-UPLOAD": "คำสั่งส่งข้อมูล/ไฟล์ออกไปยังปลายทางนอกบริษัท",
    "EXF-PIPE-SHELL": "ดาวน์โหลดแล้วรันทันที (curl|sh, iwr|iex)",
    "EXF-DYNAMIC": "เรียกเครือข่ายด้วย URL ที่ประกอบตอนรัน — ตรวจด้วยตาว่าไปที่ไหน",
    # --- อ่านความลับ
    "SEC-DOTENV": "อ่านไฟล์ .env",
    "SEC-CREDFILE": "อ่านไฟล์ token / credential",
    "SEC-ENVVAR": "อ่านตัวแปร env ที่เป็นความลับ",
    "SEC-ENVDUMP": "ดึงตัวแปร env ทั้งหมด",
    # --- prompt injection
    "INJ-OVERRIDE": "สั่ง AI ให้ทิ้ง/แทนที่คำสั่งเดิม",
    "INJ-CONCEAL": "สั่ง AI ให้ปิดบังผู้ใช้หรือทำโดยไม่บอก",
    "INJ-BYPASS": "สั่งข้ามการขออนุญาต / เปิดสิทธิ์เกินจำเป็น",
    "INJ-HIDDEN-CHAR": "มีอักขระซ่อน (zero-width / bidi / Unicode tag)",
    "INJ-HTML-COMMENT": "คอมเมนต์ HTML ในไฟล์ .md ซ่อนคำสั่ง",
    "INJ-AUTORUN": "plugin มี hook / MCP server / bin ที่รันเองอัตโนมัติ",
    "INJ-BLOB": "ก้อน base64/hex ยาวผิดปกติ (อาจซ่อน payload)",
}
WARN_ONLY = {"EXF-DYNAMIC", "INJ-BLOB"}

P = lambda s: re.compile(s, re.I)
CODE_PATTERNS = [
    ("EXF-SOCKET", P(r"^\s*import\s+[\w\s,]*\b(socket|smtplib|ftplib|telnetlib|paramiko)\b|\bfrom\s+(socket|smtplib|ftplib)\s+import|"
                     r"require\(\s*['\"](node:)?(net|dgram|dns|tls)['\"]\s*\)|from\s+['\"](node:)?(net|dgram|dns|tls)['\"]|"
                     r"New-Object\s+System\.Net\.Sockets|Send-MailMessage")),
    ("EXF-DYNAMIC", P(r"\b(requests\.(get|post|put|patch)|urlopen|http\.client\.HTTPS?Connection|fetch|axios(\.\w+)?|"
                      r"Invoke-(WebRequest|RestMethod))\s*\(\s*(?!['\"`]https?://)[A-Za-z_]")),
    ("SEC-DOTENV", P(r"(?<=['\"`/\\])\.env(\.(local|production|prod|development|dev))?['\"`]|"
                     r"\b(load_dotenv|dotenv_values)\b|require\(\s*['\"]dotenv|from\s+['\"]dotenv|import\s+['\"]dotenv")),
    ("SEC-ENVVAR", P(r"(os\.environ(\.get)?\s*[\[(]\s*|os\.getenv\(\s*|process\.env\.|process\.env\[\s*|\$env:|\$\{?)['\"]?"
                     r"[A-Z0-9_]*(TOKEN|SECRET|PASSW(OR)?D|API_?KEY|PRIVATE_KEY|CREDENTIAL|ANTHROPIC|GITEA_|GITHUB_|AWS_|OPENAI)[A-Z0-9_]*")),
    ("SEC-ENVDUMP", P(r"os\.environ\.(items|copy|keys|values)\(|dict\(\s*os\.environ\s*\)|json\.dumps\(\s*(dict\()?os\.environ|"
                      r"JSON\.stringify\(\s*process\.env|Object\.(entries|keys|values)\(\s*process\.env|\bprintenv\b|Get-ChildItem\s+env:")),
]
ANY_PATTERNS = [  # ใช้ทั้งโค้ดและเอกสาร (คำสั่งใน SKILL.md = สิ่งที่ AI จะรัน)
    ("EXF-PIPE-SHELL", P(r"\b(curl|wget)\b[^|\n]*\|\s*(sudo\s+)?(ba|z)?sh\b|\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^|\n]*\|\s*iex\b")),
    ("SEC-CREDFILE", P(r"\.gitea-token|\.git-credentials|\.netrc\b|~/\.ssh|[/\\]\.ssh[/\\]|\bid_(rsa|ed25519|ecdsa)\b|"
                       r"\.claude[/\\]\.credentials|\.aws[/\\]credentials|\.docker[/\\]config\.json|\.npmrc|\.pypirc|"
                       r"git\s+credential\s+fill|security\s+find-(generic|internet)-password|cmdkey\s+/list")),
    ("SEC-DOTENV", P(r"\b(cat|type|source|less|more|head|tail|Get-Content|gc)\s+[^\s|;]*\.env\b(?!\.example)|"
                     r"(?<!ห้าม)(?<!อย่า)(?<!ไม่)(?<!ห้าม )(?<!อย่า )(อ่าน|เปิด|ส่ง|แนบ|คัดลอก)\s*(ไฟล์\s*)?`?\.env`?(?!\.example)")),
    ("INJ-OVERRIDE", P(r"\b(ignore|disregard|forget|override)\b.{0,30}\b(previous|prior|above|earlier|all|system|original)\b.{0,20}"
                       r"\b(instructions?|prompts?|rules|guidelines|directives)\b|\byou\s+are\s+now\b|\bnew\s+(system\s+)?instructions\s*:|"
                       r"\bsystem\s+prompt\s*:|\bjailbreak\b|\bDAN\s+mode\b|"
                       r"(ไม่ต้องสนใจ|เพิกเฉย(ต่อ)?|ลืม|ละเลย|ข้าม|ยกเลิก)\s*(ทุก)?คำสั่ง(ก่อนหน้า|เดิม|ทั้งหมด|ของระบบ|ข้างบน|ด้านบน)|"
                       r"คำสั่งใหม่(ของคุณ)?(คือ|:)|(ตอนนี้)?คุณคือ.{0,20}(ไม่มีข้อจำกัด|ไร้ข้อจำกัด)")),
    ("INJ-CONCEAL", P(r"\b(do\s+not|don'?t|never)\s+(tell|inform|mention|show|reveal|notify)\b.{0,20}\b(the\s+)?user\b|"
                      r"\bwithout\s+(telling|asking|notifying|informing)\s+(the\s+)?user\b|\b(secretly|silently|covertly)\s+"
                      r"(send|upload|post|read|copy|exfiltrate|run|execute)|"
                      r"(ห้าม|อย่า|ไม่ต้อง)\s*(บอก|แจ้ง|แสดงให้|ให้)\s*ผู้ใช้\s*(รู้|เห็น|ทราบ)?|โดยไม่(ต้อง)?(บอก|ถาม|แจ้ง)\s*ผู้ใช้|"
                      r"แอบ\s*(ส่ง|อ่าน|อัปโหลด|คัดลอก|รัน|เก็บ)")),
    ("INJ-BYPASS", P(r"--dangerously-skip-permissions|\bbypassPermissions\b|--permission-mode\s+bypass|"
                     r"allowed-tools\s*:\s*.*\b(Bash|\*)\s*\(\s*\*\s*\)|ข้าม(การ)?ขอ(อนุญาต|สิทธิ์)|ไม่ต้องขอ(อนุญาต|สิทธิ์)")),
]
UPLOAD = P(r"\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm|scp|rsync|sftp|ftp|nc|ncat)\b")
HIDDEN = re.compile("[​-‏‪-‮⁠-⁤⁦-⁩\U000e0000-\U000e007f]|(?<!^)﻿")
BLOB = re.compile(r"[A-Za-z0-9+/]{300,}={0,2}|\b[0-9a-f]{300,}\b")
HTML_COMMENT = re.compile(r"<!--(.*?)-->", re.S)
COMMENT_CMD = P(r"\b(ignore|instruction|assistant|claude|ai|send|upload|run|execute|curl|token|secret)\b|คำสั่ง|ส่ง|อ่าน|รัน|ผู้ช่วย|เอไอ")


def git_files():
    out = subprocess.run(["git", "-C", str(ROOT), "ls-files", "-z"], capture_output=True, text=True, encoding="utf-8").stdout
    return [f for f in out.split("\0") if f]


def load_allowlist():
    if not ALLOWLIST_FILE.exists():
        return []
    items = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))["allow"]
    for it in items:
        if not it.get("reason"):
            raise SystemExit(f"security-allowlist.json: ทุกข้อยกเว้นต้องมี reason ({it})")
    return items


def allowed(allow, path, rule, line):
    return any(fnmatch.fnmatch(path, a["path"]) and a["rule"] in (rule, "*") and a.get("match", "") in line for a in allow)


def external_urls(line):
    for u in URL.findall(line):
        host = urlparse(u.rstrip(".,;")).hostname or ""
        if "<" in u or "{" in u or "$" in u or not host:
            continue  # placeholder เช่น https://<project>-uat.example
        if not INTERNAL_HOST.match(host):
            yield u


def scan_file(path, text):
    ext = Path(path).suffix.lower()
    is_code = ext in CODE_EXT
    in_templates = "/templates/" in path  # โค้ดแอปที่ scaffold ออกไป ไม่ใช่โค้ดที่ AI รันบนเครื่องพนักงาน
    found = []
    for no, line in enumerate(text.splitlines(), 1):
        if HIDDEN.search(line):
            found.append(("INJ-HIDDEN-CHAR", no, ", ".join(sorted({f"U+{ord(c):04X}" for c in HIDDEN.findall(line)}))))
        for rule, pat in ANY_PATTERNS:
            if pat.search(line):
                found.append((rule, no, line.strip()))
        ext_urls = list(external_urls(line))
        if ext_urls and UPLOAD.search(line):
            found.append(("EXF-UPLOAD", no, line.strip()))
        if is_code:
            for rule, pat in CODE_PATTERNS:
                if rule == "SEC-ENVVAR" and in_templates:
                    continue
                if pat.search(line):
                    found.append((rule, no, line.strip()))
            if ext_urls and not UPLOAD.search(line):
                found.append(("EXF-URL", no, ", ".join(ext_urls)))
        if BLOB.search(line) and not path.endswith((".svg", ".png", ".lock")):
            found.append(("INJ-BLOB", no, line.strip()[:80] + "…"))
    if ext == ".md":
        for m in HTML_COMMENT.finditer(text):
            if COMMENT_CMD.search(m.group(1)):
                found.append(("INJ-HTML-COMMENT", text[: m.start()].count("\n") + 1, m.group(0)[:120]))
    return found


def autorun_components(files):
    """hook / MCP / bin ของ plugin รันโค้ดบนเครื่องทุกคนที่ติดตั้ง โดยไม่ต้องเรียก skill"""
    found = []
    for f in files:
        name = Path(f).name
        if re.match(r"plugins/[^/]+/(hooks/|\.mcp\.json$|bin/|\.lsp\.json$)", f):
            found.append((f, ("INJ-AUTORUN", 1, name)))
        if re.match(r"plugins/[^/]+/\.claude-plugin/plugin\.json$", f):
            data = json.loads((ROOT / f).read_text(encoding="utf-8"))
            for k in ("hooks", "mcpServers", "lspServers", "bin"):
                if k in data:
                    found.append((f, ("INJ-AUTORUN", 1, f"plugin.json มี {k}")))
    return found


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if "--list-rules" in sys.argv:
        for k, v in RULES.items():
            print(f"{k:18} {'WARN ' if k in WARN_ONLY else 'ERROR'} {v}")
        return
    allow, files = load_allowlist(), git_files()
    results, used = [], set()
    for f in files:
        if f in SELF or "/evals/results/" in f:
            continue
        p = ROOT / f
        if p.suffix.lower() not in TEXT_EXT or not p.is_file():
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        results += [(f, r) for r in scan_file(f, text)]
    results += autorun_components(files)

    errors = warns = 0
    for f, (rule, no, detail) in sorted(results):
        line = (ROOT / f).read_text(encoding="utf-8").splitlines()[no - 1] if (ROOT / f).exists() else ""
        if allowed(allow, f, rule, line):
            used.add(rule)
            continue
        level = "WARN " if rule in WARN_ONLY else "ERROR"
        errors += level == "ERROR"; warns += level == "WARN "
        print(f"{level} {f}:{no} [{rule}] {RULES[rule]}\n        {detail[:160]}")
    print(f"\nสแกน {len(files)} ไฟล์ · ERROR {errors} · WARN {warns} · ข้อยกเว้นใน allowlist {len(allow)}")
    if errors:
        print("❌ ไม่ผ่าน — แก้ไฟล์ หรือถ้าจำเป็นจริง ขอทีมกลาง (plat-ken) เพิ่มข้อยกเว้นใน scripts/security-allowlist.json พร้อมเหตุผล")
        sys.exit(1)
    print("✅ ไม่พบการส่งข้อมูลออก การอ่านความลับ หรือ prompt injection")


if __name__ == "__main__":
    main()
