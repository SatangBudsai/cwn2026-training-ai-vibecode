# SkyThai Max (v4)

ต่อยอดจาก SkyThai Pro (v3) ด้วยการแก้แบบรุม (swarm) ให้ตรงต้นฉบับมากขึ้นตาม DIFF-REPORT.md และ STRUCTURE.md ของ rea-flight-v4

```bash
docker compose up -d --build     # http://localhost:5091 (compose project: skythai-pipe1)
curl localhost:5091/api/health   # {"ok":true}
```

ข้อมูล โครงสร้าง และข้อจำกัดเหมือน v3 (ดู README ของ v3) ภาพโลโก้/แบรนด์ออกแบบเอง ไม่มีโลโก้หรือแบรนด์ของ Google
