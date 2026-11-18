#!/usr/bin/env python3
"""ด่าน 3: สแกนความปลอดภัยของทุกไฟล์ใต้ plugins/ (ไม่ใช้ AI)

กฎ:
  egress            สคริปต์หรือคำสั่งส่งข้อมูลไปโฮสต์นอกบริษัท
  obfuscated-exec   ถอดรหัส base64 แล้วสั่งรัน
  secret-file       อ่าน .env หรือไฟล์ token/กุญแจ
  secret-env        อ่านตัวแปรแวดล้อมที่เป็นความลับ หรือพิมพ์ env ทั้งชุด
  prompt-injection  ข้อความสั่ง AI ให้ทำนอกเรื่องหรือปิดบังผู้ใช้
  hidden-text       อักขระล่องหน (ใช้ซ่อนคำสั่งจากคนอ่าน)

ข้อยกเว้นที่ผู้ดูแลรีวิวแล้วอยู่ใน .gitea/security-allowlist.txt บรรทัดละ
  <กฎ> <glob ของ path>  # เหตุผล

ใช้:  python scripts/security-scan.py [ไฟล์หรือโฟลเดอร์ ...]
"""
import fnmatch, ipaddress, re, subprocess, sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
ALLOWLIST = ROOT / ".gitea/security-allowlist.txt"

CODE_EXT = {".py", ".sh", ".bash", ".zsh", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".ps1", ".psm1", ".rb", ".pl", ".php", ".bat", ".cmd"}
DOC_EXT = {".md", ".markdown", ".txt", ".html", ".htm", ".yaml", ".yml", ".json", ".toml", ".csv", ".xml", ".svg"}
# hook และ MCP ของ plugin คือคำสั่งที่รันจริง จึงตรวจแบบเดียวกับโค้ด
CODE_NAMES = {"hooks.json", ".mcp.json"}

