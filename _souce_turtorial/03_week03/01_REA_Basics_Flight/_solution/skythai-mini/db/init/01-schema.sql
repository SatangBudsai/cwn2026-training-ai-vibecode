CREATE TABLE IF NOT EXISTS flights (
  id               SERIAL PRIMARY KEY,
  snapshot_rank    INTEGER NOT NULL,
  section          TEXT,
  airline          TEXT NOT NULL,
  operated_by      TEXT,
  flight_date      DATE NOT NULL,
  dep_time         TEXT NOT NULL,
  dep_airport_name TEXT NOT NULL,
  dep_iata         CHAR(3) NOT NULL,
  arr_time         TEXT NOT NULL,
  arr_airport_name TEXT NOT NULL,
  arr_iata         CHAR(3) NOT NULL,
  arr_next_day     BOOLEAN NOT NULL DEFAULT FALSE,
  duration_text    TEXT NOT NULL,
  duration_min     INTEGER NOT NULL,
  stops            INTEGER NOT NULL,
  layovers         JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_thb        INTEGER NOT NULL,
  captured_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  booking_code   TEXT NOT NULL UNIQUE,
  flight_id      INTEGER NOT NULL REFERENCES flights(id),
  passenger_name TEXT NOT NULL,
  email          TEXT NOT NULL,
  passengers     INTEGER NOT NULL DEFAULT 1,
  total_thb      INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'CONFIRMED_NO_PAYMENT',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
