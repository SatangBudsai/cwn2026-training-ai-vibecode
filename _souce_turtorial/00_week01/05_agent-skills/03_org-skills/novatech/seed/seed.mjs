// สร้างบริษัทโนวาเทคใน Gitea: องค์กร, ทีม 12 ทีม (10 แผนก + ทีมกลาง + หัวหน้า), พนักงาน 28 คน, token และโต๊ะทำงาน
// รันซ้ำได้: ของที่มีอยู่แล้วจะข้าม
import { readFileSync, mkdirSync, writeFileSync, existsSync, cpSync } from 'node:fs';

const { GITEA_URL, ADMIN_USER, ADMIN_PASSWORD, LAB_PASSWORD } = process.env;
const data = JSON.parse(readFileSync(new URL('./people.json', import.meta.url)));
const ORG = data.org;
const basic = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
const ADMIN = basic(ADMIN_USER, ADMIN_PASSWORD);

async function api(method, path, body, auth = ADMIN) {
  const res = await fetch(`${GITEA_URL}/api/v1${path}`, {
    method, headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
const ok = (r, what) => { if (r.status >= 300) throw new Error(`${what}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };

// 1 · พนักงาน
for (const p of data.people) {
  const r = await api('POST', '/admin/users', {
    username: p.user, full_name: p.name, email: `${p.user}@novatech.test`,
    password: LAB_PASSWORD, must_change_password: false, send_notify: false,
  });
  if (r.status !== 201 && r.status !== 422) ok(r, `สร้าง ${p.user}`);
}

// 2 · องค์กร
const org = await api('GET', `/orgs/${ORG}`);
if (org.status === 404) ok(await api('POST', '/orgs', {
  username: ORG, full_name: data.orgName, visibility: 'public',
  description: 'บริษัทจำลองสำหรับ LAB skill ระดับองค์กร (บท 05 ส่วน 03)',
}), 'สร้างองค์กร');

// 3 · ทีม: แผนกละ 1 ทีม (เขียน repo ได้) + leads (หัวหน้าทุกแผนก = ผู้รีวิว)
const units = ['repo.code', 'repo.issues', 'repo.pulls', 'repo.releases', 'repo.actions', 'repo.wiki'];
const existing = ok(await api('GET', `/orgs/${ORG}/teams?limit=50`), 'อ่านทีม');
async function team(name, description) {
  const found = existing.find(t => t.name === name);
  if (found) return found;
  return ok(await api('POST', `/orgs/${ORG}/teams`, {
    name, description, permission: name === 'platform' ? 'admin' : 'write', includes_all_repositories: true,
    can_create_org_repo: name === 'platform',
    units, units_map: Object.fromEntries(units.map(u => [u, name === 'platform' ? 'admin' : 'write'])),
  }), `สร้างทีม ${name}`);
}
const teams = {};
for (const d of data.departments) teams[d.team] = await team(d.team, d.name);
teams.leads = await team('leads', 'หัวหน้าแผนก = ผู้ดูแล skill (CODEOWNER)');
for (const p of data.people) {
  ok(await api('PUT', `/teams/${teams[p.team].id}/members/${p.user}`), `${p.user} เข้าทีม`);
  if (p.lead) ok(await api('PUT', `/teams/${teams.leads.id}/members/${p.user}`), `${p.user} เข้า leads`);
}

// 4 · token ทดสอบของแต่ละคน (ใช้เปิด PR / รีวิวในนามคนนั้น) + โต๊ะทำงาน
for (const p of data.people) {
  const auth = basic(p.user, LAB_PASSWORD);
  await api('DELETE', `/users/${p.user}/tokens/lab`, null, auth);
  const tok = ok(await api('POST', `/users/${p.user}/tokens`, {
    name: 'lab', scopes: ['write:repository', 'write:issue', 'read:user',
      p.team === 'platform' ? 'write:organization' : 'read:organization'],   // ทีมกลางสร้าง repo ในองค์กรได้
  }, auth), `token ${p.user}`);
  mkdirSync(`desks/${p.user}`, { recursive: true });
  writeFileSync(`desks/${p.user}/.gitea-token`, tok.sha1 + '\n');
  // โน้ตส่วนตัว = ความรู้ที่ยังอยู่ในหัวคนนั้นคนเดียว (หัวข้อ 18.2)
  if (existsSync(`seed/notes/${p.user}`)) cpSync(`seed/notes/${p.user}`, `desks/${p.user}/notes`, { recursive: true });
}

// 5 · token ลงทะเบียน CI runner (runner รอให้ seed จบก่อนค่อยเริ่ม)
const rt = ok(await api('GET', '/admin/runners/registration-token'), 'runner token');
writeFileSync('/shared/runner-token', rt.token);

// 6 · สรุป
console.log(`\n🏢 ${data.orgName}  →  http://localhost:3300/${ORG}\n`);
for (const d of data.departments) {
  const ms = data.people.filter(p => p.team === d.team)
    .map(p => `${p.user}${p.lead ? ' 👑' : ''} (${p.role})`).join(', ');
  console.log(`${d.name.padEnd(20)} ${ms}`);
}
console.log(`\nทีม ${Object.keys(teams).length} ทีม · พนักงาน ${data.people.length} คน · โต๊ะ ${data.people.length} โต๊ะใน desks/`);
