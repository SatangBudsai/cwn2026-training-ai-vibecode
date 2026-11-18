import type { Flight } from "@/lib/db";
import { stopsText } from "@/lib/format";

export default function FlightSummary({ f }: { f: Flight }) {
  return (
    <div className="route" data-testid="flight-route">
      <div className="pt">
        <div className="time" data-testid="flight-dep-time">{f.dep_time}</div>
        <div className="iata">{f.dep_iata}</div>
        <div className="apt">{f.dep_airport_name}</div>
      </div>
      <div className="mid">
        <div className="dur" data-testid="flight-duration">{f.duration_text}</div>
        <div className="line"><span className="plane">✈</span></div>
        <div className={f.stops === 0 ? "stops direct" : "stops"} data-testid="flight-stops">
          {stopsText(f.stops)}
          {f.layovers.length > 0 && ` · ${f.layovers.map((l) => `${l.iata} ${l.duration}`).join(", ")}`}
        </div>
      </div>
      <div className="pt">
        <div className="time" data-testid="flight-arr-time">
          {f.arr_time}
          {f.arr_next_day && <sup className="nextday" title="ถึงวันถัดไป">+1</sup>}
        </div>
        <div className="iata">{f.arr_iata}</div>
        <div className="apt">{f.arr_airport_name}</div>
      </div>
    </div>
  );
}
