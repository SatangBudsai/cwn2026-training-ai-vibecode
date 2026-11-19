import { api, $, h, boot, showError, clearError, toast, setSlot, money, dateEl, qrEl, SERVICES } from '/static/app.js';

const ERR = {
  INVALID_QTY: 'จำนวนฉบับต้อง 1–5 ฉบับ', INVALID_AREA: 'กรุณาระบุพื้นที่ 1–500 ตร.ม.', AREA_TOO_LARGE: 'พื้นที่เกิน 500 ตร.ม. กรุณายื่นที่สำนักงาน',
  FILE_TOO_LARGE: 'ไฟล์ใหญ่เกิน 5 MB', FILE_TYPE: 'รองรับเฉพาะไฟล์ PDF, JPG, PNG', FILE_COUNT: 'แนบได้สูงสุด 5 ไฟล์ต่อคำขอ',
  PLAN_NOT_PDF: 'แบบแปลนต้องเป็นไฟล์ PDF เท่านั้น',
};
const msgOf = (e) => ERR[e.code] || e.message;
const STEP_TXT = ['1/3 กรอกข้อมูล', '2/3 แนบเอกสาร', '3/3 ชำระเงิน'];
const DOCS = {
  'SV-01': [['id-card', 'บัตรประชาชน ✱']],
  'SV-02': [['id-card', 'บัตรประชาชน ✱'], ['map', 'แผนที่ตั้ง ✱'], ['site-photo', 'ภาพสถานที่ (ไม่บังคับ)']],
  'SV-03': [['id-card', 'บัตรประชาชน ✱'], ['plan', 'แบบแปลน ✱ (PDF เท่านั้น)'], ['deed', 'โฉนด ✱']],
};

const me = await boot({ roles: ['citizen'] });
if (me) init();

