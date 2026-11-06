# 🏗️ Design — ข้าวไหนดี (lunch-draw)

ออกแบบจาก `02_REQUIREMENTS.md` มี 5 แผนภาพ ทุกภาพเขียนด้วย Mermaid (GitHub และ VS Code แสดงผลได้เลย) และแยกเป็นไฟล์ไว้ใน `03_design/` ด้วย

| # | แผนภาพ | ตอบคำถาม | ไฟล์ |
|---|---|---|---|
| 1 | Architecture | ระบบมีชิ้นส่วนอะไร คุยกันอย่างไร | `03_design/01-architecture.mmd` |
| 2 | Use Case | ใครทำอะไรกับระบบได้บ้าง | `03_design/02-use-case.mmd` |
| 3 | Flowchart | สุ่มร้านหนึ่งครั้ง ระบบคิดอะไรตามลำดับ | `03_design/03-flowchart-draw.mmd` |
| 4 | ERD | เก็บข้อมูลอะไร เชื่อมกันอย่างไร | `03_design/04-erd.mmd` |
| 5 | Sequence | ในห้อง โหวตและสุ่มร้านแล้วทุกจอเห็นพร้อมกันได้อย่างไร | `03_design/05-sequence-room.mmd` |

---

## 1. Architecture

```mermaid
flowchart LR
  subgraph Browser["เบราว์เซอร์ (มือถือ / คอม)"]
    UI["หน้าเว็บ React<br/>lunch-app · odds-board · odds-map"]
    LS[("localStorage<br/>โหวต ตัวกรอง rater id")]
    ODDS_C["odds.ts<br/>คิด % ให้กระดาน"]
    UI --- LS
    UI --- ODDS_C
  end

  subgraph Server["Next.js 16 · Node process เดียว"]
    PAGES["App Router pages<br/>/ · /room/[code] · /history<br/>/restaurants/new · /categories"]
    API["Route Handlers /api/*<br/>draw · rooms · restaurants<br/>categories · draws · events"]
    ODDS_S["odds.ts<br/>คิด % + สุ่ม (crypto)"]
    STORE["store.ts<br/>ข้อมูลในหน่วยความจำ<br/>+ EventEmitter"]
    API --> ODDS_S
    API --> STORE
    PAGES --> STORE
  end

  subgraph Disk["data/ (ไฟล์ JSON)"]
    R[("restaurants.json")]
    C[("categories.json")]
    RT[("ratings.json")]
    S[("state.json<br/>ห้อง โหวต ผลการสุ่ม")]
  end

  subgraph External["บริการฟรีภายนอก"]
    OSM["OpenStreetMap<br/>(ดึงร้าน ตอน data:fetch)"]
    OSRM["routing.openstreetmap.de<br/>ระยะเดินจริง"]
    CARTO["CARTO tiles<br/>แผนที่พื้นหลัง"]
    GMAPS["Google Maps<br/>ลิงก์นำทาง"]
  end

  UI -- "fetch JSON" --> API
  API -- "SSE /api/events<br/>room · restaurants · categories" --> UI
  STORE -- "เขียน atomic<br/>tmp + rename" --> Disk
  Disk -- "อ่านตอนเริ่ม / ไฟล์เปลี่ยน" --> STORE
  API -. "เพิ่มร้าน (timeout 4 วิ)" .-> OSRM
  UI -. "tiles" .-> CARTO
  UI -. "ลิงก์" .-> GMAPS
  OSM -. "scripts/fetch-osm.ts" .-> R
```

**การตัดสินใจหลัก**

