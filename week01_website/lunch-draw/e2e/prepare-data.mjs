// Fresh copy of the real restaurant data for the e2e server.
// restaurants.seed.json is what POST /api/test/reset restores before every test.
import { copyFileSync, mkdirSync, rmSync } from "node:fs";

const dir = "e2e/.data";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
copyFileSync("data/restaurants.json", `${dir}/restaurants.json`);
copyFileSync("data/restaurants.json", `${dir}/restaurants.seed.json`);
console.log("e2e data ready in", dir);
