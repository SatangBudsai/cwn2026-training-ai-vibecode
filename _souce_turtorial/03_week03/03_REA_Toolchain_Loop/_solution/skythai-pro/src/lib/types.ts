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

export type StepId = "initial" | "more_flights" | "nonstop_filter";
/** Position of an itinerary inside one captured request: `order` is 0-based (best first, then others). */
export interface Appearance { group: "best" | "other"; order: number; price: number }

export interface FlightView {
  id: number;
  key: string;
  /** F3/F2/F4: where this itinerary appeared — initial 22, all 300, nonstop 18 */
  seen: Partial<Record<StepId, Appearance>>;
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

export interface StepInsights {
  step: StepId;
  stopsFilter: number;
  bestCount: number;
  otherCount: number;
  notLoaded: number | null;
  lowestNow: number;
  typicalLow: number;
  typicalHigh: number;
  reference: number | null;
}

export interface BookingOption {
  sellerCode: string;
  sellerName: string;
  isAirline: boolean;
  price: number;
  extraFee: number | null;
  domain: string | null;
}

export interface BookingInsights { typicalLow: number; typicalHigh: number; reference: number | null; lowestNow: number | null }

export interface Insights {
  steps: StepInsights[];
  lowestNow: number;
  typicalLow: number;
  typicalHigh: number;
  history: { date: string; price: number }[];
  cheaper: { date: string; price: number }[];
}

export interface AirlineOpt { code: string; name: string; alliance: string | null }
export interface AirportOpt { code: string; city: string | null; name: string | null }