| เรื่อง | เลือก | เหตุผล | แลกกับ |
|---|---|---|---|
| ที่เก็บข้อมูล | ไฟล์ JSON ใน `data/` | ไม่ต้องดูแล database · commit ข้อมูลร้านลง git ได้ (NFR-07) | ต้องรันเป็น process เดียว · ไม่รองรับ Vercel |
| Realtime | Server-Sent Events | ทางเดียวพอ (server → จอ) · ไม่ต้องติดตั้งอะไรเพิ่ม | ต้องต่อค้างไว้ · ส่ง ping ทุก 20 วิ |
| สูตรโอกาส | ไฟล์เดียว `odds.ts` ใช้ทั้ง client และ server | % ที่เห็นตรงกับที่ใช้สุ่ม (NFR-05) | client ต้องได้ข้อมูลเหมือน server ทุกครั้ง |
| การสุ่ม | ทำที่ server เท่านั้น | ทุกคนในห้องเห็นผลเดียวกัน (NFR-04) | ต้องมีเน็ตถึง server |
| ตัวตน | ไม่มี login · ชื่อเล่นในห้อง · `rater` id สุ่มในเบราว์เซอร์ | ทีมไม่อยากสมัคร (สัมภาษณ์ข้อ 10) | ใครก็แก้ข้อมูลได้ (Q3) |
| แผนที่ | MapLibre + CARTO | ฟรี ไม่ต้องมี key (NFR-13) | ถ้าโหลด tiles ไม่ได้ ต้องยังวางหมุดได้ |

## 2. Use Case

```mermaid
flowchart LR
  hungry(["🍜 คนหิว"])
  host(["👥 คนเปิดห้อง"])
  member(["🙋 สมาชิกห้อง"])
  editor(["🛠️ คนดูแลข้อมูลร้าน"])
  tester(["🧪 ผู้ทดสอบ"])

  subgraph System["ข้าวไหนดี"]
    UC1(["ดูโอกาสของแต่ละร้าน / แผนที่"])
    UC2(["โหวตประเภทอาหาร"])
    UC3(["โหวตร้าน"])
    UC4(["ตั้งตัวกรอง<br/>ขี้เกียจเดิน · ราคา"])
    UC5(["สุ่มร้าน"])
    UC6(["บันทึกว่าไปกินแล้ว"])
    UC7(["ให้คะแนนร้าน"])
    UC8(["ดูประวัติ / แชมป์"])
    UC9(["สร้างห้อง"])
    UC10(["เข้าห้องด้วยชื่อเล่น"])
    UC11(["แก้ข้อมูลร้าน / ปิดร้าน"])
    UC12(["เพิ่ม / ลบร้านเอง"])
    UC13(["จัดการประเภทอาหาร"])
    UC14(["ล้างข้อมูลทดสอบ"])
  end

  hungry --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8
  host --> UC9
  host --> UC10
  member --> UC10
  member --> UC2 & UC3 & UC4 & UC5
  editor --> UC11 & UC12 & UC13
  tester --> UC14

  UC5 -. "include" .-> UC1
  UC6 -. "extend" .-> UC5
  UC7 -. "extend" .-> UC5
  UC9 -. "include" .-> UC10
```

> คนเปิดห้องก็คือสมาชิกคนแรก ทุกคนในห้องมีสิทธิ์เท่ากัน (ใครกดสุ่มร้านก็ได้) และทุกคนเป็น "คนดูแลข้อมูลร้าน" ได้เพราะไม่มี login

## 3. Flowchart — สุ่มร้านหนึ่งครั้ง (`POST /api/draw`)

```mermaid
flowchart TD
  A([กด สุ่มร้าน]) --> B{มี roomCode?}
  B -- มี --> C{ห้องมีอยู่?}
  C -- ไม่มี --> X1[/404 room not found/]
  C -- มี --> D[ใช้ตัวกรอง โหวตแนว โหวตร้าน<br/>ของห้อง]
  B -- ไม่มี --> E[ใช้ค่าจากเบราว์เซอร์<br/>บีบโหวตให้อยู่ใน -1 ถึง +1]
  D --> F[โหลดร้านทั้งหมด + กินล่าสุดใน 7 วัน<br/>+ คะแนนเฉลี่ย]
  E --> F
  F --> G[/ตัดร้านที่: ปิด · เดินเกิน 500 ม. ถ้าขี้เกียจเดิน<br/>· ราคาไม่อยู่ในช่วงที่เลือก/]
  G --> H[คิดน้ำหนักทีละร้าน<br/>ฐาน × แนว × ร้าน × กินแล้ว × ระยะ × คะแนน]
  H --> I[โอกาส = น้ำหนัก ÷ ผลรวม]
  I --> J{เหลือร้านน้ำหนัก > 0?}
  J -- ไม่ --> X2[/409 ไม่มีร้านให้สุ่ม/]
  J -- ใช่ --> K[สุ่มเลข crypto 0–1<br/>× ผลรวม แล้วไล่ลบทีละร้าน]
  K --> L[บันทึก Draw ลง state.json<br/>เก็บ 1,000 ครั้งล่าสุด]
  L --> M{เป็นห้อง?}
  M -- ใช่ --> N[ส่ง event room ให้ทุกจอในห้อง]
  M -- ไม่ --> O
  N --> O[/201 + ร้าน + โอกาส/]
  O --> P([การ์ดผล: ชื่อ ระยะ เวลาเดิน<br/>Google Maps · ไปกินร้านนี้ · ให้คะแนน])
```

