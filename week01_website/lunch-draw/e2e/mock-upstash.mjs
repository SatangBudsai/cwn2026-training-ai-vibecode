// A tiny in-memory stand-in for the Upstash Redis REST API, to try Redis mode locally:
//   node e2e/mock-upstash.mjs 8079
//   KV_REST_API_URL=http://localhost:8079 KV_REST_API_TOKEN=dev npx next start -p 3400
// Supports only the commands src/lib/store.ts uses. Not for production.
import http from "node:http";

const port = Number(process.argv[2] ?? 8079);
const db = new Map(); // key -> string | Map (hash) | string[] (list)
const expiry = new Map();

const live = (k) => {
  const t = expiry.get(k);
  if (t && t < Date.now()) {
    db.delete(k);
    expiry.delete(k);
  }
  return db.get(k);
};

function run([cmd, ...a]) {
  const c = String(cmd).toUpperCase();
  switch (c) {
    case "GET":
      return live(a[0]) ?? null;
    case "SET": {
      const [k, v, ...opts] = a;
      const up = opts.map((o) => String(o).toUpperCase());
      if (up.includes("NX") && live(k) !== undefined) return null;
      db.set(k, String(v));
      const ex = up.indexOf("EX");
      if (ex >= 0) expiry.set(k, Date.now() + Number(opts[ex + 1]) * 1000);
      else expiry.delete(k);
      return "OK";
    }
    case "INCR": {
      const n = Number(live(a[0]) ?? 0) + 1;
      db.set(a[0], String(n));
      return n;
    }
    case "EXPIRE":
      if (live(a[0]) === undefined) return 0;
      expiry.set(a[0], Date.now() + Number(a[1]) * 1000);
      return 1;
    case "HSET": {
      const h = live(a[0]) instanceof Map ? live(a[0]) : new Map();
      for (let i = 1; i < a.length; i += 2) h.set(String(a[i]), String(a[i + 1]));
      db.set(a[0], h);
      return (a.length - 1) / 2;
    }
    case "HDEL": {
      const h = live(a[0]);
      if (!(h instanceof Map)) return 0;
      let n = 0;
      for (const f of a.slice(1)) n += h.delete(String(f)) ? 1 : 0;
      return n;
    }
    case "HGETALL": {
      const h = live(a[0]);
      return h instanceof Map ? [...h.entries()].flat() : [];
    }
    case "RPUSH": {
      const l = Array.isArray(live(a[0])) ? live(a[0]) : [];
      l.push(...a.slice(1).map(String));
      db.set(a[0], l);
      return l.length;
    }
    case "LRANGE": {
      const l = live(a[0]) ?? [];
      const n = l.length;
      const s = Number(a[1]) < 0 ? Math.max(0, n + Number(a[1])) : Number(a[1]);
      const e = Number(a[2]) < 0 ? n + Number(a[2]) : Number(a[2]);
      return l.slice(s, e + 1);
    }
    case "LTRIM": {
      const l = live(a[0]) ?? [];
      const n = l.length;
      const s = Number(a[1]) < 0 ? Math.max(0, n + Number(a[1])) : Number(a[1]);
      const e = Number(a[2]) < 0 ? n + Number(a[2]) : Number(a[2]);
      db.set(a[0], l.slice(s, e + 1));
      return "OK";
    }
    case "LSET": {
      const l = live(a[0]);
      l[Number(a[1])] = String(a[2]);
      return "OK";
    }
    default:
      throw new Error(`mock-upstash: unsupported ${c}`);
  }
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      try {
        const json = JSON.parse(body || "[]");
        const out = req.url.startsWith("/pipeline") || req.url.startsWith("/multi-exec")
          ? json.map((cmd) => ({ result: run(cmd) }))
          : { result: run(json) };
        res.end(JSON.stringify(out));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: String(e.message) }));
      }
    });
  })
  .listen(port, () => console.log(`mock upstash on :${port}`));
