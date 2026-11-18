import pathlib,shutil,json,hashlib
root=pathlib.Path('/workspace/rea-flight-v4'); m=root/'mutants'; base=m/'base'
mutations=[
('M01','เรียงราคาจากแพงไปถูก','Results.tsx','case "price": return by((f) => f.price);','case "price": return by((f) => -f.price);'),
('M02','ปิดการกรองจำนวนครั้งที่แวะพัก','filters.ts','if (x.stops !== "any" && f.stops > Number(x.stops)) return false;','// mutation: stops filter disabled'),
('M03','แสดงจำนวนผลลัพธ์ขาด 1','Results.tsx','มีผลลัพธ์ {filtered.length} รายการ','มีผลลัพธ์ {Math.max(0, filtered.length - 1)} รายการ'),
('M04','โหลดเพิ่มเติมได้สูงสุด 299 เที่ยวบิน','Results.tsx','const visible = sorted;','const visible = loadedAll ? sorted.slice(0, 299) : sorted;'),
('M05','ราคาเพดานใช้ < แทน ≤','filters.ts','total(f.price) > x.maxPrice','total(f.price) >= x.maxPrice'),
('M06','เวลาออกที่แสดงในรายการเลื่อน 1 ชั่วโมง','FlightRow.tsx','{f.departTime} – {f.arriveTime}','{String((Number(f.departTime.slice(0, 2)) + 1) % 24).padStart(2, "0") + f.departTime.slice(2)} – {f.arriveTime}'),
('M07','ปิดตัวกรองสายการบิน','filters.ts','if (x.airlines && !f.airlines.every((a) => x.airlines!.includes(a.code))) return false;','// mutation: airline filter disabled'),
('M08','ปิดตัวกรองเวลาออกเดินทาง','filters.ts','if (!inHours(f.departTime, x.dep) || !inHours(f.arriveTime, x.arr)) return false;','if (!inHours(f.arriveTime, x.arr)) return false;'),
('M09','ปิดตัวกรองระยะเวลาเดินทางสูงสุด','filters.ts','if (x.maxDurationH !== null && f.durationMin > x.maxDurationH * 60) return false;','// mutation: duration filter disabled'),
('M10','รายละเอียดแสดงหมายเลขเที่ยวบินผิดทุกขา','FlightRow.tsx','<b>{l.flightNumber}</b>','<b>XX000</b>'),
]
for mid,desc,file,old,new in mutations:
 dst=m/mid
 shutil.copytree(base,dst,ignore=shutil.ignore_patterns('.next','node_modules','loop'),dirs_exist_ok=True)
 p=dst/'src/components'/file; s=p.read_text(); assert s.count(old)==1,(mid,s.count(old)); p.write_text(s.replace(old,new))
 # Explicit, isolated Compose project; source compose and base remain untouched.
for name in ['base']+[v[0] for v in mutations]:
 (m/name/'mutation-compose.yml').write_text('''services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: skythai
      POSTGRES_PASSWORD: skythai
      POSTGRES_DB: skythai
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U skythai -d skythai"]
      interval: 2s
      timeout: 3s
      retries: 30
  web:
    build: .
    environment:
      DATABASE_URL: postgres://skythai:skythai@db:5432/skythai
    ports: ["5090:5083"]
    depends_on:
      db:
        condition: service_healthy
''')
(m/'manifest.json').write_text(json.dumps([dict(id=a,bug=b,file=c,old=d,new=e) for a,b,c,d,e in mutations],ensure_ascii=False,indent=2))
files=list((root/'diff').rglob('*.mjs'))+list(pathlib.Path('/workspace/rea-flight-v3/accept').glob('*.cjs'))
(m/'test-hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},indent=2))
