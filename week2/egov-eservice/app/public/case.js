/* หน้ารายละเอียดคำขอ ใช้ร่วม /citizen/cases/:caseNo และ /officer/cases/:caseNo */
(function () {
  var caseNo = decodeURIComponent(location.pathname.split("/").pop());
  var root = document.getElementById("case"), ME = null, C = null, Q = null;
  var STEP = { 1: "ขั้นตอน 1/3 · ฝ่ายทะเบียน", 2: "ขั้นตอน 2/3 · ฝ่ายโยธา", 3: "ขั้นตอน 3/3 · หัวหน้าฝ่าย" };
  var e = EG.esc;
  function row(label, html) { return "<dt>" + label + "</dt><dd>" + html + "</dd>"; }
  function iso(id, v, text) { return "<span data-testid=\"" + id + "\"" + (v ? " data-iso=\"" + e(v) + "\"" : "") + ">" + (text || EG.dt(v)) + "</span>"; }

  function load() {
    return EG.api("GET", "/api/cases/" + encodeURIComponent(caseNo)).then(function (r) {
      if (!r.ok) { root.innerHTML = "<h1 data-testid=\"not-found-msg\">ไม่พบคำขอ</h1>"; return; }
      C = r.data;
      if (ME.role === "officer" || ME.role === "head") {
        return EG.api("GET", "/api/officer/queue?filter=all").then(function (q) {
          Q = ((q.data && q.data.items) || []).filter(function (x) { return x.caseNo === caseNo; })[0] || {};
          render();
        });
      }
      render();
    });
  }

  function render() {
    var staff = ME.role === "officer" || ME.role === "head", cit = ME.role === "citizen";
    var s = C.status, svcName = C.serviceName || EG.SERVICE[C.serviceId] || "";
    var h = "<h1>คำขอ <span data-testid=\"case-no\">" + e(C.caseNo) + "</span></h1><div class=\"card\"><dl>";
    h += row("สถานะ", "<span class=\"badge\" data-testid=\"case-status\" data-status=\"" + s + "\">" + (EG.STATUS[s] || s) + "</span>");
    h += row("บริการ", "<span data-testid=\"case-service\">" + e(C.serviceId + " " + svcName) + "</span>");
    if (C.serviceId === "SV-03" && C.step && STEP[C.step] && !["COMPLETED", "REJECTED", "CANCELLED"].includes(s)) h += row("ขั้นตอน", "<span data-testid=\"case-step\">" + STEP[C.step] + "</span>");
    h += row("ค่าธรรมเนียม", "<span data-testid=\"case-fee\">" + EG.money(C.fee) + "</span>");
    if (staff) h += row("ผู้ยื่น", "<span data-testid=\"applicant-name\">" + e(C.applicantName) + "</span>");
    h += row("กำหนดเสร็จ", iso("sla-due", C.dueAt));
    h += row("ระดับเตือน", "<span class=\"badge\" data-testid=\"sla-level\" data-level=\"" + C.slaLevel + "\">" + (EG.LEVEL[C.slaLevel] || C.slaLevel) + "</span>");
    if (s === "COMPLETED" || s === "REJECTED") h += row("ปิดงานเมื่อ", iso("closed-at", C.closedAt));
    if (staff) {
      h += row("ผู้ถือเรื่อง", "<span data-testid=\"case-owner\">" + e(C.owner || "ยังไม่มีผู้รับ") + "</span>");
      h += row("ตีกลับแล้ว", "<span data-testid=\"return-count\">" + (C.returnCount || 0) + "</span> ครั้ง");
      h += row("เลขบัตร", "<span data-testid=\"applicant-id\">" + e(C.idMasked) + "</span> <button type=\"button\" class=\"secondary\" data-testid=\"show-full-id-btn\" id=\"showId\">แสดงเลขเต็ม</button>" +
        "<span id=\"unmaskBox\" hidden><label for=\"umr\">เหตุผล</label><input id=\"umr\" data-testid=\"unmask-reason\"> <button type=\"button\" data-testid=\"unmask-submit\" id=\"umGo\">ยืนยัน</button><span class=\"error\" data-testid=\"unmask-error\" id=\"umErr\" hidden></span></span><span id=\"fullId\"></span>");
    } else if (cit) h += row("เลขบัตร", "<span data-testid=\"case-id-full\">" + e(C.idFormatted || C.idNo || "") + "</span>");
    if (C.docNo) {
      h += row("เลขเอกสาร", "<span data-testid=\"doc-no\">" + e(C.docNo) + "</span>");
      if (C.verifyCode) h += row("รหัสตรวจสอบ", "<span data-testid=\"verify-code\">" + e(C.verifyCode) + "</span>") +
        row("QR เอกสาร", "<a data-testid=\"doc-qr\" data-url=\"" + e(location.origin + "/verify/" + C.verifyCode) + "\" href=\"/verify/" + e(C.verifyCode) + "\">QR → /verify/" + e(C.verifyCode) + "</a>");
      if (cit) h += row("เอกสาร", "<a class=\"btn\" data-testid=\"download-doc-btn\" download href=\"/api/documents/" + encodeURIComponent(C.docNo) + "/pdf\">ดาวน์โหลดเอกสาร</a>");
    }
    h += "</dl>";
    if (cit && s === "NEED_FIX") {
      h += "<p>เหตุผลที่ถูกตีกลับ: <b data-testid=\"return-reason-display\">" + e(C.returnReason || "") + "</b></p><p>แก้ไขภายใน: " + iso("fix-deadline", C.fixDeadline) + "</p>" +
        "<div class=\"row\"><label for=\"fixf\">แนบไฟล์ใหม่ (ไม่บังคับ)</label><input type=\"file\" id=\"fixf\" data-testid=\"fix-upload-input\"><button data-testid=\"submit-fix-btn\" id=\"fixGo\">ส่งแก้ไข</button></div>";
    }
    if (cit && (s === "REJECTED" || s === "CANCELLED")) h += "<p data-testid=\"no-refund-note\">ค่าธรรมเนียมที่ชำระแล้วไม่คืน</p>";
    if (cit && s === "REJECTED" && C.rejectReason) h += "<p>เหตุผล: " + e(C.rejectReason) + "</p>";
    if (cit && s === "SUBMITTED" && !C.owner) h += "<div class=\"row\"><button class=\"danger\" data-testid=\"cancel-case-btn\" id=\"cancel\">ยกเลิกคำขอ</button></div><div id=\"cbox\" class=\"card\" hidden><p data-testid=\"cancel-confirm-text\">ค่าธรรมเนียมที่ชำระแล้วไม่คืน</p><button class=\"danger\" data-testid=\"confirm-cancel-btn\" id=\"cc\">ยืนยันยกเลิก</button></div>";
    h += "</div>";

    if (staff) h += actions();
    h += "<h2>เอกสารแนบ</h2><ul class=\"plain\">" + (C.files || []).map(function (f) {
      return "<li data-testid=\"doc-item\" data-name=\"" + e(f.name) + "\" data-file-id=\"" + e(f.fileId) + "\">" + e(f.name) + " <a data-testid=\"doc-download-link\" href=\"/api/files/" + encodeURIComponent(f.fileId) + "\">ดาวน์โหลด</a></li>";
    }).join("") + "</ul>";
    h += "<h2>ไทม์ไลน์</h2><ul class=\"plain\" data-testid=\"case-timeline\">" + (C.timeline || []).map(function (t) {
      return "<li data-testid=\"timeline-item\" data-iso=\"" + e(t.at) + "\">" + EG.dt(t.at) + " · " + e(t.text || t.event || "") + "</li>";
    }).join("") + "</ul>";
    root.innerHTML = h;
    wire();
  }

  function actions() {
    var s = C.status, mine = C.owner === ME.username, isOff = ME.role === "officer", isHead = ME.role === "head", sv1 = C.serviceId === "SV-01";
    var canApprove = sv1 ? (isOff && mine && s === "IN_REVIEW") : (isHead && s === "PENDING_APPROVAL");
    var b = "<div class=\"card\"><h2>ดำเนินการ</h2><div class=\"row\">";
    if (isOff && Q && Q.canClaim) b += "<button data-testid=\"claim-btn\" id=\"claim\">รับเรื่อง</button>";
    if (isOff && mine && s === "IN_REVIEW" && (C.returnCount || 0) < 2) b += "<button class=\"secondary\" data-testid=\"return-btn\" id=\"retBtn\">ตีกลับ</button>";
    if (isOff && mine && s === "IN_REVIEW" && !sv1) b += "<label for=\"fn\">หมายเหตุส่งต่อ</label><input id=\"fn\" data-testid=\"forward-note\"><button data-testid=\"forward-btn\" id=\"fwd\">ผ่าน/ส่งต่อ</button>";
    if (canApprove) b += "<button data-testid=\"approve-btn\" id=\"appr\">อนุมัติ</button><button class=\"danger\" data-testid=\"reject-btn\" id=\"rejBtn\">ไม่อนุมัติ</button>";
    if (isOff && Q && Q.canIssue) b += "<button data-testid=\"issue-btn\" id=\"issue\">ออกเอกสาร</button>";
    b += "</div>";
    b += "<div id=\"retBox\" hidden><label for=\"retR\">เหตุผลที่ตีกลับ</label><input id=\"retR\" data-testid=\"return-reason\"> <button data-testid=\"return-submit\" id=\"retGo\">ยืนยันตีกลับ</button><p class=\"error\" data-testid=\"return-reason-error\" id=\"retErr\" hidden></p></div>";
    b += "<div id=\"rejBox\" hidden><label for=\"rejR\">เหตุผลที่ไม่อนุมัติ</label><input id=\"rejR\" data-testid=\"reject-reason\"> <button class=\"danger\" data-testid=\"reject-submit\" id=\"rejGo\">ยืนยันไม่อนุมัติ</button><p class=\"error\" data-testid=\"reject-reason-error\" id=\"rejErr\" hidden></p></div></div>";
    return b;
  }

  function $(i) { return document.getElementById(i); }
  function act(method, url, body, onFail) {
    EG.clearMsg();
    return EG.api(method, url, body).then(function (r) {
      if (r.ok) { return load(); }
      if (onFail && onFail(r)) return;
      EG.show("action-error", EG.failMsg(r));
    });
  }
  function toggle(id) { var el = $(id); if (el) el.hidden = !el.hidden; }
  function reasonFail(errId) { return function (r) { if (r.data.code === "REASON_TOO_SHORT") { $(errId).textContent = r.data.message; $(errId).hidden = false; return true; } return false; }; }
  function on(id, fn) { var el = $(id); if (el) el.addEventListener("click", fn); }

  function wire() {
    var base = "/api/officer/cases/" + encodeURIComponent(caseNo);
    on("cancel", function () { $("cbox").hidden = false; });
    on("cc", function () { act("POST", "/api/cases/" + encodeURIComponent(caseNo) + "/cancel"); });
    on("fixGo", function () {
      var fd = new FormData(), f = $("fixf").files[0]; if (f) fd.append("file", f, f.name);
      act("POST", "/api/cases/" + encodeURIComponent(caseNo) + "/resubmit", f ? fd : undefined);
    });
    on("claim", function () { act("POST", base + "/claim"); });
    on("retBtn", function () { toggle("retBox"); });
    on("retGo", function () { $("retErr").hidden = true; act("POST", base + "/return", { reason: $("retR").value }, reasonFail("retErr")); });
    on("fwd", function () { act("POST", base + "/forward", { note: $("fn").value }); });
    on("appr", function () { act("POST", "/api/cases/" + encodeURIComponent(caseNo) + "/approve"); });
    on("rejBtn", function () { toggle("rejBox"); });
    on("rejGo", function () { $("rejErr").hidden = true; act("POST", "/api/cases/" + encodeURIComponent(caseNo) + "/reject", { reason: $("rejR").value }, reasonFail("rejErr")); });
    on("issue", function () { act("POST", base + "/issue"); });
    on("showId", function () { $("unmaskBox").hidden = false; });
    on("umGo", function () {
      $("umErr").hidden = true; EG.clearMsg();
      EG.api("POST", base + "/unmask", { reason: $("umr").value }).then(function (r) {
        if (r.ok) { $("unmaskBox").hidden = true; $("fullId").innerHTML = " <b data-testid=\"full-id\">" + e(r.data.idFormatted || r.data.idNo) + "</b>"; }
        else if (r.data.code === "REASON_REQUIRED") { $("umErr").textContent = r.data.message; $("umErr").hidden = false; }
        else EG.show("action-error", EG.failMsg(r));
      });
    });
  }

  EG.boot(function (me) { ME = me; load(); });
})();
