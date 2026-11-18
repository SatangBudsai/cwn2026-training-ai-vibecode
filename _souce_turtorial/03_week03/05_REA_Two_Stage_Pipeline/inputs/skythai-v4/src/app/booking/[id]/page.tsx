import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/BookingFlow";
import { MockNotice } from "@/components/MockNotice";
import { diffDays, todayISO } from "@/lib/dates";
import { getBookingOptions, getFlights, getSnapshot } from "@/lib/flights";
import { parseSearch, searchErrors, searchQuery, type RawParams } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RawParams> }) {
  const { id } = await params;
  const today = todayISO();
  const s = parseSearch(await searchParams, today);
  const fid = Number(id);
  if (!Number.isInteger(fid)) notFound();
  const snap = await getSnapshot();
  if (!snap) notFound();
  const [flight] = await getFlights({ ids: [fid], shiftDays: diffDays(s.date, snap.travelDate) });
  if (!flight) notFound();
  const errors = searchErrors(s, today);
  const { options, insights } = await getBookingOptions(fid);

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <Link href={`/search?${searchQuery(s)}`} className="btn-link" data-testid="back-to-results" aria-label="กลับไปหน้าผลการค้นหา">← กลับไปผลการค้นหา</Link>
      <MockNotice capturedAt={snap.capturedAt} snapshotDate={snap.travelDate} searchDate={s.date} />
      {errors.length > 0 ? (
        <div className="notice notice-error" data-testid="search-errors">{errors.map((e) => <div key={e}>• {e}</div>)}</div>
      ) : (
        <BookingFlow flight={flight} search={s} today={today} options={options} insights={insights} />
      )}
    </div>
  );
}
