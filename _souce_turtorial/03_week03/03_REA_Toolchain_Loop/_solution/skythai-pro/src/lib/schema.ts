// Database schema (based on EXPLORATION.md part D). Idempotent: safe to run on every start.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS snapshots (
  id                    SERIAL PRIMARY KEY,
  route                 TEXT NOT NULL,
  travel_date           DATE NOT NULL,
  captured_at           TIMESTAMPTZ NOT NULL,
  source                TEXT NOT NULL,
  caveat                TEXT,
  best_count            INT NOT NULL,
  other_count           INT NOT NULL,
  more_not_embedded     INT,
  price_min_thb         INT,
  price_max_thb         INT,
  layover_min_min       INT,
  layover_max_min       INT,
  duration_min_min      INT,
  duration_max_min      INT
);

CREATE TABLE IF NOT EXISTS airports (
  code           CHAR(3) PRIMARY KEY,
  name_th        TEXT,
  city_th        TEXT,
  utc_offset_min INT
);

CREATE TABLE IF NOT EXISTS alliances (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS airlines (
  code           TEXT PRIMARY KEY,
  name_th        TEXT NOT NULL,
  alliance_code  TEXT REFERENCES alliances(code),
  baggage_url    TEXT,
  assistance_url TEXT
);

CREATE TABLE IF NOT EXISTS connecting_airports (
  snapshot_id  INT REFERENCES snapshots(id) ON DELETE CASCADE,
  airport_code CHAR(3) REFERENCES airports(code),
  PRIMARY KEY (snapshot_id, airport_code)
);

-- one row per itinerary ("เที่ยวบิน")
CREATE TABLE IF NOT EXISTS flights (
  id                  SERIAL PRIMARY KEY,
  snapshot_id         INT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  result_group        TEXT NOT NULL CHECK (result_group IN ('best','other')),
  rank_in_group       INT NOT NULL,
  display_order       INT NOT NULL,
  price_thb           INT NOT NULL CHECK (price_thb > 0),
  cabin               TEXT NOT NULL DEFAULT 'economy',
  origin              CHAR(3) NOT NULL REFERENCES airports(code),
  destination         CHAR(3) NOT NULL REFERENCES airports(code),
  depart_date         DATE NOT NULL,
  depart_time         TIME NOT NULL,
  arrive_date         DATE NOT NULL,
  arrive_time         TIME NOT NULL,
  total_duration_min  INT NOT NULL,
  stops               INT NOT NULL,
  co2_g               INT,
  co2_typical_g       INT,
  co2_lowest_g        INT,
  co2_pct             INT,
  co2_level           SMALLINT,
  co2_label           TEXT
);
CREATE INDEX IF NOT EXISTS flights_route_idx ON flights (origin, destination);
ALTER TABLE flights ADD COLUMN IF NOT EXISTS flight_key TEXT;

CREATE TABLE IF NOT EXISTS flight_airlines (
  flight_id    INT REFERENCES flights(id) ON DELETE CASCADE,
  position     INT NOT NULL,
  airline_code TEXT NOT NULL REFERENCES airlines(code),
  PRIMARY KEY (flight_id, position)
);

-- one row per flown segment ("ขาบิน")
CREATE TABLE IF NOT EXISTS flight_legs (
  id               SERIAL PRIMARY KEY,
  flight_id        INT NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  seq              INT NOT NULL,
  flight_number    TEXT NOT NULL,
  carrier_code     TEXT NOT NULL REFERENCES airlines(code),
  operated_by      TEXT,
  from_airport     CHAR(3) NOT NULL REFERENCES airports(code),
  to_airport       CHAR(3) NOT NULL REFERENCES airports(code),
  depart_local     TIMESTAMP NOT NULL,
  arrive_local     TIMESTAMP NOT NULL,
  depart_at        TIMESTAMPTZ NOT NULL,
  arrive_at        TIMESTAMPTZ NOT NULL,
  duration_min     INT NOT NULL,
  aircraft         TEXT,
  aircraft_code    TEXT,
  legroom          TEXT,
  co2_g            INT,
  UNIQUE (flight_id, seq)
);

CREATE TABLE IF NOT EXISTS layovers (
  flight_id         INT REFERENCES flights(id) ON DELETE CASCADE,
  seq               INT NOT NULL,
  duration_min      INT NOT NULL,
  airport_code      CHAR(3) NOT NULL REFERENCES airports(code),
  change_airport_to CHAR(3),
  PRIMARY KEY (flight_id, seq)
);

CREATE TABLE IF NOT EXISTS price_insights (
  snapshot_id    INT PRIMARY KEY REFERENCES snapshots(id) ON DELETE CASCADE,
  lowest_now_thb INT NOT NULL,
  typical_low    INT NOT NULL,
  typical_high   INT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_history (
  snapshot_id INT REFERENCES snapshots(id) ON DELETE CASCADE,
  observed_on DATE NOT NULL,
  price_thb   INT NOT NULL,
  PRIMARY KEY (snapshot_id, observed_on)
);

CREATE TABLE IF NOT EXISTS cheaper_dates (
  snapshot_id INT REFERENCES snapshots(id) ON DELETE CASCADE,
  travel_date DATE NOT NULL,
  price_thb   INT NOT NULL,
  PRIMARY KEY (snapshot_id, travel_date)
);

-- v3 (EXPLORATION F): every FlightsFrontendService request of the captured journey.
-- F2/F3/F4: initial (22) → "ดูเที่ยวบินเพิ่มเติม" (300, one response) → "บินตรงเท่านั้น" (18, server-side)
CREATE TABLE IF NOT EXISTS search_steps (
  snapshot_id      INT REFERENCES snapshots(id) ON DELETE CASCADE,
  step             TEXT NOT NULL,           -- initial | more_flights | nonstop_filter
  har_ordinal      INT,
  stops_filter     INT NOT NULL DEFAULT 0,  -- raw f.req value (0 = any, 1 = nonstop)
  best_count       INT NOT NULL,
  other_count      INT NOT NULL,
  not_loaded_count INT,
  lowest_now_thb   INT,
  typical_low      INT,                     -- F7: the typical range depends on the query
  typical_high     INT,
  reference_thb    INT,                     -- F8: [2] (inferred reference price)
  level_code       INT,
  PRIMARY KEY (snapshot_id, step)
);

-- in which request each itinerary appeared, its group/rank and price there
CREATE TABLE IF NOT EXISTS flight_appearances (
  flight_id     INT REFERENCES flights(id) ON DELETE CASCADE,
  step          TEXT NOT NULL,
  result_group  TEXT NOT NULL,
  rank_in_group INT NOT NULL,
  price_thb     INT NOT NULL,
  PRIMARY KEY (flight_id, step)
);

-- F15: filter lists come from the full 300-flight response, not only from the flights shown
CREATE TABLE IF NOT EXISTS snapshot_airlines (
  snapshot_id  INT REFERENCES snapshots(id) ON DELETE CASCADE,
  airline_code TEXT REFERENCES airlines(code),
  position     INT NOT NULL,
  PRIMARY KEY (snapshot_id, airline_code)
);

-- F9: GetBookingResults — sellers for one itinerary (no click-out tokens are stored)
CREATE TABLE IF NOT EXISTS booking_options (
  flight_id      INT REFERENCES flights(id) ON DELETE CASCADE,
  position       INT NOT NULL,
  seller_code    TEXT NOT NULL,
  seller_name    TEXT NOT NULL,
  is_airline     BOOLEAN NOT NULL,
  price_thb      INT NOT NULL,
  extra_fee_thb  INT,
  display_domain TEXT,
  PRIMARY KEY (flight_id, position)
);

-- F7: typical range on the booking page is computed for the selected itinerary
CREATE TABLE IF NOT EXISTS booking_insights (
  flight_id     INT PRIMARY KEY REFERENCES flights(id) ON DELETE CASCADE,
  typical_low   INT NOT NULL,
  typical_high  INT NOT NULL,
  reference_thb INT,
  lowest_now_thb INT
);

-- "การจอง" — mock bookings, no payment
CREATE TABLE IF NOT EXISTS bookings (
  id               SERIAL PRIMARY KEY,
  booking_ref      CHAR(6) NOT NULL UNIQUE,
  flight_id        INT NOT NULL REFERENCES flights(id),
  travel_date      DATE NOT NULL,
  trip_type        TEXT NOT NULL DEFAULT 'oneway',
  cabin            TEXT NOT NULL DEFAULT 'economy',
  adults           INT NOT NULL CHECK (adults BETWEEN 1 AND 9),
  children         INT NOT NULL DEFAULT 0 CHECK (children >= 0),
  infants_seat     INT NOT NULL DEFAULT 0 CHECK (infants_seat >= 0),
  infants_lap      INT NOT NULL DEFAULT 0 CHECK (infants_lap >= 0),
  contact_name     TEXT NOT NULL CHECK (length(trim(contact_name)) >= 2),
  contact_email    TEXT NOT NULL CHECK (contact_email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'),
  price_per_seat   INT NOT NULL,
  total_price_thb  INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'CONFIRMED_MOCK',
  seller_name      TEXT,
  data_captured_at TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (infants_lap <= adults),                                        -- C2
  CHECK (adults + children + infants_seat + infants_lap <= 9)           -- C3
);
`;