## 4. ERD — ข้อมูลในไฟล์ JSON

```mermaid
erDiagram
  RESTAURANT {
    int number PK "เลขร้าน / id"
    string osmId "node/… หรือ manual/…"
    string name
    string nameEn
    float lat
    float lon
    int distance "ม. เส้นตรงจากออฟฟิศ"
    int walkDistance "ม. เดินจริง (null ได้)"
    string openingHours
    string_array categories FK
    float baseWeight "0.5–5 ค่าเริ่ม 1"
    string nickname "≤40"
    int priceLevel "1–4 หรือ null"
    bool disabled
  }
  CATEGORY {
    string id PK "noodle · c-xxxxxxxx"
    string label "≤30 ห้ามซ้ำ"
  }
  RATING {
    int restaurantId FK
    string rater PK "id สุ่มในเบราว์เซอร์"
    int score "1–4"
    string name "ชื่อเล่น ≤24"
    datetime at
  }
  ROOM {
    string code PK "4 ตัว"
    bool lazyMode
    int_array prices
    datetime createdAt
    datetime updatedAt "ไม่ขยับ 3 วัน = ลบ"
  }
  MEMBER {
    string id PK
    string nickname "≤24 ซ้ำในห้อง = คนเดิม"
    datetime createdAt
  }
  VOTE {
    string memberId FK
    string categoryId FK
    int value "-1 หรือ +1"
  }
  RESTAURANT_VOTE {
    string memberId FK
    int restaurantId FK
    int value "-1 หรือ +1"
  }
  DRAW {
    string id PK
    string roomCode FK "null = คนเดียว"
    int restaurantId FK
    float probability
    bool lazyMode
    datetime createdAt
    datetime eatenAt "null = ยังไม่ยืนยัน"
  }

  CATEGORY ||--o{ RESTAURANT : "จัดแนว (หลายต่อหลาย ผ่าน categories[])"
  RESTAURANT ||--o{ RATING : "ได้คะแนน"
  ROOM ||--o{ MEMBER : "มีสมาชิก"
  ROOM ||--o{ VOTE : "เก็บโหวตแนว"
  ROOM ||--o{ RESTAURANT_VOTE : "เก็บโหวตร้าน"
  MEMBER ||--o{ VOTE : "โหวต"
  MEMBER ||--o{ RESTAURANT_VOTE : "โหวต"
  CATEGORY ||--o{ VOTE : "ถูกโหวต"
  RESTAURANT ||--o{ RESTAURANT_VOTE : "ถูกโหวต"
  RESTAURANT ||--o{ DRAW : "ถูกสุ่มได้"
  ROOM |o--o{ DRAW : "สุ่มในห้อง"
```

| ไฟล์ | Entity | อยู่ใน git |
|---|---|---|
| `data/restaurants.json` | RESTAURANT | ✅ |
| `data/categories.json` | CATEGORY | ✅ |
| `data/ratings.json` | RATING | ✅ |
| `data/state.json` | ROOM (+ MEMBER, VOTE, RESTAURANT_VOTE ฝังใน room) · DRAW | ❌ gitignore |

ข้อมูลที่ **คำนวณ ไม่ได้เก็บ**: `lastEatenAt` (จาก DRAW), `ratingAvg` / `ratingCount` (จาก RATING), `manual` (จาก `osmId`), จำนวนร้านต่อแนว, คะแนนสุทธิของห้อง

## 5. Sequence — ห้อง: เข้าห้อง โหวต สุ่มร้าน

