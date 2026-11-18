import { createRequire } from 'node:module';
const require = createRequire('C:/t/pwcli/');
const { chromium } = require('playwright');
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage();
await p.goto('http://localhost:3300/user/login'); await p.fill('#user_name','novatech-admin'); await p.fill('#password','novatech-admin-lab');
await p.click('form.ui.form button.ui.primary.button'); await p.waitForLoadState('load');
for (const [pr, run, j] of [[5,10,1],[6,12,1],[7,14,3],[8,16,0],[8,16,1]]) {
  const t = await (await p.request.get(`http://localhost:3300/novatech/org-skills/actions/runs/${run}/jobs/${j}/logs`)).text();
  const all = t.split('\n').map(l => l.slice(29, 240)).filter(l => !/Wrote command|expression|tarball|docker|Exec command|Working directory|Cleaning|Removed|volume rm|Extracting|evaluat|Run Main|Run Post|Job |::|exitcode|Setting|Run |🐳|☁|=========/.test(l) && l.trim());
  const i = all.findIndex(l => /❌|Traceback|Error/.test(l));
  console.log(`== PR${pr} job${j}`); console.log((i < 0 ? all.slice(-8) : all.slice(Math.max(0, i - 3), i + 10)).map(x => '   ' + x).join('\n'));
}
await b.close();
