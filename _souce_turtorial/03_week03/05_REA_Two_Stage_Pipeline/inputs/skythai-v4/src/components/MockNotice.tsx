import { fmtDateTimeTH, fmtLong } from "@/lib/dates";

export function MockNotice({ capturedAt, snapshotDate, searchDate }: { capturedAt: string; snapshotDate: string; searchDate?: string }) {
  return (
    <div className="notice notice-mock" data-testid="mock-notice" role="note">
      <span aria-hidden="true">⚠️</span>
      <div>
        <b>ข้อมูลจำลอง</b> — เที่ยวบินและราคาทั้งหมดเก็บไว้ ณ วันที่ {fmtDateTimeTH(capturedAt)} สำหรับเที่ยวบิน{fmtLong(snapshotDate)}
        {searchDate && searchDate !== snapshotDate && <> แล้วนำมาแสดงตามวันที่คุณค้นหา ({fmtLong(searchDate)}) โดยคงเวลาและราคาเดิม</>}
        {" "}ไม่ใช่ราคาปัจจุบันและไม่มีการชำระเงินจริง (C10: โปรดตรวจสอบราคาและเงื่อนไขกับสายการบินก่อนเดินทางจริง)
      </div>
    </div>
  );
}
