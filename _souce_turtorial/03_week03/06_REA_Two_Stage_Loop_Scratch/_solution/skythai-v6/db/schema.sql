-- SkyThai Zero (v6) · ข้อมูลเที่ยวบินกรุงเทพมหานคร → โตเกียว 15 พ.ย. 2026 (จาก spec/data)
DROP TABLE IF EXISTS initial_order, flights, insights, booking_options;
CREATE TABLE flights (
  id            integer PRIMARY KEY,
  pos           integer NOT NULL,          -- ลำดับในรายการ 300 ใบ (3 ยอดนิยม แล้วไล่ราคา)
  popular       boolean NOT NULL,
  price         integer NOT NULL,
  stops         integer NOT NULL,
  dep_minutes   integer NOT NULL,          -- เวลาออก (นาทีจากเที่ยงคืน เวลาท้องถิ่น)
  arr_minutes   integer NOT NULL,          -- เวลาถึง (นาทีจากเที่ยงคืน เวลาท้องถิ่น)
  arr_local     text    NOT NULL,
  duration      integer NOT NULL,
  co2_kg        integer NOT NULL,
  co2_pct       integer NOT NULL,
  airlines      text[]  NOT NULL,          -- ชื่อสายการบินทุกขา
  connects      text[]  NOT NULL,          -- รหัสสนามบินที่แวะ
  max_layover   integer NOT NULL,
  data          jsonb   NOT NULL
);
CREATE TABLE initial_order (pos integer PRIMARY KEY, flight_id integer NOT NULL REFERENCES flights(id));
CREATE TABLE insights (id integer PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE booking_options (flight_numbers text PRIMARY KEY, data jsonb NOT NULL);