async function init() {
  const params = new URLSearchParams(location.search);
  let serviceId = location.pathname.replace(/\/+$/, '').split('/')[3];
  let draftId = params.get('draft');
  let draft = null;
  let pollTimer = null;
  let feeSeq = 0;
  let feeOk = false;

  const qty = $('#qty'), area = $('#area'), toUpload = $('#to-upload');

  function setupService() {
    if (!SERVICES[serviceId]) {
      $('main').replaceChildren(h('p', { 'data-testid': 'not-found-msg', role: 'alert' }, 'ไม่พบคำขอ'));
      return false;
    }
    $('[data-testid=service-name]').textContent = SERVICES[serviceId];
    document.title = `${SERVICES[serviceId]} - e-Service กลาง`;
    $('#qty-field').hidden = serviceId !== 'SV-01';
    $('#area-field').hidden = serviceId !== 'SV-03';
    return true;
  }

  function go(n) {
    ['s1', 's2', 's3'].forEach((id, i) => { $('#' + id).hidden = i !== n - 1; });
    $('[data-testid=wizard-step]').textContent = STEP_TXT[n - 1];
    clearError();
    window.scrollTo(0, 0);
  }

  function showDraftId() {
    $('#draft-slot').replaceChildren(draftId ? h('span', null, 'รหัสร่าง: ', h('strong', { 'data-testid': 'draft-id' }, draftId)) : '');
  }

  // ---- fee ----
  function feeUrl() {
    if (serviceId === 'SV-01') return `/api/fee?serviceId=SV-01&qty=${encodeURIComponent(qty.value.trim())}`;
    if (serviceId === 'SV-03') return `/api/fee?serviceId=SV-03&areaSqm=${encodeURIComponent(area.value.trim())}`;
    return `/api/fee?serviceId=${serviceId}`;
  }
  async function refreshFee(silent) {
    const my = ++feeSeq;
    try {
      const r = await api(feeUrl());
      if (my !== feeSeq) return;
      feeOk = true;
      $('[data-testid=fee-total]').textContent = money(r.fee);
      setSlot('#fee-slot', 'fee-error', '');
    } catch (e) {
      if (my !== feeSeq) return;
      feeOk = false;
      $('[data-testid=fee-total]').textContent = '–';
      setSlot('#fee-slot', 'fee-error', silent ? '' : msgOf(e));
    }
    toUpload.disabled = !feeOk;
  }
  const bodyVals = () => (serviceId === 'SV-01' ? { qty: Number(qty.value.trim()) } : serviceId === 'SV-03' ? { areaSqm: Number(area.value.trim()) } : {});

  let pendingDraft = null, creating = null;
  async function ensureDraft() {
    if (!draftId) {
      // one creation at a time: a second caller (e.g. an early upload) waits for the same POST
      creating = creating || api('/api/drafts', { method: 'POST', json: { serviceId, ...bodyVals() } });
      let r; try { r = await creating; } finally { creating = null; }
      draftId = draftId || r.draftId;
      history.replaceState(null, '', `${location.pathname}?draft=${encodeURIComponent(draftId)}`);
    } else if (serviceId !== 'SV-02') {
      await api(`/api/drafts/${draftId}`, { method: 'PUT', json: bodyVals() });
    }
    showDraftId();
    return draftId;
  }
  async function loadDraft() {
    draft = await api(`/api/drafts/${draftId}`);
    return draft;
  }

  qty.addEventListener('input', () => refreshFee(false));
  area.addEventListener('input', () => refreshFee(false));

  $('#save-draft').onclick = async () => {
    clearError();
    try { await ensureDraft(); toast('บันทึกร่างแล้ว'); } catch (e) { showError(msgOf(e)); }
  };
  toUpload.onclick = async () => {
    clearError();
    try { await ensureDraft(); await loadDraft(); renderUploads(); go(2); } catch (e) { showError(msgOf(e)); }
  };
  $('#back1').onclick = () => go(1);

  // ---- step 2 ----
  function buildUploadInputs() {
    const rows = [...DOCS[serviceId], ['extra', 'เอกสารเพิ่มเติม (ไม่บังคับ, เลือกได้หลายไฟล์)']];
    $('#uploads').replaceChildren(...rows.map(([key, label]) => {
      const id = 'up-' + key;
      return h('div', { class: 'field' },
        h('label', { for: id }, label),
        h('input', {
          type: 'file', id, 'data-testid': 'upload-input-' + key, accept: key === 'plan' ? '.pdf,application/pdf' : '.pdf,.jpg,.jpeg,.png',
          multiple: key === 'extra', onchange: (ev) => upload(key, ev.target),
        }));
    }));
  }
  async function upload(key, input) {
    const files = Array.from(input.files || []);
    setSlot('#upload-slot', 'upload-error', '');
    clearError();
    let err = '';
    try { await (pendingDraft = pendingDraft || ensureDraft()); } catch (e) { err = msgOf(e); }
    pendingDraft = null;
    for (const f of err ? [] : files) {
      const form = new FormData();
      form.append('file', f);
      form.append('docKey', key);
      try { await api(`/api/drafts/${draftId}/files`, { method: 'POST', form }); } catch (e) { err = msgOf(e); break; }
    }
    input.value = '';
    await loadDraft();
    renderUploads();
    if (err) setSlot('#upload-slot', 'upload-error', err);
  }
  function renderUploads() {
    const files = draft.files || [];
    $('#files').replaceChildren(...files.map((f) => h('li', { 'data-testid': 'file-item', 'data-name': f.name, 'data-doc-key': f.docKey, class: 'row', style: 'align-items:center' },
      h('span', null, `${f.name} (${f.docKey}, ${Math.max(1, Math.round((f.size || 0) / 1024))} KB)`),
      h('button', {
        type: 'button', class: 'btn secondary', 'data-testid': 'file-remove-btn', 'aria-label': `ลบไฟล์ ${f.name}`,
        onclick: async () => {
          try { await api(`/api/drafts/${draftId}/files/${f.fileId}`, { method: 'DELETE' }); await loadDraft(); renderUploads(); } catch (e) { showError(msgOf(e)); }
        },
      }, 'ลบ'))));
    const missing = draft.missing || [];
    setSlot('#missing-slot', 'missing-docs', missing.length ? `ยังขาดเอกสาร: ${missing.join(', ')}` : '');
    $('#to-payment').disabled = missing.length > 0;
  }
  $('#to-payment').onclick = async () => {
    try { await loadDraft(); } catch (e) { return showError(msgOf(e)); }
    renderUploads();
    if ((draft.missing || []).length) return;
    openPayment();
  };

  // ---- step 3 ----
  function openPayment() {
    $('[data-testid=payment-amount]').textContent = money(draft.fee);
    go(3);
    if (draft.latestPayment) renderPayment(draft.latestPayment);
    else renderPayment(null);
  }
  async function back2() { clearInterval(pollTimer); await loadDraft(); renderUploads(); go(2); }
  $('#back2').onclick = back2;
  let cur = null;

  async function createQr() {
    clearError();
    try {
      const r = await api(`/api/drafts/${draftId}/payment`, { method: 'POST' });
      renderPayment({ ...r, status: 'PENDING' });
    } catch (e) {
      if (e.code === 'MISSING_DOCS') { await loadDraft(); renderUploads(); go(2); }
      else showError(msgOf(e));
    }
  }
  $('#create-qr').onclick = createQr;

  async function check(ref) {
    try {
      const p = await api(`/api/payments/${ref}`);
      if (cur && cur.ref === p.ref && cur.status === p.status) return;
      renderPayment(p);
    } catch (e) { showError(msgOf(e)); }
  }

  const STATUS_PAY = { PENDING: 'รอชำระ', PAID: 'ชำระแล้ว', EXPIRED: 'QR หมดอายุ' };
  function renderPayment(p) {
    clearInterval(pollTimer);
    cur = p ? { ref: p.ref, status: p.status || 'PENDING' } : null;
    const pay = $('#pay'), actions = $('#pay-actions');
    if (!p) { pay.replaceChildren(); actions.replaceChildren(btnBack(), btnCreate('สร้าง QR', 'create-qr-btn')); return; }
    const status = p.status || 'PENDING';
    const kids = [];
    if (status !== 'PAID') {
      kids.push(
        h('div', null, qrEl(p.ref, { 'data-testid': 'qr-image' })),
        h('p', null, 'เลขอ้างอิง: ', h('strong', { 'data-testid': 'qr-ref' }, p.ref)),
        h('p', null, dateEl('span', p.qrExpiresAt, { 'data-testid': 'qr-expires' }, undefined)));
      const ex = kids[kids.length - 1].firstChild;
      ex.textContent = 'หมดอายุ ' + ex.textContent;
    }
    kids.push(h('p', null, 'สถานะ: ', h('span', { class: 'chip', 'data-testid': 'payment-status', 'data-status': status }, STATUS_PAY[status] || status)));
    if (status === 'EXPIRED') kids.push(h('p', { class: 'field-error', 'data-testid': 'qr-expired-msg', role: 'alert' }, 'QR หมดอายุ กรุณาสร้าง QR ใหม่'));
    if (status === 'PAID') kids.push(h('div', { class: 'card', 'aria-live': 'polite', id: 'receipt' },
      h('h3', null, 'ชำระเงินสำเร็จ'),
      h('dl', { class: 'kv' },
        h('dt', null, 'เลขคำขอ'), h('dd', { 'data-testid': 'submitted-case-no' }, p.caseNo || ''),
        h('dt', null, 'เลขใบเสร็จ'), h('dd', { 'data-testid': 'receipt-no' }, p.receiptNo || ''),
        h('dt', null, 'ยอดชำระ'), h('dd', { 'data-testid': 'receipt-amount' }, money(p.amount)),
        h('dt', null, 'เวลาชำระ'), dateEl('dd', p.paidAt, { 'data-testid': 'receipt-paid-at', id: 'paid-at' })),
      h('p', null, h('a', { class: 'btn', href: `/citizen/cases/${p.caseNo}`, 'data-testid': 'go-case-btn' }, 'ดูคำขอ'))));
    pay.replaceChildren(...kids);
    const acts = [];
    if (status === 'PENDING') acts.push(h('button', { type: 'button', class: 'btn secondary', 'data-testid': 'refresh-payment-btn', onclick: () => check(p.ref) }, 'ตรวจสอบการชำระเงิน'));
    if (status === 'EXPIRED') acts.push(btnCreate('สร้าง QR ใหม่', 'regenerate-qr-btn'));
    if (status !== 'PAID') acts.unshift(btnBack());
    actions.replaceChildren(...acts);
    if (status === 'PENDING') pollTimer = setInterval(() => check(p.ref), 2000);
    if (status === 'PAID' && !p.paidAt) {
      api(`/api/drafts/${draftId}`).then((d) => {
        const t = d.latestPayment && d.latestPayment.paidAt;
        if (t) { const el = $('#paid-at'); el.setAttribute('data-iso', t); el.textContent = dateEl('i', t).textContent; }
      }).catch(() => {});
    }
  }
  const btnBack = () => h('button', { type: 'button', class: 'btn secondary', onclick: back2 }, 'ย้อนกลับ');
  const btnCreate = (label, id) => h('button', { type: 'button', class: 'btn', 'data-testid': id, onclick: createQr }, label);

  // ---- boot ----
  if (draftId) {
    try {
      await loadDraft();
      serviceId = draft.serviceId || serviceId;
      if (!setupService()) return;
      buildUploadInputs();
      if (draft.qty) qty.value = draft.qty;
      if (draft.areaSqm) area.value = draft.areaSqm;
      showDraftId();
      await refreshFee(true);
      renderUploads();
      if (draft.latestPayment) { openPayment(); }
    } catch (e) {
      if (e.status === 404) { $('main').replaceChildren(h('p', { 'data-testid': 'not-found-msg', role: 'alert' }, 'ไม่พบคำขอ')); return; }
      showError(msgOf(e));
    }
  } else {
    if (!setupService()) return;
    buildUploadInputs();
    await refreshFee(true);
  }
}
