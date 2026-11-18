import { BookingSummary } from "@/components/BookingSummary";
import { getBooking } from "@/lib/bookings";
import { flat, type RawParams } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function LookupPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = flat(await searchParams);
  const ref = (sp.ref ?? "").trim().toUpperCase();
  const email = (sp.email ?? "").trim().toLowerCase();
  const searched = !!(ref || email);
  const b = ref && email && /^[A-Z0-9]{6}$/.test(ref) ? await getBooking(ref) : null;
  const match = b && b.contact_email === email ? b : null;
  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1 className="page-title">ตรวจสอบการจอง</h1>
      <form className="card" method="get" data-testid="lookup-form" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div className="form-row" style={{ flex: 1 }}><label htmlFor="ref">รหัสการจอง</label>
          <input id="ref" name="ref" className="text-input" defaultValue={ref} maxLength={6} data-testid="lookup-ref" /></div>
        <div className="form-row" style={{ flex: 2 }}><label htmlFor="em">อีเมล</label>
          <input id="em" name="email" type="email" className="text-input" defaultValue={email} data-testid="lookup-email" /></div>
        <div className="form-row"><button className="btn-primary" type="submit" data-testid="lookup-submit">ค้นหา</button></div>
      </form>
      {searched && !match && <div className="notice notice-error" data-testid="lookup-not-found">ไม่พบการจองที่ตรงกับรหัสและอีเมลนี้</div>}
      {match && <><div className="notice notice-info" data-testid="lookup-found">พบการจอง <b>{match.booking_ref}</b></div><BookingSummary b={match} /></>}
    </div>
  );
}
