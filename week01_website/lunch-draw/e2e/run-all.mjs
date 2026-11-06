// npm run e2e:all  ->  run the suite, then always build the GIFs and the Excel report
// (even when some tests fail, so the failures are in the report too).
import { spawnSync } from "node:child_process";

const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" }).status ?? 1;

const tests = run("npx", ["playwright", "test"]);
run("node", ["e2e/make-gifs.mjs"]);
run("python", ["e2e/make-excel.py"]);
process.exit(tests);
