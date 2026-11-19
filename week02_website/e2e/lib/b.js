// Helpers for TEST agent B (queue/sla/noti/workflow/doc). Black-box, CONTRACT only.
const { expect } = require('@playwright/test');
const C = require('./common');

const CN = (n) => 'EG-2569-' + String(n).padStart(6, '0');
const T = (iso) => iso; // readability

/** reset with a throw-away context, then return a fresh anonymous api */
async function fresh() {
  const a = await C.newApi();
  await C.reset(a);
  await a.dispose();
}

async function staff(u) { return C.apiStaff(u); }
async function citizen(id) { return C.apiCitizen(id); }

async function getCase(api, caseNo) {
  const r = await api.get(`/api/cases/${caseNo}`);
  expect(r.status(), 'GET case ' + caseNo).toBe(200);
  return r.json();
}
async function queue(api, filter = 'all') {
  const r = await api.get(`/api/officer/queue?filter=${filter}`);
  expect(r.status(), 'queue').toBe(200);
  return (await r.json()).items;
}
async function notis(api) {
  const r = await api.get('/api/notifications');
  expect(r.status(), 'notifications').toBe(200);
  return (await r.json()).items;
}
/** simple "caseNo:level" sorted list */
function notiKeys(items) {
  return items.map((i) => `${i.caseNo.slice(-6)}:${i.level}`).sort();
}
const post = async (api, url, data) => {
  const r = await api.post(url, data === undefined ? {} : { data });
  return { status: r.status(), body: await r.json().catch(() => ({})), res: r };
};
const claim = (api, no) => post(api, `/api/officer/cases/${no}/claim`);
const ret = (api, no, reason = 'xxxxxxxxxx') => post(api, `/api/officer/cases/${no}/return`, { reason });
const forward = (api, no, note) => post(api, `/api/officer/cases/${no}/forward`, note === undefined ? {} : { note });
const approve = (api, no) => post(api, `/api/cases/${no}/approve`);
const reject = (api, no, reason = 'xxxxxxxxxx') => post(api, `/api/cases/${no}/reject`, { reason });
const issue = (api, no) => post(api, `/api/officer/cases/${no}/issue`);
const resubmit = (api, no) => post(api, `/api/cases/${no}/resubmit`);

async function audit(api, query = '') {
  const r = await api.get('/api/audit' + (query ? '?' + query : ''));
  expect(r.status(), 'audit').toBe(200);
  return r.json();
}
async function dashboard(api, period = '2026-12', service = 'ALL') {
  const r = await api.get(`/api/dashboard?period=${period}&service=${service}`);
  expect(r.status(), 'dashboard').toBe(200);
  return r.json();
}

/** new browser context + page logged in via UI (staff) */
async function uiStaff(browser, user) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await C.uiLoginStaff(page, user);
  return { ctx, page };
}
async function uiCitizen(browser, id) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await C.uiLoginCitizen(page, id);
  return { ctx, page };
}

const tid = (page, id) => page.getByTestId(id);
async function expectIso(loc, iso) { await expect(loc).toHaveAttribute('data-iso', iso); }

/** NEW_PAID for SV-01 etc. at a given clock (clock is set on the shared api first) */
async function newPaid({ at, id = C.ID.somchai, serviceId = 'SV-01', qty, areaSqm }) {
  const adm = await C.newApi();
  if (at) await C.setClock(adm, at);
  await adm.dispose();
  const cit = await C.apiCitizen(id);
  const p = await C.createPaidCase(cit, { serviceId, qty, areaSqm });
  return { cit, ...p };
}
async function setClock(iso) {
  const a = await C.newApi();
  await C.setClock(a, iso);
  await a.dispose();
}

/** sorted-by-text rows -> array of last 6 digits of data-case-no */
async function rowNos(page, rowId) {
  const attrs = await page.getByTestId(rowId).evaluateAll((els) => els.map((e) => e.getAttribute('data-case-no')));
  return attrs.map((s) => s.slice(-6));
}

module.exports = {
  C, CN, T, fresh, staff, citizen, getCase, queue, notis, notiKeys, post, claim, ret, forward, approve, reject,
  issue, resubmit, audit, dashboard, uiStaff, uiCitizen, tid, expectIso, newPaid, setClock, rowNos,
};
