-- สบายใจ สปา · schema ตาม DESIGN.md ข้อ 4
-- เงินเป็น NUMERIC ทั้งหมด ไม่ใช้ float · ระยะและรอบเอว NUMERIC(4,1)

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'OWNER')),
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  birth_date     DATE,
  lifetime_spend NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (lifetime_spend >= 0),
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0)
);

CREATE TABLE services (
  id               CHAR(3) PRIMARY KEY,
  kind             TEXT NOT NULL CHECK (kind IN ('SERVICE', 'PACKAGE', 'COURSE')),
  name_th          TEXT NOT NULL,
  name_en          TEXT NOT NULL,
  name_zh          TEXT NOT NULL,
  duration_minutes SMALLINT NOT NULL CHECK (duration_minutes IN (60, 90, 120)),
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_path       TEXT NOT NULL,
  sort_order       SMALLINT NOT NULL
);

CREATE TABLE herbs (
  id         SERIAL PRIMARY KEY,
  name_th    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  name_zh    TEXT NOT NULL,
  image_path TEXT NOT NULL
);

CREATE TABLE service_herbs (
  service_id CHAR(3) NOT NULL REFERENCES services(id),
  herb_id    INTEGER NOT NULL REFERENCES herbs(id),
  PRIMARY KEY (service_id, herb_id)
);

-- ตำแหน่งเก็บ 3 ภาษาตาม TD-14 (ERD เดิมมี title ช่องเดียว ซึ่งจะขัด NFR-07)
CREATE TABLE therapists (
  id         CHAR(3) PRIMARY KEY,
  name_th    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  name_zh    TEXT NOT NULL,
  title_th   TEXT NOT NULL,
  title_en   TEXT NOT NULL,
  title_zh   TEXT NOT NULL,
  photo_path TEXT NOT NULL
);

CREATE TABLE therapist_services (
  therapist_id CHAR(3) NOT NULL REFERENCES therapists(id),
  service_id   CHAR(3) NOT NULL REFERENCES services(id),
  PRIMARY KEY (therapist_id, service_id)
);

CREATE TABLE therapist_reviews (
  id           SERIAL PRIMARY KEY,
  therapist_id CHAR(3) NOT NULL REFERENCES therapists(id),
  stars        SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5)
);

CREATE TABLE hotels (
  id          CHAR(3) PRIMARY KEY,
  name_th     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  name_zh     TEXT NOT NULL,
  distance_km NUMERIC(4,1) NOT NULL CHECK (distance_km >= 0)
);

CREATE TABLE course_purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  service_id        CHAR(3) NOT NULL REFERENCES services(id),
  price_paid        NUMERIC(10,2) NOT NULL CHECK (price_paid > 0),
  total_sessions    SMALLINT NOT NULL,
  used_sessions     SMALLINT NOT NULL DEFAULT 0,
  reserved_sessions SMALLINT NOT NULL DEFAULT 0,
  purchased_on      DATE NOT NULL,
  expires_on        DATE NOT NULL,
  payment_status    TEXT NOT NULL DEFAULT 'SIMULATED' CHECK (payment_status = 'SIMULATED'),
  CONSTRAINT course_sessions_ok CHECK (
    used_sessions >= 0 AND reserved_sessions >= 0
    AND used_sessions + reserved_sessions <= total_sessions
  )
);

CREATE TABLE gift_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  buyer_user_id    UUID REFERENCES users(id),
  design           TEXT NOT NULL CHECK (design IN ('ORCHID', 'LOTUS', 'GOLD')),
  initial_value    NUMERIC(10,2) NOT NULL
                   CHECK (initial_value BETWEEN 500 AND 10000 AND initial_value = trunc(initial_value)),
  balance          NUMERIC(10,2) NOT NULL,
  purchased_on     DATE NOT NULL,
  expires_on       DATE NOT NULL,
  delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('LINE', 'EMAIL')),
  recipient        TEXT,
  message          TEXT,
  payment_status   TEXT NOT NULL DEFAULT 'SIMULATED' CHECK (payment_status = 'SIMULATED'),
  CONSTRAINT gift_card_balance_ok CHECK (balance >= 0 AND balance <= initial_value)
);

