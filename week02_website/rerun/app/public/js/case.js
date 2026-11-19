(async function () {
  const { h, api, page, errText, fmtMoney, fmtIdNo, timeEl, statusBadge, levelBadge, serviceLabel, showError, showSuccess, clearMsgs, STATUS_TH } = App;
  const parts = location.pathname.split('/');            // ['', 'citizen'|'officer', 'cases', no]
  const area = parts[1];
  const caseNo = decodeURIComponent(parts[3] || '');
  const user = await App.boot({ roles: area === 'citizen' ? ['citizen'] : ['officer', 'head'] });
  if (!user) return;
  const isCitizen = user.role === 'citizen';
  const isHead = user.role === 'head';
  const isOfficer = user.role === 'officer';
  const STEP_TXT = { 1: 'ขั้นตอน 1/3 · ฝ่ายทะเบียน', 2: 'ขั้นตอน 2/3 · ฝ่ายโยธา', 3: 'ขั้นตอน 3/3 · หัวหน้าฝ่าย' };

  async function load() {
    const r = await api('GET', '/api/cases/' + encodeURIComponent(caseNo));
    if (r.status === 404) { App.showNotFound('ไม่พบคำขอ', 'not-found-msg'); return; }
    if (r.status === 403) { App.showForbidden(); return; }
    if (!r.ok || !r.data) { page('รายละเอียดคำขอ'); showError(errText(r.data)); return; }
    const fr = await api('GET', '/api/cases/' + encodeURIComponent(caseNo) + '/files');
    render(r.data, fr.ok && fr.data && Array.isArray(fr.data.items) ? fr.data.items : []);
  }

  async function act(method, path, body, okMsg, after) {
    clearMsgs();
    const r = await api(method, path, body);
    if (!r.ok) { showError(errText(r.data)); return r; }
    if (after) await after(r); else await load();
    showSuccess(okMsg);
    return r;
  }

  function reasonPanel(prefix, labelText, submitText, onSubmit) {
    const reason = h('textarea', { id: prefix + '-reason', 'data-testid': prefix + '-reason', 'aria-describedby': prefix + '-err' });
    const err = h('p', { id: prefix + '-err', class: 'field-error', 'data-testid': prefix + '-reason-error', role: 'alert', hidden: true });
    const btn = h('button', { type: 'button', 'data-testid': prefix + '-submit' }, submitText);
    btn.addEventListener('click', async () => {
      const t = reason.value.trim();
      if (t.length < 10) { err.textContent = App.ERRORS.REASON_TOO_SHORT; err.hidden = false; return; }
      err.hidden = true; btn.disabled = true;
      const r = await onSubmit(t);
      btn.disabled = false;
      if (r && !r.ok && r.data && r.data.code === 'REASON_TOO_SHORT') { err.textContent = App.ERRORS.REASON_TOO_SHORT; err.hidden = false; }
    });
    return h('div', { class: 'card', hidden: true }, h('label', { for: prefix + '-reason' }, labelText), reason, err, h('p', {}, btn));
  }
  function toggler(label, tidv, panel, cls) {
    const b = h('button', { type: 'button', class: cls || '', 'data-testid': tidv, 'aria-expanded': 'false' }, label);
    b.addEventListener('click', () => { panel.hidden = false; b.setAttribute('aria-expanded', 'true'); { const f = panel.querySelector('textarea,input'); if (f) f.focus(); } });
    return b;
  }

  function render(c, files) {
    const root = page('คำขอ ' + c.caseNo, isCitizen ? 'ประชาชน' : 'เจ้าหน้าที่');
    root.querySelector('#page-title').remove();
    const status = c.status, closed = status === 'COMPLETED' || status === 'REJECTED';

    /* --- สรุป --- */
    const kv = h('dl', { class: 'kv' });
    const add = (dt, dd) => { kv.append(h('dt', {}, dt), h('dd', {}, dd)); };
    add('เลขคำขอ', h('span', { 'data-testid': 'case-no' }, c.caseNo));
    add('สถานะ', statusBadge(status, 'case-status'));
    add('บริการ', h('span', { 'data-testid': 'case-service' }, serviceLabel(c.serviceId)));
    if (c.serviceId === 'SV-03' && c.step) add('ขั้นตอน', h('span', { 'data-testid': 'case-step' }, STEP_TXT[c.step] || ''));
    add('ค่าธรรมเนียม', h('span', { 'data-testid': 'case-fee' }, c.fee != null ? fmtMoney(c.fee) : '–'));
    if (!isCitizen) add('ผู้ยื่น', h('span', { 'data-testid': 'applicant-name' }, c.applicantName || '–'));
    add('กำหนดเสร็จ', timeEl('sla-due', c.dueAt));
    add('ระดับเตือน', levelBadge(c.slaLevel, 'sla-level'));
    if (closed && c.closedAt) add('ปิดงานเมื่อ', timeEl('closed-at', c.closedAt));
    if (!isCitizen) {
      add('ผู้ถือเรื่อง', h('span', { 'data-testid': 'case-owner' }, c.owner || 'ยังไม่มีผู้รับ'));
      add('ตีกลับแล้ว (ครั้ง)', h('span', { 'data-testid': 'return-count' }, String(c.returnCount || 0)));
      add('เลขบัตรประชาชน', h('span', { 'data-testid': 'applicant-id' }, c.idMasked || '–'));
    } else if (c.idNo) {
      add('เลขบัตรประชาชน', h('span', { 'data-testid': 'case-id-full' }, fmtIdNo(c.idNo)));
    }
    root.append(h('section', { class: 'card accent', 'aria-labelledby': 'h-case' },
      h('h1', { id: 'h-case', style: 'margin-top:0' }, 'คำขอ ' + c.caseNo), kv));

    if (isCitizen && (status === 'REJECTED' || status === 'CANCELLED'))
      root.append(h('p', { class: 'info', 'data-testid': 'no-refund-note' }, 'ค่าธรรมเนียมที่ชำระแล้วไม่คืน'));

    /* --- เอกสารดิจิทัล --- */
    if (c.docNo) {
      const url = location.origin + '/verify/' + (c.verifyCode || '');
      const qr = h('div', { 'data-testid': 'doc-qr', 'data-url': url, role: 'img', 'aria-label': 'QR ตรวจสอบเอกสาร ' + (c.verifyCode || '') }, App.fakeQr(url, 'QR ตรวจสอบเอกสาร'));
      const dk = h('dl', { class: 'kv' },
        h('dt', {}, 'เลขเอกสาร'), h('dd', { 'data-testid': 'doc-no' }, c.docNo),
        h('dt', {}, 'รหัสตรวจสอบ'), h('dd', { 'data-testid': 'verify-code' }, c.verifyCode || '–'));
      const sec = h('section', { class: 'card', 'aria-labelledby': 'h-doc' }, h('h2', { id: 'h-doc' }, 'เอกสารดิจิทัล'), dk, qr);
      if (c.verifyCode) sec.append(h('p', {}, h('a', { href: '/verify/' + encodeURIComponent(c.verifyCode) }, 'ตรวจสอบเอกสารนี้')));
      if (isCitizen) sec.append(h('p', {}, h('a', { class: 'btn', 'data-testid': 'download-doc-btn', href: '/api/documents/' + encodeURIComponent(c.docNo) + '/pdf', download: c.docNo + '.pdf' }, 'ดาวน์โหลดเอกสาร')));
      root.append(sec);
    }

    /* --- เอกสารแนบ --- */
    const fl = h('ul', { class: 'plain' });
    files.forEach(f => fl.append(h('li', { 'data-testid': 'doc-item', 'data-name': f.name, 'data-file-id': f.fileId },
      h('span', {}, f.name), h('a', { 'data-testid': 'doc-download-link', href: '/api/files/' + encodeURIComponent(f.fileId), target: '_blank', rel: 'noopener', 'aria-label': 'เปิด/ดาวน์โหลด ' + f.name }, 'เปิด/ดาวน์โหลด'))));
    root.append(h('section', { class: 'card', 'aria-labelledby': 'h-files' }, h('h2', { id: 'h-files' }, 'เอกสารแนบ'), files.length ? fl : h('p', { class: 'muted' }, 'ไม่มีเอกสารแนบที่เปิดดูได้')));

    /* --- ไทม์ไลน์ --- */
    const tl = h('ol', { class: 'timeline', 'data-testid': 'case-timeline' });
    (c.timeline || c.events || []).forEach(ev => {
      const iso = ev.time || ev.at || ev.createdAt || ev.iso || '';
      const txt = [ev.text || ev.label || ev.event, ev.detail && ev.text !== ev.detail ? ev.detail : null].filter(Boolean).join(' · ');
      tl.append(h('li', { 'data-testid': 'timeline-item', 'data-iso': iso }, h('strong', {}, App.fmtDateTime(iso)), ' ', txt));
    });
    root.append(h('section', { class: 'card', 'aria-labelledby': 'h-tl' }, h('h2', { id: 'h-tl' }, 'ไทม์ไลน์'), tl));

    if (isCitizen) renderCitizenActions(root, c); else renderStaffActions(root, c);
  }

  /* ---------- ประชาชน ---------- */
  function renderCitizenActions(root, c) {
    const box = h('section', { class: 'card', 'aria-labelledby': 'h-act' }, h('h2', { id: 'h-act' }, 'การดำเนินการ'));
    let any = false;
    if (c.status === 'SUBMITTED' && !c.owner) {
      any = true;
      const dlg = h('dialog', { 'aria-labelledby': 'dlg-t' },
        h('h2', { id: 'dlg-t' }, 'ยืนยันการยกเลิกคำขอ'),
        h('p', { 'data-testid': 'cancel-confirm-text' }, 'ค่าธรรมเนียมที่ชำระแล้วไม่คืน'),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'sec', onclick: () => dlg.close() }, 'ไม่ยกเลิก'),
          h('button', { type: 'button', class: 'danger', 'data-testid': 'confirm-cancel-btn', onclick: async () => { dlg.close(); await act('POST', '/api/cases/' + encodeURIComponent(c.caseNo) + '/cancel', undefined, 'ยกเลิกคำขอแล้ว'); } }, 'ยืนยันยกเลิกคำขอ')));
      box.append(dlg, h('button', { type: 'button', class: 'danger', 'data-testid': 'cancel-case-btn', onclick: () => dlg.showModal() }, 'ยกเลิกคำขอ'));
    }
    if (c.status === 'NEED_FIX') {
      any = true;
      const rs = c.returnReason || c.lastReturnReason || ((c.timeline || []).slice().reverse().find(e => /RETURN|ตีกลับ/.test(e.event || e.text || '')) || {}).detail || '';
      box.append(h('div', { class: 'alert' }, h('strong', {}, 'เหตุผลที่ถูกตีกลับ: '), h('span', { 'data-testid': 'return-reason-display' }, rs)),
        h('p', {}, 'กำหนดส่งแก้ไข: ', timeEl('fix-deadline', c.fixDeadline)));
      const fi = h('input', { type: 'file', id: 'fixFile', 'data-testid': 'fix-upload-input', multiple: true });
      const btn = h('button', { type: 'button', 'data-testid': 'submit-fix-btn' }, 'ส่งแก้ไข');
      btn.addEventListener('click', async () => {
        const fd = new FormData();
        Array.from(fi.files || []).forEach(f => { fd.append('file', f, f.name); fd.append('docKey', 'extra'); });
        btn.disabled = true;
        await act('POST', '/api/cases/' + encodeURIComponent(c.caseNo) + '/resubmit', fd, 'ส่งแก้ไขแล้ว');
        btn.disabled = false;
      });
      box.append(h('label', { for: 'fixFile' }, 'แนบไฟล์แก้ไข (ไม่บังคับ)'), fi, h('p', {}, btn));
    }
    if (any) root.append(box);
  }

  /* ---------- เจ้าหน้าที่ / หัวหน้า ---------- */
  function renderStaffActions(root, c) {
    const base = '/api/officer/cases/' + encodeURIComponent(c.caseNo);
    const status = c.status, sv = c.serviceId;
    const box = h('section', { class: 'card accent', 'aria-labelledby': 'h-act' }, h('h2', { id: 'h-act' }, 'การดำเนินการ'));
    const row = h('div', { class: 'row' }), panels = h('div');
    box.append(row, panels);
    const mine = isOfficer && c.owner === user.username;
    const deptNeeded = sv === 'SV-03' && c.step === 2 ? 'works' : 'registry';

    /* เลขเต็ม (officer/head) */
    const umReason = h('textarea', { id: 'um-reason', 'data-testid': 'unmask-reason', 'aria-describedby': 'um-err' });
    const umErr = h('p', { id: 'um-err', class: 'field-error', 'data-testid': 'unmask-error', role: 'alert', hidden: true });
    const umBtn = h('button', { type: 'button', 'data-testid': 'unmask-submit' }, 'ยืนยัน');
    const fullSlot = h('p', { 'aria-live': 'polite' });
    const umPanel = h('div', { class: 'card', hidden: true }, h('label', { for: 'um-reason' }, 'เหตุผลการขอดูเลขเต็ม (บันทึกใน Audit)'), umReason, umErr, h('p', {}, umBtn));
    umBtn.addEventListener('click', async () => {
      if (!umReason.value.trim()) { umErr.textContent = App.ERRORS.REASON_REQUIRED; umErr.hidden = false; return; }
      umErr.hidden = true; umBtn.disabled = true;
      const r = await api('POST', base + '/unmask', { reason: umReason.value.trim() });
      umBtn.disabled = false;
      if (r.ok && r.data) { umPanel.hidden = true; fullSlot.replaceChildren('เลขบัตรเต็ม: ', h('strong', { 'data-testid': 'full-id' }, fmtIdNo(r.data.idNo))); }
      else { umErr.textContent = errText(r.data); umErr.hidden = false; }
    });
    row.append(toggler('แสดงเลขเต็ม', 'show-full-id-btn', umPanel, 'sec'));
    panels.append(umPanel, fullSlot);

    /* รับเรื่อง */
    const unowned = !c.owner && (status === 'SUBMITTED' || status === 'IN_REVIEW');
    if (isOfficer && unowned && user.dept === deptNeeded) {
      row.append(h('button', { type: 'button', 'data-testid': 'claim-btn', onclick: () => act('POST', base + '/claim', undefined, 'รับเรื่องแล้ว') }, 'รับเรื่อง'));
    }

    /* ตีกลับ / ส่งต่อ / อนุมัติ / ไม่อนุมัติ */
    const canReject = (isOfficer && mine && sv === 'SV-01' && status === 'IN_REVIEW') || (isHead && sv !== 'SV-01' && status === 'PENDING_APPROVAL');
    const canApprove = canReject;
    if (mine && status === 'IN_REVIEW') {
      if ((c.returnCount || 0) < 2) {
        const p = reasonPanel('return', 'เหตุผลที่ตีกลับ (อย่างน้อย 10 ตัวอักษร)', 'ยืนยันตีกลับ', t => act('POST', base + '/return', { reason: t }, 'ตีกลับคำขอแล้ว'));
        panels.append(p); row.append(toggler('ตีกลับ', 'return-btn', p, 'sec'));
      }
      if (sv !== 'SV-01') {
        const note = h('textarea', { id: 'fwd-note', 'data-testid': 'forward-note' });
        panels.append(h('div', { class: 'card' }, h('label', { for: 'fwd-note' }, 'หมายเหตุส่งต่อ (ไม่บังคับ)'), note,
          h('p', {}, h('button', { type: 'button', 'data-testid': 'forward-btn', onclick: () => act('POST', base + '/forward', { note: note.value.trim() }, 'ส่งต่อแล้ว') }, 'ผ่าน/ส่งต่อ'))));
      }
    }
    if (canApprove) row.append(h('button', { type: 'button', 'data-testid': 'approve-btn', onclick: () => act('POST', '/api/cases/' + encodeURIComponent(c.caseNo) + '/approve', undefined, 'อนุมัติแล้ว') }, 'อนุมัติ'));
    if (canReject) {
      const p = reasonPanel('reject', 'เหตุผลที่ไม่อนุมัติ (อย่างน้อย 10 ตัวอักษร)', 'ยืนยันไม่อนุมัติ', t => act('POST', '/api/cases/' + encodeURIComponent(c.caseNo) + '/reject', { reason: t }, 'บันทึกไม่อนุมัติแล้ว'));
      panels.append(p); row.append(toggler('ไม่อนุมัติ', 'reject-btn', p, 'danger'));
    }

    /* ออกเอกสาร */
    if (isOfficer && status === 'APPROVED' && c.actions && c.actions.canIssue) {
      row.append(h('button', { type: 'button', 'data-testid': 'issue-btn', onclick: () => act('POST', base + '/issue', undefined, 'ออกเอกสารแล้ว') }, 'ออกเอกสาร'));
    }
    root.append(box);
  }

  await load();
})();

/* testid ไดนามิก (reasonPanel): return-reason return-submit return-reason-error reject-reason reject-submit reject-reason-error */
