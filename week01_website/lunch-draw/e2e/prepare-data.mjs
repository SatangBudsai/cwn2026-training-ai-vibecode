// Fixed test data for the e2e server (e2e/data: a frozen copy of 237 OSM restaurants and
// the default categories), so results never depend on what the team edits in the app.
// restaurants.seed.json is what POST /api/test/reset restores before every test.
import { copyFileSync, mkdirSync, rmSync } from "node:fs";

const dir = "e2e/.data";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
copyFileSync("e2e/data/restaurants.json", `${dir}/restaurants.json`);
copyFileSync("e2e/data/restaurants.json", `${dir}/restaurants.seed.json`);
copyFileSync("e2e/data/categories.json", `${dir}/categories.json`);
copyFileSync("e2e/data/categories.json", `${dir}/categories.seed.json`);
console.log("e2e data ready in", dir);
