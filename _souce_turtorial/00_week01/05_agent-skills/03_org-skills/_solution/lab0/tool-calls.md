# LAB 0 · คำสั่งที่ Claude รันจริง (จาก stream-json)

> รอบล่าสุด: บริษัท 28 คน 4 ชั้น (เพิ่มผู้บริหารสาย 3 คน ทีม Product และน้องใหม่ Sales/HR) และ compose ที่มี cleanup

1. `Glob`
```json
{"pattern": "**/*"}
```

2. `Read`
```json
{"file_path": "C:\\t\\org05p\\novatech\\compose.yml"}
```

3. `Read`
```json
{"file_path": "C:\\t\\org05p\\novatech\\seed\\people.json"}
```

4. `PowerShell`
```json
{"command": "docker compose up -d; docker compose ps", "description": "Start Novatech simulated company", "timeout": 600000}
```

5. `PowerShell`
```json
{"command": "docker compose up -d", "description": "Start Novatech simulated company", "timeout": 600000}
```

6. `Bash`
```bash
docker compose up -d 2>&1 | tail -20
```

7. `Bash`
```bash
docker compose ps -a; curl -s "http://localhost:3300/api/v1/orgs/novatech/teams" -u "$(grep -E '^ADMIN_(USER|NAME)=' .env.example | head -1 | cut -d= -f2):$(grep -E '^ADMIN_PASS' .env.example | head -1 | cut -d= -f2)" | head -c 1500; echo; grep -E '^[A-Z_]+=' .env.example | cut -d= -f1
```

8. `Bash`
```bash
U=$(grep ^ADMIN_USER= .env.example|cut -d= -f2); P=$(grep ^ADMIN_PASSWORD= .env.example|cut -d= -f2); curl -s "http://localhost:3300/api/v1/orgs/novatech/members?limit=50" -u "$U:$P" | grep -o '"login":"[^"]*"' | wc -l; curl -s "http://localhost:3300/api/v1/orgs/novatech/teams?limit=50" -u "$U:$P" | grep -o '"name":"[^"]*"' | tr '\n' ' '
```


เวลา 54.2 วินาที · 9 turns
