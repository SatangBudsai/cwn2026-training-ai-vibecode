import { NextResponse } from "next/server";
import { createBooking, getBooking, validateBooking, type BookingInput } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Partial<BookingInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const input: Partial<BookingInput> = {
    flightId: Number(body.flightId), date: body.date, cabin: body.cabin ?? "economy", trip: body.trip ?? "oneway",
    name: body.name, email: body.email, seller: body.seller === null || body.seller === undefined ? null : Number(body.seller),
    pax: body.pax && {
      adults: Number(body.pax.adults), children: Number(body.pax.children ?? 0),
      infantsSeat: Number(body.pax.infantsSeat ?? 0), infantsLap: Number(body.pax.infantsLap ?? 0),
    },
  };
  const errors = validateBooking(input);
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });
  try {
    const { ref } = await createBooking(input as BookingInput);
    const booking = await getBooking(ref);
    return NextResponse.json({ ref, booking }, { status: 201 });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
