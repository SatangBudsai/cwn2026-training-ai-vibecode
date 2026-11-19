import { api, $, h, boot, showError, clearError, toast, setSlot, money, dateEl, qrEl, fmtIdNo, serviceLabel, STATUS_TH, SLA_TH } from '/static/app.js';

const ERR_REASON = 'กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร';
const STEP_TXT = { 1: 'ขั้นตอน 1/3 · ฝ่ายทะเบียน', 2: 'ขั้นตอน 2/3 · ฝ่ายโยธา', 3: 'ขั้นตอน 3/3 · หัวหน้าฝ่าย' };
const caseNo = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop());
const me = await boot({ roles: ['citizen', 'officer', 'head'] });
if (me) load();

function notFound() {
  $('#content').replaceChildren(h('h1', null, 'ไม่พบคำขอ'), h('p', { 'data-testid': 'not-found-msg', role: 'alert' }, 'ไม่พบคำขอ'));
}

async function load() {
  let c;
  try { c = await api(`/api/cases/${encodeURIComponent(caseNo)}`); } catch (e) {
    if (e.status === 404) return notFound();
    if (e.status === 403) { $('#content').replaceChildren(h('p', { 'data-testid': 'forbidden-msg', role: 'alert' }, 'ไม่มีสิทธิ์เข้าถึงหน้านี้')); return; }
    return showError(e.message);
  }
  render(c);
}

async function act(fn, { okMsg, slot, slotId } = {}) {
  clearError();
  try { await fn(); if (okMsg) toast(okMsg); await load(); if (okMsg) toast(okMsg); } catch (e) {
    if (slot && (e.code === 'REASON_TOO_SHORT' || e.code === 'REASON_REQUIRED')) {
      setSlot(slot, slotId, e.code === 'REASON_REQUIRED' ? 'กรุณากรอกเหตุผล' : ERR_REASON);
    } else {
      showError(e.message);
      if (e.code === 'FIX_WINDOW_EXPIRED' || e.code === 'ALREADY_CLAIMED' || e.code === 'INVALID_STATE' || e.code === 'CANNOT_CANCEL') {
        const msg = e.message; await load(); showError(msg);
      }
    }
  }
}

function kv(label, node) { return [h('dt', null, label), node.nodeType ? node : h('dd', null, node)]; }
const dd = (testid, text, extra) => h('dd', { 'data-testid': testid, ...extra }, text);

function render(c) {
  const isStaff = me.role !== 'citizen';
  const A = new Set(c.actions || []);
  const sName = c.serviceName ? `${c.serviceId} ${c.serviceName}` : serviceLabel(c.serviceId);
  document.title = `${c.caseNo} - e-Service กลาง`;

  const info = h('dl', { class: 'kv' },
    kv('บริการ', dd('case-service', sName)),
    c.step ? kv('ขั้นตอน', dd('case-step', STEP_TXT[c.step] || '')) : [],
    kv('ค่าธรรมเนียม', dd('case-fee', money(c.fee))),
    isStaff ? kv('ผู้ยื่น', dd('applicant-name', c.applicantName)) : [],
    kv('กำหนดเสร็จ', dateEl('dd', c.dueAt, { 'data-testid': 'sla-due' })),
    kv('ระดับเตือน', h('dd', null, h('span', { class: 'chip', 'data-testid': 'sla-level', 'data-level': c.slaLevel }, SLA_TH[c.slaLevel] || c.slaLevel))),
    c.closedAt ? kv('เวลาปิดงาน', dateEl('dd', c.closedAt, { 'data-testid': 'closed-at' })) : [],
    isStaff ? kv('ผู้ถือเรื่อง', dd('case-owner', c.owner || 'ยังไม่มีผู้รับ')) : [],
    isStaff ? kv('ตีกลับแล้ว (ครั้ง)', dd('return-count', String(c.returnCount ?? 0))) : [],
    isStaff ? kv('เลขบัตร', dd('applicant-id', c.idMasked || '')) : kv('เลขบัตร', dd('case-id-full', fmtIdNo(c.idNo))),
    c.docNo ? kv('เลขเอกสาร', dd('doc-no', c.docNo)) : [],
    c.verifyCode ? kv('รหัสตรวจสอบ', dd('verify-code', c.verifyCode)) : []);

  const head = h('div', { class: 'card accent' },
    h('h1', null, 'คำขอ ', h('span', { 'data-testid': 'case-no' }, c.caseNo)),
    h('p', null, h('span', { class: 'chip', 'data-testid': 'case-status', 'data-status': c.status }, STATUS_TH[c.status] || c.status)),
    info);

  const parts = [head];

  // document QR
  if (c.docNo && c.verifyCode) {
    const url = `${location.origin}/verify/${c.verifyCode}`;
    parts.push(h('div', { class: 'card' }, h('h2', null, 'เอกสารที่ออกให้'),
      qrEl(url, { 'data-testid': 'doc-qr', 'data-url': url }),
      h('p', null, h('a', { href: url }, 'ตรวจสอบเอกสาร')),
      A.has('download') ? h('p', null, h('a', { class: 'btn', href: `/api/documents/${encodeURIComponent(c.docNo)}/pdf`, 'data-testid': 'download-doc-btn' }, 'ดาวน์โหลดเอกสาร')) : null));
  }

  // files
  parts.push(h('div', { class: 'card' }, h('h2', null, 'เอกสารแนบ'),
    (c.files || []).length ? h('ul', { class: 'plain' }, c.files.map((f) => h('li', { 'data-testid': 'doc-item', 'data-name': f.name, 'data-file-id': f.fileId },
      f.name, ' ', h('a', { href: `/api/files/${f.fileId}`, 'data-testid': 'doc-download-link', 'aria-label': `ดาวน์โหลด ${f.name}` }, 'ดาวน์โหลด')))) : h('p', { class: 'note' }, 'ไม่มีเอกสารแนบ')));

  // timeline
  parts.push(h('div', { class: 'card' }, h('h2', null, 'ไทม์ไลน์'),
    h('ul', { class: 'plain timeline', 'data-testid': 'case-timeline' }, (c.timeline || []).map((t) =>
      h('li', { 'data-testid': 'timeline-item', 'data-iso': t.at, 'data-event': t.event }, h('strong', null, fmtLine(t.at)), ' ', t.text)))));

  if (isStaff) parts.push(staffPanel(c, A));
  else parts.push(...citizenPanels(c, A));
  $('#content').replaceChildren(...parts);
}
function fmtLine(iso) { return dateEl('span', iso).textContent; }