```mermaid
sequenceDiagram
  autonumber
  actor Ton as ต้น (เปิดห้อง)
  actor Mew as มิว
  participant API as Next.js API
  participant Store as store.ts (+EventEmitter)
  participant Disk as state.json

  Ton->>API: POST /api/rooms {lazyMode, prices}
  API->>Store: createRoom(code)
  Store->>Disk: เขียน atomic
  API-->>Ton: 201 {code: "K7PQ"}
  Ton->>API: POST /api/rooms/K7PQ/members {nickname:"ต้น"}
  API-->>Ton: 201 {id: m1}
  Ton->>API: GET /api/events?room=K7PQ (SSE ค้างไว้)
  API-->>Ton: event restaurants + event room (สถานะปัจจุบัน)

  Mew->>API: เปิดลิงก์ /room/K7PQ → POST members {nickname:"มิว"}
  API->>Store: updateRoom → emit room
  Store-->>API: change
  API-->>Ton: event room (2 คนในห้อง)
  Mew->>API: GET /api/events?room=K7PQ
  API-->>Mew: event restaurants + event room

  par โหวตพร้อมกัน
    Ton->>API: PUT votes {m1, isan, +1}
  and
    Mew->>API: PUT votes {m2, isan, +1}
  end
  API->>Store: updateRoom ×2 → persist ทีละครั้ง
  API-->>Ton: event room (isan +2 ×2.0)
  API-->>Mew: event room (isan +2 ×2.0)

  Ton->>API: POST /api/draw {roomCode:"K7PQ"}
  API->>Store: roomState → computeOdds → pick(crypto)
  Store->>Disk: บันทึก Draw
  API-->>Ton: 201 {restaurantId: 46, probability}
  API-->>Mew: event room (latestDraw = 46)
  Note over Ton,Mew: ทั้งสองจอแสดงการ์ดผลร้าน #46 ภายใน 3 วินาที (NFR-03)

  Mew->>API: PATCH /api/draws/{id} {eaten:true}
  API->>Store: setEaten → emit restaurants
  API-->>Ton: event restaurants (ร้าน #46 ×0.2)
  API-->>Mew: event restaurants
```

---

## 6. หน้าจอและ API

| หน้า | ใช้ทำอะไร | API ที่เรียก |
|---|---|---|
| `/` | สุ่มคนเดียว: กระดาน / แผนที่ โหวต ตัวกรอง สุ่มร้าน | `GET /api/restaurants`, `POST /api/draw`, `PATCH /api/draws/:id`, `PUT …/rating`, `PATCH /api/restaurants/:id`, SSE |
| `/room/[code]` | เหมือนหน้าแรก แต่โหวตและตัวกรองเป็นของห้อง | `+ /api/rooms/:code`, `…/members`, `…/votes`, SSE `?room=` |
| `/history` | ผลล่าสุด 30 รายการ + แชมป์ 7 วัน | อ่านจาก store ตอน render |
| `/restaurants/new` | เพิ่มร้านเอง | `POST /api/restaurants` |
| `/categories` | จัดการประเภทอาหาร | `/api/categories`, `/api/categories/:id` |

| Method | Path | สำเร็จ | ผิดพลาด |
|---|---|---|---|
| GET | `/api/restaurants` | 200 `{restaurants, categories}` | |
| POST | `/api/restaurants` | 201 `{number, distance, walkDistance}` | 400 |
| PATCH / DELETE | `/api/restaurants/:id` | 200 `{ok}` | 400 · 404 · 409 (ลบร้าน OSM) |
| PUT | `/api/restaurants/:id/rating` | 200 `{ok}` | 400 · 404 |
| GET / POST | `/api/categories` | 200 / 201 | 400 · 409 |
| PATCH / DELETE | `/api/categories/:id` | 200 | 400 · 404 · 409 |
| POST | `/api/draw` | 201 `{id, restaurantId, probability, …}` | 404 (ห้อง) · 409 (ไม่มีร้าน) |
| PATCH | `/api/draws/:id` | 200 | 400 · 404 |
| POST | `/api/rooms` | 201 `{code}` | |
| GET / PATCH | `/api/rooms/:code` | 200 room state | 400 · 404 |
| POST | `/api/rooms/:code/members` | 201 `{id, nickname}` | 400 · 404 |
| PUT | `/api/rooms/:code/votes` | 200 room state | 400 · 404 |
| GET | `/api/events[?room=]` | 200 `text/event-stream` | |
| POST | `/api/test/reset` | 200 `{restaurants}` | 404 ถ้าไม่ใช่ `LUNCH_TEST=1` |
