// โหลด data/*.json ลง PostgreSQL ตอนเริ่ม container (รันซ้ำได้ · ลบแล้วสร้างใหม่ทุกครั้ง)
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const mins = iso => +iso.slice(11, 13) * 60 + +iso.slice(14, 16);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
for (let i = 0; ; i++) {
  try { await client.connect(); break; }
  catch (e) { if (i > 30) throw e; await new Promise(r => setTimeout(r, 1000)); }
}
const { flights, initialOrder } = read('data/flights.json');
await client.query('BEGIN');
await client.query(fs.readFileSync(path.join(root, 'db/schema.sql'), 'utf8'));
for (const [pos, f] of flights.entries()) {
  await client.query(
    `INSERT INTO flights (id,pos,popular,price,stops,dep_minutes,arr_minutes,arr_local,duration,co2_kg,co2_pct,airlines,connects,max_layover,data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [f.id, pos, f.popular, f.price.amount, f.stopCount, mins(f.departureLocal), mins(f.arrivalLocal), f.arrivalLocal,
      f.durationMinutes, f.co2e.kg, f.co2e.comparisonPercent, [...new Set(f.legs.map(l => l.airlineName))],
      f.layovers.flatMap(l => [l.arrivalAirport, l.departureAirport]).filter((c, i, a) => a.indexOf(c) === i),
      Math.max(0, ...f.layovers.map(l => l.durationMinutes)), f]);
}
for (const [pos, o] of initialOrder.entries()) {
  await client.query('INSERT INTO initial_order (pos, flight_id) VALUES ($1,$2)', [pos, flights[o.all].id]);
}
await client.query('INSERT INTO insights (id, data) VALUES (1, $1)', [read('data/insights.json')]);
const bo = read('data/booking-options.json');
await client.query('INSERT INTO booking_options (flight_numbers, data) VALUES ($1, $2)', [bo.selectedFlight, bo]);
await client.query('COMMIT');
console.log(`seed: flights ${flights.length} · initial ${initialOrder.length}`);
await client.end();
