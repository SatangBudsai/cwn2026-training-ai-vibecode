"""แปลง mcp.json ({"mcpServers":{...}}) เป็นค่า -c ของ Codex บรรทัดละ 1 server

ตัวอย่างผลลัพธ์: mcp_servers.playwright={command="playwright-mcp",args=["--headless"]}
"""
import json
import re
import sys


def toml_key(key):
    return key if re.fullmatch(r"[A-Za-z0-9_-]+", key) else json.dumps(key, ensure_ascii=False)


def toml_value(value):
    if isinstance(value, dict):
        items = (f"{toml_key(k)}={toml_value(v)}" for k, v in value.items() if v is not None)
        return "{" + ",".join(items) + "}"
    if isinstance(value, list):
        return "[" + ",".join(toml_value(v) for v in value) + "]"
    # สตริง/ตัวเลข/boolean ของ JSON เขียนแบบเดียวกับ TOML
    return json.dumps(value, ensure_ascii=False)


def to_codex_server(server):
    # ชื่อ field ของ Claude ที่ Codex เรียกต่างกันหรือไม่มี
    converted = {k: v for k, v in server.items() if k != "type"}
    if "headers" in converted:
        converted["http_headers"] = converted.pop("headers")
    return converted


def main(path):
    with open(path, encoding="utf-8") as f:
        servers = json.load(f)["mcpServers"]
    for name, server in servers.items():
        # -c ของ Codex แยก path ด้วยจุดโดยไม่สนเครื่องหมายคำพูด ชื่อแบบนี้จะทำให้เปิด Codex ไม่ได้ทั้งคำสั่ง
        if not re.fullmatch(r"[A-Za-z0-9_-]+", name):
            print(f"mcp-to-codex: ข้าม MCP '{name}' เพราะชื่อใช้ได้เฉพาะ A-Z a-z 0-9 _ -", file=sys.stderr)
            continue
        print(f"mcp_servers.{name}={toml_value(to_codex_server(server))}")


if __name__ == "__main__":
    try:
        main(sys.argv[1])
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as e:
        print(f"mcp-to-codex: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
