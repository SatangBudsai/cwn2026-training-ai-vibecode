(async function () {
  const { h, api, page, errText, fmtMoney, timeEl, fmtDateTime, fakeQr, SERVICES, showError, showSuccess, clearMsgs } = App;
  const user = await App.boot({ roles: ['citizen'] });
  if (!user) return;
  const svcId = decodeURIComponent((location.pathname.split('/')[3] || '')).toUpperCase();
  const svc = SERVICES[svcId];
  if (!svc) { App.showNotFound('ไม่พบบริการ', 'service-not-found'); return; }

  const c = page(svc.name, 'ยื่นคำขอบริการ ' + svcId);
  c.querySelector('#page-title').setAttribute('data-testid', 'service-name');
  const stepLabels = ['1/3 กรอกข้อมูล', '2/3 แนบเอกสาร', '3/3 ชำระเงิน'];
  const stepEl = h('p', { 'data-testid': 'wizard-step', 'aria-live': 'polite', style: 'font-weight:700;color:#0B2559' });
  c.append(stepEl);

  const state = { draftId: null, key: null, step: 1, fee: null, files: [], payment: null, timer: null };
  const setStep = n => {
    state.step = n; stepEl.textContent = stepLabels[n - 1];
    s1.hidden = n !== 1; s2.hidden = n !== 2; s3.hidden = n !== 3;
    if (n !== 3) stopPoll();
    document.getElementById('main').focus({ preventScroll: true });
  };
  const setHidden = (el, t) => { el.textContent = t || ''; el.hidden = !t; };

  /* ---------- ขั้น 1 ---------- */
  const qty = h('input', { type: 'text', id: 'qty', 'data-testid': 'qty-input', inputmode: 'numeric', value: '1', 'aria-describedby': 'fee-err' });
  const area = h('input', { type: 'text', id: 'area', 'data-testid': 'area-input', inputmode: 'numeric', 'aria-describedby': 'fee-err' });
  const feeTotal = h('output', { 'data-testid': 'fee-total', id: 'fee-total', style: 'font-size:1.6rem;font-weight:700;color:#0B2559' }, '–');
  const feeErr = h('p', { id: 'fee-err', class: 'field-error', 'data-testid': 'fee-error', role: 'alert', hidden: true });
  const draftIdEl = h('span', { 'data-testid': 'draft-id', hidden: true });
  const saveBtn = h('button', { type: 'button', class: 'sec', 'data-testid': 'save-draft-btn' }, 'บันทึกร่าง');
  const toUpload = h('button', { type: 'button', 'data-testid': 'to-upload-btn' }, 'ไปขั้นแนบเอกสาร');
  const s1 = h('section', { class: 'card accent', 'aria-label': 'กรอกข้อมูล' });
  if (svcId === 'SV-01') s1.append(h('label', { for: 'qty' }, 'จำนวนฉบับ (1–5 ฉบับ, ฉบับละ ฿20)'), qty);
  if (svcId === 'SV-03') s1.append(h('label', { for: 'area' }, 'พื้นที่อาคาร (ตร.ม. 1–500)'), area);
  if (svcId === 'SV-02') s1.append(h('p', {}, 'ค่าธรรมเนียมคงที่ตามประเภทบริการ ไม่ต้องกรอกข้อมูลเพิ่ม'));
  /* CONTRACT: fee-error ไม่อยู่ใน DOM เมื่อไม่มีข้อผิดพลาด */
  const feeP = h('p', {}, h('span', { class: 'muted' }, 'ค่าธรรมเนียม: '), feeTotal);
  Object.defineProperty(feeErr, 'hidden', { configurable: true, get() { return !feeErr.isConnected; },
    set(v) { if (v) feeErr.remove(); else if (!feeErr.isConnected) feeP.after(feeErr); } });
  s1.append(feeP,
    h('p', { class: 'muted' }, 'รหัสร่าง: ', draftIdEl, h('span', { id: 'no-draft' }, ' ยังไม่ได้บันทึก')),
    h('div', { class: 'row' }, saveBtn, toUpload));

  /* อัตราค่าธรรมเนียมจากเซิร์ฟเวอร์ (admin แก้ได้) ไม่ใช้ค่าตั้งต้นฝั่ง client */
  const rate = { fee: null, feeBase: null, feePerSqm: null };
  { const sr = await api('GET', '/api/services'); const it = sr.ok && sr.data && (sr.data.items || []).find(x => x.id === svcId); if (it) Object.assign(rate, it); }
  const nz = (v, d) => (v == null ? d : v);
  function readInput() {
    if (svcId === 'SV-01') {
      const v = qty.value.trim();
      if (!/^\d+$/.test(v) || +v < 1 || +v > 5) return { code: 'INVALID_QTY' };
      return { fee: nz(rate.fee, 20) * +v, body: { serviceId: svcId, qty: +v }, key: 'q' + v };
    }
    if (svcId === 'SV-03') {
      const v = area.value.trim();
      if (!/^-?\d+$/.test(v) || +v < 1) return { code: 'INVALID_AREA' };
      if (+v > 500) return { code: 'AREA_TOO_LARGE' };
      return { fee: nz(rate.feeBase, 1000) + (+v <= 100 ? 0 : nz(rate.feePerSqm, 10) * (+v - 100)), body: { serviceId: svcId, areaSqm: +v }, key: 'a' + v };
    }
    return { fee: nz(rate.fee, 500), body: { serviceId: svcId }, key: 's' };
  }
  function refreshFee() {
    const r = readInput();
    if (r.code) { feeTotal.textContent = '–'; setHidden(feeErr, App.ERRORS[r.code]); toUpload.disabled = true; return r; }
    setHidden(feeErr, ''); feeTotal.textContent = fmtMoney(state.key === r.key && state.fee != null ? state.fee : r.fee);
    toUpload.disabled = false; return r;
  }
  qty.addEventListener('input', refreshFee); area.addEventListener('input', refreshFee);

  function showDraft(id) {
    draftIdEl.textContent = id; draftIdEl.hidden = false; document.getElementById('no-draft').hidden = true;
    const u = new URL(location.href); u.searchParams.set('draft', id); history.replaceState(null, '', u);
  }
  async function ensureDraft() {
    const r = refreshFee();
    if (r.code) return null;
    if (state.draftId && state.key === r.key) return state.draftId;
    const res = await api('POST', '/api/drafts', r.body);
    if (!res.ok) {
      const code = res.data && res.data.code;
      if (['INVALID_QTY', 'INVALID_AREA', 'AREA_TOO_LARGE'].indexOf(code) >= 0) setHidden(feeErr, errText(res.data));
      else showError(errText(res.data));
      return null;
    }
    const old = state.draftId;
    state.draftId = res.data.draftId; state.key = r.key; state.fee = res.data.fee; state.files = []; state.payment = null;
    if (res.data.fee != null) feeTotal.textContent = fmtMoney(res.data.fee);
    showDraft(state.draftId);
    if (old) api('DELETE', '/api/drafts/' + encodeURIComponent(old));
    renderFiles();
    return state.draftId;
  }
  saveBtn.addEventListener('click', async () => {
    clearMsgs(); saveBtn.disabled = true;
    const id = await ensureDraft();
    saveBtn.disabled = false;
    if (id) showSuccess('บันทึกร่างแล้ว');
  });
  toUpload.addEventListener('click', async () => {
    clearMsgs(); toUpload.disabled = true;
    state.pending = ensureDraft();
    const id = await state.pending; state.pending = null;
    toUpload.disabled = false;
    if (id) { setStep(2); renderFiles(); }
  });

  /* ---------- ขั้น 2 ---------- */
  const upErr = h('p', { class: 'field-error', 'data-testid': 'upload-error', role: 'alert', hidden: true });
  const fileList = h('ul', { class: 'plain', 'aria-label': 'ไฟล์ที่แนบแล้ว' });
  const missing = h('p', { class: 'alert', 'data-testid': 'missing-docs' });
  const toPay = h('button', { type: 'button', 'data-testid': 'to-payment-btn' }, 'ไปชำระเงิน');
  const backTo1 = h('button', { type: 'button', class: 'sec' }, 'ย้อนกลับ');
  const s2 = h('section', { class: 'card accent', 'aria-label': 'แนบเอกสาร', hidden: true });
  s2.append(h('p', { class: 'hint' }, 'รองรับ PDF, JPG, PNG ขนาดไม่เกิน 5 MB ต่อไฟล์ รวมไม่เกิน 5 ไฟล์ต่อคำขอ · ✱ = เอกสารบังคับ'));
  const docs = svc.docs.concat([{ key: 'extra', label: 'เอกสารเพิ่มเติม', req: false, multi: true }]);
  docs.forEach(d => {
    const id = 'up-' + d.key;
    const inp = h('input', { type: 'file', id, 'data-testid': 'upload-input-' + d.key, multiple: d.multi ? true : null });
    inp.addEventListener('change', () => handleFiles(d.key, inp));
    s2.append(h('label', { for: id }, d.label + (d.req ? ' ' : d.multi ? ' (ไม่บังคับ รับหลายไฟล์)' : ' (ไม่บังคับ)'), d.req ? h('span', { class: 'req', title: 'บังคับ' }, '✱') : null), inp);
  });
  const filesH = h('h2', { style: 'margin-top:16px' }, 'ไฟล์ที่แนบแล้ว');
  Object.defineProperty(upErr, 'hidden', { configurable: true, get() { return !upErr.isConnected; },
    set(v) { if (v) upErr.remove(); else if (!upErr.isConnected) filesH.before(upErr); } });
  s2.append(filesH, fileList, missing, h('div', { class: 'row', style: 'margin-top:12px' }, backTo1, toPay));
  backTo1.addEventListener('click', () => setStep(1));

  function missingList() {
    const have = new Set(state.files.map(f => f.docKey));
    return svc.docs.filter(d => d.req && !have.has(d.key)).map(d => d.short || d.label);
  }
  function renderFiles() {
    fileList.replaceChildren();
    state.files.forEach(f => {
      const doc = docs.find(d => d.key === f.docKey);
      fileList.append(h('li', { 'data-testid': 'file-item', 'data-name': f.name, 'data-doc-key': f.docKey },
        h('span', {}, f.name, h('span', { class: 'muted' }, ' · ' + (doc ? (doc.short || doc.label) : f.docKey))),
        h('button', { type: 'button', class: 'danger small', 'data-testid': 'file-remove-btn', 'aria-label': 'ลบไฟล์ ' + f.name, onclick: () => removeFile(f) }, 'ลบ')));
    });
    const m = missingList();
    if (m.length) { missing.textContent = 'ยังขาดเอกสาร: ' + m.join(', '); missing.hidden = false; missing.removeAttribute('hidden'); if (!missing.isConnected) s2.insertBefore(missing, s2.lastChild); }
    else if (missing.isConnected) missing.remove();
    toPay.disabled = m.length > 0;
  }
  async function removeFile(f) {
    state.files = state.files.filter(x => x !== f); renderFiles();
    if (state.draftId && f.fileId) await api('DELETE', '/api/drafts/' + encodeURIComponent(state.draftId) + '/files/' + encodeURIComponent(f.fileId));
  }
  async function handleFiles(key, inp) {
    const list = Array.from(inp.files || []);
    setHidden(upErr, ''); clearMsgs();
    if (!state.draftId && state.pending) await state.pending; // กันแข่งกับการสร้างร่างตอนกดไปแนบไฟล์
    if (!state.draftId) return;
    for (const file of list) {
      const fd = new FormData(); fd.append('file', file, file.name); fd.append('docKey', key);
      const r = await api('POST', '/api/drafts/' + encodeURIComponent(state.draftId) + '/files', fd);
      if (r.ok && r.data) {
        if (key !== 'extra') state.files = state.files.filter(x => x.docKey !== key);
        state.files.push({ fileId: r.data.fileId, name: r.data.name || file.name, docKey: r.data.docKey || key, size: r.data.size });
        renderFiles();
      } else setHidden(upErr, errText(r.data));
    }
    inp.value = '';
  }
  toPay.addEventListener('click', () => { clearMsgs(); setStep(3); renderPay(); });

  /* ---------- ขั้น 3 ---------- */
  const payAmount = h('strong', { 'data-testid': 'payment-amount', style: 'font-size:1.6rem;color:#0B2559' });
  const createQr = h('button', { type: 'button', 'data-testid': 'create-qr-btn' }, 'สร้าง QR');
  const regenQr = h('button', { type: 'button', 'data-testid': 'regenerate-qr-btn', hidden: true }, 'สร้าง QR ใหม่');
  const refreshBtn = h('button', { type: 'button', class: 'sec', 'data-testid': 'refresh-payment-btn', hidden: true }, 'ตรวจสอบการชำระเงิน');
  const qrBox = h('div', { hidden: true });
  const expiredMsg = h('p', { class: 'alert', 'data-testid': 'qr-expired-msg', role: 'alert', hidden: true }, 'QR หมดอายุ กรุณาสร้าง QR ใหม่');
  const payStatus = h('span', { 'data-testid': 'payment-status', 'data-status': 'PENDING', class: 'badge b-warn', hidden: true }, 'รอชำระ');
  const receipt = h('div', { class: 'card', hidden: true });
  const backTo2 = h('button', { type: 'button', class: 'sec' }, 'ย้อนกลับ');
  const s3 = h('section', { class: 'card accent', 'aria-label': 'ชำระเงิน', hidden: true },
    h('p', {}, 'ยอดที่ต้องชำระ: ', payAmount),
    h('div', { class: 'row' }, backTo2, createQr, regenQr, refreshBtn), qrBox, expiredMsg, h('p', {}, payStatus), receipt);
  backTo2.addEventListener('click', () => { if (state.payment && state.payment.status === 'PAID') return; setStep(2); });
  c.append(s1, s2, s3);

  function stopPoll() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }
  function renderPay() {
    payAmount.textContent = fmtMoney(state.fee != null ? state.fee : (readInput().fee || 0));
    const p = state.payment;
    if (!p) { createQr.hidden = false; regenQr.hidden = true; refreshBtn.hidden = true; qrBox.hidden = true; payStatus.hidden = true; expiredMsg.hidden = true; return; }
    createQr.hidden = true; qrBox.hidden = false; payStatus.hidden = false;
    qrBox.replaceChildren(
      h('div', { 'data-testid': 'qr-image', role: 'img', 'aria-label': 'QR PromptPay (จำลอง) เลขอ้างอิง ' + p.ref }, fakeQr(p.ref, 'QR PromptPay จำลอง')),
      h('p', {}, 'เลขอ้างอิง: ', h('strong', { 'data-testid': 'qr-ref' }, p.ref)),
      h('p', {}, timeEl('qr-expires', p.qrExpiresAt, 'หมดอายุ ' + fmtDateTime(p.qrExpiresAt))));
    payStatus.setAttribute('data-status', p.status);
    payStatus.className = 'badge ' + (p.status === 'PAID' ? 'b-ok' : p.status === 'EXPIRED' ? 'b-bad' : 'b-warn');
    payStatus.textContent = p.status === 'PAID' ? 'ชำระแล้ว' : p.status === 'EXPIRED' ? 'QR หมดอายุ' : 'รอชำระ';
    const expired = p.status === 'EXPIRED', paid = p.status === 'PAID';
    expiredMsg.hidden = !expired; regenQr.hidden = !expired; refreshBtn.hidden = paid;
    backTo2.hidden = paid;
    if (paid) { stopPoll(); renderReceipt(p); }
  }
  async function renderReceipt(p) {
    let paidAt = p.paidAt || null;
    if (!paidAt && p.caseNo) { const r = await api('GET', '/api/cases/' + encodeURIComponent(p.caseNo)); if (r.ok && r.data) paidAt = r.data.paidAt; }
    receipt.hidden = false;
    receipt.replaceChildren(h('h2', {}, 'ชำระเงินสำเร็จ'),
      h('dl', { class: 'kv' },
        h('dt', {}, 'เลขคำขอ'), h('dd', { 'data-testid': 'submitted-case-no' }, p.caseNo || '–'),
        h('dt', {}, 'เลขใบเสร็จ'), h('dd', { 'data-testid': 'receipt-no' }, p.receiptNo || '–'),
        h('dt', {}, 'ยอดชำระ'), h('dd', { 'data-testid': 'receipt-amount' }, fmtMoney(p.amount)),
        h('dt', {}, 'เวลาชำระ'), h('dd', {}, paidAt ? timeEl('receipt-paid-at', paidAt) : h('span', { 'data-testid': 'receipt-paid-at', 'data-iso': '' }, '–'))),
      h('p', {}, h('a', { class: 'btn', 'data-testid': 'go-case-btn', href: '/citizen/cases/' + encodeURIComponent(p.caseNo || '') }, 'ดูคำขอ')));
    receipt.querySelector('h2').setAttribute('tabindex', '-1'); receipt.querySelector('h2').focus();
  }
  async function loadPayment(ref, quiet) {
    const r = await api('GET', '/api/payments/' + encodeURIComponent(ref));
    if (!r.ok) { if (!quiet) showError(errText(r.data)); return; }
    state.payment = r.data; renderPay();
    if (r.data.status === 'PENDING' && !state.timer) state.timer = setInterval(() => state.payment && loadPayment(state.payment.ref, true), 3000);
  }
  async function makeQr() {
    clearMsgs(); createQr.disabled = regenQr.disabled = true;
    const r = await api('POST', '/api/drafts/' + encodeURIComponent(state.draftId) + '/payment');
    createQr.disabled = regenQr.disabled = false;
    if (!r.ok) {
      if (r.data && r.data.code === 'MISSING_DOCS') {
        const m = r.data.missing || [];
        setStep(2); showError('ยังขาดเอกสาร: ' + m.join(', ')); return;
      }
      showError(errText(r.data)); return;
    }
    stopPoll();
    state.payment = { ref: r.data.ref, amount: r.data.amount, status: 'PENDING', qrCreatedAt: r.data.qrCreatedAt, qrExpiresAt: r.data.qrExpiresAt };
    renderPay(); regenQr.hidden = true;
    state.timer = setInterval(() => state.payment && loadPayment(state.payment.ref, true), 3000);
  }
  createQr.addEventListener('click', makeQr);
  regenQr.addEventListener('click', makeQr);
  refreshBtn.addEventListener('click', async () => { clearMsgs(); if (state.payment) await loadPayment(state.payment.ref); });

  /* ---------- เปิดร่างเดิม ---------- */
  const draftParam = new URLSearchParams(location.search).get('draft');
  setStep(1);
  if (svcId === 'SV-01') qty.value = '1';
  refreshFee();
  if (draftParam) {
    const r = await api('GET', '/api/drafts/' + encodeURIComponent(draftParam));
    if (!r.ok || !r.data) { showError(errText(r.data)); }
    else {
      const d = r.data;
      state.draftId = d.draftId || draftParam; state.fee = d.fee;
      if (svcId === 'SV-01' && d.qty != null) qty.value = String(d.qty);
      if (svcId === 'SV-03' && d.areaSqm != null) area.value = String(d.areaSqm);
      state.key = readInput().key;
      state.files = Array.isArray(d.files) ? d.files.map(f => ({ fileId: f.fileId, name: f.name, docKey: f.docKey, size: f.size })) : [];
      showDraft(state.draftId); refreshFee(); renderFiles();
      if (d.status === 'PENDING_PAYMENT') {
        setStep(3);
        const ref = d.ref || d.paymentRef || (d.payment && d.payment.ref);
        if (ref) await loadPayment(ref, true); else renderPay();
      }
    }
  }
})();

/* testid ที่สร้างแบบไดนามิก: upload-input-id-card upload-input-map upload-input-site-photo upload-input-plan upload-input-deed upload-input-extra */
