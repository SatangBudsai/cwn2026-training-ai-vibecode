# API extras (beyond CONTRACT section 6)

All errors: `{code,message,...}`. 401 `UNAUTHENTICATED` when no session, 403 `FORBIDDEN` for wrong role.

- `GET /api/me` -> `{username,name,role,dept,registered,landing,bellCount}`. `bellCount` only for officer/head. Unregistered citizen (passed OTP only): `registered:false`, `landing:"/register"`, name from ThaiD seed. `dept` is `null` for non-officers.
- `GET /api/fee?serviceId=SV-01&qty=2` | `?serviceId=SV-03&areaSqm=101` | `?serviceId=SV-02` -> `200 {fee}` or `400 {code,message}` (INVALID_QTY / INVALID_AREA / AREA_TOO_LARGE). Uses current admin fees. No login needed.
- `GET /api/drafts` -> `{items:[{draftId,serviceId,status,fee}]}` (DRAFT/PENDING_PAYMENT, owner only).
- `GET /api/drafts/:id` -> `{draftId,serviceId,status,fee,qty,areaSqm,files:[{fileId,name,docKey,size}],missing:[thaiNames],latestPayment:{ref,amount,status,qrCreatedAt,qrExpiresAt,caseNo,receiptNo,paidAt}|null}`. After payment `status` is `SUBMITTED`.
- `PUT /api/drafts/:id {qty|areaSqm}` -> same shape (only while status DRAFT, else 409 INVALID_STATE).
- `DELETE /api/drafts/:id/files/:fileId` -> 204.
- `POST /api/drafts/:id/files` (multipart `file`, `docKey`): a single-slot docKey (id-card/map/site-photo/plan/deed) replaces the earlier file of that key; `extra` accumulates. Max 5 total. Invalid docKey -> 400 `INVALID_DOCKEY`.
- `POST /api/drafts/:id/payment`: first QR locks the fee (BR-11). 409 `MISSING_DOCS` includes `missing:[...]` and message `ยังขาดเอกสาร: a, b`.
- `GET /api/cases` -> `{items:[{caseNo,serviceId,serviceName,status,dueAt,slaLevel}]}` (citizen, newest number first).
- `GET /api/cases/:caseNo` (citizen owner / officer / head) = CONTRACT 6.7 plus: `serviceName, qty, areaSqm, receiptNo, timeline:[{at,event,text}], files:[{fileId,name,docKey,size}], issuedAt, validUntil (YYYY-MM-DD), signer, fixReason, actions:[...]`.
  - Citizen gets `idNo` (13 digits raw) and `idNoFormatted` (`3-1006-00987-65-9`), no `idMasked`. Staff get `idMasked`, never `idNo`.
  - `actions` for the current user: staff from `claim,return,forward,approve,reject,issue,unmask`; citizen from `cancel,resubmit,download`.
  - `owner` is the holder username or `null`. `closedAt` only for COMPLETED/REJECTED. `fixDeadline` only for NEED_FIX.
- `GET /api/officer/queue?filter=all|unclaimed|mine` -> `{items:[{caseNo,serviceId,applicantName,idMasked,status,step,owner,dueAt,slaLevel,actions}],workload}`; `workload` is a number for officer, `null` for head. `claim` is in `actions` when the user can claim (it is also offered at workload 10, so the click yields 409 WORKLOAD_LIMIT).
- `GET /api/head/approvals` -> `{items:[{caseNo,serviceId,applicantName,dueAt,slaLevel}]}`.
- `GET /api/notifications` -> `{items:[{id,caseNo,level,text,createdAt}],count}` (creation order).
- `GET /api/admin/users` -> `{items:[{username,name,role,dept}]}` (staff only, `dept` is `""` when none). `PUT /api/admin/users/:username {role?,dept?}`.
- `GET /api/admin/services` -> `{items:[{id,name,fee,feePerSqm,feeBase,sla}]}`. For SV-03 `fee` = `feeBase`; `feeBase`/`feePerSqm` are `null` where not applicable. `PUT` accepts `{fee,sla}` or SV-03 `{feeBase,feePerSqm,sla}` and returns the item.
- `GET /api/admin/holidays` -> `{items:[{date,name}]}`; POST 201 `{date,name}`; DELETE 200 `{ok:true}`.
- `GET /api/audit/events` -> `{items:[10 event codes]}` (auditor).
- Audit CSV export is logged after the file is produced (the CSV does not contain its own EXPORT row).

## Notes
- Users live in SQLite at `DB_PATH` (idNo and mobile AES-256-GCM, blind index = HMAC). Cases, drafts, payments, files, audit, notifications are in memory and are cleared by `/api/test/reset`.
- `bug(id)` helper is in `src/time.js`; a few `bug('Bxx')` hook sites already exist in `store.js` / `time.js` (default off).
- Document PDF contains ASCII only (no Thai font embedded).
