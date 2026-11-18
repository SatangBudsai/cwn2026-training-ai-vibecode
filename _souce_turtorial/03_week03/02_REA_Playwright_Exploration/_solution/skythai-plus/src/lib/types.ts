export interface LegView {
  seq: number;
  flightNumber: string;
  carrierCode: string;
  carrierName: string;
  operatedBy: string | null;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  durationMin: number;
  aircraft: string | null;
  legroom: string | null;
  co2g: number | null;
}

export interface LayoverView {
  seq: number;
  durationMin: number;
  airport: string;
  airportName: string;
  city: string | null;
  changeAirportTo: string | null;
  overnight: boolean;
  long: boolean;
}

export interface FlightView {
  id: number;
  group: "best" | "other";
  rankInGroup: number;
  displayOrder: number;
  price: number;
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  dayOffset: number;
  durationMin: number;
  stops: number;
  airlines: { code: string; name: string; alliance: string | null }[];
  layovers: LayoverView[];
  legs: LegView[];
  co2: { g: number; typical: number; pct: number; level: number; label: string };
  assistance: { code: string; name: string; url: string }[];
  baggage: { code: string; name: string; url: string }[];
}

export interface SnapshotInfo {
  id: number;
  route: string;
  travelDate: string;
  capturedAt: string;
  moreNotEmbedded: number | null;
  priceMax: number;
  layoverMin: number;
  layoverMax: number;
  durationMin: number;
  durationMax: number;
}

export interface Insights {
  lowestNow: number;
  typicalLow: number;
  typicalHigh: number;
  history: { date: string; price: number }[];
  cheaper: { date: string; price: number }[];
}

export interface AirlineOpt { code: string; name: string; alliance: string | null }
export interface AirportOpt { code: string; city: string | null; name: string | null }