CREATE TABLE bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code       TEXT NOT NULL UNIQUE,
  user_id            UUID REFERENCES users(id),
  guest_name         TEXT,
  guest_phone        TEXT,
  service_id         CHAR(3) NOT NULL REFERENCES services(id),
  booking_type       TEXT NOT NULL CHECK (booking_type IN ('SINGLE', 'COUPLE', 'GROUP')),
  party_size         SMALLINT NOT NULL CHECK (party_size BETWEEN 1 AND 6),
  start_at           TIMESTAMPTZ NOT NULL,
  end_at             TIMESTAMPTZ NOT NULL,
  period             TSTZRANGE GENERATED ALWAYS AS (tstzrange(start_at, end_at, '[)')) STORED,
  is_couple_suite    BOOLEAN NOT NULL DEFAULT false,
  status             TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'COMPLETED', 'CANCELLED')),
  full_price         NUMERIC(10,2) NOT NULL CHECK (full_price >= 0),
  discount_percent   SMALLINT NOT NULL DEFAULT 0 CHECK (discount_percent IN (0, 5, 10, 20)),
  discount_source    TEXT NOT NULL DEFAULT 'NONE' CHECK (discount_source IN ('NONE', 'TIER', 'GROUP', 'BIRTHDAY')),
  discount_amount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  points_redeemed    INTEGER NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0 AND points_redeemed % 100 = 0),
  points_discount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (points_discount >= 0),
  service_net        NUMERIC(10,2) NOT NULL CHECK (service_net >= 0),
  hotel_id           CHAR(3) REFERENCES hotels(id),
  distance_km        NUMERIC(4,1) CHECK (distance_km >= 0),
  cars               SMALLINT NOT NULL DEFAULT 0 CHECK (cars >= 0),
  transport_fee      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (transport_fee >= 0),
  gift_card_id       UUID REFERENCES gift_cards(id),
  gift_card_amount   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (gift_card_amount >= 0),
  pay_at_shop        NUMERIC(10,2) NOT NULL CHECK (pay_at_shop >= 0),
  course_purchase_id UUID REFERENCES course_purchases(id),
  points_earned      INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL,
  CONSTRAINT booking_period_ok CHECK (end_at > start_at),
  CONSTRAINT booking_type_matches_party CHECK (
    (booking_type = 'SINGLE' AND party_size = 1)
    OR (booking_type = 'COUPLE' AND party_size = 2)
    OR (booking_type = 'GROUP' AND party_size BETWEEN 3 AND 6)
  ),
  CONSTRAINT booking_has_owner CHECK (
    user_id IS NOT NULL OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
  ),
  -- Couple Suite มี 1 ห้อง (BR-06, BR-07)
  CONSTRAINT no_overlap_couple_suite
    EXCLUDE USING gist (period WITH &&)
    WHERE (is_couple_suite AND status <> 'CANCELLED')
);

CREATE INDEX bookings_user_idx ON bookings (user_id);
CREATE INDEX bookings_start_idx ON bookings (start_at);

CREATE TABLE booking_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  person_no    SMALLINT NOT NULL CHECK (person_no BETWEEN 1 AND 6),
  therapist_id CHAR(3) NOT NULL REFERENCES therapists(id),
  period       TSTZRANGE NOT NULL,
  slot_active  BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (booking_id, person_no),
  -- นักบำบัด 1 คนรับได้ 1 คิว (BR-05) · [ ) ทำให้ 14:00–15:00 ต่อ 15:00–16:00 ได้
  CONSTRAINT no_overlap_therapist
    EXCLUDE USING gist (therapist_id WITH =, period WITH &&)
    WHERE (slot_active)
);

CREATE TABLE gift_card_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id),
  booking_id   UUID REFERENCES bookings(id),
  type         TEXT NOT NULL CHECK (type IN ('REDEEM', 'REFUND')),
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  created_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE point_transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  type       TEXT NOT NULL CHECK (type IN ('EARN', 'REDEEM', 'REFUND')),
  points     INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE birthday_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  benefit_year SMALLINT NOT NULL,
  booking_id   UUID REFERENCES bookings(id),
  released_at  TIMESTAMPTZ
);

-- คืนสิทธิ์แล้วใช้ใหม่ได้ แต่ใช้ซ้อนในปีเดียวกันไม่ได้ (BR-26, BR-27)
CREATE UNIQUE INDEX one_birthday_per_year
  ON birthday_redemptions (user_id, benefit_year)
  WHERE released_at IS NULL;

CREATE TABLE waist_measurements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  measured_on DATE NOT NULL,
  waist_cm    NUMERIC(4,1) NOT NULL CHECK (waist_cm > 0)
);

-- เฉพาะรูปร่างกายที่ไม่เห็นหน้า (FR-46) · ไม่มีตารางสำหรับเซลฟี่ (FR-74, NFR-08)
CREATE TABLE before_after_photos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id),
  kind      TEXT NOT NULL CHECK (kind IN ('BEFORE', 'AFTER')),
  taken_on  DATE NOT NULL,
  file_path TEXT NOT NULL
);
