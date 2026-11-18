"use client";
import { useState } from "react";
import { Modal } from "./ui";

export function FooterSettings() {
  const [open, setOpen] = useState<null | "lang" | "loc" | "cur">(null);
  const info = {
    lang: { title: "ภาษา", cur: "ไทย", others: "English, 日本語" },
    loc: { title: "สถานที่ตั้ง", cur: "ไทย", others: "ญี่ปุ่น" },
    cur: { title: "สกุลเงิน", cur: "THB — บาทไทย", others: "JPY, USD" },
  } as const;
  return (
    <div className="row" data-testid="footer-settings">
      <button className="chip" data-testid="setting-language" onClick={() => setOpen("lang")}>ภาษา · ไทย</button>
      <button className="chip" data-testid="setting-location" onClick={() => setOpen("loc")}>สถานที่ตั้ง · ไทย</button>
      <button className="chip" data-testid="setting-currency" onClick={() => setOpen("cur")}>สกุลเงิน · THB</button>
      {open && (
        <Modal title={info[open].title} onClose={() => setOpen(null)} testId="settings-modal">
          <p>ค่าปัจจุบัน: <b>{info[open].cur}</b></p>
          <p className="sub">ตัวเลือกอื่น ({info[open].others}) ยังไม่เปิดให้ใช้ เพราะข้อมูลจำลองที่เก็บมามีเฉพาะภาษาไทยและราคาเป็นบาท</p>
          <div className="popover-actions"><button className="btn-secondary" onClick={() => setOpen(null)}>ตกลง</button></div>
        </Modal>
      )}
    </div>
  );
}