function reasonBox({ id, label, testid, submitTid, errTid, btnText, onSubmit }) {
  const slot = h('div', { 'aria-live': 'polite' });
  const ta = h('textarea', { id, 'data-testid': testid });
  return h('div', { class: 'field' },
    h('label', { for: id }, label), ta, slot,
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn danger', 'data-testid': submitTid, onclick: () => onSubmit(ta.value.trim(), slot, errTid) }, btnText)));
}

function staffPanel(c, A) {
  const base = `/api/officer/cases/${encodeURIComponent(c.caseNo)}`;
  const box = h('div', { class: 'card' }, h('h2', null, 'การดำเนินการ'));
  const post = (url, json) => api(url, { method: 'POST', json });

  // unmask
  if (A.has('unmask')) {
    const slot = h('div', { 'aria-live': 'polite' });
    const out = h('p', null);
    const ta = h('input', { type: 'text', id: 'unmask-reason', 'data-testid': 'unmask-reason' });
    box.append(h('div', { class: 'field' },
      h('span', { class: 'lbl' }, 'ดูเลขบัตรเต็ม (บันทึกใน Audit)'),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn secondary', 'data-testid': 'show-full-id-btn', onclick: () => ta.focus() }, 'แสดงเลขเต็ม')),
      h('label', { for: 'unmask-reason' }, 'เหตุผลที่ขอดูเลขเต็ม'), ta, slot, out,
      h('div', { class: 'btn-row' }, h('button', {
        type: 'button', class: 'btn', 'data-testid': 'unmask-submit',
        onclick: async () => {
          clearError(); setSlot(slot, 'unmask-error', '');
          try {
            const r = await post(`${base}/unmask`, { reason: ta.value.trim() });
            out.replaceChildren('เลขเต็ม: ', h('strong', { 'data-testid': 'full-id' }, fmtIdNo(r.idNo)));
          } catch (e) { if (e.code === 'REASON_REQUIRED') setSlot(slot, 'unmask-error', 'กรุณากรอกเหตุผล'); else showError(e.message); }
        },
      }, 'ยืนยัน'))));
  }
  if (A.has('claim')) box.append(h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', 'data-testid': 'claim-btn', onclick: () => act(() => post(`${base}/claim`), { okMsg: 'รับเรื่องแล้ว' }) }, 'รับเรื่อง')));
  if (A.has('forward')) {
    box.append(h('div', { class: 'field' }, h('label', { for: 'forward-note' }, 'หมายเหตุส่งต่อ (ไม่บังคับ)'), h('input', { type: 'text', id: 'forward-note', 'data-testid': 'forward-note' })),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', 'data-testid': 'forward-btn', onclick: () => act(() => post(`${base}/forward`, { note: $('#forward-note').value.trim() }), { okMsg: 'ส่งต่อแล้ว' }) }, 'ผ่าน/ส่งต่อ')));
  }
  if (A.has('approve')) box.append(h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', 'data-testid': 'approve-btn', onclick: () => act(() => post(`/api/cases/${encodeURIComponent(c.caseNo)}/approve`), { okMsg: 'อนุมัติแล้ว' }) }, 'อนุมัติ')));
  if (A.has('issue')) box.append(h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn gold', 'data-testid': 'issue-btn', onclick: () => act(() => post(`${base}/issue`), { okMsg: 'ออกเอกสารแล้ว' }) }, 'ออกเอกสาร')));
  if (A.has('return')) {
    const wrap = reasonBox({ id: 'return-reason', label: 'เหตุผลการตีกลับ', testid: 'return-reason', submitTid: 'return-submit', errTid: 'return-reason-error', btnText: 'ยืนยันตีกลับ',
      onSubmit: (reason, slot, tid) => { setSlot(slot, tid, ''); return act(() => post(`${base}/return`, { reason }), { okMsg: 'ตีกลับแล้ว', slot, slotId: tid }); } });
    box.append(h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn secondary', 'data-testid': 'return-btn', onclick: () => $('#return-reason').focus() }, 'ตีกลับ')), wrap);
  }
  if (A.has('reject')) {
    const wrap = reasonBox({ id: 'reject-reason', label: 'เหตุผลที่ไม่อนุมัติ', testid: 'reject-reason', submitTid: 'reject-submit', errTid: 'reject-reason-error', btnText: 'ยืนยันไม่อนุมัติ',
      onSubmit: (reason, slot, tid) => { setSlot(slot, tid, ''); return act(() => post(`/api/cases/${encodeURIComponent(c.caseNo)}/reject`, { reason }), { okMsg: 'บันทึกไม่อนุมัติแล้ว', slot, slotId: tid }); } });
    box.append(h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn secondary', 'data-testid': 'reject-btn', onclick: () => $('#reject-reason').focus() }, 'ไม่อนุมัติ')), wrap);
  }
  return box;
}

function citizenPanels(c, A) {
  const out = [];
  if (c.status === 'NEED_FIX') {
    const files = h('input', { type: 'file', id: 'fix-file', multiple: true, 'data-testid': 'fix-upload-input' });
    out.push(h('div', { class: 'card' }, h('h2', null, 'ต้องแก้ไขเอกสาร'),
      h('p', null, 'เหตุผล: ', h('strong', { 'data-testid': 'return-reason-display' }, c.fixReason || '')),
      h('p', null, 'ส่งแก้ไขภายใน: ', dateEl('strong', c.fixDeadline, { 'data-testid': 'fix-deadline' })),
      A.has('resubmit') ? h('div', null,
        h('div', { class: 'field' }, h('label', { for: 'fix-file' }, 'แนบไฟล์ใหม่ (ไม่บังคับ)'), files),
        h('div', { class: 'btn-row' }, h('button', {
          type: 'button', class: 'btn', 'data-testid': 'submit-fix-btn',
          onclick: () => act(async () => {
            const form = new FormData();
            for (const f of files.files) { form.append('file', f); form.append('docKey', 'extra'); }
            await api(`/api/cases/${encodeURIComponent(c.caseNo)}/resubmit`, { method: 'POST', form });
          }, { okMsg: 'ส่งแก้ไขแล้ว' }),
        }, 'ส่งแก้ไข'))) : null));
  }
  if (A.has('cancel')) {
    const confirmBox = h('div', { class: 'alert', hidden: true, role: 'alertdialog', 'aria-label': 'ยืนยันการยกเลิก' },
      h('p', { 'data-testid': 'cancel-confirm-text' }, 'ค่าธรรมเนียมที่ชำระแล้วไม่คืน'),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn danger', 'data-testid': 'confirm-cancel-btn', onclick: () => act(() => api(`/api/cases/${encodeURIComponent(c.caseNo)}/cancel`, { method: 'POST' }), { okMsg: 'ยกเลิกคำขอแล้ว' }) }, 'ยืนยันยกเลิก'),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => { confirmBox.hidden = true; } }, 'ไม่ยกเลิก')));
    out.push(h('div', { class: 'card' }, h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn danger', 'data-testid': 'cancel-case-btn', onclick: () => { confirmBox.hidden = false; $('[data-testid=confirm-cancel-btn]').focus(); } }, 'ยกเลิกคำขอ')), confirmBox));
  }
  if (c.status === 'REJECTED' || c.status === 'CANCELLED') out.push(h('p', { class: 'card', 'data-testid': 'no-refund-note' }, 'ค่าธรรมเนียมที่ชำระแล้วไม่คืน'));
  return out;
}