INTERNAL_SUFFIXES = (".novatech.test", ".novatech.co.th", ".internal", ".local", ".localhost")
INTERNAL_HOSTS = {"localhost", "gitea", "novatech.test", "novatech.co.th"}
# ไม่ใช้ ip.is_private เพราะนับช่วงเอกสาร เช่น 203.0.113.0/24 เป็น private ด้วย
PRIVATE_NETWORKS = [ipaddress.ip_network(n) for n in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7")]
# โดเมนสงวนตาม RFC 2606 ไม่มีเซิร์ฟเวอร์จริงให้ข้อมูลไปถึง
RESERVED = re.compile(r"(^|\.)example\.(com|org|net)$|\.example$|\.invalid$")

URL = re.compile(r"""\b(?:https?|ftp|wss?)://[^\s"'`<>)\]}\\]+""", re.I)
NETWORK_CALL = re.compile(
    r"""\b(curl|wget|ncat|nc|netcat|scp|sftp|rsync|ftp|telnet)\s+\S
    |\brequests\.(get|post|put|patch|delete|request|session)\b
    |\bhttpx\.|\baiohttp\.|\burllib\.request\b|\burlopen\s*\(|\bhttp\.client\b|\bsmtplib\b|\bsocket\.(socket|create_connection)\b
    |\bfetch\s*\(|\baxios\b|\bgot\s*\(|\bXMLHttpRequest\b|\bnavigator\.sendBeacon\b|\bhttps?\.(request|get)\s*\(
    |\b(Invoke-WebRequest|Invoke-RestMethod|iwr|irm|Send-MailMessage)\b
    |/dev/tcp/
    """,
    re.I | re.X,
)

# อ้าง .env ตรงตัว แต่ไม่นับ .env.example หรือ process.env
ENV_FILE = re.compile(r"""(?<![\w.])\.env(?![\w.-])|(?<=[/\\])\.env(?![\w.-])""")
# cp .env.example .env คือการสร้างไฟล์จากแม่แบบ ไม่ได้อ่านความลับ
ENV_FROM_TEMPLATE = re.compile(r"\bcp\s+\S*\.env\.example\s+\S*\.env\b")
ENV_FILE_READ = re.compile(
    r"""\b(open|read_text|read_bytes|readFile|readFileSync|createReadStream|load_dotenv|dotenv_values|config)\s*\(
    |\b(cat|source|less|more|head|tail|grep|sed|awk|cp|scp|type|Get-Content|gc)\s+\S*
    |(^|[\s;&|])\.\s+\S*\.env|\bPath\s*\(
    """,
    re.I | re.X,
)
SECRET_FILE = re.compile(
    r"""\.gitea-token|\.git-credentials|\.netrc\b|\.npmrc\b|\.pypirc\b|\.aws/credentials|\.ssh/(id_|authorized_keys|config)
    |\.claude/\.credentials|\.claude\.json\b|\.docker/config\.json|\.kube/config|id_(rsa|ed25519|ecdsa)\b""",
    re.I | re.X,
)
SECRET_NAME = r"[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|CREDENTIAL|AUTH_KEY)[A-Z0-9_]*"
SECRET_ENV = re.compile(
    rf"""os\.environ(?:\.get)?\s*[\[(]\s*['"]{SECRET_NAME}['"]
    |os\.getenv\s*\(\s*['"]{SECRET_NAME}['"]
    |process\.env(?:\.|\[\s*['"]){SECRET_NAME}
    |Deno\.env\.get\s*\(\s*['"]{SECRET_NAME}['"]
    |\$\{{?{SECRET_NAME}\}}?
    |\$env:{SECRET_NAME}
    |\bprintenv\b(?!\s+[A-Z_]+\s*$)
    |(?:^|[\s;&|(])(?:env|set)\s*(?:\||>)
    |\b(?:dict|json\.dumps|str|repr)\s*\(\s*os\.environ
    |JSON\.stringify\s*\(\s*process\.env
    |\bObject\.(?:entries|keys|values)\s*\(\s*process\.env
    """,
    re.X,
)
OBFUSCATED_EXEC = re.compile(
    r"""(base64\s+(-d|--decode)|b64decode|atob\s*\(|FromBase64String)[^\n]*(\|\s*(ba|z)?sh\b|\bexec\b|\beval\b|Invoke-Expression|\biex\b)
    |(\bexec\b|\beval\b|Invoke-Expression|\biex\b)[^\n]*(base64|b64decode|atob\s*\(|FromBase64String)
    |\b(curl|wget)\b[^\n]*\|\s*(ba|z)?sh\b""",
    re.I | re.X,
)
INJECTION = [
    re.compile(p, re.I)
    for p in (
        r"\b(ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}\b(previous|prior|above|earlier|preceding|all|system|your)\b[^.\n]{0,30}\b(instruction|prompt|rule|guideline|polic)",
        r"\byou are now\b|\bnew instructions?\s*:|\bact as (an? )?(unrestricted|jailbroken)|\bjailbreak\b|\bDAN mode\b",
        r"\b(do not|don'?t|never)\b[^.\n]{0,30}\b(tell|inform|mention|reveal|show|notify|alert)\b[^.\n]{0,20}\b(the )?(user|human|reviewer|operator)\b",
        r"\b(hide|conceal|keep)\b[^.\n]{0,30}\bfrom\b[^.\n]{0,12}\b(the )?(user|human|reviewer|operator)\b",
        r"\bwithout\b[^.\n]{0,20}\b(telling|informing|asking|notifying|alerting)\b[^.\n]{0,12}\b(the )?(user|human|reviewer|operator)\b",
        r"\b(reveal|print|show|leak|repeat|exfiltrate)\b[^.\n]{0,30}\b(system prompt|hidden instructions?|your instructions)\b",
        r"<\|\s*(im_start|im_end|system)\s*\|>|</?system>(?!-)|\[/?(SYSTEM|INST)\]|<<\s*SYS\s*>>",
        r"(ไม่ต้องสนใจ|อย่าสนใจ|ละเว้น|ละทิ้ง|เพิกเฉย|ลืม|ข้าม)[^\n]{0,30}(คำสั่ง|กฎ|กติกา|คำแนะนำ|ข้อห้าม)[^\n]{0,15}(ก่อนหน้า|ข้างบน|ด้านบน|เดิม|ทั้งหมด|ของระบบ)",
        r"(อย่า|ห้าม|ไม่ต้อง)(บอก|แจ้ง|เล่า|เตือน)[^\n]{0,12}(ผู้ใช้|คนใช้|ผู้ตรวจ|ผู้รีวิว)",
        r"(ซ่อน|ปิดบัง)[^\n]{0,25}จาก(ผู้ใช้|คนใช้|ผู้ตรวจ|ผู้รีวิว)",
        r"โดยไม่(บอก|แจ้ง|ถาม|เตือน)[^\n]{0,8}(ผู้ใช้|คนใช้|ผู้ตรวจ|ผู้รีวิว)",
        r"แอบ(ส่ง|อ่าน|คัดลอก|อัปโหลด|เก็บ|ดึง)",
        r"(เปิดเผย|แสดง|ส่งออก)[^\n]{0,20}(system prompt|คำสั่งระบบ|พรอมต์ระบบ)",
        r"(ส่ง|อัปโหลด|โพสต์)[^\n]{0,30}(token|โทเคน|รหัสผ่าน|api key|\.env|ไฟล์ลับ)[^\n]{0,30}(ไปที่|ไปยัง|ไปให้|ออกไป|ไป\s*https?://)",
        r"<!--[^\n]*\b(ai|claude|assistant|llm|agent)\b[^\n]*-->",
        r"<!--[^\n]*(ผู้ช่วย|เอไอ|คำสั่งถึง)[^\n]*-->",
    )
]
# อักขระล่องหน: zero-width, ตัวควบคุมทิศทาง และ Unicode tag ที่ใช้ซ่อนข้อความ
HIDDEN = re.compile("[​-‏‪-‮⁠-⁤⁦-⁩﻿\U000e0000-\U000e007f]")


def is_internal(host):
    host = (host or "").lower().rstrip(".")
    if not host or host in INTERNAL_HOSTS or host.endswith(INTERNAL_SUFFIXES) or RESERVED.search(host):
        return True
    try:
        ip = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        return False
    return ip.is_loopback or any(ip in network for network in PRIVATE_NETWORKS)


def external_urls(line):
    found = []
    for url in URL.findall(line):
        if "${" in url or "{{" in url or "<" in url:
            continue  # URL แม่แบบ ยังไม่รู้โฮสต์
        try:
            host = urlparse(url).hostname
        except ValueError:
            host = None
        if not is_internal(host):
            found.append(url)
    return found


def looks_like_code(path):
    return path.suffix.lower() in CODE_EXT or path.name in CODE_NAMES


def scan_text(rel, text):
    """คืนรายการ (บรรทัด, กฎ, ข้อความ) ของไฟล์เดียว"""
    findings = []
    path = Path(rel)
    code = looks_like_code(path)
    lines = text.splitlines()
    has_network_call = code and any(NETWORK_CALL.search(line) for line in lines)
    for number, line in enumerate(lines, 1):
        bare = line[1:] if number == 1 and line.startswith("﻿") else line
        if code or path.suffix.lower() in DOC_EXT or not path.suffix:
            # โค้ด: มีการเรียกเครือข่ายในไฟล์ + URL นอกบริษัท (รวมกรณีเก็บ URL ในตัวแปร)
            # เอกสาร: ต้องเป็นคำสั่งเครือข่ายบรรทัดเดียวกับ URL เพราะลิงก์อ้างอิงธรรมดาไม่ได้ส่งอะไรออก
            urls = external_urls(bare)
            if urls and (has_network_call or NETWORK_CALL.search(bare)):
                findings.append((number, "egress", urls[0]))
            if OBFUSCATED_EXEC.search(bare):
                findings.append((number, "obfuscated-exec", bare.strip()))
            if SECRET_FILE.search(bare) or (ENV_FILE.search(ENV_FROM_TEMPLATE.sub("", bare)) and ENV_FILE_READ.search(bare)):
                findings.append((number, "secret-file", bare.strip()))
            if code and SECRET_ENV.search(bare):
                findings.append((number, "secret-env", bare.strip()))
        if any(pattern.search(bare) for pattern in INJECTION):
            findings.append((number, "prompt-injection", bare.strip()))
        if HIDDEN.search(bare):
            findings.append((number, "hidden-text", ascii(HIDDEN.search(bare).group())))
    return findings


def load_allowlist(path=ALLOWLIST):
    entries = []
    if path.exists():
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.split("#", 1)[0].strip()
            if line:
                rule, glob = line.split(None, 1)
                entries.append((rule, glob.strip()))
    return entries


def tracked_files(targets):
    args = ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", *targets]
    output = subprocess.run(args, cwd=ROOT, check=True, capture_output=True).stdout
    return [name.decode("utf-8") for name in output.split(b"\0") if name]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    targets = sys.argv[1:] or ["plugins"]
    allow = load_allowlist()
    used, blocked, excused, scanned = set(), [], 0, 0
    for rel in tracked_files(targets):
        path = ROOT / rel
        suffix = path.suffix.lower()
        if not (looks_like_code(path) or suffix in DOC_EXT or not suffix):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue  # ไฟล์ไบนารี
        scanned += 1
        for number, rule, detail in scan_text(rel, text):
            match = next((e for e in allow if e[0] == rule and fnmatch.fnmatch(rel, e[1])), None)
            if match:
                used.add(match)
                excused += 1
            else:
                blocked.append(f"{rel}:{number} [{rule}] {detail[:160]}")
    for entry in allow:
        if entry not in used:
            print(f"เตือน: ข้อยกเว้นไม่ถูกใช้แล้ว ควรลบ: {entry[0]} {entry[1]}", file=sys.stderr)
    if blocked:
        print(f"พบจุดเสี่ยง {len(blocked)} จุด (ถ้าตรวจแล้วว่าปลอดภัย ให้ผู้ดูแลเพิ่มใน .gitea/security-allowlist.txt พร้อมเหตุผล):", *blocked, sep="\n- ", file=sys.stderr)
        return 1
    print(f"ผ่าน: สแกน {scanned} ไฟล์ · ไม่พบจุดเสี่ยงใหม่ · ใช้ข้อยกเว้น {excused} จุด")
    return 0


if __name__ == "__main__":
    sys.exit(main())
